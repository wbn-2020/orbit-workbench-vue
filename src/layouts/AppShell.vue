<template>
  <div class="app-shell">
    <aside class="sidebar">
      <BrandBlock />
      <nav class="nav-list" aria-label="主导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-item"
        >
          <component :is="item.icon" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="sidebar-footer">
        <div class="local-note">
          <HardDrive aria-hidden="true" />
          <span>本地工作区</span>
        </div>
      </div>
    </aside>

    <el-drawer
      v-model="mobileNavOpen"
      direction="ltr"
      size="min(286px, 84vw)"
      :with-header="false"
      class="mobile-drawer"
    >
      <BrandBlock />
      <nav class="nav-list" aria-label="移动端主导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          @click="mobileNavOpen = false"
        >
          <component :is="item.icon" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </RouterLink>
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
          <span>{{ route.meta.title }}</span>
        </div>
        <div class="topbar-actions">
          <form class="global-search" role="search" @submit.prevent="openSearch">
            <button class="global-search-submit" type="submit" aria-label="打开统一搜索">
              <Search aria-hidden="true" />
            </button>
            <input
              v-model="searchQuery"
              type="search"
              minlength="2"
              maxlength="100"
              placeholder="搜索任务、数据集、资料或成果"
              aria-label="全局搜索"
            />
          </form>
          <RouterLink to="/tasks" class="run-indicator">
            <Activity aria-hidden="true" />
            <span v-if="runtime.runningCount">{{ runtime.runningCount }} 个任务运行中</span>
            <span v-else>无运行中任务</span>
          </RouterLink>
          <el-dropdown trigger="click">
            <button class="user-menu" type="button">
              <span class="avatar">{{ avatarText }}</span>
              <span class="user-name">{{ auth.user?.username }}</span>
              <ChevronDown aria-hidden="true" />
            </button>
            <template #dropdown>
              <el-dropdown-menu>
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
        <RouterView :key="route.fullPath" />
      </main>
    </div>

    <ChangePasswordDialog v-model="passwordDialogOpen" />
  </div>
</template>

<script setup lang="ts">
import {
  Activity,
  Archive,
  BarChart3,
  Brain,
  Bot,
  ChevronDown,
  Database,
  FileText,
  GitBranch,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  PenLine,
  LogOut,
  Menu,
  PlugZap,
  Search,
  Sparkles,
  Wrench,
} from 'lucide-vue-next'
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

import ChangePasswordDialog from '@/components/ChangePasswordDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useRuntimeStore } from '@/stores/runtime'
import { useSearchStore } from '@/stores/search'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const runtime = useRuntimeStore()
const search = useSearchStore()

const mobileNavOpen = ref(false)
const passwordDialogOpen = ref(false)
const searchQuery = ref('')
let runtimeTimer: number | undefined

const navItems = [
  { label: '工作台', to: '/workbench', icon: LayoutDashboard },
  { label: '任务', to: '/tasks', icon: ListChecks },
  { label: '数据集', to: '/datasets', icon: Database },
  { label: '内容创作', to: '/content', icon: PenLine },
  { label: '资料', to: '/documents', icon: FileText },
  { label: '成果', to: '/artifacts', icon: Archive },
  { label: 'Workflow', to: '/workflows', icon: GitBranch },
  { label: 'Tools', to: '/tools', icon: Wrench },
  { label: 'Skills', to: '/skills', icon: Sparkles },
  { label: 'MCP Servers', to: '/mcp/servers', icon: PlugZap },
  { label: '长期记忆', to: '/memories', icon: Brain },
  { label: '模型统计', to: '/statistics/model-usage', icon: BarChart3 },
  { label: 'AI 连接', to: '/settings/ai-connections', icon: Bot },
]

const avatarText = computed(() => auth.user?.username.slice(0, 2).toUpperCase() || 'OW')

const BrandBlock = defineComponent({
  setup() {
    return () =>
      h(RouterLink, { to: '/workbench', class: 'brand-block' }, () => [
        h('span', { class: 'brand-mark' }, 'O'),
        h('span', { class: 'brand-copy' }, [
          h('strong', 'Orbit Workbench'),
          h('small', '个人 AI 工作台'),
        ]),
      ])
  },
})

async function handleLogout(): Promise<void> {
  await auth.logout().catch(() => undefined)
  await router.replace('/login')
}

function openSearch(): void {
  const normalized = searchQuery.value.trim()
  search.query = normalized
  void router.push({
    path: '/search',
    query: normalized.length >= 2 ? { q: normalized } : undefined,
  })
}

onMounted(() => {
  runtime.refresh().catch(() => undefined)
  runtimeTimer = window.setInterval(
    () => runtime.refresh(true).catch(() => undefined),
    30_000,
  )
})

onBeforeUnmount(() => {
  if (runtimeTimer) window.clearInterval(runtimeTimer)
})
</script>

<style scoped>
.app-shell {
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
  padding: 18px 12px;
  background: var(--ow-sidebar);
  border-right: 1px solid var(--ow-line-soft);
}

:deep(.brand-block) {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 8px 18px;
}

:deep(.brand-mark) {
  display: grid;
  width: 30px;
  height: 30px;
  flex: none;
  place-items: center;
  color: var(--ow-primary-ink);
  background: var(--ow-primary);
  border-radius: 7px;
  font-weight: 800;
}

:deep(.brand-copy) {
  display: grid;
}

:deep(.brand-copy strong) {
  font-size: 14px;
}

:deep(.brand-copy small) {
  color: var(--ow-muted);
  font-size: 11px;
}

.nav-list {
  display: grid;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 11px;
  color: var(--ow-ink-secondary);
  border: 1px solid transparent;
  border-radius: var(--ow-radius-sm);
  transition:
    color 180ms ease-out,
    background-color 180ms ease-out,
    border-color 180ms ease-out;
}

.nav-item svg {
  width: 17px;
  height: 17px;
  flex: none;
  color: var(--ow-muted);
  stroke-width: 1.8;
}

.nav-item:hover {
  color: var(--ow-ink);
  background: var(--ow-surface);
}

.nav-item.router-link-active {
  color: var(--ow-ink);
  background: var(--ow-primary-soft);
  border-color: oklch(0.4 0.08 140);
}

.nav-item.router-link-active svg {
  color: var(--ow-primary-strong);
}

.sidebar-footer {
  margin-top: auto;
  padding: 12px 8px 2px;
  border-top: 1px solid var(--ow-line-soft);
}

.local-note {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ow-muted);
  font-size: 12px;
}

.local-note svg {
  width: 15px;
  height: 15px;
}

.shell-main {
  min-width: 0;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: var(--ow-z-sticky);
  display: flex;
  min-height: var(--ow-topbar-height);
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 28px;
  background: oklch(0.115 0 0 / 0.94);
  border-bottom: 1px solid var(--ow-line-soft);
  backdrop-filter: blur(10px);
}

.topbar-context {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ow-ink-secondary);
  font-weight: 650;
}

.topbar-actions,
.run-indicator,
.user-menu {
  display: flex;
  align-items: center;
}

.topbar-actions {
  gap: 12px;
}

.global-search {
  display: flex;
  width: min(340px, 34vw);
  height: 36px;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  background: var(--ow-surface);
  border: 1px solid var(--ow-line-soft);
  border-radius: var(--ow-radius-sm);
}

.global-search:focus-within {
  border-color: var(--ow-primary);
}

.global-search-submit {
  display: grid;
  width: 18px;
  height: 28px;
  flex: none;
  padding: 0;
  place-items: center;
  color: var(--ow-muted);
  background: transparent;
  border: 0;
  cursor: pointer;
}

.global-search-submit svg {
  width: 15px;
  height: 15px;
}

.global-search input {
  width: 100%;
  min-width: 0;
  color: var(--ow-ink-secondary);
  background: transparent;
  border: 0;
  outline: 0;
}

.global-search input::placeholder {
  color: var(--ow-muted);
}

.run-indicator {
  gap: 7px;
  color: var(--ow-muted);
  font-size: 12px;
}

.run-indicator:hover {
  color: var(--ow-primary-strong);
}

.run-indicator svg {
  width: 15px;
  height: 15px;
}

.user-menu {
  gap: 8px;
  min-height: 38px;
  padding: 4px 7px 4px 4px;
  color: var(--ow-ink-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--ow-radius-sm);
  cursor: pointer;
}

.user-menu:hover {
  background: var(--ow-surface);
  border-color: var(--ow-line-soft);
}

.user-menu > svg {
  width: 14px;
  height: 14px;
}

.avatar {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  color: var(--ow-primary-ink);
  background: var(--ow-accent);
  border-radius: 50%;
  font-size: 10px;
  font-weight: 800;
}

.content {
  min-height: calc(100vh - var(--ow-topbar-height));
  padding: 28px;
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
    padding: 0 18px;
  }

  .content {
    padding: 22px 18px;
  }

  .global-search {
    width: min(300px, 42vw);
  }

  :deep(.mobile-drawer .el-drawer__body) {
    padding: 18px 12px;
  }
}

@media (max-width: 560px) {
  .global-search {
    width: 38px;
    padding: 0 11px;
  }

  .global-search input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  .run-indicator span,
  .user-name {
    display: none;
  }

  .topbar {
    padding: 0 12px;
  }

  .content {
    padding: 20px 14px;
  }
}
</style>
