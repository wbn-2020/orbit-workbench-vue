<template>
  <div class="page">
    <PageHeader title="内容创作" description="围绕主题、资料和版本持续产出 Markdown 内容。">
      <template #actions>
        <el-select v-model="workspaceId" clearable placeholder="全部工作区" @change="load">
          <el-option
            v-for="workspace in workspaces"
            :key="workspace.id"
            :label="workspace.name"
            :value="workspace.id"
          />
        </el-select>
        <el-button :icon="RefreshCw" :loading="loading" @click="load">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新建项目</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="load" />
    <section v-else class="surface">
      <div v-if="loading" class="page-feedback"><el-skeleton :rows="7" animated /></div>
      <EmptyState
        v-else-if="projects.length === 0"
        title="还没有内容项目"
        description="创建一个项目，填写主题和目标受众后开始生成。"
        :icon="PenLine"
      />
      <el-table v-else :data="projects" row-key="id" @row-click="open">
        <el-table-column label="项目" min-width="330">
          <template #default="{ row }">
            <div class="project-cell">
              <PenLine aria-hidden="true" />
              <span>
                <strong>{{ row.title }}</strong>
                <small>{{ row.topic }}</small>
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><StatusTag :value="row.status" /></template>
        </el-table-column>
        <el-table-column label="最新版本" width="130">
          <template #default="{ row }">
            <span v-if="row.latestVersionNumber">
              v{{ row.latestVersionNumber }} · {{ enumLabel(row.latestVersionStatus) }}
            </span>
            <span v-else>尚未生成</span>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button text :icon="ArrowUpRight" aria-label="打开内容项目" @click.stop="open(row)" />
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

    <el-dialog v-model="createOpen" title="新建内容项目" width="min(640px, 94vw)" destroy-on-close>
      <el-form :model="form" label-position="top" @submit.prevent>
        <div class="form-grid">
          <el-form-item label="工作区">
            <el-select v-model="form.workspaceId" placeholder="选择工作区">
              <el-option
                v-for="workspace in workspaces"
                :key="workspace.id"
                :label="workspace.name"
                :value="workspace.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="AI 连接">
            <el-select v-model="form.connectionId" placeholder="选择已启用连接">
              <el-option
                v-for="connection in connections"
                :key="connection.id"
                :label="`${connection.name} · ${connection.modelName}`"
                :value="connection.id"
              />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="项目标题"><el-input v-model.trim="form.title" maxlength="120" /></el-form-item>
        <el-form-item label="主题"><el-input v-model="form.topic" type="textarea" :rows="4" maxlength="2000" /></el-form-item>
        <div class="form-grid">
          <el-form-item label="目标受众"><el-input v-model="form.audience" maxlength="512" /></el-form-item>
          <el-form-item label="写作风格"><el-input v-model="form.style" maxlength="512" /></el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="createOpen = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="create">创建项目</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ArrowUpRight, PenLine, Plus, RefreshCw } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  createContentProject,
  listContentProjects,
  type ContentProjectPayload,
} from '@/api/content'
import { listAiConnections } from '@/api/aiConnections'
import { problemMessage } from '@/api/http'
import { listWorkspaces } from '@/api/workspaces'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { AiConnection, ContentProjectSummary, Workspace } from '@/types/api'
import { enumLabel, formatDateTime } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const creating = ref(false)
const error = ref('')
const workspaceId = ref<number>()
const workspaces = ref<Workspace[]>([])
const connections = ref<AiConnection[]>([])
const projects = ref<ContentProjectSummary[]>([])
const page = ref(1)
const size = ref(20)
const total = ref(0)
const createOpen = ref(false)

const form = reactive({
  workspaceId: undefined as number | undefined,
  connectionId: undefined as number | undefined,
  title: '',
  topic: '',
  audience: '',
  style: '',
})

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const result = await listContentProjects(workspaceId.value, page.value, size.value)
    projects.value = result.items
    total.value = result.total
  } catch (reason) {
    error.value = problemMessage(reason)
  } finally {
    loading.value = false
  }
}

async function loadOptions(): Promise<void> {
  const [workspaceResult, connectionResult] = await Promise.all([
    listWorkspaces(),
    listAiConnections(1, 100, true),
  ])
  workspaces.value = workspaceResult
  connections.value = connectionResult.items
  workspaceId.value ||= workspaceResult[0]?.id
}

function open(project: ContentProjectSummary): void {
  void router.push(`/content/${project.id}`)
}

function openCreate(): void {
  Object.assign(form, {
    workspaceId: workspaceId.value || workspaces.value[0]?.id,
    connectionId: connections.value[0]?.id,
    title: '',
    topic: '',
    audience: '',
    style: '',
  })
  createOpen.value = true
}

async function create(): Promise<void> {
  creating.value = true
  try {
    const payload: ContentProjectPayload = {
      workspaceId: form.workspaceId || 0,
      connectionId: form.connectionId || 0,
      title: form.title,
      topic: form.topic,
      audience: form.audience || null,
      style: form.style || null,
      outputFormat: 'MARKDOWN',
    }
    const project = await createContentProject(payload)
    createOpen.value = false
    ElMessage.success('内容项目已创建')
    await router.push(`/content/${project.id}`)
  } catch (reason) {
    ElMessage.error(problemMessage(reason))
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  try {
    await loadOptions()
    await load()
  } catch (reason) {
    error.value = problemMessage(reason)
  }
})
</script>

<style scoped>
.project-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.project-cell > svg {
  width: 18px;
  height: 18px;
  flex: none;
  color: var(--ow-primary);
}

.project-cell > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.project-cell strong,
.project-cell small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-cell strong {
  color: var(--ow-ink-secondary);
}

.project-cell small {
  color: var(--ow-muted);
  font-size: 12px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding: 15px 16px 16px;
  border-top: 1px solid var(--ow-line-soft);
}
</style>
