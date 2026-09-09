<template>
  <div class="page">
    <PageHeader
      title="项目资料"
      description="导入项目压缩包或单个文本/代码文件，生成可追溯的项目版本和静态文件清单。"
    >
      <template #actions>
        <el-button type="primary" :icon="FolderUp" @click="importDialogOpen = true">
          导入项目资料
        </el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="load" />
    <section v-else class="surface">
      <div v-if="loading" class="page-feedback"><el-skeleton :rows="7" animated /></div>
      <EmptyState
        v-else-if="projects.length === 0"
        title="还没有项目资料"
        description="从 ZIP 或单个 Markdown、Java、配置、SQL 文件开始，系统只做静态读取，不执行代码。"
        :icon="FolderKanban"
      >
        <el-button type="primary" @click="importDialogOpen = true">导入第一个项目</el-button>
      </EmptyState>
      <div v-else class="table-wrap">
        <el-table :data="projects" row-key="id">
          <el-table-column label="项目" min-width="260">
            <template #default="{ row }">
              <button type="button" class="project-cell" @click="openProject(row.id)">
                <FolderKanban aria-hidden="true" />
                <span>
                  <strong>{{ row.name }}</strong>
                  <small v-if="row.latestVersion">
                    V{{ row.latestVersion.versionNumber }} · {{ row.latestVersion.sourceFileName }}
                  </small>
                  <small v-else>尚未导入资料版本</small>
                </span>
              </button>
            </template>
          </el-table-column>
          <el-table-column label="最新版本" width="130">
            <template #default="{ row }">
              <span v-if="row.latestVersion">V{{ row.latestVersion.versionNumber }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="解析结果" width="210">
            <template #default="{ row }">
              <div v-if="row.latestVersion" class="version-counts">
                <span>解析 {{ row.latestVersion.parsedFileCount }}</span>
                <span>排除 {{ row.latestVersion.excludedFileCount }}</span>
                <span v-if="row.latestVersion.failedFileCount" class="failed-count">
                  失败 {{ row.latestVersion.failedFileCount }}
                </span>
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="150">
            <template #default="{ row }">
              <StatusTag :value="row.latestVersion?.status || row.status" />
            </template>
          </el-table-column>
          <el-table-column label="最近导入" width="170">
            <template #default="{ row }">
              {{ row.latestVersion ? formatDateTime(row.latestVersion.createdAt) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="112" fixed="right">
            <template #default="{ row }">
              <el-button text :icon="ArrowUpRight" @click="openProject(row.id)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-dialog
      v-model="importDialogOpen"
      title="导入项目资料"
      width="min(580px, calc(100vw - 32px))"
      destroy-on-close
      @closed="resetImport"
    >
      <ErrorState
        v-if="workspaceError"
        class="dialog-error"
        :message="workspaceError"
        :retry="loadWorkspaces"
      />
      <el-form label-position="top">
        <el-form-item label="项目名称" required>
          <el-input v-model="form.name" maxlength="128" placeholder="例如：渠道协同平台" />
        </el-form-item>
        <el-form-item label="工作区" required>
          <el-select
            v-model="form.workspaceId"
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
        <el-form-item label="导入方式" required>
          <el-radio-group v-model="sourceMode">
            <el-radio-button value="upload">本地文件</el-radio-button>
            <el-radio-button value="github">GitHub 公开仓库</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="sourceMode === 'upload'" label="项目资料" required>
          <input
            ref="fileInput"
            class="file-input"
            type="file"
            accept=".zip,.md,.txt,.java,.xml,.yml,.yaml,.json,.sql,.properties,.gradle,.pdf,.docx,.pptx,.xlsx"
            @change="selectFile"
          />
          <div class="file-picker">
            <el-button :icon="Paperclip" @click="fileInput?.click()">选择文件</el-button>
            <span v-if="selectedFile" class="truncate">{{ selectedFile.name }}</span>
            <span v-else class="muted">ZIP、文档（PDF/DOCX/PPTX/XLSX）或单个文本/代码文件，最大 20 MB</span>
          </div>
          <p class="import-note">
            ZIP 内默认排除 `.git`、构建目录、依赖目录、环境变量、密钥和证书文件。
            当前浏览器版请先将本地目录压缩为 ZIP；导入过程不会执行代码、脚本或宏。
          </p>
        </el-form-item>
        <el-form-item v-else label="仓库地址" required>
          <el-input
            v-model.trim="githubRepositoryUrl"
            placeholder="https://github.com/owner/repository"
            autocomplete="url"
          />
          <p class="import-note">
            仅支持 GitHub 公开仓库根地址。系统只下载受限归档并静态扫描，不读取私有仓库、不执行代码，也不会写入远程仓库。
          </p>
        </el-form-item>
        <el-progress
          v-if="importing && sourceMode === 'upload'"
          :percentage="importProgress"
          :show-text="false"
        />
      </el-form>
      <template #footer>
        <el-button @click="importDialogOpen = false">取消</el-button>
        <el-button
          type="primary"
          :loading="importing"
          :disabled="workspaceLoading || Boolean(workspaceError)"
          @click="submitImport"
        >
          开始导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ArrowUpRight, FolderKanban, FolderUp, Paperclip } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { createGitHubProject, createProject, listProjects } from '@/api/projects'
import { problemMessage } from '@/api/http'
import { listWorkspaces } from '@/api/workspaces'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { ProjectSummary, Workspace } from '@/types/api'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const projects = ref<ProjectSummary[]>([])
const importDialogOpen = ref(false)
const importing = ref(false)
const importProgress = ref(0)
const sourceMode = ref<'upload' | 'github'>('upload')
const fileInput = ref<HTMLInputElement>()
const selectedFile = ref<File>()
const githubRepositoryUrl = ref('')
const workspaces = ref<Workspace[]>([])
const workspaceLoading = ref(false)
const workspaceError = ref('')
const form = reactive({
  name: '',
  workspaceId: undefined as number | undefined,
})

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    projects.value = await listProjects()
  } catch (loadError) {
    error.value = problemMessage(loadError)
  } finally {
    loading.value = false
  }
}

async function loadWorkspaces(): Promise<void> {
  workspaceLoading.value = true
  workspaceError.value = ''
  try {
    workspaces.value = await listWorkspaces()
    form.workspaceId = workspaces.value[0]?.id
  } catch (loadError) {
    workspaceError.value = problemMessage(loadError)
  } finally {
    workspaceLoading.value = false
  }
}

function selectFile(event: Event): void {
  selectedFile.value = (event.target as HTMLInputElement).files?.[0]
}

function resetImport(): void {
  form.name = ''
  form.workspaceId = workspaces.value[0]?.id
  selectedFile.value = undefined
  sourceMode.value = 'upload'
  githubRepositoryUrl.value = ''
  importProgress.value = 0
  if (fileInput.value) fileInput.value.value = ''
}

async function submitImport(): Promise<void> {
  if (!form.name.trim()) {
    ElMessage.warning('请填写项目名称')
    return
  }
  if (!form.workspaceId) {
    ElMessage.warning('请选择工作区')
    return
  }
  if (sourceMode.value === 'upload' && !selectedFile.value) {
    ElMessage.warning('请选择项目资料')
    return
  }
  if (sourceMode.value === 'github' && !githubRepositoryUrl.value) {
    ElMessage.warning('请输入 GitHub 公开仓库地址')
    return
  }

  importing.value = true
  importProgress.value = 0
  try {
    const project =
      sourceMode.value === 'upload'
        ? await createProject(form.name.trim(), form.workspaceId, selectedFile.value!, {
            onUploadProgress: (event) => {
              if (event.total) {
                importProgress.value = Math.round((event.loaded / event.total) * 100)
              }
            },
          })
        : await createGitHubProject(
            form.name.trim(),
            form.workspaceId,
            githubRepositoryUrl.value,
          )
    ElMessage.success('项目资料已导入')
    importDialogOpen.value = false
    await router.push(`/projects/${project.id}`)
  } catch (importError) {
    ElMessage.error(problemMessage(importError))
  } finally {
    importing.value = false
  }
}

function openProject(id: number): void {
  void router.push(`/projects/${id}`)
}

onMounted(() => {
  void load()
  void loadWorkspaces()
})
</script>

<style scoped>
.project-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 0;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.project-cell > svg {
  width: 19px;
  height: 19px;
  flex: none;
  color: var(--ow-primary);
}

.project-cell > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.project-cell strong,
.project-cell small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-cell strong {
  color: var(--ow-ink-secondary);
}

.project-cell small,
.version-counts,
.import-note {
  color: var(--ow-muted);
  font-size: 12px;
}

.version-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.failed-count {
  color: #c74349;
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

.import-note {
  margin: 10px 0 0;
  line-height: 1.65;
}

.el-dialog :deep(.el-select) {
  width: 100%;
}

.el-dialog :deep(.el-radio-group) {
  display: flex;
}

.dialog-error {
  margin-bottom: 16px;
}
</style>
