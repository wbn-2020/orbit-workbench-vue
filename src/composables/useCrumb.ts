import { computed, type ComputedRef } from 'vue'
import { useRoute } from 'vue-router'

export interface CrumbSegment {
  label: string
  to?: string
}

/**
 * 面包屑统一来源：由路由 meta（section / crumbParent / title）派生，
 * 顶栏、PageHeader 与各模块页头共用，避免三处手写口径漂移。
 * 详情页通过 crumbParent 挂回列表页（可带跳转），形成 区块 / 列表 / 详情 三级。
 */
export function useCrumbSegments(): ComputedRef<CrumbSegment[]> {
  const route = useRoute()
  return computed(() => {
    const { section, crumbParent, crumbParentTo, title } = route.meta
    const segments: CrumbSegment[] = []
    if (section) segments.push({ label: section })
    if (crumbParent) segments.push({ label: crumbParent, to: crumbParentTo })
    if (title) segments.push({ label: title })
    return segments
  })
}
