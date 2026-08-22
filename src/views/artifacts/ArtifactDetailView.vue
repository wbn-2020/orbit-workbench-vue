<template>
  <div class="page">
    <PageHeader :title="artifact?.title || '成果详情'" :description="artifact?.taskTitle || ''" back>
      <template #actions>
        <el-button
          v-if="selectedVersionId"
          :icon="FileDown"
          @click="exportDialogOpen = true"
        >
          导出
        </el-button>
        <el-button :icon="Edit3" :disabled="versionLoading" @click="toggleEditing">
          {{ editing ? '取消编辑' : '编辑成果' }}
        </el-button>
        <el-button
          v-if="editing"
          type="primary"
          :loading="saving"
          :disabled="Boolean(saveConflict)"
          @click="save"
        >
          创建新版本
        </el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="load" />
    <div v-else-if="loading" class="surface page-feedback"><el-skeleton :rows="10" animated /></div>
    <template v-else-if="artifact">
      <div class="artifact-layout">
        <section class="surface content-panel">
          <div class="surface-header">
            <div class="artifact-meta">
              <StatusTag :value="artifact.artifactType" />
              <span class="muted">当前版本 v{{ artifact.currentVersion }}</span>
              <span
                v-if="selectedVersionNumber !== artifact.currentVersion"
                class="muted"
              >
                正在查看 v{{ selectedVersionNumber }}
              </span>
            </div>
            <span class="muted">{{ formatDateTime(artifact.updatedAt) }}</span>
          </div>
          <el-alert
            v-if="saveConflict"
            class="save-conflict"
            :title="saveConflict"
            type="warning"
            show-icon
            :closable="false"
          />
          <div v-if="editing" class="editor-body">
            <el-input v-model="draftContent" type="textarea" :rows="28" />
          </div>
          <div v-else-if="versionLoading" class="surface-body version-feedback">
            <el-skeleton :rows="10" animated />
          </div>
          <div v-else-if="versionError" class="surface-body version-feedback">
            <el-alert :title="versionError" type="error" show-icon :closable="false" />
          </div>
          <div v-else class="surface-body">
            <ChartSpecViewer
              v-if="isChartArtifact"
              :spec="displayedContent"
              :aria-label="artifact.title"
            />
            <MarkdownViewer v-else :content="displayedContent" />
          </div>
        </section>

        <aside class="stack">
          <section
            v-if="artifact.datasetId || artifact.sheetId || artifact.sourceRunId"
            class="surface"
          >
            <div class="surface-header"><h2 class="surface-title">来源追踪</h2></div>
            <div class="surface-body">
              <dl class="detail-grid source-grid">
                <div>
                  <dt>数据集</dt>
                  <dd>
                    <button
                      v-if="artifact.datasetId"
                      type="button"
                      class="source-link"
                      @click="router.push(`/datasets/${artifact.datasetId}`)"
                    >
                      {{ artifact.datasetName || `Dataset #${artifact.datasetId}` }}
                      <ExternalLink aria-hidden="true" />
                    </button>
                    <span v-else>—</span>
                  </dd>
                </div>
                <div><dt>工作表</dt><dd>{{ artifact.sheetName || artifact.sheetId || '—' }}</dd></div>
                <div>
                  <dt>来源运行</dt>
                  <dd>
                    <button
                      v-if="artifact.sourceRunId"
                      type="button"
                      class="source-link"
                      @click="router.push(`/runs/${artifact.sourceRunId}`)"
                    >
                      Run #{{ artifact.sourceRunId }}
                      <ExternalLink aria-hidden="true" />
                    </button>
                    <span v-else>—</span>
                  </dd>
                </div>
                <div><dt>任务</dt><dd>{{ artifact.taskTitle || `Task #${artifact.taskId}` }}</dd></div>
              </dl>
            </div>
          </section>

          <section class="surface versions-panel">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">版本历史</h2>
                <span class="surface-subtitle">{{ versions.length }} 个版本</span>
              </div>
            </div>
            <EmptyState v-if="versions.length === 0" title="暂无版本记录" :icon="History" />
            <div v-else class="version-list">
              <button
                v-for="version in versions"
                :key="version.id"
                type="button"
                class="version-row"
                :class="{ active: version.id === selectedVersionId }"
                :disabled="editing"
                @click="selectVersion(version)"
              >
                <span>
                  <strong>v{{ version.version }}</strong>
                  <small>{{ formatDateTime(version.createdAt) }}</small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </section>

          <section class="surface">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">导出记录</h2>
                <span class="surface-subtitle">{{ exports.length }} 项</span>
              </div>
              <el-button text :icon="Plus" @click="exportDialogOpen = true">新建</el-button>
            </div>
            <div v-if="exportsLoading" class="exports-feedback">
              <el-skeleton :rows="4" animated />
            </div>
            <el-alert
              v-else-if="exportsError"
              class="exports-alert"
              :title="exportsError"
              type="error"
              show-icon
              :closable="false"
            />
            <EmptyState
              v-else-if="exports.length === 0"
              title="暂无导出"
              description="导出会保留对应的成果版本。"
              :icon="FileDown"
            />
            <div v-else class="export-list">
              <div v-for="item in exports" :key="item.id" class="export-row">
                <FileDown aria-hidden="true" />
                <span>
                  <strong>{{ item.format }}</strong>
                  <small>{{ formatFileSize(item.sizeBytes) }} · {{ formatDateTime(item.createdAt) }}</small>
                  <small v-if="item.errorSummary" class="error-text">{{ item.errorSummary }}</small>
                </span>
                <StatusTag :value="item.status" />
                <el-button
                  v-if="item.status === 'SUCCEEDED'"
                  text
                  :icon="Download"
                  aria-label="下载导出"
                  @click="download(item)"
                />
              </div>
            </div>
          </section>
        </aside>
      </div>
    </template>

    <el-dialog v-model="exportDialogOpen" title="创建导出" width="min(440px, 92vw)">
      <el-form label-position="top">
        <el-form-item label="成果版本">
          <el-select v-model="exportVersionId">
            <el-option
              v-for="version in versions"
              :key="version.id"
              :label="`v${version.version} · ${formatDateTime(version.createdAt)}`"
              :value="version.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="导出格式">
          <el-segmented v-model="exportFormat" :options="availableExportFormats" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="creatingExport" @click="exportDialogOpen = false">取消</el-button>
        <el-button
          type="primary"
          :loading="creatingExport"
          :disabled="!exportVersionId"
          @click="createExport"
        >
          创建导出
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronRight,
  Download,
  Edit3,
  ExternalLink,
  FileDown,
  History,
  Plus,
} from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  createArtifactExport,
  downloadArtifactExport,
  getArtifact,
  getArtifactVersion,
  listArtifactExports,
  listArtifactVersions,
  updateArtifact,
} from '@/api/artifacts'
import { getProblem, problemMessage } from '@/api/http'
import ChartSpecViewer from '@/components/ChartSpecViewer.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import MarkdownViewer from '@/components/MarkdownViewer.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type {
  ArtifactDetail,
  ArtifactExport,
  ArtifactExportFormat,
  ArtifactVersionSummary,
} from '@/types/api'
import { formatDateTime, formatFileSize } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const editing = ref(false)
const artifact = ref<ArtifactDetail>()
const versions = ref<ArtifactVersionSummary[]>([])
const draftContent = ref('')
const displayedContent = ref('')
const selectedVersionId = ref<number>()
const selectedVersionNumber = ref<number>()
const versionLoading = ref(false)
const versionError = ref('')
const saveConflict = ref('')
const editBaseVersion = ref<number>()
const exports = ref<ArtifactExport[]>([])
const exportsLoading = ref(false)
const exportsError = ref('')
const exportDialogOpen = ref(false)
const exportVersionId = ref<number>()
const exportFormat = ref<ArtifactExportFormat>('MARKDOWN')
const creatingExport = ref(false)
const versionContentCache = new Map<number, string>()
let versionRequestSequence = 0
let exportPollTimer: number | undefined
let destroyed = false

const isChartArtifact = computed(() => artifact.value?.artifactType === 'CHART_SPEC')
const availableExportFormats = computed<
  Array<{ label: string; value: ArtifactExportFormat }>
>(() => {
  if (artifact.value?.artifactType === 'CHART_SPEC') {
    return [{ label: 'JSON', value: 'JSON' }]
  }
  if (artifact.value?.artifactType === 'DATA_EXPORT') {
    return [{ label: 'CSV', value: 'CSV' }]
  }
  return [{ label: 'Markdown', value: 'MARKDOWN' }]
})

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const [artifactResult, versionResult] = await Promise.all([
      getArtifact(id),
      listArtifactVersions(id),
    ])
    artifact.value = artifactResult
    versions.value = versionResult
    draftContent.value = artifactResult.content
    displayedContent.value = artifactResult.content
    versionContentCache.clear()
    const currentVersion = versionResult.find(
      (version) => version.version === artifactResult.currentVersion,
    )
    selectedVersionId.value = currentVersion?.id
    exportVersionId.value = currentVersion?.id
    selectedVersionNumber.value = artifactResult.currentVersion
    editBaseVersion.value = artifactResult.currentVersion
    saveConflict.value = ''
    if (currentVersion) {
      versionContentCache.set(currentVersion.id, artifactResult.content)
    }
    exportFormat.value = availableExportFormats.value[0]?.value || 'MARKDOWN'
    void loadExports()
  } catch (loadError) {
    error.value = problemMessage(loadError)
  } finally {
    loading.value = false
  }
}

async function selectVersion(version: ArtifactVersionSummary): Promise<void> {
  if (editing.value || version.id === selectedVersionId.value) return
  const requestSequence = ++versionRequestSequence
  versionLoading.value = true
  versionError.value = ''
  try {
    let content = versionContentCache.get(version.id)
    if (content === undefined) {
      const result = await getArtifactVersion(id, version.id)
      content = result.content
      versionContentCache.set(version.id, content)
    }
    if (requestSequence === versionRequestSequence) {
      displayedContent.value = content
      selectedVersionId.value = version.id
      exportVersionId.value = version.id
      selectedVersionNumber.value = version.version
    }
  } catch (loadError) {
    if (requestSequence === versionRequestSequence) {
      versionError.value = problemMessage(loadError)
    }
  } finally {
    if (requestSequence === versionRequestSequence) {
      versionLoading.value = false
    }
  }
}

async function loadExports(): Promise<void> {
  exportsLoading.value = true
  exportsError.value = ''
  try {
    exports.value = await listArtifactExports(id)
    scheduleExportPoll()
  } catch (loadError) {
    exportsError.value = problemMessage(loadError)
  } finally {
    exportsLoading.value = false
  }
}

function scheduleExportPoll(): void {
  if (exportPollTimer) {
    window.clearTimeout(exportPollTimer)
    exportPollTimer = undefined
  }
  if (
    destroyed ||
    !exports.value.some((item) => ['PENDING', 'RUNNING'].includes(item.status))
  ) {
    return
  }
  exportPollTimer = window.setTimeout(() => {
    exportPollTimer = undefined
    void loadExports()
  }, 3_000)
}

async function createExport(): Promise<void> {
  if (!exportVersionId.value || creatingExport.value) return
  creatingExport.value = true
  try {
    await createArtifactExport(id, {
      artifactVersionId: exportVersionId.value,
      format: exportFormat.value,
    })
    exportDialogOpen.value = false
    ElMessage.success('导出任务已创建')
    await loadExports()
  } catch (exportError) {
    ElMessage.error(problemMessage(exportError))
  } finally {
    creatingExport.value = false
  }
}

async function download(item: ArtifactExport): Promise<void> {
  try {
    const result = await downloadArtifactExport(item.id)
    const url = URL.createObjectURL(result.blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = result.fileName || item.fileName || `artifact-${id}-${item.id}.${item.format.toLowerCase()}`
    anchor.click()
    URL.revokeObjectURL(url)
  } catch (downloadError) {
    ElMessage.error(problemMessage(downloadError))
  }
}

function toggleEditing(): void {
  if (!artifact.value) return
  if (editing.value) {
    editing.value = false
    saveConflict.value = ''
    displayedContent.value = artifact.value.content
    draftContent.value = artifact.value.content
    const currentVersion = versions.value.find(
      (version) => version.version === artifact.value?.currentVersion,
    )
    selectedVersionId.value = currentVersion?.id
    exportVersionId.value = currentVersion?.id
    selectedVersionNumber.value = artifact.value.currentVersion
    return
  }
  versionRequestSequence += 1
  versionLoading.value = false
  versionError.value = ''
  displayedContent.value = artifact.value.content
  draftContent.value = artifact.value.content
  const currentVersion = versions.value.find(
    (version) => version.version === artifact.value?.currentVersion,
  )
  selectedVersionId.value = currentVersion?.id
  selectedVersionNumber.value = artifact.value.currentVersion
  editBaseVersion.value = artifact.value.currentVersion
  saveConflict.value = ''
  editing.value = true
}

async function save(): Promise<void> {
  if (!artifact.value || editBaseVersion.value === undefined || saveConflict.value) return
  saving.value = true
  try {
    const result = await updateArtifact(id, {
      title: artifact.value.title,
      content: draftContent.value,
      expectedVersion: editBaseVersion.value,
    })
    artifact.value = result
    draftContent.value = result.content
    editing.value = false
    ElMessage.success(`已创建 v${result.currentVersion}`)
    await load()
  } catch (saveError) {
    const problem = getProblem(saveError)
    if (problem.status === 409) {
      await refreshAfterConflict()
      saveConflict.value = '成果已被其他页面更新，请取消编辑后基于最新版本重新编辑'
      return
    }
    ElMessage.error(problem.detail || problem.title)
  } finally {
    saving.value = false
  }
}

async function refreshAfterConflict(): Promise<void> {
  versionRequestSequence += 1
  versionLoading.value = false
  versionError.value = ''
  try {
    const [artifactResult, versionResult] = await Promise.all([
      getArtifact(id),
      listArtifactVersions(id),
    ])
    artifact.value = artifactResult
    versions.value = versionResult
    versionContentCache.clear()
    const currentVersion = versionResult.find(
      (version) => version.version === artifactResult.currentVersion,
    )
    selectedVersionId.value = currentVersion?.id
    selectedVersionNumber.value = artifactResult.currentVersion
    displayedContent.value = artifactResult.content
    if (currentVersion) {
      versionContentCache.set(currentVersion.id, artifactResult.content)
    }
  } catch (refreshError) {
    ElMessage.error(`最新版本刷新失败：${problemMessage(refreshError)}`)
  }
}

onMounted(() => load())

onBeforeUnmount(() => {
  destroyed = true
  if (exportPollTimer) window.clearTimeout(exportPollTimer)
})
</script>

<style scoped>
.artifact-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
  align-items: start;
  gap: 16px;
}

.artifact-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.editor-body {
  padding: 16px;
}

.save-conflict {
  margin: 12px 16px 0;
  width: auto;
}

.version-feedback {
  min-height: 360px;
}

.editor-body :deep(.el-textarea__inner) {
  color: var(--ow-ink-secondary);
  background: oklch(0.1 0 0);
  border-color: var(--ow-line-soft);
  font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
  font-size: 12px;
  line-height: 1.7;
}

.version-list {
  padding: 6px 8px 8px;
}

.source-grid {
  grid-template-columns: 1fr;
}

.source-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 0;
  color: var(--ow-primary-strong);
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.source-link svg {
  width: 13px;
  height: 13px;
  flex: none;
}

.exports-feedback {
  padding: 14px 16px;
}

.exports-alert {
  width: auto;
  margin: 12px 16px;
}

.export-list {
  padding: 6px 8px 8px;
}

.export-row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 9px;
  min-height: 58px;
  padding: 8px;
  border-bottom: 1px solid var(--ow-line-soft);
}

.export-row > svg {
  width: 16px;
  height: 16px;
  color: var(--ow-primary);
}

.export-row > span {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.export-row small {
  overflow: hidden;
  color: var(--ow-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.el-dialog .el-select),
:deep(.el-dialog .el-segmented) {
  width: 100%;
}

.version-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 11px 8px;
  color: var(--ow-ink-secondary);
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--ow-line-soft);
  cursor: pointer;
}

.version-row:last-child {
  border-bottom: 0;
}

.version-row:hover,
.version-row.active {
  background: var(--ow-surface-raised);
}

.version-row:disabled {
  cursor: default;
}

.version-row > span {
  display: grid;
  gap: 3px;
}

.version-row small {
  color: var(--ow-muted);
}

.version-row > svg {
  width: 15px;
  height: 15px;
  color: var(--ow-muted);
}

@media (max-width: 900px) {
  .artifact-layout {
    grid-template-columns: 1fr;
  }
}
</style>
