<template>
  <div class="page workbench-page">
    <header class="ow-page-top">
      <div>
        <div class="ow-crumb">工作台 / 今日</div>
        <h1>
          <span class="title-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <rect x="3" y="3" width="18" height="18" rx="5" fill="#3a6fd0" />
              <path d="M16 6c-3 3-3 6 0 9 3-3 3-6 0-9z" fill="#eaa11f" />
              <path d="M16 15v5M13 18l3 3 3-3" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" />
            </svg>
          </span>
          今日学习与面试工作台
        </h1>
        <div class="sub">{{ dateLabel }}</div>
      </div>
      <div class="acts">
        <button class="ow-btn gold" type="button" @click="router.push('/interviews/new')">＋ 新建面试</button>
      </div>
    </header>

    <ErrorState v-if="loadError" :message="loadError" :retry="loadAll" />

    <template v-else>
      <div class="kpi-row">
        <div class="ow-kpi">
          <div class="ic" style="background: var(--brand-50); color: var(--brand);">
            <CalendarDays aria-hidden="true" />
          </div>
          <div>
            <div class="v">{{ sessions.length }}</div>
            <div class="l">面试会话</div>
            <div class="trend up">{{ activeSessions.length }} 场进行中</div>
          </div>
        </div>
        <div class="ow-kpi">
          <div class="ic" style="background: var(--green-50); color: var(--green);">
            <CircleCheckBig aria-hidden="true" />
          </div>
          <div>
            <div class="v">{{ pendingTaskCount }}</div>
            <div class="l">待完成复习任务</div>
            <div class="trend up">{{ doneTaskCount }} 项已完成</div>
          </div>
        </div>
        <div class="ow-kpi">
          <div class="ic" style="background: var(--gold-50); color: var(--gold);">
            <Star aria-hidden="true" />
          </div>
          <div>
            <div class="v">{{ scoredReports.length }}</div>
            <div class="l">已出分报告</div>
            <div class="trend up">来自真实 AI 评分</div>
          </div>
        </div>
        <div class="ow-kpi">
          <div class="ic" style="background: var(--red-50); color: var(--red);">
            <Trophy aria-hidden="true" />
          </div>
          <div>
            <div class="v">{{ avgScore }}</div>
            <div class="l">报告均分</div>
            <div class="trend up">真实评分均值</div>
          </div>
        </div>
      </div>

      <div class="grid-home">
        <div class="ow-card g-row2">
          <div class="ow-card-h">
            <div class="ic b2"><UsersRound aria-hidden="true" /></div>
            面试安排 · 快速开始
            <div class="right">
              <button class="ow-btn xs gold" type="button" @click="router.push('/interviews/new')">＋ 新建</button>
            </div>
          </div>
          <div class="ow-card-b">
            <div class="ow-tlist">
              <div v-for="session in recentSessions" :key="session.id" class="ow-titem">
                <span class="iv-ico"><Mic2 aria-hidden="true" /></span>
                <div class="grow">
                  <div class="tt">
                    {{ session.title }}
                    <span class="ow-status" :class="statusClass(session.status)">{{ statusLabel(session.status) }}</span>
                  </div>
                  <div class="ow-tm">{{ topicLabel(session.topicMode) }} · {{ fmtTime(session.createdAt) }}</div>
                </div>
                <button class="ow-btn sm" type="button" @click="openSession(session)">
                  {{ session.status === 'COMPLETED' ? '报告' : session.status === 'READY' ? '开始' : '进入' }}
                </button>
              </div>
              <div v-if="!recentSessions.length" class="ow-empty">还没有面试会话，点「＋ 新建」开始第一场。</div>
            </div>
            <div class="ow-hint">题目与追问由 AI 实时生成（连接后端 InterviewSession）。</div>
          </div>
        </div>

        <div class="ow-card">
          <div class="ow-card-h">
            <div class="ic b1"><CircleCheckBig aria-hidden="true" /></div>
            今日复习任务
            <div class="right">
              <button class="ow-btn xs ghost" type="button" @click="router.push('/study-plan')">全部</button>
            </div>
          </div>
          <div class="ow-card-b task-card">
            <div class="ow-tlist">
              <div
                v-for="task in openTasks"
                :key="task.id"
                class="ow-titem"
              >
                <button
                  class="ow-check"
                  type="button"
                  aria-label="完成任务"
                  @click="finishTask(task)"
                >
                  <Check aria-hidden="true" />
                </button>
                <div class="grow">
                  <div class="tt">{{ task.title }}</div>
                  <div class="ow-tm">截止 {{ task.dueDate ?? '未设置' }} · {{ priorityLabel(task.priority) }}</div>
                </div>
              </div>
              <div v-if="!openTasks.length" class="ow-empty">没有待完成任务。去报告页生成或手工新建。</div>
            </div>
            <div class="ow-row" style="margin-top: auto; padding-top: 10px;">
              <input
                v-model="newTaskTitle"
                class="ow-input"
                placeholder="输入新任务，回车接取…"
                style="flex: 1; min-width: 0;"
                @keydown.enter="addTask"
              >
              <button class="ow-btn" type="button" :disabled="addingTask" @click="addTask">接取</button>
            </div>
          </div>
        </div>

        <div class="ow-card">
          <div class="ow-card-h">
            <div class="ic b5"><Map aria-hidden="true" /></div>
            投递漏斗
          </div>
          <div class="ow-card-b">
            <div class="pipeline">
              <div
                v-for="stage in pipelineStages"
                :key="stage.label"
                class="stage"
                :class="{ on: stage.reached }"
              >
                <span class="num">{{ stage.no }}</span>
                {{ stage.label }}
              </div>
            </div>
            <div class="ow-hint">来自真实投递记录 · 点「数字下方标签」无跳转，管理请到求职进度页。</div>
          </div>
        </div>

        <div class="ow-card">
          <div class="ow-card-h">
            <div class="ic b4"><AlertTriangle aria-hidden="true" /></div>
            薄弱点 · 来自真实报告
          </div>
          <div class="ow-card-b">
            <div class="ow-tlist">
              <div v-for="weak in weakTopics" :key="weak" class="ow-titem">
                <span class="ow-tag red">{{ weak }}</span>
              </div>
              <div v-if="!weakTopics.length" class="ow-empty">完成面试并生成报告后，薄弱点会出现在这里。</div>
            </div>
          </div>
        </div>

        <div class="ow-card">
          <div class="ow-card-h">
            <div class="ic b3"><Star aria-hidden="true" /></div>
            最近报告 · 真实评分
          </div>
          <div class="ow-card-b">
            <div class="ow-tlist">
              <button
                v-for="item in scoredReports"
                :key="item.sessionId"
                type="button"
                class="loot"
                @click="router.push(`/interviews/${item.sessionId}/report`)"
              >
                <Trophy class="c" aria-hidden="true" />
                <div class="grow">
                  <div class="tt">{{ item.title }}</div>
                  <div class="ow-tm">{{ item.recommendation }} · {{ item.generatedAtLabel }}</div>
                </div>
                <span class="g g-wait">{{ item.score }}分</span>
              </button>
              <div v-if="!scoredReports.length" class="ow-empty">还没有已出分的报告。</div>
            </div>
          </div>
        </div>

        <div class="ow-card g-span3">
          <div class="ow-card-h">
            <div class="ic b6"><BookOpen aria-hidden="true" /></div>
            知识库问答 · 村长的魔法书
          </div>
          <div class="ow-card-b">
            <div class="npc">
              <div class="face">
                <svg width="30" height="30" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">
                  <rect x="4" y="2" width="8" height="7" rx="2" fill="#ffd9a8" />
                  <rect x="5" y="4" width="1" height="1" fill="#1b2330" />
                  <rect x="10" y="4" width="1" height="1" fill="#1b2330" />
                  <rect x="3" y="9" width="10" height="5" fill="#7c5236" />
                  <rect x="4" y="9" width="8" height="2" fill="#fff" />
                </svg>
              </div>
              <div class="bub">
                <p>勇敢的求职者，知识库检索（RAG）还在后端后续阶段；现在可以先去打一场 AI 面试，报告会告诉你薄弱点 ✦</p>
                <button class="ow-btn gold" type="button" @click="router.push('/interviews/new')">
                  去打一场 AI 面试
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Check,
  CircleCheckBig,
  Map,
  Mic2,
  Star,
  Trophy,
  UsersRound,
} from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  completeTask,
  createStudyTask,
  getReport,
  getSession,
  listSessions,
  listStudyTasks,
  TOPIC_MODES,
  type InterviewSession,
  type InterviewSessionStatus,
  type StudyTask,
} from '@/api/interview'
import { problemMessage } from '@/api/http'
import { listApplications, type StageCounts } from '@/api/jobApplications'
import ErrorState from '@/components/ErrorState.vue'

const router = useRouter()
const loadError = ref('')
const loading = ref(true)
const sessions = ref<InterviewSession[]>([])
const tasks = ref<StudyTask[]>([])
const scoredReports = ref<{
  sessionId: number
  title: string
  score: number
  recommendation: string
  generatedAtLabel: string
  weakTags: string[]
}[]>([])
const newTaskTitle = ref('')
const addingTask = ref(false)
const stageCounts = ref<StageCounts | null>(null)

const ACTIVE: InterviewSessionStatus[] = ['READY', 'RUNNING', 'PAUSED']

const dateLabel = computed(() => {
  const now = new Date()
  const week = ['日', '一', '二', '三', '四', '五', '六']
  return `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · 周${week[now.getDay()]}，先完成最紧急的准备，再进入下一场面试。`
})

const activeSessions = computed(() => sessions.value.filter((session) => ACTIVE.includes(session.status)))
const openTasks = computed(() =>
  tasks.value.filter((task) => task.status === 'PLANNED' || task.status === 'IN_PROGRESS').slice(0, 6),
)
const pendingTaskCount = computed(() => openTasks.value.length)
const doneTaskCount = computed(() => tasks.value.filter((task) => task.status === 'COMPLETED').length)
const recentSessions = computed(() => sessions.value.slice(0, 4))
const avgScore = computed(() => {
  if (!scoredReports.value.length) return '--'
  const total = scoredReports.value.reduce((sum, item) => sum + item.score, 0)
  return Math.round(total / scoredReports.value.length)
})
const weakTopics = computed(() => {
  const tags = new Set<string>()
  scoredReports.value.forEach((item) => item.weakTags.forEach((tag) => tags.add(tag)))
  return Array.from(tags).slice(0, 6)
})

const pipelineStages = computed(() => {
  const counts = stageCounts.value
  const stages: { label: string; no: number; count: number }[] = [
    { label: '关注', no: 1, count: counts?.watching ?? 0 },
    { label: '投递', no: 2, count: counts?.applied ?? 0 },
    { label: '笔试', no: 3, count: counts?.writtenTest ?? 0 },
    { label: '面试', no: 4, count: counts?.interviewing ?? 0 },
    { label: 'HR', no: 5, count: counts?.hr ?? 0 },
    { label: 'Offer', no: 6, count: counts?.offer ?? 0 },
  ]
  const reachedNo = stages.reduce((max, stage) => (stage.count > 0 ? Math.max(max, stage.no) : max), 0)
  return stages.map((stage) => ({ ...stage, reached: stage.no <= reachedNo }))
})

function topicLabel(value: string): string {
  return TOPIC_MODES.find((topic) => topic.value === value)?.label ?? value
}

function priorityLabel(value: StudyTask['priority']): string {
  const map = { HIGH: '高优先', MEDIUM: '中优先', LOW: '低优先' } as const
  return map[value] ?? value
}

function statusLabel(status: InterviewSessionStatus): string {
  const map: Record<InterviewSessionStatus, string> = {
    READY: '待开始', RUNNING: '进行中', PAUSED: '已暂停', USER_ENDED: '已结束',
    COMPLETING: '报告待生成', COMPLETED: '已完成', FAILED: '失败', CANCELLED: '已取消',
  }
  return map[status] ?? status
}

function statusClass(status: InterviewSessionStatus): string {
  if (status === 'RUNNING') return 'run'
  if (status === 'COMPLETED') return 'ok'
  if (status === 'FAILED' || status === 'CANCELLED') return 'fail'
  return 'wait'
}

function fmtTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function openSession(session: InterviewSession): void {
  if (session.status === 'COMPLETED' || !ACTIVE.includes(session.status)) {
    void router.push(`/interviews/${session.id}/report`)
    return
  }
  void router.push(`/interviews/${session.id}`)
}

function parseTags(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
  } catch {
    return []
  }
}

function recommendationLabel(value: string | null): string {
  const map: Record<string, string> = {
    STRONG_PASS: '强烈通过', PASS: '通过', HOLD: '待定', FAIL: '不通过',
  }
  return map[value ?? ''] ?? '待定'
}

function shortTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

async function loadAll(): Promise<void> {
  loadError.value = ''
  loading.value = true
  try {
    const [sessionList, taskList, applications] = await Promise.all([
      listSessions(),
      listStudyTasks(),
      listApplications().catch(() => null),
    ])
    sessions.value = sessionList
    tasks.value = taskList
    stageCounts.value = applications?.stages ?? null

    const candidates = sessionList
      .filter((session) => !['READY', 'CANCELLED'].includes(session.status))
      .slice(0, 5)
    const reports = await Promise.all(candidates.map(async (session) => {
      try {
        const [state] = await Promise.all([
          getReport(session.id),
          getSession(session.id).catch(() => null),
        ])
        if (!state.exists || !state.report || state.report.status !== 'REPORT_READY'
            || state.report.totalScore === null) {
          return null
        }
        return {
          sessionId: session.id,
          title: session.title,
          score: state.report.totalScore,
          recommendation: recommendationLabel(state.report.hiringRecommendation),
          generatedAtLabel: shortTime(state.report.generatedAt),
          weakTags: [
            ...parseTags(state.report.projectMasteryJson),
            ...parseTags(state.report.knowledgeGapsJson),
            ...parseTags(state.report.weaknessesJson),
          ].slice(0, 4),
        }
      } catch {
        return null
      }
    }))
    scoredReports.value = reports.filter((item): item is NonNullable<typeof item> => item !== null)
  } catch (error) {
    loadError.value = problemMessage(error)
  } finally {
    loading.value = false
  }
}

async function finishTask(task: StudyTask): Promise<void> {
  try {
    await completeTask(task.id)
    tasks.value = tasks.value.filter((item) => item.id !== task.id)
    ElMessage.success('任务已完成')
  } catch (error) {
    ElMessage.error(problemMessage(error))
  }
}

async function addTask(): Promise<void> {
  const title = newTaskTitle.value.trim()
  if (!title) return
  addingTask.value = true
  try {
    const created = await createStudyTask({ title, priority: 'MEDIUM' })
    tasks.value = [created, ...tasks.value]
    newTaskTitle.value = ''
    ElMessage.success('任务已创建')
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    addingTask.value = false
  }
}

onMounted(() => {
  void loadAll()
})
</script>

<style scoped>
.workbench-page {
  display: grid;
  gap: 18px;
}

.title-mark {
  display: grid;
  place-items: center;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.grid-home {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: minmax(172px, auto);
  gap: 18px;
}

.grid-home .ow-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.grid-home .ow-card-b {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.g-row2 {
  grid-row: span 2;
}

.g-span3 {
  grid-column: span 3;
}

.grow {
  flex: 1;
  min-width: 0;
}

.iv-ico {
  display: grid;
  width: 34px;
  height: 34px;
  flex: none;
  place-items: center;
  color: var(--brand);
  background: var(--brand-50);
  border-radius: 9px;
}

.iv-ico svg {
  width: 17px;
  height: 17px;
}

.task-card {
  gap: 10px;
}

.ow-check svg {
  width: 13px;
  height: 13px;
  color: #fff;
}

.ow-titem .tt {
  color: var(--ink);
  font-size: 13.5px;
  font-weight: 600;
}

.pipeline {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

.stage {
  flex: 1;
  min-width: 54px;
  padding: 9px 4px;
  color: var(--muted);
  background: var(--surface-2);
  border: 1.5px solid var(--line);
  border-radius: 11px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 42%);
}

.stage.on {
  color: var(--brand-700);
  background: linear-gradient(180deg, var(--brand-50), var(--brand-100));
  border-color: var(--brand-200);
  box-shadow: 0 3px 9px var(--card-glow);
}

.stage .num {
  display: block;
  margin-bottom: 2px;
  font-size: 15px;
  font-weight: 900;
}

.loot {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  color: var(--ink);
  background: var(--glass-2);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.14s, box-shadow 0.14s;
  font-family: inherit;
}

.loot:hover {
  border-color: var(--brand-200);
  box-shadow: var(--shadow-md);
}

.loot .c {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  color: var(--gold-600);
}

.loot .g {
  flex: none;
  padding: 3px 10px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 800;
}

.g-wait {
  background: linear-gradient(180deg, #fdf3df, #fbebc6);
  color: #9a6a00;
}

.npc {
  display: flex;
  gap: 13px;
  align-items: flex-start;
  background: var(--surface-2);
  border: 1.5px dashed var(--brand-200);
  border-radius: 14px;
  padding: 15px;
  height: 100%;
}

.npc .face {
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  place-items: center;
  background: var(--surface);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}

.npc .bub {
  flex: 1;
  min-width: 0;
}

.npc p {
  margin: 0 0 11px;
  color: var(--ink-2);
  font-size: 13px;
  line-height: 1.65;
}

@media (max-width: 1180px) {
  .grid-home {
    grid-template-columns: repeat(2, 1fr);
  }

  .g-span3 {
    grid-column: span 2;
  }
}

@media (max-width: 900px) {
  .kpi-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 760px) {
  .grid-home {
    grid-template-columns: 1fr;
  }

  .g-row2 {
    grid-row: span 1;
  }

  .g-span3 {
    grid-column: span 1;
  }
}

@media (max-width: 560px) {
  .kpi-row {
    grid-template-columns: 1fr;
  }

  .ow-page-top {
    flex-direction: column;
    align-items: stretch;
  }

  .ow-page-top .acts {
    width: 100%;
  }

  .ow-page-top .acts .ow-btn {
    flex: 1;
  }
}
</style>
