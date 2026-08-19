<template>
  <div class="page">
    <PageHeader :title="artifact?.title || '成果详情'" :description="artifact?.taskTitle || ''" back>
      <template #actions>
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
            <MarkdownViewer :content="displayedContent" />
          </div>
        </section>

        <aside class="surface versions-panel">
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
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ChevronRight, Edit3, History } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import {
  getArtifact,
  getArtifactVersion,
  listArtifactVersions,
  updateArtifact,
} from '@/api/artifacts'
import { getProblem, problemMessage } from '@/api/http'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import MarkdownViewer from '@/components/MarkdownViewer.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { ArtifactDetail, ArtifactVersionSummary } from '@/types/api'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
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
const versionContentCache = new Map<number, string>()
let versionRequestSequence = 0

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
    selectedVersionNumber.value = artifactResult.currentVersion
    editBaseVersion.value = artifactResult.currentVersion
    saveConflict.value = ''
    if (currentVersion) {
      versionContentCache.set(currentVersion.id, artifactResult.content)
    }
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
