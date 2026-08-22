import { defineStore } from 'pinia'
import { ref } from 'vue'

import { searchResources } from '@/api/search'
import { problemMessage } from '@/api/http'
import type { SearchResourceType, SearchResultItem } from '@/types/api'
import { createLatestRequestGuard } from '@/utils/latestRequest'

export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const workspaceId = ref<number>()
  const types = ref<SearchResourceType[]>([
    'TASK',
    'DATASET',
    'DOCUMENT',
    'ARTIFACT',
    'RUN',
  ])
  const results = ref<SearchResultItem[]>([])
  const loading = ref(false)
  const error = ref('')
  const request = createLatestRequestGuard()

  async function execute(): Promise<void> {
    const normalized = query.value.trim()
    if (normalized.length < 2) {
      request.invalidate()
      results.value = []
      error.value = ''
      loading.value = false
      return
    }
    if (!workspaceId.value) {
      request.invalidate()
      results.value = []
      error.value = '请选择工作区'
      loading.value = false
      return
    }
    if (types.value.length === 0) {
      request.invalidate()
      results.value = []
      error.value = ''
      loading.value = false
      return
    }

    const requestId = request.begin()
    loading.value = true
    error.value = ''
    try {
      const response = await searchResources(
        normalized,
        workspaceId.value,
        types.value,
      )
      if (request.isCurrent(requestId)) results.value = response
    } catch (searchError) {
      if (!request.isCurrent(requestId)) return
      error.value = problemMessage(searchError)
    } finally {
      if (request.isCurrent(requestId)) loading.value = false
    }
  }

  function reset(): void {
    request.invalidate()
    query.value = ''
    results.value = []
    error.value = ''
    loading.value = false
  }

  return {
    query,
    workspaceId,
    types,
    results,
    loading,
    error,
    execute,
    reset,
  }
})
