<template>
  <div class="page">
    <PageHeader title="Skill 目录" description="管理工作空间内可复用的 Prompt、Tool 绑定和运行限制。">
      <template #actions>
        <el-select v-model="workspaceId" placeholder="选择工作空间" @change="load">
          <el-option
            v-for="workspace in workspaces"
            :key="workspace.id"
            :label="workspace.name"
            :value="workspace.id"
          />
        </el-select>
        <el-button :icon="RefreshCw" :loading="loading" @click="load">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新建 Skill</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="load" />
    <div v-else class="catalog-layout">
      <section class="surface skill-list">
        <div v-if="loading" class="page-feedback"><el-skeleton :rows="6" animated /></div>
        <EmptyState
          v-else-if="skills.length === 0"
          title="没有 Skill"
          description="创建一个 Skill，绑定 PromptVersion 和已发布 ToolVersion。"
          :icon="Sparkles"
        />
        <button
          v-for="skill in skills"
          :key="skill.id"
          class="skill-row"
          :class="{ active: selected?.id === skill.id }"
          type="button"
          @click="select(skill)"
        >
          <Sparkles aria-hidden="true" />
          <span class="skill-main">
            <strong>{{ skill.name }}</strong>
            <small>{{ skill.skillCode }} · {{ versionLabel(skill) }}</small>
          </span>
          <StatusTag :value="skill.status" />
        </button>
      </section>

      <section class="surface detail-panel">
        <EmptyState
          v-if="!selected"
          title="选择一个 Skill"
          description="查看版本、Tool 绑定和发布状态。"
          :icon="Sparkles"
        />
        <template v-else>
          <div class="surface-header">
            <div>
              <h2 class="surface-title">{{ selected.name }}</h2>
              <span class="surface-subtitle">{{ selected.description || '无描述' }}</span>
            </div>
            <div class="inline-actions">
              <StatusTag :value="selected.status" />
              <el-button :icon="Edit3" @click="openEdit">编辑</el-button>
              <el-button
                v-if="selected.status !== 'DISABLED' && draft"
                type="primary"
                :icon="Upload"
                :loading="actionLoading"
                @click="publish"
              >发布草稿</el-button>
              <el-button
                v-if="selected.status !== 'DISABLED'"
                type="danger"
                plain
                :icon="Ban"
                :loading="actionLoading"
                @click="disable"
              >停用</el-button>
            </div>
          </div>
          <dl class="detail-grid">
            <div><dt>Skill code</dt><dd class="mono">{{ selected.skillCode }}</dd></div>
            <div><dt>当前发布版本</dt><dd>{{ publishedLabel }}</dd></div>
            <div><dt>版本数</dt><dd>{{ selected.versions.length }}</dd></div>
            <div><dt>更新时间</dt><dd>{{ formatDateTime(selected.updatedAt) }}</dd></div>
          </dl>
          <el-table :data="selected.versions" row-key="id">
            <el-table-column label="版本" width="90">
              <template #default="{ row }">v{{ row.versionNumber }}</template>
            </el-table-column>
            <el-table-column label="状态" width="120">
              <template #default="{ row }"><StatusTag :value="row.status" /></template>
            </el-table-column>
            <el-table-column label="Prompt" width="120">
              <template #default="{ row }">#{{ row.promptVersionId }}<span v-if="row.promptVersionNumber"> / v{{ row.promptVersionNumber }}</span></template>
            </el-table-column>
            <el-table-column label="输出类型" prop="outputType" min-width="140" />
            <el-table-column label="ToolVersion" min-width="180">
              <template #default="{ row }">{{ row.toolVersionIds.length ? row.toolVersionIds.join(', ') : '无' }}</template>
            </el-table-column>
          </el-table>
          <div v-if="draft" class="draft-preview">
            <div class="surface-header">
              <div>
                <h3 class="surface-title">当前草稿</h3>
                <span class="surface-subtitle">发布前可继续编辑，发布版本不可变</span>
              </div>
              <el-button text :icon="Edit3" @click="openEdit">编辑草稿</el-button>
            </div>
            <div class="json-grid">
              <div><h4>Input Schema</h4><pre>{{ prettyJson(draft.inputSchema) }}</pre></div>
              <div><h4>运行限制</h4><pre>{{ prettyJson(draft.runtimeLimits) }}</pre></div>
            </div>
          </div>
        </template>
      </section>
    </div>

    <el-drawer v-model="editorOpen" :title="editingId ? '编辑 Skill 草稿' : '新建 Skill'" size="min(720px, 96vw)" destroy-on-close>
      <el-alert v-if="editorError" :title="editorError" type="error" show-icon :closable="false" />
      <el-form :model="form" label-position="top" @submit.prevent>
        <el-form-item label="工作空间">
          <el-select v-model="form.workspaceId" :disabled="Boolean(editingId)">
            <el-option v-for="workspace in workspaces" :key="workspace.id" :label="workspace.name" :value="workspace.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Skill code"><el-input v-model.trim="form.skillCode" maxlength="128" /></el-form-item>
        <el-form-item label="名称"><el-input v-model.trim="form.name" maxlength="128" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" maxlength="512" /></el-form-item>
        <div class="form-grid">
          <el-form-item label="PromptVersion ID"><el-input-number v-model="form.promptVersionId" :min="1" /></el-form-item>
          <el-form-item label="输出类型"><el-input v-model="form.outputType" maxlength="64" /></el-form-item>
        </div>
        <el-form-item label="ToolVersion IDs（逗号分隔）">
          <el-input v-model="form.toolVersionIdsText" placeholder="例如：1, 2" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="Input Schema JSON"><el-input v-model="form.inputSchemaText" type="textarea" :rows="7" /></el-form-item>
          <el-form-item label="运行限制 JSON"><el-input v-model="form.runtimeLimitsText" type="textarea" :rows="7" /></el-form-item>
        </div>
        <div class="drawer-actions">
          <el-button @click="editorOpen = false">取消</el-button>
          <el-button type="primary" :loading="actionLoading" @click="save">保存</el-button>
        </div>
      </el-form>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { Ban, Edit3, Plus, RefreshCw, Sparkles, Upload } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import {
  createSkill,
  disableSkill,
  draftVersion,
  getSkill,
  listSkills,
  publishSkill,
  updateSkill,
  type SkillPayload,
} from '@/api/skills'
import { problemMessage } from '@/api/http'
import { listWorkspaces } from '@/api/workspaces'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { Skill, SkillVersion, Workspace } from '@/types/api'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const error = ref('')
const editorError = ref('')
const actionLoading = ref(false)
const editorOpen = ref(false)
const editingId = ref<number>()
const workspaceId = ref<number>()
const workspaces = ref<Workspace[]>([])
const skills = ref<Skill[]>([])
const selected = ref<Skill>()

const form = reactive({
  workspaceId: undefined as number | undefined,
  skillCode: '',
  name: '',
  description: '',
  promptVersionId: 1,
  outputType: 'TEXT',
  toolVersionIdsText: '',
  inputSchemaText: '{}',
  runtimeLimitsText: '{}',
})

const draft = computed<SkillVersion | undefined>(() =>
  selected.value ? draftVersion(selected.value) : undefined)
const publishedLabel = computed(() => {
  const version = selected.value?.versions.find((item) => item.id === selected.value?.publishedVersionId)
  return version ? `v${version.versionNumber}` : '未发布'
})

function versionLabel(skill: Skill): string {
  const version = skill.versions.find((item) => item.id === skill.publishedVersionId)
  return version ? `已发布 v${version.versionNumber}` : '未发布'
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value || {}, null, 2)
}

function parseJson(value: string, label: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    return parsed as Record<string, unknown>
  } catch {
    throw new Error(`${label} 必须是 JSON 对象`)
  }
}

function select(skill: Skill): void {
  selected.value = skill
  void router.replace({ path: `/skills/${skill.id}`, query: route.query })
}

function replaceSkill(updated: Skill): void {
  const index = skills.value.findIndex((skill) => skill.id === updated.id)
  if (index >= 0) skills.value[index] = updated
  selected.value = updated
}

function openCreate(): void {
  editingId.value = undefined
  editorError.value = ''
  Object.assign(form, {
    workspaceId: workspaceId.value,
    skillCode: '',
    name: '',
    description: '',
    promptVersionId: 1,
    outputType: 'TEXT',
    toolVersionIdsText: '',
    inputSchemaText: '{}',
    runtimeLimitsText: '{}',
  })
  editorOpen.value = true
}

function openEdit(): void {
  if (!selected.value) return
  const version = draft.value || selected.value.versions[0]
  if (!version) return
  editingId.value = selected.value.id
  editorError.value = ''
  Object.assign(form, {
    workspaceId: selected.value.workspaceId,
    skillCode: selected.value.skillCode,
    name: selected.value.name,
    description: selected.value.description || '',
    promptVersionId: version.promptVersionId,
    outputType: version.outputType,
    toolVersionIdsText: version.toolVersionIds.join(', '),
    inputSchemaText: prettyJson(version.inputSchema),
    runtimeLimitsText: prettyJson(version.runtimeLimits),
  })
  editorOpen.value = true
}

function payload(): SkillPayload {
  const ids = form.toolVersionIdsText.split(',').map((value) => Number(value.trim())).filter((value) => Number.isInteger(value) && value > 0)
  return {
    workspaceId: form.workspaceId || workspaceId.value || 0,
    skillCode: form.skillCode,
    name: form.name,
    description: form.description || null,
    expectedVersion: selected.value?.lockVersion,
    version: {
      promptVersionId: form.promptVersionId,
      outputType: form.outputType,
      toolVersionIds: ids,
      inputSchema: parseJson(form.inputSchemaText, 'Input Schema'),
      runtimeLimits: parseJson(form.runtimeLimitsText, '运行限制'),
    },
  }
}

async function save(): Promise<void> {
  actionLoading.value = true
  editorError.value = ''
  try {
    const next = editingId.value
      ? await updateSkill(editingId.value, payload())
      : await createSkill(payload())
    replaceSkill(next)
    if (!editingId.value) workspaceId.value = next.workspaceId
    editorOpen.value = false
    await load()
    ElMessage.success('Skill 草稿已保存')
  } catch (saveError) {
    editorError.value = saveError instanceof Error && saveError.message.includes('必须是')
      ? saveError.message
      : problemMessage(saveError)
  } finally {
    actionLoading.value = false
  }
}

async function publish(): Promise<void> {
  if (!selected.value || !draft.value) return
  try {
    await ElMessageBox.confirm(
      '发布后该 SkillVersion 不可修改，运行将固定绑定已发布版本。',
      '确认发布 SkillVersion',
      { type: 'warning', confirmButtonText: '发布', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  actionLoading.value = true
  try {
    const updated = await publishSkill(selected.value.id, draft.value.id)
    replaceSkill(updated)
    await load()
    ElMessage.success('Skill 已发布')
  } catch (publishError) {
    ElMessage.error(problemMessage(publishError))
  } finally {
    actionLoading.value = false
  }
}

async function disable(): Promise<void> {
  if (!selected.value) return
  try {
    await ElMessageBox.confirm(
      '停用后将拒绝新的 Skill 引用，但不会删除历史版本和运行记录。',
      '确认停用 Skill',
      { type: 'warning', confirmButtonText: '停用', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  actionLoading.value = true
  try {
    const updated = await disableSkill(selected.value.id)
    replaceSkill(updated)
    await load()
    ElMessage.success('Skill 已停用')
  } catch (disableError) {
    ElMessage.error(problemMessage(disableError))
  } finally {
    actionLoading.value = false
  }
}

async function load(): Promise<void> {
  if (!workspaceId.value) return
  loading.value = true
  error.value = ''
  try {
    skills.value = await listSkills(workspaceId.value)
    const routeId = Number(route.params.id)
    const routeSkill = Number.isInteger(routeId) && routeId > 0
      ? await getSkill(routeId).catch(() => undefined)
      : undefined
    selected.value = routeSkill || skills.value.find((skill) => skill.id === selected.value?.id) || skills.value[0]
  } catch (loadError) {
    error.value = problemMessage(loadError)
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, () => {
  const id = Number(route.params.id)
  const skill = skills.value.find((item) => item.id === id)
  if (skill) selected.value = skill
})

onMounted(async () => {
  try {
    workspaces.value = await listWorkspaces()
    workspaceId.value = workspaces.value.find((workspace) => workspace.isDefault)?.id || workspaces.value[0]?.id
    await load()
  } catch (loadError) {
    error.value = problemMessage(loadError)
  }
})
</script>

<style scoped>
.catalog-layout { display: grid; grid-template-columns: minmax(260px, 0.34fr) minmax(0, 1fr); gap: 16px; }
.skill-list { padding: 8px; align-self: start; }
.skill-row { display: flex; width: 100%; align-items: center; gap: 10px; padding: 14px 12px; color: inherit; text-align: left; background: transparent; border: 0; border-bottom: 1px solid var(--ow-line-soft); cursor: pointer; }
.skill-row.active { background: var(--ow-surface-subtle); }
.skill-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 4px; }
.skill-main small { color: var(--ow-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.detail-panel { min-width: 0; padding: 18px; }
.detail-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin: 22px 0; }
.detail-grid dt { color: var(--ow-text-muted); font-size: 12px; }
.detail-grid dd { margin: 4px 0 0; }
.draft-preview { margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--ow-line-soft); }
.json-grid, .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.json-grid h4 { margin: 10px 0 6px; }
pre { max-height: 220px; overflow: auto; padding: 10px; background: var(--ow-surface-subtle); border: 1px solid var(--ow-line-soft); white-space: pre-wrap; }
.drawer-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
@media (max-width: 900px) { .catalog-layout { grid-template-columns: 1fr; } .detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { .json-grid, .form-grid, .detail-grid { grid-template-columns: 1fr; } }
</style>
