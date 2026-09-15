import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('./http', () => ({
  http: { get, post },
}))

import { listFocusSessions, saveFocusSession, transformFocusSession } from './focus'
import {
  addGoalTask,
  createLearningGoal,
  listFocusStats,
  listLearningGoals,
  transformLearningGoal,
} from './learning'
import {
  createWorkLog,
  distillWorkLog,
  listKnowledgeCards,
  listWorkLogs,
  transformKnowledgeCard,
  transformWorkLog,
} from './worklogs'
import { getWorkbenchSummary } from './workbench'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('v2 domain transforms', () => {
  it('maps backend uppercase enums to the lowercase UI contract', () => {
    expect(
      transformFocusSession({
        id: '1',
        startedAt: '2026-09-07T01:00:00.000Z',
        durationMinutes: 25,
        mode: 'FOCUS',
      }),
    ).toMatchObject({ mode: 'focus' })

    expect(
      transformLearningGoal({
        id: '2',
        title: '学习测试',
        reason: '原因',
        status: 'PAUSED',
        progress: 50,
        linkedSkill: null,
      }),
    ).toMatchObject({ status: 'paused', linkedSkill: undefined })

    expect(
      transformWorkLog({
        id: '3',
        title: '故障记录',
        content: '内容',
        category: 'INCIDENT',
        createdAt: '2026-09-07T01:00:00.000Z',
        distilled: false,
      }),
    ).toMatchObject({ category: 'incident' })
  })

  it('preserves a nullable knowledge-card source log id', () => {
    expect(
      transformKnowledgeCard({
        id: '4',
        title: '独立卡片',
        summary: '摘要',
        sourceLogId: null,
        tags: ['architecture'],
        createdAt: '2026-09-07T01:00:00.000Z',
      }),
    ).toMatchObject({ sourceLogId: null })
  })
})

describe('v2 domain APIs', () => {
  it('uses the focus-session endpoints and transforms responses', async () => {
    const input = {
      startedAt: '2026-09-07T01:00:00.000Z',
      durationMinutes: 25,
      mode: 'focus' as const,
    }
    post.mockResolvedValueOnce({ data: { id: '1', ...input, mode: 'FOCUS' } })
    get.mockResolvedValueOnce({ data: [{ id: '2', ...input, mode: 'BREAK' }] })

    await expect(saveFocusSession(input)).resolves.toMatchObject({ mode: 'focus' })
    await expect(listFocusSessions()).resolves.toEqual([
      { id: '2', ...input, mode: 'break' },
    ])
    expect(post).toHaveBeenCalledWith('/focus-sessions', input)
    expect(get).toHaveBeenCalledWith('/focus-sessions')
  })

  it('uses learning-goal and focus-stat endpoints', async () => {
    const input = { title: '学习测试', reason: '原因', linkedSkill: 'Vitest' }
    const goal = { id: '1', ...input, status: 'ACTIVE' as const, progress: 0 }
    const stats = [{ date: '2026-09-07', focusMinutes: 25, sessions: 1 }]
    get.mockResolvedValueOnce({ data: [goal] }).mockResolvedValueOnce({ data: stats })
    post.mockResolvedValueOnce({ data: goal })

    // V58：transform 把拆解统计归一为 0/false（后端 non_null 契约下缺键兜底）
    await expect(listLearningGoals()).resolves.toEqual([{
      ...goal, status: 'active', taskCount: 0, completedTaskCount: 0, progressDerived: false,
    }])
    await expect(createLearningGoal(input)).resolves.toEqual({
      ...goal, status: 'active', taskCount: 0, completedTaskCount: 0, progressDerived: false,
    })
    await expect(listFocusStats(14)).resolves.toBe(stats)
    expect(get).toHaveBeenNthCalledWith(1, '/learning-goals')
    expect(post).toHaveBeenCalledWith('/learning-goals', input)
    expect(get).toHaveBeenNthCalledWith(2, '/focus-stats', { params: { days: 14 } })

    // V58：拆一步任务——POST /learning-goals/{id}/tasks，透传 created
    post.mockResolvedValueOnce({ data: { created: 1 } })
    await expect(addGoalTask('1', '读两篇源码文章')).resolves.toEqual({ created: 1 })
    expect(post).toHaveBeenNthCalledWith(2, '/learning-goals/1/tasks', { title: '读两篇源码文章' })
  })

  it('uses work-log, knowledge-card, and workbench endpoints', async () => {
    const workLog = {
      id: '1',
      title: '记录',
      content: '内容',
      category: 'PROJECT' as const,
      createdAt: '2026-09-07T01:00:00.000Z',
      distilled: false,
    }
    const card = {
      id: '2',
      title: '卡片',
      summary: '摘要',
      sourceLogId: null,
      tags: ['PROJECT'],
      createdAt: '2026-09-07T01:00:00.000Z',
    }
    const summary = { greeting: '你好', modes: [], assets: [], agenda: [], focusTodayMinutes: 0 }
    get
      .mockResolvedValueOnce({ data: [workLog] })
      .mockResolvedValueOnce({ data: [card] })
      .mockResolvedValueOnce({ data: summary })
    post
      .mockResolvedValueOnce({ data: workLog })
      .mockResolvedValueOnce({ data: card })

    await expect(listWorkLogs()).resolves.toEqual([{ ...workLog, category: 'project' }])
    await expect(createWorkLog({ title: '记录', content: '内容', category: 'project' })).resolves.toEqual({
      ...workLog,
      category: 'project',
    })
    await expect(distillWorkLog('1')).resolves.toEqual(card)
    await expect(listKnowledgeCards()).resolves.toEqual([card])
    await expect(getWorkbenchSummary()).resolves.toBe(summary)
    expect(get).toHaveBeenNthCalledWith(1, '/work-logs')
    expect(post).toHaveBeenNthCalledWith(1, '/work-logs', {
      title: '记录',
      content: '内容',
      category: 'project',
    })
    expect(post).toHaveBeenNthCalledWith(2, '/work-logs/1/distill')
    expect(get).toHaveBeenNthCalledWith(2, '/knowledge-cards')
    expect(get).toHaveBeenNthCalledWith(3, '/workbench/summary')
  })
})
