<template>
  <div class="lu">
    <header class="lu-head">
      <div>
        <p class="lu-eyebrow">学习更新模式</p>
        <h1>学习目标与专注</h1>
        <p class="lu-sub">
          围绕识别出的技能缺口定向学习，用专注计时持续积累。右下角的专注计时器可随时开始一段深度工作。
        </p>
      </div>
    </header>

    <div class="lu-grid">
      <section class="lu-main">
        <div class="lu-card">
          <h2 class="lu-card-title">学习目标</h2>
          <div class="lu-form">
            <input
              v-model="form.title"
              class="lu-input"
              placeholder="目标，例如：掌握向量检索与 RAG 语义召回"
              aria-label="学习目标标题"
            />
            <input
              v-model="form.reason"
              class="lu-input"
              placeholder="为什么学（可选）"
              aria-label="学习目标原因"
            />
            <div class="lu-form-row">
              <input
                v-model="form.linkedSkill"
                class="lu-input"
                placeholder="关联技能（可选）"
                aria-label="关联技能"
              />
              <button class="lu-btn primary" type="button" :disabled="!canSubmit" @click="submit">
                <Plus aria-hidden="true" /> {{ submitting ? '添加中...' : '添加目标' }}
              </button>
            </div>
          </div>

          <ErrorState v-if="goalsError" :message="goalsError" :retry="load" />
          <ErrorState
            v-if="submitError"
            class="lu-submit-error"
            title="添加失败"
            :message="submitError"
            :retry="submit"
          />
          <p v-if="loading && !goals.length && !goalsError" class="goal-empty">正在加载学习目标...</p>
          <ul class="goal-list">
            <li v-for="goal in goals" :key="goal.id" class="goal-item">
              <div class="goal-head">
                <span class="goal-title">{{ goal.title }}</span>
                <span class="goal-status" :class="goal.status">{{ statusLabel(goal.status) }}</span>
              </div>
              <p v-if="goal.reason" class="goal-reason">{{ goal.reason }}</p>
              <div class="goal-progress">
                <div class="goal-bar">
                  <span class="goal-bar-fill" :style="{ width: `${goal.progress}%` }" />
                </div>
                <span class="goal-pct">{{ goal.progress }}%</span>
              </div>
              <div class="goal-actions">
                <div class="goal-progress-step" role="group" aria-label="调整进度">
                  <button
                    class="goal-step-btn"
                    type="button"
                    :aria-label="`把「${goal.title}」进度减 10`"
                    :disabled="updatingId === goal.id || goal.progress <= 0"
                    @click="adjustProgress(goal, -10)"
                  >
                    −
                  </button>
                  <button
                    class="goal-step-btn"
                    type="button"
                    :aria-label="`把「${goal.title}」进度加 10`"
                    :disabled="updatingId === goal.id || goal.progress >= 100"
                    @click="adjustProgress(goal, 10)"
                  >
                    +
                  </button>
                </div>
                <button
                  v-if="goal.status !== 'paused'"
                  class="goal-op"
                  type="button"
                  :disabled="updatingId === goal.id"
                  @click="changeStatus(goal, 'paused')"
                >
                  暂停
                </button>
                <button
                  v-if="goal.status === 'paused'"
                  class="goal-op"
                  type="button"
                  :disabled="updatingId === goal.id"
                  @click="changeStatus(goal, 'active')"
                >
                  继续
                </button>
                <button
                  v-if="goal.status !== 'done'"
                  class="goal-op done"
                  type="button"
                  :disabled="updatingId === goal.id"
                  @click="changeStatus(goal, 'done')"
                >
                  完成
                </button>
                <button
                  v-if="goal.status === 'done'"
                  class="goal-op"
                  type="button"
                  :disabled="updatingId === goal.id"
                  @click="changeStatus(goal, 'active')"
                >
                  重新开始
                </button>
              </div>
              <span v-if="goal.linkedSkill" class="goal-skill">
                <Target aria-hidden="true" /> {{ goal.linkedSkill }}
              </span>
            </li>
            <li v-if="!loading && !goalsError && !goals.length" class="goal-empty">还没有学习目标，先添加一个吧。</li>
          </ul>
        </div>
      </section>

      <aside class="lu-side">
        <div class="lu-card">
          <h2 class="lu-card-title">近 7 日专注</h2>
          <ErrorState v-if="statsError" :message="statsError" :retry="load" />
          <div v-else-if="loading && !stats.length" class="focus-loading">正在加载专注统计...</div>
          <div v-else class="focus-total">
            <span class="focus-num">{{ totalFocusMinutes }}</span>
            <span class="focus-unit">分钟</span>
          </div>
          <div v-if="stats.length" class="focus-bars">
            <div v-for="stat in stats" :key="stat.date" class="focus-bar-col" :title="`${stat.date} · ${stat.focusMinutes} 分钟`">
              <div class="focus-bar" :style="{ height: `${barHeight(stat.focusMinutes)}%` }" />
              <span class="focus-day">{{ weekday(stat.date) }}</span>
            </div>
          </div>
          <p class="focus-tip">
            <Timer aria-hidden="true" /> 用右下角计时器开始一段专注，时长会自动记录。
          </p>
        </div>
      </aside>
    </div>
    <FocusTimerWidget />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Target, Timer } from 'lucide-vue-next'
import { problemMessage, getProblem } from '@/api/http'
import {
  createLearningGoal,
  listFocusStats,
  listLearningGoals,
  updateLearningGoal,
  type BackendLearningGoalStatus,
} from '@/api/learning'
import type { FocusStat, LearningGoal, LearningGoalStatus } from '@/api/types'
import ErrorState from '@/components/ErrorState.vue'
import FocusTimerWidget from '@/components/FocusTimerWidget.vue'

const goals = ref<LearningGoal[]>([])
const stats = ref<FocusStat[]>([])
const loading = ref(false)
const goalsError = ref('')
const statsError = ref('')
const submitting = ref(false)
const submitError = ref('')
const updatingId = ref<string | null>(null)
let reloadRequested = false
let submissionKey: string | null = null
let disposed = false

const form = reactive<{ title: string; reason: string; linkedSkill: string }>({
  title: '',
  reason: '',
  linkedSkill: '',
})

const canSubmit = computed(() => form.title.trim().length > 0 && !submitting.value)

const totalFocusMinutes = computed(() => stats.value.reduce((sum, s) => sum + s.focusMinutes, 0))

const maxFocus = computed(() => Math.max(1, ...stats.value.map((s) => s.focusMinutes)))

function barHeight(minutes: number): number {
  return Math.round((minutes / maxFocus.value) * 100)
}

function statusLabel(status: LearningGoalStatus): string {
  if (status === 'active') return '进行中'
  if (status === 'paused') return '已暂停'
  return '已完成'
}

function weekday(date: string): string {
  const names = ['日', '一', '二', '三', '四', '五', '六'] as const
  const d = new Date(`${date}T00:00:00`)
  return names[d.getDay()] ?? '日'
}

async function load(): Promise<void> {
  if (loading.value) {
    reloadRequested = true
    return
  }
  loading.value = true
  goalsError.value = ''
  statsError.value = ''
  const [goalResult, statResult] = await Promise.allSettled([
    listLearningGoals(),
    listFocusStats(7),
  ])
  if (goalResult.status === 'fulfilled') {
    goals.value = goalResult.value
  } else {
    goalsError.value = problemMessage(goalResult.reason)
  }
  if (statResult.status === 'fulfilled') {
    stats.value = statResult.value
  } else {
    statsError.value = problemMessage(statResult.reason)
  }
  loading.value = false
  if (reloadRequested && !disposed) {
    reloadRequested = false
    void load()
  }
}

async function submit(): Promise<void> {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  submitError.value = ''
  submissionKey ??= createIdempotencyKey()
  try {
    await createLearningGoal({
      title: form.title.trim(),
      reason: form.reason.trim(),
      linkedSkill: form.linkedSkill.trim() || undefined,
    }, submissionKey)
    form.title = ''
    form.reason = ''
    form.linkedSkill = ''
    submissionKey = null
  } catch (error) {
    // 同键不同内容的 409：密钥已被占用，重置后用户重新提交会拿到新密钥。
    if (getProblem(error).status === 409) {
      submissionKey = null
    }
    submitError.value = problemMessage(error)
    ElMessage.error(submitError.value)
    return
  } finally {
    submitting.value = false
  }
  await load()
}

async function changeStatus(goal: LearningGoal, status: LearningGoalStatus): Promise<void> {
  if (updatingId.value) return
  updatingId.value = goal.id
  try {
    await updateLearningGoal(goal.id, {
      status: status.toUpperCase() as BackendLearningGoalStatus,
      progress: goal.progress,
    })
    await load()
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    updatingId.value = null
  }
}

async function adjustProgress(goal: LearningGoal, delta: number): Promise<void> {
  const next = Math.min(100, Math.max(0, goal.progress + delta))
  if (next === goal.progress) return
  if (updatingId.value) return
  updatingId.value = goal.id
  try {
    await updateLearningGoal(goal.id, {
      status: goal.status.toUpperCase() as BackendLearningGoalStatus,
      progress: next,
    })
    await load()
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    updatingId.value = null
  }
}

function refreshFocusStats(): void {
  void load()
}

function createIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `learning-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

onMounted(() => {
  disposed = false
  window.addEventListener('focus-session-saved', refreshFocusStats)
  void load()
})

onUnmounted(() => {
  disposed = true
  reloadRequested = false
  window.removeEventListener('focus-session-saved', refreshFocusStats)
})
</script>

<style scoped>
.lu {
  display: grid;
  gap: 22px;
}

.lu-head .lu-eyebrow {
  margin: 0 0 6px;
  color: var(--brand-700, #1f6f5c);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 2px;
}

.lu-head h1 {
  margin: 0;
  color: var(--ink);
  font-size: 24px;
  font-weight: 800;
}

.lu-sub {
  margin: 10px 0 0;
  max-width: 60ch;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}

.lu-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: start;
}

.lu-card {
  padding: 20px;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: 18px;
  box-shadow: var(--shadow-sm);
}

.lu-card-title {
  margin: 0 0 14px;
  color: var(--ink);
  font-size: 15px;
  font-weight: 800;
}

.lu-form {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.lu-submit-error {
  margin-bottom: 16px;
}

.lu-input {
  width: 100%;
  padding: 11px 13px;
  color: var(--ink);
  background: var(--surface);
  border: 1.5px solid var(--line-2);
  border-radius: 12px;
  font-family: inherit;
  font-size: 14px;
  transition: border-color 0.14s, box-shadow 0.14s;
}

.lu-input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 4px var(--brand-50, rgb(31 111 92 / 12%));
}

.lu-form-row {
  display: flex;
  gap: 12px;
}

.lu-form-row .lu-input {
  flex: 1;
}

.lu-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border-radius: 12px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid var(--line-2);
  background: var(--glass);
  color: var(--ink-2);
}

.lu-btn svg {
  width: 16px;
  height: 16px;
}

.lu-btn.primary {
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-700, #1f6f5c));
  border-color: transparent;
  box-shadow: 0 6px 16px rgb(31 111 92 / 30%);
}

.lu-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.lu-btn:not(:disabled):hover {
  transform: translateY(-1px);
}

.goal-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.goal-item {
  padding: 14px 16px;
  border: 1px solid var(--line-2);
  border-radius: 14px;
}

.goal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.goal-title {
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
}

.goal-status {
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}

.goal-status.active {
  color: var(--brand-700, #1f6f5c);
  background: var(--brand-50, rgb(31 111 92 / 12%));
}

.goal-status.paused {
  color: var(--orange, #d97706);
  background: rgb(217 119 6 / 12%);
}

.goal-status.done {
  color: var(--green, #16a34a);
  background: rgb(22 163 74 / 12%);
}

.goal-reason {
  margin: 0 0 10px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.goal-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.goal-bar {
  flex: 1;
  height: 8px;
  background: var(--glass);
  border-radius: 999px;
  overflow: hidden;
}

.goal-bar-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--brand), var(--brand-700, #1f6f5c));
}

.goal-pct {
  color: var(--faint);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.goal-skill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}

.goal-skill svg {
  width: 14px;
  height: 14px;
}

.goal-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.goal-progress-step {
  display: inline-flex;
  gap: 4px;
}

.goal-step-btn {
  width: 26px;
  height: 26px;
  border: 1px solid var(--line, rgb(15 23 42 / 12%));
  border-radius: 8px;
  background: var(--surface, #fff);
  color: var(--ink, #1a1a1a);
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.goal-step-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.goal-op {
  padding: 4px 12px;
  border: 1px solid var(--line, rgb(15 23 42 / 12%));
  border-radius: 999px;
  background: var(--surface, #fff);
  color: var(--ink-secondary, #4a4a4a);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.goal-op.done {
  color: var(--brand-700, #1f6f5c);
  border-color: var(--brand-200, rgb(31 111 92 / 30%));
}

.goal-op:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.goal-empty {
  color: var(--muted);
  font-size: 13px;
}

.lu-side {
  position: sticky;
  top: 90px;
}

.focus-total {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 14px;
}

.focus-loading {
  min-height: 48px;
  color: var(--muted);
  font-size: 13px;
}

.focus-num {
  color: var(--ink);
  font-size: 32px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.focus-unit {
  color: var(--faint);
  font-size: 13px;
}

.focus-bars {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 110px;
  padding: 8px 0;
}

.focus-bar-col {
  display: grid;
  justify-items: center;
  gap: 6px;
  flex: 1;
}

.focus-bar {
  width: 100%;
  max-width: 22px;
  border-radius: 6px 6px 2px 2px;
  background: linear-gradient(180deg, var(--brand), var(--brand-700, #1f6f5c));
  min-height: 4px;
}

.focus-day {
  color: var(--faint);
  font-size: 11px;
}

.focus-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.focus-tip svg {
  width: 14px;
  height: 14px;
  flex: none;
  color: var(--brand);
}

@media (max-width: 980px) {
  .lu-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .lu-side {
    position: static;
  }
}
</style>
