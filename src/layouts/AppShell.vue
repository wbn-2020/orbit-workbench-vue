<template>
  <div
    class="app-shell"
    :class="{ 'search-open': mobileSearchOpen, 'sidebar-collapsed': sidebarCollapsed }"
  >
    <aside class="sidebar">
      <div class="sidebar-top">
        <BrandBlock />
        <button
          class="sidebar-toggle"
          type="button"
          :aria-label="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
          :title="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
          @click="toggleSidebar"
        >
          <ChevronsLeft v-if="!sidebarCollapsed" aria-hidden="true" />
          <ChevronsRight v-else aria-hidden="true" />
        </button>
      </div>
      <nav class="nav-list" aria-label="主导航">
        <div
          v-for="group in navGroups"
          :key="group.label"
          class="nav-group"
          :class="{ 'is-collapsed': !isGroupOpen(group.label) }"
        >
          <button
            class="nav-group-title"
            type="button"
            :aria-expanded="isGroupOpen(group.label)"
            @click="toggleGroup(group.label)"
          >
            <span class="nav-group-bar" aria-hidden="true" />
            <span class="nav-group-label">{{ group.label }}</span>
            <ChevronDown class="nav-group-chevron" aria-hidden="true" />
          </button>
          <div class="nav-group-items">
            <RouterLink
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="nav-item"
              :title="item.label"
            >
              <component :is="item.icon" aria-hidden="true" />
              <span class="nav-item-text">{{ item.label }}</span>
            </RouterLink>
          </div>
        </div>
      </nav>
      <div class="sidebar-footer">
        <div class="user-summary">
          <div class="user-summary-top">
            <span class="user-avatar"><UserRound aria-hidden="true" /></span>
            <span class="user-summary-name">
              <strong>工程师·{{ authName }}</strong>
              <small>本地账户</small>
            </span>
          </div>
        </div>
      </div>
    </aside>

    <el-drawer
      v-model="mobileNavOpen"
      direction="ltr"
      size="min(300px, 86vw)"
      :with-header="false"
      class="mobile-drawer"
    >
      <BrandBlock />
      <nav class="nav-list" aria-label="移动端主导航">
        <div
          v-for="group in navGroups"
          :key="group.label"
          class="nav-group"
          :class="{ 'is-collapsed': !isGroupOpen(group.label) }"
        >
          <button
            class="nav-group-title"
            type="button"
            :aria-expanded="isGroupOpen(group.label)"
            @click="toggleGroup(group.label)"
          >
            <span class="nav-group-bar" aria-hidden="true" />
            <span class="nav-group-label">{{ group.label }}</span>
            <ChevronDown class="nav-group-chevron" aria-hidden="true" />
          </button>
          <div class="nav-group-items">
            <RouterLink
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="nav-item"
              @click="mobileNavOpen = false"
            >
              <component :is="item.icon" aria-hidden="true" />
              <span class="nav-item-text">{{ item.label }}</span>
            </RouterLink>
          </div>
        </div>
      </nav>
    </el-drawer>

    <div class="shell-main">
      <header class="topbar">
        <div class="topbar-context">
          <el-button
            class="mobile-menu"
            text
            :icon="Menu"
            aria-label="打开导航"
            @click="mobileNavOpen = true"
          />
          <div class="breadcrumb">
            <span class="crumb-root">Orbit /&nbsp;</span>
            <template v-for="(seg, i) in crumbSegments" :key="`${seg.label}-${i}`">
              <span v-if="i > 0" class="crumb-sep">/&nbsp;</span>
              <span v-if="i < crumbSegments.length - 1" class="crumb-section">{{ seg.label }}</span>
              <strong v-else>{{ seg.label }}</strong>
            </template>
          </div>
        </div>
        <div class="search">
          <Search class="search-icon" aria-hidden="true" />
          <input
            v-model="searchKeyword"
            class="search-input"
            ref="searchInput"
            placeholder="搜索项目、画像事实、知识块、面试、面试官、报告、复习任务、投递…"
            aria-label="全局搜索"
            @focus="openSearchPanel"
            @blur="hideSearchPanel"
            @input="onSearchInput"
            @keydown.enter="onSearchEnter"
          >
          <button class="kbd-hint" type="button" aria-label="打开命令面板" title="命令面板（Ctrl / Cmd + K）" @click="focusPalette">
            <kbd>Ctrl K</kbd>
          </button>
          <div v-if="searchPanelOpen" class="recents search-results">
            <div v-if="searchLoading" class="recents-title">
              搜索中…
            </div>
            <div v-else-if="searchError" class="recents-title">
              {{ searchError }}
            </div>
            <template v-else-if="visibleSearchGroups.length > 0">
              <div v-for="group in visibleSearchGroups" :key="group.type" class="search-group">
                <div class="recents-title search-group-title">
                  <span
                    class="search-group-icon"
                    :class="`search-tone-${searchGroupMeta(group.type).tone}`"
                    aria-hidden="true"
                  >
                    <component :is="searchIcon(group.type)" />
                  </span>
                  <span>{{ searchGroupMeta(group.type).label }} · {{ group.total }}</span>
                </div>
                <button
                  v-for="hit in group.items"
                  :key="`${hit.type}-${hit.id}`"
                  type="button"
                  class="rec search-hit"
                  @mousedown.prevent
                  @click="goToHit(hit)"
                >
                  <span class="hit-line">
                    <span class="hit-title">{{ hit.title }}</span>
                    <span v-if="hit.sub" class="hit-sub">{{ hit.sub }}</span>
                  </span>
                  <span v-if="hit.snippet" class="hit-snippet">{{ hit.snippet }}</span>
                </button>
              </div>
            </template>
            <div v-else-if="searchKeyword.trim().length >= 2" class="recents-title">
              没有匹配「{{ searchKeyword.trim() }}」的结果
            </div>
            <div v-else class="recents-title">
              输入至少 2 个字符开始搜索
            </div>
          </div>
        </div>
        <div class="spacer" />
        <div class="topbar-actions">
          <button class="search-toggle" type="button" aria-label="搜索" @click="toggleMobileSearch">
            <Search aria-hidden="true" />
          </button>
          <button class="bell" type="button" aria-label="通知中心" @click="router.push('/notifications')">
            <Bell aria-hidden="true" />
            <span v-if="unreadCount" class="bell-dot">{{ unreadCount }}</span>
          </button>
          <button
            class="focus-entry"
            type="button"
            aria-label="专注计时"
            title="专注计时（学习更新）"
            @click="router.push('/learning-update')"
          >
            <Timer aria-hidden="true" />
          </button>
          <button class="theme-toggle" type="button" aria-label="切换主题" @click="ui.toggleNext()">
            <component :is="isDarkTheme ? Sun : MoonStar" aria-hidden="true" />
          </button>
          <el-dropdown trigger="click">
            <button class="user-menu" type="button">
              <span class="avatar">{{ avatarText }}</span>
              <span class="user-name">{{ auth.user?.username || '工程师' }}</span>
              <ChevronDown aria-hidden="true" />
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :icon="UserRound" @click="router.push('/profile/job')">
                  求职档案
                </el-dropdown-item>
                <el-dropdown-item :icon="KeyRound" @click="passwordDialogOpen = true">
                  修改密码
                </el-dropdown-item>
                <el-dropdown-item divided :icon="LogOut" @click="handleLogout">
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="content">
        <RouterView v-slot="{ Component }">
          <div :key="route.fullPath" class="ow-rise page-host">
            <component :is="Component" />
          </div>
        </RouterView>
      </main>
    </div>

    <ChangePasswordDialog v-model="passwordDialogOpen" />
    <CommandPalette ref="paletteRef" :pages="palettePages" />
    <FocusTimerWidget :active="route.name === 'learning-update'" />
  </div>
</template>

<script setup lang="ts">
import {
  Activity,
  Bell,
  BadgeCheck,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  FileBarChart,
  FileText,
  FolderKanban,
  HelpCircle,
  KeyRound,
  Layers,
  LayoutDashboard,
  Sparkles,
  LogOut,
  Menu,
  MoonStar,
  Network,
  NotebookPen,
  Search,
  Settings,
  Sun,
  Target,
  Timer,
  UserRound,
  UsersRound,
} from 'lucide-vue-next'
import { computed, defineComponent, h, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import FocusTimerWidget from '@/components/FocusTimerWidget.vue'
import CommandPalette from '@/components/CommandPalette.vue'
import { useCrumbSegments } from '@/composables/useCrumb'

import ChangePasswordDialog from '@/components/ChangePasswordDialog.vue'
import { getProblem } from '@/api/http'
import { getUnreadCount } from '@/api/notifications'
import {
  SEARCH_DOMAIN_META,
  searchAll,
  type SearchDomain,
  type SearchDomainIcon,
  type SearchHit,
  type SearchResponse,
} from '@/api/search'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()
const crumbSegments = useCrumbSegments()
const mobileNavOpen = ref(false)
const passwordDialogOpen = ref(false)
const searchKeyword = ref('')
const searchPanelOpen = ref(false)
const searchLoading = ref(false)
const searchError = ref('')
const searchResult = ref<SearchResponse | null>(null)
const visibleSearchGroups = computed(() =>
  searchResult.value?.groups.filter((group) => group.items.length > 0) ?? [],
)
let searchTimer: ReturnType<typeof setTimeout> | null = null
let searchRequestId = 0

const mobileSearchOpen = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
function toggleMobileSearch(): void {
  mobileSearchOpen.value = !mobileSearchOpen.value
  if (mobileSearchOpen.value) {
    nextTick(() => searchInput.value?.focus())
  }
}

// 侧边栏整体折叠状态（默认展开，按 F-07 侧栏分组任务流保持展开）
const SIDEBAR_COLLAPSED_KEY = 'ow_sidebar_collapsed'
const GROUP_OPEN_KEY = 'ow_sidebar_group_open'
const sidebarCollapsed = ref(loadCollapsed())
const groupOpen = ref<Record<string, boolean>>(loadGroupOpen())

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function loadGroupOpen(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(GROUP_OPEN_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function isGroupOpen(label: string): boolean {
  // 默认展开；只要用户显式记为 false 才折叠；其他都视为展开
  return groupOpen.value[label] !== false
}

function toggleSidebar(): void {
  sidebarCollapsed.value = !sidebarCollapsed.value
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed.value ? '1' : '0')
  } catch {
    /* noop */
  }
}

function toggleGroup(label: string): void {
  groupOpen.value = { ...groupOpen.value, [label]: !isGroupOpen(label) }
  try {
    localStorage.setItem(GROUP_OPEN_KEY, JSON.stringify(groupOpen.value))
  } catch {
    /* noop */
  }
}

const navGroups = [
  {
    label: '工作台',
    items: [
      { label: '今日工作台', to: '/workbench', icon: LayoutDashboard },
      { label: '日程与提醒', to: '/schedule', icon: CalendarDays },
      { label: '周期复盘', to: '/reflection', icon: CalendarRange },
    ],
  },
  {
    label: '市场感知',
    items: [
      { label: '面试记录', to: '/interviews', icon: NotebookPen },
      { label: '面试官', to: '/interviewers', icon: UsersRound },
      { label: '报告中心', to: '/reports', icon: FileBarChart },
      { label: '简历工作台', to: '/resume', icon: FileText },
      { label: '求职进度', to: '/applications', icon: CalendarDays },
    ],
  },
  {
    label: '工作沉淀',
    items: [
      { label: '工作记录', to: '/work-sedimentation', icon: Layers },
    ],
  },
  {
    label: '学习更新',
    items: [
      { label: '学习目标', to: '/learning-update', icon: Sparkles },
      { label: '错题本', to: '/practice/wrong-answers', icon: Target },
      { label: '复习计划', to: '/study-plan', icon: NotebookPen },
      { label: '技能图谱', to: '/skill-map', icon: Network },
    ],
  },
  {
    label: '资料库',
    items: [
      { label: '知识总览', to: '/knowledge', icon: BookOpen },
      { label: '求职档案', to: '/profile/job', icon: UserRound },
      { label: '项目资料', to: '/projects', icon: FolderKanban },
      { label: '知识库问答', to: '/knowledge/ask', icon: BookOpen },
    ],
  },
  {
    label: '系统',
    items: [
      { label: '通知中心', to: '/notifications', icon: Bell },
      { label: 'AI 连接', to: '/settings/ai-connections', icon: Bot },
      { label: '用量与费用', to: '/usage', icon: Activity },
      { label: '帮助与引导', to: '/help', icon: HelpCircle },
      { label: '设置', to: '/settings', icon: Settings },
    ],
  },
]

/** 命令面板可跳转页面 = 侧栏导航全集，与 navGroups 单一来源保持一致 */
const palettePages = navGroups.flatMap((group) =>
  group.items.map((item) => ({ label: item.label, to: item.to, section: group.label })),
)

const unreadCount = ref(0)

async function refreshUnreadCount(): Promise<void> {
  if (!auth.user) {
    unreadCount.value = 0
    return
  }
  try {
    unreadCount.value = await getUnreadCount()
  } catch {
    unreadCount.value = 0
  }
}

onMounted(refreshUnreadCount)
watch(() => route.path, () => {
  refreshUnreadCount()
  mobileSearchOpen.value = false
})

const avatarText = computed(() => auth.user?.username.slice(0, 2).toUpperCase() || '工程师')
const authName = computed(() => auth.user?.username || '工程师')
const isDarkTheme = computed(() => ui.theme === 'dark')

const searchIcons: Record<SearchDomainIcon, typeof FolderKanban> = {
  'folder-kanban': FolderKanban,
  'book-open': BookOpen,
  'notebook-pen': NotebookPen,
  'file-bar-chart': FileBarChart,
  'briefcase-business': BriefcaseBusiness,
  'badge-check': BadgeCheck,
  'users-round': UsersRound,
  'clipboard-check': ClipboardCheck,
}

function searchGroupMeta(type: SearchDomain) {
  return SEARCH_DOMAIN_META[type]
}

function searchIcon(type: SearchDomain) {
  return searchIcons[searchGroupMeta(type).icon]
}

const BrandBlock = defineComponent({
  setup() {
    return () =>
      h(RouterLink, { to: '/workbench', class: 'brand-block' }, () => [
        h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, [
          h(
            'svg',
            { viewBox: '0 0 32 32', width: 26, height: 26 },
            [
              h('rect', { x: 3, y: 3, width: 26, height: 26, rx: 7, fill: '#3a6fd0', stroke: '#fff', 'stroke-width': 1.5 }),
              h('path', { d: 'M16 6c-3 3-3 6 0 9 3-3 3-6 0-9z', fill: '#eaa11f', stroke: '#fff', 'stroke-width': 1.5 }),
              h('path', { d: 'M16 15v11M11 21l5 5 5-5', stroke: '#fff', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }),
            ],
          ),
        ]),
        h('span', { class: 'brand-copy' }, [
        h('strong', 'Orbit 工作台'),
        h('small', '本地版'),
        ]),
      ])
  },
})

const paletteRef = ref<InstanceType<typeof CommandPalette> | null>(null)
function focusPalette(): void {
  paletteRef.value?.show()
}

function openSearchPanel(): void {
  searchPanelOpen.value = true
}

function hideSearchPanel(): void {
  searchPanelOpen.value = false
  mobileSearchOpen.value = false
}

function onSearchInput(): void {
  searchRequestId += 1
  searchError.value = ''
  if (searchTimer) clearTimeout(searchTimer)
  const query = searchKeyword.value.trim()
  if (query.length < 2) {
    searchResult.value = null
    searchLoading.value = false
    return
  }
  searchLoading.value = true
  const requestId = searchRequestId
  searchTimer = setTimeout(() => {
    void runSearch(query, requestId)
  }, 300)
}

async function runSearch(query: string, requestId = ++searchRequestId): Promise<void> {
  searchLoading.value = true
  try {
    const result = await searchAll(query)
    if (requestId !== searchRequestId) return
    searchResult.value = result
    searchError.value = ''
  } catch (error) {
    if (requestId !== searchRequestId) return
    searchResult.value = null
    searchError.value = problemMessage(error)
  } finally {
    if (requestId === searchRequestId) searchLoading.value = false
  }
}

function firstHit(): SearchHit | null {
  if (searchResult.value?.query !== searchKeyword.value.trim()) return null
  for (const group of searchResult.value?.groups ?? []) {
    const hit = group.items[0]
    if (hit) return hit
  }
  return null
}

function goToHit(hit: SearchHit): void {
  searchPanelOpen.value = false
  void router.push(hit.route)
}

function onSearchEnter(): void {
  const query = searchKeyword.value.trim()
  if (searchResult.value?.query !== query) {
    if (query.length >= 2) void runSearch(query)
    return
  }
  const hit = firstHit()
  if (hit) {
    goToHit(hit)
    return
  }
  if (query.length >= 2) void runSearch(query)
}

function problemMessage(error: unknown): string {
  const problem = getProblem(error)
  return problem.detail || problem.title || '搜索失败，请稍后重试'
}

async function handleLogout(): Promise<void> {
  await auth.logout().catch(() => undefined)
  await router.replace('/login')
}
</script>

<style scoped>
.app-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: var(--ow-sidebar-width) minmax(0, 1fr);
  min-height: 100vh;
}

.sidebar {
  position: sticky;
  top: 0;
  display: flex;
  height: 100vh;
  flex-direction: column;
  padding: 0 8px 14px;
  overflow-y: auto;
  overflow-x: hidden;
  color: #ffffff;
  /* 22 号诊断「渐变不作为全页面武器」收口：侧栏原本是 224×900 的三色纵向渐变，
     每页必有且纯粹是装饰性背景墙。改用设计系统早已预留的 --ow-sidebar 纯色 token，
     纵向层次交由下方 box-shadow 承担。
     功能性渐变（评分环 .score-ring / 焦点条 .focus-bar）与按钮品牌渐变不在此列，保留。 */
  background: var(--ow-sidebar);
  box-shadow: 4px 0 30px rgb(10 40 30 / 28%);
  transition: padding 200ms ease;
}

.sidebar-top {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
  margin: 0 4px;
  border-bottom: 1px solid var(--nav-line);
  position: relative;
  z-index: 1;
}

.sidebar-top :deep(.brand-block) {
  flex: 1;
  min-width: 0;
  min-height: 60px;
  padding: 14px 2px 12px;
  margin: 0;
  border-bottom: 0;
}

.sidebar-toggle {
  display: grid;
  width: 32px;
  height: 32px;
  margin-left: auto;
  place-items: center;
  color: rgb(255 255 255 / 70%);
  background: rgb(255 255 255 / 5%);
  border: 1px solid rgb(255 255 255 / 8%);
  border-radius: 12px;
  cursor: pointer;
  flex: none;
  transition: color 140ms ease, background 140ms ease, transform 140ms ease;
}

.sidebar-toggle svg {
  width: 16px;
  height: 16px;
}

.sidebar-toggle:hover {
  color: #fff;
  background: rgb(255 255 255 / 14%);
  transform: translateX(0);
}

.sidebar::after {
  position: absolute;
  inset: 0 0 auto 0;
  height: 150px;
  pointer-events: none;
  content: '';
  background: linear-gradient(180deg, rgb(255 255 255 / 6%), transparent);
}

.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-thumb {
  background: rgb(255 255 255 / 16%);
  border-radius: 12px;
  border: 1px solid transparent;
  background-clip: content-box;
}

:deep(.brand-block) {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 72px;
  padding: 17px 6px 14px;
  margin: 0 6px;
  border-bottom: 1px solid var(--nav-line);
  position: relative;
  z-index: 1;
}

:deep(.brand-mark) {
  display: grid;
  width: 40px;
  height: 40px;
  flex: none;
  place-items: center;
  filter: drop-shadow(0 3px 7px rgb(0 0 0 / 40%));
}

:deep(.brand-copy) {
  display: grid;
  min-width: 0;
  gap: 1px;
}

:deep(.brand-copy strong) {
  color: #fff;
  font-size: var(--fs-md);
  font-weight: 800;
  letter-spacing: 0.3px;
  line-height: 1.2;
}

:deep(.brand-copy small) {
  color: rgb(255 255 255 / 92%);
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: 2.5px;
}

.nav-list {
  display: grid;
  gap: 12px;
  padding: 14px 0 10px;
  position: relative;
  z-index: 1;
  flex: 1;
}

.nav-group {
  display: grid;
  gap: 4px;
}

.nav-group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px 6px 9px;
  color: rgb(255 255 255 / 95%);
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 2px;
  background: transparent;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: color 140ms ease, background 140ms ease;
}

.nav-group-title:hover {
  color: rgb(255 255 255 / 85%);
  background: rgb(255 255 255 / 4%);
}

.nav-group-bar {
  display: inline-block;
  width: 3px;
  height: 11px;
  border-radius: 3px;
  background: var(--gold);
  flex: none;
}

.nav-group-label {
  flex: 1;
  min-width: 0;
}

.nav-group-chevron {
  width: 12px;
  height: 12px;
  flex: none;
  opacity: 0.6;
  transition: transform 180ms ease;
}

.nav-group.is-collapsed .nav-group-chevron {
  transform: rotate(-90deg);
}

.nav-group-items {
  display: grid;
  gap: 3px;
  overflow: hidden;
  transition: max-height 220ms ease, opacity 180ms ease;
}

.nav-group.is-collapsed .nav-group-items {
  max-height: 0;
  opacity: 0;
  pointer-events: none;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 40px;
  padding: 10px 12px;
  color: #ffffff;
  border-radius: 12px;
  font-size: var(--fs-sm);
  font-weight: 600;
  letter-spacing: 0.2px;
  transition:
    color 160ms ease-out,
    background-color 160ms ease-out;
}

.nav-item svg {
  width: 19px;
  height: 19px;
  flex: none;
  opacity: 0.85;
  transition: opacity 180ms ease;
}

.nav-item:hover {
  color: #fff;
  background: rgb(255 255 255 / 7%);
}

.nav-item:hover svg {
  opacity: 1;
}

.nav-item.router-link-active {
  color: #fff;
  background: linear-gradient(90deg, rgb(255 255 255 / 20%), rgb(255 255 255 / 4%));
  box-shadow: inset 3px 0 0 var(--gold);
}

.nav-item.router-link-active svg {
  opacity: 1;
}

.sidebar-footer {
  position: relative;
  z-index: 1;
  margin-top: auto;
  padding: 5px 6px 0;
}

.user-summary {
  display: grid;
  gap: 10px;
  padding: 13px;
  background: rgb(255 255 255 / 7%);
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 12px;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 8%),
    0 8px 22px rgb(0 0 0 / 20%);
}

.user-summary-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 侧边栏整体折叠（仅图标） */
.app-shell.sidebar-collapsed {
  --ow-sidebar-width: 82px;
}

.app-shell.sidebar-collapsed .sidebar {
  padding: 0 6px 12px;
}

.app-shell.sidebar-collapsed .sidebar-top :deep(.brand-block) {
  justify-content: center;
  padding: 12px 0 10px;
  min-height: 56px;
}

.app-shell.sidebar-collapsed .sidebar-top :deep(.brand-mark) {
  width: 32px;
  height: 32px;
}

.app-shell.sidebar-collapsed .sidebar-top :deep(.brand-mark svg) {
  width: 21px;
  height: 21px;
}

.app-shell.sidebar-collapsed .sidebar-top :deep(.brand-copy) {
  display: none;
}

.app-shell.sidebar-collapsed .sidebar-toggle {
  margin: 0 auto;
}

.app-shell.sidebar-collapsed .nav-group-title {
  justify-content: center;
  padding: 6px 4px;
}

.app-shell.sidebar-collapsed .nav-group-label,
.app-shell.sidebar-collapsed .nav-group-chevron {
  display: none;
}

/* 折叠态下保留分组指示条，避免分组标题变成空的不可见行 */
.app-shell.sidebar-collapsed .nav-group-bar {
  margin: 2px auto;
}

.app-shell.sidebar-collapsed .nav-item {
  justify-content: center;
  padding: 10px 6px;
}

.app-shell.sidebar-collapsed .nav-item-text {
  display: none;
}

/* 折叠态的选中指示复用基础规则的金色左侧内衬，不再叠加描边环与大阴影 */

.app-shell.sidebar-collapsed .sidebar-footer {
  padding: 5px 2px 0;
}

.app-shell.sidebar-collapsed .user-summary {
  padding: 8px 6px;
}

.app-shell.sidebar-collapsed .user-summary-name {
  display: none;
}

.app-shell.sidebar-collapsed .user-summary-top {
  justify-content: center;
}

.user-avatar {
  display: grid;
  width: 36px;
  height: 36px;
  flex: none;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--av-1), var(--av-2));
  border-radius: 12px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 32%);
}

.user-avatar svg {
  width: 18px;
  height: 18px;
}

.user-summary-name {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 4px;
}

.user-summary-name strong {
  overflow: hidden;
  color: #fff;
  font-size: var(--fs-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-summary-name small {
  color: #ffffff;
  font-size: var(--fs-xs);
}

/* 本地账户样式已简化：移除等级进度条与金币装饰（F-07） */

.shell-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: var(--ow-z-sticky);
  display: flex;
  min-height: var(--ow-topbar-height);
  align-items: center;
  gap: 14px;
  padding: 13px 30px;
  /* 顶栏纯色实底（26 号规范）：文字落在可测量的背景上，玻璃与彩色投影材质撤下。 */
  background: var(--topbar-1);
  border-bottom: 1px solid var(--topbar-border);
}

.topbar::after {
  position: absolute;
  inset: auto 0 0 0;
  height: 1px;
  pointer-events: none;
  content: '';
  background: linear-gradient(90deg, transparent, var(--brand), transparent);
  opacity: 0.16;
}

.topbar-context {
  display: flex;
  align-items: center;
  min-width: 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  font-size: var(--fs-sm);
  font-weight: 700;
}

.crumb-root {
  color: var(--muted);
  white-space: nowrap;
}

.crumb-section {
  color: var(--muted);
  font-weight: 600;
  white-space: nowrap;
}

.crumb-sep {
  color: var(--muted);
  white-space: nowrap;
}

.breadcrumb strong {
  overflow: hidden;
  color: var(--ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search {
  position: relative;
  flex: 1;
  max-width: 460px;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 12px;
  width: 16px;
  height: 16px;
  color: var(--muted);
  transform: translateY(-50%);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 9px 12px 9px 38px;
  color: var(--ink);
  background: var(--surface);
  border: 1.5px solid var(--line-2);
  border-radius: 12px;
  font-family: inherit;
  font-size: var(--fs-sm);
  transition: border-color 0.14s, box-shadow 0.14s;
}

.search-input::placeholder {
  color: var(--faint);
}

.search-input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-50);
}

.recents {
  position: absolute;
  inset: calc(100% + 6px) 0 auto 0;
  z-index: 40;
  padding: 6px;
  background: var(--recents);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  box-shadow: var(--shadow-md);
}

.recents-title {
  padding: 6px 12px;
  color: var(--faint);
  font-size: var(--fs-xs);
  font-weight: 700;
}

.rec {
  display: block;
  width: 100%;
  padding: 8px 12px;
  overflow: hidden;
  color: var(--ink-2);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: transparent;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  font-size: var(--fs-sm);
}

.rec:hover {
  color: var(--brand-700);
  background: var(--brand-50);
}

.search-results {
  max-height: min(60vh, 480px);
  overflow-y: auto;
}

.kbd-hint {
  position: absolute;
  top: 50%;
  right: 10px;
  display: none;
  padding: 2px 6px;
  color: var(--muted);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 6px;
  transform: translateY(-50%);
  cursor: pointer;
  font-family: inherit;
}

.kbd-hint kbd {
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
}

@media (min-width: 1100px) {
  .kbd-hint {
    display: block;
  }

  .search-input {
    padding-right: 64px;
  }
}

.search-group + .search-group {
  margin-top: 4px;
  border-top: 1px solid var(--glass-border);
  padding-top: 2px;
}

.search-group-title {
  display: flex;
  align-items: center;
  gap: 7px;
}

.search-group-icon {
  display: inline-grid;
  width: 22px;
  height: 22px;
  flex: none;
  place-items: center;
  color: var(--muted);
  background: var(--glass);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
}

.search-group-icon svg {
  width: 13px;
  height: 13px;
}

.search-tone-brand {
  color: var(--brand);
}

.search-tone-purple {
  color: var(--purple);
}

.search-tone-green {
  color: var(--green);
}

.search-tone-orange {
  color: var(--orange);
}

.search-tone-gold {
  color: var(--gold);
}

.search-hit {
  display: block;
  white-space: normal;
}

.hit-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.hit-title {
  overflow: hidden;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.hit-sub {
  flex-shrink: 0;
  color: var(--faint);
  font-size: var(--fs-xs);
}

.hit-snippet {
  display: -webkit-box;
  margin-top: 2px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--muted);
  font-size: var(--fs-xs);
  line-height: 1.5;
}

.spacer {
  flex: 1;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-toggle {
  display: none;
  width: 42px;
  height: 42px;
  place-items: center;
  color: var(--ink-2);
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: 12px;
  cursor: pointer;
  transition: 0.15s;
}

.search-toggle svg {
  width: 20px;
  height: 20px;
}

.search-toggle:hover {
  border-color: var(--brand);
}

.bell,
.focus-entry {
  position: relative;
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  color: var(--ink-2);
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: 12px;
  cursor: pointer;
  transition: 0.15s;
}

.bell svg,
.focus-entry svg {
  width: 20px;
  height: 20px;
}

.bell:hover,
.focus-entry:hover {
  color: var(--brand-700);
  background: var(--brand-50);
  border-color: var(--brand);
}

.bell-dot {
  position: absolute;
  top: -5px;
  right: -5px;
  display: flex;
  min-width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  color: #fff;
  background: var(--red);
  border-radius: 12px;
  box-shadow: 0 0 0 2px var(--surface);
  font-size: var(--fs-xs);
  font-weight: 800;
}

.theme-toggle {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  color: var(--ink-2);
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: 12px;
  cursor: pointer;
  font-size: var(--fs-md);
  transition: 0.15s;
}

.theme-toggle svg {
  width: 18px;
  height: 18px;
}

.theme-toggle:hover {
  border-color: var(--brand);
  background: var(--surface-2);
}

.user-menu {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 38px;
  padding: 4px 7px 4px 4px;
  color: var(--ow-ink-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--ow-radius-sm);
  cursor: pointer;
}

.user-menu:hover {
  background: var(--ow-surface-hover);
  border-color: var(--ow-line-soft);
}

.user-menu > svg {
  width: 14px;
  height: 14px;
}

.avatar {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--av-1), var(--av-2));
  border-radius: 12px;
  font-size: var(--fs-xs);
  font-weight: 800;
  box-shadow: 0 4px 12px rgb(31 158 116 / 40%);
}

.content {
  flex: 1;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 26px 34px 52px;
}

.page-host {
  min-width: 0;
}

.mobile-menu {
  display: none;
}

@media (max-width: 900px) {
  .app-shell {
    display: block;
  }

  .sidebar {
    display: none;
  }

  .mobile-menu {
    display: inline-flex;
    margin-left: -10px;
  }

  .topbar {
    padding: 10px 18px;
  }

  .search-toggle {
    display: grid;
  }

  /* 触屏命中区与可读性：窄屏下顶栏图标按钮统一到 44×44，
     输入类控件字号提到 16px（低于 16px 时 iOS Safari 会自动放大整页）。 */
  .search-toggle,
  .bell,
  .focus-entry,
  .theme-toggle,
  .mobile-menu {
    width: 44px;
    height: 44px;
  }

  .search-input,
  :deep(.el-input__inner),
  :deep(.el-textarea__inner) {
    font-size: var(--fs-md);
  }


  .search {
    display: none;
  }

  .app-shell.search-open .search {
    display: block;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-width: none;
    padding: 10px 14px;
    background: var(--topbar-1);
    border-bottom: 1px solid var(--topbar-border);
    box-shadow: 0 10px 24px rgb(22 82 60 / 10%);
    z-index: 41;
  }

  .app-shell.search-open .search .search-input {
    max-width: none;
  }

  .content {
    padding: 18px;
  }

  :deep(.mobile-drawer .el-drawer__body) {
    padding: 16px 12px;
  }
}

@media (max-width: 560px) {
  .user-name {
    display: none;
  }

  .topbar {
    padding: 10px 12px;
  }

  .content {
    padding: 18px 14px 26px;
  }
}
</style>
