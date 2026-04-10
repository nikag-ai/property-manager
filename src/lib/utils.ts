import { format, parseISO, differenceInDays } from 'date-fns'

/** Short month list */
export const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Short month label: "Jan 2025" from YYYY-MM */
export function formatMonthLabel(m: string): string {
  if (!m) return 'Select Month'
  const [yy, mm] = m.split('-')
  const date = new Date(Number(yy), Number(mm) - 1)
  return format(date, 'MMM yyyy')
}

/** Format a number as USD currency */
export function formatCurrency(n: number | null | undefined, opts?: { compact?: boolean }): string {
  if (n == null) return '—'
  if (opts?.compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/** Format a percentage */
export function formatPct(n: number | null | undefined, decimals = 1): string {
  if (n == null) return '—'
  return `${n.toFixed(decimals)}%`
}

/** Format date: "Oct 10, 2025" */
export function formatDate(iso: string): string {
  return format(parseISO(iso), 'MMM d, yyyy')
}

/** Days remaining from today to a target date */
export function daysUntil(iso: string): number {
  return differenceInDays(parseISO(iso), new Date())
}

/** Color class for a number (green if positive, red if negative) */
export function colorClass(n: number): string {
  if (n > 0) return 'text-green'
  if (n < 0) return 'text-red'
  return 'text-muted'
}

/** Sign prefix: + for positive numbers */
export function withSign(n: number): string {
  return n >= 0 ? `+${formatCurrency(n)}` : formatCurrency(n)
}

/** Current month as YYYY-MM */
export function currentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

/** First day of month ISO string for grouping */
export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

/** Download a string as a file */
export function downloadBlob(content: string, filename: string, mimeType = 'text/csv'): void {
  const blob = new Blob([content], { type: mimeType })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
