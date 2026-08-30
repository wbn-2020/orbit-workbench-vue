<template>
  <div class="page">
    <PageHeader
      back
      :title="project?.name || '项目资料'"
      description="每次重新导入生成独立版本。已解析内容会进入后续项目画像和知识库，排除与失败文件始终可查看。"
    >
      <template #actions>
        <el-button type="primary" :icon="RefreshCw" @click="importDialogOpen = true">
          重新导入
        </el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="load" />
    <template v-else-if="loading">
      <section class="surface page-feedback"><el-skeleton :rows="12" animated /></section>
    </template>
    <template v-else-if="project">
      <section class="surface overview">
        <div class="overview-item">
          <span>资料版本</span>
          <strong>{{ project.versions.length }}</strong>
        </div>
        <div class="overview-item">
          <span>最新可解析文件</span>
          <strong>{{ latestVersion?.parsedFileCount || 0 }}</strong>
        </div>
        <div class="overview-item">
          <span>默认排除</span>
          <strong>{{ latestVersion?.excludedFileCount || 0 }}</strong>
        </div>
        <div class="overview-item">
          <span>解析失败</span>
          <strong :class="{ danger: (latestVersion?.failedFileCount || 0) > 0 }">
            {{ latestVersion?.failedFileCount || 0 }}
          </strong>
        </div>
      </section>

      <section class="surface project-content">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">导入版本</h2>
            <span class="surface-subtitle">选择版本查看完整的静态扫描清单</span>
          </div>
          <el-select v-model="selectedVersionId" class="version-select">
            <el-option
              v-for="version in project.versions"
              :key="version.id"
              :label="`V${version.versionNumber} · ${version.sourceFileName}`"
              :value="version.id"
            />
          </el-select>
        </div>

        <div v-if="selectedVersion" class="version-meta">
          <span><strong>状态</strong><StatusTag :value="selectedVersion.status" /></span>
          <span><strong>来源</strong>{{ sourceTypeLabel(selectedVersion.sourceType) }}</span>
          <span><strong>导入时间</strong>{{ formatDateTime(selectedVersion.createdAt) }}</span>
          <span><strong>文件总量</strong>{{ selectedVersion.totalFileCount }}</span>
          <span>
            <strong>知识块</strong>
            <el-tag size="small" :type="knowledgeTagType(selectedVersion)">
              {{ knowledgeStatusLabel(selectedVersion) }}
            </el-tag>
            <el-button
              text
              size="small"
              :loading="rebuildingKnowledge"
              :disabled="selectedVersion.knowledgeBuildStatus === 'BUILDING'"
              @click="rebuildKnowledge"
            >
              {{ knowledgeRetryLabel(selectedVersion) }}
            </el-button>
          </span>
        </div>

        <p
          v-if="selectedVersion?.knowledgeBuildStatus === 'FAILED'"
          class="knowledge-error"
        >
          知识块构建失败：{{ selectedVersion.knowledgeBuildError || '未知原因' }}
        </p>

        <div v-if="selectedVersion" class="table-wrap">
          <el-table :data="selectedVersion.files || []" row-key="id">
            <el-table-column label="路径" min-width="330">
              <template #default="{ row }">
                <div class="path-cell">
                  <FileCode2 aria-hidden="true" />
                  <span class="truncate">{{ row.relativePath }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="类型" min-width="150">
              <template #default="{ row }">{{ row.mediaType || '-' }}</template>
            </el-table-column>
            <el-table-column label="大小" width="110">
              <template #default="{ row }">{{ formatFileSize(row.sizeBytes) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="130">
              <template #default="{ row }"><StatusTag :value="row.status" /></template>
            </el-table-column>
            <el-table-column label="说明" min-width="230">
              <template #default="{ row }">{{ row.statusReason || '可用于后续解析' }}</template>
            </el-table-column>
          </el-table>
        </div>
      </section>

      <section class="surface facts-section">
        <div class="surface-header facts-header">
          <div>
            <h2 class="surface-title">项目画像事实</h2>
            <span class="surface-subtitle">
              已确认 {{ confirmedFactCount }} 条 · 待确认 {{ analyzedFactCount }} 条
            </span>
          </div>
          <div class="facts-actions">
            <el-select
              v-model="generationConnectionId"
              class="connection-select"
              clearable
              placeholder="默认可用 AI 账户"
              :loading="connectionsLoading"
            >
              <el-option
                v-for="connection in connections"
                :key="connection.id"
                :label="`${connection.name} · ${connection.modelName}`"
                :value="connection.id"
              />
            </el-select>
            <el-button
              type="primary"
              :icon="Sparkles"
              :loading="generatingFacts"
              :disabled="!selectedVersion"
              @click="generateProjectFacts"
            >
              生成分析
            </el-button>
          </div>
        </div>

        <div class="facts-toolbar">
          <span class="facts-note">分析结果需要人工确认后才会作为项目画像使用。</span>
          <el-checkbox v-model="showArchivedFacts">显示已归档</el-checkbox>
        </div>

        <ErrorState v-if="factsError" class="facts-error" :message="factsError" :retry="loadFacts" />
        <div v-else-if="factsLoading" class="facts-loading">
          <el-skeleton :rows="4" animated />
        </div>
        <el-empty
          v-else-if="visibleFacts.length === 0"
          :image-size="80"
          description="当前版本还没有画像事实"
        />
        <div v-else class="fact-list">
          <article v-for="fact in visibleFacts" :key="fact.id" class="fact-row">
            <div class="fact-status">
              <el-tag size="small" :type="factTagType(fact.confirmationStatus)">
                {{ factStatusLabel(fact.confirmationStatus) }}
              </el-tag>
              <span>{{ FACT_TYPE_LABELS[fact.factType] }}</span>
            </div>
            <div class="fact-body">
              <div class="fact-title-line">
                <strong>{{ fact.title }}</strong>
                <span v-if="fact.confidence !== null" class="confidence">
                  分析置信度 {{ fact.confidence }}%
                </span>
              </div>
              <p>{{ fact.content }}</p>
              <small>
                {{ fact.source === 'USER_CONFIRMED' ? '用户确认内容' : 'AI 分析结果' }}
                <template v-if="fact.confirmedAt"> · 确认于 {{ formatDateTime(fact.confirmedAt) }}</template>
              </small>
            </div>
            <div class="fact-actions">
              <el-button
                v-if="fact.confirmationStatus === 'ANALYZED'"
                text
                :icon="Pencil"
                @click="openFactEditor(fact)"
              >
                编辑确认
              </el-button>
              <el-button
                v-if="fact.confirmationStatus !== 'ARCHIVED'"
                text
                type="danger"
                :icon="Archive"
                @click="archiveProjectFact(fact)"
              >
                归档
              </el-button>
            </div>
          </article>
        </div>
      </section>
    </template>

    <el-dialog
      v-model="importDialogOpen"
      title="重新导入项目版本"
      width="min(520px, calc(100vw - 32px))"
      destroy-on-close
      @closed="resetImport"
    >
      <el-form label-position="top">
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
            <el-button :icon="Paperclip" @click="fileInput?.click()">选择新版本</el-button>
            <span v-if="selectedFile" class="truncate">{{ selectedFile.name }}</span>
            <span v-else class="muted">ZIP 或单个文本/代码文件</span>
          </div>
          <p class="import-note">
            重新导入不会覆盖旧版本或将来的用户确认内容。当前版本只做静态扫描，不执行代码。
          </p>
        </el-form-item>
        <el-form-item v-else label="仓库地址" required>
          <el-input
            v-model.trim="githubRepositoryUrl"
            placeholder="https://github.com/owner/repository"
            autocomplete="url"
          />
          <p class="import-note">
            仅支持 GitHub 公开仓库根地址。系统只读取受限归档并静态扫描，不执行代码或写入远程仓库。
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
        <el-button type="primary" :loading="importing" @click="submitImport">
          导入新版本
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="factEditorOpen"
      title="确认项目画像事实"
      width="min(620px, calc(100vw - 32px))"
      destroy-on-close
      @closed="resetFactEditor"
    >
      <el-form label-position="top">
        <el-form-item label="事实类型" required>
          <el-select v-model="factForm.factType">
            <el-option
              v-for="option in factTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model.trim="factForm.title" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input
            v-model.trim="factForm.content"
            type="textarea"
            :rows="5"
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="factEditorOpen = false">取消</el-button>
        <el-button type="primary" :icon="Check" :loading="savingFact" @click="confirmProjectFact">
          确认事实
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Archive, Check, FileCode2, Pencil, Paperclip, RefreshCw, Sparkles } from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { listAiConnections } from '@/api/aiConnections'
import {
  archiveFact,
  buildKnowledge,
  confirmFact,
  FACT_TYPE_LABELS,
  generateFacts,
  listFacts,
  type FactType,
  type ProjectFact,
} from '@/api/knowledge'
import {
  getProject,
  importGitHubProjectVersion,
  importProjectVersion,
} from '@/api/projects'
import { problemMessage } from '@/api/http'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { AiConnection, ProjectDetail, ProjectVersion } from '@/types/api'
import { formatDateTime, formatFileSize } from '@/utils/format'

const route = useRoute()
const projectId = Number(route.params.id)
const loading = ref(true)
const error = ref('')
const project = ref<ProjectDetail>()
const selectedVersionId = ref<number>()
const importDialogOpen = ref(false)
const importing = ref(false)
const importProgress = ref(0)
const sourceMode = ref<'upload' | 'github'>('upload')
const selectedFile = ref<File>()
const fileInput = ref<HTMLInputElement>()
const githubRepositoryUrl = ref('')
const facts = ref<ProjectFact[]>([])
const factsLoading = ref(false)
const factsError = ref('')
const generatingFacts = ref(false)
const showArchivedFacts = ref(false)
const connections = ref<AiConnection[]>([])
const connectionsLoading = ref(false)
const generationConnectionId = ref<number>()
const factEditorOpen = ref(false)
const editingFact = ref<ProjectFact>()
const savingFact = ref(false)
const factForm = ref({
  factType: 'BUSINESS' as FactType,
  title: '',
  content: '',
})

const latestVersion = computed(() => project.value?.versions[0])
const selectedVersion = computed(
  () => project.value?.versions.find((version) => version.id === selectedVersionId.value),
)
const visibleFacts = computed(() =>
  showArchivedFacts.value
    ? facts.value
    : facts.value.filter((fact) => fact.confirmationStatus !== 'ARCHIVED'),
)
const analyzedFactCount = computed(
  () => facts.value.filter((fact) => fact.confirmationStatus === 'ANALYZED').length,
)
const confirmedFactCount = computed(
  () => facts.value.filter((fact) => fact.confirmationStatus === 'CONFIRMED').length,
)
const factTypeOptions = Object.entries(FACT_TYPE_LABELS).map(([value, label]) => ({
  value: value as FactType,
  label,
}))

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    project.value = await getProject(projectId)
    selectedVersionId.value = project.value.versions[0]?.id
  } catch (loadError) {
    error.value = problemMessage(loadError)
  } finally {
    loading.value = false
  }
}

async function loadFacts(): Promise<void> {
  if (!selectedVersion.value) {
    facts.value = []
    return
  }
  factsLoading.value = true
  factsError.value = ''
  try {
    facts.value = await listFacts(projectId, selectedVersion.value.id)
  } catch (loadError) {
    factsError.value = problemMessage(loadError)
  } finally {
    factsLoading.value = false
  }
}

async function loadConnections(): Promise<void> {
  connectionsLoading.value = true
  try {
    const result = await listAiConnections(1, 50, true)
    connections.value = result.items
  } catch {
    connections.value = []
  } finally {
    connectionsLoading.value = false
  }
}

function selectFile(event: Event): void {
  selectedFile.value = (event.target as HTMLInputElement).files?.[0]
}

function resetImport(): void {
  selectedFile.value = undefined
  sourceMode.value = 'upload'
  githubRepositoryUrl.value = ''
  importProgress.value = 0
  if (fileInput.value) fileInput.value.value = ''
}

async function submitImport(): Promise<void> {
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
    project.value =
      sourceMode.value === 'upload'
        ? await importProjectVersion(projectId, selectedFile.value!, {
            onUploadProgress: (event) => {
              if (event.total) {
                importProgress.value = Math.round((event.loaded / event.total) * 100)
              }
            },
          })
        : await importGitHubProjectVersion(projectId, githubRepositoryUrl.value)
    selectedVersionId.value = project.value.versions[0]?.id
    importDialogOpen.value = false
    ElMessage.success('新项目版本已导入')
  } catch (importError) {
    ElMessage.error(problemMessage(importError))
  } finally {
    importing.value = false
  }
}

function sourceTypeLabel(sourceType: ProjectVersion['sourceType']): string {
  if (sourceType === 'ZIP') return 'ZIP 压缩包'
  if (sourceType === 'GITHUB') return 'GitHub 公开仓库'
  return '单个文件'
}

const rebuildingKnowledge = ref(false)

function knowledgeStatusLabel(version: ProjectVersion): string {
  switch (version.knowledgeBuildStatus) {
    case 'BUILDING':
      return '构建中'
    case 'READY':
      return `就绪 · ${version.knowledgeChunkCount} 块`
    case 'FAILED':
      return '构建失败'
    default:
      return '待构建'
  }
}

function knowledgeTagType(
  version: ProjectVersion,
): 'success' | 'warning' | 'danger' | 'info' {
  switch (version.knowledgeBuildStatus) {
    case 'READY':
      return 'success'
    case 'BUILDING':
      return 'warning'
    case 'FAILED':
      return 'danger'
    default:
      return 'info'
  }
}

function knowledgeRetryLabel(version: ProjectVersion): string {
  if (version.knowledgeBuildStatus === 'FAILED' || version.knowledgeBuildStatus === 'PENDING') {
    return '重试构建'
  }
  return '重建'
}

async function refreshProject(): Promise<void> {
  try {
    const detail = await getProject(projectId)
    project.value = detail
    if (!detail.versions.some((version) => version.id === selectedVersionId.value)) {
      selectedVersionId.value = detail.versions[0]?.id
    }
  } catch (refreshError) {
    error.value = problemMessage(refreshError)
  }
}

async function rebuildKnowledge(): Promise<void> {
  const version = selectedVersion.value
  if (!version) return
  rebuildingKnowledge.value = true
  try {
    const result = await buildKnowledge(projectId, version.id)
    await refreshProject()
    ElMessage.success(`知识块已构建：${result.chunkCount} 块`)
  } catch (buildError) {
    await refreshProject()
    ElMessage.error(problemMessage(buildError))
  } finally {
    rebuildingKnowledge.value = false
  }
}

let buildPollTimer: number | undefined

function syncBuildPolling(): void {
  const building = project.value?.versions.some(
    (version) => version.knowledgeBuildStatus === 'BUILDING',
  )
  if (building && buildPollTimer === undefined) {
    buildPollTimer = window.setInterval(() => {
      void refreshProject()
    }, 4000)
  } else if (!building && buildPollTimer !== undefined) {
    window.clearInterval(buildPollTimer)
    buildPollTimer = undefined
  }
}

watch(project, syncBuildPolling)

function factStatusLabel(status: ProjectFact['confirmationStatus']): string {
  if (status === 'CONFIRMED') return '已确认'
  if (status === 'ARCHIVED') return '已归档'
  return '待确认'
}

function factTagType(
  status: ProjectFact['confirmationStatus'],
): 'success' | 'warning' | 'info' {
  if (status === 'CONFIRMED') return 'success'
  if (status === 'ARCHIVED') return 'info'
  return 'warning'
}

async function generateProjectFacts(): Promise<void> {
  const version = selectedVersion.value
  if (!version) return
  try {
    await ElMessageBox.confirm(
      '重新生成只会替换当前版本的待确认分析，不会修改已确认事实。',
      '生成项目画像',
      { confirmButtonText: '开始生成', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  generatingFacts.value = true
  try {
    facts.value = await generateFacts(projectId, version.id, generationConnectionId.value)
    ElMessage.success('项目画像分析已生成，请逐条确认')
  } catch (generateError) {
    ElMessage.error(problemMessage(generateError))
  } finally {
    generatingFacts.value = false
  }
}

function openFactEditor(fact: ProjectFact): void {
  editingFact.value = fact
  factForm.value = {
    factType: fact.factType,
    title: fact.title,
    content: fact.content,
  }
  factEditorOpen.value = true
}

function resetFactEditor(): void {
  editingFact.value = undefined
  factForm.value = {
    factType: 'BUSINESS',
    title: '',
    content: '',
  }
}

async function confirmProjectFact(): Promise<void> {
  const version = selectedVersion.value
  const fact = editingFact.value
  if (!version || !fact) return
  if (!factForm.value.title || !factForm.value.content) {
    ElMessage.warning('请填写事实标题和内容')
    return
  }
  savingFact.value = true
  try {
    const updated = await confirmFact(projectId, version.id, fact.id, factForm.value)
    facts.value = facts.value.map((item) => (item.id === updated.id ? updated : item))
    factEditorOpen.value = false
    ElMessage.success('项目画像事实已确认')
  } catch (confirmError) {
    ElMessage.error(problemMessage(confirmError))
  } finally {
    savingFact.value = false
  }
}

async function archiveProjectFact(fact: ProjectFact): Promise<void> {
  const version = selectedVersion.value
  if (!version) return
  try {
    await ElMessageBox.confirm(
      '归档后会保留在当前版本的追溯记录中，但不再作为可用画像事实。',
      '归档项目画像事实',
      { confirmButtonText: '归档', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  try {
    const updated = await archiveFact(projectId, version.id, fact.id)
    facts.value = facts.value.map((item) => (item.id === updated.id ? updated : item))
    ElMessage.success('项目画像事实已归档')
  } catch (archiveError) {
    ElMessage.error(problemMessage(archiveError))
  }
}

watch(
  () => route.params.id,
  () => {
    void load()
  },
)

watch(selectedVersionId, () => {
  void loadFacts()
})

onMounted(() => {
  void load()
  void loadConnections()
})

onUnmounted(() => {
  if (buildPollTimer !== undefined) {
    window.clearInterval(buildPollTimer)
    buildPollTimer = undefined
  }
})
</script>

<style scoped>
.overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 16px;
  padding: 8px;
}

.overview-item {
  display: grid;
  min-height: 82px;
  align-content: center;
  gap: 5px;
  padding: 12px;
  border-right: 1px solid var(--ow-line-soft);
}

.overview-item:last-child {
  border-right: 0;
}

.overview-item span,
.version-meta {
  color: var(--ow-muted);
  font-size: 12px;
}

.overview-item strong {
  color: var(--ow-ink-secondary);
  font-size: 20px;
}

.overview-item strong.danger {
  color: var(--ow-danger);
}

.project-content {
  overflow: hidden;
}

.facts-section {
  margin-top: 16px;
}

.facts-header {
  align-items: flex-start;
}

.facts-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.connection-select {
  width: min(280px, 100%);
}

.facts-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 18px 14px;
  border-bottom: 1px solid var(--ow-line-soft);
}

.facts-note {
  color: var(--ow-muted);
  font-size: 12px;
  line-height: 1.6;
}

.facts-error {
  margin: 16px;
}

.facts-loading {
  padding: 20px 18px;
}

.fact-list {
  display: grid;
}

.fact-row {
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr) auto;
  gap: 16px;
  align-items: start;
  padding: 16px 18px;
  border-bottom: 1px solid var(--ow-line-soft);
}

.fact-row:last-child {
  border-bottom: 0;
}

.fact-status {
  display: grid;
  justify-items: start;
  gap: 8px;
  color: var(--ow-muted);
  font-size: 12px;
  line-height: 1.5;
}

.fact-body {
  min-width: 0;
}

.fact-title-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.fact-title-line strong {
  color: var(--ow-ink-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.confidence {
  color: var(--ow-muted);
  font-size: 12px;
}

.fact-body p {
  margin: 7px 0 6px;
  color: var(--ow-ink);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.fact-body small {
  color: var(--ow-muted);
  font-size: 12px;
  line-height: 1.6;
}

.fact-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 2px;
}

.version-select {
  width: min(320px, 100%);
}

.version-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  padding: 14px 18px;
  border-top: 1px solid var(--ow-line-soft);
}

.version-meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.version-meta strong {
  color: var(--ow-ink-secondary);
}

.knowledge-error {
  margin: 0;
  padding: 10px 18px;
  border-top: 1px solid var(--ow-line-soft);
  color: var(--ow-danger);
  font-size: 12px;
  line-height: 1.6;
  word-break: break-all;
}

.path-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.path-cell svg {
  width: 16px;
  height: 16px;
  flex: none;
  color: var(--ow-primary);
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
  color: var(--ow-muted);
  font-size: 12px;
  line-height: 1.65;
}

.el-dialog :deep(.el-radio-group) {
  display: flex;
}

@media (max-width: 780px) {
  .overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-item:nth-child(2) {
    border-right: 0;
  }

  .overview-item:nth-child(-n + 2) {
    border-bottom: 1px solid var(--ow-line-soft);
  }

  .facts-header,
  .facts-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .facts-actions {
    justify-content: flex-start;
  }

  .connection-select {
    width: min(360px, 100%);
  }

  .fact-row {
    grid-template-columns: 96px minmax(0, 1fr);
  }

  .fact-actions {
    grid-column: 2;
    justify-content: flex-start;
    margin-left: -8px;
  }
}

@media (max-width: 600px) {
  .overview {
    grid-template-columns: 1fr;
  }

  .overview-item,
  .overview-item:nth-child(2) {
    border-right: 0;
    border-bottom: 1px solid var(--ow-line-soft);
  }

  .overview-item:last-child {
    border-bottom: 0;
  }

  .version-select {
    width: 100%;
  }

  .facts-actions,
  .connection-select {
    width: 100%;
  }

  .facts-actions :deep(.el-button) {
    flex: 1;
  }

  .facts-toolbar {
    gap: 10px;
  }

  .fact-row {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 14px;
  }

  .fact-status {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .fact-actions {
    grid-column: auto;
    margin-left: -8px;
  }
}
</style>
