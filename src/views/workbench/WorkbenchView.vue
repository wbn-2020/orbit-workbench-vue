<template>
  <div class="page">
    <PageHeader
      title="工作台"
      description="从任务开始，跟踪运行过程，沉淀可继续编辑的成果。"
    >
      <template #actions>
        <el-button type="primary" :icon="Plus" @click="router.push('/tasks/new')">
          新建技术学习任务
        </el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="load" />

    <template v-else>
      <section class="metrics" aria-label="任务统计">
        <div v-for="metric in metrics" :key="metric.label" class="metric">
          <span class="metric-label">{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <span :class="['metric-note', metric.tone]">{{ metric.note }}</span>
        </div>
      </section>

      <div class="dashboard-grid page-section">
        <section class="surface">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">最近任务</h2>
              <span class="surface-subtitle">按更新时间排序</span>
            </div>
            <el-button text :icon="ArrowUpRight" @click="router.push('/tasks')">
              查看全部
            </el-button>
          </div>
          <div v-if="loading" class="page-feedback">
            <el-skeleton :rows="4" animated />
          </div>
          <EmptyState
            v-else-if="recentTasks.length === 0"
            title="还没有任务"
            description="创建一个技术学习任务，开始第一条运行记录。"
            :icon="ListChecks"
          >
            <el-button type="primary" @click="router.push('/tasks/new')">
              创建任务
            </el-button>
          </EmptyState>
          <div v-else class="task-list">
            <button
              v-for="task in recentTasks"
              :key="task.id"
              type="button"
              class="task-row"
              @click="router.push(`/tasks/${task.id}`)"
            >
              <span :class="['task-state', `is-${task.status.toLowerCase()}`]" />
              <span class="task-row-main">
                <strong class="truncate">{{ task.title }}</strong>
                <small>{{ enumLabel(task.moduleType) }} · {{ enumLabel(task.priority) }}</small>
              </span>
              <StatusTag :value="task.currentRunStatus || task.status" />
              <span class="task-date">{{ formatRelativeTime(task.updatedAt) }}</span>
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </section>

        <section class="surface">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">AI 连接状态</h2>
              <span class="surface-subtitle">已保存的模型连接</span>
            </div>
            <el-button text :icon="Settings2" @click="router.push('/settings/ai-connections')">
              管理
            </el-button>
          </div>
          <div v-if="loading" class="page-feedback">
            <el-skeleton :rows="4" animated />
          </div>
          <EmptyState
            v-else-if="connections.length === 0"
            title="还没有 AI 连接"
            description="添加一个可用连接后，任务才能调用模型。"
            :icon="Bot"
          >
            <el-button @click="router.push('/settings/ai-connections')">添加连接</el-button>
          </EmptyState>
          <div v-else class="connection-list">
            <div v-for="connection in connections.slice(0, 4)" :key="connection.id" class="connection-row">
              <span class="connection-icon"><Bot aria-hidden="true" /></span>
              <span class="connection-main">
                <strong class="truncate">{{ connection.name }}</strong>
                <small class="truncate">
                  {{ connection.modelName }} · {{ enumLabel(connection.protocol) }}
                </small>
              </span>
              <StatusTag :value="connection.lastTestStatus || 'UNTESTED'" />
            </div>
          </div>
        </section>
      </div>

      <section class="surface page-section">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">最近成果</h2>
            <span class="surface-subtitle">保留版本历史，继续编辑不覆盖旧内容</span>
          </div>
          <el-button text :icon="ArrowUpRight" @click="router.push('/artifacts')">
            查看全部
          </el-button>
        </div>
        <div v-if="loading" class="page-feedback">
          <el-skeleton :rows="3" animated />
        </div>
        <EmptyState
          v-else-if="recentArtifacts.length === 0"
          title="还没有成果"
          description="完成一次任务运行后，生成的内容会出现在这里。"
          :icon="Archive"
        />
        <div v-else class="artifact-grid">
          <button
            v-for="artifact in recentArtifacts"
            :key="artifact.id"
            type="button"
            class="artifact-row"
            @click="router.push(`/artifacts/${artifact.id}`)"
          >
            <FileOutput aria-hidden="true" />
            <span class="artifact-main">
              <strong class="truncate">{{ artifact.title }}</strong>
              <small class="truncate">
                {{ enumLabel(artifact.artifactType) }} · v{{ artifact.currentVersion }}
              </small>
            </span>
            <span class="muted">{{ formatRelativeTime(artifact.updatedAt) }}</span>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  Archive,
  ArrowUpRight,
  Bot,
  ChevronRight,
  FileOutput,
  ListChecks,
  Plus,
  Settings2,
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { listAiConnections } from '@/api/aiConnections'
import { listArtifacts } from '@/api/artifacts'
import { problemMessage } from '@/api/http'
import { listTasks } from '@/api/tasks'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { AiConnection, ArtifactSummary, TaskSummary } from '@/types/api'
import { enumLabel, formatRelativeTime } from '@/utils/format'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const recentTasks = ref<TaskSummary[]>([])
const recentArtifacts = ref<ArtifactSummary[]>([])
const connections = ref<AiConnection[]>([])
const totals = ref({ pending: 0, running: 0, failed: 0, succeeded: 0 })

const metrics = computed(() => [
  { label: '待处理任务', value: totals.value.pending, note: '待运行或草稿', tone: '' },
  { label: '运行中', value: totals.value.running, note: '以服务端状态为准', tone: 'primary' },
  { label: '已完成', value: totals.value.succeeded, note: '可继续编辑成果', tone: 'success' },
  { label: '失败待处理', value: totals.value.failed, note: '需要查看运行详情', tone: 'danger' },
])

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const [recent, pending, running, failed, succeeded, artifactPage, connectionPage] =
      await Promise.all([
        listTasks({ page: 1, size: 6 }),
        listTasks({ status: 'READY', page: 1, size: 1 }),
        listTasks({ status: 'RUNNING', page: 1, size: 1 }),
        listTasks({ status: 'FAILED', page: 1, size: 1 }),
        listTasks({ status: 'SUCCEEDED', page: 1, size: 1 }),
        listArtifacts(1, 6),
        listAiConnections(1, 20, true),
      ])
    recentTasks.value = recent.items
    recentArtifacts.value = artifactPage.items
    connections.value = connectionPage.items
    totals.value = {
      pending: pending.total,
      running: running.total,
      failed: failed.total,
      succeeded: succeeded.total,
    }
  } catch (loadError) {
    error.value = problemMessage(loadError)
  } finally {
    loading.value = false
  }
}

onMounted(() => load())
</script>

<style scoped>
.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--ow-line);
  border-bottom: 1px solid var(--ow-line);
}

.metric {
  display: grid;
  gap: 4px;
  min-height: 104px;
  align-content: center;
  padding: 15px 18px;
  border-right: 1px solid var(--ow-line);
}

.metric:last-child {
  border-right: 0;
}

.metric-label,
.metric-note,
.surface-subtitle,
.task-row small,
.connection-row small,
.artifact-row small {
  color: var(--ow-muted);
  font-size: 12px;
}

.metric strong {
  font-size: 25px;
  line-height: 1;
}

.metric-note.primary {
  color: var(--ow-primary-strong);
}

.metric-note.success {
  color: var(--ow-primary);
}

.metric-note.danger {
  color: var(--ow-danger);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
  gap: 16px;
}

.surface-subtitle {
  display: block;
  margin-top: 2px;
}

.surface-header :deep(.el-button) {
  flex: none;
}

.task-list,
.connection-list,
.artifact-grid {
  padding: 5px 8px 8px;
}

.task-row,
.artifact-row {
  display: grid;
  width: 100%;
  grid-template-columns: 10px minmax(0, 1fr) auto auto 16px;
  align-items: center;
  gap: 11px;
  padding: 12px 8px;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--ow-line-soft);
  cursor: pointer;
}

.task-row:last-child,
.artifact-row:last-child {
  border-bottom: 0;
}

.task-row:hover,
.artifact-row:hover {
  background: var(--ow-surface-raised);
}

.task-state {
  width: 8px;
  height: 8px;
  background: var(--ow-muted);
  border-radius: 50%;
}

.task-state.is-running,
.task-state.is-queued {
  background: var(--ow-primary);
  box-shadow: 0 0 0 3px var(--ow-primary-soft);
}

.task-state.is-failed {
  background: var(--ow-danger);
}

.task-row-main,
.connection-main,
.artifact-main {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.task-row-main strong,
.connection-main strong,
.artifact-main strong {
  color: var(--ow-ink-secondary);
  font-size: 13px;
  font-weight: 650;
}

.task-date {
  color: var(--ow-muted);
  font-size: 11px;
  white-space: nowrap;
}

.task-row > svg,
.artifact-row > svg:last-child {
  width: 15px;
  height: 15px;
  color: var(--ow-muted);
}

.connection-row {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 12px 8px;
  border-bottom: 1px solid var(--ow-line-soft);
}

.connection-row:last-child {
  border-bottom: 0;
}

.connection-icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: var(--ow-info);
  background: var(--ow-info-soft);
  border-radius: 6px;
}

.connection-icon svg {
  width: 16px;
  height: 16px;
}

.artifact-row {
  grid-template-columns: 19px minmax(0, 1fr) auto 16px;
}

.artifact-row > svg:first-child {
  width: 17px;
  height: 17px;
  color: var(--ow-primary);
}

@media (max-width: 980px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric:nth-child(2) {
    border-right: 0;
  }

  .metric:nth-child(-n + 2) {
    border-bottom: 1px solid var(--ow-line);
  }
}

@media (max-width: 520px) {
  .task-row {
    grid-template-columns: 10px minmax(0, 1fr) 16px;
  }

  .task-row :deep(.el-tag),
  .task-date {
    display: none;
  }
}
</style>
