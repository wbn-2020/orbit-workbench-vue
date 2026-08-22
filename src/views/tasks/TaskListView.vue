<template>
  <div class="page">
    <PageHeader title="任务" description="技术学习与数据分析任务及其运行状态。">
      <template #actions>
        <el-dropdown trigger="click" @command="createTask">
          <el-button type="primary" :icon="Plus">新建任务</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="TECH_LEARNING">技术学习</el-dropdown-item>
              <el-dropdown-item command="DATA_ANALYSIS">数据分析</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>
    </PageHeader>

    <section class="surface filters">
      <el-select v-model="filters.workspaceId" clearable placeholder="全部工作区" @change="load">
        <el-option
          v-for="workspace in workspaces"
          :key="workspace.id"
          :label="workspace.name"
          :value="workspace.id"
        />
      </el-select>
      <el-select v-model="filters.status" clearable placeholder="全部状态" @change="load">
        <el-option v-for="status in statusOptions" :key="status" :label="enumLabel(status)" :value="status" />
      </el-select>
      <el-button :icon="RefreshCw" :loading="loading" @click="load">刷新</el-button>
    </section>

    <ErrorState v-if="error" class="page-section" :message="error" :retry="load" />

    <section v-else class="surface page-section">
      <div v-if="loading" class="page-feedback">
        <el-skeleton :rows="6" animated />
      </div>
      <EmptyState
        v-else-if="tasks.length === 0"
        title="没有匹配的任务"
        description="调整筛选条件，或创建一个新的任务。"
        :icon="ListChecks"
      >
        <el-button type="primary" @click="router.push('/tasks/new')">新建技术学习任务</el-button>
      </EmptyState>
      <div v-else class="table-wrap">
        <el-table :data="tasks" row-key="id" @row-click="openTask">
          <el-table-column label="任务" min-width="260">
            <template #default="{ row }">
              <div class="task-cell">
                <strong>{{ row.title }}</strong>
                <span>{{ row.description || '未填写描述' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="模块" width="110">
            <template #default="{ row }">{{ enumLabel(row.moduleType) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <StatusTag :value="row.status" />
            </template>
          </el-table-column>
          <el-table-column label="运行" width="120">
            <template #default="{ row }">
              <StatusTag v-if="runStatusForTask(row)" :value="runStatusForTask(row)" />
              <span v-else class="muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="优先级" width="90">
            <template #default="{ row }">{{ enumLabel(row.priority) }}</template>
          </el-table-column>
          <el-table-column label="更新时间" width="150">
            <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="190" fixed="right">
            <template #default="{ row }">
              <div class="row-actions" @click.stop>
                <el-button v-if="canStart(row)" text type="primary" @click="start(row)">
                  启动
                </el-button>
                <el-button v-if="row.currentRunId && canPause(row)" text @click="pause(row)">
                  暂停
                </el-button>
                <el-button
                  v-if="row.currentRunId && canResume(row)"
                  text
                  type="primary"
                  @click="resume(row)"
                >
                  恢复
                </el-button>
                <el-button
                  v-if="row.currentRunId && canCancel(row)"
                  text
                  type="danger"
                  @click="cancel(row)"
                >
                  取消
                </el-button>
                <el-button
                  v-if="row.currentRunId && canRetry(row)"
                  text
                  type="primary"
                  @click="retry(row)"
                >
                  重试
                </el-button>
                <el-button text :icon="ArrowUpRight" aria-label="查看任务" @click="openTask(row)" />
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
          :page-sizes="[20, 50, 100]"
          @current-change="load"
          @size-change="load"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ArrowUpRight, ListChecks, Plus, RefreshCw } from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  cancelAgentRun,
  pauseAgentRun,
  resumeAgentRun,
  retryAgentRun,
} from '@/api/agentRuns'
import { getProblem, problemMessage } from '@/api/http'
import { listTasks, startTaskRun } from '@/api/tasks'
import { listWorkspaces } from '@/api/workspaces'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { RunStatus, TaskStatus, TaskSummary, Workspace } from '@/types/api'
import { enumLabel, formatDateTime } from '@/utils/format'
import { canCancelRun, canRetryRun } from '@/utils/runState'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const tasks = ref<TaskSummary[]>([])
const workspaces = ref<Workspace[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const filters = reactive<{ workspaceId?: number; status?: TaskStatus }>({})
const statusOptions: TaskStatus[] = [
  'DRAFT',
  'READY',
  'RUNNING',
  'PAUSED',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
]

function canStart(task: TaskSummary): boolean {
  return task.status === 'READY'
}

function runStatusForTask(task: TaskSummary): RunStatus | null {
  if (task.currentRunStatus) return task.currentRunStatus
  if (!task.currentRunId) return null
  if (['RUNNING', 'PAUSED', 'SUCCEEDED', 'FAILED', 'CANCELLED'].includes(task.status)) {
    return task.status as RunStatus
  }
  return null
}

function canPause(task: TaskSummary): boolean {
  return runStatusForTask(task) === 'RUNNING'
}

function canResume(task: TaskSummary): boolean {
  return runStatusForTask(task) === 'PAUSED'
}

function canCancel(task: TaskSummary): boolean {
  return canCancelRun(runStatusForTask(task))
}

function canRetry(task: TaskSummary): boolean {
  return canRetryRun(runStatusForTask(task))
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const result = await listTasks({
      ...filters,
      page: page.value,
      size: size.value,
    })
    tasks.value = result.items
    total.value = result.total
  } catch (loadError) {
    error.value = problemMessage(loadError)
  } finally {
    loading.value = false
  }
}

function openTask(task: TaskSummary): void {
  void router.push(
    task.moduleType === 'DATA_ANALYSIS'
      ? `/analysis/tasks/${task.id}`
      : `/tasks/${task.id}`,
  )
}

function createTask(moduleType: string): void {
  void router.push(moduleType === 'DATA_ANALYSIS' ? '/analysis/new' : '/tasks/new')
}

async function start(task: TaskSummary): Promise<void> {
  try {
    const result = await startTaskRun(task.id)
    ElMessage.success(result.status === 'QUEUED' ? '任务已进入运行队列' : '已打开当前运行')
    await router.push(`/runs/${result.runId}`)
  } catch (startError) {
    ElMessage.error(problemMessage(startError))
  }
}

async function pause(task: TaskSummary): Promise<void> {
  if (!task.currentRunId) return
  try {
    await pauseAgentRun(task.currentRunId)
    ElMessage.success('暂停请求已提交')
    await load()
  } catch (actionError) {
    await handleActionError(actionError)
  }
}

async function resume(task: TaskSummary): Promise<void> {
  if (!task.currentRunId) return
  try {
    const response = await resumeAgentRun(task.currentRunId)
    ElMessage.success('已创建恢复运行')
    await router.push(`/runs/${response.runId}`)
  } catch (actionError) {
    await handleActionError(actionError)
  }
}

async function cancel(task: TaskSummary): Promise<void> {
  if (!task.currentRunId) return
  try {
    await ElMessageBox.confirm('取消后后台运行将停止，是否继续？', '确认取消', {
      type: 'warning',
      confirmButtonText: '取消运行',
      cancelButtonText: '保留运行',
    })
    const response = await cancelAgentRun(task.currentRunId)
    ElMessage.success(response.status === 'CANCELLED' ? '运行已取消' : '取消请求已提交')
    await load()
  } catch (actionError) {
    if (actionError === 'cancel') return
    await handleActionError(actionError)
  }
}

async function retry(task: TaskSummary): Promise<void> {
  if (!task.currentRunId) return
  try {
    const response = await retryAgentRun(task.currentRunId)
    ElMessage.success('已创建新的运行')
    await router.push(`/runs/${response.runId}`)
  } catch (actionError) {
    await handleActionError(actionError)
  }
}

async function handleActionError(error: unknown): Promise<void> {
  const problem = getProblem(error)
  if (problem.status === 409 && problem.errorCode === 'STATE_CONFLICT') {
    await load()
    ElMessage.warning('运行状态已变化，已刷新任务列表')
    return
  }
  ElMessage.error(problem.detail || problem.title)
}

onMounted(async () => {
  try {
    workspaces.value = await listWorkspaces()
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
  width: 180px;
}

.task-cell {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.task-cell strong {
  overflow: hidden;
  color: var(--ow-ink-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-cell span {
  overflow: hidden;
  color: var(--ow-muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding: 15px 16px 16px;
  border-top: 1px solid var(--ow-line-soft);
}

@media (max-width: 600px) {
  .filters .el-select {
    width: calc(50% - 5px);
  }

  .filters .el-button {
    width: 100%;
  }
}
</style>
