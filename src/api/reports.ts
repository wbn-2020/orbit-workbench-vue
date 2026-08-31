import { http } from './http'

import type {
  ReportDetail,
  ReportListQuery,
  ReportListResponse,
  ReportSummary,
} from '@/types/api'

export async function listReports(query: ReportListQuery = {}): Promise<ReportListResponse> {
  const { data } = await http.get<ReportListResponse>('/reports', { params: cleanParams(query) })
  return data
}

export async function getReportSummary(days?: number | null, ruleVersion?: string | null):
  Promise<ReportSummary> {
  const { data } = await http.get<ReportSummary>('/reports/summary', {
    params: cleanParams({ days, ruleVersion }),
  })
  return data
}

export async function getReportDetail(reportId: number): Promise<ReportDetail> {
  const { data } = await http.get<ReportDetail>(`/reports/${reportId}`)
  return data
}

/** 后端把缺省与空串按「不过滤」处理，但 undefined/null 仍要在前端剔除，避免发出 `days=` 这类空参数。 */
function cleanParams(input: object): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') out[key] = value
  })
  return out
}
