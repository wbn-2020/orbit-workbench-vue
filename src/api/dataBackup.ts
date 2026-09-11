import { http } from './http'

/** 备份文件格式标识，与后端 DataBackupService.FORMAT 保持一致。 */
export const BACKUP_FORMAT = 'orbit-workbench-backup'

/** 清空全部数据需要输入的确认串，与后端 DataBackupService.CLEAR_CONFIRM 保持一致。 */
export const CLEAR_CONFIRM = '清空'

export interface BackupPayload {
  format: string
  version: number
  exportedAt: string
  tables: string[]
  data: Record<string, Array<Record<string, unknown>>>
}

export interface DataOperationSummary {
  tables: number
  rows: number
}

export async function exportBackup(): Promise<BackupPayload> {
  const { data } = await http.get<BackupPayload>('/api/v1/data/export')
  return data
}

export async function importBackup(payload: BackupPayload): Promise<DataOperationSummary> {
  const { data } = await http.post<DataOperationSummary>('/api/v1/data/import', payload)
  return data
}

export async function clearAllData(confirm: string): Promise<DataOperationSummary> {
  const { data } = await http.post<DataOperationSummary>('/api/v1/data/clear', { confirm })
  return data
}

/** 汇总备份载荷里的行数，用于在确认弹窗里如实告知用户将要覆盖多少数据。 */
export function countBackupRows(payload: BackupPayload): number {
  return Object.values(payload.data ?? {}).reduce((sum, rows) => sum + (rows?.length ?? 0), 0)
}
