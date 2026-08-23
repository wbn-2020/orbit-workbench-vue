<template>
  <div class="page">
    <PageHeader
      title="Agent 目录"
      description="管理 Agent 定义、草稿版本和已发布配置。"
      :back="Boolean(route.params.id)"
    >
      <template #actions>
        <el-button :icon="RefreshCw" :loading="loading" @click="load">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新建 Agent</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="load" />
    <div v-else-if="loading" class="surface page-feedback"><el-skeleton :rows="8" animated /></div>
    <EmptyState
      v-else-if="agents.length === 0"
      class="surface"
      title="没有 Agent 定义"
      description="创建一个 Agent 后，为它配置连接、Prompt 和运行限制。"
      :icon="Bot"
    />
    <div v-else class="catalog-layout">
      <section class="surface agent-list">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">Agent 定义</h2>
            <span class="surface-subtitle">{{ agents.length }} 项</span>
          </div>
        </div>
        <button
          v-for="agent in agents"
          :key="agent.id"
          type="button"
          class="agent-row"
          :class="{ active: agent.id === selectedAgentId }"
          @click="selectAgent(agent.id)"
        >
          <Bot aria-hidden="true" />
          <span class="agent-row-main">
            <strong>{{ agent.name }}</strong>
            <small>{{ enumLabel(agent.moduleType) }} · {{ currentVersionLabel(agent) }}</small>
          </span>
          <StatusTag :value="agent.status" />
          <ChevronRight aria-hidden="true" />
        </button>
      </section>

      <div class="stack">
        <section class="surface">
          <div v-if="detailLoading" class="section-feedback"><el-skeleton :rows="7" animated /></div>
          <el-alert
            v-else-if="detailError"
            class="section-alert"
            :title="detailError"
            type="error"
            show-icon
            :closable="false"
          />
          <template v-else-if="detail">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">{{ detail.name }}</h2>
                <span class="surface-subtitle">{{ detail.description || '无描述' }}</span>
              </div>
              <div class="inline-actions">
                <StatusTag :value="detail.status" />
                <el-button :icon="Edit3" @click="openEdit(detail)">编辑</el-button>
                <el-button
                  v-if="canPublish"
                  type="primary"
                  :icon="Upload"
                  :loading="actionSubmitting"
                  @click="publish"
                >
                  发布草稿
                </el-button>
                <el-button
                  v-if="canDisable"
                  type="danger"
                  plain
                  :icon="Ban"
                  :loading="actionSubmitting"
                  @click="disable"
                >
                  停用
                </el-button>
              </div>
            </div>
            <div class="surface-body">
              <el-alert
                v-if="publishError"
                class="publish-alert"
                :title="publishError"
                type="error"
                show-icon
                :closable="false"
              />
              <el-alert
                v-if="publishWarnings.length"
                class="publish-alert"
                title="发布已完成，但后端返回了提示"
                type="warning"
                show-icon
                :closable="false"
              >
                <template #default>
                  <ul class="validation-list">
                    <li v-for="warning in publishWarnings" :key="warning">{{ warning }}</li>
                  </ul>
                </template>
              </el-alert>
              <dl class="detail-grid">
                <div><dt>模块</dt><dd>{{ enumLabel(detail.moduleType) }}</dd></div>
                <div><dt>状态</dt><dd><StatusTag :value="detail.status" /></dd></div>
                <div><dt>当前发布版本</dt><dd>{{ publishedVersionLabel(detail) }}</dd></div>
                <div><dt>当前草稿版本</dt><dd>{{ draftVersionLabel(detail) }}</dd></div>
                <div><dt>默认 AI Connection</dt><dd>{{ connectionLabel(detail.connectionId) }}</dd></div>
                <div><dt>Prompt 版本</dt><dd>{{ promptVersionLabel(detail) }}</dd></div>
                <div><dt>更新时间</dt><dd>{{ formatDateTime(detail.updatedAt) }}</dd></div>
                <div><dt>Agent ID</dt><dd class="mono">{{ detail.id }}</dd></div>
              </dl>
            </div>
          </template>
        </section>

        <section v-if="detail" class="surface">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">Agent 版本</h2>
              <span class="surface-subtitle">{{ versions.length }} 个版本，发布版本不可变</span>
            </div>
          <el-button text :icon="RefreshCw" :loading="versionsLoading" @click="loadVersions()">
              刷新
            </el-button>
          </div>
          <el-alert
            v-if="versionsError"
            class="section-alert"
            :title="versionsError"
            type="error"
            show-icon
            :closable="false"
          />
          <EmptyState
            v-else-if="!versionsLoading && versions.length === 0"
            title="暂无版本记录"
            description="保存 Agent 配置后会生成草稿版本。"
            :icon="History"
          />
          <div v-else class="version-list">
            <button
              v-for="version in versions"
              :key="version.id"
              type="button"
              class="version-row"
              :class="{ active: version.id === selectedVersionId }"
              @click="selectedVersionId = version.id"
            >
              <span class="version-mark">v{{ version.versionNumber || '—' }}</span>
              <span class="version-main">
                <strong>{{ version.connectionName || connectionLabel(version.connectionId) }}</strong>
                <small>{{ version.modelName || '默认模型' }} · {{ formatDateTime(version.createdAt) }}</small>
              </span>
              <StatusTag :value="version.status" />
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </section>

        <section v-if="selectedVersion" class="surface">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">版本 v{{ selectedVersion.versionNumber || '—' }} 详情</h2>
              <span class="surface-subtitle">版本 ID {{ selectedVersion.id }}</span>
            </div>
            <StatusTag :value="selectedVersion.status" />
          </div>
          <div class="surface-body version-detail">
            <dl class="detail-grid">
              <div><dt>Connection</dt><dd>{{ selectedVersion.connectionName || connectionLabel(selectedVersion.connectionId) }}</dd></div>
              <div><dt>Model Profile</dt><dd>{{ selectedVersion.modelProfileId ?? '—' }}</dd></div>
              <div><dt>Prompt 版本</dt><dd>{{ selectedVersion.promptVersionNumber ? `v${selectedVersion.promptVersionNumber}` : selectedVersion.promptVersionId ?? '—' }}</dd></div>
              <div><dt>发布时间</dt><dd>{{ formatDateTime(selectedVersion.publishedAt) }}</dd></div>
            </dl>
            <div class="version-content">
              <div><h3>Prompt 内容</h3><pre>{{ selectedVersion.promptContent || '后端未返回完整 Prompt 内容' }}</pre></div>
              <div><h3>变量配置</h3><pre>{{ prettyJson(selectedVersion.promptVariables) }}</pre></div>
              <div><h3>运行限制与配置</h3><pre>{{ prettyJson(selectedVersion.configuration) }}</pre></div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <el-drawer
      v-model="editorOpen"
      :title="editingId ? '编辑 Agent，生成草稿' : '新建 Agent'"
      size="min(720px, 96vw)"
      destroy-on-close
    >
      <el-alert v-if="editorError" class="editor-alert" :title="editorError" type="error" show-icon :closable="false" />
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <div class="form-grid">
          <el-form-item label="工作空间" prop="workspaceId">
            <el-select v-model="form.workspaceId" filterable>
              <el-option
                v-for="workspace in workspaces"
                :key="workspace.id"
                :label="workspace.name"
                :value="workspace.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="Agent 编码" prop="code">
            <el-input v-model.trim="form.code" maxlength="128" placeholder="例如：tech-learning" />
          </el-form-item>
          <el-form-item label="名称" prop="name"><el-input v-model.trim="form.name" maxlength="120" show-word-limit /></el-form-item>
          <el-form-item label="moduleType" prop="moduleType">
            <el-select v-model="form.moduleType">
              <el-option label="技术学习" value="TECH_LEARNING" />
              <el-option label="数据分析" value="DATA_ANALYSIS" />
              <el-option label="内容创作" value="CONTENT_CREATION" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="描述" prop="description"><el-input v-model="form.description" type="textarea" :rows="2" maxlength="500" show-word-limit /></el-form-item>
        <div class="form-grid">
          <el-form-item label="默认 AI Connection" prop="connectionId">
            <el-select v-model="form.connectionId" clearable filterable placeholder="选择已保存连接">
              <el-option
                v-for="connection in connections"
                :key="connection.id"
                :label="`${connection.name} · ${connection.modelName}`"
                :value="connection.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="Model Profile ID"><el-input-number v-model="form.modelProfileId" :min="1" :controls="false" /></el-form-item>
        </div>
        <el-form-item label="Prompt 内容" prop="promptContent">
          <el-input v-model="form.promptContent" type="textarea" :rows="10" maxlength="20000" show-word-limit placeholder="输入 Agent 的系统 Prompt" />
        </el-form-item>
        <el-form-item label="变量 JSON">
          <el-input v-model="form.promptVariablesJson" type="textarea" :rows="4" placeholder='例如：["topic", "documents"] 或 {"topic":{"type":"string"}}' />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="绑定 SkillVersion">
            <el-select
              v-model="form.skillVersionIds"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              clearable
              placeholder="选择当前 Workspace 的已发布 SkillVersion"
            >
              <el-option
                v-for="option in skillVersionOptions"
                :key="option.id"
                :label="option.label"
                :value="option.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="绑定 ToolVersion">
            <el-select
              v-model="form.toolVersionIds"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              clearable
              placeholder="选择已发布 ToolVersion"
            >
              <el-option
                v-for="option in toolVersionOptions"
                :key="option.id"
                :label="option.label"
                :value="option.id"
              />
            </el-select>
          </el-form-item>
        </div>
        <div class="form-grid limits-grid">
          <el-form-item label="最大步骤数"><el-input-number v-model="form.maxSteps" :min="1" :max="1000" /></el-form-item>
          <el-form-item label="最大工具调用数"><el-input-number v-model="form.maxToolCalls" :min="0" :max="1000" /></el-form-item>
          <el-form-item label="最大运行秒数"><el-input-number v-model="form.maxRuntimeSeconds" :min="1" :max="86400" /></el-form-item>
          <el-form-item label="最大输出 Token"><el-input-number v-model="form.maxOutputTokens" :min="1" :max="1000000" /></el-form-item>
        </div>
        <el-form-item label="配置 JSON">
          <el-input v-model="form.configurationJson" type="textarea" :rows="6" placeholder='例如：{"temperature":0.2}' />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editorOpen = false">取消</el-button>
        <el-button type="primary" :loading="saveSubmitting" @click="save">保存草稿</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { Ban, Bot, ChevronRight, Edit3, History, Plus, RefreshCw, Upload } from 'lucide-vue-next'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { createAgent, disableAgent, getAgent, listAgents, publishAgent, updateAgent } from '@/api/agents'
import { listAiConnections } from '@/api/aiConnections'
import { listSkills } from '@/api/skills'
import { listTools } from '@/api/tools'
import { listWorkspaces } from '@/api/workspaces'
import { problemMessage } from '@/api/http'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type {
  Agent,
  AgentUpsertPayload,
  AgentVersion,
  AiConnection,
  Skill,
  ToolCatalog,
  Workspace,
} from '@/types/api'
import { enumLabel, formatDateTime } from '@/utils/format'
import { useSubmissionLock } from '@/composables/useSubmissionLock'

const route = useRoute()
const loading = ref(true)
const error = ref('')
const agents = ref<Agent[]>([])
const connections = ref<AiConnection[]>([])
const workspaces = ref<Workspace[]>([])
const tools = ref<ToolCatalog[]>([])
const skills = ref<Skill[]>([])
const selectedAgentId = ref<number>()
const detail = ref<Agent>()
const detailLoading = ref(false)
const detailError = ref('')
const versions = ref<AgentVersion[]>([])
const versionsLoading = ref(false)
const versionsError = ref('')
const selectedVersionId = ref<number>()
const editorOpen = ref(false)
const editingId = ref<number | null>(null)
const editorError = ref('')
const publishError = ref('')
const publishWarnings = ref<string[]>([])
const formRef = ref<FormInstance>()
const { submitting: saveSubmitting, run: runSave } = useSubmissionLock()
const { submitting: actionSubmitting, run: runAction } = useSubmissionLock()

const form = reactive({
  workspaceId: null as number | null,
  code: '',
  name: '',
  description: '',
  moduleType: 'TECH_LEARNING',
  connectionId: null as number | null,
  modelProfileId: null as number | null,
  promptContent: '',
  promptVariablesJson: '[]',
  skillVersionIds: [] as number[],
  toolVersionIds: [] as number[],
  configurationJson: '{}',
  maxSteps: 20,
  maxToolCalls: 20,
  maxRuntimeSeconds: 1800,
  maxOutputTokens: 8000,
})

const rules: FormRules = {
  workspaceId: [{ required: true, message: '请选择工作空间', trigger: 'change' }],
  code: [{ required: true, message: '请输入 Agent 编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入 Agent 名称', trigger: 'blur' }],
  moduleType: [{ required: true, message: '请选择 moduleType', trigger: 'change' }],
  connectionId: [{ required: true, message: '请选择默认 AI Connection', trigger: 'change' }],
  promptContent: [{ required: true, message: '请输入 Prompt 内容', trigger: 'blur' }],
}

const selectedVersion = computed(() => versions.value.find((version) => version.id === selectedVersionId.value))
const toolVersionOptions = computed(() => tools.value.flatMap((tool) =>
  tool.versions
    .filter((version) => version.status === 'PUBLISHED')
    .map((version) => ({
      id: version.id,
      label: `${tool.toolCode} · v${version.versionNumber} · ${tool.name}`,
    })),
))
const skillVersionOptions = computed(() => skills.value.flatMap((skill) =>
  skill.versions
    .filter((version) => version.status === 'PUBLISHED')
    .map((version) => ({
      id: version.id,
      label: `${skill.skillCode} · v${version.versionNumber} · ${skill.name}`,
    })),
))
const draftVersion = computed(() =>
  detail.value?.draftVersion ||
  versions.value.find((version) => version.status === 'DRAFT'),
)
const canPublish = computed(() => Boolean(detail.value && detail.value.status !== 'DISABLED' && draftVersion.value))
const canDisable = computed(() => Boolean(detail.value && detail.value.status !== 'DISABLED'))

watch(() => form.workspaceId, (workspaceId, previousWorkspaceId) => {
  if (!editorOpen.value || workspaceId === previousWorkspaceId) return
  form.skillVersionIds = []
  void loadSkills(workspaceId)
})

function currentVersionLabel(agent: Agent): string {
  if (agent.publishedVersion?.versionNumber) return `已发布 v${agent.publishedVersion.versionNumber}`
  if (agent.publishedVersionId) return `已发布 #${agent.publishedVersionId}`
  if (agent.draftVersion?.versionNumber) return `草稿 v${agent.draftVersion.versionNumber}`
  if (agent.draftVersionId) return `草稿 #${agent.draftVersionId}`
  return '未发布'
}
function publishedVersionLabel(agent: Agent): string {
  return agent.publishedVersion?.versionNumber ? `v${agent.publishedVersion.versionNumber}` : agent.publishedVersionId ? `版本 ID ${agent.publishedVersionId}` : '未发布'
}
function draftVersionLabel(agent: Agent): string {
  return agent.draftVersion?.versionNumber ? `v${agent.draftVersion.versionNumber}` : agent.draftVersionId ? `版本 ID ${agent.draftVersionId}` : '无草稿'
}
function promptVersionLabel(agent: Agent): string {
  return agent.promptVersionNumber ? `v${agent.promptVersionNumber}` : agent.promptVersionId ? `版本 ID ${agent.promptVersionId}` : '—'
}
function connectionLabel(id?: number | null): string {
  if (!id) return '—'
  const connection = connections.value.find((item) => item.id === id)
  return connection ? `${connection.name} · ${connection.modelName}` : `Connection #${id}`
}
function prettyJson(value: unknown): string {
  if (value === undefined || value === null) return '—'
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}
function numberOrDefault(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
function versionIds(configuration: Record<string, unknown>, key: string): number[] {
  const value = configuration[key]
  if (!Array.isArray(value)) return []
  return [...new Set(value
    .map((item) => typeof item === 'number' ? item : Number(item))
    .filter((item) => Number.isInteger(item) && item > 0))]
}
function fallbackVersions(agent?: Agent): AgentVersion[] {
  if (!agent) return []
  const result = [...(agent.versions || [])]
  if (agent.draftVersion && !result.some((version) => version.id === agent.draftVersion?.id)) result.push(agent.draftVersion)
  if (agent.publishedVersion && !result.some((version) => version.id === agent.publishedVersion?.id)) result.push(agent.publishedVersion)
  return result.sort((left, right) => right.versionNumber - left.versionNumber)
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const [agentResult, connectionResult, workspaceResult, toolResult] = await Promise.all([
      listAgents(),
      listAiConnections(1, 100),
      listWorkspaces(),
      listTools('PUBLISHED'),
    ])
    agents.value = agentResult
    connections.value = connectionResult.items
    workspaces.value = workspaceResult
    tools.value = toolResult
    const routeId = Number(route.params.id)
    const firstId = Number.isFinite(routeId) && routeId > 0 ? routeId : selectedAgentId.value || agents.value[0]?.id
    if (firstId && agents.value.some((agent) => agent.id === firstId)) await selectAgent(firstId)
    else detail.value = undefined
  } catch (loadError) {
    error.value = problemMessage(loadError)
  } finally {
    loading.value = false
  }
}
async function selectAgent(id: number): Promise<void> {
  selectedAgentId.value = id
  detailLoading.value = true
  detailError.value = ''
  publishError.value = ''
  publishWarnings.value = []
  try {
    const result = await getAgent(id)
    detail.value = result
    await loadVersions(result)
  } catch (loadError) {
    detailError.value = problemMessage(loadError)
  } finally {
    detailLoading.value = false
  }
}
async function loadVersions(source?: Agent): Promise<void> {
  versionsLoading.value = true
  versionsError.value = ''
  try {
    const result = source?.versions || detail.value?.versions || []
    versions.value = result.length ? result : fallbackVersions(source || detail.value)
  } catch (loadError) {
    versions.value = fallbackVersions(source || detail.value)
    if (!versions.value.length) versionsError.value = problemMessage(loadError)
  } finally {
    versionsLoading.value = false
    if (!versions.value.some((version) => version.id === selectedVersionId.value)) {
      selectedVersionId.value = detail.value?.draftVersionId || detail.value?.publishedVersionId || versions.value[0]?.id
    }
  }
}
function openCreate(): void {
  editingId.value = null
  editorError.value = ''
  form.workspaceId = workspaces.value[0]?.id || null
  form.code = ''
  form.name = ''
  form.description = ''
  form.moduleType = 'TECH_LEARNING'
  form.connectionId = connections.value.find((connection) => connection.enabled)?.id || null
  form.modelProfileId = null
  form.promptContent = ''
  form.promptVariablesJson = '[]'
  form.skillVersionIds = []
  form.toolVersionIds = []
  form.configurationJson = '{}'
  form.maxSteps = 20
  form.maxToolCalls = 20
  form.maxRuntimeSeconds = 1800
  form.maxOutputTokens = 8000
  void loadSkills(form.workspaceId)
  editorOpen.value = true
}
function openEdit(agent: Agent): void {
  const version = agent.draftVersion || agent.publishedVersion || versions.value[0]
  editingId.value = agent.id
  editorError.value = ''
  form.workspaceId = agent.workspaceId ?? workspaces.value[0]?.id ?? null
  form.code = agent.code || `agent-${agent.id}`
  form.name = agent.name
  form.description = agent.description || ''
  form.moduleType = agent.moduleType || 'TECH_LEARNING'
  form.connectionId = version?.connectionId ?? agent.connectionId ?? null
  form.modelProfileId = version?.modelProfileId ?? agent.modelProfileId ?? null
  form.promptContent = version?.promptContent || agent.promptContent || ''
  form.promptVariablesJson = prettyJson(version?.promptVariables ?? agent.promptVariables ?? [])
  const configuration = version?.configuration || agent.configuration || {}
  form.skillVersionIds = versionIds(configuration, 'skillVersionIds')
  form.toolVersionIds = versionIds(configuration, 'toolVersionIds')
  const limits = configuration.limits
  const limitConfig = limits && typeof limits === 'object' ? limits as Record<string, unknown> : {}
  form.maxSteps = numberOrDefault(limitConfig.maxSteps, 20)
  form.maxToolCalls = numberOrDefault(limitConfig.maxToolCalls, 20)
  form.maxRuntimeSeconds = numberOrDefault(limitConfig.maxRuntimeSeconds, 1800)
  form.maxOutputTokens = numberOrDefault(limitConfig.maxOutputTokens, 8000)
  form.configurationJson = prettyJson(configuration)
  void loadSkills(form.workspaceId)
  editorOpen.value = true
}
async function loadSkills(workspaceId: number | null): Promise<void> {
  if (!workspaceId) {
    skills.value = []
    return
  }
  try {
    skills.value = await listSkills(workspaceId)
  } catch (loadError) {
    skills.value = []
    editorError.value = problemMessage(loadError)
  }
}
function parseJson(text: string, label: string): unknown {
  if (!text.trim()) return {}
  try { return JSON.parse(text) } catch { throw new Error(`${label}必须是有效 JSON`) }
}
function buildPayload(): AgentUpsertPayload {
  const variables = parseJson(form.promptVariablesJson, '变量 JSON')
  if (variables !== null && typeof variables !== 'object') throw new Error('变量 JSON 必须是数组或对象')
  const configuration = parseJson(form.configurationJson, '配置 JSON')
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) throw new Error('配置 JSON 必须是对象')
  const nextConfiguration: Record<string, unknown> = {
    ...(configuration as Record<string, unknown>),
    moduleType: form.moduleType,
    limits: {
      ...((configuration as Record<string, unknown>).limits as Record<string, unknown> || {}),
      maxSteps: form.maxSteps,
      maxToolCalls: form.maxToolCalls,
      maxRuntimeSeconds: form.maxRuntimeSeconds,
      maxOutputTokens: form.maxOutputTokens,
    },
  }
  if (form.skillVersionIds.length) nextConfiguration.skillVersionIds = [...form.skillVersionIds]
  else delete nextConfiguration.skillVersionIds
  if (form.toolVersionIds.length) nextConfiguration.toolVersionIds = [...form.toolVersionIds]
  else delete nextConfiguration.toolVersionIds
  return {
    workspaceId: form.workspaceId || 0,
    code: form.code,
    name: form.name,
    description: form.description,
    moduleType: form.moduleType,
    connectionId: form.connectionId,
    modelProfileId: form.modelProfileId,
    promptContent: form.promptContent,
    promptVariables: variables as AgentUpsertPayload['promptVariables'],
    configuration: nextConfiguration,
    expectedVersion: detail.value?.version ?? undefined,
  }
}
async function save(): Promise<void> {
  if (!(await formRef.value?.validate().catch(() => false))) return
  editorError.value = ''
  try {
    const payload = buildPayload()
    const result = await runSave(() => editingId.value ? updateAgent(editingId.value, payload) : createAgent(payload))
    if (!result) return
    ElMessage.success(editingId.value ? 'Agent 草稿已保存' : 'Agent 已创建')
    editorOpen.value = false
    await load()
    await selectAgent(result.id)
  } catch (saveError) {
    editorError.value = problemMessage(saveError)
  }
}
async function publish(): Promise<void> {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm('发布后该版本不可修改，运行会固定绑定已发布的 AgentVersion。', '确认发布 Agent', { type: 'warning', confirmButtonText: '发布', cancelButtonText: '取消' })
  } catch { return }
  publishError.value = ''
  publishWarnings.value = []
  try {
    const result = await runAction(() => publishAgent(detail.value!.id, draftVersion.value?.id))
    if (!result) return
    publishWarnings.value = result.validationWarnings
    if (!result.valid) {
      publishError.value = result.validationErrors.join('；') || '后端校验未通过，当前草稿不能发布'
      return
    }
    ElMessage.success('Agent 已发布')
    await load()
  } catch (publishRequestError) {
    publishError.value = problemMessage(publishRequestError)
  }
}
async function disable(): Promise<void> {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm('停用只影响后续使用，不会删除历史版本或运行记录。', '确认停用 Agent', { type: 'warning', confirmButtonText: '停用', cancelButtonText: '取消' })
    const result = await runAction(() => disableAgent(detail.value!.id))
    if (!result) return
    ElMessage.success('Agent 已停用')
    await load()
  } catch (disableError) {
    if (disableError !== 'cancel') ElMessage.error(problemMessage(disableError))
  }
}
watch(() => route.params.id, (value) => {
  const id = Number(value)
  if (id > 0 && id !== selectedAgentId.value && agents.value.some((agent) => agent.id === id)) void selectAgent(id)
})
onMounted(() => load())
</script>

<style scoped>
.catalog-layout {
  display: grid;
  grid-template-columns: minmax(270px, 0.42fr) minmax(0, 1fr);
  align-items: start;
  gap: 16px;
}
.agent-list { overflow: hidden; }
.agent-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto 16px;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 76px;
  padding: 11px 14px;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--ow-line-soft);
  cursor: pointer;
}
.agent-row:hover, .agent-row.active, .version-row:hover, .version-row.active { background: var(--ow-surface-raised); }
.agent-row > svg { width: 17px; height: 17px; color: var(--ow-primary); }
.agent-row-main, .version-main { display: grid; min-width: 0; gap: 3px; }
.agent-row small, .version-main small, .surface-subtitle, .option-hint { color: var(--ow-muted); font-size: 12px; }
.section-feedback { padding: 16px; }
.section-alert, .publish-alert, .editor-alert { width: auto; margin: 12px 16px; }
.validation-list { margin: 0; padding-left: 18px; }
.version-list { padding: 6px 8px 8px; }
.version-row {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto 16px;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 68px;
  padding: 10px 8px;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--ow-line-soft);
  cursor: pointer;
}
.version-mark {
  display: grid;
  min-height: 28px;
  place-items: center;
  color: var(--ow-primary-strong);
  background: var(--ow-primary-soft);
  border-radius: var(--ow-radius-sm);
  font-weight: 700;
}
.version-detail { display: grid; gap: 18px; }
.version-content { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.version-content h3 { margin: 0 0 6px; font-size: 13px; }
.version-content pre {
  min-height: 100px;
  max-height: 260px;
  padding: 11px;
  margin: 0;
  overflow: auto;
  color: var(--ow-ink-secondary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: var(--ow-surface-raised);
  border: 1px solid var(--ow-line-soft);
  border-radius: var(--ow-radius-sm);
  font: 12px/1.55 "Cascadia Code", "SFMono-Regular", Consolas, monospace;
}
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 14px; }
.form-grid :deep(.el-select), .form-grid :deep(.el-input-number) { width: 100%; }
.limits-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.option-hint { float: right; }
.mono { font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace; font-size: 12px; }
@media (max-width: 980px) { .catalog-layout, .version-content { grid-template-columns: 1fr; } }
@media (max-width: 620px) {
  .form-grid, .limits-grid { grid-template-columns: 1fr; }
  .agent-row, .version-row { grid-template-columns: 20px minmax(0, 1fr) auto; }
  .agent-row > svg:last-child, .version-row > svg:last-child { display: none; }
}
</style>
