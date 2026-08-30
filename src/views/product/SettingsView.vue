<template>
  <div class="page settings-page">
    <header class="ow-page-top">
      <div>
        <div class="ow-crumb">系统 / 设置</div>
        <h1><Settings aria-hidden="true" /> 设置</h1>
        <div class="sub">数据、主题与关于</div>
      </div>
    </header>

    <div class="settings-grid">
      <div class="ow-card col6">
        <div class="ow-card-h">
          <div class="ic b2"><Download aria-hidden="true" /></div>
          数据管理
        </div>
        <div class="ow-card-b">
          <p class="ow-hint" style="margin: 0 0 12px;">
            当前产品数据保存在后端 MySQL；本页的导入导出、清空等危险操作将在后端接口就绪后开放，不会伪造成功结果。
          </p>
          <div class="ow-row">
            <button class="ow-btn" type="button" @click="notifyPending('导出 JSON 存档')">导出 JSON 存档</button>
            <button class="ow-btn ghost" type="button" @click="notifyPending('导入 JSON 存档')">导入 JSON 存档</button>
          </div>
          <div style="margin-top: 14px;">
            <button class="ow-btn danger" type="button" @click="confirmClear">清空全部数据（二次确认）</button>
          </div>
        </div>
      </div>

      <div class="ow-card col6">
        <div class="ow-card-h">
          <div class="ic b1"><Sun aria-hidden="true" /></div>
          主题与偏好
        </div>
        <div class="ow-card-b">
          <div class="theme-head">
            <div>
              <div class="theme-title">外观主题</div>
              <div class="ow-hint" style="margin: 4px 0 0;">八套主题 · 玻璃质感 / 渐变光影 · 实时切换并保存</div>
            </div>
            <button class="ow-btn ghost xs" type="button" @click="ui.toggleNext()">⟳ 切换下一主题</button>
          </div>
          <div class="theme-grid">
            <button
              v-for="meta in OW_THEMES"
              :key="meta.value"
              type="button"
              class="theme-card"
              :class="{ active: ui.theme === meta.value }"
              @click="ui.apply(meta.value)"
            >
              <span class="tc-prev" :style="{ background: meta.preview }" />
              <span class="tc-name">{{ meta.name }}</span>
              <span class="tc-desc">{{ meta.desc }}</span>
            </button>
          </div>
          <div class="ow-note" style="margin-top: 12px;">当前主题：{{ currentTheme.name }} · {{ currentTheme.desc }}</div>
        </div>
      </div>

      <div class="ow-card col6">
        <div class="ow-card-h">
          <div class="ic b3"><Bell aria-hidden="true" /></div>
          通知偏好
        </div>
        <div class="ow-card-b">
          <div v-for="item in notificationSettings" :key="item.key" class="titem-row">
            <div class="grow">
              <div class="titem-title">{{ item.label }}</div>
              <div class="ow-hint" style="margin: 2px 0 0;">{{ item.desc }}</div>
            </div>
            <button
              class="ow-switch"
              :class="{ on: item.enabled }"
              type="button"
              role="switch"
              :aria-checked="item.enabled"
              :aria-label="item.label"
              @click="item.enabled = !item.enabled"
            />
          </div>
          <div class="ow-hint">偏好仅保存在当前演示会话；正式通知偏好将随后端 Notification 能力持久化。</div>
        </div>
      </div>

      <div class="ow-card col6">
        <div class="ow-card-h">
          <div class="ic b5"><UserRound aria-hidden="true" /></div>
          账户
        </div>
        <div class="ow-card-b">
          <div class="account-row">
            <span class="ava">{{ avatarText }}</span>
            <div>
              <div class="account-name">{{ auth.user?.username || '求职者' }}</div>
              <div class="ow-hint" style="margin: 2px 0 0;">本地账户 · 会话认证</div>
            </div>
          </div>
          <div class="ow-row" style="margin-top: 14px;">
            <button class="ow-btn ghost" type="button" @click="passwordOpen = true">修改密码</button>
            <button class="ow-btn ghost" type="button" @click="handleLogout">退出登录</button>
          </div>
        </div>
      </div>

      <div class="ow-card col12">
        <div class="ow-card-h">
          <div class="ic b6"><Info aria-hidden="true" /></div>
          关于与实现状态
        </div>
        <div class="ow-card-b">
          <p class="about-text">
            求职成长岛 · Job Quest Island ｜ 前端复刻自交互原型 v3.0（增强版）<br>
            本应用为 Vue 3 + Element Plus 实现：登录/档案/项目资料连接真实后端；今日工作台、面试副本、报告、复习计划及各扩展页当前使用
            <b>前端演示数据</b>，仅用于 UI 复刻验收，不伪造后端能力。面试房间为固定剧本模拟，页面内已就地标注。
          </p>
        </div>
      </div>
    </div>

    <ChangePasswordDialog v-model="passwordOpen" />
  </div>
</template>

<script setup lang="ts">
import { Bell, Download, Info, Settings, Sun, UserRound } from 'lucide-vue-next'
import { ElMessageBox, ElMessage } from 'element-plus'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import ChangePasswordDialog from '@/components/ChangePasswordDialog.vue'
import { OW_THEMES, useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()
const passwordOpen = ref(false)

const notificationSettings = reactive([
  { key: 'notifyReport', label: '新报告提醒', desc: '面试 / 笔试报告生成后通知你', enabled: true },
  { key: 'notifyInterview', label: '面试邀约', desc: '模拟面试与邀约提醒', enabled: true },
  { key: 'notifyTraining', label: '训练提醒', desc: '错题巩固与专项训练建议', enabled: true },
])

const FALLBACK_THEME = OW_THEMES[0] ?? {
  value: 'light' as const, name: '绿茵广场', desc: '清新自然 · 浅色', dark: false, preview: '',
}

const currentTheme = computed(() => OW_THEMES.find((meta) => meta.value === ui.theme) ?? FALLBACK_THEME)
const avatarText = computed(() => auth.user?.username.slice(0, 2).toUpperCase() || '求职')

function notifyPending(action: string): void {
  ElMessage.info(`「${action}」将随后端数据边界确定后接入（演示提示）。`)
}

async function confirmClear(): Promise<void> {
  try {
    await ElMessageBox.confirm(
      '演示环境不会真正删除任何数据。正式版本此处将要求二次确认并说明影响范围与不可恢复性。',
      '清空全部数据',
      { confirmButtonText: '我已了解（演示）', cancelButtonText: '取消', type: 'warning' },
    )
    ElMessage.info('演示环境未执行任何删除。')
  } catch {
    /* 用户取消 */
  }
}

async function handleLogout(): Promise<void> {
  await auth.logout().catch(() => undefined)
  await router.replace('/login')
}
</script>

<style scoped>
.settings-page {
  display: grid;
  gap: 18px;
}

.settings-page h1 svg {
  width: 24px;
  height: 24px;
  color: var(--brand);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
}

.col6 { grid-column: span 6; }
.col12 { grid-column: span 12; }

.theme-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.theme-title {
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.theme-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  color: var(--ink);
  background: var(--glass-2);
  border: 1.5px solid var(--line-2);
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  backdrop-filter: blur(8px);
  transition: transform 0.16s ease, border-color 0.16s, box-shadow 0.16s;
}

.theme-card:hover {
  transform: translateY(-2px);
  border-color: var(--brand);
  box-shadow: var(--shadow-sm);
}

.theme-card.active {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-200), 0 8px 22px var(--card-glow);
}

.theme-card .tc-prev {
  height: 48px;
  border-radius: 10px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 40%);
}

.theme-card .tc-name {
  color: var(--ink);
  font-size: 13.5px;
  font-weight: 800;
}

.theme-card .tc-desc {
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
}

.titem-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding: 10px 12px;
  background: var(--glass-2);
  border: 1.5px solid var(--line);
  border-radius: 12px;
}

.grow {
  flex: 1;
  min-width: 0;
}

.titem-title {
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
}

.account-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ava {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--av-1), var(--av-2));
  border-radius: 12px;
  font-weight: 800;
}

.account-name {
  color: var(--ink);
  font-weight: 700;
}

.about-text {
  margin: 0;
  color: var(--ink-2);
  font-size: 14px;
  line-height: 1.8;
}

@media (max-width: 1100px) {
  .col6,
  .col12 {
    grid-column: span 12;
  }
}
</style>
