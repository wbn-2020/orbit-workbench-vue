<template>
  <div class="page logs-page">
    <header class="ow-page-top">
      <div>
        <OwCrumb />
        <h1><NotebookPen aria-hidden="true" /> 面试记录</h1>
        <div class="sub">你的全部模拟面试会话</div>
      </div>
      <div class="acts">
        <button class="ow-btn" type="button" @click="router.push('/interviews/new')">＋ 新建面试</button>
      </div>
    </header>

    <ErrorState v-if="error" :message="error" :retry="load" />

    <div class="ow-card" v-else>
      <div class="ow-card-h">
        <div class="ic b2"><NotebookPen aria-hidden="true" /></div>
        会话列表
        <div class="right">
          <div class="ow-seg">
            <button type="button" :class="{ on: filter === '全部' }" @click="filter = '全部'">全部</button>
            <button type="button" :class="{ on: filter === '进行中' }" @click="filter = '进行中'">进行中</button>
            <button type="button" :class="{ on: filter === '已结束' }" @click="filter = '已结束'">已结束</button>
          </div>
        </div>
      </div>
      <div class="ow-card-b">
        <div v-if="loading" class="ow-empty">加载中…</div>
        <div v-else-if="!filtered.length" class="ow-empty-state">
          <div class="ic">🎙</div>
          <div class="t">还没有面试会话</div>
          <div class="d">创建一场面试副本，题目与追问由 AI 实时生成。</div>
          <div class="act">
            <el-button type="primary" @click="router.push('/interviews/new')">新建面试</el-button>
          </div>
        </div>
        <div v-else class="ow-tlist">
          <div v-for="session in filtered" :key="session.id" class="ow-titem log-row">
            <span class="log-ico" :class="{ done: isEnded(session.status) }">
              <Mic2 v-if="!isEnded(session.status)" aria-hidden="true" />
              <FileBarChart v-else aria-hidden="true" />
            </span>
            <div class="grow">
              <div class="tt">
                {{ session.title }}
                <span class="ow-status" :class="statusClass(session.status)">{{ statusLabel(session.status) }}</span>
              </div>
              <div class="ow-tm">
                {{ topicLabel(session.topicMode) }} · {{ formLabel(session.form) }} ·
                主问 {{ session.questionLimit }} · 创建 {{ shortTime(session.createdAt) }}
              </div>
            </div>
            <span v-if="reportScores[session.id] != null" class="score-chip">{{ reportScores[session.id] }}分</span>
            <button class="ow-btn sm" :class="{ ghost: isViewAction(session) }" type="button" @click="open(session)">
              {{ rowAction(session) }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FileBarChart, Mic2, NotebookPen } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  getReport,
  listSessions,
  TOPIC_MODES,
  type InterviewSession,
  type InterviewSessionStatus,
} from '@/api/interview'
import { problemMessage } from '@/api/http'
import ErrorState from '@/components/ErrorState.vue'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const sessions = ref<InterviewSession[]>([])
const reportScores = ref<Record<number, number | null>>({})
const filter = ref<'全部' | '进行中' | '已结束'>('全部')

const ACTIVE: InterviewSessionStatus[] = ['READY', 'RUNNING', 'PAUSED', 'COMPLETING']

const filtered = computed(() =>
  sessions.value.filter((session) => {
    if (filter.value === '全部') return true
    return filter.value === '进行中'
      ? ACTIVE.includes(session.status)
      : !ACTIVE.includes(session.status)
  }),
)

function isEnded(status: InterviewSessionStatus): boolean {
  return !ACTIVE.includes(status)
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

function topicLabel(value: string): string {
  return TOPIC_MODES.find((topic) => topic.value === value)?.label ?? value
}

function formLabel(value: string): string {
  return value === 'FORMAL' ? '正式模拟' : '专项训练'
}

function shortTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function rowAction(session: InterviewSession): string {
  if (session.status === 'COMPLETED') return '查看报告'
  if (session.status === 'READY') return '开始面试'
  if (isEnded(session.status)) return '报告'
  return '继续面试'
}

/** 查看类动作（报告）用描边次按钮：与开始/继续面试的实底主按钮区分主次，不再双绿并排。 */
function isViewAction(session: InterviewSession): boolean {
  return session.status === 'COMPLETED' || (isEnded(session.status) && session.status !== 'READY')
}

function open(session: InterviewSession): void {
  if (session.status === 'READY') {
    void router.push(`/interviews/${session.id}`)
    return
  }
  if (session.status === 'COMPLETED' || isEnded(session.status)) {
    void router.push(`/interviews/${session.id}/report`)
    return
  }
  void router.push(`/interviews/${session.id}`)
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    sessions.value = await listSessions()
    const scores: Record<number, number | null> = {}
    await Promise.all(sessions.value.map(async (session) => {
      try {
        const state = await getReport(session.id)
        scores[session.id] = state.report?.totalScore ?? null
      } catch {
        scores[session.id] = null
      }
    }))
    reportScores.value = scores
  } catch (loadError) {
    error.value = problemMessage(loadError)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.logs-page {
  display: grid;
  gap: 18px;
}

.logs-page h1 svg {
  width: 24px;
  height: 24px;
  color: var(--brand);
}

.grow {
  flex: 1;
  min-width: 0;
}

.log-row .tt {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.log-ico {
  display: grid;
  width: 36px;
  height: 36px;
  flex: none;
  place-items: center;
  color: var(--brand);
  background: var(--brand-50);
  border-radius: 12px;
}

.log-ico.done {
  color: var(--green-600);
  background: var(--green-50);
}

.log-ico svg {
  width: 18px;
  height: 18px;
}

.score-chip {
  flex: none;
  padding: 3px 10px;
  color: #0d7a52;
  background: linear-gradient(180deg, #e9f8ef, #d8f3e2);
  border-radius: 12px;
  font-size: var(--fs-xs);
  font-weight: 800;
}
</style>
