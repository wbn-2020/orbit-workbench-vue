import { http } from './http'

import type {
  SearchResourceType,
  SearchResponse,
  SearchResultItem,
} from '@/types/api'

export async function searchResources(
  query: string,
  workspaceId: number,
  types: SearchResourceType[] = ['TASK', 'DATASET', 'DOCUMENT', 'ARTIFACT', 'RUN'],
  limit = 10,
): Promise<SearchResultItem[]> {
  const { data } = await http.get<SearchResponse | SearchResultItem[]>('/search', {
    params: {
      q: query,
      workspaceId,
      types: types.join(','),
      limit,
    },
  })

  if (Array.isArray(data)) return data
  if (Array.isArray(data.results)) return data.results
  return types.flatMap((type) => data.groups?.[type] || [])
}
