import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    public?: boolean
    /** 所属侧栏区块（工作台 / 市场感知 / 工作沉淀 / 学习更新 / 资料库 / 系统） */
    section?: string
    /** 详情页的上级列表页名称与跳转路径，用于 区块 / 列表 / 详情 三级面包屑 */
    crumbParent?: string
    crumbParentTo?: string
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
          meta: { title: '今日工作台', section: '工作台' },
        },
        {
          path: 'work-sedimentation',
          name: 'work-sedimentation',
          component: () => import('@/views/work/WorkSedimentationView.vue'),
          meta: { title: '工作沉淀', section: '工作沉淀' },
        },
        {
          path: 'learning-update',
          name: 'learning-update',
          component: () => import('@/views/learn/LearningUpdateView.vue'),
          meta: { title: '学习更新', section: '学习更新' },
        },
        {
          path: 'schedule',
          name: 'schedule',
          component: () => import('@/views/schedule/ScheduleView.vue'),
          meta: { title: '日程与提醒', section: '工作台' },
        },
        {
          path: 'study-plan',
          name: 'study-plan',
          component: () => import('@/views/study/StudyPlanView.vue'),
          meta: { title: '复习计划', section: '学习更新' },
        },
        {
          path: 'interviews',
          name: 'interviews',
          component: () => import('@/views/interviews/InterviewLogsView.vue'),
          meta: { title: '面试记录', section: '市场感知' },
        },
        {
          path: 'interviews/new',
          name: 'interview-create',
          component: () => import('@/views/interviews/InterviewCreateView.vue'),
          meta: { title: '新建面试', section: '市场感知', crumbParent: '面试记录', crumbParentTo: '/interviews' },
        },
        {
          path: 'interviews/:id',
          name: 'interview-room',
          component: () => import('@/views/interviews/InterviewSessionView.vue'),
          meta: { title: '模拟面试', section: '市场感知', crumbParent: '面试记录', crumbParentTo: '/interviews' },
        },
        {
          path: 'interviews/:id/report',
          name: 'interview-report',
          component: () => import('@/views/interviews/InterviewReportView.vue'),
          meta: { title: '面试报告', section: '市场感知', crumbParent: '面试记录', crumbParentTo: '/interviews' },
        },
        {
          path: 'profile/job',
          name: 'job-profile',
          component: () => import('@/views/profile/JobProfileView.vue'),
          meta: { title: '求职档案', section: '资料库' },
        },
        {
          path: 'projects',
          name: 'projects',
          component: () => import('@/views/projects/ProjectsView.vue'),
          meta: { title: '项目资料', section: '资料库' },
        },
        {
          path: 'projects/:id',
          name: 'project-detail',
          component: () => import('@/views/projects/ProjectDetailView.vue'),
          meta: { title: '项目详情', section: '资料库', crumbParent: '项目资料', crumbParentTo: '/projects' },
        },
        {
          path: 'resume',
          name: 'resume',
          component: () => import('@/views/product/ResumeView.vue'),
          meta: { title: '简历工作台', section: '市场感知' },
        },
        {
          path: 'jobs',
          name: 'jobs',
          component: () => import('@/views/product/JdMatchView.vue'),
          meta: { title: '岗位与 JD 匹配', section: '市场感知' },
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/views/product/ReportsCenterView.vue'),
          meta: { title: '我的报告中心', section: '市场感知' },
        },
        {
          path: 'practice/wrong-answers',
          name: 'wrong-answers',
          component: () => import('@/views/product/WrongAnswersView.vue'),
          meta: { title: '错题本', section: '学习更新' },
        },
        {
          path: 'skill-map',
          name: 'skill-map',
          component: () => import('@/views/product/SkillMapView.vue'),
          meta: { title: '技能图谱', section: '学习更新' },
        },
        {
          path: 'applications',
          name: 'applications',
          component: () => import('@/views/product/ApplicationsView.vue'),
          meta: { title: '求职进度', section: '市场感知' },
        },
        {
          path: 'knowledge',
          name: 'knowledge-overview',
          component: () => import('@/views/product/KnowledgeOverviewView.vue'),
          meta: { title: '知识总览', section: '资料库' },
        },
        {
          path: 'knowledge/ask',
          name: 'knowledge-ask',
          component: () => import('@/views/product/KnowledgeAskView.vue'),
          meta: { title: '知识库问答', section: '资料库' },
        },
        {
          path: 'interviewers',
          name: 'interviewers',
          component: () => import('@/views/product/InterviewersView.vue'),
          meta: { title: '面试官', section: '市场感知' },
        },
        {
          path: 'notifications',
          name: 'notifications',
          component: () => import('@/views/product/NotificationsView.vue'),
          meta: { title: '通知中心', section: '系统' },
        },
        {
          path: 'help',
          name: 'help',
          component: () => import('@/views/product/HelpView.vue'),
          meta: { title: '帮助与引导', section: '系统' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/product/SettingsView.vue'),
          meta: { title: '设置', section: '系统' },
        },

        {
          path: 'settings/ai-connections',
          name: 'ai-connections',
          component: () => import('@/views/settings/AiConnectionsView.vue'),
          meta: { title: 'AI 连接', section: '系统', crumbParent: '设置', crumbParentTo: '/settings' },
        },

        {
          path: 'usage',
          name: 'usage',
          component: () => import('@/views/product/UsageView.vue'),
          meta: { title: '用量与费用', section: '系统' },
        },
        {
          path: 'reflection',
          name: 'reflection',
          component: () => import('@/views/product/ReflectionView.vue'),
          meta: { title: '周期复盘', section: '工作台' },
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
  document.title = to.meta.title ? `${to.meta.title} · 个人职业成长工作台` : '个人职业成长工作台'
})

export default router
