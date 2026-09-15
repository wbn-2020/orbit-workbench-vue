<template>
  <div class="lu">
    <header class="lu-head">
      <div>
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
                <span v-if="goal.sourceFactId" class="goal-from-fact" title="由画像事实转化而来（V52）">画像事实</span>
                <span class="goal-status" :class="goal.status">{{ statusLabel(goal.status) }}</span>
              </div>
              <p v-if="goal.reason" class="goal-reason">{{ goal.reason }}</p>
              <div class="goal-progress">
                <div class="goal-bar">
                  <span class="goal-bar-fill" :style="{ width: `${goal.progress}%` }" />
                </div>
                <span class="goal-pct">{{ goal.progress }}%</span>
              </div>
              <p v-if="goal.progressDerived" class="goal-derived-note">
                进度由拆解任务派生（完成 {{ goal.completedTaskCount }}/{{ goal.taskCount }} 步），练完任务自动更新，不再手动加减
              </p>
              <!-- V59：拆出的步骤就地追踪——打勾/删除在这里完成，不必去复习计划页绕路 -->
              <ul v-if="stepsFor(goal.id).length" class="goal-steps">
                <li v-for="step in stepsFor(goal.id)" :key="step.id" class="goal-step" :class="{ done: step.status === 'COMPLETED' }">
                  <button
                    class="step-check"
                    type="button"
                    :aria-label="step.status === 'COMPLETED' ? `步骤「${step.title}」已完成` : `把步骤「${step.title}」标记为完成`"
                    :disabled="step.status === 'COMPLETED' || stepBusyId === step.id"
                    @click="completeStep(step)"
                  >
                    <Check v-if="step.status === 'COMPLETED'" aria-hidden="true" />
                  </button>
                  <span class="step-title">{{ step.title }}</span>
                  <span v-if="step.status !== 'PLANNED' && step.status !== 'COMPLETED'" class="step-state">{{ stepStatusLabel(step.status) }}</span>
                  <button
                    v-if="step.status !== 'COMPLETED'"
                    class="step-del"
                    type="button"
                    aria-label="删除这一步"
                    :disabled="stepBusyId === step.id"
                    @click="removeStep(step)"
                  >
                    ×
                  </button>
                </li>
              </ul>
              <div v-if="expandedGoalId === goal.id" class="goal-step-form">
                <input
                  v-model="stepTitle"
                  class="goal-step-input"
                  maxlength="255"
                  placeholder="这一步具体做什么？例如「读完 RAG 论文并写一页笔记」"
                  @keyup.enter="submitStep(goal)"
                  @keyup.esc="cancelStep"
                />
                <button class="goal-op" type="button" :disabled="stepSubmitting || !stepTitle.trim()" @click="submitStep(goal)">
                  添加
                </button>
                <button class="goal-op" type="button" @click="cancelStep">取消</button>
              </div>
              <div class="goal-actions">
                <div class="goal-progress-step" role="group" aria-label="调整进度">
                  <button
                    class="goal-step-btn"
                    type="button"
                    :aria-label="`把「${goal.title}」进度减 10`"
                    :disabled="updatingId === goal.id || goal.progressDerived || goal.progress <= 0"
                    :title="goal.progressDerived ? '进度由拆解任务派生，完成步骤即推进' : undefined"
                    @click="adjustProgress(goal, -10)"
                  >
                    −
                  </button>
                  <button
                    class="goal-step-btn"
                    type="button"
                    :aria-label="`把「${goal.title}」进度加 10`"
                    :disabled="updatingId === goal.id || goal.progressDerived || goal.progress >= 100"
                    :title="goal.progressDerived ? '进度由拆解任务派生，完成步骤即推进' : undefined"
                    @click="adjustProgress(goal, 10)"
                  >
                    +
                  </button>
                </div>
                <button
                  class="goal-op"
                  type="button"
                  :disabled="updatingId === goal.id"
                  @click="toggleStepForm(goal)"
                >
                  {{ goal.taskCount ? `已拆 ${goal.taskCount} 步 · 再拆一步` : '拆一步' }}
                </button>
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
            <Timer aria-hidden="true" />
            {{ totalFocusMinutes > 0 ? '用右下角计时器开始一段专注，时长会自动记录。' : '最近 7 天还没有专注记录。' }}
          </p>
          <button v-if="!totalFocusMinutes && !statsError" class="focus-start-btn" type="button" @click="openTimer">
            <Play aria-hidden="true" /> 开始一次专注
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Plus, Play, Target, Timer } from 'lucide-vue-next'
import { problemMessage, getProblem } from '@/api/http'
import {
  addGoalTask,
  createLearningGoal,
  listFocusStats,
  listLearningGoals,
  updateLearningGoal,
  type BackendLearningGoalStatus,
} from '@/api/learning'
import { completeTask, deleteTask, listStudyTasks, type StudyTask } from '@/api/interview'
import type { FocusStat, LearningGoal, LearningGoalStatus } from '@/api/types'
import ErrorState from '@/components/ErrorState.vue'

const goals = ref<LearningGoal[]>([])
const stats = ref<FocusStat[]>([])
const loading = ref(false)
const goalsError = ref('')
const statsError = ref('')
const submitting = ref(false)
const submitError = ref('')
const updatingId = ref<string | null>(null)
// V59：目标拆解的步骤列表（GOAL 来源任务）——拆出的步骤在目标卡上直接完成/删除
const goalSteps = ref<StudyTask[]>([])
const stepBusyId = ref<number | null>(null)
// V58：目标拆步骤的内联输入（同一时刻只展开一个目标）
const expandedGoalId = ref<string | null>(null)
const stepTitle = ref('')
const stepSubmitting = ref(false)
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

/** 空态行动入口：展开右下角计时器，而不是只留一句静态提示。 */
function openTimer(): void {
  window.dispatchEvent(new CustomEvent('focus-timer-open'))
}

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
  const [goalResult, statResult, taskResult] = await Promise.allSettled([
    listLearningGoals(),
    listFocusStats(7),
    listStudyTasks(),
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
  // V59：步骤列表拉取失败不弹错——派生进度仍来自目标响应（后端同源），列表只是操作入口
  goalSteps.value = taskResult.status === 'fulfilled'
    ? taskResult.value.filter((task) => task.sourceType === 'GOAL')
    : []
  loading.value = false
  if (reloadRequested && !disposed) {
    reloadRequested = false
    void load()
  }
}

/** 某目标拆出的步骤：未完成在前（按创建序），已完成沉底。 */
function stepsFor(goalId: string): StudyTask[] {
  const own = goalSteps.value.filter((task) => String(task.sourceId) === goalId)
  return [...own.filter((t) => t.status !== 'COMPLETED'), ...own.filter((t) => t.status === 'COMPLETED')]
}

function stepStatusLabel(status: StudyTask['status']): string {
  const map: Record<StudyTask['status'], string> = {
    PLANNED: '计划中', IN_PROGRESS: '进行中', COMPLETED: '已完成', POSTPONED: '已延期', SKIPPED: '已跳过',
  }
  return map[status] ?? status
}

async function completeStep(step: StudyTask): Promise<void> {
  if (stepBusyId.value) return
  stepBusyId.value = step.id
  try {
    await completeTask(step.id)
    await load()
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    stepBusyId.value = null
  }
}

async function removeStep(step: StudyTask): Promise<void> {
  if (stepBusyId.value) return
  stepBusyId.value = step.id
  try {
    await deleteTask(step.id)
    await load()
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    stepBusyId.value = null
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

function toggleStepForm(goal: LearningGoal): void {
  if (expandedGoalId.value === goal.id) {
    expandedGoalId.value = null
    stepTitle.value = ''
    return
  }
  expandedGoalId.value = goal.id
  stepTitle.value = ''
}

function cancelStep(): void {
  expandedGoalId.value = null
  stepTitle.value = ''
}

async function submitStep(goal: LearningGoal): Promise<void> {
  const title = stepTitle.value.trim()
  if (!title || stepSubmitting.value) return
  stepSubmitting.value = true
  try {
    await addGoalTask(goal.id, title)
    stepTitle.value = ''
    // created=0（同名步骤已存在）也刷新——让「已拆 N 步」与派生进度回到后端真值
    await load()
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    stepSubmitting.value = false
  }
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

.lu-head h1 {
  margin: 0;
  color: var(--ink);
  font-size: var(--fs-lg);
  font-weight: 700;
}

.lu-sub {
  margin: 10px 0 0;
  max-width: 60ch;
  color: var(--muted);
  font-size: var(--fs-sm);
  line-height: 1.6;
}

.lu-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: start;
}

.lu-card {
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}

.lu-card-title {
  margin: 0 0 14px;
  color: var(--ink);
  font-size: var(--fs-sm);
  font-weight: 700;
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
  font-size: var(--fs-sm);
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
  font-size: var(--fs-sm);
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
  background: var(--btn-1);
  border-color: transparent;
  box-shadow: none;
}

.lu-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.lu-btn:not(:disabled):hover {
  filter: brightness(1.05);
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
  border-radius: 12px;
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
  font-size: var(--fs-sm);
  font-weight: 700;
}

.goal-status {
  padding: 2px 9px;
  border-radius: 999px;
  font-size: var(--fs-xs);
  font-weight: 700;
}

/* V52：来源徽标紧跟标题，margin-right:auto 把状态推回右侧 */
.goal-from-fact {
  padding: 2px 9px;
  border-radius: 999px;
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--ow-muted, #52685e);
  background: var(--surface-2, rgb(31 111 92 / 6%));
  margin-right: auto;
}

.goal-status.active {
  color: var(--ow-status-success-text, #16634f);
  background: var(--ow-status-success-bg, rgb(31 111 92 / 12%));
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
  font-size: var(--fs-sm);
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
  background: var(--brand-600);
}

.goal-pct {
  color: var(--ow-muted, #52685e);
  font-size: var(--fs-xs);
  font-variant-numeric: tabular-nums;
}

.goal-skill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  color: var(--muted);
  font-size: var(--fs-xs);
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
  border-radius: 12px;
  background: var(--surface, #fff);
  color: var(--ink, #1a1a1a);
  font-size: var(--fs-sm);
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
  color: var(--ow-ink-secondary, #3f574c);
  font-size: var(--fs-xs);
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

/* V58：派生进度说明——中性文字，品牌色留给可操作元素（视觉系统 v2） */
.goal-derived-note {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: var(--fs-xs);
  line-height: 1.55;
}

.goal-step-form {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.goal-step-input {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid var(--line, rgb(15 23 42 / 12%));
  border-radius: 10px;
  background: var(--surface, #fff);
  color: var(--ink, #1a1a1a);
  font-size: var(--fs-sm);
  font-family: inherit;
}

/* V59：目标卡步骤列表——未完成在前已完成沉底；打勾框是中性描边，勾选后填充色留给完成态本身 */
.goal-steps {
  display: grid;
  gap: 4px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.goal-step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-sm);
  color: var(--ink, #1a1a1a);
}

.goal-step.done .step-title {
  color: var(--muted);
  text-decoration: line-through;
  text-decoration-color: var(--line, rgb(15 23 42 / 25%));
}

.step-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  padding: 0;
  border: 1.5px solid var(--line, rgb(15 23 42 / 25%));
  border-radius: 5px;
  background: var(--surface, #fff);
  color: var(--brand-700, #1f6f5c);
  cursor: pointer;
}

.step-check:disabled {
  cursor: default;
}

.goal-step.done .step-check {
  border-color: var(--brand-200, rgb(31 111 92 / 40%));
  background: var(--btn-soft, rgb(31 111 92 / 10%));
}

.step-title {
  flex: 1;
  min-width: 0;
  line-height: 1.5;
}

.step-state {
  flex: 0 0 auto;
  color: var(--muted);
  font-size: var(--fs-xs);
}

.step-del {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font-size: var(--fs-sm);
  line-height: 1;
  cursor: pointer;
}

.step-del:hover {
  color: var(--red-600, #b42318);
  background: var(--surface-2, rgb(15 23 42 / 4%));
}

.goal-empty {
  color: var(--muted);
  font-size: var(--fs-sm);
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
  font-size: var(--fs-sm);
}

.focus-num {
  color: var(--ink);
  font-size: var(--fs-2xl);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.focus-unit {
  color: var(--ow-muted, #52685e);
  font-size: var(--fs-sm);
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
  background: var(--brand-600);
  min-height: 4px;
}

.focus-day {
  color: var(--ow-muted, #52685e);
  font-size: var(--fs-xs);
}

.focus-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0 0;
  color: var(--muted);
  font-size: var(--fs-xs);
  line-height: 1.5;
}

.focus-tip svg {
  width: 14px;
  height: 14px;
  flex: none;
  color: var(--brand);
}

.focus-start-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  justify-content: center;
  margin-top: 10px;
  height: 36px;
  color: #fff;
  background: var(--btn-1);
  border: 0;
  border-radius: 12px;
  box-shadow: none;
  cursor: pointer;
  font-family: inherit;
  font-size: var(--fs-sm);
  font-weight: 700;
}

.focus-start-btn svg {
  width: 14px;
  height: 14px;
}

.focus-start-btn:hover {
  border-color: var(--brand);
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
