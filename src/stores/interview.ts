import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { IslandReport } from '@/mocks/island'
import type { ScriptTurn } from '@/mocks/interviewScript'

export interface CompletedSession {
  company: string
  mode: string
  elapsed: number
  turns: ScriptTurn[]
  report: IslandReport
}

/*
 面试副本的跨页状态：完成面试后把模拟报告交给 /interviews/:id/report 展示。
 仅前端演示数据，不代表真实面试会话。
*/
export const useInterviewStore = defineStore('interview', () => {
  const lastCompleted = ref<CompletedSession | null>(null)

  function complete(session: CompletedSession): void {
    lastCompleted.value = session
  }

  function reset(): void {
    lastCompleted.value = null
  }

  return { lastCompleted, complete, reset }
})
