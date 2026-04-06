import { useActiveLease } from '../../hooks/useData'
import { formatCurrency, formatDate, daysUntil } from '../../lib/utils'
import clsx from 'clsx'

interface LeaseTrackerProps {
  propertyId: string
}

export function LeaseTracker({ propertyId }: LeaseTrackerProps) {
  const lease = useActiveLease(propertyId)

  if (!lease) {
    return (
      <div className="card">
        <div className="section-header">
          <h3 className="section-title">Lease Status</h3>
        </div>
        <div className="empty-state" style={{ padding: '32px 0' }}>
          <span style={{ fontSize: '2rem' }}>🏠</span>
          <p>No active lease — property is vacant</p>
        </div>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const totalDays  = Math.max(1,
    (new Date(lease.lease_end).getTime() - new Date(lease.lease_start).getTime()) / 86400000
  )
  const elapsed    = Math.max(0,
    (new Date(today).getTime() - new Date(lease.lease_start).getTime()) / 86400000
  )
  const remaining  = Math.max(0, daysUntil(lease.lease_end))
  const pct        = Math.min(100, (elapsed / totalDays) * 100)
  const isEnding   = remaining < 90
  const projectedRent = remaining * (lease.monthly_rent / 30)

  return (
    <div className="card">
      <div className="section-header">
        <h3 className="section-title">Active Lease</h3>
        <span className={clsx('badge', isEnding ? 'badge-expense' : 'badge-income')}>
          {isEnding ? `⚠ ${remaining}d left` : `${remaining}d remaining`}
        </span>
      </div>

      <div className="progress-bar" style={{ marginBottom: 16 }}>
        <div
          className={clsx('progress-fill', isEnding && 'warning')}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div>
          <div className="form-label">Start</div>
          <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{formatDate(lease.lease_start)}</div>
        </div>
        <div>
          <div className="form-label">End</div>
          <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{formatDate(lease.lease_end)}</div>
        </div>
        <div>
          <div className="form-label">Monthly Rent</div>
          <div className="text-green" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1rem' }}>
            {formatCurrency(lease.monthly_rent)}
          </div>
        </div>
      </div>

      {remaining > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 16px',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
          }}
        >
          Projected remaining rent from lease:{' '}
          <span className="text-green" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {formatCurrency(projectedRent)}
          </span>
        </div>
      )}
    </div>
  )
}
