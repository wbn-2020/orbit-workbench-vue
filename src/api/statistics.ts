import { http } from './http'

import type { ModelUsageStatistics } from '@/types/api'

export async function getModelUsageStatistics(
  workspaceId: number,
  from: string,
  to: string,
): Promise<ModelUsageStatistics> {
  const { data } = await http.get<ModelUsageStatistics>('/statistics/model-usage', {
    params: { workspaceId, from, to },
  })
  return data
}
