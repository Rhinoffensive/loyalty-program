export function formatPoints(n: number): string {
  return Math.round(n).toLocaleString('tr-TR')
}

export function formatMemberNo(no: string): string {
  return no.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

const RELATIVE = new Intl.RelativeTimeFormat('tr-TR', { numeric: 'auto' })
const DATE = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export function formatWhen(ts: number): string {
  const diffMin = Math.round((ts - Date.now()) / 60000)
  if (Math.abs(diffMin) < 60) return RELATIVE.format(diffMin, 'minute')
  const diffHour = Math.round(diffMin / 60)
  if (Math.abs(diffHour) < 24) return RELATIVE.format(diffHour, 'hour')
  const diffDay = Math.round(diffHour / 24)
  if (Math.abs(diffDay) < 7) return RELATIVE.format(diffDay, 'day')
  return DATE.format(ts)
}
