<template>
  <div class="page skillmap-page">
    <header class="ow-page-top">
      <div>
        <div class="ow-crumb">成长 / 技能图谱</div>
        <h1><Network aria-hidden="true" /> 技能图谱 · 能力雷达</h1>
        <div class="sub">技能分类、熟练度等级、关联关系、成长轨迹与提升建议（演示数据）</div>
      </div>
      <div class="acts">
        <div class="ow-seg">
          <button
            v-for="period in skillPeriods"
            :key="period.name"
            type="button"
            :class="{ on: activePeriod === period.name }"
            @click="activePeriod = period.name"
          >
            {{ period.name }}
          </button>
        </div>
      </div>
    </header>

    <div class="skill-top">
      <div class="ow-card col5">
        <div class="ow-card-h">
          <div class="ic b1"><Network aria-hidden="true" /></div>
          能力雷达
          <div class="right">{{ activePeriod }}</div>
        </div>
        <div class="ow-card-b radar-wrap">
          <svg class="radar" viewBox="0 0 320 300" role="img" aria-label="能力雷达图">
            <polygon
              v-for="ring in rings"
              :key="ring"
              :points="polygonPoints(ring)"
              fill="none"
              stroke="var(--line-2)"
              stroke-width="1"
            />
            <line
              v-for="(name, index) in dimNames"
              :key="`axis-${name}`"
              :x1="radarCenter"
              :y1="radarCenter"
              :x2="axisPoint(index, 1).x"
              :y2="axisPoint(index, 1).y"
              stroke="var(--line-2)"
              stroke-width="1"
            />
            <polygon :points="dataPoints" fill="rgba(39,179,137,.22)" stroke="var(--brand)" stroke-width="2" />
            <text
              v-for="(name, index) in dimNames"
              :key="`label-${name}`"
              :x="labelPoint(index).x"
              :y="labelPoint(index).y"
              text-anchor="middle"
              class="radar-label"
            >
              {{ name }}
            </text>
          </svg>
          <div class="radar-legend">
            <span v-for="name in dimNames" :key="name" class="rl">
              <i />{{ name }}<b>{{ currentDims[name] ?? 0 }}</b>
            </span>
          </div>
        </div>
      </div>

      <div class="ow-card col7">
        <div class="ow-card-h">
          <div class="ic b3"><BarChart3 aria-hidden="true" /></div>
          能力矩阵
          <div class="right"><span class="ow-tag gray">7 维度 · 3 分类 · 5 等级</span></div>
        </div>
        <div class="ow-card-b">
          <div class="dim-list">
            <div
              v-for="name in dimNames"
              :key="name"
              class="skill-dim-row"
              :class="skillCategoryOf(name).cls"
            >
              <div class="dim-main">
                <span class="dim-name">{{ name }}</span>
                <span class="ow-tag" :class="skillCategoryOf(name).tag">{{ skillCategoryOf(name).cat }}</span>
                <span class="level-tag" :class="skillLevelOf(currentDims[name] ?? 0).cls">{{ skillLevelOf(currentDims[name] ?? 0).text }}</span>
              </div>
              <div class="dim-track"><i :style="{ width: `${currentDims[name] ?? 0}%` }" /></div>
              <div class="dim-score">{{ currentDims[name] ?? 0 }}</div>
            </div>
          </div>
          <div class="ow-hint">维度分值来自演示报告样本；正式能力数据需可追溯的 CapabilityRecord，样本不足时将提示“数据不足”。</div>
        </div>
      </div>
    </div>

    <div class="ow-card">
      <div class="ow-card-h">
        <div class="ic b2"><TrendingUp aria-hidden="true" /></div>
        能力成长轨迹
      </div>
      <div class="ow-card-b">
        <svg class="trend" viewBox="0 0 640 240" role="img" aria-label="能力成长轨迹折线图">
          <g>
            <line v-for="tick in [0, 25, 50, 75, 100]" :key="tick" x1="46" :y1="trendY(tick)" x2="620" :y2="trendY(tick)" stroke="var(--line)" stroke-width="1" />
            <text x="36" :y="trendY(0) + 4" text-anchor="end" class="axis-label">0</text>
            <text x="36" :y="trendY(50) + 4" text-anchor="end" class="axis-label">50</text>
            <text x="36" :y="trendY(100) + 4" text-anchor="end" class="axis-label">100</text>
            <text v-for="(period, index) in skillTrend.periods" :key="period" :x="trendX(index)" y="226" text-anchor="middle" class="axis-label">{{ period }}</text>
          </g>
          <g v-for="series in skillTrend.series" :key="series.name">
            <polyline
              :points="series.values.map((v, i) => `${trendX(i)},${trendY(v)}`).join(' ')"
              fill="none"
              :stroke="seriesColor(series.name)"
              stroke-width="2.5"
              stroke-linecap="round"
            />
            <circle
              v-for="(value, index) in series.values"
              :key="`${series.name}-${index}`"
              :cx="trendX(index)"
              :cy="trendY(value)"
              r="4"
              fill="#fff"
              :stroke="seriesColor(series.name)"
              stroke-width="2.5"
            />
          </g>
        </svg>
        <div class="trend-legend">
          <span v-for="series in skillTrend.series" :key="series.name">
            <i :style="{ background: seriesColor(series.name) }" />{{ series.name }}
          </span>
        </div>
      </div>
      <div class="ow-card-b insight-strip">
        <div class="insight">
          <span class="label">综合成长</span>
          <div class="value">+27</div>
          <div class="desc">从入职初 55 分提升至当前 82 分。</div>
        </div>
        <div class="insight">
          <span class="label">进步最快</span>
          <div class="value">技术深度</div>
          <div class="desc">50 → 80，主要来自秒杀项目复盘与专项训练。</div>
        </div>
        <div class="insight">
          <span class="label">建议补强</span>
          <div class="value">架构取舍</div>
          <div class="desc">76 分，建议结合报告薄弱点进入下周复习计划。</div>
        </div>
        <div class="insight">
          <span class="label">样本说明</span>
          <div class="value">演示</div>
          <div class="desc">正式趋势要求至少 2 个有效样本，并展示统计区间。</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BarChart3, Network, TrendingUp } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import {
  skillCategoryOf,
  skillLevelOf,
  skillPeriods,
  skillTrend,
} from '@/mocks/gap'

const activePeriod = ref(skillPeriods[skillPeriods.length - 1]?.name ?? '当前')
const rings = [0.25, 0.5, 0.75, 1]
const radarCenter = 160
const radarRadius = 92

const currentDims = computed(() => skillPeriods.find((period) => period.name === activePeriod.value)?.dims ?? {})
const dimNames = computed(() => Object.keys(currentDims.value))

function axisPoint(index: number, ratio: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / dimNames.value.length - Math.PI / 2
  return {
    x: radarCenter + Math.cos(angle) * radarRadius * ratio,
    y: radarCenter + Math.sin(angle) * radarRadius * ratio,
  }
}

function polygonPoints(ring: number): string {
  return dimNames.value
    .map((_, index) => {
      const point = axisPoint(index, ring)
      return `${point.x},${point.y}`
    })
    .join(' ')
}

const dataPoints = computed(() =>
  dimNames.value
    .map((name, index) => {
      const point = axisPoint(index, (currentDims.value[name] ?? 0) / 100)
      return `${point.x},${point.y}`
    })
    .join(' '),
)

function labelPoint(index: number): { x: number; y: number } {
  const point = axisPoint(index, 1.24)
  return { x: point.x, y: point.y + 4 }
}

function trendX(index: number): number {
  const count = skillTrend.periods.length
  return 46 + (574 / (count - 1)) * index
}

function trendY(value: number): number {
  return 200 - (value / 100) * 160
}

function seriesColor(name: string): string {
  if (name === '技术深度') return 'var(--green)'
  if (name === '表达沟通') return 'var(--gold-600)'
  return 'var(--brand)'
}
</script>

<style scoped>
.skillmap-page {
  display: grid;
  gap: 18px;
}

.skillmap-page h1 svg {
  width: 24px;
  height: 24px;
  color: var(--brand);
}

.skill-top {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
  align-items: stretch;
}

.col5 { grid-column: span 5; }
.col7 { grid-column: span 7; }

.ow-card + .ow-card {
  margin-top: 18px;
}

.radar-wrap {
  display: grid;
  justify-items: center;
}

.radar {
  width: min(100%, 320px);
}

.radar-label {
  fill: var(--muted);
  font-size: 11px;
  font-weight: 700;
}

.radar-legend {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: 8px;
  margin-top: 14px;
  width: 100%;
}

.radar-legend .rl {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 9px;
  color: var(--ink-2);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 9px;
  font-size: 12.5px;
}

.radar-legend .rl i {
  width: 9px;
  height: 9px;
  flex: none;
  background: var(--brand);
  border-radius: 3px;
}

.radar-legend .rl b {
  margin-left: auto;
  color: var(--brand-700);
  font-size: 13px;
}

.dim-list {
  display: grid;
  gap: 10px;
}

.skill-dim-row {
  display: grid;
  grid-template-columns: 1fr 140px 36px;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 12px;
  transition: background 0.14s, transform 0.1s, border-color 0.14s;
}

.skill-dim-row:hover {
  background: var(--surface-3);
  border-color: var(--line-2);
  transform: translateX(2px);
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

.level-tag {
  padding: 1px 7px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 800;
}

.level-tag.excellent {
  background: linear-gradient(180deg, #e9f8ef, #d8f3e2);
  color: #0f7a40;
}

.level-tag.good {
  background: linear-gradient(180deg, var(--brand-50), var(--brand-100));
  color: var(--brand-700);
}

.level-tag.avg {
  background: linear-gradient(180deg, #fdf3df, #fbebc6);
  color: #9a6a00;
}

.level-tag.basic {
  background: linear-gradient(180deg, #fdecec, #fbdada);
  color: #b93b3b;
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
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 42%);
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
  gap: 18px;
  margin-top: 12px;
  color: var(--muted);
  font-size: 12px;
  flex-wrap: wrap;
}

.trend-legend span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.trend-legend i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.insight-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  background: var(--surface-2);
  border-top: 1px solid var(--line);
}

.insight {
  padding: 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
}

.insight .label {
  display: block;
  margin-bottom: 6px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.insight .value {
  margin-bottom: 6px;
  color: var(--ink);
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
}

.insight .desc {
  color: var(--ink-2);
  font-size: 12.5px;
  line-height: 1.6;
}

@media (max-width: 1100px) {
  .col5,
  .col7 {
    grid-column: span 12;
  }

  .insight-strip {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 680px) {
  .skill-dim-row {
    grid-template-columns: 1fr 36px;
  }

  .dim-track {
    grid-column: 1 / -1;
  }

  .insight-strip {
    grid-template-columns: 1fr;
  }
}
</style>
