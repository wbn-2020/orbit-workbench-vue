<template>
  <div class="page">
    <PageHeader :title="`运行 #${id}`" description="实时状态以 AgentRun 快照为准，事件流只负责更新体验。" back>
      <template #actions>
        <StatusTag :value="run?.status || 'QUEUED'" />
        <el-button v-if="run && canPause" :icon="Pause" @click="pause">暂停</el-button>
        <el-button v-if="run && canResume" type="primary" :icon="Play" @click="resume">
          恢复
        </el-button>
        <el-button v-if="run && canCancel" type="danger" :icon="Square" @click="cancel">
          取消
        </el-button>
        <el-button v-if="run && canRetry" :icon="RefreshCw" @click="retry">
          重试
        </el-button>
        <el-button
          v-if="run?.successorRunId"
          type="primary"
          :icon="ExternalLink"
          @click="router.push(`/runs/${run.successorRunId}`)"
        >
          打开恢复运行
        </el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="initialError" :message="initialError" :retry="load" />
    <div v-else-if="loading" class="surface page-feedback"><el-skeleton :rows="8" animated /></div>
    <template v-else-if="run">
      <el-alert
        v-if="backgroundError"
        class="snapshot-warning"
        :title="backgroundError"
        type="warning"
        show-icon
        :closable="false"
      >
        <template #default>
          <el-button text @click="load">重试快照</el-button>
        </template>
      </el-alert>
      <div class="runtime-audit">
        <section class="surface">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">执行步骤</h2>
              <span class="surface-subtitle">{{ steps.length }} 个步骤</span>
            </div>
            <el-button text :icon="RefreshCw" :loading="auditLoading" @click="loadAudit">
              刷新
            </el-button>
          </div>
          <div v-if="auditLoading && steps.length === 0" class="audit-feedback">
            <el-skeleton :rows="4" animated />
          </div>
          <el-alert
            v-else-if="stepsError"
            class="audit-alert"
            :title="stepsError"
            type="error"
            show-icon
            :closable="false"
          />
          <EmptyState
            v-else-if="steps.length === 0"
            title="暂无步骤记录"
            description="单步骤旧运行可能没有独立步骤记录。"
            :icon="ListTree"
          />
          <div v-else class="step-list">
            <div v-for="step in steps" :key="step.id" class="step-row">
              <span class="step-index">{{ step.stepNumber }}</span>
              <span class="step-main">
                <strong>{{ step.title }}</strong>
                <small>{{ step.outputSummary || step.inputSummary || step.stepType }}</small>
              </span>
              <span class="step-time">
                {{ durationLabel(elapsedDuration(step.startedAt, step.finishedAt)) }}
              </span>
              <StatusTag :value="step.status" />
              <p v-if="step.errorSummary" class="error-text">{{ step.errorSummary }}</p>
            </div>
          </div>
        </section>

        <section class="surface">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">工具调用</h2>
              <span class="surface-subtitle">{{ toolCallTotal }} 次调用</span>
            </div>
          </div>
          <div v-if="auditLoading && toolCalls.length === 0" class="audit-feedback">
            <el-skeleton :rows="4" animated />
          </div>
          <el-alert
            v-else-if="toolCallsError"
            class="audit-alert"
            :title="toolCallsError"
            type="error"
            show-icon
            :closable="false"
          />
          <EmptyState
            v-else-if="toolCalls.length === 0"
            title="没有工具调用"
            description="技术学习或未进入工具步骤的运行不会产生 ToolCall。"
            :icon="Wrench"
          />
          <div v-else class="tool-list">
            <button
              v-for="call in toolCalls"
              :key="call.id"
              type="button"
              class="tool-row"
              @click="openToolCall(call.id)"
            >
              <Wrench aria-hidden="true" />
              <span>
                <strong>{{ call.toolName || call.toolCode }}</strong>
                <small>
                  {{ call.resultSummary || call.argumentsSummary || call.argumentSummary || '无摘要' }}
                </small>
              </span>
              <span class="step-time">{{ durationLabel(call.durationMs) }}</span>
              <StatusTag :value="call.status" />
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
      <div class="run-layout">
        <section class="surface timeline-panel">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">事件时间线</h2>
              <span class="surface-subtitle">{{ streamLabel }} · {{ sequenceLabel }}</span>
            </div>
            <el-button text :icon="RefreshCw" :loading="refreshing" @click="load">
              刷新快照
            </el-button>
          </div>
          <EmptyState v-if="timeline.length === 0" title="暂时没有事件" description="运行开始后，事件会按序号显示。" :icon="Activity" />
          <div v-else class="timeline">
            <div v-for="event in timeline" :key="`${event.sequence}-${event.type}`" class="timeline-item">
              <span class="timeline-marker" />
              <div class="timeline-content">
                <div class="timeline-head">
                  <strong>{{ eventLabel(event.type) }}</strong>
                  <span class="mono">#{{ event.sequence }}</span>
                  <time>{{ formatDateTime(event.occurredAt) }}</time>
                </div>
                <p v-if="eventText(event)" :class="{ 'is-output': event.type === 'output.text.delta' }">
                  {{ eventText(event) }}
                </p>
                <p v-if="eventErrorSummary(event)" class="error-text">{{ eventErrorSummary(event) }}</p>
              </div>
            </div>
          </div>
        </section>

        <aside class="run-side">
          <section class="surface">
            <div class="surface-header"><h2 class="surface-title">运行摘要</h2></div>
            <div class="surface-body">
              <dl class="detail-grid">
                <div><dt>任务</dt><dd>Task #{{ run.taskId }}</dd></div>
                <div><dt>当前步骤</dt><dd>{{ run.currentStep || '—' }}</dd></div>
                <div><dt>Agent</dt><dd>{{ run.agentDefinitionName || `#${run.agentDefinitionId ?? '—'}` }}</dd></div>
                <div><dt>Agent Version ID</dt><dd class="mono">{{ run.agentVersionId ?? '—' }}</dd></div>
                <div><dt>Agent 版本</dt><dd>{{ run.agentDefinitionVersion ? `v${run.agentDefinitionVersion}` : '—' }}</dd></div>
                <div><dt>Prompt 版本</dt><dd>{{ run.promptVersionNumber ? `v${run.promptVersionNumber}` : '—' }}</dd></div>
                <div><dt>开始时间</dt><dd>{{ formatDateTime(run.startedAt) }}</dd></div>
                <div><dt>结束时间</dt><dd>{{ formatDateTime(run.finishedAt) }}</dd></div>
              </dl>
              <div v-if="run.errorSummary" class="run-error">
                <strong>{{ run.errorCode || '运行失败' }}</strong>
                <p>{{ run.errorSummary }}</p>
              </div>
            </div>
          </section>

          <section class="surface output-panel">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">文本输出</h2>
                <span class="surface-subtitle">实时增量内容</span>
              </div>
              <span class="mono output-length">{{ outputText.length }} 字符</span>
            </div>
            <pre v-if="outputText" class="output-text">{{ outputText }}</pre>
            <EmptyState v-else title="暂时没有文本输出" :icon="FileText" />
          </section>

          <section v-if="run.modelCalls.length" class="surface">
            <div class="surface-header"><h2 class="surface-title">模型调用</h2></div>
            <div class="model-call-list">
              <div v-for="call in run.modelCalls" :key="call.id" class="model-call">
                <strong>{{ call.modelName || '模型调用' }}</strong>
                <span>{{ call.connectionName || '—' }} · {{ call.latencyMs ?? '—' }} ms</span>
                <StatusTag :value="call.status" />
              </div>
            </div>
          </section>
        </aside>
      </div>
    </template>

    <el-drawer
      v-model="toolDrawerOpen"
      title="ToolCall 详情"
      size="min(520px, 92vw)"
      destroy-on-close
    >
      <div v-if="toolDetailLoading" class="audit-feedback">
        <el-skeleton :rows="7" animated />
      </div>
      <el-alert
        v-else-if="toolDetailError"
        :title="toolDetailError"
        type="error"
        show-icon
        :closable="false"
      />
      <template v-else-if="selectedToolCall">
        <div class="tool-detail-head">
          <div>
            <strong>{{ selectedToolCall.toolName || selectedToolCall.toolCode }}</strong>
            <span>
              {{ selectedToolCall.toolCode }}
              ·
              {{ selectedToolCall.toolVersion ? `v${selectedToolCall.toolVersion}` : '内置版本' }}
            </span>
          </div>
          <StatusTag :value="selectedToolCall.status" />
        </div>
        <dl class="detail-grid tool-detail-grid">
          <div><dt>步骤 ID</dt><dd>{{ selectedToolCall.stepId ?? '—' }}</dd></div>
          <div><dt>耗时</dt><dd>{{ durationLabel(selectedToolCall.durationMs) }}</dd></div>
          <div><dt>开始时间</dt><dd>{{ formatDateTime(selectedToolCall.startedAt) }}</dd></div>
          <div><dt>结束时间</dt><dd>{{ formatDateTime(selectedToolCall.finishedAt) }}</dd></div>
        </dl>
        <section class="safe-summary">
          <h3>参数安全摘要</h3>
          <p>
            {{ selectedToolCall.argumentsSummary || selectedToolCall.argumentSummary || '无参数摘要' }}
          </p>
        </section>
        <section class="safe-summary">
          <h3>结果安全摘要</h3>
          <p>{{ selectedToolCall.resultSummary || '无结果摘要' }}</p>
        </section>
        <el-alert
          v-if="selectedToolCall.errorSummary"
          :title="selectedToolCall.errorSummary"
          :description="selectedToolCall.errorCode || undefined"
          type="error"
          show-icon
          :closable="false"
        />
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import {
  Activity,
  ChevronRight,
  ExternalLink,
  FileText,
  ListTree,
  Pause,
  Play,
  RefreshCw,
  Square,
  Wrench,
} from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  cancelAgentRun,
  getAgentRun,
  getToolCall,
  listAgentRunSteps,
  listAgentRunToolCalls,
  openRunEventStream,
  pauseAgentRun,
  resumeAgentRun,
  retryAgentRun,
} from '@/api/agentRuns'
import { getProblem, problemMessage } from '@/api/http'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type {
  AgentRunDetail,
  AgentRunStep,
  RunEvent,
  ToolCallDetail,
  ToolCallSummary,
} from '@/types/api'
import { formatDateTime } from '@/utils/format'
import {
  classifyRunEventSequence,
  runEventErrorSummary,
  runEventText,
} from '@/utils/runEvents'
import { canCancelRun, canRetryRun } from '@/utils/runState'

const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)
const loading = ref(true)
const refreshing = ref(false)
const initialError = ref('')
const backgroundError = ref('')
const run = ref<AgentRunDetail>()
const timeline = ref<RunEvent[]>([])
const outputText = ref('')
const steps = ref<AgentRunStep[]>([])
const toolCalls = ref<ToolCallSummary[]>([])
const toolCallTotal = ref(0)
const auditLoading = ref(false)
const stepsError = ref('')
const toolCallsError = ref('')
const toolDrawerOpen = ref(false)
const toolDetailLoading = ref(false)
const toolDetailError = ref('')
const selectedToolCall = ref<ToolCallDetail>()
const lastSequence = ref(0)
const snapshotLastSequence = ref(0)
const streamState = ref<
  'connecting' | 'connected' | 'recovering' | 'reconnecting' | 'closed'
>('connecting')
let eventSource: EventSource | null = null
let reconnectTimer: number | undefined
let snapshotRequestId = 0
let gapRecoveryAttempts = 0
let destroyed = false
let auditRequestId = 0
let toolDetailRequestId = 0

const canPause = computed(() => !run.value?.successorRunId && run.value?.status === 'RUNNING')
const canResume = computed(() => !run.value?.successorRunId && run.value?.status === 'PAUSED')
const canCancel = computed(() =>
  !run.value?.successorRunId && canCancelRun(run.value?.status),
)
const canRetry = computed(() =>
  !run.value?.successorRunId && canRetryRun(run.value?.status),
)
const streamLabel = computed(() => {
  if (streamState.value === 'connected') return '实时连接中'
  if (streamState.value === 'recovering') return '检测到序号缺口，正在补发'
  if (streamState.value === 'reconnecting') return '连接中断，自动重连中'
  if (streamState.value === 'closed') return '事件流已结束'
  return '正在连接事件流'
})
const sequenceLabel = computed(() =>
  snapshotLastSequence.value > lastSequence.value
    ? `已连续接收至序号 ${lastSequence.value}，快照最新序号 ${snapshotLastSequence.value}`
    : `已接收至序号 ${lastSequence.value}`,
)

function mergeEvent(event: RunEvent): void {
  if (destroyed) return
  const terminalEvent = ['run.completed', 'run.failed', 'run.cancelled'].includes(event.type)
  const decision = classifyRunEventSequence(lastSequence.value, event.sequence)
  if (decision === 'duplicate') {
    if (terminalEvent) closeStream()
    return
  }
  if (decision === 'gap') {
    recoverSequenceGap()
    return
  }

  timeline.value.push(event)
  lastSequence.value = event.sequence
  gapRecoveryAttempts = 0

  const text = eventText(event)
  if (text && event.type === 'output.text.delta') outputText.value += text

  if (run.value) {
    if (event.type === 'run.pause.requested') run.value.status = 'PAUSING'
    if (event.type === 'run.paused') run.value.status = 'PAUSED'
    if (event.type === 'run.resumed') {
      const successorRunId = event.data?.successorRunId
      if (typeof successorRunId === 'number') {
        run.value.successorRunId = successorRunId
      }
    }
    if (event.type === 'run.cancel.requested') run.value.status = 'CANCELLING'
    if (event.type === 'run.completed') run.value.status = 'SUCCEEDED'
    if (event.type === 'run.failed') run.value.status = 'FAILED'
    if (event.type === 'run.cancelled') run.value.status = 'CANCELLED'
  }

  if (
    [
      'run.step.started',
      'run.step.completed',
      'run.step.failed',
      'tool.call.requested',
      'tool.call.started',
      'tool.call.completed',
      'tool.call.failed',
      'tool.call.cancelled',
    ].includes(event.type)
  ) {
    void loadAudit()
  }

  if (terminalEvent) {
    closeStream()
    void load()
    void loadAudit()
  }
}

function closeStream(): void {
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = undefined
  }
  eventSource?.close()
  eventSource = null
  streamState.value = 'closed'
}

function eventText(event: RunEvent): string {
  return runEventText(event)
}

function eventErrorSummary(event: RunEvent): string {
  return runEventErrorSummary(event)
}

function eventLabel(type: string): string {
  const labels: Record<string, string> = {
    'run.started': '运行开始',
    'output.text.delta': '文本增量',
    'output.text.completed': '文本输出完成',
    'tool.call.started': '工具调用开始',
    'tool.call.arguments.delta': '工具参数增量',
    'tool.call.requested': '已请求工具调用',
    'tool.call.completed': '工具调用完成',
    'tool.call.failed': '工具调用失败',
    'tool.call.cancelled': '工具调用取消',
    'run.step.started': '步骤开始',
    'run.step.completed': '步骤完成',
    'run.step.failed': '步骤失败',
    'agent.step.planned': '步骤已规划',
    'agent.step.started': '步骤开始',
    'agent.step.completed': '步骤完成',
    'agent.step.failed': '步骤失败',
    'artifact.created': '成果已生成',
    'usage.updated': '用量更新',
    'run.completed': '运行完成',
    'run.failed': '运行失败',
    'run.cancelled': '运行取消',
    'run.pause.requested': '已请求暂停运行',
    'run.paused': '运行已暂停',
    'run.resumed': '已创建恢复运行',
    'run.cancel.requested': '已请求取消运行',
    'connection.tested': '连接测试完成',
  }
  return labels[type] || type
}

function durationLabel(value?: number | null): string {
  if (value === undefined || value === null) return '—'
  if (value < 1_000) return `${value} ms`
  return `${(value / 1_000).toFixed(1)} s`
}

function elapsedDuration(startedAt?: string | null, finishedAt?: string | null): number | undefined {
  if (!startedAt || !finishedAt) return undefined
  const start = new Date(startedAt).getTime()
  const finish = new Date(finishedAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(finish) || finish < start) return undefined
  return finish - start
}

async function loadAudit(): Promise<void> {
  const requestId = ++auditRequestId
  auditLoading.value = true
  stepsError.value = ''
  toolCallsError.value = ''
  const [stepResult, toolResult] = await Promise.allSettled([
    listAgentRunSteps(id),
    listAgentRunToolCalls(id, 1, 100),
  ])
  if (destroyed || requestId !== auditRequestId) return
  if (stepResult.status === 'fulfilled') steps.value = stepResult.value
  else stepsError.value = problemMessage(stepResult.reason)
  if (toolResult.status === 'fulfilled') {
    toolCalls.value = toolResult.value.items
    toolCallTotal.value = toolResult.value.total
  } else {
    toolCallsError.value = problemMessage(toolResult.reason)
  }
  auditLoading.value = false
}

async function openToolCall(toolCallId: number): Promise<void> {
  const requestId = ++toolDetailRequestId
  toolDrawerOpen.value = true
  toolDetailLoading.value = true
  toolDetailError.value = ''
  selectedToolCall.value = undefined
  try {
    const result = await getToolCall(toolCallId)
    if (requestId === toolDetailRequestId) selectedToolCall.value = result
  } catch (detailError) {
    if (requestId === toolDetailRequestId) {
      toolDetailError.value = problemMessage(detailError)
    }
  } finally {
    if (requestId === toolDetailRequestId) toolDetailLoading.value = false
  }
}

async function load(): Promise<void> {
  const requestId = ++snapshotRequestId
  if (!run.value) loading.value = true
  else refreshing.value = true
  if (!run.value) initialError.value = ''
  try {
    const snapshot = await getAgentRun(id)
    if (destroyed || requestId !== snapshotRequestId) return
    run.value = snapshot
    snapshotLastSequence.value = snapshot.lastSequence
    backgroundError.value = ''
  } catch (loadError) {
    if (destroyed || requestId !== snapshotRequestId) return
    if (run.value) {
      backgroundError.value = `运行快照刷新失败：${problemMessage(loadError)}`
    } else {
      initialError.value = problemMessage(loadError)
    }
  } finally {
    if (!destroyed && requestId === snapshotRequestId) {
      loading.value = false
      refreshing.value = false
    }
  }
}

function recoverSequenceGap(): void {
  gapRecoveryAttempts += 1
  scheduleReconnect(
    Math.min(100 * 2 ** (gapRecoveryAttempts - 1), 1_500),
    gapRecoveryAttempts > 3,
    'recovering',
  )
}

function connect(): void {
  if (destroyed) return
  eventSource?.close()
  streamState.value = 'connecting'
  const source = openRunEventStream(id, {
    afterSequence: lastSequence.value,
    onOpen: () => {
      if (destroyed || eventSource !== source) return
      streamState.value = 'connected'
    },
    onEvent: (event) => {
      if (destroyed || eventSource !== source) return
      mergeEvent(event)
    },
    onError: () => {
      if (destroyed || eventSource !== source) return
      source.close()
      eventSource = null
      scheduleReconnect(3_000, true, 'reconnecting')
    },
  })
  eventSource = source
}

function scheduleReconnect(
  delay: number,
  refreshSnapshot: boolean,
  state: 'recovering' | 'reconnecting',
): void {
  if (destroyed) return
  eventSource?.close()
  eventSource = null
  streamState.value = state
  if (reconnectTimer) return

  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = undefined
    if (destroyed) return
    const refresh = refreshSnapshot ? load() : Promise.resolve()
    void refresh.finally(() => {
      if (!destroyed && run.value) connect()
    })
  }, delay)
}

async function pause(): Promise<void> {
  try {
    const response = await pauseAgentRun(id)
    if (run.value) run.value.status = response.status
    ElMessage.success('暂停请求已提交')
  } catch (actionError) {
    await handleActionError(actionError)
  }
}

async function resume(): Promise<void> {
  try {
    const response = await resumeAgentRun(id)
    ElMessage.success('已创建恢复运行')
    await router.replace(`/runs/${response.runId}`)
  } catch (actionError) {
    await handleActionError(actionError)
  }
}

async function cancel(): Promise<void> {
  try {
    await ElMessageBox.confirm('取消后后台运行将停止，是否继续？', '确认取消', {
      type: 'warning',
      confirmButtonText: '取消运行',
      cancelButtonText: '保留运行',
    })
    const response = await cancelAgentRun(id)
    if (run.value) run.value.status = response.status
    ElMessage.success(response.status === 'CANCELLED' ? '运行已取消' : '取消请求已提交')
  } catch (actionError) {
    if (actionError === 'cancel') return
    await handleActionError(actionError)
  }
}

async function retry(): Promise<void> {
  try {
    const next = await retryAgentRun(id)
    ElMessage.success('已创建新的运行')
    await router.replace(`/runs/${next.runId}`)
  } catch (retryError) {
    await handleActionError(retryError)
  }
}

async function handleActionError(error: unknown): Promise<void> {
  const problem = getProblem(error)
  if (problem.status === 409 && problem.errorCode === 'STATE_CONFLICT') {
    await load()
    ElMessage.warning('运行状态已变化，已刷新当前状态')
    return
  }
  ElMessage.error(problem.detail || problem.title)
}

onMounted(async () => {
  await load()
  if (!destroyed && run.value) {
    void loadAudit()
    connect()
  }
})

onBeforeUnmount(() => {
  destroyed = true
  snapshotRequestId += 1
  auditRequestId += 1
  toolDetailRequestId += 1
  eventSource?.close()
  eventSource = null
  if (reconnectTimer) window.clearTimeout(reconnectTimer)
})
</script>

<style scoped>
.run-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
  align-items: start;
  gap: 16px;
}

.snapshot-warning {
  margin-bottom: 16px;
}

.runtime-audit {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.audit-feedback {
  padding: 16px;
}

.audit-alert {
  width: auto;
  margin: 12px 16px;
}

.step-list,
.tool-list {
  padding: 6px 8px 8px;
}

.step-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  min-height: 60px;
  padding: 9px 8px;
  border-bottom: 1px solid var(--ow-line-soft);
}

.step-index {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  color: var(--ow-primary-strong);
  background: var(--ow-primary-soft);
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
}

.step-main,
.tool-row > span:nth-child(2) {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.step-main small,
.tool-row small,
.step-time {
  overflow: hidden;
  color: var(--ow-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.step-row p {
  grid-column: 2 / -1;
  margin: 0;
}

.tool-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto auto 16px;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 60px;
  padding: 9px 8px;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--ow-line-soft);
  cursor: pointer;
}

.tool-row:hover {
  background: var(--ow-surface-raised);
}

.tool-row > svg {
  width: 16px;
  height: 16px;
  color: var(--ow-primary);
}

.tool-detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--ow-line-soft);
}

.tool-detail-head > div {
  display: grid;
  gap: 3px;
}

.tool-detail-head strong {
  font-size: 17px;
}

.tool-detail-head span {
  color: var(--ow-muted);
}

.tool-detail-grid {
  padding: 18px 0;
}

.safe-summary {
  margin-bottom: 16px;
  padding: 14px;
  background: var(--ow-surface);
  border: 1px solid var(--ow-line-soft);
  border-radius: var(--ow-radius-sm);
}

.safe-summary h3 {
  margin: 0 0 7px;
  font-size: 13px;
}

.safe-summary p {
  margin: 0;
  color: var(--ow-ink-secondary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.run-side {
  display: grid;
  gap: 16px;
}

.timeline {
  padding: 18px 18px 20px 22px;
}

.timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr);
  gap: 13px;
  min-height: 72px;
}

.timeline-item:not(:last-child)::before {
  position: absolute;
  top: 12px;
  bottom: -12px;
  left: 5px;
  width: 1px;
  content: "";
  background: var(--ow-line);
}

.timeline-marker {
  position: relative;
  z-index: 1;
  width: 11px;
  height: 11px;
  margin-top: 3px;
  background: var(--ow-primary);
  border: 3px solid var(--ow-primary-soft);
  border-radius: 50%;
}

.timeline-content {
  min-width: 0;
  padding-bottom: 14px;
}

.timeline-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}

.timeline-head strong {
  color: var(--ow-ink-secondary);
  font-size: 13px;
}

.timeline-head .mono,
.timeline-head time {
  color: var(--ow-muted);
  font-size: 11px;
}

.timeline-content p {
  margin: 6px 0 0;
  color: var(--ow-muted);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.timeline-content p.is-output {
  color: var(--ow-ink-secondary);
}

.run-error {
  margin-top: 18px;
  padding: 12px;
  color: var(--ow-danger);
  background: var(--ow-danger-soft);
  border: 1px solid oklch(0.45 0.09 25);
  border-radius: var(--ow-radius-sm);
}

.run-error p {
  margin: 4px 0 0;
  color: var(--ow-muted);
}

.output-length {
  color: var(--ow-muted);
  font-size: 11px;
}

.output-text {
  max-height: 440px;
  margin: 0;
  padding: 16px;
  overflow: auto;
  color: var(--ow-ink-secondary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
  font-size: 12px;
  line-height: 1.65;
}

.model-call-list {
  padding: 7px 8px 8px;
}

.model-call {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 10px;
  padding: 11px 8px;
  border-bottom: 1px solid var(--ow-line-soft);
}

.model-call:last-child {
  border-bottom: 0;
}

.model-call strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.model-call span {
  grid-column: 1;
  color: var(--ow-muted);
  font-size: 12px;
}

.model-call :deep(.el-tag) {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
}

@media (max-width: 950px) {
  .runtime-audit,
  .run-layout {
    grid-template-columns: 1fr;
  }
}
</style>
