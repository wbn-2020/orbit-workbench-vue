import { cleanParams, http } from './http'

import type { CapabilityEvidence, CapabilityOverview } from '@/types/api'

/**
 * 技能图谱读接口（`16` §8）。维度名含中文，路径变量必须百分号编码后传输。
 */
export async function getCapabilityOverview(
  days?: number | null,
  ruleVersion?: string | null,
): Promise<CapabilityOverview> {
  const { data } = await http.get<CapabilityOverview>('/capabilities/overview', {
    params: cleanParams({ days, ruleVersion }),
  })
  return data
}

export async function getCapabilityDimension(
  name: string,
  days?: number | null,
  ruleVersion?: string | null,
): Promise<CapabilityEvidence> {
  const { data } = await http.get<CapabilityEvidence>(
    `/capabilities/dimensions/${encodeURIComponent(name)}`,
    { params: cleanParams({ days, ruleVersion }) },
  )
  return data
}

/** 自评层的四档中文标签；后端原样透传序数，界面只负责翻译（`16` §6.2）。 */
export const SKILL_LEVEL_LABELS: Record<string, string> = {
  BEGINNER: '入门',
  WORKING_KNOWLEDGE: '了解可用',
  PRACTICAL: '熟练实践',
  ADVANCED: '深入',
}

export function skillLevelLabel(value?: string | null): string {
  if (!value) return '未自评'
  return SKILL_LEVEL_LABELS[value] ?? value
}

/**
 * 分组只决定配色，键是后端下发的分组名。
 * 名字对不上时退回灰色——展示归置不该让一次改名变成界面无样式。
 */
export const CATEGORY_TAG_CLASS: Record<string, string> = {
  技术硬实力: 'blue',
  思维判断: 'green',
  沟通表达: 'yel',
}

export function categoryTagClass(category: string): string {
  return CATEGORY_TAG_CLASS[category] ?? 'gray'
}

export function categoryRowClass(category: string): string {
  if (category === '技术硬实力') return 'tech'
  if (category === '沟通表达') return 'comm'
  return 'think'
}
