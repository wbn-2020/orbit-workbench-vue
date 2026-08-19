<template>
  <div class="page">
    <PageHeader title="成果中心" description="查看任务生成的成果，保留版本并继续编辑。" />

    <section class="surface filters">
      <el-select
        v-model="filters.workspaceId"
        clearable
        placeholder="全部工作区"
        :loading="workspaceLoading"
        @change="changeWorkspace"
      >
        <el-option
          v-for="workspace in workspaces"
          :key="workspace.id"
          :label="workspace.name"
          :value="workspace.id"
        />
      </el-select>
      <el-select
        v-model="filters.taskId"
        clearable
        filterable
        placeholder="全部任务"
        :loading="taskLoading"
        @change="changeTask"
      >
        <el-option
          v-for="task in taskOptions"
          :key="task.id"
          :label="task.title"
          :value="task.id"
        />
      </el-select>
      <el-button :icon="RefreshCw" :loading="loading" @click="load">刷新</el-button>
    </section>

    <el-alert
      v-if="filterError"
      class="filter-error"
      :title="filterError"
      type="warning"
      show-icon
      :closable="false"
    />

    <ErrorState v-if="error" :message="error" :retry="load" />
    <section v-else class="surface">
      <div v-if="loading" class="page-feedback"><el-skeleton :rows="6" animated /></div>
      <EmptyState
        v-else-if="artifacts.length === 0"
        title="还没有成果"
        description="完成一次任务运行后，生成的内容会出现在这里。"
        :icon="Archive"
      />
      <div v-else class="table-wrap">
        <el-table :data="artifacts" row-key="id" @row-click="open">
          <el-table-column label="成果" min-width="300">
            <template #default="{ row }">
              <div class="artifact-cell">
                <FileOutput aria-hidden="true" />
                <span>
                  <strong>{{ row.title }}</strong>
                  <small>{{ row.taskTitle || `任务 #${row.taskId}` }}</small>
                </span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="130">
            <template #default="{ row }">{{ enumLabel(row.artifactType) }}</template>
          </el-table-column>
          <el-table-column label="版本" width="90">
            <template #default="{ row }">v{{ row.currentVersion }}</template>
          </el-table-column>
          <el-table-column label="更新时间" width="155">
            <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ row }">
              <el-button text :icon="ArrowUpRight" aria-label="打开成果" @click.stop="open(row)" />
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
  </div>
</template>

<script setup lang="ts">
import { Archive, ArrowUpRight, FileOutput, RefreshCw } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { listArtifacts } from '@/api/artifacts'
import { problemMessage } from '@/api/http'
import { listTasks } from '@/api/tasks'
import { listWorkspaces } from '@/api/workspaces'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import type { ArtifactSummary, TaskSummary, Workspace } from '@/types/api'
import { enumLabel, formatDateTime } from '@/utils/format'
import { createLatestRequestGuard } from '@/utils/latestRequest'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const filterError = ref('')
const artifacts = ref<ArtifactSummary[]>([])
const workspaces = ref<Workspace[]>([])
const taskOptions = ref<TaskSummary[]>([])
const workspaceLoading = ref(false)
const taskLoading = ref(false)
const page = ref(1)
const size = ref(20)
const total = ref(0)
const filters = reactive<{ workspaceId?: number; taskId?: number }>({})
const artifactRequest = createLatestRequestGuard()
const workspaceRequest = createLatestRequestGuard()
const taskRequest = createLatestRequestGuard()

async function load(): Promise<void> {
  const requestId = artifactRequest.begin()
  loading.value = true
  error.value = ''
  try {
    const result = await listArtifacts(
      page.value,
      size.value,
      filters.workspaceId,
      filters.taskId,
    )
    if (artifactRequest.isCurrent(requestId)) {
      artifacts.value = result.items
      total.value = result.total
    }
  } catch (loadError) {
    if (artifactRequest.isCurrent(requestId)) {
      error.value = problemMessage(loadError)
    }
  } finally {
    if (artifactRequest.isCurrent(requestId)) {
      loading.value = false
    }
  }
}

async function loadWorkspaces(): Promise<void> {
  const requestId = workspaceRequest.begin()
  workspaceLoading.value = true
  try {
    const result = await listWorkspaces()
    if (workspaceRequest.isCurrent(requestId)) {
      workspaces.value = result
    }
  } catch (loadError) {
    if (workspaceRequest.isCurrent(requestId)) {
      filterError.value = `工作区加载失败：${problemMessage(loadError)}`
    }
  } finally {
    if (workspaceRequest.isCurrent(requestId)) {
      workspaceLoading.value = false
    }
  }
}

async function loadTaskOptions(): Promise<void> {
  const requestId = taskRequest.begin()
  taskLoading.value = true
  try {
    const result = await listTasks({
      workspaceId: filters.workspaceId,
      moduleType: 'TECH_LEARNING',
      page: 1,
      size: 100,
    })
    if (taskRequest.isCurrent(requestId)) {
      taskOptions.value = result.items
      if (
        filters.taskId &&
        !result.items.some((task) => task.id === filters.taskId)
      ) {
        filters.taskId = undefined
      }
    }
  } catch (loadError) {
    if (taskRequest.isCurrent(requestId)) {
      filterError.value = `任务筛选项加载失败：${problemMessage(loadError)}`
    }
  } finally {
    if (taskRequest.isCurrent(requestId)) {
      taskLoading.value = false
    }
  }
}

function changeWorkspace(): void {
  filters.taskId = undefined
  page.value = 1
  filterError.value = ''
  void loadTaskOptions()
  void load()
}

function changeTask(): void {
  page.value = 1
  void load()
}

function open(artifact: ArtifactSummary): void {
  void router.push(`/artifacts/${artifact.id}`)
}

onMounted(() => {
  void loadWorkspaces()
  void loadTaskOptions()
  void load()
})
</script>

<style scoped>
.filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px;
  margin-bottom: 16px;
}

.filters .el-select {
  width: min(260px, 100%);
}

.filter-error {
  margin-bottom: 16px;
}

.artifact-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.artifact-cell > svg {
  width: 18px;
  height: 18px;
  flex: none;
  color: var(--ow-primary);
}

.artifact-cell > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.artifact-cell strong,
.artifact-cell small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artifact-cell strong {
  color: var(--ow-ink-secondary);
}

.artifact-cell small {
  color: var(--ow-muted);
  font-size: 12px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding: 15px 16px 16px;
  border-top: 1px solid var(--ow-line-soft);
}

@media (max-width: 600px) {
  .filters .el-select,
  .filters .el-button {
    width: 100%;
  }
}
</style>
