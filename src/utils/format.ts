const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const relativeFormatter = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })

export function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date)
}

export function formatRelativeTime(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  const diffMs = date.getTime() - Date.now()
  if (Number.isNaN(diffMs)) return value

  const minutes = Math.round(diffMs / 60_000)
  if (Math.abs(minutes) < 60) return relativeFormatter.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relativeFormatter.format(hours, 'hour')
  return relativeFormatter.format(Math.round(hours / 24), 'day')
}

export function formatFileSize(bytes?: number | null): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function enumLabel(value?: string | null): string {
  if (!value) return '—'
  const labels: Record<string, string> = {
    DRAFT: '草稿',
    READY: '待运行',
    QUEUED: '排队中',
    RUNNING: '运行中',
    PAUSED: '已暂停',
    WAITING_USER: '等待用户',
    WAITING_APPROVAL: '等待审批',
    WAITING_CONFIRMATION: '等待确认',
    PAUSING: '暂停中',
    CANCELLING: '取消中',
    RECOVERY_REQUIRED: '需要恢复',
    SUCCEEDED: '已完成',
    FAILED: '失败',
    CANCELLED: '已取消',
    LOW: '低',
    NORMAL: '普通',
    HIGH: '高',
    TECH_LEARNING: '技术学习',
    DATA_ANALYSIS: '数据分析',
    CONTENT_CREATION: '内容创作',
    TASK: '任务',
    DATASET: '数据集',
    DOCUMENT: '资料',
    ARTIFACT: '成果',
    RUN: '运行',
    LEARNING_NOTE: '学习笔记',
    QUIZ: '练习题',
    SUMMARY: '摘要',
    ANALYSIS_REPORT: '分析报告',
    CHART_SPEC: '图表',
    DATA_EXPORT: '数据导出',
    CSV: 'CSV',
    XLSX: 'Excel',
    UPLOADED: '已上传',
    DELETED: '已删除',
    STRING: '文本',
    INTEGER: '整数',
    DECIMAL: '小数',
    BOOLEAN: '布尔值',
    DATE: '日期',
    DATETIME: '日期时间',
    MARKDOWN: 'Markdown',
    JSON: 'JSON',
    SKIPPED: '已跳过',
    CHAT_COMPLETIONS: 'Chat Completions',
    RESPONSES: 'Responses',
    OPENAI: 'OpenAI',
    DEEPSEEK: 'DeepSeek',
    XAI: 'xAI',
    CUSTOM_OPENAI_COMPATIBLE: 'OpenAI 兼容',
    SUCCESS: '成功',
    STALE: '待重新测试',
    UNTESTED: '未测试',
    PENDING: '待解析',
    PARSING: '解析中',
    READY_DOCUMENT: '可用',
  }
  if (value === 'READY') return '待运行'
  return labels[value] ?? value
}
