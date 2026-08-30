<template>
  <div class="page notify-page">
    <header class="ow-page-top">
      <div>
        <div class="ow-crumb">系统 / 通知中心</div>
        <h1><Bell aria-hidden="true" /> 通知中心</h1>
        <div class="sub">{{ subText }}</div>
      </div>
      <div class="acts">
        <button class="ow-btn ghost sm" type="button" @click="readAll">全部已读</button>
        <button class="ow-btn ghost sm" type="button" @click="clearAll">清空</button>
      </div>
    </header>

    <div class="ow-card">
      <div class="ow-card-h">
        <div class="ic b6"><MessageSquare aria-hidden="true" /></div>
        消息
        <div class="right">通知为事件收件箱，不替代日程视图 · 演示数据</div>
      </div>
      <div class="ow-card-b">
        <div v-if="!list.length" class="ow-empty-state">
          <div class="ic">🔔</div>
          <div class="t">暂无通知</div>
          <div class="d">新的报告、面试邀约与训练提醒会出现在这里。</div>
        </div>
        <div v-else class="notif-list">
          <div v-for="item in list" :key="item.id" class="notif" :class="{ unread: !item.read }">
            <div class="ni">{{ item.icon }}</div>
            <div class="nb">
              <div class="nt">
                {{ item.title }}
                <span v-if="!item.read" class="un">未读</span>
              </div>
              <div class="nd">{{ item.text }}</div>
              <div class="ntime">{{ relTime(item.time) }}</div>
            </div>
            <div class="acts">
              <button v-if="!item.read" class="ow-btn xs ghost" type="button" @click="readOne(item.id)">标已读</button>
              <button class="ow-btn xs ghost danger-btn" type="button" aria-label="删除" @click="removeOne(item.id)">✕</button>
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
import { computed, ref } from 'vue'

import { gapNotifications } from '@/mocks/gap'

const list = ref(gapNotifications.map((item) => ({ ...item })))

const subText = computed(() =>
  list.value.length
    ? `${list.value.filter((item) => !item.read).length} 条未读 · 共 ${list.value.length} 条`
    : '暂无消息',
)

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

function readOne(id: number): void {
  const item = list.value.find((entry) => entry.id === id)
  if (item) item.read = true
}

function readAll(): void {
  list.value.forEach((item) => {
    item.read = true
  })
  ElMessage.success('已全部标记为已读（演示：仅影响收件箱视图）')
}

function removeOne(id: number): void {
  list.value = list.value.filter((item) => item.id !== id)
}

function clearAll(): void {
  list.value = []
  ElMessage.info('通知已清空（演示：不影响原始业务记录）')
}
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
  background: var(--glass-2);
  backdrop-filter: blur(var(--glass-2-blur));
  border: 1.5px solid var(--line);
  border-radius: 12px;
  transition: border-color 0.14s, box-shadow 0.14s, background 0.14s;
}

.notif:hover {
  border-color: var(--brand-200);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
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
  border-radius: 11px;
  font-size: 18px;
}

.nb {
  flex: 1;
  min-width: 0;
}

.nt {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
}

.un {
  padding: 1px 7px;
  color: #fff;
  background: var(--brand);
  border-radius: 8px;
  font-size: 10px;
  font-weight: 800;
}

.nd {
  margin-top: 3px;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.55;
}

.ntime {
  margin-top: 4px;
  color: var(--faint);
  font-size: 11px;
}

.acts {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: none;
}

.danger-btn {
  color: var(--red-600);
}
</style>
