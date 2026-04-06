import { formatCurrency, formatPct } from '../../lib/utils'
import clsx from 'clsx'

interface KpiCardProps {
  label: string
  value: number | null | undefined
  format?: 'currency' | 'pct' | 'days' | 'number'
  accent?: string
  sub?: string
  positive?: boolean  // force green
  negative?: boolean  // force red
  isLoading?: boolean
}

export function KpiCard({ label, value, format = 'currency', accent, sub, positive, negative, isLoading }: KpiCardProps) {
  const formatted = (() => {
    if (value == null) return '—'
    if (format === 'currency') return formatCurrency(value)
    if (format === 'pct')     return formatPct(value)
    if (format === 'days')    return `${Math.round(value)}d`
    return String(value)
  })()

  const colorClass = (() => {
    if (positive || (value != null && value > 0 && !negative)) return 'text-green'
    if (negative || (value != null && value < 0)) return 'text-red'
    return ''
  })()

  return (
    <div
      className="kpi-card"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <div className="kpi-card-label">{label}</div>
      {isLoading ? (
        <div className="skeleton" style={{ height: 36, width: 120, marginTop: 4 }} />
      ) : (
        <div className={clsx('kpi-card-value', colorClass)}>{formatted}</div>
      )}
      {sub && <div className="kpi-card-sub">{sub}</div>}
    </div>
  )
}

interface KpiRowProps {
  children: React.ReactNode
}

export function KpiRow({ children }: KpiRowProps) {
  return <div className="kpi-row">{children}</div>
}
