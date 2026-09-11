<template>
  <div class="page skillmap-page">
    <PageHeader
      title="技能图谱 · 能力雷达"
      description="只画有来源的观测：每个维度的均分都来自某一份已完成面试报告的维度分。样本不足时直接说不足，不为了图形好看而补一个数。"
    >
      <template #actions>
        <el-button :icon="RefreshCw" :loading="loading" @click="load()">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="router.push('/interviews/new')">
          去面试攒样本
        </el-button>
      </template>
    </PageHeader>

    <!-- 空库折叠：有效样本为 0 时只渲染引导卡，避免 5 屏空态说明（22 号诊断 B5） -->
    <section v-if="data && data.sampleCount === 0" class="ow-card empty-guide">
      <div class="empty-guide-body">
        <h2>还没有可统计的面试样本</h2>
        <p>
          能力雷达的每个维度分都来自一份已完成面试报告的评分。完成第一场模拟面试并生成报告后，
          这里会出现 11 个维度的真实观测——在那之前不画任何图形，避免看起来像结论的噪声。
        </p>
        <p v-if="data.sources.unversionedReports > 0" class="empty-guide-note">
          检测到 {{ data.sources.unversionedReports }} 份历史报告未记录评分规则版本，无法参与统计。
        </p>
      </div>
      <el-button type="primary" :icon="Plus" @click="router.push('/interviews/new')">
        去完成第一场面试
      </el-button>
    </section>

    <section class="ow-card">
      <div class="filters">
        <div class="filter-group">
          <span class="filter-label">统计区间</span>
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
        <label v-if="versions.length > 1" class="filter-group">
          <span class="filter-label">评分规则版本</span>
          <el-select v-model="ruleVersion" placeholder="样本最多的版本" @change="load()">
            <el-option
              v-for="version in versions"
              :key="version.ruleVersion"
              :label="`${version.ruleVersion}（${version.sampleCount} 份）`"
              :value="version.ruleVersion"
            />
          </el-select>
        </label>
        <div class="filter-spacer" />
        <span v-if="data" class="ow-hint compact">
          同一评分规则才可比；切换区间或版本都会重算样本
        </span>
      </div>
    </section>

    <div v-if="loading" class="ow-card">
      <div class="ow-card-b"><el-skeleton :rows="6" animated /></div>
    </div>
    <ErrorState v-else-if="loadError" :message="loadError" :retry="load" />
    <template v-else-if="data && data.sampleCount > 0">
      <div class="meta-strip">
        <span class="ow-tag blue">
          规则版本 {{ data.ruleVersion ?? '未记录' }}
        </span>
        <span class="ow-tag gray">样本 {{ data.sampleCount }} 份</span>
        <span class="ow-tag gray">区间 {{ rangeLabel }}</span>
        <span class="ow-tag gray">满分 {{ data.maxScore }}</span>
        <span v-if="data.sources.unversionedReports > 0" class="ow-tag orange">
          {{ data.sources.unversionedReports }} 份历史报告未记录规则版本，不参与趋势
        </span>
      </div>

      <div class="skill-grid">
        <section class="ow-card col5">
          <div class="ow-card-h">
            <div class="ic b1"><Network aria-hidden="true" /></div>
            能力雷达
            <div class="right">
              <span class="ow-tag gray">{{ observedAxes.length }}/{{ data.dimensions.length }} 维有观测</span>
            </div>
          </div>
          <div class="ow-card-b radar-wrap">
            <p v-if="!data.renderable" class="missing">
              {{ data.reason }} 因此这里不画雷达：样本不足时把观测连成形状，
              看起来像结论，实际上只是噪声。
            </p>
            <template v-else>
              <svg class="radar" viewBox="0 0 360 320" role="img" aria-label="能力维度雷达图">
                <polygon
                  v-for="ring in RINGS"
                  :key="`ring-${ring}`"
                  :points="polygonPoints(ring)"
                  fill="none"
                  stroke="var(--line-2)"
                  stroke-width="1"
                />
                <line
                  v-for="(dimension, index) in data.dimensions"
                  :key="`axis-${dimension.name}`"
                  :x1="CENTER_X"
                  :y1="CENTER_Y"
                  :x2="axisPoint(index, 1).x"
                  :y2="axisPoint(index, 1).y"
                  stroke="var(--line-2)"
                  stroke-width="1"
                />
                <polygon :points="dataPoints" class="radar-area" />
                <text
                  v-for="(dimension, index) in data.dimensions"
                  :key="`label-${dimension.name}`"
                  :x="labelPoint(index).x"
                  :y="labelPoint(index).y"
                  :text-anchor="labelAnchor(index)"
                  class="radar-label"
                  :class="{ faint: dimension.sampleCount === 0 }"
                >
                  {{ dimension.name }}
                </text>
              </svg>
              <div class="ow-hint">
                图形只连有观测的 {{ observedAxes.length }} 个维度；下方列表里标注「本期无观测」的维度
                没有参与绘制，也没有被当成 0 分。
              </div>
            </template>
          </div>
        </section>

        <section class="ow-card col7">
          <div class="ow-card-h">
            <div class="ic b3"><BarChart3 aria-hidden="true" /></div>
            能力矩阵
            <div class="right">
              <span class="ow-tag gray">
                {{ data.dimensions.length }} 维度 · 均来自面试报告评分
              </span>
            </div>
          </div>
          <div class="ow-card-b">
            <div v-if="data.sampleCount === 0" class="missing tight">
              这个区间与规则版本内一份观测都没有，因此均分也是空的。先完成面试并生成报告{{
                days === null ? '' : '，或把统计区间放宽到「全部」'
              }}。
            </div>
            <div v-else-if="!data.renderable" class="missing tight">
              均分仍然列出（它们是真实发生过的观测），但趋势与雷达要等同一规则版本满
              {{ data.minTrendSamples }} 份报告。
            </div>
            <div class="dim-list">
              <div
                v-for="dimension in data.dimensions"
                :key="dimension.name"
                class="dim-block"
              >
                <div class="skill-dim-row" :class="categoryRowClass(dimension.category)">
                  <div class="dim-main">
                    <span class="dim-name">{{ dimension.name }}</span>
                    <span class="ow-tag" :class="categoryTagClass(dimension.category)">
                      {{ dimension.category }}
                    </span>
                    <span class="ow-tag gray">{{ sampleText(dimension) }}</span>
                  </div>
                  <div class="dim-track">
                    <i v-if="dimension.score !== undefined && dimension.score !== null"
                       :style="{ width: `${barWidth(dimension.score)}%` }" />
                  </div>
                  <div class="dim-score">
                    {{ dimension.score ?? '—' }}
                  </div>
                  <button
                    type="button"
                    class="dim-toggle"
                    :aria-expanded="openDimension === dimension.name"
                    @click="toggleDimension(dimension.name)"
                  >
                    {{ openDimension === dimension.name ? '收起证据' : '看证据' }}
                  </button>
                </div>
                <div v-if="openDimension === dimension.name" class="evidence">
                  <div v-if="evidenceLoading === dimension.name" class="evidence-line muted">
                    正在读取该维度的观测…
                  </div>
                  <div v-else-if="openError" class="evidence-line">
                    <ErrorState :message="openError" :retry="() => loadEvidence(dimension.name)" />
                  </div>
                  <template v-else-if="openEvidence">
                    <div v-if="openEvidence.items.length === 0" class="evidence-line muted">
                      这一维度在所选区间与规则版本下没有观测。
                    </div>
                    <div
                      v-for="item in openEvidence.items"
                      :key="item.reportId"
                      class="evidence-line"
                    >
                      <b>{{ item.score }}</b>
                      <span class="muted">于 {{ shortTime(item.generatedAt) }}</span>
                      <button type="button" class="link" @click="goReport(item.sessionId)">
                        看那一场报告
                      </button>
                    </div>
                  </template>
                </div>
              </div>
            </div>
            <div class="ow-hint">
              维度名与取值范围由评分提示词固定，均分只统计同一规则版本的已完成报告；
              某份报告缺少该维度时不会被算成 0 分，而是让该维度的样本数少 1。
            </div>
          </div>
        </section>
      </div>

      <section class="ow-card">
        <div class="ow-card-h">
          <div class="ic b2"><TrendingUp aria-hidden="true" /></div>
          总分成长轨迹
          <div class="right">
            <span class="ow-tag gray">{{ rangeLabel }} · {{ data.sampleCount }} 份</span>
          </div>
        </div>
        <div class="ow-card-b">
          <p v-if="!data.renderable" class="missing">
            {{ data.reason }}
          </p>
          <template v-else>
            <svg class="trend" :viewBox="`0 0 ${chart.width} ${chart.height}`"
                 role="img" aria-label="总分随生成时间的变化">
              <line
                v-for="grid in chart.grid"
                :key="`grid-${grid.y}`"
                :x1="chart.pad"
                :x2="chart.width - chart.pad"
                :y1="grid.y"
                :y2="grid.y"
                stroke="var(--line)"
                stroke-width="1"
              />
              <polyline :points="chart.line" fill="none" stroke="var(--brand)" stroke-width="2.5" />
              <circle
                v-for="point in chart.dots"
                :key="point.key"
                :cx="point.x"
                :cy="point.y"
                r="4"
                fill="#fff"
                stroke="var(--brand)"
                stroke-width="2.5"
              />
              <text x="8" :y="chart.top + 4" class="axis-label">{{ chart.high }}</text>
              <text x="8" :y="chart.height - chart.pad + 4" class="axis-label">{{ chart.low }}</text>
            </svg>
            <div class="trend-legend">
              <span>
                {{ shortTime(data.series[0]?.generatedAt) }} →
                {{ shortTime(data.series[data.series.length - 1]?.generatedAt) }}
              </span>
              <span class="muted">纵轴 {{ chart.low }}–{{ chart.high }} 分，每个点一份报告</span>
              <button type="button" class="link" @click="router.push('/reports')">
                看报告中心
              </button>
            </div>
          </template>
        </div>
      </section>

      <div class="skill-grid">
        <section class="ow-card col6">
          <div class="ow-card-h">
            <div class="ic b4"><Gauge aria-hidden="true" /></div>
            你的技能自评
            <div class="right"><span class="ow-tag gray">独立于观测分</span></div>
          </div>
          <div class="ow-card-b">
            <div v-if="!data.selfAssessment" class="evidence-line">
              <p class="missing">
                还没有填写求职档案，因此没有自评数据。自评是你自己选的等级，
                系统不会把它折算成 0-100 的能力分，也不会和报告维度分混在一张雷达里。
              </p>
              <el-button :icon="Plus" @click="router.push('/profile/job')">去填写求职档案</el-button>
            </div>
            <template v-else>
              <div class="self-row">
                <span>Java 水平</span>
                <b>{{ skillLevelLabel(data.selfAssessment.javaSkillLevel) }}</b>
              </div>
              <div class="self-row">
                <span>AI 水平</span>
                <b>{{ skillLevelLabel(data.selfAssessment.aiSkillLevel) }}</b>
              </div>
              <div class="ow-hint">
                更新于 {{ fullTime(data.selfAssessment.updatedAt) }}。这两个等级只有四档，
                与上方 11 个评分维度是两套词汇，不可互相换算。
              </div>
            </template>
          </div>
        </section>

        <section class="ow-card col6">
          <div class="ow-card-h">
            <div class="ic b5"><Database aria-hidden="true" /></div>
            数据来源计数
          </div>
          <div class="ow-card-b">
            <div class="source-row">
              <span>参与趋势的已完成报告</span>
              <b>{{ data.sources.reportSamples }} 份</b>
            </div>
            <div class="source-row">
              <span>未记录规则版本的历史报告</span>
              <b>{{ data.sources.unversionedReports }} 份</b>
            </div>
            <div class="source-row">
              <span>错题本条目</span>
              <b>{{ data.sources.practiceItems }} 条</b>
              <em>已掌握 {{ data.sources.masteredPracticeItems }} 条</em>
            </div>
            <div class="source-row">
              <span>已确认的项目事实</span>
              <b>{{ data.sources.confirmedProjectFacts }} 条</b>
            </div>
            <div class="ow-hint">
              错题与项目事实在本期只提供条数：练习条目没有维度归属，项目事实也没有分数字段，
              把它们折算成能力分需要一份换算规则，那是还没确认的产品口径。
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { BarChart3, Database, Gauge, Network, Plus, RefreshCw, TrendingUp } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  categoryRowClass,
  categoryTagClass,
  getCapabilityDimension,
  getCapabilityOverview,
  skillLevelLabel,
} from '@/api/capabilities'
import { problemMessage } from '@/api/http'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'

import type {
  CapabilityDimensionView,
  CapabilityEvidence,
  CapabilityOverview,
} from '@/types/api'

// 后端只接受 7 / 30 / 90 三个窗口（非法值 400），区间因此是固定档位而不是自由选日期。
const DAY_WINDOWS: { value: number | null; label: string }[] = [
  { value: null, label: '全部' },
  { value: 7, label: '近 7 天' },
  { value: 30, label: '近 30 天' },
  { value: 90, label: '近 90 天' },
]
const RINGS = [0.25, 0.5, 0.75, 1]
const CENTER_X = 180
const CENTER_Y = 158
const RADIUS = 92

const router = useRouter()

const data = ref<CapabilityOverview | null>(null)
const loading = ref(true)
const loadError = ref('')
const days = ref<number | null>(null)
// undefined 表示「让后端选样本最多的版本」，界面上不假装替用户做过决定。
const ruleVersion = ref<string | undefined>()

const openDimension = ref('')
const evidence = ref<Record<string, CapabilityEvidence>>({})
const evidenceLoading = ref('')
const evidenceErrors = ref<Record<string, string>>({})

const versions = computed(() => data.value?.versions ?? [])
const rangeLabel = computed(() => {
  const window = DAY_WINDOWS.find((item) => item.value === days.value)
  return window?.label ?? '全部'
})
const observedAxes = computed(() => (data.value?.dimensions ?? []).filter(
  (dimension) => dimension.sampleCount > 0,
))
// 同一次只展开一个维度，索引可能落空的情况在这里兜一次，模板因此不用反复判空。
const openEvidence = computed<CapabilityEvidence | null>(() => (
  openDimension.value ? evidence.value[openDimension.value] ?? null : null
))
const openError = computed<string>(() => (
  openDimension.value ? evidenceErrors.value[openDimension.value] ?? '' : ''
))

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    data.value = await getCapabilityOverview(days.value, ruleVersion.value ?? null)
    // 区间或版本一变，已展开的证据就属于另一个样本集了，直接作废重取。
    openDimension.value = ''
    evidence.value = {}
    evidenceErrors.value = {}
  } catch (error) {
    data.value = null
    loadError.value = problemMessage(error)
  } finally {
    loading.value = false
  }
}

function applyDays(value: number | null) {
  if (days.value === value) return
  days.value = value
  load()
}

async function toggleDimension(name: string) {
  if (openDimension.value === name) {
    openDimension.value = ''
    return
  }
  openDimension.value = name
  if (!evidence.value[name]) await loadEvidence(name)
}

async function loadEvidence(name: string) {
  evidenceLoading.value = name
  evidenceErrors.value = { ...evidenceErrors.value, [name]: '' }
  try {
    const result = await getCapabilityDimension(name, days.value, ruleVersion.value ?? null)
    evidence.value = { ...evidence.value, [name]: result }
  } catch (error) {
    evidenceErrors.value = { ...evidenceErrors.value, [name]: problemMessage(error) }
  } finally {
    evidenceLoading.value = ''
  }
}

function goReport(sessionId: number) {
  router.push(`/interviews/${sessionId}/report`)
}

function sampleText(dimension: CapabilityDimensionView): string {
  return dimension.sampleCount === 0 ? '本期无观测' : `${dimension.sampleCount} 份观测`
}

function barWidth(score: number): number {
  const max = data.value?.maxScore ?? 100
  return Math.max(0, Math.min(100, (score / max) * 100))
}

function shortTime(value: string | null | undefined): string {
  if (!value) return '—'
  // 年份不能省：区间「全部」里可能出现跨年的观测，只显示 7/28 会被读成今年。
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function fullTime(value: string | null | undefined): string {
  if (!value) return '未记录'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/** 轴的角度按 11 个固定槽位算：某维度没有观测时留下缺口，而不是让其余轴重新均分角度。 */
function axisPoint(index: number, ratio: number): { x: number; y: number } {
  const total = data.value?.dimensions.length ?? 1
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  return {
    x: CENTER_X + Math.cos(angle) * RADIUS * ratio,
    y: CENTER_Y + Math.sin(angle) * RADIUS * ratio,
  }
}

function polygonPoints(ring: number): string {
  const dimensions = data.value?.dimensions ?? []
  return dimensions
    .map((_, index) => {
      const point = axisPoint(index, ring)
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`
    })
    .join(' ')
}

const dataPoints = computed(() => {
  const dimensions = data.value?.dimensions ?? []
  const max = data.value?.maxScore ?? 100
  return dimensions
    .map((dimension, index) => {
      if (dimension.sampleCount === 0 || dimension.score === undefined || dimension.score === null) {
        return null
      }
      const point = axisPoint(index, dimension.score / max)
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`
    })
    .filter((point): point is string => point !== null)
    .join(' ')
})

function labelPoint(index: number): { x: number; y: number } {
  const point = axisPoint(index, 1.2)
  return { x: point.x, y: point.y + 4 }
}

/** 11 个轴标签很容易互相压字，按所在象限改用 start/end 对齐。 */
function labelAnchor(index: number): string {
  const total = data.value?.dimensions.length ?? 1
  const cos = Math.cos((Math.PI * 2 * index) / total - Math.PI / 2)
  if (cos > 0.25) return 'start'
  if (cos < -0.25) return 'end'
  return 'middle'
}

const chart = computed(() => {
  const points = data.value?.series ?? []
  const width = 640
  const height = 220
  const pad = 34
  const scores = points.map((point) => point.totalScore)
  const low = scores.length ? Math.min(...scores) : 0
  const high = scores.length ? Math.max(...scores) : 100
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
    top: pad,
    low,
    high,
    line: dots.map((dot) => `${dot.x.toFixed(1)},${dot.y.toFixed(1)}`).join(' '),
    dots,
    grid: [height - pad, (height - pad * 2) / 2 + pad / 2, pad].map((y) => ({ y: Math.round(y) })),
  }
})

onMounted(load)
</script>

<style scoped>
.skillmap-page {
  display: grid;
  gap: 18px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 14px 18px;
  padding: 16px 18px;
}

.filter-group {
  display: grid;
  gap: 6px;
  min-width: 150px;
}

.filter-label {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.filter-spacer {
  flex: 1 1 auto;
}

.ow-hint.compact {
  padding: 0;
}

.meta-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
  align-items: start;
}

.col5 { grid-column: span 5; }
.col6 { grid-column: span 6; }
.col7 { grid-column: span 7; }

.radar-wrap {
  display: grid;
  justify-items: center;
  gap: 10px;
}

.radar {
  width: min(100%, 360px);
}

.radar-area {
  fill: rgb(39 179 137 / 22%);
  stroke: var(--brand);
  stroke-width: 2;
}

.radar-label {
  fill: var(--ink-2);
  font-size: 12px;
  font-weight: 700;
}

.radar-label.faint {
  fill: var(--faint);
  font-weight: 600;
}

.dim-list {
  display: grid;
  gap: 10px;
}

.dim-block {
  display: grid;
  gap: 6px;
}

.skill-dim-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 130px 40px auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 12px;
}

.dim-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.dim-name {
  overflow: hidden;
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dim-track {
  height: 8px;
  background: var(--surface-3);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 6%);
}

.dim-track i {
  display: block;
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s ease;
}

.skill-dim-row.tech .dim-track i {
  background: linear-gradient(90deg, var(--brand), #6aa6ff);
}

.skill-dim-row.think .dim-track i {
  background: linear-gradient(90deg, var(--green), #4cc585);
}

.skill-dim-row.comm .dim-track i {
  background: linear-gradient(90deg, var(--gold), #f6c453);
}

.dim-score {
  color: var(--brand-700);
  font-size: 14px;
  font-weight: 800;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.dim-toggle,
.link {
  padding: 3px 9px;
  color: var(--brand-700);
  background: none;
  border: 1px solid var(--line-2);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.link {
  padding: 0;
  border: none;
  text-decoration: underline;
}

.evidence {
  display: grid;
  gap: 6px;
  padding: 8px 12px 10px 16px;
  background: var(--surface-3);
  border: 1px dashed var(--line-2);
  border-radius: 12px;
}

.evidence-line {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink-2);
  font-size: 12px;
}

.evidence-line b {
  min-width: 28px;
  color: var(--ink);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.self-row,
.source-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--line);
  color: var(--ink-2);
  font-size: 14px;
}

.self-row b,
.source-row b {
  color: var(--ink);
  font-size: 14px;
}

.self-row span,
.source-row span {
  margin-right: auto;
}

.source-row em {
  color: var(--muted);
  font-size: 12px;
  font-style: normal;
}

.trend {
  width: 100%;
}

.axis-label {
  fill: var(--faint);
  font-size: 12px;
}

.trend-legend {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin-top: 10px;
  color: var(--muted);
  font-size: 12px;
}

.missing {
  margin: 0;
  padding: 12px 14px;
  color: var(--ink-2);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-left: 3px solid var(--gold);
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.7;
}

.missing.tight {
  margin-bottom: 4px;
}

@media (max-width: 1100px) {
  .col5,
  .col6,
  .col7 {
    grid-column: span 12;
  }
}

@media (max-width: 680px) {
  .skill-dim-row {
    grid-template-columns: minmax(0, 1fr) 40px auto;
  }

  .dim-track {
    grid-column: 1 / -1;
  }
}

.empty-guide {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 26px 30px;
}

.empty-guide-body h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: var(--ow-ink);
}

.empty-guide-body p {
  margin: 8px 0 0;
  max-width: 64ch;
  color: var(--ow-muted);
  font-size: 14px;
  line-height: 1.7;
}

.empty-guide-note {
  color: var(--ow-ink-secondary) !important;
}

@media (max-width: 760px) {
  .empty-guide {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
