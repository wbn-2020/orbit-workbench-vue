import { describe, expect, it, vi } from 'vitest'

import { SEARCH_DOMAIN_META, searchAll, type SearchDomain } from './search'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('./http', () => ({
  http: { get },
}))

describe('SEARCH_DOMAIN_META', () => {
  it('covers the five existing domains and three extended domains', () => {
    const domains: SearchDomain[] = [
      'PROJECT',
      'KNOWLEDGE',
      'INTERVIEW',
      'REPORT',
      'APPLICATION',
      'PROJECT_FACT',
      'INTERVIEWER',
      'STUDY_TASK',
    ]

    expect(Object.keys(SEARCH_DOMAIN_META)).toHaveLength(domains.length)
    for (const domain of domains) {
      expect(SEARCH_DOMAIN_META[domain].label).toBeTruthy()
      expect(SEARCH_DOMAIN_META[domain].icon).toBeTruthy()
      expect(SEARCH_DOMAIN_META[domain].tone).toBeTruthy()
    }
  })

  it('uses the requested Chinese labels for the extended domains', () => {
    expect(SEARCH_DOMAIN_META.PROJECT_FACT).toEqual({
      label: '画像事实',
      icon: 'badge-check',
      tone: 'gold',
    })
    expect(SEARCH_DOMAIN_META.INTERVIEWER).toEqual({
      label: '面试官',
      icon: 'users-round',
      tone: 'brand',
    })
    expect(SEARCH_DOMAIN_META.STUDY_TASK).toEqual({
      label: '复习任务',
      icon: 'clipboard-check',
      tone: 'orange',
    })
  })
})

describe('searchAll', () => {
  it('keeps the existing search endpoint and query parameter contract', async () => {
    const response = {
      data: {
        query: '秒杀',
        total: 3,
        groups: [
          {
            type: 'PROJECT_FACT',
            label: 'server label',
            total: 1,
            items: [
              {
                type: 'PROJECT_FACT',
                id: 31,
                title: '库存扣减',
                route: '/projects/10?version=20&fact=31',
              },
            ],
          },
          {
            type: 'INTERVIEWER',
            label: 'server label',
            total: 1,
            items: [
              {
                type: 'INTERVIEWER',
                id: 32,
                title: '项目深挖官',
                route: '/interviewers',
              },
            ],
          },
          {
            type: 'STUDY_TASK',
            label: 'server label',
            total: 1,
            items: [
              {
                type: 'STUDY_TASK',
                id: 33,
                title: '复习缓存一致性',
                route: '/study-plan?focus=33',
              },
            ],
          },
        ],
      },
    }
    get.mockResolvedValueOnce(response)

    await expect(searchAll('秒杀')).resolves.toBe(response.data)
    expect(get).toHaveBeenCalledWith('/search', { params: { q: '秒杀' } })
  })
})
