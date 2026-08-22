<template>
  <div class="page">
    <PageHeader
      :title="workflow?.name || 'Workflow 详情'"
      :description="workflow?.description || '查看结构化流程、版本和运行记录。'"
      back
    >
      <template #actions>
        <el-button :icon="RefreshCw" :loading="loading" @click="load">刷新</el-button>
        <el-button v-if="workflow" :icon="Edit3" @click="router.push(`/workflows/${workflow.id}/editor`)">
          编辑草稿
        </el-button>
        <el-button
          v-if="workflow && canPublish"
          type="primary"
          :icon="Upload"
          :loading="actionSubmitting"
          @click="publish"
        >
          发布草稿
        </el-button>
        <el-button
          v-if="workflow && canDisable"
          type="danger"
          plain
          :icon="Ban"
          :loading="actionSubmitting"
          @click="disable"
        >
          停用
        </el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="load" />
    <div v-else-if="loading" class="surface page-feedback">
      <el-skeleton :rows="9" animated />
    </div>
    <template v-else-if="workflow">
      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">Workflow 概览</h2>
            <span class="surface-subtitle">{{ workflow.code || '未设置编码' }}</span>
          </div>
          <StatusTag :value="workflow.status" />
        </div>
        <div class="surface-body">
          <dl class="detail-grid">
            <div><dt>工作空间</dt><dd>{{ workspaceLabel(workflow.workspaceId) }}</dd></div>
            <div><dt>状态</dt><dd><StatusTag :value="workflow.status" /></dd></div>
            <div><dt>当前发布版本</dt><dd>{{ publishedVersionLabel }}</dd></div>
            <div><dt>当前草稿版本</dt><dd>{{ draftVersionLabel }}</dd></div>
            <div><dt>节点数</dt><dd>{{ activeVersion?.nodes.length || 0 }}</dd></div>
            <div><dt>连线数</dt><dd>{{ activeVersion?.edges.length || 0 }}</dd></div>
            <div><dt>更新时间</dt><dd>{{ formatDateTime(workflow.updatedAt) }}</dd></div>
            <div><dt>Workflow ID</dt><dd class="mono">{{ workflow.id }}</dd></div>
          </dl>
        </div>
      </section>

      <section class="surface page-section">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">结构预览</h2>
            <span class="surface-subtitle">结构化节点和受限条件连线</span>
          </div>
          <div class="inline-actions">
            <el-select
              v-model="selectedVersionId"
              class="version-select"
              placeholder="选择版本"
              @change="loadSelectedVersion"
            >
              <el-option
                v-for="version in versions"
                :key="version.id"
                :label="`v${version.versionNumber || '—'} · ${enumLabel(version.status)}`"
                :value="version.id"
              />
            </el-select>
            <StatusTag v-if="selectedVersion" :value="selectedVersion.status" />
          </div>
        </div>
        <div class="surface-body">
          <el-alert
            v-if="validationError"
            class="section-alert"
            :title="validationError"
            type="error"
            show-icon
            :closable="false"
          />
          <div class="structure-grid">
            <div>
              <div class="subsection-heading">
                <div>
                  <h3>节点</h3>
                  <span>{{ selectedVersion?.nodes.length || 0 }} 个</span>
                </div>
              </div>
              <div v-if="selectedVersion?.nodes.length" class="node-list">
                <div v-for="node in selectedVersion.nodes" :key="node.nodeKey" class="node-item">
                  <span class="node-type">{{ enumLabel(node.nodeType) }}</span>
                  <div class="node-main">
                    <strong>{{ node.name || node.nodeKey }}</strong>
                    <small>{{ node.nodeKey }}<template v-if="node.agentVersionId"> · AgentVersion #{{ node.agentVersionId }}</template></small>
                  </div>
                  <el-tag v-if="node.requiresApproval" size="small" type="warning">需确认</el-tag>
                </div>
              </div>
              <EmptyState
                v-else
                title="暂无节点"
                description="进入编辑器添加开始、Agent、确认、条件或结束节点。"
                :icon="WorkflowIcon"
              />
            </div>
            <div>
              <div class="subsection-heading">
                <div>
                  <h3>连线</h3>
                  <span>{{ selectedVersion?.edges.length || 0 }} 条</span>
                </div>
              </div>
              <div v-if="selectedVersion?.edges.length" class="edge-list">
                <div v-for="edge in selectedVersion.edges" :key="edge.id || `${edge.sourceNodeKey}-${edge.targetNodeKey}`" class="edge-item">
                  <span class="edge-route">{{ edge.sourceNodeKey }} <ArrowRight aria-hidden="true" /> {{ edge.targetNodeKey }}</span>
                  <span class="edge-condition">{{ branchLabel(edge.branch) }}</span>
                </div>
              </div>
              <EmptyState
                v-else
                title="暂无连线"
                description="节点之间需要配置连线后才能形成可执行流程。"
                :icon="ArrowRight"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="surface page-section">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">版本与校验</h2>
            <span class="surface-subtitle">发布前由后端再次校验图结构和运行限制</span>
          </div>
          <div class="inline-actions">
            <el-button :icon="ShieldCheck" :loading="validationLoading" @click="validate">
              校验当前草稿
            </el-button>
            <el-button text :icon="RefreshCw" :loading="loading" @click="load">刷新</el-button>
          </div>
        </div>
        <div class="surface-body">
          <el-alert
            v-if="validation"
            :title="validation.valid ? '当前 Workflow 可以发布' : '当前 Workflow 不能发布'"
            :type="validation.valid ? 'success' : 'error'"
            show-icon
            :closable="false"
          >
            <template #default>
              <div class="validation-summary">
                <span v-if="validation.nodeCount !== null && validation.nodeCount !== undefined">
                  节点 {{ validation.nodeCount }}
                </span>
                <span v-if="validation.edgeCount !== null && validation.edgeCount !== undefined">
                  连线 {{ validation.edgeCount }}
                </span>
                <span>错误 {{ validation.errors.length }}</span>
                <span>提示 {{ validation.warnings.length }}</span>
              </div>
            </template>
          </el-alert>
          <div v-if="validation?.errors.length" class="validation-block error-block">
            <h3>阻断问题</h3>
            <ul>
              <li v-for="(issue, index) in validation.errors" :key="`${issue.code || 'error'}-${index}`">
                {{ issue.message }}<small v-if="issue.path"> · {{ issue.path }}</small>
              </li>
            </ul>
          </div>
          <div v-if="validation?.warnings.length" class="validation-block warning-block">
            <h3>提示</h3>
            <ul>
              <li v-for="(issue, index) in validation.warnings" :key="`${issue.code || 'warning'}-${index}`">
                {{ issue.message }}<small v-if="issue.path"> · {{ issue.path }}</small>
              </li>
            </ul>
          </div>
          <div v-if="!validation" class="muted validation-placeholder">
            尚未执行后端校验。编辑并保存草稿后，发布前应先执行校验。
          </div>
        </div>
      </section>

      <section class="surface page-section">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">运行记录</h2>
            <span class="surface-subtitle">运行固定绑定发布的 WorkflowVersion</span>
          </div>
          <div class="inline-actions">
            <el-button
              v-if="canRun"
              type="primary"
              :icon="Play"
              :loading="runSubmitting"
              @click="run"
            >
              运行当前版本
            </el-button>
            <el-button text :icon="RefreshCw" :loading="runsLoading" @click="loadRuns">刷新</el-button>
          </div>
        </div>
        <div v-if="runsError" class="section-alert-wrap">
          <el-alert :title="runsError" type="error" show-icon :closable="false" />
        </div>
        <div v-else-if="runsLoading" class="section-feedback"><el-skeleton :rows="5" animated /></div>
        <EmptyState
          v-else-if="runs.length === 0"
          title="暂无运行记录"
          description="发布一个有效版本后，可以从这里启动 Workflow。"
          :icon="Play"
        />
        <div v-else class="table-wrap">
          <el-table :data="runs" row-key="id" @row-click="openRun">
            <el-table-column label="运行" min-width="190">
              <template #default="{ row }">
                <div class="run-cell">
                  <strong>#{{ row.id }}</strong>
                  <span>{{ row.workflowVersionId ? `WorkflowVersion #${row.workflowVersionId}` : '未返回版本 ID' }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="130">
              <template #default="{ row }"><StatusTag :value="row.status" /></template>
            </el-table-column>
            <el-table-column label="当前节点" min-width="170">
              <template #default="{ row }">{{ row.currentNodeName || row.currentNodeKey || '—' }}</template>
            </el-table-column>
            <el-table-column label="等待原因" min-width="180">
              <template #default="{ row }">{{ row.waitingReason || '—' }}</template>
            </el-table-column>
            <el-table-column label="开始时间" width="160">
              <template #default="{ row }">{{ formatDateTime(row.startedAt || row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button text :icon="ArrowUpRight" aria-label="查看运行详情" @click.stop="openRun(row)" />
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div v-if="runTotal > 0" class="pagination">
          <el-pagination
            v-model:current-page="runPage"
            v-model:page-size="runSize"
            layout="total, prev, pager, next"
            :total="runTotal"
            :page-sizes="[20, 50]"
            @current-change="loadRuns"
            @size-change="loadRuns"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowRight,
  ArrowUpRight,
  Ban,
  Edit3,
  GitBranch,
  Play,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  createWorkflowRun,
  disableWorkflow,
  getWorkflow,
  getWorkflowVersion,
  listWorkflowRuns,
  publishWorkflow,
  validateWorkflow,
} from '@/api/workflows'
import { problemMessage } from '@/api/http'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type {
  Workflow,
  WorkflowRunSummary,
  WorkflowValidationResult,
  WorkflowVersion,
  Workspace,
} from '@/types/api'
import { listWorkspaces } from '@/api/workspaces'
import { enumLabel, formatDateTime } from '@/utils/format'
import { useSubmissionLock } from '@/composables/useSubmissionLock'

const WorkflowIcon = GitBranch
const route = useRoute()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const workflow = ref<Workflow>()
const workspaces = ref<Workspace[]>([])
const selectedVersionId = ref<number>()
const selectedVersion = ref<WorkflowVersion>()
const validation = ref<WorkflowValidationResult>()
const validationError = ref('')
const validationLoading = ref(false)
const runs = ref<WorkflowRunSummary[]>([])
const runsLoading = ref(false)
const runsError = ref('')
const runPage = ref(1)
const runSize = ref(20)
const runTotal = ref(0)
const { submitting: actionSubmitting, run: runAction } = useSubmissionLock()
const { submitting: runSubmitting, run: runRequest } = useSubmissionLock()

const versions = computed<WorkflowVersion[]>(() => {
  const source = workflow.value
  if (!source) return []
  const result = [...(source.versions || [])]
  if (source.draftVersion && !result.some((version) => version.id === source.draftVersion?.id)) {
    result.push(source.draftVersion)
  }
  if (source.publishedVersion && !result.some((version) => version.id === source.publishedVersion?.id)) {
    result.push(source.publishedVersion)
  }
  return result.sort((left, right) => right.versionNumber - left.versionNumber)
})

const activeVersion = computed(() => selectedVersion.value)
const draftVersion = computed(() => workflow.value?.draftVersion || versions.value.find((version) => version.status === 'DRAFT'))
const canPublish = computed(() => Boolean(workflow.value && workflow.value.status !== 'DISABLED' && draftVersion.value))
const canDisable = computed(() => Boolean(workflow.value && workflow.value.status !== 'DISABLED'))
const canRun = computed(() => Boolean(workflow.value?.publishedVersionId || workflow.value?.publishedVersion))
const publishedVersionLabel = computed(() => {
  if (workflow.value?.publishedVersion?.versionNumber) return `v${workflow.value.publishedVersion.versionNumber}`
  return workflow.value?.publishedVersionId ? `版本 ID ${workflow.value.publishedVersionId}` : '未发布'
})
const draftVersionLabel = computed(() => {
  if (workflow.value?.draftVersion?.versionNumber) return `v${workflow.value.draftVersion.versionNumber}`
  return workflow.value?.draftVersionId ? `版本 ID ${workflow.value.draftVersionId}` : '无草稿'
})

function workspaceLabel(id?: number | null): string {
  if (!id) return '—'
  return workspaces.value.find((workspace) => workspace.id === id)?.name || `Workspace #${id}`
}

function branchLabel(branch: string): string {
  if (branch === 'TRUE') return '条件为真'
  if (branch === 'FALSE') return '条件为假'
  return '默认分支'
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  validation.value = undefined
  validationError.value = ''
  try {
    const id = Number(route.params.id)
    if (!Number.isFinite(id) || id <= 0) throw new Error('Workflow ID 无效')
    const [result, workspaceResult] = await Promise.all([getWorkflow(id), listWorkspaces()])
    workflow.value = result
    workspaces.value = workspaceResult
    selectedVersionId.value = result.draftVersionId || result.publishedVersionId || versions.value[0]?.id
    await loadSelectedVersion()
    await loadRuns()
  } catch (loadError) {
    error.value = problemMessage(loadError)
  } finally {
    loading.value = false
  }
}

async function loadSelectedVersion(): Promise<void> {
  if (!workflow.value || !selectedVersionId.value) {
    selectedVersion.value = undefined
    return
  }
  try {
    selectedVersion.value = await getWorkflowVersion(workflow.value.id, selectedVersionId.value)
  } catch (versionError) {
    validationError.value = problemMessage(versionError)
  }
}

async function loadRuns(): Promise<void> {
  const id = Number(route.params.id)
  if (!Number.isFinite(id) || id <= 0) return
  runsLoading.value = true
  runsError.value = ''
  try {
    const result = await listWorkflowRuns(id, runPage.value, runSize.value)
    runs.value = result.items
    runTotal.value = result.total
  } catch (loadError) {
    runsError.value = problemMessage(loadError)
  } finally {
    runsLoading.value = false
  }
}

async function validate(): Promise<void> {
  const id = Number(route.params.id)
  if (!Number.isFinite(id) || id <= 0) return
  validationLoading.value = true
  validationError.value = ''
  try {
    validation.value = await validateWorkflow(id)
  } catch (validationRequestError) {
    validationError.value = problemMessage(validationRequestError)
  } finally {
    validationLoading.value = false
  }
}

async function publish(): Promise<void> {
  if (!workflow.value) return
  try {
    await ElMessageBox.confirm(
      '发布后当前 WorkflowVersion 不可修改，后续运行会固定绑定这个版本。',
      '确认发布 Workflow',
      {
        type: 'warning',
        confirmButtonText: '发布',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }
  validationError.value = ''
  try {
    const result = await runAction(() => publishWorkflow(workflow.value!.id, draftVersion.value?.id))
    if (!result) return
    validation.value = result
    if (!result.valid) {
      validationError.value = result.errors.map((issue) => issue.message).join('；') || 'Workflow 校验未通过'
      return
    }
    ElMessage.success('Workflow 已发布')
    await load()
  } catch (publishError) {
    validationError.value = problemMessage(publishError)
  }
}

async function disable(): Promise<void> {
  if (!workflow.value) return
  try {
    await ElMessageBox.confirm(
      '停用只影响后续使用，不会删除历史版本和运行记录。',
      '确认停用 Workflow',
      {
        type: 'warning',
        confirmButtonText: '停用',
        cancelButtonText: '取消',
      },
    )
    const result = await runAction(() => disableWorkflow(workflow.value!.id))
    if (!result) return
    ElMessage.success('Workflow 已停用')
    await load()
  } catch (disableError) {
    if (disableError !== 'cancel') ElMessage.error(problemMessage(disableError))
  }
}

async function run(): Promise<void> {
  if (!workflow.value) return
  try {
    const result = await runRequest(() => createWorkflowRun(workflow.value!.id))
    if (!result) return
    ElMessage.success('Workflow 已进入运行队列')
    await router.push(`/workflow-runs/${result.id}`)
  } catch (runError) {
    ElMessage.error(problemMessage(runError))
  }
}

function openRun(runSummary: WorkflowRunSummary): void {
  void router.push(`/workflow-runs/${runSummary.id}`)
}

onMounted(() => load())
</script>

<style scoped>
.version-select {
  width: 220px;
}

.structure-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.subsection-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
  margin-bottom: 8px;
}

.subsection-heading h3 {
  margin: 0;
  font-size: 13px;
}

.subsection-heading span {
  color: var(--ow-muted);
  font-size: 12px;
}

.node-list,
.edge-list {
  display: grid;
  gap: 6px;
}

.node-item,
.edge-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 50px;
  padding: 9px 10px;
  background: var(--ow-surface-raised);
  border: 1px solid var(--ow-line-soft);
  border-radius: var(--ow-radius-sm);
}

.node-type {
  display: grid;
  min-width: 76px;
  min-height: 25px;
  place-items: center;
  color: var(--ow-primary-strong);
  background: var(--ow-primary-soft);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
}

.node-main,
.run-cell {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 2px;
}

.node-main strong,
.run-cell strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-main small,
.run-cell span {
  overflow: hidden;
  color: var(--ow-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edge-item {
  align-items: flex-start;
  flex-direction: column;
}

.edge-route {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ow-ink-secondary);
  font-weight: 650;
}

.edge-route svg {
  width: 14px;
  height: 14px;
  color: var(--ow-primary-strong);
}

.edge-condition {
  color: var(--ow-muted);
  font-size: 12px;
}

.section-alert,
.section-alert-wrap {
  margin: 0 0 14px;
}

.validation-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.validation-block {
  margin-top: 14px;
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

.validation-placeholder {
  padding: 16px 0 2px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding: 15px 16px 16px;
  border-top: 1px solid var(--ow-line-soft);
}

@media (max-width: 780px) {
  .structure-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .version-select {
    width: 100%;
  }
}
</style>
