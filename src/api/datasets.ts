import { http, type RequestConfig } from './http'

import type {
  DatasetCellValue,
  DatasetColumn,
  DatasetColumnProfile,
  DatasetDetail,
  DatasetFormat,
  DatasetPreview,
  DatasetProfile,
  DatasetSheetSummary,
  DatasetStatus,
  DatasetSummary,
  DatasetTypeOverridePayload,
  DatasetUploadPayload,
  PageResult,
} from '@/types/api'

interface DatasetSheetWire extends Omit<DatasetSheetSummary, 'name'> {
  name?: string
  sheetName?: string
}

interface DatasetDetailWire extends Omit<DatasetDetail, 'sheets'> {
  sheets?: DatasetSheetWire[]
}

interface DatasetColumnWire {
  id: number
  datasetId?: number
  sheetId: number
  ordinal?: number
  ordinalPosition?: number
  name?: string
  columnName?: string
  normalizedName?: string | null
  sourceName?: string | null
  inferredType: DatasetColumn['inferredType']
  effectiveType: DatasetColumn['effectiveType']
  nullable?: boolean
  missingCount?: number | null
  distinctCount?: number | null
  minimum?: string | number | null
  maximum?: string | number | null
  sampleValues?: DatasetCellValue[]
  version: number
  createdAt?: string
  updatedAt?: string
}

interface DatasetProfileWire extends Omit<
  DatasetProfile,
  'columns' | 'missingCellCount' | 'duplicateRowCount'
> {
  columns?: DatasetColumnProfile[]
  missingCellCount?: number
  duplicateRowCount?: number
  summary?: Record<string, unknown>
  quality?: Record<string, unknown>
}

export interface DatasetListQuery {
  workspaceId?: number
  status?: DatasetStatus
  format?: DatasetFormat
  updatedFrom?: string
  updatedTo?: string
  page?: number
  size?: number
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function textValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function normalizeSheet(sheet: DatasetSheetWire): DatasetSheetSummary {
  return {
    ...sheet,
    name: sheet.name || sheet.sheetName || `Sheet ${sheet.sheetIndex ?? sheet.id}`,
  }
}

function normalizeColumn(column: DatasetColumnWire): DatasetColumn {
  return {
    id: column.id,
    datasetId: column.datasetId,
    sheetId: column.sheetId,
    name: column.name || column.columnName || `字段 ${column.ordinalPosition ?? column.id}`,
    ordinal: column.ordinal ?? column.ordinalPosition,
    normalizedName: column.normalizedName,
    sourceName: column.sourceName,
    inferredType: column.inferredType,
    effectiveType: column.effectiveType,
    nullable: column.nullable,
    missingCount: column.missingCount,
    distinctCount: column.distinctCount,
    minimum: column.minimum,
    maximum: column.maximum,
    sampleValues: column.sampleValues,
    version: column.version,
    createdAt: column.createdAt,
    updatedAt: column.updatedAt,
  }
}

function normalizeProfileColumn(value: unknown): DatasetColumnProfile | undefined {
  const column = recordValue(value)
  const name = textValue(column?.name)
  if (!column || !name) return undefined
  return {
    name,
    missingCount: numberValue(column.missingCount ?? column.nullCount),
    distinctCount: numberValue(column.distinctCount),
    minimum: textValue(column.minimum ?? column.min)
      ?? numberValue(column.minimum ?? column.min)
      ?? null,
    maximum: textValue(column.maximum ?? column.max)
      ?? numberValue(column.maximum ?? column.max)
      ?? null,
    average: numberValue(column.average),
  }
}

function normalizeProfile(profile: DatasetProfileWire): DatasetProfile {
  const summary = recordValue(profile.summary) || {}
  const quality = recordValue(profile.quality) || {}
  const summaryColumns = Array.isArray(summary.columns)
    ? summary.columns.map(normalizeProfileColumn).filter(
        (column): column is DatasetColumnProfile => Boolean(column),
      )
    : undefined
  return {
    ...profile,
    rowCount: numberValue(profile.rowCount) ?? numberValue(summary.rowCount) ?? 0,
    columnCount:
      numberValue(profile.columnCount) ?? numberValue(summary.columnCount) ?? 0,
    missingCellCount:
      numberValue(profile.missingCellCount) ?? numberValue(quality.missingCellCount),
    duplicateRowCount:
      numberValue(profile.duplicateRowCount) ?? numberValue(quality.duplicateRowCount),
    columns: profile.columns || summaryColumns,
    summary,
    quality,
  }
}

export async function listDatasets(
  query: DatasetListQuery = {},
): Promise<PageResult<DatasetSummary>> {
  const { data } = await http.get<PageResult<DatasetSummary>>('/datasets', {
    params: query,
  })
  return data
}

export async function uploadDataset(
  payload: DatasetUploadPayload,
  config?: RequestConfig,
): Promise<DatasetSummary> {
  const form = new FormData()
  form.append('workspaceId', String(payload.workspaceId))
  if (payload.name?.trim()) form.append('name', payload.name.trim())
  form.append('file', payload.file)
  const { data } = await http.post<DatasetSummary>('/datasets', form, config)
  return data
}

export async function getDataset(id: number): Promise<DatasetDetail> {
  const { data } = await http.get<DatasetDetailWire>(`/datasets/${id}`)
  return {
    ...data,
    sheets: (data.sheets || []).map(normalizeSheet),
  }
}

export async function parseDataset(id: number): Promise<void> {
  await http.post(`/datasets/${id}/parse`)
}

export async function reparseDataset(id: number): Promise<void> {
  await http.post(`/datasets/${id}/reparse`)
}

export async function deleteDataset(id: number): Promise<void> {
  await http.delete(`/datasets/${id}`)
}

export async function listDatasetSheets(id: number): Promise<DatasetSheetSummary[]> {
  const { data } = await http.get<DatasetSheetWire[]>(`/datasets/${id}/sheets`)
  return data.map(normalizeSheet)
}

export async function getDatasetSheet(
  datasetId: number,
  sheetId: number,
): Promise<DatasetSheetSummary> {
  const { data } = await http.get<DatasetSheetWire>(
    `/datasets/${datasetId}/sheets/${sheetId}`,
  )
  return normalizeSheet(data)
}

export async function listDatasetColumns(
  datasetId: number,
  sheetId: number,
): Promise<DatasetColumn[]> {
  const { data } = await http.get<DatasetColumnWire[]>(
    `/datasets/${datasetId}/sheets/${sheetId}/columns`,
  )
  return data.map(normalizeColumn)
}

export async function getDatasetPreview(
  datasetId: number,
  sheetId: number,
  offset = 0,
  limit = 50,
): Promise<DatasetPreview> {
  const { data } = await http.get<DatasetPreview>(
    `/datasets/${datasetId}/sheets/${sheetId}/preview`,
    { params: { offset, limit } },
  )
  return data
}

export async function getDatasetProfile(
  datasetId: number,
  sheetId: number,
): Promise<DatasetProfile> {
  const { data } = await http.get<DatasetProfileWire>(
    `/datasets/${datasetId}/sheets/${sheetId}/profile`,
  )
  return normalizeProfile(data)
}

export async function overrideDatasetColumnType(
  datasetId: number,
  sheetId: number,
  columnId: number,
  payload: DatasetTypeOverridePayload,
): Promise<DatasetColumn> {
  const { data } = await http.put<DatasetColumnWire>(
    `/datasets/${datasetId}/sheets/${sheetId}/columns/${columnId}`,
    payload,
  )
  return normalizeColumn(data)
}
