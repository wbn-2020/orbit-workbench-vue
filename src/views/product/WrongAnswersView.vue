<template>
  <div class="page wrong-page">
    <header class="ow-page-top">
      <div>
        <div class="ow-crumb">成长 / 错题本</div>
        <h1><TriangleAlert aria-hidden="true" /> 错题本 · 专项训练</h1>
        <div class="sub">按维度聚合薄弱点，重练巩固（演示数据）</div>
      </div>
      <div class="acts">
        <button class="ow-btn gold" type="button" @click="startQuiz">重练薄弱点</button>
      </div>
    </header>

    <div class="wrong-grid">
      <div class="col8">
        <div class="ow-row" style="margin-bottom: 14px;">
          <select v-model="wrongDim" class="ow-input" style="max-width: 200px;" aria-label="按维度筛选">
            <option value="全部">全部维度</option>
            <option v-for="dim in dims" :key="dim" :value="dim">{{ dim }}</option>
          </select>
          <select v-model="wrongSrc" class="ow-input" style="max-width: 200px;" aria-label="按来源筛选">
            <option value="全部">全部来源</option>
            <option v-for="src in sources" :key="src" :value="src">{{ src }}</option>
          </select>
          <span class="ow-hint" style="margin: 0 0 0 auto;">共 {{ gapWrong.length }} 道错题 · 已掌握 {{ masteredCount }} 道</span>
        </div>

        <div v-if="!filteredList.length" class="ow-empty-state">
          <div class="ic">🎉</div>
          <div class="t">该筛选下没有错题</div>
          <div class="d">换个维度或来源看看吧。</div>
        </div>
        <div v-else class="wrong-list">
          <div v-for="item in filteredList" :key="item.id" class="wrong-card">
            <div class="wrong-tags">
              <span class="ow-tag" :class="item.mastered ? 'green' : 'orange'">{{ item.mastered ? '已掌握' : '待巩固' }}</span>
              <span class="ow-tag blue">{{ item.dim }}</span>
              <span class="ow-tag gray">{{ item.source }}</span>
            </div>
            <div class="q">{{ item.q }}</div>
            <div class="qa">
              <div class="bl mine"><div class="h">我的回答</div>{{ item.mine }}</div>
              <div class="bl ref"><div class="h">参考答案</div>{{ item.ref }}</div>
              <div class="bl ana"><div class="h">解析</div>{{ item.analysis }}</div>
            </div>
            <div class="ow-row end" style="margin-top: 12px;">
              <button class="ow-btn xs ghost" type="button" @click="toggleMastered(item)">
                {{ item.mastered ? '标记为待巩固' : '标记为已掌握' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="col4 side">
        <div class="ow-card">
          <div class="ow-card-h">
            <div class="ic b4"><CircleCheckBig aria-hidden="true" /></div>
            掌握进度
          </div>
          <div class="ow-card-b">
            <div class="mastery-total">
              <span>总体掌握度</span>
              <b>{{ masteryPercent }}%</b>
            </div>
            <div class="ow-prog" style="margin-top: 5px;"><i :style="{ width: `${masteryPercent}%` }" /></div>
            <div v-for="(stat, dim) in masteryByDim" :key="dim" class="dim">
              <div class="name">{{ dim }}</div>
              <div class="track"><i class="green" :style="{ width: `${(stat.m / stat.t) * 100}%` }" /></div>
              <div class="score">{{ stat.m }}/{{ stat.t }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="quiz" class="ow-modal" @click.self="quiz = null">
      <div class="box wide">
        <template v-if="!quiz.finished && currentQuiz">
          <h3>专项训练 · {{ currentQuiz.dim }}</h3>
          <p class="quiz-sub">第 {{ quiz.idx + 1 }} / {{ quiz.items.length }} 题 · 来源：{{ currentQuiz.source }} · 演示测验</p>
          <div class="quiz-q">{{ currentQuiz.q }}</div>
          <button
            v-for="(option, index) in currentQuiz.opt"
            :key="option"
            type="button"
            class="quiz-opt"
            :class="quizClass(index)"
            :disabled="quiz.picked !== null"
            @click="pick(index)"
          >
            {{ String.fromCharCode(65 + index) }}. {{ option }}
          </button>
          <div v-if="feedback" class="quiz-feedback show" :class="feedback.ok ? 'ok' : 'err'">
            {{ feedback.text }}
          </div>
          <div class="ow-row" style="margin-top: 14px; justify-content: space-between;">
            <button class="ow-btn ghost" type="button" @click="quiz = null">退出训练</button>
            <button class="ow-btn" type="button" :disabled="quiz.picked === null" @click="next">
              {{ quiz.idx === quiz.items.length - 1 ? '结算' : '下一题' }}
            </button>
          </div>
        </template>
        <template v-else>
          <div style="text-align: center;">
            <div style="font-size: 40px;">{{ resultEmoji }}</div>
            <h3 style="justify-content: center;">训练结算（模拟）</h3>
            <div class="result-score" :style="{ color: resultColor }">{{ resultAcc }}<small> 分</small></div>
            <div class="ow-hint">正确 {{ quiz.correct }} / {{ quiz.items.length }} 题 · 正确率 {{ resultAcc }}% · 答对的错题已标记为「已掌握」（仅当前演示会话）。</div>
            <div class="ow-row" style="justify-content: center; margin-top: 16px; gap: 10px;">
              <button class="ow-btn ghost" type="button" @click="quiz = null">关闭</button>
              <button class="ow-btn" type="button" @click="startQuiz">再来一组</button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CircleCheckBig, TriangleAlert } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import { gapWrong, type GapWrongItem } from '@/mocks/gap'

const items = gapWrong
const wrongDim = ref('全部')
const wrongSrc = ref('全部')

const dims = [...new Set(items.map((item) => item.dim))]
const sources = [...new Set(items.map((item) => item.source))]

const filteredList = computed(() =>
  items.filter(
    (item) =>
      (wrongDim.value === '全部' || item.dim === wrongDim.value) &&
      (wrongSrc.value === '全部' || item.source === wrongSrc.value),
  ),
)

const masteredCount = computed(() => items.filter((item) => item.mastered).length)
const masteryPercent = computed(() => (items.length ? Math.round((masteredCount.value / items.length) * 100) : 0))

const masteryByDim = computed(() => {
  const result: Record<string, { t: number; m: number }> = {}
  items.forEach((item) => {
    const bucket = result[item.dim] ?? { t: 0, m: 0 }
    bucket.t += 1
    if (item.mastered) bucket.m += 1
    result[item.dim] = bucket
  })
  return result
})

function toggleMastered(item: GapWrongItem): void {
  item.mastered = !item.mastered
}

interface QuizState {
  items: GapWrongItem[]
  idx: number
  correct: number
  picked: number | null
  finished: boolean
}

const quiz = ref<QuizState | null>(null)
const feedback = ref<{ ok: boolean; text: string } | null>(null)

const currentQuiz = computed(() => {
  const state = quiz.value
  if (!state) return null
  return state.items[state.idx] ?? null
})

function startQuiz(): void {
  const pending = items.filter((item) => !item.mastered)
  if (!pending.length) return
  quiz.value = { items: pending.slice(0, 5), idx: 0, correct: 0, picked: null, finished: false }
  feedback.value = null
}

function quizClass(index: number): string {
  const state = quiz.value
  const current = currentQuiz.value
  if (!state || state.picked === null || !current) return ''
  if (index === current.answer) return 'correct'
  if (index === state.picked) return 'wrong'
  return ''
}

function pick(index: number): void {
  const state = quiz.value
  const current = currentQuiz.value
  if (!state || state.picked !== null || !current) return
  state.picked = index
  const ok = index === current.answer
  if (ok) {
    state.correct += 1
    current.mastered = true
    feedback.value = { ok: true, text: `✅ 回答正确！${current.ref}` }
  } else {
    feedback.value = { ok: false, text: `❌ 正确答案：${String.fromCharCode(65 + current.answer)}。${current.ref}` }
  }
}

function next(): void {
  const state = quiz.value
  if (!state) return
  if (state.picked === null) return
  state.idx += 1
  state.picked = null
  feedback.value = null
  if (state.idx >= state.items.length) state.finished = true
}

const resultAcc = computed(() => {
  const state = quiz.value
  if (!state) return 0
  return Math.round((state.correct / state.items.length) * 100)
})

const resultEmoji = computed(() => (resultAcc.value >= 80 ? '🏆' : resultAcc.value >= 50 ? '💪' : '📚'))
const resultColor = computed(() => (resultAcc.value >= 80 ? 'var(--green)' : resultAcc.value >= 50 ? 'var(--gold-600)' : 'var(--red-600)'))
</script>

<style scoped>
.wrong-page {
  display: grid;
  gap: 18px;
}

.wrong-page h1 svg {
  width: 24px;
  height: 24px;
  color: var(--brand);
}

.wrong-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
}

.col4 { grid-column: span 4; }
.col8 { grid-column: span 8; }

.side {
  position: sticky;
  top: 18px;
  align-self: start;
}

.wrong-list {
  display: grid;
  gap: 14px;
}

.wrong-card {
  padding: 16px 18px;
  background: var(--glass-2);
  backdrop-filter: blur(var(--glass-2-blur));
  border: 1.5px solid var(--line);
  border-radius: 14px;
  transition: border-color 0.14s, box-shadow 0.14s;
}

.wrong-card:hover {
  border-color: var(--line-2);
  box-shadow: var(--shadow-md);
}

.wrong-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.wrong-card .q {
  color: var(--ink);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.6;
}

.qa {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 12px;
}

.bl {
  padding: 11px 13px;
  border-radius: 11px;
  color: var(--ink-2);
  font-size: 13.5px;
  line-height: 1.6;
}

.bl .h {
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  opacity: 0.85;
}

.bl.mine {
  background: var(--red-50);
  border: 1px solid #f6c9cb;
}

.bl.ref {
  background: var(--green-50);
  border: 1px solid #bfe6cd;
}

.bl.ana {
  grid-column: 1 / -1;
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.mastery-total {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 12px;
}

.mastery-total b {
  color: var(--ink);
}

.dim {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.dim .name {
  width: 84px;
  flex: 0 0 84px;
  color: var(--ink-2);
  font-size: 12.5px;
  font-weight: 600;
}

.dim .track {
  flex: 1;
  height: 9px;
  background: var(--line-2);
  border-radius: 6px;
  overflow: hidden;
}

.dim .track i.green {
  display: block;
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--green), #4cc585);
}

.dim .score {
  width: 34px;
  flex: 0 0 34px;
  color: var(--ink);
  font-size: 12.5px;
  font-weight: 800;
  text-align: right;
}

.quiz-sub {
  margin: -10px 0 16px;
  color: var(--muted);
  font-size: 13px;
}

.quiz-q {
  margin-bottom: 14px;
  color: var(--ink);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.6;
}

.quiz-opt {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  margin-bottom: 9px;
  padding: 12px 14px;
  color: var(--ink);
  background: var(--surface-2);
  border: 1.5px solid var(--line);
  border-radius: 11px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  font-size: 14px;
  transition: border-color 0.14s, background 0.14s;
}

.quiz-opt:hover:not(:disabled) {
  border-color: var(--brand);
  background: var(--brand-50);
}

.quiz-opt.correct {
  border-color: var(--green);
  background: var(--green-50);
}

.quiz-opt.wrong {
  border-color: var(--red);
  background: var(--red-50);
}

.quiz-feedback {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 11px;
  color: var(--ink-2);
  font-size: 13.5px;
  line-height: 1.65;
}

.quiz-feedback.ok {
  background: var(--green-50);
  border: 1px solid #bfe6cd;
  color: var(--green-700);
}

.quiz-feedback.err {
  background: var(--red-50);
  border: 1px solid #f6c9cb;
  color: var(--red-600);
}

.result-score {
  margin-top: 6px;
  font-size: 46px;
  font-weight: 900;
  line-height: 1;
}

.result-score small {
  color: var(--muted);
  font-size: 18px;
}

@media (max-width: 640px) {
  .qa {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1100px) {
  .col4,
  .col8 {
    grid-column: span 12;
  }

  .side {
    position: static;
  }
}
</style>
