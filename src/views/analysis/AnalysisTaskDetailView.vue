<template>
  <div class="page">
    <PageHeader
      :title="task?.title || '数据分析任务'"
      :description="task?.dataAnalysis.analysisGoal || ''"
      back
    >
      <template #actions>
        <StatusTag v-if="task" :value="task.status" />
        <el-button
          v-if="task && canEdit"
          :icon="Pencil"
          @click="router.push(`/analysis/tasks/${task.id}/edit`)"
        >
          编辑
        </el-button>
        <el-button
          v-if="task && canStart"
          type="primary"
          :icon="Play"
          :loading="starting"
          @click="start"
        >
          启动运行
        </el-button>
        <el-button v-if="task?.currentRunId" :icon="ExternalLink" @click="openCurrentRun">
          查看运行
        </el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="load" />
    <div v-else-if="loading" class="surface page-feedback"><el-skeleton :rows="9" animated /></div>
    <template v-else-if="task">
      <div class="analysis-layout">
        <div class="stack">
          <section class="surface">
            <div class="surface-header">
              <h2 class="surface-title">任务目标</h2>
              <span class="muted">{{ enumLabel(task.priority) }}优先级</span>
            </div>
            <div class="surface-body">
              <p class="goal-copy">{{ task.dataAnalysis.analysisGoal }}</p>
              <div class="output-tags">
                <StatusTag
                  v-for="output in task.dataAnalysis.expectedOutputs"
                  :key="output"
                  :value="output"
                />
              </div>
            </div>
          </section>

          <section class="surface">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">数据来源</h2>
                <span class="surface-subtitle">Dataset 与 Sheet 的服务端摘要</span>
              </div>
              <el-button
                text
                :icon="ArrowUpRight"
                @click="router.push(`/datasets/${task.dataAnalysis.datasetId}`)"
              >
                打开数据集
              </el-button>
            </div>
            <div v-if="datasetLoading" class="section-feedback"><el-skeleton :rows="4" animated /></div>
            <el-alert
              v-else-if="datasetError"
              class="section-alert"
              :title="datasetError"
              type="error"
              show-icon
              :closable="false"
            />
            <div v-else-if="dataset" class="surface-body">
              <dl class="detail-grid">
                <div><dt>数据集</dt><dd>{{ dataset.name }}</dd></div>
                <div><dt>状态</dt><dd><StatusTag :value="dataset.status" /></dd></div>
                <div><dt>工作表</dt><dd>{{ selectedSheet?.name || task.dataAnalysis.sheetName || '—' }}</dd></div>
                <div><dt>规模</dt><dd>{{ countLabel(selectedSheet?.rowCount) }} 行 · {{ countLabel(selectedSheet?.columnCount) }} 列</dd></div>
              </dl>
              <div v-if="profile" class="profile-strip">
                <div><span>缺失单元格</span><strong>{{ countLabel(profile.missingCellCount) }}</strong></div>
                <div><span>重复行</span><strong>{{ countLabel(profile.duplicateRowCount) }}</strong></div>
                <div><span>Profile 字段</span><strong>{{ countLabel(profile.columns?.length) }}</strong></div>
              </div>
            </div>
          </section>

          <section class="surface">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">分析报告与图表</h2>
                <span class="surface-subtitle">{{ artifacts.length }} 项成果</span>
              </div>
              <el-button text :icon="Archive" @click="router.push('/artifacts')">成果中心</el-button>
            </div>
            <div v-if="artifactsLoading" class="section-feedback"><el-skeleton :rows="4" animated /></div>
            <el-alert
              v-else-if="artifactsError"
              class="section-alert"
              :title="artifactsError"
              type="error"
              show-icon
              :closable="false"
            />
            <EmptyState
              v-else-if="artifacts.length === 0"
              title="暂无分析成果"
              description="运行成功后，报告和图表会显示在这里。"
              :icon="FileOutput"
            />
            <div v-else class="artifact-grid">
              <button
                v-for="artifact in artifacts"
                :key="artifact.id"
                type="button"
                class="artifact-tile"
                @click="router.push(`/artifacts/${artifact.id}`)"
              >
                <component :is="artifact.artifactType === 'CHART_SPEC' ? ChartNoAxesCombined : FileText" />
                <span>
                  <StatusTag :value="artifact.artifactType" />
                  <strong>{{ artifact.title }}</strong>
                  <small>v{{ artifact.currentVersion }} · {{ formatDateTime(artifact.updatedAt) }}</small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>

        <aside class="stack">
          <section class="surface">
            <div class="surface-header"><h2 class="surface-title">当前运行</h2></div>
            <div class="surface-body run-summary">
              <template v-if="task.currentRunId">
                <StatusTag :value="task.currentRunStatus" />
                <strong>Run #{{ task.currentRunId }}</strong>
                <el-button :icon="ExternalLink" @click="openCurrentRun">打开运行详情</el-button>
              </template>
              <EmptyState v-else title="尚未运行" :icon="Activity">
                <el-button v-if="canStart" type="primary" @click="start">启动运行</el-button>
              </EmptyState>
            </div>
          </section>

          <section class="surface">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">运行历史</h2>
                <span class="surface-subtitle">{{ runs.length }} 次</span>
              </div>
            </div>
            <div v-if="runsLoading" class="section-feedback"><el-skeleton :rows="5" animated /></div>
            <el-alert
              v-else-if="runsError"
              class="section-alert"
              :title="runsError"
              type="error"
              show-icon
              :closable="false"
            />
            <EmptyState v-else-if="runs.length === 0" title="暂无运行历史" :icon="History" />
            <div v-else class="run-list">
              <button
                v-for="run in runs"
                :key="run.id"
                type="button"
                class="run-row"
                @click="router.push(`/runs/${run.id}`)"
              >
                <span><strong>Run #{{ run.id }}</strong><small>{{ formatDateTime(run.createdAt) }}</small></span>
                <StatusTag :value="run.status" />
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  Activity,
  Archive,
  ArrowUpRight,
  ChartNoAxesCombined,
  ChevronRight,
  ExternalLink,
  FileOutput,
  FileText,
  History,
  Pencil,
  Play,
} from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getDataAnalysisTask } from '@/api/analysis'
import { listArtifacts } from '@/api/artifacts'
import { getDataset, getDatasetProfile } from '@/api/datasets'
import { problemMessage } from '@/api/http'
import { listTaskRuns, startTaskRun } from '@/api/tasks'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type {
  AgentRunSummary,
  ArtifactSummary,
  DataAnalysisTaskDetail,
  DatasetDetail,
  DatasetProfile,
} from '@/types/api'
import { enumLabel, formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)
const loading = ref(true)
const error = ref('')
const task = ref<DataAnalysisTaskDetail>()
const dataset = ref<DatasetDetail>()
const profile = ref<DatasetProfile>()
const runs = ref<AgentRunSummary[]>([])
const artifacts = ref<ArtifactSummary[]>([])
const datasetLoading = ref(false)
const runsLoading = ref(false)
const artifactsLoading = ref(false)
const datasetError = ref('')
const runsError = ref('')
const artifactsError = ref('')
const starting = ref(false)
let sequence = 0

const canStart = computed(() => task.value?.status === 'READY')
const canEdit = computed(() =>
  Boolean(task.value && ['DRAFT', 'READY', 'PAUSED'].includes(task.value.status)),
)
const selectedSheet = computed(() =>
  dataset.value?.sheets.find((sheet) => sheet.id === task.value?.dataAnalysis.sheetId),
)

function countLabel(value?: number | null): string {
  return value === undefined || value === null ? '—' : value.toLocaleString()
}

async function load(): Promise<void> {
  const current = ++sequence
  loading.value = true
  error.value = ''
  try {
    task.value = await getDataAnalysisTask(id)
    if (current !== sequence) return
    void Promise.allSettled([
      loadDatasetArea(current),
      loadRuns(current),
      loadArtifacts(current),
    ])
  } catch (loadError) {
    if (current === sequence) error.value = problemMessage(loadError)
  } finally {
    if (current === sequence) loading.value = false
  }
}

async function loadDatasetArea(current = sequence): Promise<void> {
  if (!task.value) return
  datasetLoading.value = true
  datasetError.value = ''
  try {
    const detail = await getDataset(task.value.dataAnalysis.datasetId)
    if (current !== sequence) return
    dataset.value = detail
    try {
      profile.value = await getDatasetProfile(
        detail.id,
        task.value.dataAnalysis.sheetId,
      )
    } catch (profileLoadError) {
      datasetError.value = `数据集已加载，Profile 加载失败：${problemMessage(profileLoadError)}`
    }
  } catch (loadError) {
    if (current === sequence) datasetError.value = problemMessage(loadError)
  } finally {
    if (current === sequence) datasetLoading.value = false
  }
}

async function loadRuns(current = sequence): Promise<void> {
  runsLoading.value = true
  runsError.value = ''
  try {
    const result = await listTaskRuns(id)
    if (current !== sequence) return
    runs.value = result
    if (task.value?.currentRunId) {
      task.value.currentRunStatus =
        result.find((run) => run.id === task.value?.currentRunId)?.status
        || task.value.currentRunStatus
    }
  } catch (loadError) {
    if (current === sequence) runsError.value = problemMessage(loadError)
  } finally {
    if (current === sequence) runsLoading.value = false
  }
}

async function loadArtifacts(current = sequence): Promise<void> {
  if (!task.value) return
  artifactsLoading.value = true
  artifactsError.value = ''
  try {
    const result = await listArtifacts(1, 50, task.value.workspaceId, task.value.id)
    if (current === sequence) artifacts.value = result.items
  } catch (loadError) {
    if (current === sequence) artifactsError.value = problemMessage(loadError)
  } finally {
    if (current === sequence) artifactsLoading.value = false
  }
}

async function start(): Promise<void> {
  if (starting.value) return
  starting.value = true
  try {
    const result = await startTaskRun(id)
    await router.push(`/runs/${result.runId}`)
  } catch (startError) {
    ElMessage.error(problemMessage(startError))
  } finally {
    starting.value = false
  }
}

function openCurrentRun(): void {
  if (task.value?.currentRunId) void router.push(`/runs/${task.value.currentRunId}`)
}

onMounted(() => load())
</script>

<style scoped>
.analysis-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
  gap: 16px;
}

.goal-copy {
  margin-bottom: 14px;
  color: var(--ow-ink-secondary);
  white-space: pre-wrap;
}

.output-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.section-feedback {
  padding: 16px;
}

.section-alert {
  width: auto;
  margin: 14px 16px;
}

.profile-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin-top: 18px;
  overflow: hidden;
  background: var(--ow-line-soft);
  border: 1px solid var(--ow-line-soft);
  border-radius: var(--ow-radius-sm);
}

.profile-strip > div {
  display: grid;
  gap: 4px;
  padding: 12px;
  background: var(--ow-surface-raised);
}

.profile-strip span {
  color: var(--ow-muted);
  font-size: 12px;
}

.artifact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  padding: 1px;
  background: var(--ow-line-soft);
}

.artifact-tile {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 16px;
  align-items: start;
  gap: 10px;
  min-height: 112px;
  padding: 14px;
  color: inherit;
  text-align: left;
  background: var(--ow-surface);
  border: 0;
  cursor: pointer;
}

.artifact-tile:hover {
  background: var(--ow-surface-raised);
}

.artifact-tile > svg {
  width: 20px;
  height: 20px;
  color: var(--ow-primary);
}

.artifact-tile > span {
  display: grid;
  min-width: 0;
  gap: 7px;
}

.artifact-tile strong,
.artifact-tile small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artifact-tile small {
  color: var(--ow-muted);
}

.run-summary {
  display: grid;
  justify-items: start;
  gap: 12px;
}

.run-list {
  padding: 6px 8px 8px;
}

.run-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 16px;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 8px;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--ow-line-soft);
  cursor: pointer;
}

.run-row:hover {
  background: var(--ow-surface-raised);
}

.run-row > span {
  display: grid;
}

.run-row small {
  color: var(--ow-muted);
}

.run-row > svg {
  width: 15px;
  height: 15px;
  color: var(--ow-muted);
}

@media (max-width: 900px) {
  .analysis-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .profile-strip,
  .artifact-grid {
    grid-template-columns: 1fr;
  }
}
</style>
