<template>
  <div class="wb">
    <header class="wb-hero">
      <div>
        <p class="wb-eyebrow">个人职业成长工作台</p>
        <h1 class="wb-greeting">{{ summary?.greeting ?? '欢迎回来' }}</h1>
        <p class="wb-sub">
          围绕你的项目、知识与成长数据，用三种并行模式持续积累：市场感知、工作沉淀、学习更新。
        </p>
      </div>
      <div v-if="summary" class="wb-focus-chip" :title="`今日已专注 ${summary.focusTodayMinutes} 分钟`">
        <Timer aria-hidden="true" />
        <span>今日专注 {{ summary.focusTodayMinutes }} 分钟</span>
      </div>
    </header>

    <ErrorState v-if="loadError" :message="loadError" :retry="load" />
    <div v-if="loading && !summary" class="wb-skeleton" aria-label="工作台加载中">
      <el-skeleton animated :rows="2" style="height: 96px;" />
      <el-skeleton animated style="margin-top: 18px;">
        <template #template>
          <div class="wb-skel-grid">
            <el-skeleton-item variant="rect" style="height: 84px; border-radius: 12px;" />
            <el-skeleton-item variant="rect" style="height: 84px; border-radius: 12px;" />
            <el-skeleton-item variant="rect" style="height: 84px; border-radius: 12px;" />
            <el-skeleton-item variant="rect" style="height: 84px; border-radius: 12px;" />
          </div>
          <el-skeleton-item variant="rect" style="margin-top: 18px; height: 120px; border-radius: 12px;" />
        </template>
      </el-skeleton>
    </div>

    <template v-if="summary">
      <section v-if="isEmptyState" class="wb-section">
        <div class="wb-onboard">
          <h2 class="wb-onboard-title">三步，开始积累你的职业数据</h2>
          <p class="wb-onboard-sub">工作台的一切洞察都来自你自己的资料与记录。从下面任意一步开始，数据越全，面试校准与知识沉淀越准。</p>
          <div class="wb-onboard-steps">
            <RouterLink to="/projects" class="wb-step">
              <span class="wb-step-no" aria-hidden="true">1</span>
              <span class="wb-step-body">
                <strong>导入一个项目</strong>
                <small>ZIP、GitHub 公开仓库或单文件，AI 会从中建立可追溯的项目画像</small>
              </span>
            </RouterLink>
            <RouterLink to="/interviews/new" class="wb-step">
              <span class="wb-step-no" aria-hidden="true">2</span>
              <span class="wb-step-body">
                <strong>完成一场模拟面试</strong>
                <small>AI 基于你的项目资料出题与追问，产出 11 维能力报告</small>
              </span>
            </RouterLink>
            <RouterLink to="/work-sedimentation" class="wb-step">
              <span class="wb-step-no" aria-hidden="true">3</span>
              <span class="wb-step-body">
                <strong>记录一条工作心得</strong>
                <small>把踩过的坑与决策蒸馏成知识卡片，经验不再随项目流失</small>
              </span>
            </RouterLink>
          </div>
        </div>
      </section>

      <section v-if="!isEmptyState" class="wb-section">
        <h2 class="wb-section-title">能力趋势</h2>
        <div class="wb-trend-card">
          <template v-if="trend && trend.renderable && trend.series.length >= 2">
            <div class="wb-trend-summary">
              <span class="wb-trend-num">{{ trend.series[trend.series.length - 1]?.totalScore }}</span>
              <span class="wb-trend-label">
                最近一次总分（{{ trend.series.length }} 场同规则报告）
                <template v-if="trendDelta !== null">
                  · 较前一次 <b :class="trendDelta >= 0 ? 'up' : 'down'">{{ trendDelta >= 0 ? '+' : '' }}{{ trendDelta }}</b>
                </template>
              </span>
            </div>
            <svg class="wb-trend-spark" viewBox="0 0 320 64" role="img" aria-label="总分变化趋势">
              <polyline :points="sparkPoints" fill="none" stroke="var(--ow-primary, #1fa879)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              <circle v-for="(pt, i) in sparkDots" :key="i" :cx="pt.x" :cy="pt.y" r="3" fill="var(--ow-primary, #1fa879)" />
            </svg>
            <RouterLink to="/skill-map" class="wb-trend-link">看完整能力图谱 →</RouterLink>
          </template>
          <template v-else-if="trend">
            <p class="wb-trend-empty">
              {{ trend.series.length >= 2
                ? '报告尚未使用同一评分规则版本，暂无法比较。'
                : `还差 ${Math.max(0, trend.minTrendSamples - trend.series.length)} 场同规则报告即可看趋势。` }}
              <RouterLink to="/interviews/new">去面试 →</RouterLink>
            </p>
          </template>
        </div>
      </section>

      <section v-else class="wb-section">
        <h2 class="wb-section-title">工作模式</h2>
        <div class="mode-grid">
          <RouterLink
            v-for="mode in summary.modes"
            :key="mode.key"
            :to="mode.to"
            class="mode-card"
            :class="mode.key"
          >
            <span class="mode-icon" :class="mode.key" aria-hidden="true">
              <Component :is="modeIcon(mode.key)" />
            </span>
            <div class="mode-body">
              <h3>{{ mode.title }}</h3>
              <p>{{ mode.description }}</p>
            </div>
            <span class="mode-metric">
              <strong>{{ mode.metricValue }}</strong>
              <small>{{ mode.metricLabel }}</small>
            </span>
          </RouterLink>
        </div>
      </section>

      <section v-if="!isEmptyState" class="wb-section">
        <h2 class="wb-section-title">数据核心</h2>
        <div class="asset-grid">
          <RouterLink
            v-for="asset in summary.assets"
            :key="asset.key"
            :to="asset.to"
            class="asset-card"
          >
            <span class="asset-count">{{ asset.count }}</span>
            <span class="asset-label">{{ asset.label }}</span>
          </RouterLink>
        </div>
      </section>

      <section class="wb-section">
        <h2 class="wb-section-title">今日待办</h2>
        <ul class="agenda">
          <li v-for="item in summary.agenda" :key="item.id" :class="{ done: item.done }">
            <span class="agenda-time">{{ item.time }}</span>
            <span class="agenda-title">{{ item.title }}</span>
            <Component :is="item.done ? CheckCircle2 : Circle" class="agenda-state" aria-hidden="true" />
          </li>
          <li v-if="!summary.agenda.length" class="agenda-empty">今天还没有安排，去任一模式里推进一项吧。</li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  CheckCircle2,
  Circle,
  Compass,
  Layers,
  Sparkles,
  Timer,
} from 'lucide-vue-next'
import { getWorkbenchSummary } from '@/api/workbench'
import { getCapabilityOverview } from '@/api/capabilities'
import { problemMessage } from '@/api/http'
import type { WorkMode, WorkbenchSummary } from '@/api/types'
import type { CapabilityOverview } from '@/types/api'
import ErrorState from '@/components/ErrorState.vue'

const summary = ref<WorkbenchSummary | null>(null)
const trend = ref<CapabilityOverview | null>(null)
const loading = ref(false)
const loadError = ref('')
let reloadRequested = false
let disposed = false

function modeIcon(key: WorkMode) {
  if (key === 'market-sensing') return Compass
  if (key === 'work-sedimentation') return Layers
  return Sparkles
}

const trendDelta = computed(() => {
  const series = trend.value?.series ?? []
  if (!trend.value?.renderable || series.length < 2) return null
  const last = series[series.length - 1]
  const prev = series[series.length - 2]
  if (!last || !prev) return null
  return last.totalScore - prev.totalScore
})

const sparkGeometry = computed(() => {
  const series = trend.value?.series ?? []
  if (!trend.value?.renderable || series.length < 2) return { points: '', dots: [] as { x: number; y: number }[] }
  const scores = series.map((point) => point.totalScore)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const span = Math.max(1, max - min)
  const width = 320
  const height = 64
  const pad = 6
  const stepX = series.length > 1 ? (width - pad * 2) / (series.length - 1) : 0
  const dots = series.map((point, index) => ({
    x: pad + index * stepX,
    y: height - pad - ((point.totalScore - min) / span) * (height - pad * 2),
  }))
  return { points: dots.map((dot) => `${dot.x},${dot.y}`).join(' '), dots }
})

const sparkPoints = computed(() => sparkGeometry.value.points)
const sparkDots = computed(() => sparkGeometry.value.dots)

/** 工作记录/知识卡片/学习目标全为零且从未有过面试评估时，首屏引导优先于指标展示。 */
const isEmptyState = computed(() => {
  if (!summary.value) return false
  const noAssets = summary.value.assets
    .filter((asset) => asset.key !== 'focus')
    .every((asset) => asset.count === 0)
  const noEvaluation = summary.value.modes
    .find((mode) => mode.key === 'market-sensing')
    ?.metricValue === '—'
  return noAssets && noEvaluation
})

async function load(): Promise<void> {
  if (loading.value) {
    reloadRequested = true
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    summary.value = await getWorkbenchSummary()
    getCapabilityOverview(null, null)
      .then((overview) => { trend.value = overview })
      .catch(() => { trend.value = null })
  } catch (error) {
    loadError.value = problemMessage(error)
  } finally {
    loading.value = false
    if (reloadRequested && !disposed) {
      reloadRequested = false
      void load()
    }
  }
}

function refreshSummary(): void {
  void load()
}

onMounted(() => {
  disposed = false
  window.addEventListener('focus-session-saved', refreshSummary)
  void load()
})

onUnmounted(() => {
  disposed = true
  reloadRequested = false
  window.removeEventListener('focus-session-saved', refreshSummary)
})
</script>

<style scoped>
.wb {
  display: grid;
  gap: 28px;
}

.wb-skeleton .wb-skel-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

@media (max-width: 980px) {
  .wb-skeleton .wb-skel-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.wb-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 26px 28px;
  background: linear-gradient(135deg, var(--surface), var(--brand-50, rgb(31 111 92 / 8%)));
  border: 1px solid var(--line-2);
  border-radius: 18px;
  box-shadow: var(--shadow-sm);
}

.wb-eyebrow {
  margin: 0 0 6px;
  color: var(--ow-eyebrow, #16634f);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 2px;
}

.wb-greeting {
  margin: 0;
  color: var(--ink);
  font-size: 28px;
  font-weight: 800;
}

.wb-sub {
  margin: 10px 0 0;
  max-width: 52ch;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}

.wb-focus-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  color: var(--ow-eyebrow, #16634f);
  background: var(--brand-50, rgb(31 111 92 / 12%));
  border: 1px solid var(--brand-200, rgb(31 111 92 / 20%));
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}

.wb-focus-chip svg {
  width: 16px;
  height: 16px;
}

.wb-section-title {
  margin: 0 0 14px;
  color: var(--ink);
  font-size: 17px;
  font-weight: 800;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.mode-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: 18px;
  box-shadow: var(--shadow-sm);
  text-decoration: none;
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
}

.mode-card:hover {
  transform: translateY(-3px);
  border-color: var(--brand);
  box-shadow: 0 12px 28px var(--card-glow);
}

.mode-icon {
  display: grid;
  width: 52px;
  height: 52px;
  flex: none;
  place-items: center;
  border-radius: 12px;
  color: #fff;
}

.mode-icon.market-sensing {
  background: linear-gradient(135deg, #2f80ed, #1f6f5c);
}

.mode-icon.work-sedimentation {
  background: linear-gradient(135deg, #d97706, #b45309);
}

.mode-icon.learning-update {
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
}

.mode-icon svg {
  width: 26px;
  height: 26px;
}

.mode-body {
  flex: 1;
  min-width: 0;
}

.mode-body h3 {
  margin: 0 0 4px;
  color: var(--ink);
  font-size: 17px;
  font-weight: 800;
}

.mode-body p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.5;
}

.mode-metric {
  display: grid;
  justify-items: end;
  flex: none;
}

.mode-metric strong {
  color: var(--ink);
  font-size: 22px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.mode-metric small {
  color: var(--ow-ink-secondary, #3f574c);
  font-size: 12px;
  font-weight: 600;
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 14px;
}

.asset-card {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 18px;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: 18px;
  text-decoration: none;
  transition: transform 140ms ease, border-color 140ms ease;
}

.asset-card:hover {
  transform: translateY(-2px);
  border-color: var(--brand);
}

.asset-count {
  color: var(--brand-700, #1f6f5c);
  font-size: 28px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.asset-label {
  color: var(--muted);
  font-size: 14px;
  font-weight: 600;
}

.agenda {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.agenda li {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: 12px;
}

.agenda li.done {
  opacity: 0.6;
}

.agenda-time {
  color: var(--faint);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  flex: none;
}

.agenda-title {
  flex: 1;
  color: var(--ink-2);
  font-size: 14px;
  font-weight: 600;
}

.agenda li.done .agenda-title {
  text-decoration: line-through;
}

.agenda-state {
  width: 18px;
  height: 18px;
  flex: none;
  color: var(--brand);
}

.agenda-empty {
  color: var(--muted);
  font-size: 14px;
}

@media (max-width: 720px) {
  .wb-hero {
    flex-direction: column;
  }
}

.wb-onboard {
  padding: 34px 38px;
  border: 1px solid var(--ow-line-soft, rgb(31 111 92 / 16%));
  border-radius: 18px;
  background: var(--ow-surface, #fff);
  box-shadow: var(--ow-shadow-sm, 0 1px 2px rgb(15 23 42 / 6%));
}

.wb-onboard-title {
  margin: 0;
  color: var(--ow-ink, #21332c);
  font-size: 22px;
  font-weight: 800;
}

.wb-onboard-sub {
  margin: 8px 0 0;
  max-width: 62ch;
  color: var(--ow-ink-secondary, #3f574c);
  font-size: 14px;
  line-height: 1.65;
}

.wb-onboard-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-top: 22px;
}

.wb-step {
  display: flex;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--ow-line-soft, rgb(31 111 92 / 14%));
  border-radius: 12px;
  background: var(--ow-surface-raised, var(--ow-surface, #fff));
  text-decoration: none;
  transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease;
}

.wb-step:hover {
  border-color: var(--ow-primary, #27b389);
  box-shadow: var(--ow-shadow, 0 10px 26px rgb(15 23 42 / 10%));
  transform: translateY(-1px);
}

.wb-step-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--ow-primary-soft, rgb(31 111 92 / 12%));
  color: var(--ow-primary-strong, #1f6f5c);
  font-size: 14px;
  font-weight: 800;
}

.wb-step-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wb-step-body strong {
  color: var(--ow-ink, #21332c);
  font-size: 14px;
  font-weight: 700;
}

.wb-step-body small {
  color: var(--ow-muted, #5c7268);
  font-size: 12px;
  line-height: 1.55;
}

@media (max-width: 900px) {
  .wb-onboard-steps {
    grid-template-columns: 1fr;
  }

  .wb-onboard {
    padding: 24px 20px;
  }
}

/* 数字排版统一（22 号诊断 B6）：等宽数字位，多卡并排纵向对齐 */
.mode-metric strong,
.asset-count,
.wb-focus-chip span {
  font-variant-numeric: tabular-nums;
}

.mode-metric strong,
.asset-count {
  font-weight: 800;
  letter-spacing: -0.01em;
}

.wb-trend-card {
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 18px 22px;
  border: 1px solid var(--ow-line-soft, rgb(31 111 92 / 14%));
  border-radius: 12px;
  background: var(--ow-surface, #fff);
  flex-wrap: wrap;
}

.wb-trend-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
}

.wb-trend-num {
  color: var(--ow-ink);
  font-size: 36px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.wb-trend-label {
  color: var(--ow-muted, #52685e);
  font-size: 14px;
}

.wb-trend-label .up { color: var(--ow-status-success-text, #0f7a40); }
.wb-trend-label .down { color: var(--ow-status-danger-text, #b93b3b); }

.wb-trend-spark {
  width: 320px;
  height: 64px;
  flex: 1 1 220px;
}

.wb-trend-link {
  color: #16634f;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.wb-trend-empty {
  margin: 0;
  color: var(--ow-muted, #52685e);
  font-size: 14px;
  line-height: 1.7;
}

.wb-trend-empty a {
  color: #16634f;
  font-weight: 700;
}
</style>
