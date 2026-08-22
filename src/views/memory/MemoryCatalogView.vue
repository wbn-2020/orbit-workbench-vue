<template>
  <div class="page">
    <PageHeader title="长期记忆" description="管理已确认记忆与待处理候选。">
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
        <el-button type="primary" :icon="Plus" @click="openCreate">新增记忆</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="load" />
    <template v-else>
      <section class="surface memory-toolbar">
        <el-segmented v-model="viewMode" :options="viewOptions" />
        <div class="memory-filters">
          <el-select v-if="viewMode === 'memories'" v-model="memoryType" clearable placeholder="全部类型">
            <el-option label="偏好" value="PREFERENCE" />
            <el-option label="事实" value="FACT" />
            <el-option label="约束" value="CONSTRAINT" />
            <el-option label="经验" value="EXPERIENCE" />
          </el-select>
          <el-input
            v-if="viewMode === 'memories'"
            v-model="query"
            clearable
            placeholder="搜索记忆内容"
            @keyup.enter="load"
          >
            <template #suffix><Search aria-hidden="true" /></template>
          </el-input>
        </div>
      </section>

      <section class="surface page-section">
        <div v-if="loading" class="page-feedback"><el-skeleton :rows="7" animated /></div>
        <EmptyState
          v-else-if="items.length === 0"
          :title="viewMode === 'memories' ? '还没有已确认记忆' : '没有待处理候选'"
          :description="viewMode === 'memories' ? '新增一条可复用的结构化事实。' : '候选需要确认后才会进入长期记忆。'"
          :icon="Brain"
        />
        <el-table v-else :data="items" row-key="id">
          <el-table-column label="内容" min-width="360">
            <template #default="{ row }">
              <div class="memory-content-cell">
                <strong>{{ memoryTypeLabel(row.memoryType) }}</strong>
                <span>{{ contentSummary(row.content) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="来源" width="150">
            <template #default="{ row }">
              <span>{{ sourceTypeLabel(row.sourceType) }}<template v-if="row.sourceId"> #{{ row.sourceId }}</template></span>
            </template>
          </el-table-column>
          <el-table-column label="置信度" width="110">
            <template #default="{ row }">{{ Math.round(row.confidence * 100) }}%</template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><StatusTag :value="row.status" /></template>
          </el-table-column>
          <el-table-column label="更新时间" width="170">
            <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <template v-if="viewMode === 'memories'">
                <el-button text :icon="Edit3" @click="openEdit(row)">编辑</el-button>
                <el-button text :icon="Archive" @click="archive(row)">归档</el-button>
                <el-button text type="danger" :icon="Trash2" @click="remove(row)">删除</el-button>
              </template>
              <template v-else>
                <el-button text type="success" :icon="Check" @click="confirmCandidate(row)">确认</el-button>
                <el-button text type="danger" :icon="X" @click="rejectCandidate(row)">拒绝</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
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
    </template>

    <el-drawer v-model="editorOpen" title="结构化记忆" size="min(620px, 96vw)" destroy-on-close>
      <el-alert v-if="editorError" :title="editorError" type="error" show-icon :closable="false" />
      <el-form :model="form" label-position="top" @submit.prevent>
        <el-form-item label="类型">
          <el-select v-model="form.memoryType">
            <el-option label="偏好" value="PREFERENCE" />
            <el-option label="事实" value="FACT" />
            <el-option label="约束" value="CONSTRAINT" />
            <el-option label="经验" value="EXPERIENCE" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容 JSON">
          <el-input v-model="form.contentText" type="textarea" :rows="12" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="来源">
            <el-select v-model="form.sourceType">
              <el-option label="用户" value="USER" />
              <el-option label="任务" value="TASK" />
              <el-option label="成果" value="ARTIFACT" />
              <el-option label="Agent 运行" value="AGENT_RUN" />
              <el-option label="Workflow 运行" value="WORKFLOW_RUN" />
            </el-select>
          </el-form-item>
          <el-form-item label="来源 ID">
            <el-input-number v-model="form.sourceId" :min="1" :controls="false" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="置信度">
            <el-input-number v-model="form.confidence" :min="0" :max="1" :step="0.05" />
          </el-form-item>
          <el-form-item label="过期时间">
            <el-date-picker v-model="form.expiresAt" type="datetime" value-format="YYYY-MM-DDTHH:mm:ssZ" />
          </el-form-item>
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
import { Archive, Brain, Check, Edit3, Plus, RefreshCw, Search, Trash2, X } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import {
  archiveMemory,
  confirmMemoryCandidate,
  createMemory,
  deleteMemory,
  listMemories,
  listMemoryCandidates,
  rejectMemoryCandidate,
  updateMemory,
  type MemoryPayload,
} from '@/api/memories'
import { problemMessage } from '@/api/http'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { listWorkspaces } from '@/api/workspaces'
import type { Memory, MemoryCandidate, Workspace } from '@/types/api'
import { formatDateTime } from '@/utils/format'

const loading = ref(false)
const actionLoading = ref(false)
const error = ref('')
const editorError = ref('')
const workspaceId = ref<number>()
const workspaces = ref<Workspace[]>([])
const viewMode = ref<'memories' | 'candidates'>('memories')
const memoryType = ref('')
const query = ref('')
const page = ref(1)
const size = ref(20)
const total = ref(0)
const items = ref<Array<Memory | MemoryCandidate>>([])
const editorOpen = ref(false)
const editingId = ref<number>()
const editingVersion = ref<number>()

const viewOptions = [
  { label: '已确认记忆', value: 'memories' },
  { label: '待确认候选', value: 'candidates' },
]

const form = reactive({
  memoryType: 'PREFERENCE',
  contentText: '{\n  "key": "value"\n}',
  sourceType: 'USER',
  sourceId: undefined as number | undefined,
  confidence: 1,
  expiresAt: '' as string | undefined,
})

function memoryTypeLabel(value: string): string {
  return ({ PREFERENCE: '偏好', FACT: '事实', CONSTRAINT: '约束', EXPERIENCE: '经验' }[value] || value)
}

function sourceTypeLabel(value: string): string {
  return ({ USER: '用户', TASK: '任务', ARTIFACT: '成果', AGENT_RUN: 'Agent 运行', WORKFLOW_RUN: 'Workflow 运行' }[value] || value)
}

function contentSummary(content: Record<string, unknown>): string {
  const text = JSON.stringify(content)
  return text.length > 180 ? `${text.slice(0, 180)}...` : text
}

async function loadWorkspaces(): Promise<void> {
  const result = await listWorkspaces()
  workspaces.value = result
  if (!workspaceId.value) workspaceId.value = result[0]?.id
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    if (viewMode.value === 'memories') {
      const result = await listMemories({
        workspaceId: workspaceId.value,
        status: 'CONFIRMED',
        memoryType: memoryType.value || undefined,
        q: query.value.trim() || undefined,
        page: page.value,
        size: size.value,
      })
      items.value = result.items
      total.value = result.total
    } else {
      const result = await listMemoryCandidates({
        workspaceId: workspaceId.value,
        status: 'PROPOSED',
        page: page.value,
        size: size.value,
      })
      items.value = result.items
      total.value = result.total
    }
  } catch (reason) {
    error.value = problemMessage(reason)
  } finally {
    loading.value = false
  }
}

function resetForm(): void {
  Object.assign(form, {
    memoryType: 'PREFERENCE',
    contentText: '{\n  "key": "value"\n}',
    sourceType: 'USER',
    sourceId: undefined,
    confidence: 1,
    expiresAt: '',
  })
  editingId.value = undefined
  editingVersion.value = undefined
  editorError.value = ''
}

function openCreate(): void {
  resetForm()
  editorOpen.value = true
}

function openEdit(memory: Memory | MemoryCandidate): void {
  if (!('status' in memory) || memory.status !== 'CONFIRMED') return
  resetForm()
  editingId.value = memory.id
  editingVersion.value = memory.version
  Object.assign(form, {
    memoryType: memory.memoryType,
    contentText: JSON.stringify(memory.content, null, 2),
    sourceType: memory.sourceType,
    sourceId: memory.sourceId ?? undefined,
    confidence: memory.confidence,
    expiresAt: memory.expiresAt || '',
  })
  editorOpen.value = true
}

function parseContent(): Record<string, unknown> {
  const parsed: unknown = JSON.parse(form.contentText)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('内容必须是 JSON 对象')
  }
  return parsed as Record<string, unknown>
}

function payload(): MemoryPayload {
  return {
    workspaceId: workspaceId.value || 0,
    memoryType: form.memoryType,
    content: parseContent(),
    sourceType: form.sourceType,
    sourceId: form.sourceId || null,
    confidence: form.confidence,
    expiresAt: form.expiresAt || null,
    expectedVersion: editingVersion.value,
  }
}

async function save(): Promise<void> {
  actionLoading.value = true
  editorError.value = ''
  try {
    const result = editingId.value
      ? await updateMemory(editingId.value, payload())
      : await createMemory(payload())
    editorOpen.value = false
    ElMessage.success(editingId.value ? '记忆已更新' : '记忆已创建')
    const index = items.value.findIndex((item) => item.id === result.id)
    if (index >= 0) items.value[index] = result
    else await load()
  } catch (reason) {
    editorError.value = reason instanceof Error && reason.message !== '内容必须是 JSON 对象'
      ? problemMessage(reason)
      : reason instanceof Error ? reason.message : problemMessage(reason)
  } finally {
    actionLoading.value = false
  }
}

async function archive(memory: Memory | MemoryCandidate): Promise<void> {
  if (!('status' in memory) || memory.status !== 'CONFIRMED') return
  await runAction(async () => {
    await ElMessageBox.confirm('归档后不会再注入运行上下文，是否继续？', '归档记忆', { type: 'warning' })
    await archiveMemory(memory.id, memory.version)
    await load()
  })
}

async function remove(memory: Memory | MemoryCandidate): Promise<void> {
  if (!('status' in memory) || memory.status !== 'CONFIRMED') return
  await runAction(async () => {
    await ElMessageBox.confirm('删除后记忆将不可再注入，是否继续？', '删除记忆', { type: 'warning' })
    await deleteMemory(memory.id, memory.version)
    await load()
  })
}

async function confirmCandidate(candidate: Memory | MemoryCandidate): Promise<void> {
  if (!('status' in candidate) || candidate.status !== 'PROPOSED') return
  await runAction(async () => {
    await confirmMemoryCandidate(candidate.id, candidate.version)
    await load()
  })
}

async function rejectCandidate(candidate: Memory | MemoryCandidate): Promise<void> {
  if (!('status' in candidate) || candidate.status !== 'PROPOSED') return
  await runAction(async () => {
    await rejectMemoryCandidate(candidate.id, candidate.version)
    await load()
  })
}

async function runAction(action: () => Promise<void>): Promise<void> {
  actionLoading.value = true
  try {
    await action()
    ElMessage.success('操作已完成')
  } catch (reason) {
    if (reason !== 'cancel') ElMessage.error(problemMessage(reason))
  } finally {
    actionLoading.value = false
  }
}

onMounted(async () => {
  try {
    await loadWorkspaces()
    await load()
  } catch (reason) {
    error.value = problemMessage(reason)
  }
})
</script>

<style scoped>
.memory-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.memory-filters {
  display: flex;
  gap: 10px;
  min-width: min(480px, 100%);
}

.memory-filters .el-input {
  min-width: 220px;
}

.memory-content-cell {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.memory-content-cell strong,
.memory-content-cell span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 760px) {
  .memory-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .memory-filters {
    min-width: 0;
  }
}
</style>
