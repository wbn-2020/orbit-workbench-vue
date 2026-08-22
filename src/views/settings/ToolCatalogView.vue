<template>
  <div class="page">
    <PageHeader title="Tool 目录" description="查看受控工具的发布版本、Schema、风险和执行限制。">
      <template #actions>
        <el-select v-model="status" clearable placeholder="全部状态" @change="load">
          <el-option label="草稿" value="DRAFT" />
          <el-option label="已发布" value="PUBLISHED" />
          <el-option label="已停用" value="DISABLED" />
        </el-select>
        <el-button :icon="RefreshCw" :loading="loading" @click="load">刷新</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="load" />
    <section v-else class="surface page-section">
      <div v-if="loading" class="page-feedback"><el-skeleton :rows="7" animated /></div>
      <EmptyState
        v-else-if="tools.length === 0"
        title="没有匹配的 Tool"
        description="工具目录由受控 Handler 和已发布版本提供。"
        :icon="Wrench"
      />
      <div v-else class="table-wrap">
        <el-table :data="tools" row-key="id" @row-click="selectTool">
          <el-table-column label="Tool" min-width="280">
            <template #default="{ row }">
              <div class="primary-cell">
                <strong>{{ row.name }}</strong>
                <span class="mono">{{ row.toolCode }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="Handler" width="150">
            <template #default="{ row }">{{ row.handlerType }}</template>
          </el-table-column>
          <el-table-column label="当前版本" width="130">
            <template #default="{ row }">{{ publishedVersion(row) }}</template>
          </el-table-column>
          <el-table-column label="版本数" width="90">
            <template #default="{ row }">{{ row.versions.length }}</template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><StatusTag :value="row.status" /></template>
          </el-table-column>
          <el-table-column label="操作" width="190" fixed="right">
            <template #default="{ row }">
              <el-button text @click.stop="selectTool(row)">查看</el-button>
              <el-button
                v-if="row.status === 'DISABLED'"
                text
                type="success"
                :loading="actionId === row.id"
                @click.stop="toggle(row)"
              >启用</el-button>
              <el-button
                v-else
                text
                type="danger"
                :loading="actionId === row.id"
                @click.stop="toggle(row)"
              >停用</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-drawer v-model="detailOpen" title="Tool 详情" size="min(720px, 96vw)">
      <template v-if="selected">
        <div class="detail-heading">
          <div>
            <h2>{{ selected.name }}</h2>
            <p class="mono">{{ selected.toolCode }}</p>
          </div>
          <div class="inline-actions">
            <StatusTag :value="selected.status" />
            <el-button
              v-if="selected.status !== 'DISABLED'"
              :icon="Edit3"
              @click="openVersionEditor"
            >{{ selectedDraft ? '编辑草稿' : '新建版本' }}</el-button>
            <el-button
              v-if="selected.status !== 'DISABLED' && selectedDraft"
              type="primary"
              :icon="Upload"
              :loading="actionLoading"
              @click="publishVersion"
            >发布草稿</el-button>
          </div>
        </div>
        <p class="description">{{ selected.description || '无描述' }}</p>
        <dl class="detail-grid">
          <div><dt>Handler</dt><dd>{{ selected.handlerType }}</dd></div>
          <div><dt>发布版本</dt><dd>{{ publishedVersion(selected) }}</dd></div>
          <div><dt>目录 ID</dt><dd class="mono">{{ selected.id }}</dd></div>
          <div><dt>更新时间</dt><dd>{{ formatDateTime(selected.updatedAt) }}</dd></div>
        </dl>
        <h3 class="section-title">版本</h3>
        <el-table :data="selected.versions" size="small">
          <el-table-column label="版本" width="90">
            <template #default="{ row }">v{{ row.versionNumber }}</template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><StatusTag :value="row.status" /></template>
          </el-table-column>
          <el-table-column label="风险" width="90" prop="riskLevel" />
          <el-table-column label="确认" width="90">
            <template #default="{ row }">{{ row.requiresConfirmation ? '需要' : '不需要' }}</template>
          </el-table-column>
          <el-table-column label="限制" min-width="180">
            <template #default="{ row }">
              {{ row.timeoutMs }} ms / {{ row.maxResultBytes }} bytes
            </template>
          </el-table-column>
        </el-table>
        <div v-for="version in selected.versions" :key="version.id" class="version-block">
          <div class="version-title">
            <strong>v{{ version.versionNumber }}</strong>
            <span>{{ formatDateTime(version.publishedAt || version.createdAt) }}</span>
          </div>
          <div class="json-grid">
            <div><h4>Input Schema</h4><pre>{{ prettyJson(version.inputSchema) }}</pre></div>
            <div><h4>Output Schema</h4><pre>{{ prettyJson(version.outputSchema) }}</pre></div>
          </div>
        </div>
      </template>
    </el-drawer>

    <el-drawer
      v-model="editorOpen"
      title="Tool 版本草稿"
      size="min(760px, 96vw)"
      destroy-on-close
    >
      <el-alert v-if="editorError" :title="editorError" type="error" show-icon :closable="false" />
      <el-form :model="form" label-position="top" @submit.prevent>
        <div class="form-grid">
          <el-form-item label="风险级别">
            <el-select v-model="form.riskLevel">
              <el-option label="LOW" value="LOW" />
              <el-option label="MEDIUM" value="MEDIUM" />
              <el-option label="HIGH" value="HIGH" />
            </el-select>
          </el-form-item>
          <el-form-item label="需要确认"><el-switch v-model="form.requiresConfirmation" /></el-form-item>
          <el-form-item label="超时（毫秒）">
            <el-input-number v-model="form.timeoutMs" :min="1" :max="120000" />
          </el-form-item>
          <el-form-item label="最大结果字节数">
            <el-input-number v-model="form.maxResultBytes" :min="1" :max="1048576" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="Input Schema JSON">
            <el-input v-model="form.inputSchemaText" type="textarea" :rows="9" />
          </el-form-item>
          <el-form-item label="Output Schema JSON">
            <el-input v-model="form.outputSchemaText" type="textarea" :rows="9" />
          </el-form-item>
        </div>
        <el-form-item label="Capabilities JSON">
          <el-input v-model="form.capabilitiesText" type="textarea" :rows="6" />
        </el-form-item>
        <div class="drawer-actions">
          <el-button @click="editorOpen = false">取消</el-button>
          <el-button type="primary" :loading="actionLoading" @click="saveVersion">保存草稿</el-button>
        </div>
      </el-form>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { Edit3, RefreshCw, Upload, Wrench } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import {
  createToolVersion,
  disableTool,
  draftToolVersion,
  enableTool,
  listTools,
  publishTool,
  type ToolVersionPayload,
} from '@/api/tools'
import { problemMessage } from '@/api/http'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { ToolCatalog } from '@/types/api'
import { formatDateTime } from '@/utils/format'

const loading = ref(false)
const error = ref('')
const status = ref<string>()
const tools = ref<ToolCatalog[]>([])
const selected = ref<ToolCatalog>()
const detailOpen = ref(false)
const actionId = ref<number>()
const actionLoading = ref(false)
const editorOpen = ref(false)
const editorError = ref('')

const form = reactive({
  riskLevel: 'LOW',
  requiresConfirmation: false,
  timeoutMs: 30000,
  maxResultBytes: 262144,
  inputSchemaText: '{}',
  outputSchemaText: '{}',
  capabilitiesText: '{}',
})

const selectedDraft = computed(() => selected.value ? draftToolVersion(selected.value) : undefined)

function publishedVersion(tool: ToolCatalog): string {
  const version = tool.versions.find((item) => item.id === tool.publishedVersionId)
  return version ? `v${version.versionNumber}` : '未发布'
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

function selectTool(tool: ToolCatalog): void {
  selected.value = tool
  detailOpen.value = true
}

function replaceTool(updated: ToolCatalog): void {
  const index = tools.value.findIndex((tool) => tool.id === updated.id)
  if (index >= 0) tools.value[index] = updated
  selected.value = updated
}

function openVersionEditor(): void {
  if (!selected.value) return
  const source = selectedDraft.value
    || selected.value.versions.find((version) => version.id === selected.value?.publishedVersionId)
    || selected.value.versions[0]
  editorError.value = ''
  Object.assign(form, {
    riskLevel: source?.riskLevel || 'LOW',
    requiresConfirmation: source?.requiresConfirmation || false,
    timeoutMs: source?.timeoutMs || 30000,
    maxResultBytes: source?.maxResultBytes || 262144,
    inputSchemaText: prettyJson(source?.inputSchema || {}),
    outputSchemaText: prettyJson(source?.outputSchema || {}),
    capabilitiesText: prettyJson(source?.capabilities || {}),
  })
  editorOpen.value = true
}

function versionPayload(): ToolVersionPayload {
  return {
    riskLevel: form.riskLevel,
    requiresConfirmation: form.requiresConfirmation,
    timeoutMs: form.timeoutMs,
    maxResultBytes: form.maxResultBytes,
    inputSchema: parseJson(form.inputSchemaText, 'Input Schema'),
    outputSchema: parseJson(form.outputSchemaText, 'Output Schema'),
    capabilities: parseJson(form.capabilitiesText, 'Capabilities'),
    expectedVersion: selected.value?.lockVersion,
  }
}

async function saveVersion(): Promise<void> {
  if (!selected.value) return
  actionLoading.value = true
  editorError.value = ''
  try {
    const updated = await createToolVersion(selected.value.id, versionPayload())
    replaceTool(updated)
    editorOpen.value = false
    await load()
    ElMessage.success('Tool 草稿已保存')
  } catch (saveError) {
    editorError.value = saveError instanceof Error && saveError.message.includes('必须是')
      ? saveError.message
      : problemMessage(saveError)
  } finally {
    actionLoading.value = false
  }
}

async function publishVersion(): Promise<void> {
  if (!selected.value || !selectedDraft.value) return
  try {
    await ElMessageBox.confirm(
      '发布后该 ToolVersion 不可修改，运行将固定绑定已发布版本。',
      '确认发布 ToolVersion',
      { type: 'warning', confirmButtonText: '发布', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  actionLoading.value = true
  try {
    const updated = await publishTool(
      selected.value.id,
      selectedDraft.value.id,
      selected.value.lockVersion,
    )
    replaceTool(updated)
    await load()
    ElMessage.success('Tool 版本已发布')
  } catch (publishError) {
    ElMessage.error(problemMessage(publishError))
  } finally {
    actionLoading.value = false
  }
}

async function toggle(tool: ToolCatalog): Promise<void> {
  if (tool.status !== 'DISABLED') {
    try {
      await ElMessageBox.confirm(
        '停用后将拒绝新的 Tool 运行入口，但不会删除历史版本和运行记录。',
        '确认停用 Tool',
        { type: 'warning', confirmButtonText: '停用', cancelButtonText: '取消' },
      )
    } catch {
      return
    }
  }
  actionId.value = tool.id
  try {
    const updated = tool.status === 'DISABLED'
      ? await enableTool(tool.id)
      : await disableTool(tool.id)
    replaceTool(updated)
    await load()
    ElMessage.success(updated.status === 'PUBLISHED' ? 'Tool 已启用' : 'Tool 已停用')
  } catch (toggleError) {
    ElMessage.error(problemMessage(toggleError))
  } finally {
    actionId.value = undefined
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    tools.value = await listTools(status.value)
  } catch (loadError) {
    error.value = problemMessage(loadError)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page-section { padding: 0; }
.primary-cell { display: flex; flex-direction: column; gap: 4px; }
.primary-cell span { color: var(--ow-text-muted); font-size: 12px; }
.detail-heading, .version-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.inline-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.detail-heading h2 { margin: 0; }
.detail-heading p, .description { color: var(--ow-text-muted); }
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 22px 0; }
.detail-grid dt { color: var(--ow-text-muted); font-size: 12px; }
.detail-grid dd { margin: 4px 0 0; }
.section-title { margin: 24px 0 12px; }
.version-block { border-top: 1px solid var(--ow-line-soft); margin-top: 18px; padding-top: 16px; }
.version-title span { color: var(--ow-text-muted); font-size: 12px; }
.json-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.json-grid h4 { margin: 14px 0 6px; }
pre { max-height: 220px; overflow: auto; padding: 10px; background: var(--ow-surface-subtle); border: 1px solid var(--ow-line-soft); white-space: pre-wrap; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.drawer-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
@media (max-width: 720px) {
  .detail-grid, .json-grid, .form-grid { grid-template-columns: 1fr; }
}
</style>
