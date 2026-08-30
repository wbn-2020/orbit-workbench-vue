<template>
  <div class="page reports-page">
    <header class="ow-page-top">
      <div>
        <div class="ow-crumb">数据 / 我的报告中心</div>
        <h1><FileBarChart aria-hidden="true" /> 我的报告中心</h1>
        <div class="sub">查看、对比多份面试 / 笔试报告（演示数据）</div>
      </div>
      <div class="acts">
        <div class="ow-seg">
          <button type="button" :class="{ on: mode === 'list' }" @click="mode = 'list'">列表</button>
          <button type="button" :class="{ on: mode === 'card' }" @click="mode = 'card'">卡片</button>
        </div>
      </div>
    </header>

    <div class="ow-row" style="margin-bottom: 16px;">
      <div class="ow-seg">
        <button
          v-for="filter in filters"
          :key="filter"
          type="button"
          :class="{ on: activeFilter === filter }"
          @click="activeFilter = filter"
        >
          {{ filter }}
        </button>
      </div>
      <span class="ow-hint" style="margin: 0;">勾选 2 份报告可并排对比分数与维度雷达。</span>
    </div>

    <div v-if="mode === 'list'" class="ow-tlist">
      <div v-for="report in filteredReports" :key="report.id" class="ow-titem rep-row">
        <label class="pick">
          <input
            type="checkbox"
            :checked="cmpSel.includes(report.id)"
            @change="toggleCmp(report.id)"
          >
        </label>
        <div class="score-ring" :style="{ '--score': `${report.score * 3.6}deg` }">
          <span>{{ report.score }}</span>
        </div>
        <div class="grow">
          <div class="tt">{{ report.company }} · {{ report.role }}</div>
          <div class="ow-tm">{{ report.type }} · {{ fmtDate(report.date, true) }} · 维度均分 {{ avgDim(report) }}</div>
        </div>
        <span v-for="tag in report.tags" :key="tag" class="ow-tag" :class="tagClass(tag)">{{ tag }}</span>
        <button class="ow-btn sm ghost" type="button" @click="router.push(`/interviews/${report.id}/report`)">查看</button>
      </div>
    </div>

    <div v-else class="card-grid">
      <button
        v-for="report in filteredReports"
        :key="report.id"
        type="button"
        class="ow-card rep-card"
        :class="{ sel: cmpSel.includes(report.id) }"
        @click="toggleCmp(report.id)"
      >
        <div class="ow-card-b">
          <div class="score-ring big" :style="{ '--score': `${report.score * 3.6}deg` }">
            <span>{{ report.score }}</span>
          </div>
          <div class="rep-name">{{ report.company }}</div>
          <div class="ow-tm">{{ report.role }} · {{ fmtDate(report.date, true) }}</div>
        </div>
      </button>
    </div>

    <div v-if="cmpPair.length === 2" class="compare">
      <div v-for="report in cmpPair" :key="`cmp-${report.id}`" class="ow-card">
        <div class="ow-card-h">
          <div class="ic b2"><Layers aria-hidden="true" /></div>
          {{ report.company }} · {{ report.score }} 分
        </div>
        <div class="ow-card-b">
          <div v-for="(value, name) in report.dims" :key="name" class="dim">
            <div class="name">{{ name }}</div>
            <div class="track"><i :style="{ width: `${value}%` }" /></div>
            <div class="score">{{ value }}</div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="ow-empty">勾选 2 份报告后在此并排对比（同维度、同评分规则版本才可比较；演示数据仅供布局验收）。</div>
  </div>
</template>

<script setup lang="ts">
import { FileBarChart, Layers } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { fmtDate, plusDays } from '@/mocks/island'
import { gapReports, type GapReport } from '@/mocks/gap'

const router = useRouter()
const mode = ref<'list' | 'card'>('list')
const filters = ['全部', '本月', '面试', '笔试'] as const
const activeFilter = ref<(typeof filters)[number]>('全部')
const cmpSel = ref<number[]>([])

const filteredReports = computed(() => {
  if (activeFilter.value === '面试') return gapReports.filter((report) => report.type === '面试')
  if (activeFilter.value === '笔试') return gapReports.filter((report) => report.type === '笔试')
  if (activeFilter.value === '本月') {
    const from = plusDays(-30)
    return gapReports.filter((report) => report.date >= from)
  }
  return gapReports
})

const cmpPair = computed(() => (cmpSel.value.length === 2
  ? gapReports.filter((report) => cmpSel.value.includes(report.id))
  : []))

function avgDim(report: GapReport): number {
  const values = Object.values(report.dims)
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function tagClass(tag: string): string {
  if (tag === '优秀' || tag === '已过') return 'green'
  if (tag === '待提升') return 'orange'
  return 'blue'
}

function toggleCmp(id: number): void {
  if (cmpSel.value.includes(id)) {
    cmpSel.value = cmpSel.value.filter((item) => item !== id)
    return
  }
  if (cmpSel.value.length >= 2) {
    const kept = cmpSel.value[1]
    cmpSel.value = kept === undefined ? [id] : [kept, id]
    return
  }
  cmpSel.value = [...cmpSel.value, id]
}
</script>

<style scoped>
.reports-page {
  display: grid;
  gap: 18px;
}

.reports-page h1 svg {
  width: 24px;
  height: 24px;
  color: var(--brand);
}

.grow {
  flex: 1;
  min-width: 0;
}

.pick input {
  width: 16px;
  height: 16px;
  accent-color: var(--brand);
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

.score-ring.big {
  width: 74px;
  height: 74px;
  margin: 0 auto 10px;
}

.score-ring.big span {
  width: 60px;
  height: 60px;
  font-size: 20px;
  font-weight: 900;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.rep-card {
  cursor: pointer;
  font-family: inherit;
  text-align: center;
}

.rep-card.sel {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-50);
}

.rep-name {
  margin-top: 4px;
  color: var(--ink);
  font-weight: 800;
}

.rep-row .ow-tag {
  flex: none;
}

.compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-top: 18px;
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

@media (max-width: 820px) {
  .compare {
    grid-template-columns: 1fr;
  }
}
</style>
