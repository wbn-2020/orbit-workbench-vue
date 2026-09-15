<template>
  <div class="page notify-page">
    <header class="ow-page-top">
      <div>
        <OwCrumb />
        <h1><Bell aria-hidden="true" /> 通知中心</h1>
        <div class="sub">{{ subText }}</div>
      </div>
      <div class="acts">
        <button
          class="ow-btn ghost sm"
          type="button"
          :class="{ active: unreadOnly }"
          @click="toggleFilter"
        >
          {{ unreadOnly ? '查看全部' : '仅看未读' }}
        </button>
        <button class="ow-btn ghost sm" type="button" :disabled="!unread" @click="readAll">
          全部已读
        </button>
      </div>
    </header>

    <div class="ow-card">
      <div class="ow-card-h">
        <div class="ic b6"><MessageSquare aria-hidden="true" /></div>
        消息
        <div class="right">通知为事件收件箱，仅记录状态变化，不删除原始业务记录</div>
      </div>
      <div class="ow-card-b">
        <div v-if="loadError" class="notify-error">
          <div class="t">{{ loadError }}</div>
          <button class="ow-btn sm ghost" type="button" @click="load">重试</button>
        </div>
        <div v-else-if="loading && !items.length" class="ow-empty-state">
          <div class="t">加载中…</div>
        </div>
        <div v-else-if="!items.length" class="ow-empty-state">
          <div class="ic"><Bell aria-hidden="true" /></div>
          <div class="t">{{ unreadOnly ? '没有未读通知' : '暂无通知' }}</div>
          <div class="d">新的报告、面试、日程、导入与复习提醒会出现在这里。</div>
        </div>
        <div v-else class="notif-list">
          <div
            v-for="item in items"
            :key="item.id"
            class="notif"
            :class="{ unread: !item.read }"
          >
            <div class="ni">{{ notificationIcon(item.eventType) }}</div>
            <button
              class="nb"
              type="button"
              :aria-label="`${item.title}，打开通知详情`"
              @click="open(item)"
            >
              <div class="nt">
                {{ item.title }}
                <span v-if="!item.read" class="un">未读</span>
              </div>
              <div class="nd">{{ item.content }}</div>
              <div class="ntime">{{ relTime(item.createdAt) }}</div>
            </button>
            <div class="acts">
              <button
                v-if="item.resourceRoute"
                class="ow-btn xs ghost"
                type="button"
                @click="open(item)"
              >
                查看
              </button>
              <button
                v-if="!item.read"
                class="ow-btn xs ghost"
                type="button"
                @click="readOne(item.id)"
              >
                标已读
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Bell, MessageSquare } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationIcon,
  type NotificationItem,
} from '@/api/notifications'
import { problemMessage } from '@/api/http'

const router = useRouter()
const items = ref<NotificationItem[]>([])
const total = ref(0)
const unread = ref(0)
const loading = ref(true)
const loadError = ref('')
const unreadOnly = ref(false)

const subText = computed(() =>
  total.value
    ? `${unread.value} 条未读 · 共 ${total.value} 条`
    : '暂无消息',
)

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const [page, count] = await Promise.all([
      listNotifications({ unreadOnly: unreadOnly.value, page: 1, size: 50 }),
      getUnreadCount(),
    ])
    items.value = page.items
    total.value = page.total
    unread.value = count
  } catch (error) {
    loadError.value = problemMessage(error)
  } finally {
    loading.value = false
  }
}

function toggleFilter(): void {
  unreadOnly.value = !unreadOnly.value
  load()
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

async function readOne(id: number): Promise<void> {
  try {
    await markNotificationRead(id)
    const item = items.value.find((entry) => entry.id === id)
    if (item && !item.read) {
      item.read = true
      item.readAt = new Date().toISOString()
      unread.value = Math.max(unread.value - 1, 0)
      if (unreadOnly.value) items.value = items.value.filter((entry) => entry.id !== id)
    }
  } catch (error) {
    ElMessage.error(problemMessage(error))
  }
}

async function readAll(): Promise<void> {
  try {
    await markAllNotificationsRead()
    ElMessage.success('已全部标记为已读')
    await load()
  } catch (error) {
    ElMessage.error(problemMessage(error))
  }
}

async function open(item: NotificationItem): Promise<void> {
  if (!item.read) await readOne(item.id)
  if (item.resourceRoute) router.push(item.resourceRoute)
}

onMounted(load)
</script>

<style scoped>
.notify-page {
  display: grid;
  gap: 18px;
}

.notify-page h1 svg {
  width: 24px;
  height: 24px;
  color: var(--brand);
}

.acts .ow-btn.active {
  color: var(--brand);
  border-color: var(--brand-200);
}

.notify-error {
  display: grid;
  gap: 10px;
  place-items: center;
  padding: 22px 0;
  color: var(--muted);
}

.notif-list {
  display: grid;
  gap: 10px;
}

.notif {
  position: relative;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 13px 15px;
  background: var(--surface);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  transition: border-color 0.14s, box-shadow 0.14s, background 0.14s;
}

.notif:hover {
  border-color: var(--line-2);
}

.notif.unread {
  background: var(--brand-50);
  border-color: var(--brand-200);
}

.notif.unread::before {
  position: absolute;
  top: 50%;
  left: 6px;
  width: 5px;
  height: 28px;
  border-radius: 3px;
  background: var(--brand);
  content: '';
  transform: translateY(-50%);
}

.ni {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  place-items: center;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  font-size: var(--fs-md);
}

.nb {
  flex: 1;
  min-width: 0;
  padding: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.nb:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 3px;
  border-radius: 6px;
}

.nt {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink);
  font-size: var(--fs-sm);
  font-weight: 700;
}

.un {
  padding: 1px 7px;
  color: #fff;
  background: var(--brand);
  border-radius: 12px;
  font-size: var(--fs-xs);
  font-weight: 800;
}

.nd {
  margin-top: 3px;
  color: var(--muted);
  font-size: var(--fs-xs);
  line-height: 1.55;
}

.ntime {
  margin-top: 4px;
  color: var(--ow-muted, #52685e);
  font-size: var(--fs-xs);
}

.acts {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: none;
}
</style>
