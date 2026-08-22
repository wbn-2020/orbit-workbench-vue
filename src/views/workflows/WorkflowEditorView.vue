<template>
  <div class="page">
    <PageHeader
      :title="isNew ? '新建 Workflow' : `编辑 ${workflow?.name || 'Workflow'}`"
      description="使用结构化节点和受限条件配置流程，发布版本后不可原地修改。"
      back
    >
      <template #actions>
        <el-button :icon="ArrowLeft" @click="goBack">取消</el-button>
        <el-button :icon="ShieldCheck" :loading="validationLoading" @click="validateDraft">
          校验草稿
        </el-button>
        <el-button type="primary" :icon="Save" :loading="saveSubmitting" @click="save">
          保存草稿
        </el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="loadError" :message="loadError" :retry="load" />
    <div v-else-if="loading" class="surface page-feedback">
      <el-skeleton :rows="12" animated />
    </div>
    <template v-else>
      <el-alert
        v-if="editorError"
        class="editor-alert"
        :title="editorError"
        type="error"
        show-icon
        :closable="false"
      />
      <el-alert
        v-if="workflow?.status === 'PUBLISHED'"
        class="editor-alert"
        title="当前 Workflow 已有发布版本，本次保存只会生成或更新草稿，不会修改已发布版本。"
        type="info"
        show-icon
        :closable="false"
      />

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <section class="surface">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">基本信息</h2>
              <span class="surface-subtitle">工作空间内编码必须稳定且唯一</span>
            </div>
            <StatusTag v-if="workflow" :value="workflow.status" />
          </div>
          <div class="surface-body">
            <div class="form-grid">
              <el-form-item label="工作空间" prop="workspaceId">
                <el-select v-model="form.workspaceId" filterable :disabled="!isNew">
                  <el-option
                    v-for="workspace in workspaces"
                    :key="workspace.id"
                    :label="workspace.name"
                    :value="workspace.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="Workflow 编码" prop="code">
                <el-input
                  v-model.trim="form.code"
                  maxlength="128"
                  placeholder="例如：content-review-flow"
                  :disabled="!isNew"
                />
              </el-form-item>
              <el-form-item label="名称" prop="name">
                <el-input v-model.trim="form.name" maxlength="120" show-word-limit />
              </el-form-item>
            </div>
            <el-form-item label="描述" prop="description">
              <el-input v-model="form.description" type="textarea" :rows="2" maxlength="500" show-word-limit />
            </el-form-item>
            <el-form-item label="运行配置 JSON">
              <el-input
                v-model="form.configurationJson"
                type="textarea"
                :rows="5"
                placeholder='例如：{"maxRuntimeSeconds":1800,"maxConcurrency":1}'
              />
            </el-form-item>
          </div>
        </section>

        <section class="surface page-section">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">节点配置</h2>
              <span class="surface-subtitle">节点类型由系统定义，执行器不由前端输入</span>
            </div>
            <el-button type="primary" plain :icon="Plus" @click="addNode">添加节点</el-button>
          </div>
          <div class="surface-body">
            <EmptyState
              v-if="nodes.length === 0"
              title="还没有节点"
              description="至少添加一个 START、一个执行节点和一个 END 节点。"
              :icon="WorkflowIcon"
            >
              <el-button type="primary" :icon="Plus" @click="addNode">添加第一个节点</el-button>
            </EmptyState>
            <div v-else class="node-editor-list">
              <article v-for="(node, index) in nodes" :key="node.localId" class="node-editor">
                <div class="node-editor-header">
                  <div class="node-title">
                    <span class="node-index">{{ index + 1 }}</span>
                    <div>
                      <strong>{{ node.name || node.nodeKey || `节点 ${index + 1}` }}</strong>
                      <small>{{ node.nodeKey || '未设置 key' }}</small>
                    </div>
                  </div>
                  <el-button
                    text
                    type="danger"
                    :icon="Trash2"
                    aria-label="删除节点"
                    @click="removeNode(index)"
                  />
                </div>
                <div class="node-editor-body">
                  <div class="form-grid">
                    <el-form-item label="节点 key">
                      <el-input v-model.trim="node.nodeKey" maxlength="64" placeholder="例如：draft" />
                    </el-form-item>
                    <el-form-item label="节点类型">
                      <el-select v-model="node.nodeType">
                        <el-option
                          v-for="option in nodeTypeOptions"
                          :key="option.value"
                          :label="option.label"
                          :value="option.value"
                        />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="节点名称">
                      <el-input v-model.trim="node.name" maxlength="120" />
                    </el-form-item>
                    <el-form-item v-if="node.nodeType === 'AGENT'" label="Agent 版本">
                      <el-select v-model="node.agentVersionId" clearable filterable placeholder="选择已发布 Agent">
                        <el-option
                          v-for="agent in publishedAgents"
                          :key="agent.id"
                          :label="`${agent.name} · ${agent.code || `#${agent.id}`} · v${agent.publishedVersion?.versionNumber || '—'}`"
                          :value="agent.publishedVersionId"
                        />
                      </el-select>
                    </el-form-item>
                  </div>
                  <el-form-item v-if="node.nodeType !== 'AGENT'" label="节点配置 JSON">
                    <el-input
                      v-model="node.configurationJson"
                      type="textarea"
                      :rows="4"
                      placeholder='例如：{"inputTemplate":"{{input}}"}'
                    />
                  </el-form-item>
                  <p class="node-hint">
                    {{ nodeHint(node.nodeType) }}
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section class="surface page-section">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">连线配置</h2>
              <span class="surface-subtitle">来源和目标使用节点 key，条件不接受任意表达式</span>
            </div>
            <el-button :disabled="nodes.length < 2" plain :icon="Plus" @click="addEdge">添加连线</el-button>
          </div>
          <div class="surface-body">
            <EmptyState
              v-if="edges.length === 0"
              title="还没有连线"
              description="添加连线，把节点组织成可执行的流程图。"
              :icon="ArrowRight"
            >
              <el-button :disabled="nodes.length < 2" plain :icon="Plus" @click="addEdge">
                添加第一条连线
              </el-button>
            </EmptyState>
            <div v-else class="edge-editor-list">
              <article v-for="(edge, index) in edges" :key="edge.localId" class="edge-editor">
                <div class="edge-number">{{ index + 1 }}</div>
                <div class="edge-fields">
                  <div class="form-grid">
                    <el-form-item label="来源节点">
                      <el-select v-model="edge.sourceNodeKey" filterable>
                        <el-option v-for="node in nodes" :key="node.localId" :label="nodeLabel(node)" :value="node.nodeKey" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="目标节点">
                      <el-select v-model="edge.targetNodeKey" filterable>
                        <el-option v-for="node in nodes" :key="node.localId" :label="nodeLabel(node)" :value="node.nodeKey" />
                      </el-select>
                    </el-form-item>
                  </div>
                  <div class="condition-fields">
                    <el-form-item label="分支">
                      <el-select v-model="edge.branch">
                        <el-option
                          v-for="option in branchOptions"
                          :key="option.value"
                          :label="option.label"
                          :value="option.value"
                        />
                      </el-select>
                    </el-form-item>
                  </div>
                </div>
                <el-button
                  text
                  type="danger"
                  :icon="Trash2"
                  aria-label="删除连线"
                  @click="removeEdge(index)"
                />
              </article>
            </div>
          </div>
        </section>

        <section v-if="validation" class="surface page-section">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">校验反馈</h2>
              <span class="surface-subtitle">本地结构检查和后端校验结果</span>
            </div>
            <el-tag :type="validation.valid ? 'success' : 'danger'">
              {{ validation.valid ? '可发布' : '存在问题' }}
            </el-tag>
          </div>
          <div class="surface-body">
            <div v-if="validation.errors.length" class="validation-block error-block">
              <h3>阻断问题</h3>
              <ul>
                <li v-for="(issue, index) in validation.errors" :key="`${issue.code || 'error'}-${index}`">
                  {{ issue.message }}<small v-if="issue.path"> · {{ issue.path }}</small>
                </li>
              </ul>
            </div>
            <div v-if="validation.warnings.length" class="validation-block warning-block">
              <h3>提示</h3>
              <ul>
                <li v-for="(issue, index) in validation.warnings" :key="`${issue.code || 'warning'}-${index}`">
                  {{ issue.message }}<small v-if="issue.path"> · {{ issue.path }}</small>
                </li>
              </ul>
            </div>
            <div v-if="!validation.errors.length && !validation.warnings.length" class="success-text">
              未发现结构问题。
            </div>
          </div>
        </section>
      </el-form>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  GitBranch,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-vue-next'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { listAgents } from '@/api/agents'
import {
  getWorkflow,
  getWorkflowVersion,
  createWorkflow,
  updateWorkflow,
  validateWorkflow,
} from '@/api/workflows'
import { problemMessage } from '@/api/http'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { listWorkspaces } from '@/api/workspaces'
import type {
  Agent,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowUpsertPayload,
  WorkflowValidationIssue,
  WorkflowValidationResult,
  Workspace,
} from '@/types/api'
import { useSubmissionLock } from '@/composables/useSubmissionLock'

interface EditorNode {
  localId: string
  id?: number | null
  nodeKey: string
  nodeType: WorkflowNodeType
  name: string
  agentVersionId: number | null
  configurationJson: string
}

interface EditorEdge {
  localId: string
  id?: number | null
  sourceNodeKey: string
  targetNodeKey: string
  branch: 'DEFAULT' | 'TRUE' | 'FALSE'
}

const WorkflowIcon = GitBranch
const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(true)
const loadError = ref('')
const editorError = ref('')
const validationLoading = ref(false)
const workflow = ref<Workflow>()
const workspaces = ref<Workspace[]>([])
const agents = ref<Agent[]>([])
const nodes = ref<EditorNode[]>([])
const edges = ref<EditorEdge[]>([])
const validation = ref<WorkflowValidationResult>()
const { submitting: saveSubmitting, run: runSave } = useSubmissionLock()

const form = reactive({
  workspaceId: null as number | null,
  code: '',
  name: '',
  description: '',
  configurationJson: '{}',
})

const rules: FormRules = {
  workspaceId: [{ required: true, message: '请选择工作空间', trigger: 'change' }],
  code: [{ required: true, message: '请输入 Workflow 编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入 Workflow 名称', trigger: 'blur' }],
}

const nodeTypeOptions = [
  { value: 'START', label: '开始' },
  { value: 'AGENT', label: 'Agent' },
  { value: 'TOOL', label: '工具' },
  { value: 'APPROVAL', label: '人工确认' },
  { value: 'CONDITION', label: '条件判断' },
  { value: 'END', label: '结束' },
]
const branchOptions = [
  { value: 'DEFAULT', label: '默认' },
  { value: 'TRUE', label: '条件为真' },
  { value: 'FALSE', label: '条件为假' },
]

const isNew = computed(() => route.name === 'workflow-new' || !route.params.id)
const publishedAgents = computed(() => agents.value.filter((agent) => agent.publishedVersionId))

function nodeLabel(node: EditorNode): string {
  return `${node.name || '未命名节点'} · ${node.nodeKey || '未设置 key'}`
}

function nodeHint(nodeType: WorkflowNodeType): string {
  if (nodeType === 'AGENT') return '运行时固定绑定已发布 AgentVersion，不能引用草稿或停用版本。'
  if (nodeType === 'TOOL') return '配置 toolCode、toolVersion 和 arguments；仅能引用系统已启用工具。'
  if (nodeType === 'APPROVAL') return '配置 title 和 instructions；人工批准执行器在后续里程碑接入。'
  if (nodeType === 'CONDITION') return '配置 INPUT 字段条件，并用 TRUE、FALSE 两条分支连接后续节点。'
  return '节点的实际执行能力由后端节点执行器决定。'
}

function newNode(partial: Partial<EditorNode> = {}): EditorNode {
  const number = nodes.value.length + 1
  return {
    localId: `node-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    nodeKey: partial.nodeKey || `node_${number}`,
    nodeType: partial.nodeType || 'AGENT',
    name: partial.name || `节点 ${number}`,
    agentVersionId: partial.agentVersionId ?? null,
    configurationJson: partial.configurationJson || '{}',
    id: partial.id ?? null,
  }
}

function newEdge(partial: Partial<EditorEdge> = {}): EditorEdge {
  const source = partial.sourceNodeKey || nodes.value[0]?.nodeKey || ''
  const target = partial.targetNodeKey || nodes.value[1]?.nodeKey || nodes.value[0]?.nodeKey || ''
  return {
    localId: `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    id: partial.id ?? null,
    sourceNodeKey: source,
    targetNodeKey: target,
    branch: partial.branch || 'DEFAULT',
  }
}

function fromNode(node: WorkflowNode): EditorNode {
  return newNode({
    id: node.id,
    nodeKey: node.nodeKey,
    nodeType: node.nodeType,
    name: node.name,
    agentVersionId: node.agentVersionId ?? null,
    configurationJson: prettyJson(node.configuration),
  })
}

function fromEdge(edge: WorkflowEdge): EditorEdge {
  return newEdge({
    id: edge.id,
    sourceNodeKey: edge.sourceNodeKey,
    targetNodeKey: edge.targetNodeKey,
    branch: edge.branch === 'TRUE' || edge.branch === 'FALSE' ? edge.branch : 'DEFAULT',
  })
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value || {}, null, 2)
  } catch {
    return '{}'
  }
}

function parseObjectJson(value: string, label: string): Record<string, unknown> {
  if (!value.trim()) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`${label}必须是有效 JSON`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label}必须是 JSON 对象`)
  }
  return parsed as Record<string, unknown>
}

function configHasOnly(config: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(config).every((key) => allowed.includes(key))
}

function isPositiveInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function localConfigError(
  node: EditorNode,
  index: number,
  errors: WorkflowValidationIssue[],
): void {
  const path = `nodes[${index}]`
  if (node.nodeType === 'AGENT') {
    if (!node.agentVersionId) {
      errors.push({ severity: 'ERROR', code: 'AGENT_VERSION_REQUIRED', message: `Agent 节点 ${node.nodeKey || index + 1} 未选择已发布 Agent。`, path })
    } else if (!publishedAgents.value.some((agent) => agent.publishedVersionId === node.agentVersionId)) {
      errors.push({ severity: 'ERROR', code: 'AGENT_VERSION_NOT_PUBLISHED', message: `Agent 节点 ${node.nodeKey || index + 1} 必须绑定当前可选的已发布 AgentVersion。`, path })
    }
    return
  }

  let config: Record<string, unknown>
  try {
    config = parseObjectJson(node.configurationJson, `节点 ${node.nodeKey || index + 1} 配置`)
  } catch (parseError) {
    errors.push({ severity: 'ERROR', code: 'NODE_CONFIGURATION_INVALID', message: parseError instanceof Error ? parseError.message : String(parseError), path })
    return
  }

  if (['START', 'END'].includes(node.nodeType) && Object.keys(config).length > 0) {
    errors.push({ severity: 'ERROR', code: 'NODE_CONFIGURATION_UNSUPPORTED', message: `${node.nodeType} 节点不能配置额外字段。`, path })
  }
  if (node.nodeType === 'TOOL') {
    if (!configHasOnly(config, ['toolCode', 'toolVersion', 'arguments'])
      || typeof config.toolCode !== 'string'
      || !config.toolCode.trim()
      || config.toolCode.length > 64
      || !isPositiveInteger(config.toolVersion)
      || !config.arguments
      || typeof config.arguments !== 'object'
      || Array.isArray(config.arguments)) {
      errors.push({ severity: 'ERROR', code: 'TOOL_CONFIGURATION_INVALID', message: 'TOOL 节点必须配置 toolCode、正整数 toolVersion 和对象 arguments。', path })
    }
  }
  if (node.nodeType === 'APPROVAL') {
    if (!configHasOnly(config, ['title', 'instructions'])
      || typeof config.title !== 'string'
      || !config.title.trim()
      || config.title.length > 128
      || (config.instructions !== undefined
        && (typeof config.instructions !== 'string' || config.instructions.length > 2000))) {
      errors.push({ severity: 'ERROR', code: 'APPROVAL_CONFIGURATION_INVALID', message: 'APPROVAL 节点必须配置 title，instructions 为可选文本。', path })
    }
  }
  if (node.nodeType === 'CONDITION') {
    const operator = config.operator
    const field = config.field
    const valueRequired = operator === 'EQUALS' || operator === 'NOT_EQUALS'
    const supportedOperator = ['EQUALS', 'NOT_EQUALS', 'EXISTS', 'NOT_EXISTS'].includes(String(operator))
    const scalarValue = ['string', 'number', 'boolean'].includes(typeof config.value)
    if (!configHasOnly(config, ['source', 'field', 'operator', 'value'])
      || config.source !== 'INPUT'
      || typeof field !== 'string'
      || !/^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*$/.test(field)
      || !supportedOperator
      || (valueRequired && !scalarValue)
      || ((!valueRequired) && Object.prototype.hasOwnProperty.call(config, 'value'))) {
      errors.push({ severity: 'ERROR', code: 'CONDITION_CONFIGURATION_INVALID', message: 'CONDITION 节点必须使用 INPUT、简单字段路径和受限比较操作。', path })
    }
  }
}

function hasCycle(keys: string[], outgoing: Map<string, EditorEdge[]>): boolean {
  const visiting = new Set<string>()
  const completed = new Set<string>()
  const visit = (key: string): boolean => {
    if (visiting.has(key)) return true
    if (completed.has(key)) return false
    visiting.add(key)
    const cycle = (outgoing.get(key) || []).some((edge) => visit(edge.targetNodeKey))
    visiting.delete(key)
    completed.add(key)
    return cycle
  }
  return keys.some((key) => visit(key))
}

function localValidate(): WorkflowValidationResult {
  const errors: WorkflowValidationIssue[] = []
  const warnings: WorkflowValidationIssue[] = []
  const keys = new Set<string>()
  const outgoing = new Map<string, EditorEdge[]>()
  const incoming = new Map<string, EditorEdge[]>()

  if (nodes.value.length === 0) {
    errors.push({ severity: 'ERROR', code: 'WORKFLOW_NO_NODES', message: '至少需要一个节点。' })
  }
  if (nodes.value.length > 50) {
    errors.push({
      severity: 'ERROR',
      code: 'WORKFLOW_LIMIT_EXCEEDED',
      message: '节点数不能超过 50 个。',
      path: 'nodes',
    })
  }
  nodes.value.forEach((node, index) => {
    const path = `nodes[${index}]`
    if (!node.nodeKey.trim()) {
      errors.push({ severity: 'ERROR', code: 'NODE_KEY_REQUIRED', message: '节点 key 不能为空。', path })
    } else if (keys.has(node.nodeKey.trim())) {
      errors.push({ severity: 'ERROR', code: 'NODE_KEY_DUPLICATED', message: `节点 key 重复：${node.nodeKey}`, path })
    } else {
      keys.add(node.nodeKey.trim())
    }
    if (!node.name.trim()) {
      errors.push({ severity: 'ERROR', code: 'NODE_NAME_REQUIRED', message: '节点名称不能为空。', path })
    }
    localConfigError(node, index, errors)
    outgoing.set(node.nodeKey.trim(), [])
    incoming.set(node.nodeKey.trim(), [])
  })
  const startNodes = nodes.value.filter((node) => node.nodeType === 'START')
  const endNodes = nodes.value.filter((node) => node.nodeType === 'END')
  if (startNodes.length !== 1) errors.push({ severity: 'ERROR', code: 'START_NODE_INVALID', message: 'Workflow 必须且只能有一个 START 节点。', path: 'nodes' })
  if (endNodes.length !== 1) errors.push({ severity: 'ERROR', code: 'END_NODE_INVALID', message: 'Workflow 必须且只能有一个 END 节点。', path: 'nodes' })

  const edgeKeys = new Set<string>()
  edges.value.forEach((edge, index) => {
    const path = `edges[${index}]`
    if (!keys.has(edge.sourceNodeKey)) {
      errors.push({ severity: 'ERROR', code: 'EDGE_SOURCE_NOT_FOUND', message: `连线来源节点不存在：${edge.sourceNodeKey || '空'}`, path })
    }
    if (!keys.has(edge.targetNodeKey)) {
      errors.push({ severity: 'ERROR', code: 'EDGE_TARGET_NOT_FOUND', message: `连线目标节点不存在：${edge.targetNodeKey || '空'}`, path })
    }
    if (edge.sourceNodeKey === edge.targetNodeKey && edge.sourceNodeKey) {
      errors.push({ severity: 'ERROR', code: 'SELF_LOOP_NOT_ALLOWED', message: `不允许节点自连：${edge.sourceNodeKey}`, path })
    }
    const edgeKey = `${edge.sourceNodeKey}->${edge.targetNodeKey}:${edge.branch}`
    if (edgeKeys.has(edgeKey)) {
      errors.push({ severity: 'ERROR', code: 'DUPLICATED_EDGE', message: '同一分支不允许重复连线。', path })
    }
    edgeKeys.add(edgeKey)
    if (!['DEFAULT', 'TRUE', 'FALSE'].includes(edge.branch)) {
      errors.push({ severity: 'ERROR', code: 'EDGE_BRANCH_INVALID', message: '连线分支只能是 DEFAULT、TRUE 或 FALSE。', path })
    }
    if (keys.has(edge.sourceNodeKey) && keys.has(edge.targetNodeKey)) {
      outgoing.get(edge.sourceNodeKey)?.push(edge)
      incoming.get(edge.targetNodeKey)?.push(edge)
    }
  })
  nodes.value.forEach((node) => {
    const nodeKey = node.nodeKey.trim()
    const nodeOutgoing = outgoing.get(nodeKey) || []
    const nodeIncoming = incoming.get(nodeKey) || []
    if (node.nodeType === 'START' && nodeIncoming.length > 0) {
      errors.push({ severity: 'ERROR', code: 'START_HAS_INCOMING', message: 'START 节点不能有入边。', path: 'edges' })
    }
    if (node.nodeType === 'END' && nodeOutgoing.length > 0) {
      errors.push({ severity: 'ERROR', code: 'END_HAS_OUTGOING', message: 'END 节点不能有出边。', path: 'edges' })
    }
    if (node.nodeType !== 'END' && nodeOutgoing.length === 0) {
      errors.push({ severity: 'ERROR', code: 'NODE_WITHOUT_OUT_EDGE', message: `非 END 节点必须有出边：${nodeKey}`, path: 'edges' })
    }
    if (node.nodeType !== 'START' && nodeIncoming.length === 0) {
      errors.push({ severity: 'ERROR', code: 'NODE_UNREACHABLE', message: `节点不可从 START 到达：${nodeKey}`, path: 'edges' })
    }
    if (node.nodeType === 'CONDITION') {
      const branches = new Set(nodeOutgoing.map((edge) => edge.branch))
      if (nodeOutgoing.length !== 2 || !branches.has('TRUE') || !branches.has('FALSE')) {
        errors.push({ severity: 'ERROR', code: 'CONDITION_BRANCH_INVALID', message: `CONDITION 节点必须有 TRUE 和 FALSE 两条出边：${nodeKey}`, path: 'edges' })
      }
    } else if (nodeOutgoing.length > 1 || nodeOutgoing.some((edge) => edge.branch !== 'DEFAULT')) {
      errors.push({ severity: 'ERROR', code: 'DEFAULT_BRANCH_INVALID', message: `非 CONDITION 节点只能有一条 DEFAULT 出边：${nodeKey}`, path: 'edges' })
    }
  })
  const startKey = startNodes[0]?.nodeKey.trim()
  if (startKey && keys.has(startKey)) {
    const reachable = new Set<string>()
    const queue = [startKey]
    while (queue.length > 0) {
      const current = queue.shift()!
      if (reachable.has(current)) continue
      reachable.add(current)
      ;(outgoing.get(current) || []).forEach((edge) => queue.push(edge.targetNodeKey))
    }
    keys.forEach((key) => {
      if (!reachable.has(key)) {
        errors.push({ severity: 'ERROR', code: 'NODE_UNREACHABLE', message: `节点不可从 START 到达：${key}`, path: 'edges' })
      }
    })
  }
  if (hasCycle([...keys], outgoing)) {
    errors.push({ severity: 'ERROR', code: 'WORKFLOW_CYCLE', message: 'Workflow 不允许存在环。', path: 'edges' })
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    nodeCount: nodes.value.length,
    edgeCount: edges.value.length,
  }
}

function buildPayload(): WorkflowUpsertPayload {
  const configuration = parseObjectJson(form.configurationJson, '运行配置')
  const nodePayload: WorkflowNode[] = nodes.value.map((node) => ({
    id: node.id ?? null,
    nodeKey: node.nodeKey.trim(),
    nodeType: node.nodeType,
    name: node.name.trim(),
    agentVersionId: node.agentVersionId,
    configuration: node.nodeType === 'AGENT'
      ? node.agentVersionId ? { agentVersionId: node.agentVersionId } : {}
      : parseObjectJson(node.configurationJson, `节点 ${node.nodeKey || '未命名'} 配置`),
  }))
  return {
    workspaceId: form.workspaceId || 0,
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim(),
    configuration,
    nodes: nodePayload,
    edges: edges.value.map((edge) => ({
      id: edge.id ?? null,
      sourceNodeKey: edge.sourceNodeKey,
      targetNodeKey: edge.targetNodeKey,
      branch: edge.branch,
    })),
    expectedVersion: workflow.value?.version ?? undefined,
  }
}

async function applyWorkflow(source: Workflow): Promise<void> {
  workflow.value = source
  form.workspaceId = source.workspaceId ?? workspaces.value[0]?.id ?? null
  form.code = source.code || (source.id ? `workflow-${source.id}` : '')
  form.name = source.name
  form.description = source.description || ''
  const versionId = source.draftVersionId || source.publishedVersionId
  const version = versionId ? await getWorkflowVersion(source.id, versionId) : undefined
  form.configurationJson = prettyJson(version?.configuration || source.configuration)
  nodes.value = (version?.nodes || []).map(fromNode)
  edges.value = (version?.edges || []).map(fromEdge)
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  editorError.value = ''
  try {
    const [workspaceResult, agentResult] = await Promise.all([listWorkspaces(), listAgents()])
    workspaces.value = workspaceResult
    agents.value = agentResult
    if (isNew.value) {
      form.workspaceId = workspaceResult[0]?.id || null
      nodes.value = []
      edges.value = []
      return
    }
    const id = Number(route.params.id)
    if (!Number.isFinite(id) || id <= 0) throw new Error('Workflow ID 无效')
    await applyWorkflow(await getWorkflow(id))
  } catch (loadRequestError) {
    loadError.value = problemMessage(loadRequestError)
  } finally {
    loading.value = false
  }
}

function addNode(): void {
  nodes.value.push(newNode())
}

function removeNode(index: number): void {
  const [removed] = nodes.value.splice(index, 1)
  if (!removed) return
  edges.value = edges.value.filter((edge) => edge.sourceNodeKey !== removed.nodeKey && edge.targetNodeKey !== removed.nodeKey)
}

function addEdge(): void {
  if (nodes.value.length < 2) return
  edges.value.push(newEdge())
}

function removeEdge(index: number): void {
  edges.value.splice(index, 1)
}

async function validateDraft(): Promise<void> {
  editorError.value = ''
  let payload: WorkflowUpsertPayload
  try {
    payload = buildPayload()
  } catch (buildError) {
    validation.value = {
      valid: false,
      errors: [{ severity: 'ERROR', message: buildError instanceof Error ? buildError.message : String(buildError) }],
      warnings: [],
      nodeCount: nodes.value.length,
      edgeCount: edges.value.length,
    }
    return
  }
  const localResult = localValidate()
  validation.value = localResult
  if (!localResult.valid || isNew.value) return
  validationLoading.value = true
  try {
    const serverResult = await validateWorkflow(Number(route.params.id), payload)
    validation.value = {
      ...serverResult,
      errors: [...localResult.errors, ...serverResult.errors],
      warnings: [...localResult.warnings, ...serverResult.warnings],
      valid: localResult.valid && serverResult.valid,
    }
  } catch (validationRequestError) {
    editorError.value = problemMessage(validationRequestError)
  } finally {
    validationLoading.value = false
  }
}

async function save(): Promise<void> {
  if (!(await formRef.value?.validate().catch(() => false))) return
  editorError.value = ''
  const localResult = localValidate()
  validation.value = localResult
  try {
    const payload = buildPayload()
    const result = await runSave(() =>
      isNew.value ? createWorkflow(payload) : updateWorkflow(Number(route.params.id), payload),
    )
    if (!result) return
    ElMessage.success('Workflow 草稿已保存')
    await router.replace(`/workflows/${result.id}`)
  } catch (saveError) {
    editorError.value = problemMessage(saveError)
  }
}

function goBack(): void {
  if (isNew.value) {
    void router.push('/workflows')
    return
  }
  void router.push(`/workflows/${route.params.id}`)
}

onMounted(() => load())
</script>

<style scoped>
.editor-alert {
  margin-bottom: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}

.form-grid :deep(.el-select),
.form-grid :deep(.el-input-number),
.condition-fields :deep(.el-select),
.condition-fields :deep(.el-input) {
  width: 100%;
}

.node-editor-list,
.edge-editor-list {
  display: grid;
  gap: 12px;
}

.node-editor,
.edge-editor {
  overflow: hidden;
  border: 1px solid var(--ow-line-soft);
  border-radius: var(--ow-radius-sm);
  background: var(--ow-surface-raised);
}

.node-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--ow-line-soft);
}

.node-title {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.node-title > div {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.node-title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-title small {
  color: var(--ow-muted);
  font-size: 12px;
}

.node-index,
.edge-number {
  display: grid;
  width: 27px;
  height: 27px;
  flex: none;
  place-items: center;
  color: var(--ow-primary-ink);
  background: var(--ow-primary);
  border-radius: 50%;
  font-size: 12px;
  font-weight: 800;
}

.node-editor-body {
  padding: 14px 12px 8px;
}

.compact-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.node-hint {
  margin: -2px 0 8px;
  color: var(--ow-muted);
  font-size: 12px;
}

.edge-editor {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
}

.edge-number {
  width: 24px;
  height: 24px;
  color: var(--ow-ink-secondary);
  background: var(--ow-surface-hover);
}

.edge-fields {
  min-width: 0;
  flex: 1;
}

.condition-fields {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) minmax(0, 1fr);
  gap: 0 14px;
}

.validation-block {
  margin-top: 12px;
  padding: 11px 13px;
  border-left: 3px solid var(--ow-danger);
  background: var(--ow-danger-soft);
}

.validation-block h3 {
  margin: 0 0 5px;
  font-size: 13px;
}

.validation-block ul {
  margin: 0;
  padding-left: 18px;
}

.validation-block li {
  margin: 3px 0;
}

.validation-block small {
  color: var(--ow-muted);
}

.warning-block {
  border-left-color: var(--ow-accent);
  background: var(--ow-accent-soft);
}

.success-text {
  padding-top: 8px;
}

@media (max-width: 860px) {
  .compact-grid,
  .condition-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .form-grid,
  .compact-grid,
  .condition-fields {
    grid-template-columns: 1fr;
  }

  .edge-editor {
    gap: 8px;
  }
}
</style>
