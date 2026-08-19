import { http } from './http'

import type { Workspace } from '@/types/api'

export async function listWorkspaces(): Promise<Workspace[]> {
  const { data } = await http.get<Workspace[]>('/workspaces')
  return data
}
