<template>
  <div class="page jd-page">
    <header class="ow-page-top">
      <div>
        <div class="ow-crumb">功能缺口 / 岗位与 JD 匹配</div>
        <h1><BriefcaseBusiness aria-hidden="true" /> 岗位与 JD 匹配</h1>
        <div class="sub">搜索岗位，查看匹配度拆解（演示数据；「立即投递」为演示占位，不连接招聘网站）</div>
      </div>
    </header>

    <div class="ow-row" style="margin-bottom: 16px;">
      <div class="search-wrap">
        <Search class="search-icon" aria-hidden="true" />
        <input v-model="keyword" class="ow-input" placeholder="搜索岗位名 / 公司 / 技能标签…">
      </div>
      <span class="ow-hint" style="margin: 0;">{{ filtered.length }} 个岗位</span>
    </div>

    <div v-if="!filtered.length" class="ow-empty-state">
      <div class="ic">🔍</div>
      <div class="t">没有匹配的岗位</div>
      <div class="d">试试其他关键词，如「Java」「AI」「远程」。</div>
    </div>

    <div class="jd-grid">
      <div v-for="job in filtered" :key="job.id" class="ow-card jd-card">
        <div class="ow-card-b">
          <div class="jd-head">
            <div>
              <div class="jd-title">{{ job.title }}</div>
              <div class="ow-tm">{{ job.company }} · {{ job.city }}</div>
            </div>
            <span class="match-badge" :class="matchClass(job.match)">匹配 {{ job.match }}%</span>
          </div>
          <div class="salary">💰 {{ job.salary }}</div>
          <div class="jd-tags">
            <span v-for="tag in job.tags" :key="tag" class="ow-tag blue">{{ tag }}</span>
          </div>
          <div class="meter-row">
            <span>匹配度</span>
            <div class="meter"><i :style="{ width: `${job.match}%` }" /></div>
          </div>
          <div class="ow-row end" style="margin-top: 12px;">
            <button class="ow-btn sm ghost" type="button" @click="openJd(job)">查看拆解</button>
            <button class="ow-btn sm gold" type="button" @click="applyJd(job)">立即投递</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selected" class="ow-modal" @click.self="selected = null">
      <div class="box wide">
        <h3>{{ selected.title }}</h3>
        <p class="mh-sub">{{ selected.company }} · {{ selected.city }} · {{ selected.salary }}</p>
        <div class="jd-tags" style="margin-bottom: 14px;">
          <span v-for="tag in selected.tags" :key="tag" class="ow-tag blue">{{ tag }}</span>
        </div>
        <p class="jd-desc">{{ selected.desc }}</p>
        <h4 class="split-title">匹配度拆解</h4>
        <div class="dim">
          <div class="name">技能匹配</div>
          <div class="track"><i :style="{ width: `${selected.bd.skill}%`, background: barColor(selected.bd.skill) }" /></div>
          <div class="score">{{ selected.bd.skill }}%</div>
        </div>
        <div class="dim">
          <div class="name">经验匹配</div>
          <div class="track"><i :style="{ width: `${selected.bd.exp}%`, background: barColor(selected.bd.exp) }" /></div>
          <div class="score">{{ selected.bd.exp }}%</div>
        </div>
        <div class="dim">
          <div class="name">项目匹配</div>
          <div class="track"><i :style="{ width: `${selected.bd.project}%`, background: barColor(selected.bd.project) }" /></div>
          <div class="score">{{ selected.bd.project }}%</div>
        </div>
        <div class="ow-note" style="margin-top: 12px;">
          匹配结论由演示规则生成；正式实现会记录所用简历版本、档案版本与 JD 版本，并区分「已具备 / 待补齐 / 需人工确认」。
        </div>
        <div class="ow-row end" style="margin-top: 16px;">
          <button class="ow-btn ghost" type="button" @click="selected = null">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BriefcaseBusiness, Search } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue'

import { gapJds, type GapJd } from '@/mocks/gap'

const keyword = ref('')
const selected = ref<GapJd | null>(null)

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return gapJds
  return gapJds.filter((job) => `${job.title}${job.company}${job.tags.join('')}${job.city}`.toLowerCase().includes(kw))
})

function matchClass(match: number): string {
  if (match >= 80) return 'green'
  if (match >= 65) return 'gold'
  return 'red'
}

function barColor(value: number): string {
  if (value >= 80) return 'var(--green)'
  if (value >= 60) return 'var(--brand)'
  return 'var(--orange)'
}

function openJd(job: GapJd): void {
  selected.value = job
}

function applyJd(job: GapJd): void {
  ElMessage.info(`「${job.company} · ${job.title}」自动投递不在当前范围（演示占位），可手动记录到求职进度。`)
}
</script>

<style scoped>
.jd-page {
  display: grid;
  gap: 18px;
}

.jd-page h1 svg {
  width: 24px;
  height: 24px;
  color: var(--brand);
}

.search-wrap {
  position: relative;
  flex: 1;
  max-width: 420px;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 12px;
  width: 16px;
  height: 16px;
  color: var(--muted);
  transform: translateY(-50%);
  pointer-events: none;
}

.search-wrap .ow-input {
  padding-left: 36px;
}

.jd-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.jd-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.jd-title {
  color: var(--ink);
  font-size: 15.5px;
  font-weight: 800;
}

.match-badge {
  flex: none;
  padding: 2px 10px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 800;
}

.match-badge.green {
  color: var(--green-700);
  background: var(--green-50);
}

.match-badge.gold {
  color: var(--gold-600);
  background: var(--gold-50);
}

.match-badge.red {
  color: var(--red-600);
  background: var(--red-50);
}

.salary {
  margin: 10px 0;
  color: var(--gold-600);
  font-size: 14px;
  font-weight: 700;
}

.jd-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.meter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--muted);
  font-size: 12px;
}

.meter {
  flex: 1;
  max-width: 160px;
  height: 9px;
  background: var(--line-2);
  border-radius: 6px;
  overflow: hidden;
}

.meter i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--brand), #6aa6ff);
  border-radius: 6px;
}

.mh-sub {
  margin: -10px 0 16px;
  color: var(--muted);
  font-size: 13px;
}

.jd-desc {
  margin: 0 0 16px;
  color: var(--ink-2);
  font-size: 13.5px;
  line-height: 1.7;
}

.split-title {
  margin: 0 0 10px;
  color: var(--ink);
  font-size: 14px;
}

.dim {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.dim .name {
  width: 84px;
  flex: 0 0 84px;
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
}

.dim .score {
  width: 40px;
  flex: 0 0 40px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 800;
  text-align: right;
}
</style>
