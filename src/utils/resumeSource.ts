import type { RouteLocationRaw } from 'vue-router'

import type { ResumeItem } from '@/types/api'

export function resumeSourceRoute(item: ResumeItem): RouteLocationRaw | undefined {
  if (item.sourceType === 'JOB_PROFILE') return { name: 'job-profile' }
  if (item.sourceType === 'PROJECT_FACT' && item.sourceProjectId) {
    return {
      name: 'project-detail',
      params: { id: item.sourceProjectId },
      query: {
        version: item.sourceProjectVersionId ?? undefined,
        fact: item.sourceRefId ?? undefined,
      },
    }
  }
  if (item.sourceType === 'PROJECT_VERSION' && item.sourceProjectId) {
    return {
      name: 'project-detail',
      params: { id: item.sourceProjectId },
      query: { version: item.sourceProjectVersionId ?? item.sourceRefId ?? undefined },
    }
  }
  // 旧版本没有项目定位字段时保留可用退路，不伪造项目 id。
  if (item.sourceType === 'PROJECT_FACT' || item.sourceType === 'PROJECT_VERSION') {
    return { name: 'projects' }
  }
  return undefined
}
