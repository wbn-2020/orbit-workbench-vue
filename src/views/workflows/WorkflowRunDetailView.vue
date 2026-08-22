<template>
  <div class="page">
    <PageHeader :title="`Workflow 运行 #${id}`" description="查看节点运行记录、事件时间线和受控取消状态。" back>
      <template #actions>
        <StatusTag :value="run?.status || 'QUEUED'" />
        <el-button v-if="canCancel" type="danger" :icon="Square" @click="cancel">取消</el-button>
        <el-button :icon="RefreshCw" :loading="refreshing" @click="load">刷新</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="load" />
    <div v-else-if="loading" class="surface page-feedback"><el-skeleton :rows="9" animated /></div>
    <template v-else-if="run">
      <el-alert
        v-if="run.waitingReason"
        class="waiting-alert"
        :title="run.waitingReason"
        type="warning"
        show-icon
        :closable="false"
      />
      <div class="run-layout">
        <section class="surface">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">节点执行</h2>
              <span class="surface-subtitle">{{ run.nodeRuns.length }} 个节点运行记录</span>
            </div>
            <el-button text :icon="RefreshCw" :loading="eventsLoading" @click="loadEvents">刷新事件</el-button>
          </div>
          <EmptyState
            v-if="run.nodeRuns.length === 0"
            title="暂无节点运行记录"
            description="Workflow 开始执行后，节点状态会出现在这里。"
            :icon="GitBranch"
          />
          <div v-else class="node-run-list">
            <div v-for="node in run.nodeRuns" :key="node.id" class="node-run-row">
              <span class="node-marker">{{ node.nodeKey.slice(0, 1).toUpperCase() || 'N' }}</span>
              <div class="node-main">
                <strong>{{ node.nodeName || node.nodeKey }}</strong>
                <small>{{ node.nodeKey }} · 重试 {{ node.retryCount ?? 0 }} 次</small>
                <p v-if="node.errorSummary" class="error-text">{{ node.errorSummary }}</p>
                <p v-else-if="node.waitingReason" class="waiting-text">{{ node.waitingReason }}</p>
                <p v-else>{{ node.outputSummary || node.inputSummary || '暂无摘要' }}</p>
              </div>
              <StatusTag :value="node.status" />
            </div>
          </div>
        </section>

        <aside class="side-stack">
          <section class="surface">
            <div class="surface-header"><h2 class="surface-title">运行摘要</h2></div>
            <div class="surface-body">
              <dl class="detail-grid">
                <div><dt>Workflow ID</dt><dd>{{ run.workflowId ?? '—' }}</dd></div>
                <div><dt>WorkflowVersion ID</dt><dd class="mono">{{ run.workflowVersionId ?? '—' }}</dd></div>
                <div><dt>当前节点</dt><dd>{{ run.currentNodeName || run.currentNodeKey || '—' }}</dd></div>
                <div><dt>重试次数</dt><dd>{{ run.retryCount ?? 0 }}</dd></div>
                <div><dt>开始时间</dt><dd>{{ formatDateTime(run.startedAt || run.createdAt) }}</dd></div>
                <div><dt>结束时间</dt><dd>{{ formatDateTime(run.finishedAt) }}</dd></div>
                <div><dt>Trace ID</dt><dd class="mono">{{ run.traceId || '—' }}</dd></div>
              </dl>
              <div v-if="run.errorSummary" class="run-error">
                <strong>{{ run.errorCode || '运行失败' }}</strong>
                <p>{{ run.errorSummary }}</p>
              </div>
            </div>
          </section>

          <section class="surface">
            <div class="surface-header">
              <div>
                <h2 class="surface-title">事件时间线</h2>
                <span class="surface-subtitle">{{ events.length }} 条事件</span>
              </div>
            </div>
            <div v-if="eventsLoading && events.length === 0" class="section-feedback">
              <el-skeleton :rows="5" animated />
            </div>
            <el-alert
              v-else-if="eventsError"
              class="section-alert"
              :title="eventsError"
              type="error"
              show-icon
              :closable="false"
            />
            <EmptyState v-else-if="events.length === 0" title="暂无事件" description="运行开始后会记录事件。" :icon="Activity" />
            <div v-else class="timeline">
              <div v-for="event in events" :key="`${event.sequence}-${event.type}`" class="timeline-item">
                <span class="timeline-marker" />
                <div>
                  <div class="timeline-head">
                    <strong>{{ eventLabel(event.type) }}</strong>
                    <span class="mono">#{{ event.sequence }}</span>
                  </div>
                  <p>{{ event.text || event.summary || '无摘要' }}</p>
                  <time>{{ formatDateTime(event.occurredAt) }}</time>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  Activity,
  GitBranch,
  RefreshCw,
  Square,
} from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import {
  cancelWorkflowRun,
  getWorkflowRun,
  listWorkflowRunEvents,
} from '@/api/workflows'
import { getProblem, problemMessage } from '@/api/http'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { RunEvent, WorkflowRunDetail } from '@/types/api'
import { formatDateTime } from '@/utils/format'
import { canCancelRun } from '@/utils/runState'

const route = useRoute()
const id = Number(route.params.id)
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')
const run = ref<WorkflowRunDetail>()
const events = ref<RunEvent[]>([])
const eventsLoading = ref(false)
const eventsError = ref('')

const canCancel = computed(() => canCancelRun(run.value?.status))

function eventLabel(type: string): string {
  const labels: Record<string, string> = {
    'run.started': '运行开始',
    'run.step.started': '节点开始',
    'run.step.completed': '节点完成',
    'run.step.failed': '节点失败',
    'run.paused': '运行已暂停',
    'run.resumed': '运行已恢复',
    'run.completed': '运行完成',
    'run.failed': '运行失败',
    'run.cancelled': '运行取消',
    'output.text.delta': '文本增量',
    'output.text.completed': '文本完成',
    'artifact.created': '成果已生成',
  }
  return labels[type] || type
}

async function load(): Promise<void> {
  if (!Number.isFinite(id) || id <= 0) {
    error.value = 'Workflow Run ID 无效'
    loading.value = false
    return
  }
  if (run.value) refreshing.value = true
  else loading.value = true
  error.value = ''
  try {
    run.value = await getWorkflowRun(id)
    await loadEvents()
  } catch (loadError) {
    error.value = problemMessage(loadError)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function loadEvents(): Promise<void> {
  eventsLoading.value = true
  eventsError.value = ''
  try {
    events.value = await listWorkflowRunEvents(id, 0)
  } catch (loadError) {
    eventsError.value = problemMessage(loadError)
  } finally {
    eventsLoading.value = false
  }
}

async function cancel(): Promise<void> {
  try {
    await ElMessageBox.confirm('取消后后台运行将停止，是否继续？', '确认取消运行', {
      type: 'warning',
      confirmButtonText: '取消运行',
      cancelButtonText: '保留运行',
    })
    await command(() => cancelWorkflowRun(id), '取消请求已提交')
  } catch (actionError) {
    if (actionError !== 'cancel') ElMessage.error(problemMessage(actionError))
  }
}

async function command(
  request: () => Promise<{ status: WorkflowRunDetail['status'] }>,
  message: string,
): Promise<void> {
  try {
    const result = await request()
    if (run.value) run.value.status = result.status
    ElMessage.success(message)
    await load()
  } catch (actionError) {
    const problem = getProblem(actionError)
    ElMessage.error(problem.detail || problem.title)
  }
}

onMounted(() => load())
</script>

<style scoped>
.waiting-alert {
  margin-bottom: 16px;
}

.run-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  align-items: start;
  gap: 16px;
}

.side-stack {
  display: grid;
  gap: 16px;
}

.node-run-list {
  padding: 6px 8px 8px;
}

.node-run-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
  min-height: 74px;
  padding: 10px 8px;
  border-bottom: 1px solid var(--ow-line-soft);
}

.node-marker {
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  color: var(--ow-primary-strong);
  background: var(--ow-primary-soft);
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
}

.node-main {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.node-main small,
.node-main p,
.timeline-item p,
.timeline-item time {
  color: var(--ow-muted);
  font-size: 12px;
}

.node-main p,
.timeline-item p {
  margin: 3px 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.waiting-text {
  color: var(--ow-accent) !important;
}

.run-error {
  margin-top: 16px;
  padding: 11px;
  color: var(--ow-danger);
  background: var(--ow-danger-soft);
  border-radius: var(--ow-radius-sm);
}

.run-error p {
  margin: 4px 0 0;
  color: var(--ow-muted);
}

.section-alert {
  margin: 12px 16px;
}

.timeline {
  padding: 14px 16px 18px 20px;
}

.timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 11px minmax(0, 1fr);
  gap: 12px;
  min-height: 64px;
}

.timeline-item:not(:last-child)::before {
  position: absolute;
  top: 12px;
  bottom: -8px;
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
.timeline-item time {
  color: var(--ow-muted);
  font-size: 11px;
}

.timeline-item time {
  display: block;
  margin-top: 3px;
}

@media (max-width: 900px) {
  .run-layout {
    grid-template-columns: 1fr;
  }
}
</style>
