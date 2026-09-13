<template>
  <div v-if="visible" class="focus-widget" :class="{ collapsed: collapsed }" aria-live="polite">
    <button
      v-if="collapsed"
      class="focus-fab"
      type="button"
      :aria-label="running ? '展开专注计时' : '打开专注计时'"
      :title="running ? `专注中 ${formatted }` : '专注计时'"
      @click="collapsed = false"
    >
      <Timer aria-hidden="true" />
      <span v-if="running" class="fab-time">{{ formatted }}</span>
    </button>

    <section v-else class="focus-panel" aria-label="专注计时">
      <header class="focus-head">
        <span class="focus-mode" :class="mode">
          <Component :is="mode === 'focus' ? Brain : Coffee" aria-hidden="true" />
          {{ mode === 'focus' ? '专注' : '休息' }}
        </span>
        <button class="focus-collapse" type="button" aria-label="收起" title="收起" @click="collapse">
          <ChevronDown aria-hidden="true" />
        </button>
      </header>

      <div class="focus-clock" :class="mode">{{ formatted }}</div>

      <p class="focus-hint">
        {{ mode === 'focus' ? '保持专注，结束后自动记录并进入休息' : '起身走动一下，稍后回到专注' }}
      </p>

      <div class="focus-actions">
        <button
          class="focus-btn primary"
          type="button"
          :aria-label="running ? '暂停' : '开始'"
          :disabled="pendingSessions.length > 0 && !running"
          @click="toggle"
        >
          <Component :is="running ? Pause : Play" aria-hidden="true" />
          {{ running ? '暂停' : pendingSessions.length ? '请先重试保存' : '开始' }}
        </button>
        <button class="focus-btn" type="button" aria-label="重置" title="重置" @click="reset">
          <RotateCcw aria-hidden="true" />
        </button>
      </div>

      <p v-if="savedHint" class="focus-saved">已记录 {{ savedHint }}</p>
      <div v-if="saveError" class="focus-save-error" role="alert">
        <span>{{ saveError }}</span>
        <button type="button" :disabled="saving" @click="retrySave">
          {{ saving ? '保存中...' : '重试' }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Brain, ChevronDown, Coffee, Pause, Play, RotateCcw, Timer } from 'lucide-vue-next'
import {
  captureFocusStart,
  clearFocusStart,
  saveFocusSession,
  type SaveFocusSessionInput,
} from '@/api/focus'

const FOCUS_SECONDS = 25 * 60
const BREAK_SECONDS = 5 * 60

/**
 * 计时器是机制层组件，不是全局常驻 UI（22 号诊断 B3）：
 * 只在「学习更新」模式内显示；一旦开始计时，切到别的页面仍保留（否则用户会以为计时丢了）；
 * 页面内行动入口（`focus-timer-open`）也能临时唤起它。
 */
const props = withDefaults(defineProps<{ active?: boolean }>(), { active: false })

const collapsed = ref(true)
const running = ref(false)
const requestedOpen = ref(false)
const visible = computed(() => props.active || running.value || requestedOpen.value
  || startedAt.value !== null || pendingSessions.value.length > 0 || saving.value)
const mode = ref<'focus' | 'break'>('focus')
const remaining = ref(FOCUS_SECONDS)
const savedHint = ref('')
const saveError = ref('')
const saving = ref(false)
const startedAt = ref<string | null>(null)
const pendingSessions = ref<SaveFocusSessionInput[]>([])

const PENDING_STORAGE_KEY = 'ow_pending_focus_sessions'

let timer: ReturnType<typeof setInterval> | null = null
let deadlineAt: number | null = null

const formatted = computed(() => {
  const m = Math.floor(remaining.value / 60)
  const s = remaining.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

function clearTimer(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  deadlineAt = null
}

async function persistSession(session: SaveFocusSessionInput): Promise<void> {
  if (saving.value) return
  if (!pendingSessions.value.some((item) => item.idempotencyKey === session.idempotencyKey)) {
    pendingSessions.value.push(session)
    persistPendingSessions()
  }
  saving.value = true
  try {
    await saveFocusSession(session)
    pendingSessions.value = pendingSessions.value.filter(
      (item) => item.idempotencyKey !== session.idempotencyKey,
    )
    persistPendingSessions()
    if (!pendingSessions.value.length) saveError.value = ''
    savedHint.value = `${session.durationMinutes} 分钟专注`
    window.dispatchEvent(new CustomEvent('focus-session-saved'))
  } catch {
    if (
      session.idempotencyKey &&
      !pendingSessions.value.some((item) => item.idempotencyKey === session.idempotencyKey)
    ) {
      pendingSessions.value = [...pendingSessions.value, session]
      persistPendingSessions()
    }
    saveError.value = '专注记录保存失败，请重试'
    savedHint.value = ''
  } finally {
    saving.value = false
  }
}

async function retrySave(): Promise<void> {
  const session = pendingSessions.value[0]
  if (session) {
    await persistSession(session)
  }
}

function onPhaseEnd(): void {
  running.value = false
  clearTimer()

  if (mode.value === 'focus') {
    const minutes = FOCUS_SECONDS / 60
    const actualStartedAt = startedAt.value
    startedAt.value = clearFocusStart()
    mode.value = 'break'
    remaining.value = BREAK_SECONDS

    if (actualStartedAt) {
      void persistSession({
        startedAt: actualStartedAt,
        durationMinutes: minutes,
        mode: 'focus',
        idempotencyKey: createIdempotencyKey(),
      })
    }
  } else {
    mode.value = 'focus'
    remaining.value = FOCUS_SECONDS
    savedHint.value = ''
  }
}

function tick(): void {
  if (deadlineAt === null) return
  const nextRemaining = Math.ceil((deadlineAt - Date.now()) / 1000)
  if (nextRemaining <= 0) {
    remaining.value = 0
    clearTimer()
    onPhaseEnd()
    return
  }
  remaining.value = nextRemaining
}

function toggle(): void {
  if (running.value) {
    tick()
    running.value = false
    clearTimer()
    return
  }
  running.value = true
  savedHint.value = ''
  startedAt.value = captureFocusStart(mode.value, startedAt.value)
  deadlineAt = Date.now() + remaining.value * 1000
  timer = setInterval(tick, 1000)
}

function reset(): void {
  running.value = false
  clearTimer()
  mode.value = 'focus'
  remaining.value = FOCUS_SECONDS
  startedAt.value = clearFocusStart()
  savedHint.value = ''
}

function createIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `focus-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** 响应页面内「开始一次专注」类行动入口：展开计时器，用户按一次开始即可。 */
function handleOpenRequest(): void {
  requestedOpen.value = true
  collapsed.value = false
}

/** 用户主动收起：同时撤销页面行动的临时唤起，让计时器回到「模式内」语义。 */
function collapse(): void {
  collapsed.value = true
  requestedOpen.value = false
}

function persistPendingSessions(): void {
  try {
    localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pendingSessions.value))
  } catch {
    // 保存队列仍保留在内存中，浏览器禁用存储时不阻断计时器。
  }
}

function restorePendingSessions(): void {
  try {
    const raw = localStorage.getItem(PENDING_STORAGE_KEY)
    if (!raw) return
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return
    pendingSessions.value = parsed.filter((item): item is SaveFocusSessionInput => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Partial<SaveFocusSessionInput>
      return (
        typeof candidate.startedAt === 'string' &&
        typeof candidate.durationMinutes === 'number' &&
        typeof candidate.mode === 'string' &&
        typeof candidate.idempotencyKey === 'string'
      )
    })
    if (pendingSessions.value.length) saveError.value = '有未保存的专注记录，请先重试保存'
  } catch {
    // 忽略损坏或不可读的浏览器缓存。
  }
}

onMounted(() => {
  restorePendingSessions()
  window.addEventListener('focus-timer-open', handleOpenRequest)
})

onBeforeUnmount(() => {
  clearTimer()
  window.removeEventListener('focus-timer-open', handleOpenRequest)
})
</script>

<style scoped>
.focus-widget {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 60;
}

.focus-fab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: #fff;
  background: linear-gradient(135deg, var(--brand), var(--brand-700, #1f6f5c));
  border: 0;
  border-radius: 999px;
  box-shadow: 0 10px 26px rgb(31 111 92 / 40%);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
}

.focus-fab svg {
  width: 20px;
  height: 20px;
}

.fab-time {
  font-variant-numeric: tabular-nums;
}

.focus-panel {
  width: 248px;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: 18px;
  box-shadow: var(--shadow-md);
}

.focus-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.focus-mode {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.focus-mode.focus {
  color: var(--ow-eyebrow, #16634f);
  background: var(--brand-50, rgb(31 111 92 / 12%));
}

.focus-mode.break {
  color: var(--orange, #d97706);
  background: rgb(217 119 6 / 12%);
}

.focus-mode svg {
  width: 14px;
  height: 14px;
}

.focus-collapse {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  color: var(--muted);
  background: transparent;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
}

.focus-collapse svg {
  width: 16px;
  height: 16px;
}

.focus-clock {
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  margin: 6px 0 4px;
}

.focus-clock.break {
  color: var(--orange, #d97706);
}

.focus-hint {
  margin: 0 0 12px;
  text-align: center;
  color: var(--ow-muted, #52685e);
  font-size: 12px;
  line-height: 1.5;
}

.focus-actions {
  display: flex;
  gap: 8px;
}

.focus-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  color: var(--ink-2);
  background: var(--glass);
  border: 1px solid var(--line-2);
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
}

.focus-btn svg {
  width: 16px;
  height: 16px;
}

.focus-btn.primary {
  flex: 1;
  color: #fff;
  background: linear-gradient(135deg, var(--btn-1, #1fa879), var(--btn-2, #15805f));
  border-color: transparent;
  box-shadow: 0 6px 16px rgb(31 111 92 / 30%);
}

.focus-btn:hover {
  filter: brightness(1.05);
}

.focus-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
  transform: none;
}

.focus-saved {
  margin: 10px 0 0;
  text-align: center;
  color: var(--green, #16a34a);
  font-size: 12px;
  font-weight: 700;
}

.focus-save-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  color: var(--danger, #b91c1c);
  font-size: 12px;
  line-height: 1.4;
}

.focus-save-error button {
  flex: none;
  padding: 0;
  color: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
  font: inherit;
  font-weight: 800;
  text-decoration: underline;
}

.focus-save-error button:disabled {
  cursor: wait;
  opacity: 0.65;
}

@media (max-width: 560px) {
  .focus-widget {
    right: 14px;
    bottom: 14px;
  }

  .focus-panel {
    width: min(248px, calc(100vw - 28px));
  }
}
</style>
