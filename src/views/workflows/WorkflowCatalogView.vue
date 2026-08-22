<template>
  <div class="page">
    <PageHeader title="Workflow 目录" description="用有限的结构化节点编排可追踪、可发布的 AI 流程。">
      <template #actions>
        <el-button :icon="RefreshCw" :loading="loading" @click="load">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="router.push('/workflows/new')">
          新建 Workflow
        </el-button>
      </template>
    </PageHeader>

    <section class="surface filters">
      <el-select v-model="filters.workspaceId" placeholder="选择工作空间" @change="load">
        <el-option
          v-for="workspace in workspaces"
          :key="workspace.id"
          :label="workspace.name"
          :value="workspace.id"
        />
      </el-select>
      <el-select v-model="filters.status" clearable placeholder="全部状态" @change="load">
        <el-option
          v-for="status in statusOptions"
          :key="status"
          :label="enumLabel(status)"
          :value="status"
        />
      </el-select>
      <el-button :icon="RefreshCw" :loading="loading" @click="load">应用筛选</el-button>
    </section>

    <ErrorState v-if="error" class="page-section" :message="error" :retry="load" />

    <section v-else class="surface page-section">
      <div v-if="loading" class="page-feedback">
        <el-skeleton :rows="6" animated />
      </div>
      <EmptyState
        v-else-if="workflows.length === 0"
        title="没有匹配的 Workflow"
        description="创建一个结构化流程，配置节点和连线后再发布。"
        :icon="WorkflowIcon"
      >
        <el-button type="primary" :icon="Plus" @click="router.push('/workflows/new')">
          新建 Workflow
        </el-button>
      </EmptyState>
      <div v-else class="table-wrap">
        <el-table :data="workflows" row-key="id" @row-click="openWorkflow">
          <el-table-column label="Workflow" min-width="300">
            <template #default="{ row }">
              <div class="workflow-cell">
                <strong>{{ row.name }}</strong>
                <span>{{ row.code || '未设置编码' }} · {{ row.description || '未填写描述' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="节点" width="90">
            <template #default="{ row }">{{ row.nodes.length }}</template>
          </el-table-column>
          <el-table-column label="连线" width="90">
            <template #default="{ row }">{{ row.edges.length }}</template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }"><StatusTag :value="row.status" /></template>
          </el-table-column>
          <el-table-column label="版本" width="120">
            <template #default="{ row }">{{ versionLabel(row) }}</template>
          </el-table-column>
          <el-table-column label="更新时间" width="160">
            <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button text :icon="ArrowUpRight" aria-label="查看 Workflow" @click.stop="openWorkflow(row)" />
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
import { ArrowUpRight, GitBranch, Plus, RefreshCw } from 'lucide-vue-next'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { listWorkflows } from '@/api/workflows'
import { problemMessage } from '@/api/http'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import { listWorkspaces } from '@/api/workspaces'
import type { Workflow, WorkflowStatus, Workspace } from '@/types/api'
import { enumLabel, formatDateTime } from '@/utils/format'

const WorkflowIcon = GitBranch
const router = useRouter()
const loading = ref(false)
const error = ref('')
const workflows = ref<Workflow[]>([])
const workspaces = ref<Workspace[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const filters = reactive<{ workspaceId?: number; status?: WorkflowStatus }>({})
const statusOptions: WorkflowStatus[] = ['DRAFT', 'PUBLISHED', 'DISABLED']

function versionLabel(workflow: Workflow): string {
  if (workflow.publishedVersion?.versionNumber) return `已发布 v${workflow.publishedVersion.versionNumber}`
  if (workflow.publishedVersionId) return `已发布 #${workflow.publishedVersionId}`
  if (workflow.draftVersion?.versionNumber) return `草稿 v${workflow.draftVersion.versionNumber}`
  if (workflow.draftVersionId) return `草稿 #${workflow.draftVersionId}`
  return '未版本化'
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    if (!filters.workspaceId) {
      workflows.value = []
      total.value = 0
      return
    }
    const result = await listWorkflows({
      workspaceId: filters.workspaceId,
      status: filters.status,
      page: page.value,
      size: size.value,
    })
    workflows.value = result.items
    total.value = result.total
  } catch (loadError) {
    error.value = problemMessage(loadError)
  } finally {
    loading.value = false
  }
}

function openWorkflow(workflow: Workflow): void {
  void router.push(`/workflows/${workflow.id}`)
}

onMounted(async () => {
  try {
    workspaces.value = await listWorkspaces()
    filters.workspaceId = workspaces.value.find((workspace) => workspace.isDefault)?.id ||
      workspaces.value[0]?.id
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

.workflow-cell {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.workflow-cell strong,
.workflow-cell span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-cell strong {
  color: var(--ow-ink-secondary);
}

.workflow-cell span {
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
  .filters .el-select {
    width: calc(50% - 5px);
  }

  .filters .el-button {
    width: 100%;
  }
}
</style>
