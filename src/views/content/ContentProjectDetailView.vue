<template>
  <div class="page">
    <PageHeader title="内容项目" description="管理资料、生成操作和版本化内容。" back>
      <template #actions>
        <el-button :icon="RefreshCw" :loading="loading" @click="load">刷新</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="load" />
    <template v-else-if="project">
      <section class="detail-layout">
        <div class="stack">
          <section class="surface">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">{{ project.title }}</h2>
                <span class="surface-subtitle">{{ project.topic }}</span>
              </div>
              <StatusTag :value="project.status" />
            </div>
            <div class="surface-body">
              <el-form :model="editForm" label-position="top">
                <el-form-item label="项目标题"><el-input v-model.trim="editForm.title" maxlength="120" /></el-form-item>
                <el-form-item label="主题"><el-input v-model="editForm.topic" type="textarea" :rows="4" maxlength="2000" /></el-form-item>
                <div class="form-grid">
                  <el-form-item label="目标受众"><el-input v-model="editForm.audience" maxlength="512" /></el-form-item>
                  <el-form-item label="写作风格"><el-input v-model="editForm.style" maxlength="512" /></el-form-item>
                </div>
                <div class="form-actions">
                  <el-button type="primary" :loading="saving" @click="save">保存项目</el-button>
                </div>
              </el-form>
            </div>
          </section>

          <section class="surface">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">内容操作</h2>
                <span class="surface-subtitle">改写、扩展、压缩和审阅需要选择已完成版本。</span>
              </div>
            </div>
            <div class="surface-body">
              <div class="operation-grid">
                <el-select v-model="operation" placeholder="选择操作">
                  <el-option label="生成提纲" value="OUTLINE" />
                  <el-option label="生成草稿" value="DRAFT" />
                  <el-option label="改写" value="REWRITE" />
                  <el-option label="扩展" value="EXPAND" />
                  <el-option label="压缩" value="COMPRESS" />
                  <el-option label="审阅" value="REVIEW" />
                </el-select>
                <el-select
                  v-if="requiresSource"
                  v-model="sourceVersionId"
                  placeholder="选择已完成版本"
                  filterable
                >
                  <el-option
                    v-for="version in succeededVersions"
                    :key="version.id"
                    :label="`v${version.versionNumber} · ${enumLabel(version.operation)}`"
                    :value="version.id"
                  />
                </el-select>
              </div>
              <el-input
                v-model="instruction"
                type="textarea"
                :rows="4"
                maxlength="2000"
                placeholder="补充写作要求、审阅重点或目标读者变化"
              />
              <div class="form-actions">
                <el-button
                  type="primary"
                  :loading="operating"
                  :disabled="requiresSource && !sourceVersionId"
                  @click="runOperation"
                >
                  <Play aria-hidden="true" />提交操作
                </el-button>
              </div>
            </div>
          </section>

          <section class="surface">
            <div class="surface-header"><h2 class="surface-title">资料关联</h2></div>
            <div class="surface-body">
              <div class="operation-grid">
                <el-select v-model="materialType" placeholder="资料类型">
                  <el-option label="资料文档" value="DOCUMENT" />
                  <el-option label="已有成果" value="ARTIFACT" />
                </el-select>
                <el-select v-model="materialId" filterable placeholder="选择资料">
                  <el-option
                    v-for="option in materialOptions"
                    :key="`${materialType}-${option.id}`"
                    :label="`${option.title} #${option.id}`"
                    :value="option.id"
                  />
                </el-select>
              </div>
              <div class="form-actions">
                <el-button type="primary" :loading="materialLoading" @click="addMaterialAction">
                  <Link2 aria-hidden="true" />关联资料
                </el-button>
              </div>
              <el-table v-if="project.materials.length" :data="project.materials" row-key="id">
                <el-table-column label="资料" min-width="260">
                  <template #default="{ row }">{{ row.sourceTitle || `${row.sourceType} #${row.sourceId}` }}</template>
                </el-table-column>
                <el-table-column label="关系" width="120"><template #default="{ row }">{{ row.relationType }}</template></el-table-column>
                <el-table-column label="操作" width="90" fixed="right">
                  <template #default="{ row }">
                    <el-button text type="danger" :icon="Unlink" aria-label="解除资料关联" @click="removeMaterialAction(row)" />
                  </template>
                </el-table-column>
              </el-table>
              <EmptyState
                v-else
                title="尚未关联资料"
                description="可以关联资料文档或已有成果作为生成上下文。"
                :icon="Link2"
              />
            </div>
          </section>
        </div>

        <aside class="stack">
          <section class="surface">
            <div class="surface-header"><h2 class="surface-title">版本历史</h2></div>
            <div class="surface-body version-list">
              <button
                v-for="version in project.versions"
                :key="version.id"
                class="version-item"
                :class="{ selected: selectedVersionId === version.id }"
                type="button"
                @click="selectVersion(version)"
              >
                <span>
                  <strong>v{{ version.versionNumber }} · {{ enumLabel(version.operation) }}</strong>
                  <small>{{ formatDateTime(version.updatedAt) }}</small>
                </span>
                <StatusTag :value="version.status" />
              </button>
              <EmptyState
                v-if="project.versions.length === 0"
                title="还没有版本"
                description="提交一次内容操作后，版本会出现在这里。"
                :icon="FileText"
              />
            </div>
          </section>
          <section class="surface">
            <div class="surface-header"><h2 class="surface-title">版本内容</h2></div>
            <div class="surface-body">
              <EmptyState
                v-if="!selectedVersion"
                title="选择一个版本"
                description="已完成版本的正文会在这里展示。"
                :icon="FileText"
              />
              <template v-else>
                <div class="selected-version-meta">
                  <StatusTag :value="selectedVersion.status" />
                  <span>v{{ selectedVersion.versionNumber }} · {{ enumLabel(selectedVersion.operation) }}</span>
                </div>
                <el-alert
                  v-if="selectedVersion.errorSummary"
                  :title="selectedVersion.errorSummary"
                  type="error"
                  show-icon
                  :closable="false"
                />
                <MarkdownViewer
                  v-if="selectedVersion.content"
                  class="version-content"
                  :content="selectedVersion.content"
                />
                <span v-else class="empty-copy">当前版本尚未产生可展示正文。</span>
              </template>
            </div>
          </section>
        </aside>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  FileText,
  Link2,
  Play,
  RefreshCw,
  Unlink,
} from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  addContentMaterial,
  generateContentVersion,
  getContentProject,
  getContentVersion,
  removeContentMaterial,
  reviewContentVersion,
  updateContentProject,
} from '@/api/content'
import { listAiConnections } from '@/api/aiConnections'
import { listArtifacts } from '@/api/artifacts'
import { problemMessage } from '@/api/http'
import { listDocuments } from '@/api/documents'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import MarkdownViewer from '@/components/MarkdownViewer.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type {
  AiConnection,
  ArtifactSummary,
  ContentProject,
  ContentVersion,
  DocumentSummary,
} from '@/types/api'
import { enumLabel, formatDateTime } from '@/utils/format'

const route = useRoute()
const projectId = computed(() => Number(route.params.id))
const loading = ref(true)
const saving = ref(false)
const operating = ref(false)
const materialLoading = ref(false)
const error = ref('')
const project = ref<ContentProject>()
const connections = ref<AiConnection[]>([])
const documents = ref<DocumentSummary[]>([])
const artifacts = ref<ArtifactSummary[]>([])
const selectedVersionId = ref<number>()
const selectedVersion = ref<ContentVersion>()
const operation = ref<ContentVersion['operation']>('OUTLINE')
const sourceVersionId = ref<number>()
const instruction = ref('')
const materialType = ref<'DOCUMENT' | 'ARTIFACT'>('DOCUMENT')
const materialId = ref<number>()

const editForm = reactive({
  title: '',
  topic: '',
  audience: '',
  style: '',
})

const requiresSource = computed(() =>
  ['REWRITE', 'EXPAND', 'COMPRESS', 'REVIEW'].includes(operation.value),
)
const succeededVersions = computed(() =>
  (project.value?.versions || []).filter((version) => version.status === 'SUCCEEDED'),
)
const materialOptions = computed(() =>
  materialType.value === 'DOCUMENT'
    ? documents.value.map((item) => ({
      id: item.id,
      title: item.originalName || item.fileName || `资料 #${item.id}`,
    }))
    : artifacts.value.map((item) => ({ id: item.id, title: item.title })),
)

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const result = await getContentProject(projectId.value)
    project.value = result
    Object.assign(editForm, {
      title: result.title,
      topic: result.topic,
      audience: result.audience || '',
      style: result.style || '',
    })
    if (!selectedVersionId.value && result.versions[0]) {
      await selectVersion(result.versions[0])
    } else if (selectedVersionId.value) {
      const refreshed = result.versions.find((item) => item.id === selectedVersionId.value)
      if (refreshed) await selectVersion(refreshed)
    }
  } catch (reason) {
    error.value = problemMessage(reason)
  } finally {
    loading.value = false
  }
}

async function loadOptions(): Promise<void> {
  const workspaceId = project.value?.workspaceId
  if (!workspaceId) return
  const [connectionResult, documentResult, artifactResult] = await Promise.all([
    listAiConnections(1, 100, true),
    listDocuments(1, 100, workspaceId),
    listArtifacts(1, 100, workspaceId),
  ])
  connections.value = connectionResult.items
  documents.value = documentResult.items
  artifacts.value = artifactResult.items
}

async function save(): Promise<void> {
  if (!project.value) return
  saving.value = true
  try {
    project.value = await updateContentProject(project.value.id, {
      workspaceId: project.value.workspaceId,
      connectionId: project.value.connectionId,
      title: editForm.title,
      topic: editForm.topic,
      audience: editForm.audience || null,
      style: editForm.style || null,
      outputFormat: 'MARKDOWN',
      expectedVersion: project.value.version,
    })
    ElMessage.success('项目已保存')
  } catch (reason) {
    ElMessage.error(problemMessage(reason))
  } finally {
    saving.value = false
  }
}

async function runOperation(): Promise<void> {
  if (!project.value) return
  operating.value = true
  try {
    const payload = {
      operation: operation.value,
      instruction: instruction.value || null,
      sourceVersionId: requiresSource.value ? sourceVersionId.value : null,
    }
    const version = operation.value === 'REVIEW'
      ? await reviewContentVersion(project.value.id, payload)
      : await generateContentVersion(project.value.id, payload)
    ElMessage.success(`已提交 v${version.versionNumber} 操作`)
    instruction.value = ''
    await load()
  } catch (reason) {
    ElMessage.error(problemMessage(reason))
  } finally {
    operating.value = false
  }
}

async function selectVersion(version: ContentVersion): Promise<void> {
  selectedVersionId.value = version.id
  selectedVersion.value = version.content
    ? version
    : await getContentVersion(projectId.value, version.id).catch(() => version)
}

async function addMaterialAction(): Promise<void> {
  if (!project.value || !materialId.value) return
  materialLoading.value = true
  try {
    project.value = await addContentMaterial(project.value.id, {
      sourceType: materialType.value,
      sourceId: materialId.value,
      relationType: 'REFERENCE',
    })
    materialId.value = undefined
    ElMessage.success('资料已关联')
  } catch (reason) {
    ElMessage.error(problemMessage(reason))
  } finally {
    materialLoading.value = false
  }
}

async function removeMaterialAction(material: { id: number }): Promise<void> {
  if (!project.value) return
  try {
    await ElMessageBox.confirm('解除关联不会删除原资料，是否继续？', '解除资料关联', {
      type: 'warning',
    })
    project.value = await removeContentMaterial(project.value.id, material.id)
  } catch (reason) {
    if (reason !== 'cancel') ElMessage.error(problemMessage(reason))
  }
}

watch(materialType, () => {
  materialId.value = undefined
})

onMounted(async () => {
  await load()
  await loadOptions().catch((reason) => {
    if (!error.value) error.value = problemMessage(reason)
  })
})
</script>

<style scoped>
.operation-grid {
  display: grid;
  grid-template-columns: minmax(150px, 0.8fr) minmax(200px, 1.2fr);
  gap: 10px;
  margin-bottom: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

.version-list {
  display: grid;
  gap: 6px;
}

.version-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 10px;
  color: var(--ow-ink-secondary);
  text-align: left;
  background: transparent;
  border: 1px solid var(--ow-line-soft);
  border-radius: var(--ow-radius-sm);
  cursor: pointer;
}

.version-item:hover,
.version-item.selected {
  background: var(--ow-primary-soft);
  border-color: var(--ow-primary);
}

.version-item > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.version-item small {
  color: var(--ow-muted);
}

.selected-version-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: var(--ow-muted);
  font-size: 12px;
}

.version-content {
  margin-top: 16px;
}

.empty-copy {
  display: block;
  margin-top: 16px;
  color: var(--ow-muted);
}

@media (max-width: 860px) {
  .operation-grid {
    grid-template-columns: 1fr;
  }
}
</style>
