<template>
  <div class="page">
    <PageHeader
      :title="editing ? '编辑数据分析任务' : '新建数据分析任务'"
      :description="editing ? '修改会重新校验数据集和工作表状态。' : '基于一个可用工作表创建有界数据分析运行。'"
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
            <h2 class="surface-title">分析输入</h2>
            <span class="surface-subtitle">只会向 Agent 提供字段、Profile 和工具查询结果</span>
          </div>
        </div>
        <div class="surface-body">
          <div class="form-grid">
            <el-form-item label="工作区" prop="workspaceId">
              <el-select
                v-model="form.workspaceId"
                placeholder="选择工作区"
                :disabled="editing"
                @change="changeWorkspace"
              >
                <el-option
                  v-for="workspace in workspaces"
                  :key="workspace.id"
                  :label="workspace.name"
                  :value="workspace.id"
                />
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
            <el-form-item label="数据集" prop="datasetId">
              <el-select
                v-model="form.datasetId"
                placeholder="选择 READY 数据集"
                :loading="datasetsLoading"
                filterable
                @change="changeDataset"
              >
                <el-option
                  v-for="dataset in datasets"
                  :key="dataset.id"
                  :label="`${dataset.name} · ${dataset.format}`"
                  :value="dataset.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="工作表" prop="sheetId">
              <el-select
                v-model="form.sheetId"
                placeholder="选择工作表"
                :disabled="!form.datasetId"
              >
                <el-option
                  v-for="sheet in sheets"
                  :key="sheet.id"
                  :label="`${sheet.name} · ${countLabel(sheet.rowCount)} 行`"
                  :value="sheet.id"
                />
              </el-select>
            </el-form-item>
          </div>

          <el-form-item label="任务标题" prop="title">
            <el-input
              v-model.trim="form.title"
              maxlength="120"
              show-word-limit
              placeholder="例如：分析各地区销售趋势"
            />
          </el-form-item>
          <el-form-item label="分析目标" prop="analysisGoal">
            <el-input
              v-model="form.analysisGoal"
              type="textarea"
              :rows="6"
              maxlength="2000"
              show-word-limit
              placeholder="明确比较维度、指标、时间范围和希望识别的问题"
            />
          </el-form-item>
          <div class="form-grid">
            <el-form-item label="期望输出" prop="expectedOutputs">
              <el-checkbox-group v-model="form.expectedOutputs" class="output-options">
                <el-checkbox value="ANALYSIS_REPORT">分析报告</el-checkbox>
                <el-checkbox value="CHART_SPEC">图表</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="优先级" prop="priority">
              <el-segmented
                v-model="form.priority"
                :options="priorityOptions"
              />
            </el-form-item>
          </div>
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
            创建并运行
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

      <aside class="stack">
        <section class="surface">
          <div class="surface-header"><h2 class="surface-title">所选数据</h2></div>
          <div class="surface-body">
            <EmptyState
              v-if="!selectedDataset"
              title="尚未选择数据集"
              description="只显示当前工作区中解析完成的数据集。"
              :icon="Database"
            />
            <dl v-else class="detail-grid dataset-summary">
              <div><dt>名称</dt><dd>{{ selectedDataset.name }}</dd></div>
              <div><dt>格式</dt><dd>{{ selectedDataset.format }}</dd></div>
              <div><dt>数据行</dt><dd>{{ countLabel(selectedDataset.rowCount) }}</dd></div>
              <div><dt>字段</dt><dd>{{ countLabel(selectedDataset.columnCount) }}</dd></div>
            </dl>
          </div>
        </section>

        <section class="surface">
          <div class="surface-header"><h2 class="surface-title">运行边界</h2></div>
          <div class="surface-body boundary-list">
            <span><ShieldCheck aria-hidden="true" />不接受 SQL、脚本或文件路径</span>
            <span><ShieldCheck aria-hidden="true" />只调用系统内置只读数据工具</span>
            <span><ShieldCheck aria-hidden="true" />步骤、调用次数和结果大小均有限制</span>
          </div>
        </section>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Database, ShieldCheck } from 'lucide-vue-next'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  createDataAnalysisTask,
  getDataAnalysisTask,
  updateDataAnalysisTask,
} from '@/api/analysis'
import { listAiConnections } from '@/api/aiConnections'
import { getDataset, listDatasets } from '@/api/datasets'
import { problemMessage } from '@/api/http'
import { startTaskRun } from '@/api/tasks'
import { listWorkspaces } from '@/api/workspaces'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useSubmissionLock } from '@/composables/useSubmissionLock'
import type {
  AiConnection,
  DataAnalysisOutputType,
  DataAnalysisTaskPayload,
  DataAnalysisTaskUpdatePayload,
  DatasetSheetSummary,
  DatasetSummary,
  Priority,
  Workspace,
} from '@/types/api'
import { createIdempotencyKey } from '@/utils/idempotency'
import { createLatestRequestGuard } from '@/utils/latestRequest'

const route = useRoute()
const router = useRouter()
const taskId = computed(() => Number(route.params.id))
const editing = computed(() => route.name === 'analysis-edit')
const formRef = ref<FormInstance>()
const loadError = ref('')
const workspaces = ref<Workspace[]>([])
const connections = ref<AiConnection[]>([])
const datasets = ref<DatasetSummary[]>([])
const sheets = ref<DatasetSheetSummary[]>([])
const datasetsLoading = ref(false)
const submission = useSubmissionLock()
const submitting = submission.submitting
const datasetRequest = createLatestRequestGuard()
let createRequestKey: string | null = null
let initializing = true

const form = reactive<{
  workspaceId?: number
  connectionId?: number
  datasetId?: number
  sheetId?: number
  title: string
  analysisGoal: string
  expectedOutputs: DataAnalysisOutputType[]
  priority: Priority
}>({
  title: '',
  analysisGoal: '',
  expectedOutputs: ['ANALYSIS_REPORT', 'CHART_SPEC'],
  priority: 'NORMAL',
})

const priorityOptions = [
  { label: '低', value: 'LOW' },
  { label: '普通', value: 'NORMAL' },
  { label: '高', value: 'HIGH' },
]

const rules: FormRules = {
  workspaceId: [{ required: true, message: '请选择工作区', trigger: 'change' }],
  connectionId: [{ required: true, message: '请选择 AI 连接', trigger: 'change' }],
  datasetId: [{ required: true, message: '请选择数据集', trigger: 'change' }],
  sheetId: [{ required: true, message: '请选择工作表', trigger: 'change' }],
  title: [
    { required: true, message: '请输入任务标题', trigger: 'blur' },
    { max: 120, message: '标题最多 120 个字符', trigger: 'blur' },
  ],
  analysisGoal: [
    { required: true, message: '请输入分析目标', trigger: 'blur' },
    { max: 2000, message: '分析目标最多 2000 个字符', trigger: 'blur' },
  ],
  expectedOutputs: [
    {
      type: 'array',
      min: 1,
      required: true,
      message: '至少选择一种输出',
      trigger: 'change',
    },
  ],
}

const selectedDataset = computed(() =>
  datasets.value.find((dataset) => dataset.id === form.datasetId),
)

function countLabel(value?: number | null): string {
  return value === undefined || value === null ? '—' : value.toLocaleString()
}

async function loadOptions(): Promise<void> {
  loadError.value = ''
  initializing = true
  try {
    const [workspaceResult, connectionResult, taskResult] = await Promise.all([
      listWorkspaces(),
      listAiConnections(1, 100, true),
      editing.value ? getDataAnalysisTask(taskId.value) : Promise.resolve(undefined),
    ])
    workspaces.value = workspaceResult
    connections.value = connectionResult.items.filter(
      (connection) => connection.enabled && connection.lastTestStatus === 'SUCCESS',
    )

    if (taskResult) {
      form.workspaceId = taskResult.workspaceId
      form.connectionId = taskResult.connectionId || undefined
      form.datasetId = taskResult.dataAnalysis.datasetId
      form.sheetId = taskResult.dataAnalysis.sheetId
      form.title = taskResult.title
      form.analysisGoal = taskResult.dataAnalysis.analysisGoal
      form.expectedOutputs = [...taskResult.dataAnalysis.expectedOutputs]
      form.priority = taskResult.priority
      await loadDatasets(taskResult.workspaceId, taskResult.dataAnalysis.datasetId)
    } else {
      form.workspaceId = workspaceResult[0]?.id
      form.connectionId = connections.value[0]?.id
      await loadDatasets(form.workspaceId)
      const queryDatasetId = Number(route.query.datasetId)
      if (datasets.value.some((dataset) => dataset.id === queryDatasetId)) {
        form.datasetId = queryDatasetId
      }
      await loadSheets(form.datasetId)
      const querySheetId = Number(route.query.sheetId)
      if (sheets.value.some((sheet) => sheet.id === querySheetId)) {
        form.sheetId = querySheetId
      } else {
        form.sheetId = sheets.value[0]?.id
      }
    }
  } catch (optionError) {
    loadError.value = problemMessage(optionError)
  } finally {
    initializing = false
  }
}

async function loadDatasets(
  workspaceId?: number,
  preserveDatasetId?: number,
): Promise<void> {
  const requestId = datasetRequest.begin()
  datasetsLoading.value = true
  if (!workspaceId) {
    datasets.value = []
    sheets.value = []
    datasetsLoading.value = false
    return
  }
  try {
    const result = await listDatasets({
      workspaceId,
      status: 'READY',
      page: 1,
      size: 100,
    })
    if (!datasetRequest.isCurrent(requestId)) return
    datasets.value = result.items
    if (preserveDatasetId && result.items.some((item) => item.id === preserveDatasetId)) {
      form.datasetId = preserveDatasetId
      await loadSheets(preserveDatasetId)
      return
    }
    form.datasetId = undefined
    form.sheetId = undefined
    sheets.value = []
  } catch (datasetError) {
    if (datasetRequest.isCurrent(requestId)) {
      datasets.value = []
      ElMessage.error(problemMessage(datasetError))
    }
  } finally {
    if (datasetRequest.isCurrent(requestId)) datasetsLoading.value = false
  }
}

async function loadSheets(datasetId?: number): Promise<void> {
  form.sheetId = undefined
  sheets.value = []
  if (!datasetId) return
  try {
    const detail = await getDataset(datasetId)
    if (form.datasetId !== datasetId && !initializing) return
    sheets.value = detail.sheets || []
    form.sheetId = sheets.value[0]?.id
  } catch (sheetError) {
    ElMessage.error(problemMessage(sheetError))
  }
}

function changeWorkspace(): void {
  form.datasetId = undefined
  form.sheetId = undefined
  sheets.value = []
  void loadDatasets(form.workspaceId)
}

function changeDataset(): void {
  void loadSheets(form.datasetId)
}

async function submit(startImmediately: boolean): Promise<void> {
  await submission.run(async () => {
    if (!(await formRef.value?.validate().catch(() => false))) return
    const payload: DataAnalysisTaskPayload = {
      workspaceId: form.workspaceId as number,
      connectionId: form.connectionId as number,
      datasetId: form.datasetId as number,
      sheetId: form.sheetId as number,
      title: form.title,
      analysisGoal: form.analysisGoal,
      expectedOutputs: form.expectedOutputs,
      priority: form.priority,
    }

    try {
      if (editing.value) {
        const updatePayload: DataAnalysisTaskUpdatePayload = {
          connectionId: payload.connectionId,
          datasetId: payload.datasetId,
          sheetId: payload.sheetId,
          title: payload.title,
          analysisGoal: payload.analysisGoal,
          expectedOutputs: payload.expectedOutputs,
          priority: payload.priority,
        }
        await updateDataAnalysisTask(taskId.value, updatePayload)
        ElMessage.success('数据分析任务已更新')
        await router.replace(`/analysis/tasks/${taskId.value}`)
        return
      }

      const task = await createDataAnalysisTask(
        payload,
        createRequestKey || (createRequestKey = createIdempotencyKey('analysis-task-create')),
      )
      createRequestKey = null
      if (!startImmediately) {
        ElMessage.success('数据分析任务已创建')
        await router.replace(`/analysis/tasks/${task.id}`)
        return
      }

      try {
        const run = await startTaskRun(task.id)
        ElMessage.success('任务已创建并进入运行队列')
        await router.replace(`/runs/${run.runId}`)
      } catch (startError) {
        ElMessage.warning(`任务已创建，但启动失败：${problemMessage(startError)}`)
        await router.replace(`/analysis/tasks/${task.id}`)
      }
    } catch (submitError) {
      ElMessage.error(problemMessage(submitError))
    }
  })
}

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
  grid-template-columns: minmax(0, 1fr) 310px;
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

.form-panel :deep(.el-select),
.form-panel :deep(.el-segmented) {
  width: 100%;
}

.output-options {
  display: flex;
  min-height: 32px;
  align-items: center;
  gap: 18px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 16px;
  border-top: 1px solid var(--ow-line-soft);
}

.dataset-summary {
  grid-template-columns: 1fr;
}

.boundary-list {
  display: grid;
  gap: 13px;
}

.boundary-list span {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--ow-ink-secondary);
}

.boundary-list svg {
  width: 16px;
  height: 16px;
  flex: none;
  margin-top: 2px;
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
