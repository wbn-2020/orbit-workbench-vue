<template>
  <div class="page">
    <PageHeader title="资料中心" description="管理可被技术学习任务引用的本地纯文本与 Markdown 资料。">
      <template #actions>
        <el-button type="primary" :icon="Upload" @click="uploadDialogOpen = true">
          上传资料
        </el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="load" />
    <section v-else class="surface">
      <div v-if="loading" class="page-feedback"><el-skeleton :rows="6" animated /></div>
      <EmptyState
        v-else-if="documents.length === 0"
        title="还没有资料"
        description="上传纯文本或 Markdown 文件，创建任务时即可选择。"
        :icon="FileText"
      >
        <el-button type="primary" @click="uploadDialogOpen = true">上传第一份资料</el-button>
      </EmptyState>
      <div v-else class="table-wrap">
        <el-table :data="documents" row-key="id">
          <el-table-column label="文件" min-width="280">
            <template #default="{ row }">
              <button type="button" class="file-cell" @click="openDocument(row)">
                <FileText aria-hidden="true" />
                <span>
                  <strong>{{ row.originalName || row.fileName || `资料 #${row.id}` }}</strong>
                  <small>{{ row.mediaType }}</small>
                </span>
              </button>
            </template>
          </el-table-column>
          <el-table-column label="大小" width="110">
            <template #default="{ row }">{{ formatFileSize(row.sizeBytes) }}</template>
          </el-table-column>
          <el-table-column label="解析状态" width="120">
            <template #default="{ row }">
              <StatusTag :value="row.parseStatus" />
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="155">
            <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button text :icon="Eye" @click="openDocument(row)">查看</el-button>
              <el-button text type="danger" :icon="Trash2" @click="remove(row)">删除</el-button>
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

    <el-dialog
      v-model="uploadDialogOpen"
      title="上传资料"
      width="min(520px, calc(100vw - 32px))"
      destroy-on-close
      @closed="resetUpload"
    >
      <ErrorState
        v-if="workspaceError"
        class="dialog-error"
        :message="workspaceError"
        :retry="loadWorkspaces"
      />
      <el-form label-position="top">
        <el-form-item label="工作区" required>
          <el-select
            v-model="uploadForm.workspaceId"
            placeholder="选择工作区"
            :loading="workspaceLoading"
            :disabled="Boolean(workspaceError)"
          >
            <el-option
              v-for="workspace in workspaces"
              :key="workspace.id"
              :label="workspace.name"
              :value="workspace.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="文件" required>
          <input
            ref="fileInput"
            class="file-input"
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            @change="selectFile"
          />
          <div class="file-picker">
            <el-button :icon="Paperclip" @click="fileInput?.click()">选择文件</el-button>
            <span v-if="selectedFile" class="truncate">{{ selectedFile.name }}</span>
            <span v-else class="muted">支持 .txt 和 .md</span>
          </div>
        </el-form-item>
        <el-progress v-if="uploading" :percentage="uploadProgress" :show-text="false" />
      </el-form>
      <template #footer>
        <el-button @click="uploadDialogOpen = false">取消</el-button>
        <el-button
          type="primary"
          :loading="uploading"
          :disabled="workspaceLoading || Boolean(workspaceError)"
          @click="upload"
        >
          开始上传
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="contentDialogOpen"
      :title="currentDocument?.originalName || currentDocument?.fileName || '资料内容'"
      width="min(860px, calc(100vw - 32px))"
      top="6vh"
      @closed="closeContent"
    >
      <div v-if="contentLoading" class="page-feedback"><el-skeleton :rows="10" animated /></div>
      <ErrorState v-else-if="contentError" :message="contentError" />
      <pre v-else class="document-content">{{ content }}</pre>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Eye, FileText, Paperclip, Trash2, Upload } from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'

import {
  deleteDocument,
  getDocumentContent,
  listDocuments,
  uploadDocument,
} from '@/api/documents'
import { problemMessage } from '@/api/http'
import { listWorkspaces } from '@/api/workspaces'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { DocumentSummary, Workspace } from '@/types/api'
import { formatDateTime, formatFileSize } from '@/utils/format'
import { createLatestRequestGuard } from '@/utils/latestRequest'

const loading = ref(true)
const error = ref('')
const documents = ref<DocumentSummary[]>([])
const workspaces = ref<Workspace[]>([])
const workspaceLoading = ref(false)
const workspaceError = ref('')
const page = ref(1)
const size = ref(20)
const total = ref(0)

const uploadDialogOpen = ref(false)
const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File>()
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadForm = reactive({ workspaceId: undefined as number | undefined })

const contentDialogOpen = ref(false)
const contentLoading = ref(false)
const contentError = ref('')
const content = ref('')
const currentDocument = ref<DocumentSummary>()
const documentListRequest = createLatestRequestGuard()
const workspaceRequest = createLatestRequestGuard()
const contentRequest = createLatestRequestGuard()

async function load(): Promise<void> {
  const requestId = documentListRequest.begin()
  loading.value = true
  error.value = ''
  try {
    const result = await listDocuments(page.value, size.value)
    if (documentListRequest.isCurrent(requestId)) {
      documents.value = result.items
      total.value = result.total
    }
  } catch (loadError) {
    if (documentListRequest.isCurrent(requestId)) {
      error.value = problemMessage(loadError)
    }
  } finally {
    if (documentListRequest.isCurrent(requestId)) {
      loading.value = false
    }
  }
}

async function loadWorkspaces(): Promise<void> {
  const requestId = workspaceRequest.begin()
  workspaceLoading.value = true
  workspaceError.value = ''
  try {
    const result = await listWorkspaces()
    if (workspaceRequest.isCurrent(requestId)) {
      workspaces.value = result
      uploadForm.workspaceId = result[0]?.id
    }
  } catch (loadError) {
    if (workspaceRequest.isCurrent(requestId)) {
      workspaceError.value = problemMessage(loadError)
    }
  } finally {
    if (workspaceRequest.isCurrent(requestId)) {
      workspaceLoading.value = false
    }
  }
}

function selectFile(event: Event): void {
  selectedFile.value = (event.target as HTMLInputElement).files?.[0]
}

function resetUpload(): void {
  selectedFile.value = undefined
  uploadProgress.value = 0
  uploadForm.workspaceId = workspaces.value[0]?.id
  if (fileInput.value) fileInput.value.value = ''
}

async function upload(): Promise<void> {
  if (!selectedFile.value) {
    ElMessage.warning('请选择文件')
    return
  }
  if (!uploadForm.workspaceId) {
    ElMessage.warning('请选择工作区')
    return
  }
  uploading.value = true
  uploadProgress.value = 0
  try {
    await uploadDocument(selectedFile.value, uploadForm.workspaceId, {
      onUploadProgress: (event) => {
        if (event.total) uploadProgress.value = Math.round((event.loaded / event.total) * 100)
      },
    })
    ElMessage.success('资料已上传')
    uploadDialogOpen.value = false
    await load()
  } catch (uploadError) {
    ElMessage.error(problemMessage(uploadError))
  } finally {
    uploading.value = false
  }
}

async function openDocument(document: DocumentSummary): Promise<void> {
  const requestId = contentRequest.begin()
  currentDocument.value = document
  contentDialogOpen.value = true
  contentLoading.value = true
  contentError.value = ''
  content.value = ''
  try {
    const result = await getDocumentContent(document.id)
    if (
      contentRequest.isCurrent(requestId) &&
      contentDialogOpen.value &&
      currentDocument.value?.id === document.id
    ) {
      content.value = result
    }
  } catch (loadError) {
    if (
      contentRequest.isCurrent(requestId) &&
      contentDialogOpen.value &&
      currentDocument.value?.id === document.id
    ) {
      contentError.value = problemMessage(loadError)
    }
  } finally {
    if (
      contentRequest.isCurrent(requestId) &&
      currentDocument.value?.id === document.id
    ) {
      contentLoading.value = false
    }
  }
}

function closeContent(): void {
  contentRequest.invalidate()
  currentDocument.value = undefined
  content.value = ''
  contentError.value = ''
  contentLoading.value = false
}

async function remove(document: DocumentSummary): Promise<void> {
  try {
    await ElMessageBox.confirm(
      '删除后文件内容将无法被任务引用，历史任务只保留非敏感关联信息。',
      '确认删除资料',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    )
    await deleteDocument(document.id)
    ElMessage.success('资料已删除')
    await load()
  } catch (removeError) {
    if (removeError === 'cancel') return
    ElMessage.error(problemMessage(removeError))
  }
}

onMounted(() => {
  void loadWorkspaces()
  void load()
})
</script>

<style scoped>
.file-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  padding: 0;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.file-cell > svg {
  width: 18px;
  height: 18px;
  flex: none;
  color: var(--ow-primary);
}

.file-cell > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.file-cell strong,
.file-cell small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-cell strong {
  color: var(--ow-ink-secondary);
}

.file-cell small {
  color: var(--ow-muted);
  font-size: 12px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding: 15px 16px 16px;
  border-top: 1px solid var(--ow-line-soft);
}

.file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.file-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 100%;
}

.file-picker > span {
  min-width: 0;
}

.document-content {
  max-height: 68vh;
  margin: 0;
  padding: 16px;
  overflow: auto;
  color: var(--ow-ink-secondary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: oklch(0.1 0 0);
  border: 1px solid var(--ow-line-soft);
  border-radius: var(--ow-radius-sm);
  font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
  font-size: 12px;
  line-height: 1.7;
}

.el-dialog :deep(.el-select) {
  width: 100%;
}

.dialog-error {
  margin-bottom: 16px;
}
</style>
