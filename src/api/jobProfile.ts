import { http } from './http'

import type { JobProfile, JobProfilePayload, JobProfileState } from '@/types/api'

export async function getJobProfile(): Promise<JobProfileState> {
  const { data } = await http.get<JobProfileState>('/job-profile')
  return data
}

export async function saveJobProfile(payload: JobProfilePayload): Promise<JobProfile> {
  const { data } = await http.put<JobProfile>('/job-profile', payload)
  return data
}
