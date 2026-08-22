<template>
  <div class="page">
    <PageHeader title="模型调用统计" description="统计由服务端基于 ModelCall 聚合，不对列表结果二次汇总。">
      <template #actions>
        <el-button :icon="Bot" @click="router.push('/settings/agents')">
          Agent 与 Prompt 版本
        </el-button>
      </template>
    </PageHeader>

    <section class="surface filters">
      <el-select
        v-model="workspaceId"
        placeholder="选择工作区"
        :disabled="workspaces.length === 0"
        @change="load"
      >
        <el-option
          v-for="workspace in workspaces"
          :key="workspace.id"
          :label="workspace.name"
          :value="workspace.id"
        />
      </el-select>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        :clearable="false"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        @change="load"
      />
      <el-button :icon="RefreshCw" :loading="loading" @click="load">刷新</el-button>
    </section>

    <ErrorState
      v-if="error"
      class="page-section"
      :message="error"
      :retry="workspaceId ? load : initialize"
    />
    <div v-else-if="loading" class="surface page-feedback page-section">
      <el-skeleton :rows="10" animated />
    </div>
    <template v-else-if="statistics">
      <section class="metric-grid page-section">
        <div class="surface metric">
          <span>调用次数</span><strong>{{ numberLabel(statistics.summary.callCount) }}</strong>
        </div>
        <div class="surface metric">
          <span>成功 / 失败</span>
          <strong>{{ numberLabel(statistics.summary.successCount) }} / {{ numberLabel(statistics.summary.failureCount) }}</strong>
        </div>
        <div class="surface metric">
          <span>平均延迟</span><strong>{{ numberLabel(statistics.summary.averageLatencyMs) }} ms</strong>
        </div>
        <div class="surface metric">
          <span>输入 Token</span><strong>{{ numberLabel(statistics.summary.inputTokens) }}</strong>
        </div>
        <div class="surface metric">
          <span>输出 Token</span><strong>{{ numberLabel(statistics.summary.outputTokens) }}</strong>
        </div>
      </section>

      <section class="chart-grid page-section">
        <div class="surface chart-panel">
          <div class="surface-header">
            <h2 class="surface-title">每日调用趋势</h2>
          </div>
          <div class="surface-body">
            <EmptyState
              v-if="statistics.byDay.length === 0"
              title="所选时间没有调用数据"
              :icon="ChartNoAxesCombined"
            />
            <ChartSpecViewer v-else :spec="dailyChartSpec" aria-label="每日模型调用趋势" />
          </div>
        </div>

        <div class="surface chart-panel">
          <div class="surface-header">
            <h2 class="surface-title">按 Connection</h2>
          </div>
          <div class="surface-body">
            <EmptyState
              v-if="statistics.byConnection.length === 0"
              title="没有 Connection 统计"
              :icon="ChartNoAxesCombined"
            />
            <ChartSpecViewer
              v-else
              :spec="connectionChartSpec"
              aria-label="按 AI Connection 的调用统计"
            />
          </div>
        </div>
      </section>

      <section class="surface page-section">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">模型明细</h2>
            <span class="surface-subtitle">{{ statistics.byModel.length }} 个模型</span>
          </div>
        </div>
        <EmptyState
          v-if="statistics.byModel.length === 0"
          title="没有模型统计"
          :icon="Bot"
        />
        <div v-else class="table-wrap">
          <el-table :data="statistics.byModel">
            <el-table-column label="模型" min-width="220">
              <template #default="{ row }">{{ row.modelName || row.name || row.key || '未知模型' }}</template>
            </el-table-column>
            <el-table-column prop="callCount" label="调用" width="100" />
            <el-table-column prop="successCount" label="成功" width="100" />
            <el-table-column prop="failureCount" label="失败" width="100" />
            <el-table-column label="输入 Token" width="130">
              <template #default="{ row }">{{ numberLabel(row.inputTokens) }}</template>
            </el-table-column>
            <el-table-column label="输出 Token" width="130">
              <template #default="{ row }">{{ numberLabel(row.outputTokens) }}</template>
            </el-table-column>
            <el-table-column label="平均延迟" width="130">
              <template #default="{ row }">{{ numberLabel(row.averageLatencyMs) }} ms</template>
            </el-table-column>
          </el-table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Bot, ChartNoAxesCombined, RefreshCw } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { problemMessage } from '@/api/http'
import { getModelUsageStatistics } from '@/api/statistics'
import { listWorkspaces } from '@/api/workspaces'
import ChartSpecViewer from '@/components/ChartSpecViewer.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import type { ModelUsageStatistics, UsageBreakdown, Workspace } from '@/types/api'
import { createLatestRequestGuard } from '@/utils/latestRequest'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const statistics = ref<ModelUsageStatistics>()
const workspaces = ref<Workspace[]>([])
const workspaceId = ref<number>()
const dateRange = ref<[string, string]>(defaultDateRange())
const request = createLatestRequestGuard()

function localDate(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function defaultDateRange(): [string, string] {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 29)
  return [localDate(from), localDate(to)]
}

function numberLabel(value?: number | null): string {
  return (value || 0).toLocaleString()
}

function rowName(row: UsageBreakdown): string {
  return row.connectionName || row.modelName || row.name || row.key || '未知'
}

const dailyChartSpec = computed(() => ({
  title: { text: '调用量与失败量' },
  tooltip: { trigger: 'axis' },
  legend: { show: true },
  dataset: {
    source: [
      ['date', 'callCount', 'failureCount'],
      ...(statistics.value?.byDay || []).map((row) => [
        row.date || row.key || '',
        row.callCount,
        row.failureCount,
      ]),
    ],
  },
  xAxis: { type: 'category' },
  yAxis: { type: 'value', name: '调用次数' },
  series: [
    { type: 'line', name: '调用', smooth: true, encode: { x: 'date', y: 'callCount' } },
    { type: 'bar', name: '失败', encode: { x: 'date', y: 'failureCount' } },
  ],
}))

const connectionChartSpec = computed(() => ({
  title: { text: 'Connection 调用量' },
  tooltip: { trigger: 'axis' },
  legend: { show: false },
  dataset: {
    source: [
      ['connection', 'callCount'],
      ...(statistics.value?.byConnection || []).map((row) => [
        rowName(row),
        row.callCount,
      ]),
    ],
  },
  xAxis: { type: 'category' },
  yAxis: { type: 'value', name: '调用次数' },
  series: [{ type: 'bar', name: '调用', encode: { x: 'connection', y: 'callCount' } }],
}))

async function load(): Promise<void> {
  if (!workspaceId.value) {
    error.value = '请选择工作区'
    statistics.value = undefined
    loading.value = false
    return
  }
  const requestId = request.begin()
  loading.value = true
  error.value = ''
  try {
    const result = await getModelUsageStatistics(
      workspaceId.value,
      dateRange.value[0],
      dateRange.value[1],
    )
    if (request.isCurrent(requestId)) statistics.value = result
  } catch (loadError) {
    if (request.isCurrent(requestId)) error.value = problemMessage(loadError)
  } finally {
    if (request.isCurrent(requestId)) loading.value = false
  }
}

async function initialize(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    workspaces.value = await listWorkspaces()
    if (
      !workspaceId.value
      || !workspaces.value.some((workspace) => workspace.id === workspaceId.value)
    ) {
      workspaceId.value = workspaces.value[0]?.id
    }
    if (!workspaceId.value) {
      error.value = '没有可用工作区'
      loading.value = false
      return
    }
  } catch (workspaceError) {
    error.value = problemMessage(workspaceError)
    loading.value = false
    return
  }
  await load()
}

onMounted(() => initialize())
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
  width: 200px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.metric {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
}

.metric span {
  color: var(--ow-muted);
  font-size: 12px;
}

.metric strong {
  font-size: 20px;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.chart-panel {
  min-width: 0;
}

@media (max-width: 1100px) {
  .metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 850px) {
  .chart-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .filters .el-select,
  .filters :deep(.el-date-editor),
  .filters .el-button {
    width: 100%;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
