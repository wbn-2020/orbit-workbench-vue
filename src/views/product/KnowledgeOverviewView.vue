<template>
  <div class="ko">
    <header class="ko-head">
      <div>
        <p class="ko-eyebrow">资料库</p>
        <h1>知识总览</h1>
        <p class="ko-sub">
          你积累的知识分三类：来自面试报告确认的<b>项目事实</b>、从工作记录蒸馏的<b>知识卡片</b>、
          项目资料切片出的<b>知识块</b>。它们各有用途，这里放在一起看总量。
        </p>
      </div>
      <el-button :icon="RefreshCw" :loading="loading" @click="load">刷新</el-button>
    </header>

    <ErrorState v-if="loadError" :message="loadError" :retry="load" />
    <div v-else-if="loading" class="ow-card">
      <div class="ow-card-b"><el-skeleton :rows="6" animated /></div>
    </div>

    <template v-else-if="data">
      <section class="ko-stats">
        <div class="ko-stat">
          <span class="ko-stat-num">{{ data.knowledgeCards.total }}</span>
          <span class="ko-stat-label">知识卡片</span>
          <RouterLink to="/work-sedimentation" class="ko-stat-link">来自工作记录 →</RouterLink>
        </div>
        <div class="ko-stat">
          <span class="ko-stat-num">{{ data.projectFacts.confirmed }}</span>
          <span class="ko-stat-label">已确认项目事实</span>
          <span class="ko-stat-extra">待确认 {{ data.projectFacts.analyzed }} · 已归档 {{ data.projectFacts.archived }}</span>
        </div>
        <div class="ko-stat">
          <span class="ko-stat-num">{{ data.projectChunks.total }}</span>
          <span class="ko-stat-label">项目知识块</span>
          <RouterLink to="/knowledge/ask" class="ko-stat-link">去知识库问答 →</RouterLink>
        </div>
      </section>

      <section v-if="dueCards.length" class="ow-card ko-due">
        <div class="ow-card-h">
          <div class="ic b3"><AlarmClock aria-hidden="true" /></div>
          今日到期 · {{ dueCards.length }} 张
        </div>
        <div class="ow-card-b">
          <ul class="ko-due-list">
            <li v-for="card in dueCards" :key="card.id" class="ko-due-item">
              <div class="ko-due-body">
                <b>{{ card.title }}</b>
                <span class="ko-due-meta">
                  {{ card.overdueDays > 0 ? `已到期 ${card.overdueDays} 天` : '今天到期' }}
                  · 第 {{ card.reviewStage }} 轮
                </span>
              </div>
              <button class="ow-btn sm" type="button" :disabled="reviewingId === card.id" @click="review(card.id)">
                {{ reviewingId === card.id ? '记录中…' : '记一次回顾' }}
              </button>
            </li>
          </ul>
        </div>
      </section>

      <div class="ko-grid">
        <section class="ow-card ko-col">
          <div class="ow-card-h">
            <div class="ic b1"><Sparkles aria-hidden="true" /></div>
            最近的知识卡片
          </div>
          <div class="ow-card-b">
            <ul class="ko-list">
              <li v-for="card in data.knowledgeCards.recent" :key="card.id" class="ko-item">
                <b>{{ card.title }}</b>
                <p>{{ card.summary }}</p>
              </li>
              <li v-if="!data.knowledgeCards.recent.length" class="ko-empty">
                还没有知识卡片。<RouterLink to="/work-sedimentation">去工作记录蒸馏一条 →</RouterLink>
              </li>
            </ul>
          </div>
        </section>

        <section class="ow-card ko-col">
          <div class="ow-card-h">
            <div class="ic b2"><BadgeCheck aria-hidden="true" /></div>
            最近确认的项目事实
          </div>
          <div class="ow-card-b">
            <ul class="ko-list">
              <li v-for="fact in data.projectFacts.recent" :key="fact.id" class="ko-item">
                <b>{{ fact.title }}</b>
                <p>{{ fact.content }}</p>
              </li>
              <li v-if="!data.projectFacts.recent.length" class="ko-empty">
                还没有已确认的项目事实。<RouterLink to="/projects">去项目资料生成并确认 →</RouterLink>
              </li>
            </ul>
          </div>
        </section>
      </div>

      <p class="ko-note">
        知识块是检索切片，用于知识库问答，不在本页逐条展示；
        面试出题可以引用你的知识卡片与项目事实（新建面试时可选择）。
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { AlarmClock, BadgeCheck, RefreshCw, Sparkles } from 'lucide-vue-next'
import {
  getDueCards,
  getKnowledgeOverview,
  reviewCard,
  type DueCard,
  type KnowledgeOverview,
} from '@/api/knowledgeOverview'
import { ElMessage } from 'element-plus' 
import { problemMessage } from '@/api/http'
import ErrorState from '@/components/ErrorState.vue'

const data = ref<KnowledgeOverview | null>(null)
const dueCards = ref<DueCard[]>([])
const reviewingId = ref<string | null>(null)
const loading = ref(true)
const loadError = ref('')

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    data.value = await getKnowledgeOverview()
    try {
      dueCards.value = await getDueCards()
    } catch {
      dueCards.value = []
    }
  } catch (error) {
    loadError.value = problemMessage(error)
  } finally {
    loading.value = false
  }
}

async function review(id: string): Promise<void> {
  if (reviewingId.value) return
  reviewingId.value = id
  try {
    await reviewCard(id)
    dueCards.value = dueCards.value.filter((card) => card.id !== id)
    ElMessage.success('已记一次回顾，下次复习日已按阶梯推进')
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    reviewingId.value = null
  }
}

onMounted(load)
</script>

<style scoped>
.ko {
  display: grid;
  gap: 18px;
}

.ko-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.ko-eyebrow {
  margin: 0 0 6px;
  color: var(--ow-eyebrow, #16634f);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 2px;
}

.ko-head h1 {
  margin: 0;
  color: var(--ow-ink);
  font-size: 24px;
  font-weight: 800;
}

.ko-sub {
  margin: 10px 0 0;
  max-width: 64ch;
  color: var(--ow-muted, #52685e);
  font-size: 14px;
  line-height: 1.7;
}

.ko-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.ko-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 18px 20px;
  border: 1px solid var(--ow-line-soft, rgb(31 111 92 / 14%));
  border-radius: 14px;
  background: var(--ow-surface, #fff);
}

.ko-stat-num {
  color: var(--ow-ink);
  font-size: 28px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.ko-stat-label {
  color: var(--ow-ink-secondary, #3f574c);
  font-size: 13px;
  font-weight: 700;
}

.ko-stat-extra {
  color: var(--ow-muted, #52685e);
  font-size: 12px;
}

.ko-stat-link {
  color: #16634f;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}

.ko-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.ko-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.ko-item {
  padding: 10px 12px;
  border: 1px solid var(--ow-line-soft, rgb(31 111 92 / 12%));
  border-radius: 10px;
}

.ko-item b {
  color: var(--ow-ink);
  font-size: 13.5px;
}

.ko-item p {
  margin: 4px 0 0;
  color: var(--ow-muted, #52685e);
  font-size: 12.5px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ko-empty {
  color: var(--ow-muted, #52685e);
  font-size: 13px;
}

.ko-empty a {
  color: #16634f;
  font-weight: 700;
}

.ko-note {
  margin: 0;
  color: var(--ow-muted, #52685e);
  font-size: 12.5px;
  line-height: 1.7;
}

@media (max-width: 900px) {
  .ko-stats,
  .ko-grid {
    grid-template-columns: 1fr;
  }

  .ko-head {
    flex-direction: column;
  }
}

.ko-due-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.ko-due-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--ow-line-soft, rgb(31 111 92 / 12%));
  border-radius: 10px;
}

.ko-due-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ko-due-body b {
  color: var(--ow-ink);
  font-size: 13.5px;
}

.ko-due-meta {
  color: var(--ow-muted, #52685e);
  font-size: 12px;
}
</style>
