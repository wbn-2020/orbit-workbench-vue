import type { ResumeSectionKey, ResumeVersionDetail } from '@/types/api'

/*
 简历版本比较（`13` §10：不新增端点，前端取两个版本的 sections 做展示层差异）。

 可以按条目 id 对齐而不是按文本猜，因为 id 由前端生成、保存与「复制为草稿」都原样带上
 （`ResumeSections.normalize` 只校验 id 非空且不重复，`ResumeService.duplicate` 直接复制
 `sections_json`），所以同一条内容在版本间保持同一个 id。

 顺序变化要单独标出来：只比文本会把「把技能 3 挪到第 1 条」显示成完全没变。
 */

export type DiffChange = 'added' | 'removed' | 'modified' | 'moved'

export interface DiffEntry {
  id: string
  changes: DiffChange[]
  /** 任一版本里的条目标题，用于定位。 */
  label: string
  /** 修改时给出两侧文本；新增只有 to，删除只有 from。 */
  from?: string | null
  to?: string | null
}

export interface SectionDiff {
  key: ResumeSectionKey
  heading: string
  entries: DiffEntry[]
}

export interface VersionDiff {
  sections: SectionDiff[]
  counts: Record<DiffChange, number>
}

const SECTION_ORDER: ResumeSectionKey[] = [
  'BASIC_INFO',
  'EDUCATION',
  'WORK_EXPERIENCE',
  'PROJECT_EXPERIENCE',
  'SKILLS',
]

export const DIFF_CHANGE_LABELS: Record<DiffChange, string> = {
  added: '新增',
  removed: '删除',
  modified: '改动',
  moved: '顺序调整',
}

export function diffVersions(
  from: ResumeVersionDetail,
  to: ResumeVersionDetail,
  headingOf: (key: ResumeSectionKey) => string,
): VersionDiff {
  const counts: Record<DiffChange, number> = { added: 0, removed: 0, modified: 0, moved: 0 }
  const sections: SectionDiff[] = []

  SECTION_ORDER.forEach((key) => {
    const before = itemsOf(from, key)
    const after = itemsOf(to, key)
    const entries: DiffEntry[] = []

    before.forEach((item) => {
      const match = after.find((candidate) => candidate.id === item.id)
      if (!match) {
        entries.push({ id: item.id, changes: ['removed'], label: item.label ?? '', from: item.text })
        counts.removed += 1
        return
      }
      const changes: DiffChange[] = []
      if ((item.label ?? '') !== (match.label ?? '') || (item.text ?? '') !== (match.text ?? '')) {
        changes.push('modified')
        counts.modified += 1
      }
      entries.push({
        id: item.id,
        changes,
        label: match.label ?? item.label ?? '',
        from: item.text,
        to: match.text,
      })
    })

    after.forEach((item) => {
      if (before.some((candidate) => candidate.id === item.id)) return
      entries.push({ id: item.id, changes: ['added'], label: item.label ?? '', to: item.text })
      counts.added += 1
    })

    // 只看两边都存在的条目，否则任何一次插入都会把后面的全部误标成“顺序调整”。
    const sharedBefore = before.filter((item) => after.some((other) => other.id === item.id))
    const sharedAfter = after.filter((item) => before.some((other) => other.id === item.id))
    sharedAfter.forEach((item, index) => {
      if (sharedBefore[index]?.id === item.id) return
      const entry = entries.find((candidate) => candidate.id === item.id)
      if (entry && !entry.changes.includes('moved')) {
        entry.changes.push('moved')
        counts.moved += 1
      }
    })

    // 没变动的条目不进结果：比较视图要显示的是差异，一屏「未变」只会把差异挤下去。
    const changed = entries.filter((entry) => entry.changes.length > 0)
    if (changed.length > 0) {
      sections.push({ key, heading: headingOf(key), entries: changed })
    }
  })

  return { sections, counts }
}

function itemsOf(detail: ResumeVersionDetail, key: ResumeSectionKey) {
  const section = detail.sections.find((item) => item.key === key)
  return section ? [...section.items] : []
}

export function hasChanges(diff: VersionDiff): boolean {
  return diff.sections.some((section) => section.entries.some((entry) => entry.changes.length > 0))
}
