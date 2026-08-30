import { describe, expect, it, vi } from 'vitest'

import { http } from './http'
import { getJobProfile, saveJobProfile } from './jobProfile'

describe('job profile api', () => {
  it('loads the current user profile', async () => {
    const request = vi.spyOn(http, 'get').mockResolvedValueOnce({
      data: { completed: false, profile: null },
    } as never)

    await expect(getJobProfile()).resolves.toEqual({
      completed: false,
      profile: null,
    })
    expect(request).toHaveBeenCalledWith('/job-profile')
    request.mockRestore()
  })

  it('saves the current user profile', async () => {
    const payload = {
      targetRole: 'Java + AI 应用开发',
      targetExperienceBand: 'THREE_TO_FIVE_YEARS' as const,
      careerStage: 'CAREER_TRANSITION' as const,
      targetLevel: 'MIDDLE',
      targetCompany: null,
      javaSkillLevel: 'PRACTICAL' as const,
      aiSkillLevel: 'WORKING_KNOWLEDGE' as const,
      targetInterviewDate: null,
    }
    const request = vi.spyOn(http, 'put').mockResolvedValueOnce({
      data: { id: 1, ...payload },
    } as never)

    await expect(saveJobProfile(payload)).resolves.toEqual({ id: 1, ...payload })
    expect(request).toHaveBeenCalledWith('/job-profile', payload)
    request.mockRestore()
  })
})
