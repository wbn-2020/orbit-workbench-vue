import { http } from './http'

import type { WorkbenchSummary } from './types'

export async function getWorkbenchSummary(): Promise<WorkbenchSummary> {
  const { data } = await http.get<WorkbenchSummary>('/workbench/summary')
  return data
}
