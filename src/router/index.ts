import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    public?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/setup',
      name: 'setup',
      component: () => import('@/views/auth/SetupView.vue'),
      meta: { title: '首次初始化', public: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { title: '登录', public: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppShell.vue'),
      children: [
        { path: '', redirect: '/workbench' },
        {
          path: 'workbench',
          name: 'workbench',
          component: () => import('@/views/workbench/WorkbenchView.vue'),
          meta: { title: '工作台' },
        },
        {
          path: 'tasks',
          name: 'tasks',
          component: () => import('@/views/tasks/TaskListView.vue'),
          meta: { title: '任务' },
        },
        {
          path: 'tasks/new',
          name: 'task-new',
          component: () => import('@/views/tasks/TaskFormView.vue'),
          meta: { title: '新建技术学习任务' },
        },
        {
          path: 'tasks/:id/edit',
          name: 'task-edit',
          component: () => import('@/views/tasks/TaskFormView.vue'),
          meta: { title: '编辑技术学习任务' },
        },
        {
          path: 'tasks/:id',
          name: 'task-detail',
          component: () => import('@/views/tasks/TaskDetailView.vue'),
          meta: { title: '任务详情' },
        },
        {
          path: 'runs/:id',
          name: 'run-detail',
          component: () => import('@/views/runs/RunDetailView.vue'),
          meta: { title: '运行详情' },
        },
        {
          path: 'documents',
          name: 'documents',
          component: () => import('@/views/documents/DocumentsView.vue'),
          meta: { title: '资料中心' },
        },
        {
          path: 'artifacts',
          name: 'artifacts',
          component: () => import('@/views/artifacts/ArtifactListView.vue'),
          meta: { title: '成果中心' },
        },
        {
          path: 'artifacts/:id',
          name: 'artifact-detail',
          component: () => import('@/views/artifacts/ArtifactDetailView.vue'),
          meta: { title: '成果详情' },
        },
        {
          path: 'settings/ai-connections',
          name: 'ai-connections',
          component: () => import('@/views/settings/AiConnectionsView.vue'),
          meta: { title: 'AI 连接' },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/workbench' },
  ],
})

function loginRedirect(to: RouteLocationNormalized) {
  return {
    name: 'login',
    query: to.fullPath === '/workbench' ? undefined : { redirect: to.fullPath },
  }
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  let initialized: boolean
  try {
    initialized = await auth.ensureSetupStatus()
  } catch {
    if (to.name === 'login' || to.name === 'setup') return true
    return loginRedirect(to)
  }

  if (!initialized) {
    return to.name === 'setup' ? true : { name: 'setup' }
  }

  if (to.name === 'setup') {
    return { name: 'login' }
  }

  let user = auth.user
  try {
    user = await auth.ensureUser()
  } catch {
    user = null
  }

  if (to.meta.public) {
    if (to.name === 'login' && user) return { name: 'workbench' }
    return true
  }

  return user ? true : loginRedirect(to)
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Orbit Workbench` : 'Orbit Workbench'
})

export default router
