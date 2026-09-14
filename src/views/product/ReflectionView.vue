<template>
  <div class="reflection">
    <PageHeader
      title="周期复盘"
      description="把市场感知、工作沉淀、学习更新放进同一个自然周或自然月里对齐，和上一周期做环比——三模式在这里汇成一条节奏线。"
    >
      <template #actions>
        <div class="ow-seg">
          <button
            v-for="opt in PERIODS"
            :key="opt.value"
            type="button"
            :class="{ on: period === opt.value }"
            @click="applyPeriod(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
        <div class="ow-seg period-nav">
          <button type="button" aria-label="上一周期" @click="shift(1)" :disabled="offset - 1 < -24">
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            class="range"
            aria-label="回到当前周期"
            :disabled="offset === 0"
            @click="shift(-offset)"
          >
            {{ data?.label ?? '加载中' }}
          </button>
          <button type="button" aria-label="下一周期" @click="shift(-1)" :disabled="offset >= 0">
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
        <el-button :icon="RefreshCw" :loading="loading" @click="load()">刷新</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="loadError" :message="loadError" :retry="load" />
    <div v-else-if="loading && !data" class="ow-card">
      <div class="ow-card-b"><el-skeleton :rows="6" animated /></div>
    </div>

    <template v-else-if="data">
      <section class="ow-card reflect-summary">
        <div v-for="stat in stats" :key="stat.key" class="stat">
          <span class="stat-num">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-sub" :class="deltaClass(stat.key)">{{ deltaText(stat.key) }}</span>
        </div>
      </section>

      <section v-if="isEmpty" class="ow-card">
        <div class="ow-card-b empty-note">
          这个周期还没有记录。工作记录、专注计时或模拟面试产生数据后，复盘会自动出现趋势与环比。
        </div>
      </section>

      <template v-else>
        <section class="ow-card">
          <div class="ow-card-h"><CalendarRange aria-hidden="true" />每日节奏</div>
          <div class="ow-card-b">
            <div class="daily-chart" role="img" :aria-label="dailyAria">
              <div v-for="point in data.daily" :key="point.date" class="daily-col">
                <div class="bars">
                  <div
                    class="bar focus"
                    :style="{ height: barHeight(point.focusMinutes) }"
                    :title="`${shortDate(point.date)} 专注 ${point.focusMinutes} 分钟`"
                  ></div>
                </div>
                <div class="dots">
                  <span v-if="point.workLogs > 0" class="dot log" :title="`${shortDate(point.date)} 工作记录 ${point.workLogs} 条`"></span>
                  <span v-if="point.knowledgeCards > 0" class="dot card" :title="`${shortDate(point.date)} 知识卡片 ${point.knowledgeCards} 张`"></span>
                </div>
                <span class="day-label">{{ shortDate(point.date) }}</span>
              </div>
            </div>
            <div class="legend">
              <span><span class="lg-bar focus" />专注分钟</span>
              <span><span class="dot log" />有工作记录</span>
              <span><span class="dot card" />有新知识卡片</span>
            </div>
          </div>
        </section>

        <div class="reflect-grid">
          <section class="ow-card">
            <div class="ow-card-h"><Layers aria-hidden="true" />工作沉淀</div>
            <div class="ow-card-b">
              <dl class="fact-list">
                <div><dt>记录</dt><dd>{{ data.work.total }} 条</dd></div>
                <div><dt>已蒸馏</dt><dd>{{ data.work.distilled }} 条</dd></div>
                <div>
                  <dt>待蒸馏</dt>
                  <dd :class="{ warn: data.work.pendingDistill > 0 }">{{ data.work.pendingDistill }} 条</dd>
                </div>
              </dl>
              <ul v-if="categoryRows.length" class="tag-list">
                <li v-for="row in categoryRows" :key="row.name">{{ row.name }} × {{ row.count }}</li>
              </ul>
            </div>
          </section>

          <section class="ow-card">
            <div class="ow-card-h"><GraduationCap aria-hidden="true" />学习更新</div>
            <div class="ow-card-b">
              <dl class="fact-list">
                <div><dt>复习完成</dt><dd>{{ data.study.completed }} 项</dd></div>
                <div><dt>新任务</dt><dd>{{ data.study.created }} 项</dd></div>
                <div><dt>进行中目标</dt><dd>新建 {{ data.learning.newGoals }} · 完成 {{ data.learning.doneGoals }}</dd></div>
                <div><dt>待办复习</dt><dd>{{ data.study.outstanding }} 项（当前快照）</dd></div>
              </dl>
            </div>
          </section>

          <section class="ow-card">
            <div class="ow-card-h"><NotebookPen aria-hidden="true" />市场感知</div>
            <div class="ow-card-b">
              <dl class="fact-list">
                <div><dt>完成面试</dt><dd>{{ data.interview.sessions }} 场</dd></div>
                <div><dt>出分报告</dt><dd>{{ data.interview.scored }} 份</dd></div>
                <div><dt>平均分</dt><dd class="big">{{ data.interview.avgScore ?? '—' }}</dd></div>
              </dl>
              <ul v-if="recommendationRows.length" class="tag-list">
                <li v-for="row in recommendationRows" :key="row.name">{{ recommendationLabel(row.name) }} × {{ row.count }}</li>
              </ul>
              <p v-if="data.interview.crossVersionSamples > 0" class="caveat">
                另有 {{ data.interview.crossVersionSamples }} 份报告来自旧评分规则（版本
                {{ data.scoringRuleVersion }} 之外），未混入平均分与结论分布。
              </p>
              <p v-else-if="data.interview.scored < data.interview.sessions" class="caveat">
                {{ data.interview.sessions - data.interview.scored }} 场面试未出分（无报告或生成失败），不计入平均分。
              </p>
            </div>
          </section>
        </div>
      </template>

      <!-- V55：成长脉络——溯源链接聚合出的链，全局快照不随周期切换 -->
      <section v-if="threads.length" class="ow-card">
        <div class="ow-card-h"><Waypoints aria-hidden="true" />成长脉络</div>
        <div class="ow-card-b">
          <p class="thread-note">下面每条都是库里真实存在过的转化链（事实→目标、套路→练习→效果、报告→复习）；断了环节的链不会凭空补画。</p>
          <ul class="thread-list">
            <li v-for="(thread, index) in threads" :key="`${thread.type}-${index}`" class="thread-item">
              <span class="thread-type">{{ THREAD_TYPE_LABELS[thread.type] }}</span>
              <span class="thread-chain">
                <template v-for="(step, si) in [...thread.origin, ...thread.steps]" :key="`${step.kind}-${step.refId}`">
                  <span v-if="si > 0" class="thread-arrow" aria-hidden="true">→</span>
                  <RouterLink class="thread-step" :to="step.to" :title="`${STEP_KIND_LABELS[step.kind]} · ${step.status}`">
                    <span class="thread-kind">{{ STEP_KIND_LABELS[step.kind] }}</span>
                    <span class="thread-title">{{ step.title }}</span>
                    <span class="thread-status">{{ step.status }}</span>
                  </RouterLink>
                </template>
                <span v-if="thread.effect" class="thread-effect" :class="'fx-' + thread.effect">
                  {{ EFFECT_TEXT[thread.effect] }}
                </span>
              </span>
            </li>
          </ul>
        </div>
      </section>

      <p class="reflect-note">
        环比对象是紧邻的上一{{ period === 'month' ? '月' : '周' }}（{{ previousRangeText }}）；
        平均分只统计当前评分规则的报告，无分数时显示「—」而不是 0。
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Layers,
  NotebookPen,
  RefreshCw,
  Waypoints,
} from 'lucide-vue-next'
import { getReflection, getGrowthThreads, type GrowthThread, type Reflection } from '@/api/workbench'
import { problemMessage } from '@/api/http'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'

const PERIODS = [
  { value: 'week' as const, label: '自然周' },
  { value: 'month' as const, label: '自然月' },
]

const CATEGORY_LABELS: Record<string, string> = {
  PROJECT: '项目',
  INCIDENT: '排障',
  DECISION: '决策',
  LEARNING: '学习',
  OTHER: '其他',
}

const RECOMMENDATION_LABELS: Record<string, string> = {
  STRONG_PASS: '强烈推荐',
  PASS: '推荐',
  HOLD: '待定',
  FAIL: '不推荐',
}

const data = ref<Reflection | null>(null)
const loading = ref(true)
const loadError = ref('')
const period = ref<'week' | 'month'>('week')
const offset = ref(0)

/** V55：成长脉络是全局快照（不随周期切换），失败静默——辅助信息不打扰复盘主流程。 */
const threads = ref<GrowthThread[]>([])

async function loadThreads(): Promise<void> {
  try {
    threads.value = await getGrowthThreads()
  } catch {
    threads.value = []
  }
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    data.value = await getReflection(period.value, offset.value)
  } catch (error) {
    loadError.value = problemMessage(error)
  } finally {
    loading.value = false
  }
}

function applyPeriod(value: 'week' | 'month'): void {
  if (period.value === value) return
  period.value = value
  offset.value = 0
  void load()
}

function shift(delta: number): void {
  const next = offset.value - delta // 视觉上的「向前一期」= offset 更负
  if (next > 0 || next < -24) return
  offset.value = next
  void load()
}

const stats = computed(() => {
  if (!data.value) return []
  const focusTotal = data.value.daily.reduce((sum, point) => sum + point.focusMinutes, 0)
  const cardTotal = data.value.daily.reduce((sum, point) => sum + point.knowledgeCards, 0)
  return [
    { key: 'focusMinutes' as const, label: '专注分钟', value: focusTotal },
    { key: 'workLogs' as const, label: '工作记录', value: data.value.work.total },
    { key: 'knowledgeCards' as const, label: '知识卡片', value: cardTotal },
    { key: 'studyCompleted' as const, label: '复习完成', value: data.value.study.completed },
  ]
})

function deltaText(key: (typeof stats.value)[number]['key']): string {
  if (!data.value) return ''
  const cur = stats.value.find((item) => item.key === key)?.value ?? 0
  const prev = data.value.previous[key]
  if (cur === 0 && prev === 0) return '与上期持平'
  if (prev === 0) return '上期无数据'
  const diff = cur - prev
  if (diff === 0) return '与上期持平'
  return `${diff > 0 ? '↑' : '↓'} ${Math.round((Math.abs(diff) / prev) * 100)}%（上期 ${prev}）`
}

function deltaClass(key: (typeof stats.value)[number]['key']): string {
  if (!data.value) return ''
  const cur = stats.value.find((item) => item.key === key)?.value ?? 0
  const diff = cur - data.value.previous[key]
  return diff > 0 ? 'up' : diff < 0 ? 'down' : ''
}

const isEmpty = computed(() => {
  if (!data.value) return true
  return (
    data.value.work.total === 0 &&
    data.value.daily.every(
      (point) => point.focusMinutes === 0 && point.workLogs === 0 && point.knowledgeCards === 0,
    ) &&
    data.value.study.completed === 0 &&
    data.value.interview.sessions === 0
  )
})

const categoryRows = computed(() =>
  Object.entries(data.value?.work.byCategory ?? {})
    .map(([name, count]) => ({ name: CATEGORY_LABELS[name] ?? name, count }))
    .sort((a, b) => b.count - a.count),
)

const recommendationRows = computed(() =>
  Object.entries(data.value?.interview.byRecommendation ?? {})
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count),
)

const maxFocus = computed(() =>
  Math.max(1, ...(data.value?.daily.map((point) => point.focusMinutes) ?? [1])),
)

function barHeight(minutes: number): string {
  if (minutes <= 0) return '2px'
  return `${Math.max(6, Math.round((minutes / maxFocus.value) * 88))}px`
}

function shortDate(iso: string): string {
  return iso.slice(5).replace('-', '/')
}

function recommendationLabel(code: string): string {
  return RECOMMENDATION_LABELS[code] ?? code
}

const previousRangeText = computed(() => {
  if (!data.value) return '—'
  const start = new Date(`${data.value.rangeStart}T00:00:00Z`)
  const end = new Date(`${data.value.rangeEnd}T00:00:00Z`)
  if (period.value === 'month') {
    start.setUTCMonth(start.getUTCMonth() - 1)
    end.setUTCMonth(end.getUTCMonth() - 1)
  } else {
    start.setUTCDate(start.getUTCDate() - 7)
    end.setUTCDate(end.getUTCDate() - 7)
  }
  return `${start.toISOString().slice(0, 10)} ~ ${end.toISOString().slice(0, 10)}`
})

const dailyAria = computed(() => {
  const points = data.value?.daily ?? []
  const total = points.reduce((sum, point) => sum + point.focusMinutes, 0)
  return `每日专注合计 ${total} 分钟，${points.length} 天`
})

/** V55：脉络链的类型与节点标签。 */
const THREAD_TYPE_LABELS: Record<GrowthThread['type'], string> = {
  CRAFT: '套路 → 练习',
  FACT: '事实 → 目标',
  REPORT: '报告 → 复习',
}

const STEP_KIND_LABELS: Record<string, string> = {
  FACT: '画像事实',
  GOAL: '学习目标',
  CRAFT: '方法论',
  TASK: '复习任务',
  REPORT: '面试报告',
}

const EFFECT_TEXT: Record<string, string> = {
  IMPROVED: '练后关联维度均分上升',
  DECLINED: '练后关联维度均分回落',
  FLAT: '练后关联维度基本持平',
  INSUFFICIENT: '样本还看不出变化',
}

onMounted(() => {
  load()
  loadThreads()
})
</script>

<style scoped>
.reflection {
  display: grid;
  gap: 18px;
}

.period-nav {
  align-items: center;
}

.period-nav button {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
}

.period-nav button.range {
  padding: 7px 12px;
  font-size: var(--fs-sm);
  white-space: nowrap;
}

.period-nav button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.reflect-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  padding: 20px 24px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-num {
  color: var(--ow-ink);
  font-size: var(--fs-xl);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  color: var(--ow-ink-secondary, #3f574c);
  font-size: var(--fs-sm);
  font-weight: 700;
}

.stat-sub {
  color: var(--ow-muted, #52685e);
  font-size: var(--fs-xs);
}

.stat-sub.up {
  color: var(--ow-status-success-text, #1d6f43);
}

.stat-sub.down {
  color: var(--ow-status-warning-text, #7d5400);
}

.daily-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  min-height: 130px;
  padding-top: 6px;
}

.daily-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.bars {
  height: 92px;
  display: flex;
  align-items: flex-end;
}

.bar {
  width: 14px;
  border-radius: 4px 4px 2px 2px;
  background: linear-gradient(180deg, var(--btn-1, #2f8f6f), var(--btn-2, #1f6f5c));
}

.dots {
  height: 10px;
  display: flex;
  gap: 3px;
  align-items: center;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.dot.log {
  background: var(--ow-accent, #7c5cd6);
}

.dot.card {
  background: var(--ow-status-warning-text, #b07d1e);
}

.day-label {
  font-size: 11px;
  color: var(--ow-muted, #52685e);
  white-space: nowrap;
}

.legend {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  font-size: var(--fs-xs);
  color: var(--ow-muted, #52685e);
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.lg-bar {
  width: 10px;
  height: 14px;
  border-radius: 3px;
  background: var(--btn-2, #1f6f5c);
}

.reflect-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.fact-list {
  margin: 0;
  display: grid;
  gap: 8px;
}

.fact-list > div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: var(--fs-sm);
}

.fact-list dt {
  color: var(--ow-muted, #52685e);
}

.fact-list dd {
  margin: 0;
  color: var(--ow-ink-secondary, #3f574c);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.fact-list dd.warn {
  color: var(--ow-status-warning-text, #7d5400);
}

.fact-list dd.big {
  font-size: 16px;
}

.tag-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-list li {
  font-size: var(--fs-xs);
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid var(--ow-line-soft, rgb(31 111 92 / 18%));
  color: var(--ow-ink-secondary, #3f574c);
  background: var(--glass, rgb(31 111 92 / 4%));
}

.caveat {
  margin: 10px 0 0;
  font-size: var(--fs-xs);
  line-height: 1.6;
  color: var(--ow-status-warning-text, #7d5400);
}

.empty-note,
.reflect-note {
  color: var(--ow-muted, #52685e);
  font-size: var(--fs-sm);
  line-height: 1.7;
}

/* V55：成长脉络链。中性底色 + 文字色区分状态，品牌色只给链接 */
.thread-note {
  margin: 0 0 10px;
  color: var(--ow-muted, #52685e);
  font-size: var(--fs-xs);
}

.thread-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.thread-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.thread-type {
  flex: 0 0 92px;
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--ow-muted, #52685e);
}

.thread-chain {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.thread-step {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 3px 9px;
  border-radius: 8px;
  background: rgb(31 111 92 / 5%);
  text-decoration: none;
  max-width: 100%;
}

.thread-step:hover {
  background: rgb(31 111 92 / 10%);
}

.thread-kind {
  font-size: var(--fs-2xs);
  font-weight: 700;
  color: var(--ow-muted, #52685e);
}

.thread-title {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--ow-link, #1f6f5c);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}

.thread-status {
  font-size: var(--fs-2xs);
  color: var(--ow-muted, #52685e);
}

.thread-arrow {
  color: var(--ow-muted, #52685e);
  font-size: var(--fs-xs);
}

.thread-effect {
  font-size: var(--fs-xs);
  color: var(--ow-muted, #52685e);
}

.thread-effect.fx-IMPROVED {
  color: var(--ow-success-text, #16634f);
}

.thread-effect.fx-DECLINED {
  color: var(--ow-warning-text, #8a5a00);
}

.reflect-note {
  margin: 0;
}

@media (max-width: 1100px) {
  .reflect-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .reflect-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .reflect-summary {
    grid-template-columns: 1fr;
  }

  .day-label {
    display: none;
  }
}
</style>
