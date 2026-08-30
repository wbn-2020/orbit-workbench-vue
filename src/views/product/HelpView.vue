<template>
  <div class="page help-page">
    <header class="ow-page-top">
      <div>
        <div class="ow-crumb">系统 / 帮助与引导</div>
        <h1><CircleHelp aria-hidden="true" /> 帮助与引导中心</h1>
        <div class="sub">搜索问题、按分类查看，或跟随向导快速上手</div>
      </div>
    </header>

    <div class="help-search-wrap">
      <div class="help-search">
        <Search aria-hidden="true" />
        <input v-model="keyword" class="ow-input" placeholder="搜索功能、概念或常见问题…">
      </div>
      <div class="help-cats">
        <button
          v-for="cat in cats"
          :key="cat"
          type="button"
          class="help-cat"
          :class="{ active: activeCat === cat }"
          @click="activeCat = cat"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <div class="guide-grid">
      <div v-for="guide in HELP_GUIDES" :key="guide.id" class="help-guide-card" @click="openGuide(guide)">
        <span class="arrow"><ChevronRight aria-hidden="true" /></span>
        <div class="icon">{{ guide.icon }}</div>
        <div class="title">{{ guide.title }}</div>
        <div class="desc">{{ guide.desc }}</div>
        <button class="ow-btn xs" type="button">查看</button>
      </div>
    </div>

    <div class="faq-count">{{ filteredFaqs.length }} 个问题<template v-if="activeCat !== '全部'"> · {{ activeCat }}</template></div>

    <div v-if="!filteredFaqs.length" class="ow-empty-state">
      <div class="ic">🔍</div>
      <div class="t">没有匹配的问题</div>
      <div class="d">换个关键词，或切换到「全部」分类查看。</div>
    </div>

    <div v-for="(group, cat) in groupedFaqs" :key="cat" class="help-faq-group">
      <div class="help-faq-group-title">{{ cat }}</div>
      <div class="help-faq-list">
        <div v-for="faq in group" :key="faq.q" class="help-faq-item" :class="{ open: openFaq === faq.q }">
          <button class="help-faq-q" type="button" :aria-expanded="openFaq === faq.q" @click="toggleFaq(faq.q)">
            <span class="idx">{{ faq.no }}</span>
            <span class="txt">{{ faq.q }}</span>
            <span class="ow-tag" :class="catColor(cat)">{{ cat }}</span>
            <ChevronDown class="chev" aria-hidden="true" />
          </button>
          <div class="help-faq-a">{{ faq.a }}</div>
        </div>
      </div>
    </div>

    <div v-if="guideBody" class="ow-modal" @click.self="guideBody = null">
      <div class="box">
        <div style="font-size: 34px;">{{ guideBody.icon }}</div>
        <h3 style="margin-top: 8px;">{{ guideBody.title }}</h3>
        <p class="mh-sub">引导说明 · 原型演示</p>
        <p class="guide-text">{{ guideBody.body }}</p>
        <div class="ow-row end">
          <button class="ow-btn" type="button" @click="guideBody = null">知道了（占位）</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown, ChevronRight, CircleHelp, Search } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import { HELP_FAQS, HELP_GUIDES } from '@/mocks/gap'

const keyword = ref('')
const activeCat = ref('全部')
const openFaq = ref('')
const guideBody = ref<(typeof HELP_GUIDES)[number] | null>(null)

const cats = ['全部', ...new Set(HELP_FAQS.map((faq) => faq.cat))]

const filteredFaqs = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return HELP_FAQS.filter((faq) => {
    const matchKw = !kw || `${faq.q}${faq.a}${faq.cat}`.toLowerCase().includes(kw)
    const matchCat = activeCat.value === '全部' || faq.cat === activeCat.value
    return matchKw && matchCat
  })
})

const groupedFaqs = computed(() => {
  const groups: Record<string, { no: number; q: string; a: string }[]> = {}
  filteredFaqs.value.forEach((faq) => {
    const bucket = groups[faq.cat] ?? []
    bucket.push({ no: HELP_FAQS.indexOf(faq) + 1, q: faq.q, a: faq.a })
    groups[faq.cat] = bucket
  })
  return groups
})

function toggleFaq(q: string): void {
  openFaq.value = openFaq.value === q ? '' : q
}

function catColor(cat: string): string {
  const map: Record<string, string> = { 简历: 'blue', 报告: 'purple', 错题: 'red', 岗位: 'orange', 技能: 'green', 设置: 'cyan', 通用: 'gray' }
  return map[cat] ?? 'gray'
}

function openGuide(guide: (typeof HELP_GUIDES)[number]): void {
  guideBody.value = guide
}
</script>

<style scoped>
.help-page {
  display: grid;
  gap: 18px;
}

.help-page h1 svg {
  width: 24px;
  height: 24px;
  color: var(--brand);
}

.help-search-wrap {
  max-width: 680px;
  width: 100%;
  margin: 0 auto;
}

.help-search {
  position: relative;
}

.help-search svg {
  position: absolute;
  top: 50%;
  left: 16px;
  width: 18px;
  height: 18px;
  color: var(--muted);
  transform: translateY(-50%);
  pointer-events: none;
}

.help-search input {
  height: 50px;
  padding-left: 44px;
  border-radius: 14px;
  font-size: 15px;
}

.help-cats {
  display: flex;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.help-cat {
  padding: 7px 16px;
  color: var(--ink-2);
  background: var(--glass);
  border: 1px solid var(--line-2);
  border-radius: 20px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  transition: background 0.14s, color 0.14s, border-color 0.14s, transform 0.1s;
}

.help-cat:hover {
  border-color: var(--brand);
  color: var(--brand-700);
  transform: translateY(-1px);
}

.help-cat.active {
  color: #fff;
  background: linear-gradient(180deg, var(--btn-1), var(--btn-2));
  border-color: transparent;
  box-shadow: var(--btn-shadow);
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
}

.help-guide-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 24px;
  background: var(--glass);
  border: 1px solid var(--glass-border);
  border-radius: var(--r);
  box-shadow: var(--shadow);
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.16s, box-shadow 0.16s;
}

.help-guide-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md), 0 0 0 1px var(--card-ring);
}

.help-guide-card .icon {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  background: var(--surface-2);
  border-radius: 16px;
  font-size: 30px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 55%);
}

.help-guide-card .title {
  color: var(--ink);
  font-size: 17px;
  font-weight: 800;
}

.help-guide-card .desc {
  flex: 1;
  color: var(--ink-2);
  font-size: 13px;
  line-height: 1.65;
}

.help-guide-card .arrow {
  position: absolute;
  top: 18px;
  right: 18px;
  color: var(--muted);
  transition: transform 0.2s, color 0.14s;
}

.help-guide-card:hover .arrow {
  color: var(--brand);
  transform: translateX(3px);
}

.faq-count {
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

.help-faq-group {
  margin-bottom: 20px;
}

.help-faq-group-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 10px 4px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.help-faq-group-title::after {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--line), transparent);
  content: '';
}

.help-faq-list {
  display: grid;
  gap: 10px;
}

.help-faq-item {
  overflow: hidden;
  background: var(--surface-2);
  border: 1.5px solid var(--line);
  border-radius: 13px;
  transition: border-color 0.14s, box-shadow 0.14s, transform 0.1s;
}

.help-faq-item:hover {
  border-color: var(--line-2);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.help-faq-item.open {
  border-color: var(--brand-200);
  box-shadow: 0 0 0 1px var(--brand-50);
}

.help-faq-q {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 16px;
  color: var(--ink);
  background: transparent;
  border: 0;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
}

.help-faq-q .idx {
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  place-items: center;
  color: var(--brand-700);
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
}

.help-faq-q .txt {
  flex: 1;
  min-width: 0;
}

.help-faq-q .chev {
  flex: none;
  width: 18px;
  height: 18px;
  color: var(--muted);
  transition: transform 0.2s;
}

.help-faq-item.open .chev {
  color: var(--brand);
  transform: rotate(180deg);
}

.help-faq-a {
  display: none;
  padding: 0 16px 14px 54px;
  color: var(--ink-2);
  font-size: 13.5px;
  line-height: 1.75;
}

.help-faq-item.open .help-faq-a {
  display: block;
  animation: ow-rise 0.25s ease both;
}

.mh-sub {
  margin: -10px 0 16px;
  color: var(--muted);
  font-size: 13px;
}

.guide-text {
  color: var(--ink-2);
  font-size: 14px;
  line-height: 1.7;
}

@media (max-width: 680px) {
  .guide-grid {
    grid-template-columns: 1fr;
  }
}
</style>
