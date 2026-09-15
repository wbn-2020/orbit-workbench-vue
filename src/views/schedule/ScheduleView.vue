<template>
  <div class="page schedule-page">
    <header class="ow-page-top">
      <div>
        <OwCrumb />
        <h1><CalendarDays aria-hidden="true" /> 日程与提醒</h1>
        <div class="sub">{{ subText }}</div>
      </div>
      <div class="acts">
        <div class="range">
          <button
            v-for="d in [7, 14, 30]"
            :key="d"
            type="button"
            class="ow-btn ghost sm"
            :class="{ active: rangeDays === d }"
            @click="setRange(d)"
          >
            未来 {{ d }} 天
          </button>
        </div>
        <button class="ow-btn primary sm" type="button" @click="showForm = !showForm">
          {{ showForm ? '收起' : '新建日程' }}
        </button>
      </div>
    </header>

    <div v-if="showForm" class="ow-card form-card">
      <div class="ow-card-h"><div class="ic b6"><Plus aria-hidden="true" /></div>自定义日程</div>
      <div class="ow-card-b">
        <div class="form-grid">
          <label class="fld">
            <span>标题</span>
            <input v-model="form.title" type="text" maxlength="255" placeholder="如：线下宣讲会" />
          </label>
          <label class="fld">
            <span>开始</span>
            <input v-model="form.startAt" type="datetime-local" />
          </label>
          <label class="fld">
            <span>结束（可选）</span>
            <input v-model="form.endAt" type="datetime-local" />
          </label>
          <label class="fld">
            <span>备注</span>
            <input v-model="form.note" type="text" maxlength="512" placeholder="可选" />
          </label>
          <label class="fld">
            <span>提醒</span>
            <select v-model="form.reminderMinutes">
              <option :value="null">不提醒</option>
              <option :value="0">开始时</option>
              <option :value="5">提前 5 分钟</option>
              <option :value="15">提前 15 分钟</option>
              <option :value="30">提前 30 分钟</option>
              <option :value="60">提前 1 小时</option>
            </select>
          </label>
          <label class="chk">
            <input v-model="form.allDay" type="checkbox" /> 全天
          </label>
        </div>
        <div class="form-acts">
          <button class="ow-btn primary sm" type="button" :disabled="saving || !form.title || !form.startAt" @click="create">
            {{ saving ? '保存中…' : '保存日程' }}
          </button>
        </div>
      </div>
    </div>

    <div class="ow-card">
      <div class="ow-card-h">
        <div class="ic b6"><CalendarDays aria-hidden="true" /></div>
        日程清单
        <div class="right">自定义日程落库；面试/复习/投递为实时派生，只读</div>
      </div>
      <div class="ow-card-b">
        <div v-if="error" class="sched-error">
          <div class="t">{{ error }}</div>
          <button class="ow-btn sm ghost" type="button" @click="load">重试</button>
        </div>
        <div v-else-if="loading && !items.length" class="ow-empty-state"><div class="t">加载中…</div></div>
        <div v-else-if="!items.length" class="ow-empty-state">
          <div class="ic"><CalendarDays aria-hidden="true" /></div>
          <div class="t">该时间窗暂无日程</div>
          <div class="d">新建自定义日程，或在创建面试时填写面试时间、安排复习任务。</div>
        </div>
        <div v-else class="agenda">
          <section v-for="group in grouped" :key="group.day" class="day">
            <div class="day-h">{{ group.label }}</div>
            <div v-for="item in group.items" :key="item.sourceType + item.sourceId" class="ev" :class="{ done: item.status === 'COMPLETED' }">
              <div class="ev-time">
                <span class="ic">{{ scheduleSourceIcon(item.sourceType) }}</span>
                <span class="tm">{{ timeLabel(item) }}</span>
              </div>
              <div class="ev-body" @click="open(item)">
                <div class="ev-title">{{ item.title }}</div>
                <div class="ev-meta">
                  <span class="tag">{{ scheduleSourceLabel(item.sourceType) }}</span>
                  <span v-if="item.status === 'COMPLETED'" class="tag ok">已完成</span>
                  <span v-if="item.reminderHint" class="tag muted">{{ item.reminderHint }}</span>
                </div>
              </div>
              <div class="ev-acts">
                <template v-if="item.sourceType === 'CUSTOM'">
                  <button v-if="item.status !== 'COMPLETED'" class="ow-btn xs ghost" type="button" @click="complete(item)">完成</button>
                  <button class="ow-btn xs ghost danger" type="button" @click="remove(item)">删除</button>
                </template>
                <button v-else-if="item.resourceRoute" class="ow-btn xs ghost" type="button" @click="open(item)">查看</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CalendarDays, Plus } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  cancelScheduleEvent,
  completeScheduleEvent,
  createScheduleEvent,
  deleteScheduleEvent,
  getAgenda,
  scheduleSourceIcon,
  scheduleSourceLabel,
  type AgendaItem,
} from '@/api/schedule'
import { problemMessage } from '@/api/http'
import { getPreferences } from '@/api/preferences'
import {
  timezoneDateKey,
  timezoneDateLabel,
  timezoneTimeLabel,
} from '@/utils/timezone'

interface Row extends AgendaItem {
  reminderHint?: string
}

const router = useRouter()
const items = ref<Row[]>([])
const loading = ref(true)
const error = ref('')
const rangeDays = ref(14)
const showForm = ref(false)
const saving = ref(false)
const timezone = ref('Asia/Shanghai')
const form = ref<{
  title: string
  startAt: string
  endAt: string
  allDay: boolean
  reminderMinutes: number | null
  note: string
}>({
  title: '', startAt: '', endAt: '', allDay: false, reminderMinutes: null, note: '',
})

const subText = computed(() =>
  items.value.length ? `未来 ${rangeDays.value} 天 · ${items.value.length} 项日程` : `未来 ${rangeDays.value} 天暂无日程`,
)

const grouped = computed(() => {
  const map = new Map<string, Row[]>()
  for (const item of items.value) {
    const day = timezoneDateKey(item.startAt, timezone.value)
    if (!map.has(day)) map.set(day, [])
    map.get(day)!.push(item)
  }
  return Array.from(map.entries()).map(([day, list]) => ({
    day,
    label: timezoneDateLabel(list[0]?.startAt ?? day, timezone.value),
    items: list,
  }))
})

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const now = new Date()
    const to = new Date(now.getTime() + rangeDays.value * 86400000)
    const [preference, agenda] = await Promise.all([
      getPreferences().catch(() => null),
      getAgenda(now, to),
    ])
    if (preference?.timezoneId) timezone.value = preference.timezoneId
    items.value = agenda
  } catch (e) {
    error.value = problemMessage(e)
  } finally {
    loading.value = false
  }
}

function setRange(days: number): void {
  rangeDays.value = days
  load()
}

function timeLabel(item: Row): string {
  if (item.allDay) return '全天'
  const s = timezoneTimeLabel(item.startAt, timezone.value)
  if (!item.endAt) return s
  return `${s}–${timezoneTimeLabel(item.endAt, timezone.value)}`
}

async function create(): Promise<void> {
  if (!form.value.title || !form.value.startAt) return
  saving.value = true
  try {
    await createScheduleEvent({
      title: form.value.title,
      startAt: new Date(form.value.startAt).toISOString(),
      endAt: form.value.endAt ? new Date(form.value.endAt).toISOString() : null,
      allDay: form.value.allDay,
      reminderMinutes: form.value.reminderMinutes,
      note: form.value.note || null,
    })
    ElMessage.success('日程已创建')
    form.value = { title: '', startAt: '', endAt: '', allDay: false, reminderMinutes: null, note: '' }
    showForm.value = false
    await load()
  } catch (e) {
    ElMessage.error(problemMessage(e))
  } finally {
    saving.value = false
  }
}

async function complete(item: Row): Promise<void> {
  try {
    await completeScheduleEvent(item.sourceId)
    await load()
  } catch (e) {
    ElMessage.error(problemMessage(e))
  }
}

async function remove(item: Row): Promise<void> {
  try {
    await cancelScheduleEvent(item.sourceId)
    await deleteScheduleEvent(item.sourceId)
    await load()
  } catch (e) {
    ElMessage.error(problemMessage(e))
  }
}

function open(item: Row): void {
  if (item.resourceRoute) router.push(item.resourceRoute)
}

onMounted(load)
</script>

<style scoped>
.schedule-page {
  display: grid;
  gap: 18px;
}

.schedule-page h1 svg {
  width: 24px;
  height: 24px;
  color: var(--brand);
}

.acts {
  display: flex;
  gap: 10px;
  align-items: center;
}

.range {
  display: flex;
  gap: 6px;
}

.range .ow-btn.active {
  color: var(--brand);
  border-color: var(--brand-200);
}

.form-card {
  margin-bottom: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.fld {
  display: grid;
  gap: 4px;
  font-size: var(--fs-xs);
  color: var(--muted);
}

.fld input {
  padding: 8px 10px;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
}

.fld select {
  min-height: 35px;
  padding: 8px 10px;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
}

.chk {
  display: flex;
  gap: 6px;
  align-items: center;
  align-self: end;
  font-size: var(--fs-xs);
  color: var(--muted);
}

.form-acts {
  margin-top: 12px;
}

.sched-error {
  display: grid;
  gap: 10px;
  place-items: center;
  padding: 20px 0;
  color: var(--muted);
}

.agenda {
  display: grid;
  gap: 16px;
}

.day-h {
  margin-bottom: 6px;
  color: var(--faint);
  font-size: var(--fs-xs);
  font-weight: 800;
}

.ev {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 11px 13px;
  margin-bottom: 8px;
  background: var(--glass-2);
  border: 1.5px solid var(--line);
  border-radius: 12px;
}

.ev.done {
  opacity: 0.6;
}

.ev-time {
  display: flex;
  flex: 0 0 96px;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  color: var(--muted);
  font-size: var(--fs-xs);
}

.ev-time .ic {
  font-size: var(--fs-md);
}

.ev-time .tm {
  font-weight: 700;
}

.ev-body {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.ev-title {
  color: var(--ink);
  font-size: var(--fs-sm);
  font-weight: 700;
}

.ev-meta {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.tag {
  padding: 1px 8px;
  color: var(--brand);
  background: var(--brand-50);
  border-radius: 12px;
  font-size: var(--fs-xs);
  font-weight: 700;
}

.tag.ok {
  color: var(--green-700, #1a7f4b);
  background: rgba(26, 127, 75, 0.12);
}

.tag.muted {
  color: var(--muted);
  background: var(--surface);
}

.ev-acts {
  display: flex;
  gap: 6px;
  flex: none;
}

.danger {
  color: var(--red-600);
}

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
