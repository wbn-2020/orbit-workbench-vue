<template>
  <div class="page reports-page">
    <PageHeader
      title="我的报告中心"
      description="这里只做一件事：把真实生成过的面试报告列出来、按同一评分规则看趋势、并排比较两份报告。没有把握的数据一律显示为缺失，不补猜。"
    >
      <template #actions>
        <el-button :icon="RefreshCw" :loading="loading || summaryLoading" @click="reload()">
          刷新
        </el-button>
        <el-button type="primary" :icon="Plus" @click="router.push('/interviews/new')">
          去面试
        </el-button>
      </template>
    </PageHeader>

    <section class="surface">
      <div class="surface-body filters">
        <div class="filter-group">
          <span class="filter-label">时间窗</span>
          <div class="ow-seg">
            <button
              v-for="window in DAY_WINDOWS"
              :key="`day-${window.value ?? 'all'}`"
              type="button"
              :class="{ on: days === window.value }"
              @click="applyDays(window.value)"
            >
              {{ window.label }}
            </button>
          </div>
        </div>
        <label class="filter-group">
          <span class="filter-label">题材</span>
          <el-select v-model="topicMode" clearable placeholder="全部题材" @change="loadList()">
            <el-option v-for="mode in TOPIC_MODES" :key="mode.value" :label="mode.label" :value="mode.value" />
          </el-select>
        </label>
        <label class="filter-group">
          <span class="filter-label">形式</span>
          <el-select v-model="form" clearable placeholder="全部形式" @change="loadList()">
            <el-option label="专项训练" value="TRAINING" />
            <el-option label="正式模拟" value="FORMAL" />
          </el-select>
        </label>
        <label class="filter-group">
          <span class="filter-label">录用建议</span>
          <el-select v-model="recommendation" clearable placeholder="全部建议" @change="loadList()">
            <el-option
              v-for="item in RECOMMENDATIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </label>
        <div class="filter-spacer" />
        <el-button text :icon="FilterX" :disabled="!filtersActive" @click="resetFilters">
          清空筛选
        </el-button>
      </div>
    </section>

    <section class="surface">
      <div class="surface-head">
        <h2>分数趋势</h2>
        <el-select
          v-if="summary && summary.versions.length > 1"
          v-model="trendVersion"
          class="version-pick"
          placeholder="选择评分规则版本"
          @change="loadSummary"
        >
          <el-option
            v-for="version in summary.versions"
            :key="version.ruleVersion"
            :label="`${version.ruleVersion}（${version.sampleCount} 份）`"
            :value="version.ruleVersion"
          />
        </el-select>
      </div>
      <div v-if="summaryLoading" class="surface-body"><el-skeleton :rows="3" animated /></div>
      <ErrorState v-else-if="summaryError" :message="summaryError" :retry="loadSummary" />
      <div v-else-if="summary && summary.versions.length === 0" class="surface-body">
        <p class="missing">
          当前还没有一份记录了评分规则版本的报告，趋势无法计算。评分规则版本自 V30 起随报告生成写入，
          之前的历史报告不回填——把它们混进同一条曲线会得出没有意义的「进步」。
        </p>
      </div>
      <div v-else-if="summary" class="surface-body trend-body">
        <div class="trend-meta">
          <span class="ow-tag blue">规则版本 {{ summary.ruleVersion }}</span>
          <span class="ow-tag gray">样本 {{ summary.sampleCount }} 份</span>
          <span class="muted">
            只统计同一评分规则版本的已完成报告；趋势随时间窗变化，题材/形式/建议筛选只作用于下方列表
          </span>
        </div>
        <p v-if="!summary.renderable" class="missing">
          同一规则版本只有 {{ summary.sampleCount }} 份报告，少于 {{ summary.minTrendSamples }} 份时不绘制趋势线。
          样本过少时折线的形状几乎完全由个别波动决定，画出来会误导。
        </p>
        <div v-else class="trend-chart">
          <svg :viewBox="`0 0 ${chart.width} ${chart.height}`" role="img" aria-label="总分随生成时间的变化">
            <line
              v-for="grid in chart.grid"
              :key="`grid-${grid.y}`"
              :x1="chart.pad"
              :x2="chart.width - chart.pad"
              :y1="grid.y"
              :y2="grid.y"
              class="grid"
            />
            <polyline :points="chart.line" class="series" />
            <circle v-for="point in chart.dots" :key="point.key" :cx="point.x" :cy="point.y" r="3.5" class="dot" />
          </svg>
          <div class="chart-axis">
            <span>{{ shortTime(summary.scoreSeries[0]?.generatedAt) }}
              → {{ shortTime(summary.scoreSeries[summary.scoreSeries.length - 1]?.generatedAt) }}</span>
            <span>纵轴 {{ chart.low }}–{{ chart.high }} 分（每点一份报告）</span>
          </div>
        </div>
        <div v-if="summary.dimensions.length" class="dim-avg">
          <div v-for="dimension in summary.dimensions" :key="dimension.name" class="dim">
            <div class="name">{{ dimension.name }}</div>
            <div class="track"><i :style="{ width: `${dimension.average}%` }" /></div>
            <div class="score">{{ dimension.average }}</div>
            <div class="sample">{{ dimension.sampleCount }} 份有分</div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="loading" class="surface"><div class="surface-body"><el-skeleton :rows="8" animated /></div></div>
    <ErrorState v-else-if="listError" :message="listError" :retry="loadList" />
    <section v-else-if="reports.length === 0" class="surface">
      <EmptyState
        :icon="FileBarChart"
        :title="filtersActive ? '当前筛选条件下没有报告' : '还没有面试报告'"
        :description="filtersActive
          ? '换一个时间窗或清空筛选再看。报告只按你自己的账号过滤，不会借到别人的数据。'
          : '完成一场模拟面试并让它生成报告后，报告会出现在这里。'"
      >
        <el-button v-if="filtersActive" @click="resetFilters">清空筛选</el-button>
        <el-button v-else type="primary" :icon="Plus" @click="router.push('/interviews/new')">
          创建第一场面试
        </el-button>
      </EmptyState>
    </section>

    <section v-else class="surface">
      <div class="surface-head">
        <h2>报告列表</h2>
        <span class="muted">共 {{ total }} 份，当前第 {{ page }} / {{ pageCount }} 页</span>
      </div>
      <div class="ow-tlist">
        <div v-for="report in reports" :key="report.reportId" class="ow-titem rep-row">
          <label class="pick" :title="compareBlockReason(report)">
            <input
              type="checkbox"
              :checked="selected.includes(report.reportId)"
              :disabled="selected.length >= 2 && !selected.includes(report.reportId)"
              @change="toggleCompare(report, $event)"
            />
          </label>
          <div class="score-ring" :style="{ '--score': `${(report.totalScore ?? 0) * 3.6}deg` }">
            <span>{{ report.totalScore ?? '—' }}</span>
          </div>
          <div class="grow">
            <div class="tt">{{ report.sessionTitle }}</div>
            <div class="ow-tm">
              {{ topicModeLabel(report.topicMode ?? '') }} · {{ formLabel(report.form) }} ·
              {{ roundLabel(report.round) }} · {{ shortTime(report.generatedAt ?? report.createdAt) }}
            </div>
            <div v-if="report.reportStatus !== 'REPORT_READY'" class="status-line">
              <span class="ow-tag orange">{{ reportStatusText(report.reportStatus) }}</span>
              <span class="muted">{{ report.failureReason || '报告尚未生成完成，可回到会话重试。' }}</span>
            </div>
          </div>
          <div class="meta-col">
            <span class="ow-tag" :class="recommendationClass(report.hiringRecommendation)">
              {{ recommendationLabel(report.hiringRecommendation) }}
            </span>
            <span class="rule-chip" :class="{ missing: !report.scoringRuleVersion }">
              {{ report.scoringRuleVersion || '未记录规则版本' }}
            </span>
            <span class="muted small">
              {{ report.dimensionCount > 0
                ? `${report.dimensionCount} 个维度 · 均分 ${report.dimensionAverage}`
                : '无维度分' }}
            </span>
          </div>
          <el-button size="small" text :icon="Eye" @click="router.push(`/interviews/${report.sessionId}/report`)">
            查看
          </el-button>
        </div>
      </div>
      <div class="pager">
        <el-button size="small" :disabled="page <= 1" @click="goPage(page - 1)">上一页</el-button>
        <span class="muted">第 {{ page }} 页 / 共 {{ pageCount }} 页</span>
        <el-button size="small" :disabled="page >= pageCount" @click="goPage(page + 1)">下一页</el-button>
      </div>
    </section>

    <section v-if="reports.length > 0" class="surface">
      <div class="surface-head">
        <h2>并排比较</h2>
        <span class="muted">勾选两份报告，只有评分规则版本相同才允许并列</span>
      </div>
      <div class="surface-body">
        <p v-if="compareBlocked" class="missing" role="note">{{ compareBlocked }}</p>
        <div v-if="pair.length === 2" class="compare">
          <div v-for="report in pair" :key="`cmp-${report.reportId}`" class="ow-card">
            <div class="ow-card-h">{{ report.sessionTitle }} · {{ report.totalScore ?? '—' }} 分</div>
            <div class="ow-card-b">
              <p class="muted small">
                规则版本 {{ report.scoringRuleVersion }} · {{ shortTime(report.generatedAt ?? null) }} ·
                {{ modelName(report.reportId) }}
              </p>
              <div v-for="name in compareRows" :key="name" class="dim">
                <div class="name">{{ name }}</div>
                <div class="track"><i :style="{ width: `${valueFor(report.reportId, name)}%` }" /></div>
                <div class="score">{{ valueFor(report.reportId, name) || '—' }}</div>
              </div>
              <p v-if="detailLoading" class="muted small">维度分明细加载中…</p>
            </div>
          </div>
        </div>
        <p v-else class="missing">
          {{ pair.length === 1 ? '再勾选一份规则版本相同的报告即可比较。' : '勾选 2 份报告后在此并列维度分。' }}
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Eye, FileBarChart, FilterX, Plus, RefreshCw } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { TOPIC_MODES } from '@/api/interview'
import { getReportDetail, getReportSummary, listReports } from '@/api/reports'
import { problemMessage } from '@/api/http'
import { topicModeLabel } from '@/api/interviewers'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'

import type { ReportDetail, ReportListItem, ReportSummary } from '@/types/api'

const router = useRouter()

// 后端只接受 7 / 30 / 90 三个窗口（非法值返回 400），筛选项因此固定而不是自由输入日期。
const DAY_WINDOWS: { value: number | null; label: string }[] = [
  { value: null, label: '全部' },
  { value: 7, label: '近 7 天' },
  { value: 30, label: '近 30 天' },
  { value: 90, label: '近 90 天' },
]
const RECOMMENDATIONS = [
  { value: 'STRONG_PASS', label: '强烈通过' },
  { value: 'PASS', label: '通过' },
  { value: 'HOLD', label: '待定' },
  { value: 'FAIL', label: '不通过' },
]
const SIZE = 10

const reports = ref<ReportListItem[]>([])
const total = ref(0)
const page = ref(1)
const days = ref<number | null>(null)
const topicMode = ref<string | undefined>()
const form = ref<string | undefined>()
const recommendation = ref<string | undefined>()
const loading = ref(true)
const listError = ref('')

const summary = ref<ReportSummary | null>(null)
const trendVersion = ref<string | undefined>()
const summaryLoading = ref(true)
const summaryError = ref('')

const selected = ref<number[]>([])
const details = ref<Record<number, ReportDetail>>({})
const detailLoading = ref(false)
const compareBlocked = ref('')

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / SIZE)))
const filtersActive = computed(() => days.value !== null
  || Boolean(topicMode.value || form.value || recommendation.value))
const pair = computed(() => reports.value.filter((report) => selected.value.includes(report.reportId)))

const chart = computed(() => {
  const points = summary.value?.scoreSeries ?? []
  const width = 520
  const height = 150
  const pad = 26
  if (points.length === 0) {
    return { width, height, pad, line: '', dots: [], grid: [], low: 0, high: 100 }
  }
  const scores = points.map((point) => point.totalScore)
  const low = Math.min(...scores)
  const high = Math.max(...scores)
  const span = Math.max(high - low, 1)
  const stepX = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0
  const dots = points.map((point, index) => ({
    key: `${point.reportId}-${index}`,
    x: pad + index * stepX,
    y: height - pad - ((point.totalScore - low) / span) * (height - pad * 2),
  }))
  return {
    width,
    height,
    pad,
    low,
    high,
    line: dots.map((dot) => `${dot.x},${dot.y}`).join(' '),
    dots,
    grid: [height - pad, (height - pad * 2) / 2 + pad / 2, pad].map((y) => ({ y: Math.round(y) })),
  }
})

const compareRows = computed(() => {
  const names = new Set<string>()
  pair.value.forEach((report) => {
    Object.keys(details.value[report.reportId]?.dimensionScores ?? {}).forEach((name) => names.add(name))
  })
  return [...names].sort((left, right) => left.localeCompare(right, 'zh-CN'))
})

function formLabel(value: string | null | undefined): string {
  if (value === 'FORMAL') return '正式模拟'
  return value === 'TRAINING' ? '专项训练' : '形式未记录'
}

function roundLabel(value: string | null | undefined): string {
  const map: Record<string, string> = { FIRST: '一面', SECOND: '二面', THIRD: '三面' }
  return map[value ?? ''] ?? '轮次未记录'
}

function recommendationLabel(value: string | null | undefined): string {
  return RECOMMENDATIONS.find((item) => item.value === value)?.label ?? '建议未生成'
}

function recommendationClass(value: string | null | undefined): string {
  if (value === 'STRONG_PASS' || value === 'PASS') return 'green'
  if (value === 'FAIL') return 'red'
  return 'orange'
}

function reportStatusText(status: string): string {
  const map: Record<string, string> = {
    REPORT_PENDING: '报告生成中', REPORT_FAILED: '报告生成失败', REPORT_READY: '已完成',
  }
  return map[status] ?? status
}

function shortTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function modelName(reportId: number): string {
  return details.value[reportId]?.aiModelSnapshot ?? '模型未记录'
}

function valueFor(reportId: number, name: string): number {
  return details.value[reportId]?.dimensionScores[name] ?? 0
}

async function loadList(): Promise<void> {
  loading.value = true
  listError.value = ''
  try {
    const data = await listReports({
      days: days.value,
      topicMode: topicMode.value ?? null,
      form: form.value ?? null,
      recommendation: recommendation.value ?? null,
      page: page.value,
      size: SIZE,
    })
    reports.value = data.items
    total.value = data.total
    page.value = data.page
    // 换页或换筛选后原来勾选的报告可能已经不在列表里，比较对随之作废。
    selected.value = selected.value.filter((id) => data.items.some((item) => item.reportId === id))
  } catch (error) {
    listError.value = problemMessage(error)
  } finally {
    loading.value = false
  }
}

async function loadSummary(): Promise<void> {
  summaryLoading.value = true
  summaryError.value = ''
  try {
    summary.value = await getReportSummary(days.value, trendVersion.value ?? null)
    if (!trendVersion.value) trendVersion.value = summary.value.ruleVersion ?? undefined
  } catch (error) {
    summaryError.value = problemMessage(error)
  } finally {
    summaryLoading.value = false
  }
}

function applyDays(value: number | null): void {
  days.value = value
  page.value = 1
  void loadList()
  void loadSummary()
}

function resetFilters(): void {
  days.value = null
  topicMode.value = undefined
  form.value = undefined
  recommendation.value = undefined
  page.value = 1
  void loadList()
  void loadSummary()
}

function goPage(target: number): void {
  page.value = Math.min(Math.max(1, target), pageCount.value)
  void loadList()
}

async function toggleCompare(report: ReportListItem, event: Event): Promise<void> {
  compareBlocked.value = ''
  const box = event.target as HTMLInputElement
  if (selected.value.includes(report.reportId)) {
    selected.value = selected.value.filter((id) => id !== report.reportId)
  } else {
    const reason = compareBlockReason(report)
    if (reason) {
      compareBlocked.value = reason
    } else {
      selected.value = selected.value.length >= 2 ? [report.reportId] : [...selected.value, report.reportId]
      await ensureDetail(report.reportId)
    }
  }
  // :checked 只在绑定值变化时回写 DOM；被拦下时状态没变，必须自己把勾选拨回去。
  box.checked = selected.value.includes(report.reportId)
}

/** 比较与趋势同口径：没记录规则版本的报告一律不参与，跨版本并列则说明原因。 */
function compareBlockReason(report: ReportListItem): string {
  if (!report.scoringRuleVersion) {
    return `《${report.sessionTitle}》生成时还没有记录评分规则版本，无法判断它和别的报告是否按同一套规则打分，因此不参与比较。`
  }
  const other = pair.value.find((item) => item.reportId !== report.reportId)
  if (other && other.scoringRuleVersion !== report.scoringRuleVersion) {
    return `评分规则不同不能并列比较：《${other.sessionTitle}》是 ${other.scoringRuleVersion}，《${report.sessionTitle}》是 ${report.scoringRuleVersion}。两张分数的打分口径不一样。`
  }
  if (report.reportStatus !== 'REPORT_READY') {
    return `《${report.sessionTitle}》的报告状态是「${reportStatusText(report.reportStatus)}」，还没有可用分数。`
  }
  return ''
}

async function ensureDetail(reportId: number): Promise<void> {
  if (details.value[reportId]) return
  detailLoading.value = true
  try {
    const detail = await getReportDetail(reportId)
    details.value = { ...details.value, [reportId]: detail }
  } catch (error) {
    compareBlocked.value = problemMessage(error)
  } finally {
    detailLoading.value = false
  }
}

async function reload(): Promise<void> {
  await Promise.all([loadList(), loadSummary()])
}

onMounted(reload)
</script>

<style scoped>
.reports-page {
  display: grid;
  gap: 18px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 14px 18px;
}

.filter-group {
  display: grid;
  gap: 6px;
  min-width: 150px;
}

.filter-label {
  color: var(--ow-muted);
  font-size: 12px;
  font-weight: 700;
}

.filter-spacer {
  flex: 1 1 auto;
}

.surface-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px 0;
}

.surface-head h2 {
  margin: 0;
  font-size: 15px;
}

.version-pick {
  width: 220px;
}

.trend-body {
  display: grid;
  gap: 14px;
}

.trend-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.trend-chart {
  position: relative;
  display: grid;
  gap: 4px;
}

.trend-chart svg {
  width: 100%;
  height: 150px;
}

.trend-chart .grid {
  stroke: var(--line-2);
  stroke-width: 1;
}

.trend-chart .series {
  fill: none;
  stroke: var(--brand);
  stroke-width: 2;
}

.trend-chart .dot {
  fill: var(--brand-700);
}

.chart-axis {
  display: flex;
  justify-content: space-between;
  color: var(--ow-muted);
  font-size: 12px;
}

.missing {
  margin: 0;
  padding: 12px 14px;
  color: var(--ink-2);
  background: var(--surface-2);
  border-left: 3px solid var(--line-2);
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.7;
}

.dim-avg {
  display: grid;
  gap: 8px;
}

.rep-row {
  align-items: center;
}

.grow {
  flex: 1;
  min-width: 0;
}

.status-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.pick input {
  width: 16px;
  height: 16px;
  accent-color: var(--brand);
}

.meta-col {
  display: grid;
  flex: none;
  gap: 5px;
  justify-items: end;
  text-align: right;
}

.rule-chip {
  color: var(--brand-700);
  background: var(--brand-50);
  border-radius: 5px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  padding: 1px 6px;
}

.rule-chip.missing {
  color: var(--ow-muted);
  background: var(--surface-2);
  font-family: inherit;
}

.score-ring {
  display: grid;
  width: 46px;
  height: 46px;
  flex: none;
  place-items: center;
  border-radius: 50%;
  background: conic-gradient(var(--brand) var(--score), var(--line-2) 0);
}

.score-ring span {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  color: var(--brand-700);
  background: var(--surface);
  border-radius: 50%;
  font-size: 13px;
  font-weight: 800;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 14px 18px;
}

.compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.dim {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.dim .name {
  width: 96px;
  flex: 0 0 96px;
  color: var(--ink-2);
  font-size: 13px;
  font-weight: 600;
}

.dim .track {
  flex: 1;
  height: 9px;
  background: var(--line-2);
  border-radius: 6px;
  overflow: hidden;
}

.dim .track i {
  display: block;
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--brand), #6aa6ff);
}

.dim .score {
  width: 34px;
  flex: 0 0 34px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 800;
  text-align: right;
}

.dim .sample {
  width: 74px;
  flex: 0 0 74px;
  color: var(--ow-muted);
  font-size: 11px;
}

.muted {
  color: var(--ow-muted);
}

.small {
  font-size: 12px;
}

@media (max-width: 820px) {
  .compare {
    grid-template-columns: 1fr;
  }

  .rep-row {
    flex-wrap: wrap;
  }

  .meta-col {
    flex-basis: 100%;
    justify-items: start;
    text-align: left;
  }
}
</style>
