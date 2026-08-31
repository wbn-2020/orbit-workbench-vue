import axios from 'axios'

import { getProblem, http } from './http'

import type {
  ResumeDraftPayload,
  ResumePreflight,
  ResumeState,
  ResumeVersionDetail,
} from '@/types/api'

export async function getResumeState(): Promise<ResumeState> {
  const { data } = await http.get<ResumeState>('/resume')
  return data
}

export async function bootstrapResume(title?: string | null): Promise<ResumeVersionDetail> {
  const { data } = await http.post<ResumeVersionDetail>('/resume/bootstrap', { title: title ?? null })
  return data
}

export async function getResumeVersion(versionId: number): Promise<ResumeVersionDetail> {
  const { data } = await http.get<ResumeVersionDetail>(`/resume/versions/${versionId}`)
  return data
}

export async function saveResumeDraft(payload: ResumeDraftPayload): Promise<ResumeVersionDetail> {
  const { data } = await http.put<ResumeVersionDetail>('/resume/draft', payload)
  return data
}

export async function finalizeResumeDraft(changeSummary?: string | null): Promise<ResumeVersionDetail> {
  const { data } = await http.post<ResumeVersionDetail>('/resume/draft/finalize', {
    changeSummary: changeSummary ?? null,
  })
  return data
}

export async function duplicateResumeVersion(versionId: number): Promise<ResumeVersionDetail> {
  const { data } = await http.post<ResumeVersionDetail>(`/resume/versions/${versionId}/duplicate`)
  return data
}

export async function setActiveResumeVersion(versionId: number): Promise<ResumeState> {
  const { data } = await http.put<ResumeState>('/resume/active', { versionId })
  return data
}

export async function checkResumeExport(versionId: number): Promise<ResumePreflight> {
  const { data } = await http.get<ResumePreflight>(`/resume/versions/${versionId}/export-preflight`)
  return data
}

export async function exportResumePdf(versionId: number): Promise<ResumeVersionDetail> {
  const { data } = await http.post<ResumeVersionDetail>(`/resume/versions/${versionId}/pdf`)
  return data
}

export interface ResumePdfFile {
  blob: Blob
  fileName: string
}

/**
 * 下载走 blob，文件名必须复用后端已清洗过的 ContentDisposition，
 * 不在前端重做一遍清洗（否则两端口径会分叉）。
 */
export async function downloadResumePdf(versionId: number): Promise<ResumePdfFile> {
  try {
    const response = await http.get<Blob>(`/resume/versions/${versionId}/pdf`, {
      responseType: 'blob',
    })
    return {
      blob: response.data,
      fileName: parseFileName(response.headers['content-disposition']),
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      const raw = await safeReadBlob(error.response.data)
      throw new Error(raw || getProblem(error).detail || '导出文件暂不可用。')
    }
    throw error
  }
}

function parseFileName(disposition: string | undefined): string {
  if (!disposition) return '简历.pdf'
  const extended = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition)
  if (extended?.[1]) {
    return decodeURIComponent(extended[1].trim().replace(/^"|"$/g, ''))
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition)
  const value = plain?.[1]?.trim()
  // 只有 ASCII 回退形式值得采用，编码字（=?UTF-8?Q?…?=）交给 filename* 分支。
  return value && !value.startsWith('=?') ? value : '简历.pdf'
}

async function safeReadBlob(blob: Blob): Promise<string> {
  try {
    const parsed = JSON.parse(await blob.text()) as { detail?: string }
    return parsed.detail || ''
  } catch {
    return ''
  }
}
