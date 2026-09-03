import { describe, expect, it } from 'vitest'

import type { ResumeItem } from '@/types/api'

import { resumeSourceRoute } from './resumeSource'

function item(overrides: Partial<ResumeItem> = {}): ResumeItem {
  return {
    id: 'item-1',
    order: 1,
    kind: 'ENTRY',
    label: '库存链路',
    text: '负责幂等与防超卖',
    sourceType: 'MANUAL',
    sourceRefId: null,
    sourceLabel: null,
    edited: false,
    ...overrides,
  }
}

describe('resumeSourceRoute', () => {
  it('links a project fact to its exact version and fact', () => {
    expect(resumeSourceRoute(item({
      sourceType: 'PROJECT_FACT',
      sourceRefId: 42,
      sourceProjectId: 7,
      sourceProjectVersionId: 21,
    }))).toEqual({
      name: 'project-detail',
      params: { id: 7 },
      query: { version: 21, fact: 42 },
    })
  })

  it('links a project version to its project detail', () => {
    expect(resumeSourceRoute(item({
      sourceType: 'PROJECT_VERSION',
      sourceRefId: 21,
      sourceProjectId: 7,
    }))).toEqual({
      name: 'project-detail',
      params: { id: 7 },
      query: { version: 21 },
    })
  })

  it('falls back to the project list for legacy sources', () => {
    expect(resumeSourceRoute(item({
      sourceType: 'PROJECT_FACT',
      sourceRefId: 42,
    }))).toEqual({ name: 'projects' })
  })
})
