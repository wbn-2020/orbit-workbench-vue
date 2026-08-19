import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { listTasks } from '@/api/tasks'

export const useRuntimeStore = defineStore('runtime', () => {
  const runningCount = ref(0)
  const refreshing = ref(false)
  const lastRefreshedAt = ref<number | null>(null)

  const hasRunningTasks = computed(() => runningCount.value > 0)

  async function refresh(force = false): Promise<void> {
    if (
      !force &&
      lastRefreshedAt.value &&
      Date.now() - lastRefreshedAt.value < 15_000
    ) {
      return
    }

    refreshing.value = true
    try {
      const result = await listTasks({ status: 'RUNNING', page: 1, size: 1 })
      runningCount.value = result.total
      lastRefreshedAt.value = Date.now()
    } finally {
      refreshing.value = false
    }
  }

  return { runningCount, refreshing, hasRunningTasks, refresh }
})
