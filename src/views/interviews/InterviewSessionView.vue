<template>
  <div class="page session-page">
    <header class="ow-page-top">
      <div>
        <OwCrumb />
        <h1>面试副本 · {{ session?.title ?? '…' }}</h1>
        <div class="sub">
          {{ session?.interviewerName ?? 'AI 面试官' }} ｜ {{ topicLabel }} ｜
          {{ session?.form === 'FORMAL' ? '正式模拟' : '专项训练' }} ｜ 题目由 AI 实时生成
        </div>
      </div>
      <div class="acts">
        <button class="ow-btn ghost" type="button" @click="exitRoom">退出房间</button>
      </div>
    </header>

    <ErrorState v-if="loadError" :message="loadError" :retry="load" />

    <div v-else-if="!session" class="ow-empty">加载中…</div>

    <div v-else class="ow-iv-room">
      <div class="ow-iv-top">
        <div class="lt">
          <div class="ai-badge">AI</div>
          <div class="meta">
            <div class="t1">{{ session.title }} · {{ session.topicMode }}</div>
            <div class="t2">
              <span class="live-dot" :class="{ paused: isPaused }" />
              <span>{{ statusLabel }}</span>
            </div>
          </div>
        </div>
        <div class="rt">
          <div class="prog-pill">第 {{ mainDone }} / {{ session.questionLimit }} 题</div>
          <div class="timer"><span>⏱</span><span>{{ fmtElapsed(elapsed) }}</span></div>
          <button class="close-btn" type="button" title="结束并关闭" @click="endInterview">×</button>
        </div>
      </div>

      <div class="ow-iv-body">
        <div class="ow-iv-left">
          <h4>面试官</h4>
          <div class="iv-npc">
            <div class="face">{{ (session.interviewerName ?? 'AI').slice(0, 1) }}</div>
            <div class="nm">{{ session.interviewerName ?? 'AI 面试官' }}</div>
            <div class="rl">{{ session.targetRole ?? 'Java 后端' }} · {{ session.targetExperienceBand ?? '未注明' }}</div>
            <div class="npc-state">{{ isPaused ? '已暂停' : '提问中' }}</div>
          </div>
          <h4>进度</h4>
          <div class="prog-row">
            <span>问答</span><b>{{ turns.length }} / {{ session.turnLimit }}</b>
          </div>
          <div class="prog-bar"><div class="fill" :style="{ width: `${Math.min(100, (turns.length / session.turnLimit) * 100)}%` }" /></div>
          <div class="prog-row" style="margin-top: 10px;">
            <span>追问</span><b>{{ followCount }} / {{ session.followUpLimit }}</b>
          </div>
          <h4>问题清单</h4>
          <div class="qlist">
            <div
              v-for="turn in turns"
              :key="turn.id"
              class="qi"
              :class="{ done: turn.answer != null, active: turn.id === currentTurn?.id }"
            >
              <div class="n">{{ turn.turnNo }}</div>
              <div>{{ turn.question.slice(0, 18) }}…</div>
            </div>
            <div v-if="!turns.length" class="qi"><div class="n">·</div><div>点击下方「AI 出题」开始</div></div>
          </div>
        </div>

        <div class="ow-iv-center">
          <div class="ow-iv-messages" ref="messagesBox">
            <template v-for="turn in turns" :key="turn.id">
              <div class="bubble iv">
                <div class="sava">面</div>
                <div class="sbody" :class="{ main: turn.turnType === 'MAIN' }">
                  <div class="qt" :class="turn.turnType === 'MAIN' ? 'main' : 'follow'">
                    {{ turn.turnType === 'MAIN' ? '● 主问题' : '↳ 追问' }}
                  </div>
                  <div class="txt">{{ turn.question }}</div>
                </div>
              </div>
              <div v-if="turn.answer" class="bubble me">
                <div class="sava">我</div>
                <div class="sbody">
                  <div class="txt">{{ turn.answer }}</div>
                </div>
              </div>
            </template>
            <div v-if="generating" class="bubble iv">
              <div class="sava">面</div>
              <div class="sbody" :class="{ main: streamingType === 'MAIN' }">
                <div class="qt" :class="streamingType === 'MAIN' ? 'main' : 'follow'">
                  {{ streamingType === 'MAIN' ? '● 主问题生成中' : '↳ 追问生成中' }}
                </div>
                <div class="txt">{{ streamingText }}<span v-if="!streamingText" class="ow-thinking" style="padding:0;border:0;background:transparent;"><i /><i /><i /></span></div>
              </div>
            </div>
            <div v-else-if="false" class="ow-thinking"><i /><i /><i /></div>
          </div>
          <div class="ow-iv-input-area">
            <div class="ow-iv-tabs">
              <div class="tab active">💬 文字作答</div>
              <div class="tab" style="opacity: 0.5;">代码可混排作答</div>
            </div>
            <textarea
              v-model="answer"
              class="ta"
              placeholder="输入你的回答… ⌘/Ctrl + Enter 提交"
              aria-label="作答输入框"
              :disabled="!canAnswer"
              @keydown="onInputKeydown"
            />
            <div v-if="actionError" class="ow-iv-feedback warn show">{{ actionError }}</div>
            <div class="ow-iv-bar">
              <div class="hints">
                提示：<kbd>先抛结论</kbd> · <kbd>分点说理由</kbd> · <kbd>举 1 个项目例子</kbd>
              </div>
              <div class="acts">
                <button class="btn-end" type="button" :disabled="busy" @click="togglePause">
                  {{ isPaused ? '恢复' : '暂停' }}
                </button>
                <button
                  class="btn-end"
                  type="button"
                  :disabled="generating || !isRunning || !lastAnswered"
                  @click="askFollowUp"
                >
                  AI 追问
                </button>
                <button
                  class="btn-send"
                  type="button"
                  :disabled="generating || !isRunning"
                  @click="askMain"
                >
                  {{ turns.length ? 'AI 出题 ▶' : 'AI 出题 开始 ▶' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="ow-iv-right">
          <h4>当前题目</h4>
          <div class="cur-q">
            <div class="tt">
              第 {{ currentTurn?.turnNo ?? '—' }} 题 ·
              {{ currentTurn?.turnType === 'FOLLOW_UP' ? '追问' : '主问题' }}
            </div>
            <div class="qs">{{ currentTurn?.question ?? '还没有题目，点击「AI 出题」生成。' }}</div>
            <div style="margin-top: 10px;">
              <span class="tag">模型 {{ session.aiModel ?? '自动' }}</span>
              <span class="tag">真实 AI 出题</span>
              <span class="tag" :class="{ warn: session.webSearchOutcome?.applied === 'DEGRADED' }">
                {{ webSearchAppliedLabel(session.webSearchOutcome?.applied) }}<template
                  v-if="session.webSearchOutcome?.dialect &amp;&amp; session.webSearchOutcome.dialect !== 'NONE'">
                  · 形状 {{ session.webSearchOutcome.dialect }}</template>
              </span>
              <p v-if="session.webSearchOutcome?.note" class="web-outcome-note">
                {{ session.webSearchOutcome.note }}
              </p>
              <span
                v-for="binding in session.projectBindings"
                :key="`${binding.projectId}-${binding.versionId}`"
                class="tag"
              >
                项目快照 {{ binding.projectName }} · V{{ binding.versionNumber }} · 事实 {{ binding.factCount }}<template v-if="binding.focusFactIds?.length"> · 提问重点 {{ binding.focusFactIds.length }} 条</template>
              </span>
              <span v-if="session.knowledgeBindingCount > 0" class="tag">
                工作心得 {{ session.knowledgeBindingCount }} 条
              </span>
            </div>
          </div>
          <div class="ow-iv-pqtimer">⏱ 已用时 <b>{{ fmtElapsed(elapsed) }}</b></div>
          <div class="tipbox">
            <b>💡 应答策略</b> · 先给结论，再用 STAR 法（情境/任务/行动/结果）+ 量化指标展开。
          </div>
          <h4>作答来源</h4>
          <div class="ow-row">
            <span
              v-for="option in answerSourceOptions"
              :key="option.value"
              class="ow-tag"
              :class="answerSource === option.value ? 'blue' : 'gray'"
              style="cursor: pointer;"
              @click="answerSource = option.value"
            >
              {{ option.label }}
            </span>
          </div>
          <button
            class="ow-btn block"
            style="margin-top: 14px;"
            type="button"
            :disabled="!canAnswer || submitting"
            @click="submit"
          >
            {{ submitting ? '提交中…' : '提交回答' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  endSession,
  getSession,
  pauseSession,
  streamNextQuestion,
  resumeSession,
  submitAnswer,
  TOPIC_MODES,
  webSearchAppliedLabel,
  type InterviewSession,
  type InterviewTurn,
} from '@/api/interview'
import { problemMessage } from '@/api/http'
import ErrorState from '@/components/ErrorState.vue'

const route = useRoute()
const router = useRouter()
const sessionId = Number(route.params.id)

const session = ref<InterviewSession | null>(null)
const turns = ref<InterviewTurn[]>([])
const loadError = ref('')
const actionError = ref('')
const answer = ref('')
const answerSource = ref('INDEPENDENT')
const generating = ref(false)
const submitting = ref(false)
const busy = ref(false)
const elapsed = ref(0)
const messagesBox = ref<HTMLElement>()

let elapsedTimer: number | undefined

const answerSourceOptions = [
  { value: 'INDEPENDENT', label: '独立回答' },
  { value: 'PROMPTED', label: '提示后回答' },
  { value: 'AI_ASSISTED', label: 'AI 辅助' },
]

const isRunning = computed(() => session.value?.status === 'RUNNING')
const isPaused = computed(() => session.value?.status === 'PAUSED')
const mainDone = computed(() => turns.value.filter((turn) => turn.turnType === 'MAIN').length)
const followCount = computed(() => turns.value.filter((turn) => turn.turnType === 'FOLLOW_UP').length)
const lastAnswered = computed(() => {
  const last = turns.value[turns.value.length - 1]
  // 后端全局 non_null：未答回合的 answer 键整个缺失（undefined），必须宽松判空
  return Boolean(last && last.answer != null)
})
const currentTurn = computed(() => {
  const last = turns.value[turns.value.length - 1]
  // 后端全局 non_null：未答回合的 answer 键整个缺失（undefined），必须宽松判空
  return last && last.answer == null ? last : undefined
})
const canAnswer = computed(() => isRunning.value && currentTurn.value !== undefined)
const topicLabel = computed(
  () => TOPIC_MODES.find((topic) => topic.value === session.value?.topicMode)?.label
    ?? session.value?.topicMode ?? '',
)
const statusLabel = computed(() => {
  switch (session.value?.status) {
    case 'RUNNING': return '进行中 · AI 已连接'
    case 'PAUSED': return '已暂停'
    case 'COMPLETING': return '已结束 · 报告待生成'
    case 'COMPLETED': return '已完成'
    case 'CANCELLED': return '已取消'
    default: return session.value?.status ?? ''
  }
})

function fmtElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

async function load(): Promise<void> {
  loadError.value = ''
  try {
    const data = await getSession(sessionId)
    session.value = data.session
    turns.value = data.turns
    await scrollToBottom()
  } catch (error) {
    loadError.value = problemMessage(error)
  }
}

const streamingText = ref('')
const streamingType = ref<'MAIN' | 'FOLLOW_UP'>('MAIN')

async function ask(turnType: 'MAIN' | 'FOLLOW_UP'): Promise<void> {
  actionError.value = ''
  generating.value = true
  streamingText.value = ''
  streamingType.value = turnType
  let streamError = ''
  try {
    await streamNextQuestion(sessionId, turnType, {
      onDelta(text) {
        if (text.startsWith('__DONE__')) {
          const payload = JSON.parse(text.slice(8)) as {
            turnId: number
            turnNo: number
            question: string
          }
          turns.value.push({
            id: payload.turnId,
            turnNo: payload.turnNo,
            turnType,
            question: payload.question,
            answer: null,
            answerSource: null,
            createdAt: new Date().toISOString(),
            answeredAt: null,
          })
          streamingText.value = ''
        } else {
          streamingText.value += text
        }
      },
      onError(message) {
        streamError = message
        // 失败时后端不落库，前端的半截增量也必须一起丢弃，否则会显示出一条不存在的题目
        streamingText.value = ''
      },
    })
    if (streamError) actionError.value = streamError
    await scrollToBottom()
  } catch (error) {
    actionError.value = problemMessage(error)
  } finally {
    generating.value = false
  }
}

const askMain = () => ask('MAIN')
const askFollowUp = () => ask('FOLLOW_UP')

async function submit(): Promise<void> {
  const turn = currentTurn.value
  const text = answer.value.trim()
  if (!turn || !text) return
  submitting.value = true
  try {
    await submitAnswer(sessionId, turn.id, text, answerSource.value)
    turn.answer = text
    turn.answerSource = answerSource.value
    answer.value = ''
  } catch (error) {
    actionError.value = problemMessage(error)
  } finally {
    submitting.value = false
  }
}

function onInputKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    void submit()
  }
}

async function togglePause(): Promise<void> {
  busy.value = true
  try {
    session.value = isPaused.value ? await resumeSession(sessionId) : await pauseSession(sessionId)
  } catch (error) {
    actionError.value = problemMessage(error)
  } finally {
    busy.value = false
  }
}

async function endInterview(): Promise<void> {
  if (session.value && session.value.status !== 'RUNNING' && session.value.status !== 'PAUSED') {
    void router.push(`/interviews/${sessionId}/report`)
    return
  }
  try {
    await ElMessageBox.confirm(
      '结束后按当前问答生成评分报告（AI 生成约需十几秒）。确定结束本场面试？',
      '结束面试副本',
      { confirmButtonText: '结束并生成报告', cancelButtonText: '继续作答', type: 'warning' },
    )
  } catch {
    return
  }
  busy.value = true
  try {
    await endSession(sessionId)
    void router.push(`/interviews/${sessionId}/report`)
  } catch (error) {
    actionError.value = problemMessage(error)
  } finally {
    busy.value = false
  }
}

function exitRoom(): void {
  void router.push('/interviews')
}

async function scrollToBottom(): Promise<void> {
  await nextTick()
  if (messagesBox.value) {
    messagesBox.value.scrollTop = messagesBox.value.scrollHeight
  }
}

onMounted(async () => {
  await load()
  elapsedTimer = window.setInterval(() => {
    if (isRunning.value) elapsed.value += 1
  }, 1000)
})

onBeforeUnmount(() => {
  if (elapsedTimer) window.clearInterval(elapsedTimer)
})
</script>

<style scoped>
.session-page {
  display: grid;
  gap: 16px;
}

.ow-iv-messages {
  min-height: 220px;
}

.live-dot.paused {
  animation: none;
  background: var(--gold-600);
}

.ow-iv-left::-webkit-scrollbar,
.ow-iv-right::-webkit-scrollbar,
.ow-iv-messages::-webkit-scrollbar {
  width: 7px;
}

.ow-iv-left::-webkit-scrollbar-thumb,
.ow-iv-right::-webkit-scrollbar-thumb,
.ow-iv-messages::-webkit-scrollbar-thumb {
  background: var(--line-2);
  border-radius: 12px;
  border: 1px solid transparent;
  background-clip: content-box;
}

@media (max-width: 980px) {
  .ow-iv-body {
    grid-template-columns: 200px 1fr 260px;
  }
}

@media (max-width: 860px) {
  .ow-iv-body {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .ow-iv-left,
  .ow-iv-right {
    border: 0;
    border-bottom: 1px solid var(--line);
  }
}
.web-outcome-note {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: var(--fs-xs);
  line-height: 1.6;
}

.tag.warn {
  color: var(--gold-600);
  background: var(--gold-50);
}

</style>
