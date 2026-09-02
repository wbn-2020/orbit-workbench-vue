<template>
  <div class="page help-page">
    <PageHeader
      title="帮助与引导"
      description="站内能力的真实说明、边界与失败排查。这里的文案与实现同批维护：做不到的事直接写做不到，不写成即将支持。"
    />

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">开始使用</h2>
          <span class="surface-subtitle">这四步要你自己走：站内没有会替你打勾的记录，也不会自动跳到下一步</span>
        </div>
      </div>
      <div class="surface-body step-grid">
        <article v-for="step in ONBOARDING_STEPS" :key="step.index" class="step-card">
          <div class="step-no">{{ step.index }}</div>
          <h3>{{ step.title }}</h3>
          <p>{{ step.text }}</p>
          <router-link class="step-link" :to="step.to">{{ step.toLabel }}</router-link>
        </article>
      </div>
    </section>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">能力边界</h2>
          <span class="surface-subtitle">这些功能当前没有实现，不必在页面里找它们</span>
        </div>
      </div>
      <div class="surface-body">
        <ul class="boundary-list">
          <li v-for="item in CAPABILITY_BOUNDARIES" :key="item.name">
            <div class="boundary-head">
              <b>{{ item.name }}</b>
              <span class="ow-status" :class="item.status === '已实现但受限' ? 'run' : 'off'">{{ item.status }}</span>
            </div>
            <p class="muted">{{ item.note }}</p>
          </li>
        </ul>
      </div>
    </section>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">常见问题</h2>
          <span class="surface-subtitle">
            {{ visibleFaqs.length }} 个问题<span v-if="activeCat !== '全部'"> · {{ activeCat }}</span>
          </span>
        </div>
        <el-input
          v-model="keyword"
          :prefix-icon="Search"
          clearable
          placeholder="搜索问题或答案"
          style="width: min(260px, 100%)"
        />
      </div>
      <div class="surface-body">
        <div class="cat-row">
          <button
            v-for="cat in catOptions"
            :key="cat"
            type="button"
            class="cat-chip"
            :class="{ on: cat === activeCat }"
            @click="activeCat = cat"
          >
            {{ cat }}
          </button>
        </div>

        <EmptyState
          v-if="!visibleFaqs.length"
          title="没有匹配的问题"
          description="帮助内容是人工按当前实现整理的，可能没覆盖你的问题。换个关键词、切回「全部」，或者直接看下面的失败排查。"
          :icon="Search"
        />
        <el-collapse v-else v-model="opened">
          <el-collapse-item v-for="(faq, index) in visibleFaqs" :key="faq.q" :name="faq.q">
            <template #title>
              <span class="faq-title">
                <span class="faq-no">{{ index + 1 }}</span>
                <span class="faq-q">{{ faq.q }}</span>
                <span class="ow-tag blue">{{ faq.cat }}</span>
              </span>
            </template>
            <p class="faq-a">{{ faq.a }}</p>
          </el-collapse-item>
        </el-collapse>
      </div>
    </section>

    <section class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">失败排查</h2>
          <span class="surface-subtitle">只列当前版本确实会出现的现象与真能做的动作，不写做不到的恢复承诺</span>
        </div>
      </div>
      <div class="surface-body">
        <ul class="trouble-list">
          <li v-for="row in TROUBLESHOOTING" :key="row.when">
            <div class="trouble-when">{{ row.when }}</div>
            <p class="trouble-symptom">{{ row.symptom }}</p>
            <div class="trouble-actions">
              <span v-for="action in row.actions" :key="action" class="ow-tag green">{{ action }}</span>
            </div>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import {
  CAPABILITY_BOUNDARIES,
  HELP_CATEGORIES,
  HELP_FAQS,
  ONBOARDING_STEPS,
  TROUBLESHOOTING,
} from '@/content/helpContent'
import EmptyState from '@/components/EmptyState.vue'
import PageHeader from '@/components/PageHeader.vue'

const catOptions = ['全部', ...HELP_CATEGORIES]

const keyword = ref('')
const activeCat = ref<string>('全部')
const opened = ref<string[]>([])

const visibleFaqs = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return HELP_FAQS.filter((faq) => {
    const matchKw = !kw || `${faq.q}${faq.a}${faq.cat}`.toLowerCase().includes(kw)
    const matchCat = activeCat.value === '全部' || faq.cat === activeCat.value
    return matchKw && matchCat
  })
})
</script>

<style scoped>
.step-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.step-card {
  display: grid;
  align-content: start;
  gap: 6px;
  padding: 14px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 12px;
}

.step-no {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  color: var(--brand-700);
  background: var(--brand-100);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 900;
}

.step-card h3 {
  margin: 0;
  color: var(--ow-ink-secondary);
  font-size: 13.5px;
}

.step-card p {
  margin: 0;
  color: var(--ink-2);
  font-size: 12.5px;
  line-height: 1.7;
}

.step-link {
  color: var(--brand-700);
  font-size: 12.5px;
  font-weight: 700;
  text-decoration: none;
}

.step-link:hover {
  text-decoration: underline;
}

.boundary-list,
.trouble-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.boundary-list li,
.trouble-list li {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  background: var(--surface-2);
  border: 1px solid var(--ow-line-soft);
  border-radius: 10px;
  font-size: 12.5px;
}

.boundary-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.boundary-list p {
  margin: 0;
  line-height: 1.7;
}

.cat-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.cat-chip {
  padding: 4px 12px;
  color: var(--ink-2);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 9px;
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.cat-chip.on {
  color: var(--brand-700);
  background: var(--brand-50);
  border-color: var(--brand-200);
}

.faq-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.faq-no {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.faq-q {
  color: var(--ow-ink-secondary);
  font-size: 13.5px;
  font-weight: 700;
}

.faq-a {
  margin: 0;
  color: var(--ink-2);
  font-size: 13px;
  line-height: 1.8;
}

.trouble-when {
  color: var(--ow-ink-secondary);
  font-size: 13px;
  font-weight: 800;
}

.trouble-symptom {
  margin: 0;
  color: var(--ink-2);
  line-height: 1.7;
}

.trouble-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}

@media (max-width: 720px) {
  .step-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
