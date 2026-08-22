<template>
  <div class="page">
    <PageHeader
      :title="dataset?.name || '数据集详情'"
      :description="dataset ? datasetDescription(dataset) : ''"
      back
    >
      <template #actions>
        <StatusTag v-if="dataset" :value="dataset.status" />
        <el-button
          v-if="dataset?.status === 'FAILED'"
          :icon="RefreshCw"
          :loading="reparsing"
          @click="reparse"
        >
          重新解析
        </el-button>
        <el-button
          v-if="dataset?.status === 'READY'"
          type="primary"
          :icon="ChartNoAxesCombined"
          @click="createAnalysis"
        >
          创建分析任务
        </el-button>
        <el-button v-if="dataset" type="danger" plain :icon="Trash2" @click="remove">
          删除
        </el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="loadDataset" />
    <div v-else-if="loading" class="surface page-feedback"><el-skeleton :rows="10" animated /></div>
    <template v-else-if="dataset">
      <el-alert
        v-if="isParsing"
        class="parse-alert"
        title="数据集正在解析"
        description="页面会自动刷新状态；离开页面不会取消后台解析。"
        type="info"
        show-icon
        :closable="false"
      />
      <el-alert
        v-else-if="dataset.status === 'FAILED'"
        class="parse-alert"
        :title="dataset.errorSummary || '数据集解析失败'"
        :description="dataset.errorCode || undefined"
        type="error"
        show-icon
        :closable="false"
      />

      <section class="metric-grid">
        <div class="surface metric">
          <span>数据行</span><strong>{{ metric(dataset.rowCount) }}</strong>
        </div>
        <div class="surface metric">
          <span>字段</span><strong>{{ metric(dataset.columnCount) }}</strong>
        </div>
        <div class="surface metric">
          <span>工作表</span><strong>{{ dataset.sheets.length }}</strong>
        </div>
        <div class="surface metric">
          <span>更新时间</span><strong class="metric-time">{{ formatDateTime(dataset.updatedAt) }}</strong>
        </div>
      </section>

      <section v-if="dataset.status === 'READY'" class="surface page-section dataset-workspace">
        <div class="sheet-tabs">
          <el-tabs v-model="activeSheetKey" @tab-change="changeSheet">
            <el-tab-pane
              v-for="sheet in dataset.sheets"
              :key="sheet.id"
              :label="sheet.name"
              :name="String(sheet.id)"
            />
          </el-tabs>
        </div>

        <div v-if="activeSheet" class="sheet-summary">
          <div>
            <strong>{{ activeSheet.name }}</strong>
            <span>{{ metric(activeSheet.rowCount) }} 行 · {{ metric(activeSheet.columnCount) }} 列</span>
          </div>
          <el-button text :icon="RefreshCw" :loading="sectionLoading" @click="loadSheetData">
            刷新工作表
          </el-button>
        </div>

        <div class="detail-sections">
          <section class="dataset-section">
            <div class="section-heading">
              <div>
                <h2>数据质量</h2>
                <p>缺失值和重复行来自服务端 Profile。</p>
              </div>
            </div>
            <div v-if="profileLoading" class="section-feedback"><el-skeleton :rows="3" animated /></div>
            <el-alert
              v-else-if="profileError"
              :title="profileError"
              type="error"
              show-icon
              :closable="false"
            />
            <div v-else-if="profile" class="quality-grid">
              <div><span>总行数</span><strong>{{ metric(profile.rowCount) }}</strong></div>
              <div><span>字段数</span><strong>{{ metric(profile.columnCount) }}</strong></div>
              <div><span>缺失单元格</span><strong>{{ metric(profile.missingCellCount) }}</strong></div>
              <div><span>重复行</span><strong>{{ metric(profile.duplicateRowCount) }}</strong></div>
            </div>
          </section>

          <section class="dataset-section">
            <div class="section-heading">
              <div>
                <h2>字段</h2>
                <p>覆盖类型会影响后续分析；并发修改冲突时会自动刷新。</p>
              </div>
            </div>
            <div v-if="columnsLoading" class="section-feedback"><el-skeleton :rows="5" animated /></div>
            <el-alert
              v-else-if="columnsError"
              :title="columnsError"
              type="error"
              show-icon
              :closable="false"
            />
            <div v-else class="table-wrap">
              <el-table :data="displayedColumns" row-key="id">
                <el-table-column prop="name" label="字段" min-width="180" fixed />
                <el-table-column label="推断类型" width="120">
                  <template #default="{ row }">{{ enumLabel(row.inferredType) }}</template>
                </el-table-column>
                <el-table-column label="有效类型" width="170">
                  <template #default="{ row }">
                    <el-select
                      v-model="columnTypeDrafts[row.id]"
                      :loading="updatingColumnId === row.id"
                      @change="(value: DatasetColumnType) => updateColumnType(row, value)"
                    >
                      <el-option
                        v-for="type in columnTypes"
                        :key="type"
                        :label="enumLabel(type)"
                        :value="type"
                      />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column label="缺失" width="100">
                  <template #default="{ row }">{{ metric(row.missingCount) }}</template>
                </el-table-column>
                <el-table-column label="不同值" width="100">
                  <template #default="{ row }">{{ metric(row.distinctCount) }}</template>
                </el-table-column>
                <el-table-column label="范围" min-width="190">
                  <template #default="{ row }">
                    {{ rangeLabel(row.minimum, row.maximum) }}
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </section>

          <section class="dataset-section preview-section">
            <div class="section-heading">
              <div>
                <h2>数据预览</h2>
                <p>每次最多读取 100 行，不在浏览器加载完整数据集。</p>
              </div>
              <el-select v-model="previewLimit" @change="resetPreview">
                <el-option label="50 行" :value="50" />
                <el-option label="100 行" :value="100" />
              </el-select>
            </div>
            <div v-if="previewLoading" class="section-feedback"><el-skeleton :rows="8" animated /></div>
            <el-alert
              v-else-if="previewError"
              :title="previewError"
              type="error"
              show-icon
              :closable="false"
            />
            <EmptyState
              v-else-if="!preview || preview.rows.length === 0"
              title="没有可预览的数据行"
              :icon="Table2"
            />
            <template v-else>
              <div class="preview-table">
                <el-table :data="normalizedPreviewRows" height="430" row-key="__rowKey">
                  <el-table-column
                    v-for="column in normalizedPreviewColumns"
                    :key="column.key"
                    :prop="column.key"
                    :label="column.name"
                    width="180"
                    show-overflow-tooltip
                  >
                    <template #default="{ row }">
                      <span :class="{ 'null-cell': row[column.key] === null }">
                        {{ cellLabel(row[column.key]) }}
                      </span>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
              <div class="preview-pagination">
                <span>第 {{ preview.offset + 1 }} 至 {{ preview.offset + preview.rows.length }} 行</span>
                <div class="inline-actions">
                  <el-button :disabled="preview.offset === 0" @click="previousPreview">上一页</el-button>
                  <el-button :disabled="!preview.hasMore" @click="nextPreview">下一页</el-button>
                </div>
              </div>
            </template>
          </section>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ChartNoAxesCombined, RefreshCw, Table2, Trash2 } from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  deleteDataset,
  getDataset,
  getDatasetPreview,
  getDatasetProfile,
  listDatasetColumns,
  overrideDatasetColumnType,
  parseDataset,
  reparseDataset,
} from '@/api/datasets'
import { getProblem, problemMessage } from '@/api/http'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type {
  DatasetCellValue,
  DatasetColumn,
  DatasetColumnType,
  DatasetDetail,
  DatasetPreview,
  DatasetPreviewColumn,
  DatasetProfile,
  DatasetSheetSummary,
} from '@/types/api'
import { enumLabel, formatDateTime, formatFileSize } from '@/utils/format'
import { createLatestRequestGuard } from '@/utils/latestRequest'

const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)
const loading = ref(true)
const error = ref('')
const reparsing = ref(false)
const dataset = ref<DatasetDetail>()
const activeSheetKey = ref('')
const columns = ref<DatasetColumn[]>([])
const profile = ref<DatasetProfile>()
const preview = ref<DatasetPreview>()
const previewOffset = ref(0)
const previewLimit = ref(50)
const columnsLoading = ref(false)
const profileLoading = ref(false)
const previewLoading = ref(false)
const columnsError = ref('')
const profileError = ref('')
const previewError = ref('')
const updatingColumnId = ref<number>()
const columnTypeDrafts = ref<Record<number, DatasetColumnType>>({})
const columnTypes: DatasetColumnType[] = [
  'STRING',
  'INTEGER',
  'DECIMAL',
  'BOOLEAN',
  'DATE',
  'DATETIME',
]
const sheetRequest = createLatestRequestGuard()
let pollTimer: number | undefined
let parseRequested = false
let destroyed = false

const activeSheet = computed<DatasetSheetSummary | undefined>(() =>
  dataset.value?.sheets.find((sheet) => String(sheet.id) === activeSheetKey.value),
)
const isParsing = computed(() =>
  ['UPLOADED', 'QUEUED', 'PARSING'].includes(dataset.value?.status || ''),
)
const sectionLoading = computed(
  () => columnsLoading.value || profileLoading.value || previewLoading.value,
)
const displayedColumns = computed<DatasetColumn[]>(() => {
  const profiles = new Map(
    (profile.value?.columns || []).map((column) => [column.name, column]),
  )
  return columns.value.map((column) => {
    const columnProfile = profiles.get(column.name)
    return columnProfile
      ? {
          ...column,
          missingCount: columnProfile.missingCount,
          distinctCount: columnProfile.distinctCount,
          minimum: columnProfile.minimum,
          maximum: columnProfile.maximum,
        }
      : column
  })
})

const normalizedPreviewColumns = computed<DatasetPreviewColumn[]>(() => {
  if (!preview.value) return []
  return preview.value.columns.map((column, index) =>
    typeof column === 'string'
      ? { key: column, name: column }
      : {
          key: column.key || String(column.id ?? index),
          name: column.name || column.key || `字段 ${index + 1}`,
          effectiveType: column.effectiveType,
        },
  )
})

const normalizedPreviewRows = computed<Array<Record<string, DatasetCellValue> & { __rowKey: number }>>(
  () => {
    if (!preview.value) return []
    return preview.value.rows.map((row, index) => {
      const normalized: Record<string, DatasetCellValue> & { __rowKey: number } = {
        __rowKey: preview.value!.offset + index,
      }
      if (Array.isArray(row)) {
        normalizedPreviewColumns.value.forEach((column, columnIndex) => {
          normalized[column.key] = row[columnIndex] ?? null
        })
      } else {
        normalizedPreviewColumns.value.forEach((column) => {
          normalized[column.key] = row[column.key] ?? null
        })
      }
      return normalized
    })
  },
)

function metric(value?: number | null): string {
  return value === undefined || value === null ? '—' : value.toLocaleString()
}

function datasetDescription(value: DatasetDetail): string {
  const size = formatFileSize(value.sizeBytes)
  return size === '—' ? value.format : `${value.format} · ${size}`
}

function rangeLabel(
  minimum?: string | number | null,
  maximum?: string | number | null,
): string {
  if (minimum === undefined || minimum === null) return '—'
  if (maximum === undefined || maximum === null || maximum === minimum) return String(minimum)
  return `${minimum} - ${maximum}`
}

function cellLabel(value: DatasetCellValue | undefined): string {
  if (value === null || value === undefined || value === '') return '空值'
  if (typeof value === 'boolean') return value ? '是' : '否'
  return String(value)
}

async function loadDataset(background = false): Promise<void> {
  if (!background) loading.value = true
  if (!background) error.value = ''
  try {
    const result = await getDataset(id)
    if (destroyed) return
    dataset.value = {
      ...result,
      sheets: result.sheets || [],
    }
    const preferredSheetId = Number(route.query.sheetId)
    if (
      !activeSheetKey.value ||
      !result.sheets?.some((sheet) => String(sheet.id) === activeSheetKey.value)
    ) {
      const selected = result.sheets?.find((sheet) => sheet.id === preferredSheetId)
        || result.sheets?.find((sheet) => sheet.id === result.activeSheetId)
        || result.sheets?.[0]
      activeSheetKey.value = selected ? String(selected.id) : ''
    }

    if (result.status === 'UPLOADED' && !parseRequested) {
      parseRequested = true
      void parseDataset(id).catch(() => undefined)
    }
    if (result.status === 'READY' && activeSheetKey.value) {
      stopPolling()
      await loadSheetData()
    } else if (['UPLOADED', 'QUEUED', 'PARSING'].includes(result.status)) {
      schedulePoll()
    } else {
      stopPolling()
    }
  } catch (loadError) {
    if (!background) error.value = problemMessage(loadError)
  } finally {
    if (!background) loading.value = false
  }
}

function schedulePoll(): void {
  if (pollTimer || destroyed) return
  pollTimer = window.setTimeout(() => {
    pollTimer = undefined
    void loadDataset(true)
  }, 2_000)
}

function stopPolling(): void {
  if (!pollTimer) return
  window.clearTimeout(pollTimer)
  pollTimer = undefined
}

async function loadSheetData(): Promise<void> {
  const sheetId = Number(activeSheetKey.value)
  if (!sheetId) return
  const requestId = sheetRequest.begin()
  columnsLoading.value = true
  profileLoading.value = true
  previewLoading.value = true
  columnsError.value = ''
  profileError.value = ''
  previewError.value = ''

  const [columnResult, profileResult, previewResult] = await Promise.allSettled([
    listDatasetColumns(id, sheetId),
    getDatasetProfile(id, sheetId),
    getDatasetPreview(id, sheetId, previewOffset.value, previewLimit.value),
  ])
  if (!sheetRequest.isCurrent(requestId) || destroyed) return

  if (columnResult.status === 'fulfilled') {
    columns.value = columnResult.value
    columnTypeDrafts.value = Object.fromEntries(
      columnResult.value.map((column) => [column.id, column.effectiveType]),
    )
  } else {
    columnsError.value = problemMessage(columnResult.reason)
  }
  if (profileResult.status === 'fulfilled') profile.value = profileResult.value
  else profileError.value = problemMessage(profileResult.reason)
  if (previewResult.status === 'fulfilled') preview.value = previewResult.value
  else previewError.value = problemMessage(previewResult.reason)

  columnsLoading.value = false
  profileLoading.value = false
  previewLoading.value = false
}

function changeSheet(): void {
  previewOffset.value = 0
  void loadSheetData()
}

function resetPreview(): void {
  previewOffset.value = 0
  void loadSheetData()
}

function previousPreview(): void {
  previewOffset.value = Math.max(0, previewOffset.value - previewLimit.value)
  void loadSheetData()
}

function nextPreview(): void {
  if (!preview.value?.hasMore) return
  previewOffset.value += previewLimit.value
  void loadSheetData()
}

async function updateColumnType(
  column: DatasetColumn,
  effectiveType: DatasetColumnType,
): Promise<void> {
  if (effectiveType === column.effectiveType || updatingColumnId.value) return
  updatingColumnId.value = column.id
  try {
    const updated = await overrideDatasetColumnType(id, column.sheetId, column.id, {
      expectedVersion: column.version,
      effectiveType,
    })
    const index = columns.value.findIndex((item) => item.id === updated.id)
    if (index >= 0) columns.value.splice(index, 1, updated)
    columnTypeDrafts.value[updated.id] = updated.effectiveType
    ElMessage.success('字段类型已更新')
    void loadSheetData()
  } catch (updateError) {
    const problem = getProblem(updateError)
    if (problem.status === 409) {
      await loadSheetData()
      ElMessage.warning(`字段已被其他页面修改，已刷新；你选择的是${enumLabel(effectiveType)}`)
    } else {
      columnTypeDrafts.value[column.id] = column.effectiveType
      ElMessage.error(problem.detail || problem.title)
    }
  } finally {
    updatingColumnId.value = undefined
  }
}

async function reparse(): Promise<void> {
  reparsing.value = true
  try {
    await reparseDataset(id)
    parseRequested = true
    ElMessage.success('已提交重新解析')
    await loadDataset()
  } catch (reparseError) {
    ElMessage.error(problemMessage(reparseError))
  } finally {
    reparsing.value = false
  }
}

function createAnalysis(): void {
  void router.push({
    path: '/analysis/new',
    query: {
      datasetId: String(id),
      ...(activeSheet.value ? { sheetId: String(activeSheet.value.id) } : {}),
    },
  })
}

async function remove(): Promise<void> {
  if (!dataset.value) return
  try {
    await ElMessageBox.confirm(
      `删除“${dataset.value.name}”后，新任务将不能再使用它。`,
      '删除数据集',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    )
    await deleteDataset(id)
    ElMessage.success('数据集已删除')
    await router.replace('/datasets')
  } catch (removeError) {
    if (removeError === 'cancel') return
    ElMessage.error(problemMessage(removeError))
  }
}

onMounted(() => loadDataset())

onBeforeUnmount(() => {
  destroyed = true
  sheetRequest.invalidate()
  stopPolling()
})
</script>

<style scoped>
.parse-alert {
  margin-bottom: 16px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric {
  display: grid;
  gap: 5px;
  padding: 14px 16px;
}

.metric span {
  color: var(--ow-muted);
  font-size: 12px;
}

.metric strong {
  font-size: 22px;
}

.metric strong.metric-time {
  font-size: 14px;
}

.dataset-workspace {
  overflow: hidden;
}

.sheet-tabs {
  padding: 0 16px;
  border-bottom: 1px solid var(--ow-line-soft);
}

.sheet-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.sheet-summary,
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.sheet-summary {
  min-height: 58px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--ow-line-soft);
}

.sheet-summary > div {
  display: grid;
  gap: 2px;
}

.sheet-summary span,
.section-heading p {
  color: var(--ow-muted);
  font-size: 12px;
}

.detail-sections {
  display: grid;
}

.dataset-section {
  min-width: 0;
  padding: 18px 16px 20px;
  border-bottom: 1px solid var(--ow-line-soft);
}

.dataset-section:last-child {
  border-bottom: 0;
}

.section-heading {
  margin-bottom: 14px;
}

.section-heading h2 {
  margin: 0;
  font-size: 15px;
}

.section-heading p {
  margin: 3px 0 0;
}

.section-heading .el-select {
  width: 110px;
}

.quality-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  background: var(--ow-line-soft);
  border: 1px solid var(--ow-line-soft);
  border-radius: var(--ow-radius-sm);
}

.quality-grid > div {
  display: grid;
  gap: 5px;
  padding: 14px;
  background: var(--ow-surface-raised);
}

.quality-grid span {
  color: var(--ow-muted);
  font-size: 12px;
}

.quality-grid strong {
  font-size: 18px;
}

.section-feedback {
  min-height: 140px;
}

.preview-table {
  width: 100%;
  overflow-x: auto;
}

.preview-table :deep(.el-table) {
  min-width: max-content;
}

.null-cell {
  color: var(--ow-muted);
  font-style: italic;
}

.preview-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  color: var(--ow-muted);
  font-size: 12px;
}

@media (max-width: 800px) {
  .metric-grid,
  .quality-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .section-heading,
  .preview-pagination {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
