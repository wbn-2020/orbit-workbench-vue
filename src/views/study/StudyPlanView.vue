<template>
  <div class="page study-page">
    <header class="ow-page-top">
      <div>
        <div class="ow-crumb">成长 / 复习计划</div>
        <h1><CircleCheckBig aria-hidden="true" /> 复习计划</h1>
        <div class="sub">来自报告自动生成与手工创建 · 连接后端真实任务</div>
      </div>
      <div class="acts">
        <el-button :icon="Plus" @click="createOpen = true">新建任务</el-button>
      </div>
    </header>

    <el-alert
      v-if="focusNotice"
      :title="focusNotice"
      type="info"
      show-icon
      closable
      @close="focusNotice = ''"
    />

    <ErrorState v-if="error" :message="error" :retry="loadAll" />

    <div v-else class="study-grid">
      <div class="ow-card col8">
        <div class="ow-card-h">
          <div class="ic b1"><ListChecks aria-hidden="true" /></div>
          复习任务
          <div class="right">{{ completedCount }}/{{ tasks.length }} 完成</div>
        </div>
        <div class="ow-card-b">
          <div style="margin-bottom: 12px;">
            <div class="ow-prog green"><i :style="{ width: `${completionPercent}%` }" /></div>
          </div>
          <div v-if="!tasks.length" class="ow-empty-state">
            <div class="ic">📚</div>
            <div class="t">还没有复习任务</div>
            <div class="d">完成一场面试并在报告页点击「按报告生成复习任务」，或手工新建。</div>
          </div>
          <div v-else class="ow-tlist">
            <div
              v-for="task in tasks"
              :id="`study-task-${task.id}`"
              :key="task.id"
              class="ow-titem"
              :class="{
                done: task.status === 'COMPLETED',
                focused: task.id === focusId,
              }"
            >
              <span class="ow-status" :class="statusClass(task.status)">{{ statusLabel(task.status) }}</span>
              <div class="grow">
                <div class="tt">{{ task.title }}</div>
                <div class="ow-tm">
                  来源 {{ sourceLabel(task.sourceType) }}
                  <template v-if="task.dueDate"> · 截止 {{ task.dueDate }}</template>
                  <template v-if="task.estimatedMinutes"> · 约 {{ task.estimatedMinutes }} 分钟</template>
                </div>
              </div>
              <button
                v-if="task.status === 'PLANNED' || task.status === 'IN_PROGRESS'"
                class="ow-btn xs"
                type="button"
                @click="complete(task)"
              >
                完成
              </button>
              <button
                v-if="task.status === 'PLANNED'"
                class="ow-btn xs ghost"
                type="button"
                @click="skip(task)"
              >
                跳过
              </button>
              <button class="ow-btn xs ghost danger-btn" type="button" aria-label="删除" @click="remove(task)">
                ✕
              </button>
            </div>
          </div>
          <div class="ow-hint">
            报告自动生成的任务按标题幂等；完成/跳过/删除直接写库（真实后端）。
          </div>
        </div>
      </div>

      <div class="ow-card col4">
        <div class="ow-card-h">
          <div class="ic b3"><Target aria-hidden="true" /></div>
          掌握度概览
        </div>
        <div class="ow-card-b">
          <div class="mastery-total">
            <span>总体完成度</span>
            <b>{{ completionPercent }}%</b>
          </div>
          <div class="ow-prog" style="margin-top: 5px;"><i :style="{ width: `${completionPercent}%` }" /></div>
          <div v-for="stat in statusCounts" :key="stat.status" class="dim">
            <div class="name">{{ statusLabel(stat.status) }}</div>
            <div class="track"><i class="green" :style="{ width: `${percentOf(stat.count)}%` }" /></div>
            <div class="score">{{ stat.count }}</div>
          </div>
          <div class="ow-hint">真实熟练度将在能力数据（CapabilityRecord）落地后按报告与练习记录计算。</div>
        </div>
      </div>

      <div class="ow-card col12">
        <div class="ow-card-h">
          <div class="ic b4"><Dumbbell aria-hidden="true" /></div>
          待巩固错题
          <div class="right">{{ dueWrongItems.length }} 条到期 · 未掌握队列 {{ wrongQueueTotal }} 条 · 只读派生</div>
        </div>
        <div class="ow-card-b">
          <div v-if="wrongLoading"><el-skeleton :rows="3" animated /></div>
          <ErrorState v-else-if="wrongError" :message="wrongError" :retry="loadWrongAnswers" />
          <div v-else-if="!dueWrongItems.length" class="ow-empty-state">
            <div class="ic">🎯</div>
            <div class="t">今天没有到期的错题</div>
            <div class="d">
              到期指复习日不晚于今天。没有复习日的条目说明它还没被重练过——复习日是在错题本提交重练结果时按阶梯排出来的。
            </div>
          </div>
          <template v-else>
            <div class="ow-tlist">
              <div v-for="item in dueWrongItems" :key="`wrong-${item.itemId}`" class="ow-titem">
                <span class="ow-tag" :class="MASTERY_TAG_CLASS[item.masteryStatus]">
                  {{ MASTERY_LABELS[item.masteryStatus] }}
                </span>
                <div class="grow">
                  <div class="tt q-clamp">{{ item.question }}</div>
                    <div class="ow-tm">
                      归类 {{ item.topic }} · 复习日 {{ item.nextReviewDate }}
                      （{{ dueHint(item) }} · {{ reviewDateSourceLabel(item) }}）
                    · 已重练 {{ item.attemptCount }} 次
                  </div>
                </div>
                <span class="ow-tag gray">只读</span>
                <button class="ow-btn xs ghost" type="button" @click="openWrongAnswer(item)">
                  查看错题
                </button>
              </div>
            </div>
            <div v-if="wrongTruncated" class="ow-hint">
              到期条目多过一次拉取的上限，这里每档只显示前 {{ WRONG_PAGE_SIZE }} 条，完整队列请到错题本页查看。
            </div>
            <div class="ow-hint">
              只读派生：错题不会变成一条复习任务，所以这里没有完成、跳过和删除——掌握状态只能由错题本里提交重练尝试推进。
              这张卡片只把「今天该重练哪些错题」放到你每天打开的页面上。
            </div>
            <div class="wrong-actions">
              <el-button size="small" :icon="Dumbbell" @click="goWrongAnswers">到错题本重练</el-button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <el-dialog v-model="createOpen" title="新建复习任务" width="min(480px, calc(100vw - 32px))" destroy-on-close>
      <el-form label-position="top">
        <el-form-item label="任务标题" required>
          <el-input v-model="draft.title" maxlength="255" placeholder="如：复盘 Redis 双写一致性" />
        </el-form-item>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <el-form-item label="优先级">
            <el-select v-model="draft.priority">
              <el-option label="高" value="HIGH" />
              <el-option label="中" value="MEDIUM" />
              <el-option label="低" value="LOW" />
            </el-select>
          </el-form-item>
          <el-form-item label="预计分钟">
            <el-input-number v-model="draft.estimatedMinutes" :min="5" :max="480" :step="5" />
          </el-form-item>
        </div>
        <el-form-item label="截止日期">
          <el-date-picker v-model="draft.dueDate" type="date" value-format="YYYY-MM-DD" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createOpen = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="createTask">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { CircleCheckBig, Dumbbell, ListChecks, Plus, Target } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  completeTask,
  createStudyTask,
  deleteTask,
  listStudyTasks,
  skipTask,
  type StudyTask,
  type StudyTaskStatus,
} from '@/api/interview'
import {
  MASTERY_LABELS,
  MASTERY_TAG_CLASS,
  REVIEW_DATE_SOURCE_LABELS,
  listPracticeItems,
} from '@/api/practice'
import { problemMessage } from '@/api/http'
import ErrorState from '@/components/ErrorState.vue'

import type { PracticeItem } from '@/types/api'

const route = useRoute()
const router = useRouter()

/** 后端 size 上限 50。到期项在同一掌握档里一定排在最前，所以只有整页都到期才可能还有没看到的到期项。 */
const WRONG_PAGE_SIZE = 50

const tasks = ref<StudyTask[]>([])
const focusId = ref<number | null>(null)
const focusNotice = ref('')
const error = ref('')
const loading = ref(true)
const createOpen = ref(false)
const creating = ref(false)

const wrongItems = ref<PracticeItem[]>([])
const wrongQueueTotal = ref(0)
const wrongTruncated = ref(false)
const wrongLoading = ref(true)
const wrongError = ref('')

const draft = reactive({
  title: '',
  priority: 'MEDIUM',
  estimatedMinutes: 30,
  dueDate: null as string | null,
})

const completedCount = computed(() => tasks.value.filter((task) => task.status === 'COMPLETED').length)
const completionPercent = computed(() =>
  tasks.value.length ? Math.round((completedCount.value / tasks.value.length) * 100) : 0,
)

const statusCounts = computed(() => {
  const order: StudyTaskStatus[] = ['IN_PROGRESS', 'PLANNED', 'POSTPONED', 'COMPLETED', 'SKIPPED']
  return order.map((status) => ({
    status,
    count: tasks.value.filter((task) => task.status === status).length,
  }))
})

function percentOf(count: number): number {
  return tasks.value.length ? Math.round((count / tasks.value.length) * 100) : 0
}

function statusLabel(status: StudyTaskStatus): string {
  const map: Record<StudyTaskStatus, string> = {
    PLANNED: '计划中', IN_PROGRESS: '进行中', COMPLETED: '已完成', POSTPONED: '已延期', SKIPPED: '已跳过',
  }
  return map[status] ?? status
}

function statusClass(status: StudyTaskStatus): string {
  if (status === 'COMPLETED') return 'ok'
  if (status === 'IN_PROGRESS') return 'run'
  if (status === 'PLANNED') return 'wait'
  return 'off'
}

function sourceLabel(source: StudyTask['sourceType']): string {
  const map = { MANUAL: '手工创建', REPORT: '面试报告', WORKBENCH: '工作台' } as const
  return map[source] ?? source
}

/** 用本地日期比较：复习日是 DATE，按 UTC 取今天会让晚上这一段差一天。 */
function localToday(): string {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

/** 距今天已过去多少天：0 是今天到期，正数是已逾期，没有复习日时为 null。 */
function daysOverdue(item: PracticeItem): number | null {
  if (!item.nextReviewDate) return null
  const due = new Date(`${item.nextReviewDate}T00:00:00`).getTime()
  const today = new Date(`${localToday()}T00:00:00`).getTime()
  return Math.round((today - due) / 86400000)
}

function isDue(item: PracticeItem): boolean {
  const overdue = daysOverdue(item)
  return overdue !== null && overdue >= 0
}

function dueHint(item: PracticeItem): string {
  const overdue = daysOverdue(item) ?? 0
  return overdue > 0 ? `逾期 ${overdue} 天` : '今天到期'
}

function reviewDateSourceLabel(item: PracticeItem): string {
  if (item.reviewDateSource) return REVIEW_DATE_SOURCE_LABELS[item.reviewDateSource]
  return '历史数据未记录来源'
}

const dueWrongItems = computed(() => wrongItems.value
  .filter(isDue)
  .sort((left, right) => (left.nextReviewDate ?? '').localeCompare(right.nextReviewDate ?? '')
    || left.itemId - right.itemId))

/** 掌握状态各取一页：接口只能按单一 mastery 过滤，MASTERED 不算待巩固所以不取。 */
async function loadWrongAnswers(): Promise<void> {
  wrongLoading.value = true
  wrongError.value = ''
  try {
    const pages = await Promise.all([
      listPracticeItems({ mastery: 'NEW', archived: 'false', size: WRONG_PAGE_SIZE }),
      listPracticeItems({ mastery: 'LEARNING', archived: 'false', size: WRONG_PAGE_SIZE }),
    ])
    wrongItems.value = pages.flatMap((page) => page.items)
    wrongQueueTotal.value = pages.reduce((sum, page) => sum + page.total, 0)
    wrongTruncated.value = pages.some((page) => {
      const last = page.items[page.items.length - 1]
      return page.items.length >= WRONG_PAGE_SIZE && last !== undefined && isDue(last)
    })
  } catch (loadError) {
    wrongError.value = problemMessage(loadError)
  } finally {
    wrongLoading.value = false
  }
}

function goWrongAnswers(): void {
  void router.push('/practice/wrong-answers')
}

function openWrongAnswer(item: PracticeItem): void {
  void router.push({
    path: '/practice/wrong-answers',
    query: { focus: String(item.itemId) },
  })
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    tasks.value = await listStudyTasks()
    await applyFocus()
  } catch (loadError) {
    error.value = problemMessage(loadError)
  } finally {
    loading.value = false
  }
}

async function applyFocus(): Promise<void> {
  const raw = Number(route.query.focus)
  if (!Number.isInteger(raw) || raw <= 0) return

  const target = tasks.value.find((task) => task.id === raw)
  if (!target) {
    focusId.value = null
    focusNotice.value = '未找到这条复习任务，可能已被删除或不在当前任务列表中。'
    return
  }

  focusId.value = raw
  focusNotice.value = `已定位到复习任务「${target.title}」`
  await nextTick()
  document.getElementById(`study-task-${raw}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

async function complete(task: StudyTask): Promise<void> {
  try {
    const updated = await completeTask(task.id)
    replace(updated)
  } catch (submitError) {
    ElMessage.error(problemMessage(submitError))
  }
}

async function skip(task: StudyTask): Promise<void> {
  try {
    const updated = await skipTask(task.id)
    replace(updated)
  } catch (submitError) {
    ElMessage.error(problemMessage(submitError))
  }
}

async function remove(task: StudyTask): Promise<void> {
  try {
    await deleteTask(task.id)
    tasks.value = tasks.value.filter((item) => item.id !== task.id)
  } catch (submitError) {
    ElMessage.error(problemMessage(submitError))
  }
}

async function createTask(): Promise<void> {
  if (!draft.title.trim()) {
    ElMessage.warning('请填写任务标题')
    return
  }
  creating.value = true
  try {
    const created = await createStudyTask({
      title: draft.title.trim(),
      priority: draft.priority,
      estimatedMinutes: draft.estimatedMinutes ?? undefined,
      dueDate: draft.dueDate,
    })
    createOpen.value = false
    draft.title = ''
    tasks.value = [created, ...tasks.value]
    ElMessage.success('任务已创建')
  } catch (submitError) {
    ElMessage.error(problemMessage(submitError))
  } finally {
    creating.value = false
  }
}

function replace(updated: StudyTask): void {
  const index = tasks.value.findIndex((item) => item.id === updated.id)
  if (index >= 0) tasks.value[index] = updated
}

/** 两个数据源各自独立成态：错题拉失败只让那张卡报错，不连带把复习任务整页换成错误态。 */
async function loadAll(): Promise<void> {
  await Promise.all([load(), loadWrongAnswers()])
}

onMounted(() => {
  void loadAll()
})
</script>

<style scoped>
.study-page {
  display: grid;
  gap: 18px;
}

.study-page h1 svg {
  width: 24px;
  height: 24px;
  color: var(--brand);
}

.study-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
}

.col4 { grid-column: span 4; }
.col8 { grid-column: span 8; }
.col12 { grid-column: span 12; }

.wrong-actions {
  margin-top: 12px;
}

/* 题干最长 4000 字，这张卡只做入口，超过两行截断。 */
.q-clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.grow {
  flex: 1;
  min-width: 0;
}

.ow-titem .tt {
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
}

.ow-titem.done .tt {
  color: var(--muted);
  text-decoration: line-through;
}

.ow-titem.focused {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-200), var(--shadow-md);
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
  width: 72px;
  flex: 0 0 72px;
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
  width: 30px;
  flex: 0 0 30px;
  color: var(--ink);
  font-size: 12.5px;
  font-weight: 800;
  text-align: right;
}

.danger-btn {
  color: var(--red-600);
}

@media (max-width: 1100px) {
  .col4,
  .col8 {
    grid-column: span 12;
  }
}
</style>
