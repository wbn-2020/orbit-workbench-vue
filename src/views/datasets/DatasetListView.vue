<template>
  <div class="page">
    <PageHeader title="数据集" description="上传 CSV 或 Excel，查看结构、质量摘要和有限数据预览。">
      <template #actions>
        <el-button type="primary" :icon="Upload" @click="uploadOpen = true">
          上传数据集
        </el-button>
      </template>
    </PageHeader>

    <section class="surface filters">
      <el-select
        v-model="filters.workspaceId"
        clearable
        placeholder="全部工作区"
        @change="resetAndLoad"
      >
        <el-option
          v-for="workspace in workspaces"
          :key="workspace.id"
          :label="workspace.name"
          :value="workspace.id"
        />
      </el-select>
      <el-select v-model="filters.status" clearable placeholder="全部状态" @change="resetAndLoad">
        <el-option
          v-for="status in statusOptions"
          :key="status"
          :label="enumLabel(status)"
          :value="status"
        />
      </el-select>
      <el-select v-model="filters.format" clearable placeholder="全部格式" @change="resetAndLoad">
        <el-option label="CSV" value="CSV" />
        <el-option label="Excel" value="XLSX" />
      </el-select>
      <el-date-picker
        v-model="updatedRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        start-placeholder="更新起始"
        end-placeholder="更新结束"
        @change="resetAndLoad"
      />
      <el-button :icon="RefreshCw" :loading="loading" @click="load">刷新</el-button>
    </section>

    <ErrorState v-if="error" class="page-section" :message="error" :retry="load" />
    <section v-else class="surface page-section">
      <div v-if="loading" class="page-feedback"><el-skeleton :rows="7" animated /></div>
      <EmptyState
        v-else-if="datasets.length === 0"
        title="没有匹配的数据集"
        description="上传 CSV 或 XLSX 文件，开始数据分析。"
        :icon="Database"
      >
        <el-button type="primary" @click="uploadOpen = true">上传数据集</el-button>
      </EmptyState>
      <div v-else class="table-wrap">
        <el-table :data="datasets" row-key="id" @row-click="openDataset">
          <el-table-column label="数据集" min-width="260">
            <template #default="{ row }">
              <div class="dataset-cell">
                <span class="format-mark">{{ row.format }}</span>
                <span>
                  <strong>{{ row.name }}</strong>
                  <small>{{ row.activeSheetName || '尚未选择工作表' }}</small>
                </span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="规模" width="150">
            <template #default="{ row }">
              {{ countLabel(row.rowCount, '行') }} · {{ countLabel(row.columnCount, '列') }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="125">
            <template #default="{ row }"><StatusTag :value="row.status" /></template>
          </el-table-column>
          <el-table-column label="更新时间" width="165">
            <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="250" fixed="right">
            <template #default="{ row }">
              <div class="row-actions" @click.stop>
                <el-button
                  v-if="row.status === 'FAILED'"
                  text
                  :icon="RefreshCw"
                  @click="reparse(row)"
                >
                  重新解析
                </el-button>
                <el-button
                  v-if="row.status === 'READY'"
                  text
                  type="primary"
                  :icon="ChartNoAxesCombined"
                  @click="createAnalysis(row)"
                >
                  创建分析
                </el-button>
                <el-button text :icon="ArrowUpRight" aria-label="查看数据集" @click="openDataset(row)" />
                <el-button
                  text
                  type="danger"
                  :icon="Trash2"
                  aria-label="删除数据集"
                  @click="remove(row)"
                />
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div v-if="total > 0" class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="size"
          layout="total, prev, pager, next"
          :total="total"
          @current-change="load"
          @size-change="load"
        />
      </div>
    </section>

    <el-dialog v-model="uploadOpen" title="上传数据集" width="min(560px, 92vw)" destroy-on-close>
      <el-form label-position="top">
        <el-form-item label="工作区" required>
          <el-select v-model="uploadForm.workspaceId" placeholder="选择工作区">
            <el-option
              v-for="workspace in workspaces"
              :key="workspace.id"
              :label="workspace.name"
              :value="workspace.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="数据集名称">
          <el-input v-model.trim="uploadForm.name" maxlength="128" placeholder="默认使用文件名" />
        </el-form-item>
        <el-upload
          drag
          action=""
          accept=".csv,.xlsx"
          :auto-upload="false"
          :limit="1"
          :file-list="uploadFiles"
          :on-change="selectFile"
          :on-remove="clearFile"
        >
          <UploadCloud class="upload-icon" aria-hidden="true" />
          <div>拖放 CSV 或 XLSX 到这里，或点击选择文件</div>
          <template #tip>
            <div class="upload-tip">
              <span>只接受 CSV、XLSX</span>
              <span v-if="selectedFile">
                {{ selectedFile.name }} · {{ formatFileSize(selectedFile.size) }}
              </span>
            </div>
          </template>
        </el-upload>
      </el-form>
      <template #footer>
        <el-button :disabled="uploading" @click="uploadOpen = false">取消</el-button>
        <el-button
          type="primary"
          :loading="uploading"
          :disabled="!selectedFile || !uploadForm.workspaceId"
          @click="submitUpload"
        >
          上传并解析
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  Database,
  RefreshCw,
  Trash2,
  Upload,
  UploadCloud,
} from 'lucide-vue-next'
import type { UploadFile, UploadFiles } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  deleteDataset,
  listDatasets,
  parseDataset,
  reparseDataset,
  uploadDataset,
} from '@/api/datasets'
import { problemMessage } from '@/api/http'
import { listWorkspaces } from '@/api/workspaces'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type {
  DatasetFormat,
  DatasetStatus,
  DatasetSummary,
  Workspace,
} from '@/types/api'
import { enumLabel, formatDateTime, formatFileSize } from '@/utils/format'
import { createLatestRequestGuard } from '@/utils/latestRequest'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const datasets = ref<DatasetSummary[]>([])
const workspaces = ref<Workspace[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const updatedRange = ref<[string, string]>()
const filters = reactive<{
  workspaceId?: number
  status?: DatasetStatus
  format?: DatasetFormat
}>({})
const statusOptions: DatasetStatus[] = ['UPLOADED', 'QUEUED', 'PARSING', 'READY', 'FAILED']
const request = createLatestRequestGuard()

const uploadOpen = ref(false)
const uploading = ref(false)
const uploadFiles = ref<UploadFiles>([])
const selectedFile = ref<File>()
const uploadForm = reactive<{ workspaceId?: number; name: string }>({ name: '' })

function countLabel(value: number | null, suffix: string): string {
  return value === null ? '—' : `${value.toLocaleString()} ${suffix}`
}

async function load(): Promise<void> {
  const requestId = request.begin()
  loading.value = true
  error.value = ''
  try {
    const result = await listDatasets({
      ...filters,
      updatedFrom: updatedRange.value?.[0],
      updatedTo: updatedRange.value?.[1],
      page: page.value,
      size: size.value,
    })
    if (!request.isCurrent(requestId)) return
    datasets.value = result.items
    total.value = result.total
  } catch (loadError) {
    if (request.isCurrent(requestId)) error.value = problemMessage(loadError)
  } finally {
    if (request.isCurrent(requestId)) loading.value = false
  }
}

function resetAndLoad(): void {
  page.value = 1
  void load()
}

function openDataset(dataset: DatasetSummary): void {
  void router.push(`/datasets/${dataset.id}`)
}

function createAnalysis(dataset: DatasetSummary): void {
  void router.push({
    path: '/analysis/new',
    query: {
      datasetId: String(dataset.id),
      ...(dataset.activeSheetId ? { sheetId: String(dataset.activeSheetId) } : {}),
    },
  })
}

async function reparse(dataset: DatasetSummary): Promise<void> {
  try {
    await reparseDataset(dataset.id)
    ElMessage.success('已提交重新解析')
    await load()
  } catch (actionError) {
    ElMessage.error(problemMessage(actionError))
  }
}

async function remove(dataset: DatasetSummary): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `删除“${dataset.name}”后，新任务将不能再使用该数据集。`,
      '删除数据集',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    )
    await deleteDataset(dataset.id)
    ElMessage.success('数据集已删除')
    await load()
  } catch (actionError) {
    if (actionError === 'cancel') return
    ElMessage.error(problemMessage(actionError))
  }
}

function selectFile(file: UploadFile, files: UploadFiles): void {
  uploadFiles.value = files.slice(-1)
  selectedFile.value = file.raw
  if (!uploadForm.name && file.name) {
    uploadForm.name = file.name.replace(/\.(csv|xlsx)$/i, '')
  }
}

function clearFile(): void {
  uploadFiles.value = []
  selectedFile.value = undefined
}

async function submitUpload(): Promise<void> {
  if (!selectedFile.value || !uploadForm.workspaceId || uploading.value) return
  const extension = selectedFile.value.name.split('.').pop()?.toLowerCase()
  if (!['csv', 'xlsx'].includes(extension || '')) {
    ElMessage.error('只支持 CSV 或 XLSX 文件')
    return
  }

  uploading.value = true
  try {
    const dataset = await uploadDataset({
      workspaceId: uploadForm.workspaceId,
      name: uploadForm.name || undefined,
      file: selectedFile.value,
    })
    try {
      await parseDataset(dataset.id)
    } catch (parseError) {
      ElMessage.warning(`数据集已上传，但解析启动失败：${problemMessage(parseError)}`)
    }
    uploadOpen.value = false
    clearFile()
    uploadForm.name = ''
    await router.push(`/datasets/${dataset.id}`)
  } catch (uploadError) {
    ElMessage.error(problemMessage(uploadError))
  } finally {
    uploading.value = false
  }
}

onMounted(async () => {
  try {
    workspaces.value = await listWorkspaces()
    uploadForm.workspaceId = workspaces.value[0]?.id
  } catch (loadError) {
    error.value = problemMessage(loadError)
  }
  await load()
})
</script>

<style scoped>
.filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px;
}

.filters .el-select {
  width: 168px;
}

.dataset-cell,
.row-actions {
  display: flex;
  align-items: center;
}

.dataset-cell {
  min-width: 0;
  gap: 10px;
}

.dataset-cell > span:last-child {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.dataset-cell strong,
.dataset-cell small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dataset-cell small {
  color: var(--ow-muted);
}

.format-mark {
  display: grid;
  width: 46px;
  height: 30px;
  flex: none;
  place-items: center;
  color: var(--ow-primary-strong);
  background: var(--ow-primary-soft);
  border: 1px solid oklch(0.4 0.08 140);
  border-radius: var(--ow-radius-sm);
  font-size: 10px;
  font-weight: 800;
}

.row-actions {
  justify-content: flex-end;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding: 15px 16px 16px;
  border-top: 1px solid var(--ow-line-soft);
}

.upload-icon {
  width: 36px;
  height: 36px;
  margin-bottom: 8px;
  color: var(--ow-primary);
}

.upload-tip {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--ow-muted);
}

:deep(.el-dialog .el-select) {
  width: 100%;
}

@media (max-width: 720px) {
  .filters .el-select,
  .filters :deep(.el-date-editor),
  .filters .el-button {
    width: 100%;
  }

  .upload-tip {
    flex-direction: column;
  }
}
</style>
