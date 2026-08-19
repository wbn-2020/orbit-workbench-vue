<template>
  <div class="page">
    <PageHeader
      :title="editing ? '编辑技术学习任务' : '新建技术学习任务'"
      :description="editing ? '修改将影响后续恢复或新运行。' : '创建任务后，可以立即启动一次 Agent 运行。'"
      back
    />

    <ErrorState v-if="loadError" :message="loadError" :retry="loadOptions" />
    <section v-else class="form-layout">
      <el-form
        ref="formRef"
        class="surface form-panel"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit(false)"
      >
        <div class="surface-header">
          <div>
            <h2 class="surface-title">任务输入</h2>
            <span class="surface-subtitle">运行时会以服务端保存的数据为准</span>
          </div>
        </div>
        <div class="surface-body">
          <el-form-item label="任务标题" prop="title">
            <el-input
              v-model.trim="form.title"
              maxlength="120"
              show-word-limit
              placeholder="例如：整理 Spring Security 学习笔记"
            />
          </el-form-item>
          <el-form-item label="学习目标" prop="description">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="5"
              maxlength="2000"
              show-word-limit
              placeholder="写下希望模型完成的具体工作和边界"
            />
          </el-form-item>
          <div class="form-grid">
            <el-form-item label="工作区" prop="workspaceId">
              <el-select
                v-model="form.workspaceId"
                placeholder="选择工作区"
                :disabled="editing"
              >
                <el-option
                  v-for="workspace in workspaces"
                  :key="workspace.id"
                  :label="workspace.name"
                  :value="workspace.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="期望成果" prop="expectedArtifactType">
              <el-select v-model="form.expectedArtifactType" placeholder="选择成果类型">
                <el-option label="学习笔记" value="LEARNING_NOTE" />
                <el-option label="练习题" value="QUIZ" />
                <el-option label="摘要" value="SUMMARY" />
              </el-select>
            </el-form-item>
            <el-form-item label="优先级" prop="priority">
              <el-select v-model="form.priority">
                <el-option label="低" value="LOW" />
                <el-option label="普通" value="NORMAL" />
                <el-option label="高" value="HIGH" />
              </el-select>
            </el-form-item>
            <el-form-item label="AI 连接" prop="connectionId">
              <el-select v-model="form.connectionId" placeholder="选择已测试连接">
                <el-option
                  v-for="connection in connections"
                  :key="connection.id"
                  :label="`${connection.name} · ${connection.modelName}`"
                  :value="connection.id"
                />
              </el-select>
            </el-form-item>
          </div>
          <el-form-item label="关联资料">
            <el-select
              v-model="form.documentIds"
              multiple
              collapse-tags
              collapse-tags-tooltip
              placeholder="可选，选择本地资料"
            >
              <el-option
                v-for="document in documents"
                :key="document.id"
                :label="document.originalName || document.fileName || `资料 #${document.id}`"
                :value="document.id"
              />
            </el-select>
          </el-form-item>
        </div>
        <div class="form-actions">
          <el-button :disabled="submitting" @click="router.back()">取消</el-button>
          <el-button
            v-if="!editing"
            :loading="submitting"
            :disabled="submitting"
            @click="submit(false)"
          >
            仅创建
          </el-button>
          <el-button
            v-if="!editing"
            type="primary"
            :loading="submitting"
            :disabled="submitting"
            @click="submit(true)"
          >
            创建并启动
          </el-button>
          <el-button
            v-else
            type="primary"
            :loading="submitting"
            :disabled="submitting"
            @click="submit(false)"
          >
            保存修改
          </el-button>
        </div>
      </el-form>

      <aside class="surface side-panel">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">当前范围</h2>
            <span class="surface-subtitle">MVP 只开放技术学习任务</span>
          </div>
        </div>
        <div class="surface-body">
          <ul class="scope-list">
            <li><CheckCircle2 aria-hidden="true" />支持纯文本和 Markdown 资料</li>
            <li><CheckCircle2 aria-hidden="true" />运行过程可在详情页实时查看</li>
            <li><CheckCircle2 aria-hidden="true" />成果保存为可版本化内容</li>
          </ul>
          <el-button text :icon="Bot" @click="router.push('/settings/ai-connections')">
            管理 AI 连接
          </el-button>
        </div>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Bot, CheckCircle2 } from 'lucide-vue-next'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { listAiConnections } from '@/api/aiConnections'
import { problemMessage } from '@/api/http'
import { listDocuments } from '@/api/documents'
import { createTask, getTask, startTaskRun, updateTask } from '@/api/tasks'
import { listWorkspaces } from '@/api/workspaces'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useSubmissionLock } from '@/composables/useSubmissionLock'
import type {
  AiConnection,
  DocumentSummary,
  Priority,
  Workspace,
} from '@/types/api'
import { createIdempotencyKey } from '@/utils/idempotency'

const route = useRoute()
const router = useRouter()
const taskId = computed(() => Number(route.params.id))
const editing = computed(() => route.name === 'task-edit')
const formRef = ref<FormInstance>()
const loadError = ref('')
const submission = useSubmissionLock()
const submitting = submission.submitting
const workspaces = ref<Workspace[]>([])
const connections = ref<AiConnection[]>([])
const documents = ref<DocumentSummary[]>([])
let documentRequestId = 0
let createRequestKey: string | null = null

const form = reactive({
  workspaceId: undefined as number | undefined,
  title: '',
  description: '',
  expectedArtifactType: 'LEARNING_NOTE',
  priority: 'NORMAL' as Priority,
  documentIds: [] as number[],
  connectionId: undefined as number | undefined,
})

const rules: FormRules = {
  workspaceId: [{ required: true, message: '请选择工作区', trigger: 'change' }],
  title: [
    { required: true, message: '请输入任务标题', trigger: 'blur' },
    { max: 120, message: '标题最多 120 个字符', trigger: 'blur' },
  ],
  description: [
    { required: true, message: '请填写学习目标', trigger: 'blur' },
    { max: 2000, message: '学习目标最多 2000 个字符', trigger: 'blur' },
  ],
  expectedArtifactType: [{ required: true, message: '请选择期望成果', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  connectionId: [{ required: true, message: '请选择 AI 连接', trigger: 'change' }],
}

async function loadOptions(): Promise<void> {
  loadError.value = ''
  try {
    const [workspaceResult, connectionResult, taskResult] = await Promise.all([
      listWorkspaces(),
      listAiConnections(1, 50, true),
      editing.value ? getTask(taskId.value) : Promise.resolve(undefined),
    ])
    workspaces.value = workspaceResult
    connections.value = connectionResult.items.filter(
      (connection) => connection.enabled && connection.lastTestStatus === 'SUCCESS',
    )
    if (taskResult) {
      form.workspaceId = taskResult.workspaceId
      form.title = taskResult.title
      form.description = taskResult.description || ''
      form.expectedArtifactType = taskResult.expectedArtifactType
      form.priority = taskResult.priority
      form.connectionId = taskResult.connectionId || undefined
      await loadDocumentsForWorkspace(taskResult.workspaceId, false)
      form.documentIds = taskResult.documentIds || []
    } else {
      form.workspaceId = workspaceResult[0]?.id
      form.connectionId = connections.value[0]?.id
    }
  } catch (error) {
    loadError.value = problemMessage(error)
  }
}

async function loadDocumentsForWorkspace(
  workspaceId?: number,
  resetSelection = true,
): Promise<void> {
  const requestId = ++documentRequestId
  if (resetSelection) form.documentIds = []
  if (!workspaceId) {
    documents.value = []
    return
  }
  try {
    const result = await listDocuments(1, 100, workspaceId)
    if (requestId === documentRequestId) {
      documents.value = result.items
    }
  } catch (error) {
    if (requestId === documentRequestId) {
      documents.value = []
      ElMessage.error(problemMessage(error))
    }
  }
}

async function submit(startImmediately: boolean): Promise<void> {
  await submission.run(async () => {
    if (!(await formRef.value?.validate().catch(() => false))) return

    const payload = {
      moduleType: 'TECH_LEARNING',
      title: form.title,
      description: form.description,
      expectedArtifactType: form.expectedArtifactType,
      priority: form.priority,
      documentIds: form.documentIds,
      connectionId: form.connectionId as number,
    } as const

    try {
      if (editing.value) {
        await updateTask(taskId.value, payload)
        ElMessage.success('任务已更新')
        await router.replace(`/tasks/${taskId.value}`)
        return
      }

      const task = await createTask(
        {
          workspaceId: form.workspaceId as number,
          ...payload,
        },
        createRequestKey || (createRequestKey = createIdempotencyKey('task-create')),
      )
      createRequestKey = null

      if (!startImmediately) {
        ElMessage.success('任务已创建')
        await router.replace(`/tasks/${task.id}`)
        return
      }

      try {
        const run = await startTaskRun(task.id)
        ElMessage.success('任务已创建并进入运行队列')
        await router.replace(`/runs/${run.runId}`)
      } catch (startError) {
        ElMessage.warning(`任务已创建，但启动失败：${problemMessage(startError)}`)
        await router.replace(`/tasks/${task.id}`)
      }
    } catch (error) {
      ElMessage.error(problemMessage(error))
    }
  })
}

watch(
  () => form.workspaceId,
  (workspaceId) => {
    void loadDocumentsForWorkspace(workspaceId)
  },
)

watch(
  form,
  () => {
    if (!submitting.value) createRequestKey = null
  },
  { deep: true },
)

onMounted(() => loadOptions())
</script>

<style scoped>
.form-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  align-items: start;
  gap: 16px;
}

.form-panel {
  overflow: hidden;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.form-grid :deep(.el-select),
.form-panel :deep(.el-select) {
  width: 100%;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 16px;
  border-top: 1px solid var(--ow-line-soft);
}

.scope-list {
  display: grid;
  gap: 13px;
  padding: 0;
  margin: 0 0 18px;
  color: var(--ow-ink-secondary);
  list-style: none;
}

.scope-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.scope-list svg {
  width: 16px;
  height: 16px;
  flex: none;
  color: var(--ow-primary);
}

@media (max-width: 900px) {
  .form-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions .el-button {
    width: 100%;
  }
}
</style>
