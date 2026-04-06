import { useState } from 'react'
import { useProperty } from '../contexts/PropertyContext'
import { useAmortization, useLeases, useUpdateAmortizationRow } from '../hooks/useData'
import { formatCurrency, formatDate, formatPct } from '../lib/utils'
import type { AmortizationRow, Lease } from '../lib/types'
import clsx from 'clsx'

function buildTimeline(purchaseDateStr: string, leases: Lease[]) {
  const purchaseDate = new Date(purchaseDateStr).getTime()
  const sortedLeases = [...leases].sort((a, b) => new Date(a.lease_start).getTime() - new Date(b.lease_start).getTime())
  
  const todayMillis = new Date().getTime()
  let maxDate = Math.max(todayMillis, purchaseDate)
  if (sortedLeases.length > 0) {
    const lastLeaseEnd = new Date(sortedLeases[sortedLeases.length - 1].lease_end).getTime()
    if (lastLeaseEnd > maxDate) maxDate = lastLeaseEnd
  }

  const totalDuration = maxDate - purchaseDate;
  if (totalDuration === 0) return { segments: [], maxDateStr: purchaseDateStr };

  const segments: { type: 'vacant' | 'leased', label: string, startPct: number, widthPct: number }[] = []
  let cursor = purchaseDate;

  for (const lease of sortedLeases) {
    const lStart = new Date(lease.lease_start).getTime()
    const lEnd = new Date(lease.lease_end).getTime()

    if (lStart > cursor) {
      segments.push({
        type: 'vacant', label: 'Vacant',
        startPct: ((cursor - purchaseDate) / totalDuration) * 100,
        widthPct: ((lStart - cursor) / totalDuration) * 100
      })
    }
    
    segments.push({
      type: 'leased', label: 'Leased',
      startPct: ((lStart - purchaseDate) / totalDuration) * 100,
      widthPct: ((lEnd - lStart) / totalDuration) * 100
    })

    cursor = Math.max(cursor, lEnd)
  }

  if (maxDate > cursor) {
    segments.push({
        type: 'vacant', label: 'Vacant',
        startPct: ((cursor - purchaseDate) / totalDuration) * 100,
        widthPct: ((maxDate - cursor) / totalDuration) * 100
    })
  }

  return { segments, maxDateStr: new Date(maxDate).toISOString().split('T')[0] };
}

// Inline editable cell
function EditCell({ value, onSave, prefix = '' }: { value: number; onSave: (v: number) => void; prefix?: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const start = () => { setDraft(String(value)); setEditing(true) }
  const commit = () => {
    const n = parseFloat(draft)
    if (!isNaN(n)) onSave(n)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        step="0.01"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        style={{ width: 90, background: 'var(--surface-3)', border: '1px solid var(--blue)', borderRadius: 4, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', padding: '2px 6px', outline: 'none' }}
      />
    )
  }

  return (
    <span
      onClick={start}
      title="Click to edit"
      style={{ cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', borderBottom: '1px dashed var(--border)', paddingBottom: 1 }}
    >
      {prefix}{formatCurrency(value)}
    </span>
  )
}

export default function PropertyDetails() {
  const { activeProperty: prop } = useProperty()
  const { data: amortRows = [], isLoading: amortLoading } = useAmortization(prop?.id ?? null)
  const { data: leases = [] }                             = useLeases(prop?.id ?? null)
  const updateRow                                         = useUpdateAmortizationRow()
  const [showAll, setShowAll]                             = useState(false)

  if (!prop) return <div className="empty-state" style={{ marginTop: 80 }}><p>No property found.</p></div>

  const displayedRows = showAll ? amortRows : amortRows.slice(0, 24)
  const postedCount   = amortRows.filter(r => r.is_posted).length
  const latestPosted  = amortRows.filter(r => r.is_posted).at(-1)

  const handleRowUpdate = (row: AmortizationRow, patch: Partial<AmortizationRow>) => {
    updateRow.mutate({ id: row.id, propertyId: prop.id, patch })
  }

  return (
    <main className="page-content">
      <h1 style={{ fontSize: '1.25rem', marginBottom: 24 }}>Property Details</h1>

      {/* Loan summary */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 18 }}>Loan Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20 }}>
          {[
            { label: 'Original Loan',    val: formatCurrency(prop.loan_amount) },
            { label: 'Rate',             val: `${(prop.interest_rate * 100).toFixed(2)}%` },
            { label: 'Term',             val: `${prop.loan_term_months / 12} years` },
            { label: 'Payments Made',    val: `${postedCount} / ${prop.loan_term_months}` },
            { label: 'Current Balance',  val: latestPosted ? formatCurrency(latestPosted.remaining_balance) : '—' },
            { label: 'Monthly Payment',  val: amortRows[0] ? formatCurrency(amortRows[0].total_payment) : '—' },
          ].map(({ label, val }) => (
            <div key={label}>
              <div className="form-label">{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1rem', marginTop: 4 }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Property metadata */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 18 }}>Property Info</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20 }}>
          {[
            { label: 'Purchase Date',    val: formatDate(prop.purchase_date) },
            { label: 'Purchase Price',   val: formatCurrency(prop.purchase_price) },
            { label: 'Closing Costs',    val: formatCurrency(prop.closing_costs) },
            { label: 'Current Value',    val: prop.current_value ? formatCurrency(prop.current_value) : '—' },
            { label: 'Selling Cost %',   val: formatPct(prop.selling_cost_pct * 100, 0) },
            { label: 'HOA (Annual)',      val: formatCurrency(prop.hoa_amount) },
            { label: 'Mgmt Fee',         val: formatPct(prop.mgmt_fee_pct * 100, 0) },
          ].map(({ label, val }) => (
            <div key={label}>
              <div className="form-label">{label}</div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem', marginTop: 4 }}>{val}</div>
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div className="form-label" style={{ marginBottom: 8 }}>External Listings</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="https://www.zillow.com/homedetails/864-Moray-Ln-Clarksville-TN-37043/456109539_zpid/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', fontSize: '0.875rem', textDecoration: 'underline', textUnderlineOffset: 2 }}>Zillow ↗</a>
            <a href="https://www.redfin.com/TN/Clarksville/864-Moray-Ln-37043/home/197273821" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', fontSize: '0.875rem', textDecoration: 'underline', textUnderlineOffset: 2 }}>Redfin ↗</a>
            <a href="https://www.realtor.com/realestateandhomes-detail/M9453539394" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', fontSize: '0.875rem', textDecoration: 'underline', textUnderlineOffset: 2 }}>Realtor.com ↗</a>
          </div>
        </div>
      </div>

      {/* Amortization table */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-header" style={{ marginBottom: 16 }}>
          <h3 className="section-title">Amortization Schedule</h3>
          <span className="badge badge-neutral">{prop.loan_term_months} payments</span>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', marginBottom: 16 }}>
          Click any cell to edit inline. Changes are saved immediately. Edited rows are flagged with ✎.
        </p>

        {amortLoading ? (
          <div className="skeleton" style={{ height: 300 }} />
        ) : (
          <>
            <div className="table-wrapper" style={{ maxHeight: 480, overflowY: 'auto' }}>
              <table>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface-2)' }}>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Principal</th>
                    <th style={{ textAlign: 'right' }}>Interest</th>
                    <th style={{ textAlign: 'right' }}>Escrow</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Balance</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRows.map(row => (
                    <tr key={row.id} style={{ opacity: row.is_posted ? 0.65 : 1 }}>
                      <td className="td-mono" style={{ color: 'var(--text-muted)' }}>{row.payment_number}</td>
                      <td className="td-mono" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(row.payment_date)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <EditCell value={row.principal} onSave={v => handleRowUpdate(row, { principal: v })} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <EditCell value={row.interest} onSave={v => handleRowUpdate(row, { interest: v })} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <EditCell value={row.escrow} onSave={v => handleRowUpdate(row, { escrow: v })} />
                      </td>
                      <td className="td-mono" style={{ textAlign: 'right', fontWeight: 500 }}>
                        {formatCurrency(row.total_payment)}
                      </td>
                      <td className="td-mono" style={{ textAlign: 'right' }}>
                        <EditCell value={row.remaining_balance} onSave={v => handleRowUpdate(row, { remaining_balance: v })} />
                      </td>
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                        {row.is_posted && <span title="Posted" style={{ color: 'var(--green)', fontSize: '0.75rem' }}>✓</span>}
                        {row.edited_by_user && <span title="Manually edited" style={{ color: 'var(--yellow)', fontSize: '0.75rem', marginLeft: 4 }}>✎</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!showAll && amortRows.length > 24 && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAll(true)}>
                  Show all {amortRows.length} payments
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lease history */}
      <div className="card">
        <h3 style={{ marginBottom: 18 }}>Lease History</h3>
        
        {prop && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>
              <span>Purchase: {formatDate(prop.purchase_date)}</span>
              <span>{buildTimeline(prop.purchase_date, leases).maxDateStr === prop.purchase_date ? 'Today' : formatDate(buildTimeline(prop.purchase_date, leases).maxDateStr)}</span>
            </div>
            
            <div style={{ display: 'flex', height: 28, borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--border)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
              {buildTimeline(prop.purchase_date, leases).segments.map((seg, i, arr) => (
                <div 
                  key={i} 
                  style={{ 
                    width: `${seg.widthPct}%`, 
                    background: seg.type === 'leased' ? 'var(--blue)' : 'var(--yellow)',
                    opacity: seg.type === 'leased' ? 0.8 : 0.6,
                    borderRight: i < arr.length - 1 ? '1px solid var(--surface)' : 'none',
                    transition: 'opacity 0.2s',
                    cursor: 'help'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = seg.type === 'leased' ? '0.8' : '0.6')}
                  title={`${seg.label} (${seg.widthPct.toFixed(1)}% of timeline)`}
                />
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: 24, marginTop: 12, justifyContent: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                 <span style={{ width: 12, height: 12, background: 'var(--blue)', opacity: 0.8, borderRadius: 2 }}/> Leased
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                 <span style={{ width: 12, height: 12, background: 'var(--yellow)', opacity: 0.6, borderRadius: 2 }}/> Vacant
               </div>
            </div>
          </div>
        )}

        {leases.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}><p>No leases on record.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Start</th>
                  <th>End</th>
                  <th style={{ textAlign: 'right' }}>Monthly Rent</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leases.map(lease => {
                  const today = new Date().toISOString().split('T')[0]
                  const active = lease.lease_start <= today && lease.lease_end >= today
                  return (
                    <tr key={lease.id}>
                      <td className="td-mono">{formatDate(lease.lease_start)}</td>
                      <td className="td-mono">{formatDate(lease.lease_end)}</td>
                      <td className="td-mono text-green" style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(lease.monthly_rent)}
                      </td>
                      <td>
                        <span className={clsx('badge', active ? 'badge-income' : 'badge-neutral')}>
                          {active ? 'Active' : 'Expired'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
