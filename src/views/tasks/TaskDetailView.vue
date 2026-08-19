<template>
  <div class="page">
    <PageHeader :title="task?.title || '任务详情'" :description="task?.description || ''" back>
      <template #actions>
        <el-button
          v-if="task && canEdit"
          :icon="Pencil"
          @click="router.push(`/tasks/${task.id}/edit`)"
        >
          编辑任务
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
        <el-button v-if="task?.currentRunId" :icon="ExternalLink" @click="openRun">
          查看运行
        </el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="load" />
    <div v-else-if="loading" class="surface page-feedback"><el-skeleton :rows="8" animated /></div>
    <template v-else-if="task">
      <section class="detail-layout">
        <div class="stack">
          <section class="surface">
            <div class="surface-header">
              <h2 class="surface-title">任务信息</h2>
              <StatusTag :value="task.status" />
            </div>
            <div class="surface-body">
              <dl class="detail-grid">
                <div>
                  <dt>模块</dt>
                  <dd>{{ enumLabel(task.moduleType) }}</dd>
                </div>
                <div>
                  <dt>优先级</dt>
                  <dd>{{ enumLabel(task.priority) }}</dd>
                </div>
                <div>
                  <dt>期望成果</dt>
                  <dd>{{ enumLabel(task.expectedArtifactType) }}</dd>
                </div>
                <div>
                  <dt>更新时间</dt>
                  <dd>{{ formatDateTime(task.updatedAt) }}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section class="surface">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">关联资料</h2>
                <span class="surface-subtitle">{{ relatedDocuments.length }} 份资料</span>
              </div>
              <el-button text :icon="FileText" @click="router.push('/documents')">资料中心</el-button>
            </div>
            <div v-if="documentsLoading" class="section-feedback">
              <el-skeleton :rows="3" animated />
            </div>
            <el-alert
              v-if="documentsError"
              class="section-alert"
              :title="documentsError"
              type="error"
              show-icon
              :closable="false"
            >
              <template #default>
                <el-button text @click="loadRelatedDocuments()">重试资料加载</el-button>
              </template>
            </el-alert>
            <EmptyState
              v-if="!documentsLoading && !documentsError && relatedDocuments.length === 0"
              title="未关联资料"
              description="可以在创建任务时选择已有的纯文本或 Markdown 资料。"
              :icon="FileText"
            />
            <div v-if="relatedDocuments.length > 0" class="related-list">
              <div v-for="document in relatedDocuments" :key="document.id" class="related-row">
                <FileText aria-hidden="true" />
                <span class="truncate">{{ document.originalName || document.fileName }}</span>
                <StatusTag :value="document.parseStatus" />
              </div>
            </div>
          </section>

          <section class="surface">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">生成成果</h2>
                <span class="surface-subtitle">{{ artifactTotal }} 项成果</span>
              </div>
              <el-button text :icon="FileOutput" @click="router.push('/artifacts')">
                成果中心
              </el-button>
            </div>
            <div v-if="artifactsLoading" class="section-feedback">
              <el-skeleton :rows="3" animated />
            </div>
            <el-alert
              v-if="artifactsError"
              class="section-alert"
              :title="artifactsError"
              type="error"
              show-icon
              :closable="false"
            >
              <template #default>
                <el-button text @click="loadGeneratedArtifacts()">重试成果加载</el-button>
              </template>
            </el-alert>
            <EmptyState
              v-if="!artifactsLoading && !artifactsError && generatedArtifacts.length === 0"
              title="暂无生成成果"
              description="运行成功后，成果会出现在这里。"
              :icon="FileOutput"
            />
            <div v-if="generatedArtifacts.length > 0" class="artifact-list">
              <button
                v-for="artifact in generatedArtifacts"
                :key="artifact.id"
                type="button"
                class="artifact-row"
                @click="router.push(`/artifacts/${artifact.id}`)"
              >
                <FileOutput aria-hidden="true" />
                <span class="run-row-main">
                  <strong class="truncate">{{ artifact.title }}</strong>
                  <small>v{{ artifact.currentVersion }} · {{ enumLabel(artifact.artifactType) }}</small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>

        <aside class="stack">
          <section class="surface">
            <div class="surface-header">
              <h2 class="surface-title">当前运行</h2>
            </div>
            <div class="surface-body run-summary">
              <template v-if="task.currentRunId">
                <StatusTag v-if="task.currentRunStatus" :value="task.currentRunStatus" />
                <span v-else class="muted">暂无状态</span>
                <strong>Run #{{ task.currentRunId }}</strong>
                <el-button :icon="ExternalLink" @click="openRun">打开运行详情</el-button>
              </template>
              <EmptyState
                v-else
                title="暂无运行记录"
                description="任务创建后，可以从这里启动 Agent。"
                :icon="Activity"
              >
                <el-button v-if="canStart" type="primary" @click="start">启动运行</el-button>
              </EmptyState>
            </div>
          </section>

          <section class="surface">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">运行历史</h2>
                <span class="surface-subtitle">{{ runs.length }} 次运行</span>
              </div>
            </div>
            <div v-if="runsLoading" class="section-feedback">
              <el-skeleton :rows="4" animated />
            </div>
            <el-alert
              v-if="runsError"
              class="section-alert"
              :title="runsError"
              type="error"
              show-icon
              :closable="false"
            >
              <template #default>
                <el-button text @click="loadRuns()">重试运行历史</el-button>
              </template>
            </el-alert>
            <EmptyState
              v-if="!runsLoading && !runsError && runs.length === 0"
              title="暂无历史运行"
              :icon="History"
            />
            <div v-if="runs.length > 0" class="run-list">
              <button
                v-for="run in runs"
                :key="run.id"
                type="button"
                class="run-row"
                @click="router.push(`/runs/${run.id}`)"
              >
                <span class="run-row-main">
                  <strong>Run #{{ run.id }}</strong>
                  <small>{{ formatDateTime(run.createdAt) }}</small>
                </span>
                <StatusTag :value="run.status" />
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </section>
        </aside>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  Activity,
  ChevronRight,
  ExternalLink,
  FileOutput,
  FileText,
  History,
  Pencil,
  Play,
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'

import { getDocument } from '@/api/documents'
import { listArtifacts } from '@/api/artifacts'
import { problemMessage } from '@/api/http'
import { getTask, listTaskRuns, startTaskRun } from '@/api/tasks'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type {
  AgentRunSummary,
  ArtifactSummary,
  DocumentSummary,
  TaskDetail,
} from '@/types/api'
import { enumLabel, formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)
const loading = ref(true)
const error = ref('')
const task = ref<TaskDetail>()
const runs = ref<AgentRunSummary[]>([])
const relatedDocuments = ref<DocumentSummary[]>([])
const generatedArtifacts = ref<ArtifactSummary[]>([])
const artifactTotal = ref(0)
const runsLoading = ref(false)
const documentsLoading = ref(false)
const artifactsLoading = ref(false)
const runsError = ref('')
const documentsError = ref('')
const artifactsError = ref('')
const starting = ref(false)
let loadSequence = 0

const canStart = computed(() => task.value?.status === 'READY')
const canEdit = computed(() =>
  Boolean(task.value && ['DRAFT', 'READY', 'PAUSED'].includes(task.value.status)),
)

async function load(): Promise<void> {
  const sequence = ++loadSequence
  loading.value = true
  error.value = ''
  try {
    const taskResult = await getTask(id)
    if (sequence !== loadSequence) return
    task.value = taskResult
    void Promise.allSettled([
      loadRuns(sequence),
      loadRelatedDocuments(sequence),
      loadGeneratedArtifacts(sequence),
    ])
  } catch (loadError) {
    if (sequence === loadSequence) {
      error.value = problemMessage(loadError)
    }
  } finally {
    if (sequence === loadSequence) {
      loading.value = false
    }
  }
}

async function loadRuns(sequence = loadSequence): Promise<void> {
  if (!task.value) return
  runsLoading.value = true
  runsError.value = ''
  try {
    const result = await listTaskRuns(id)
    if (sequence !== loadSequence) return
    runs.value = result
    if (task.value.currentRunId) {
      task.value.currentRunStatus =
        result.find((run) => run.id === task.value?.currentRunId)?.status
        ?? task.value.currentRunStatus
    }
  } catch (loadError) {
    if (sequence === loadSequence) {
      runsError.value = problemMessage(loadError)
    }
  } finally {
    if (sequence === loadSequence) {
      runsLoading.value = false
    }
  }
}

async function loadRelatedDocuments(sequence = loadSequence): Promise<void> {
  const documentIds = task.value?.documentIds || []
  documentsLoading.value = true
  documentsError.value = ''
  if (documentIds.length === 0) {
    relatedDocuments.value = []
    documentsLoading.value = false
    return
  }

  const results = await Promise.allSettled(documentIds.map((documentId) => getDocument(documentId)))
  if (sequence !== loadSequence) return
  relatedDocuments.value = results.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : [],
  )
  const failed = results.find((result) => result.status === 'rejected')
  if (failed?.status === 'rejected') {
    documentsError.value =
      results.length === 1
        ? problemMessage(failed.reason)
        : `部分资料加载失败：${problemMessage(failed.reason)}`
  }
  documentsLoading.value = false
}

async function loadGeneratedArtifacts(sequence = loadSequence): Promise<void> {
  if (!task.value) return
  artifactsLoading.value = true
  artifactsError.value = ''
  try {
    const result = await listArtifacts(1, 20, task.value.workspaceId, task.value.id)
    if (sequence !== loadSequence) return
    generatedArtifacts.value = result.items
    artifactTotal.value = result.total
  } catch (loadError) {
    if (sequence === loadSequence) {
      artifactsError.value = problemMessage(loadError)
    }
  } finally {
    if (sequence === loadSequence) {
      artifactsLoading.value = false
    }
  }
}

async function start(): Promise<void> {
  if (!task.value || starting.value) return
  starting.value = true
  try {
    const run = await startTaskRun(id)
    await router.push(`/runs/${run.runId}`)
  } catch (startError) {
    ElMessage.error(problemMessage(startError))
  } finally {
    starting.value = false
  }
}

function openRun(): void {
  if (task.value?.currentRunId) void router.push(`/runs/${task.value.currentRunId}`)
}

onMounted(() => load())
</script>

<style scoped>
.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
  gap: 16px;
}

.related-list,
.artifact-list,
.run-list {
  padding: 5px 8px 8px;
}

.section-feedback {
  padding: 14px 16px;
}

.section-alert {
  margin: 12px 16px;
  width: auto;
}

.related-row,
.artifact-row,
.run-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 11px 8px;
  border-bottom: 1px solid var(--ow-line-soft);
}

.related-row:last-child,
.artifact-row:last-child,
.run-row:last-child {
  border-bottom: 0;
}

.related-row > svg,
.artifact-row > svg {
  width: 16px;
  height: 16px;
  flex: none;
  color: var(--ow-primary);
}

.related-row > span {
  flex: 1;
  min-width: 0;
}

.artifact-row {
  width: 100%;
  color: inherit;
  text-align: left;
  background: transparent;
  border-top: 0;
  border-right: 0;
  border-left: 0;
  cursor: pointer;
}

.artifact-row:hover {
  background: var(--ow-surface-raised);
}

.run-summary {
  display: grid;
  justify-items: start;
  gap: 12px;
}

.run-summary strong {
  font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
}

.run-row {
  width: 100%;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.run-row:hover {
  background: var(--ow-surface-raised);
}

.run-row-main {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 2px;
}

.run-row-main strong {
  font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
  font-size: 12px;
}

.run-row-main small {
  color: var(--ow-muted);
}

.run-row > svg {
  width: 15px;
  height: 15px;
  color: var(--ow-muted);
}

@media (max-width: 900px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }
}
</style>
