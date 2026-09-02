const FALLBACK_TIMEZONE = 'Asia/Shanghai'

function validTimezone(timezone: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
    return timezone
  } catch {
    return FALLBACK_TIMEZONE
  }
}

function parts(value: string | Date, timezone: string): Record<string, string> {
  const date = value instanceof Date ? value : new Date(value)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: validTimezone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  return Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
}

export function timezoneDateKey(value: string | Date, timezone: string): string {
  const date = parts(value, timezone)
  return `${date.year}-${date.month}-${date.day}`
}

export function timezoneDateLabel(value: string | Date, timezone: string): string {
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: validTimezone(timezone),
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

export function timezoneTimeLabel(value: string | Date, timezone: string): string {
  const date = parts(value, timezone)
  return `${date.hour}:${date.minute}`
}

export function timezoneDateTimeLabel(value: string | Date, timezone: string): string {
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: validTimezone(timezone),
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}
