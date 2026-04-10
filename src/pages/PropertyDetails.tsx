import { useState, useEffect, useMemo } from 'react'
import { useProperty } from '../contexts/PropertyContext'
import { useAmortization, useLeases, useUpdateAmortizationRow, useUpdateProperty } from '../hooks/useData'
import { formatCurrency, formatDate, formatPct } from '../lib/utils'
import type { AmortizationRow, Lease, Property } from '../lib/types'
import { addDays, subDays, parseISO, isAfter } from 'date-fns'
import clsx from 'clsx'

// Modal Component
function Modal({ title, isOpen, onClose, children }: { title: string; isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!isOpen) return null
  return (
    <div className="modal-overlay" onClick={onClose} style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, 
      padding: 20
    }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ 
        width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto',
        border: '1px solid var(--border)', background: 'var(--surface-2)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.1rem' }}>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
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
        className="form-input"
        style={{ width: 90, height: 24, fontSize: '0.8125rem', padding: '0 6px' }}
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
  const updateProp                                        = useUpdateProperty()
  const [showAll, setShowAll]                             = useState(false)

  // Modal states
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false)
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false)

  // Local state for editing lists
  const [tempLinks, setTempLinks] = useState<{ label: string; url: string }[]>([])
  const [tempContacts, setTempContacts] = useState<{ name: string; role: string; email: string; phone: string }[]>([])

  useEffect(() => {
    if (prop) {
      setTempLinks(prop.quick_links || [])
      setTempContacts(prop.important_contacts || [])
    }
  }, [prop, isLinksModalOpen, isContactsModalOpen])

  // Unified History Calculation
  const unifiedHistory = useMemo(() => {
    if (!prop) return []
    
    // Sort leases ASC to calculate gaps
    const sortedLeases = [...leases].sort((a, b) => a.lease_start.localeCompare(b.lease_start))
    const history: ({ type: 'lease' | 'vacancy'; start: string; end: string; rent?: number; id: string })[] = []
    
    let cursor = prop.purchase_date
    const today = new Date().toISOString().split('T')[0]

    for (const lease of sortedLeases) {
      // Gap before lease
      if (lease.lease_start > cursor) {
        history.push({
          id: `vac-${cursor}`,
          type: 'vacancy',
          start: cursor,
          end: new Date(subDays(parseISO(lease.lease_start), 1)).toISOString().split('T')[0]
        })
      }
      // The lease itself
      history.push({
        id: lease.id,
        type: 'lease',
        start: lease.lease_start,
        end: lease.lease_end,
        rent: lease.monthly_rent
      })
      cursor = new Date(addDays(parseISO(lease.lease_end), 1)).toISOString().split('T')[0]
    }

    // Gap after last lease (until today)
    if (today > cursor) {
      history.push({
        id: `vac-end`,
        type: 'vacancy',
        start: cursor,
        end: today
      })
    }

    // Return DESC (newest first)
    return history.sort((a, b) => b.start.localeCompare(a.start))
  }, [prop, leases])

  if (!prop) return <div className="empty-state" style={{ marginTop: 80 }}><p>No property found.</p></div>

  const displayedRows = showAll ? amortRows : amortRows.slice(0, 24)
  const postedCount   = amortRows.filter(r => r.is_posted).length
  const latestPosted  = amortRows.filter(r => r.is_posted).at(-1)

  const handleRowUpdate = (row: AmortizationRow, patch: Partial<AmortizationRow>) => {
    updateRow.mutate({ id: row.id, propertyId: prop.id, patch })
  }

  const saveLinks = () => {
    updateProp.mutate({ propertyId: prop.id, patch: { quick_links: tempLinks } })
    setIsLinksModalOpen(false)
  }

  const saveContacts = () => {
    updateProp.mutate({ propertyId: prop.id, patch: { important_contacts: tempContacts } })
    setIsContactsModalOpen(false)
  }

  return (
    <main className="page-content">
      <h1 style={{ fontSize: '1.25rem', marginBottom: 24 }}>Property Details</h1>

      {/* Quick Links & Contacts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Quick Links */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
             <h3>Quick Links</h3>
             <button className="btn btn-ghost btn-xs" style={{ color: 'var(--blue)' }} onClick={() => setIsLinksModalOpen(true)}>Edit</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(prop.quick_links || []).length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No links added.</p>
            ) : (
              prop.quick_links?.map(link => (
                <a 
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                  style={{ justifyContent: 'flex-start', padding: '10px 16px', fontSize: '0.8125rem', color: 'var(--blue)' }}
                >
                  <span style={{ marginRight: 8, fontSize: '0.9rem' }}>🔗</span> {link.label}
                </a>
              ))
            )}
          </div>
        </div>

        {/* Important Contacts */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
             <h3>Important Contacts</h3>
             <button className="btn btn-ghost btn-xs" style={{ color: 'var(--blue)' }} onClick={() => setIsContactsModalOpen(true)}>Edit</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {(prop.important_contacts || []).length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No contacts added.</p>
            ) : (
              prop.important_contacts?.map(contact => (
                <div key={contact.name} style={{ borderLeft: '3px solid var(--purple)', paddingLeft: 16 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{contact.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>{contact.role}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <a href={`mailto:${contact.email}`} style={{ fontSize: '0.8125rem', color: 'var(--blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                      📧 <span style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>{contact.email}</span>
                    </a>
                    <a href={`tel:${contact.phone.replace(/\D/g, '')}`} style={{ fontSize: '0.8125rem', color: 'var(--text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                      📞 <span>{contact.phone}</span>
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
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
        <div className="table-wrapper table-responsive" style={{ maxHeight: 480, overflowY: 'auto' }}>
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
        <h3 style={{ marginBottom: 18 }}>Ownership & Lease History</h3>
        
        {unifiedHistory.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}><p>No history on record.</p></div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Duration</th>
                  <th>Monthly Rent</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {unifiedHistory.map(row => {
                  const today = new Date().toISOString().split('T')[0]
                  const isActive = row.type === 'lease' && row.start <= today && row.end >= today
                  const isFuture = row.start > today

                  // Calculate duration in days and months
                  const startDate = parseISO(row.start)
                  const endDate = parseISO(row.end)
                  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                  
                  let durationStr = ''
                  if (totalDays >= 365) {
                    const yrs = Math.floor(totalDays / 365)
                    const mos = Math.floor((totalDays % 365) / 30)
                    durationStr = `${yrs}y ${mos}m`
                  } else if (totalDays >= 30) {
                    const mos = Math.floor(totalDays / 30)
                    const days = totalDays % 30
                    durationStr = `${mos}m ${days}d`
                  } else {
                    durationStr = `${totalDays}d`
                  }
                  
                  return (
                    <tr key={row.id} style={{ opacity: isFuture ? 0.5 : 1 }}>
                      <td className="td-mono">
                        {formatDate(row.start)} – {formatDate(row.end)}
                      </td>
                      <td className="td-mono" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {durationStr}
                      </td>
                      <td className="td-mono" style={{ fontWeight: row.type === 'lease' ? 600 : 400 }}>
                        {row.type === 'lease' ? formatCurrency(row.rent || 0) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td>
                        <span className={clsx('badge', 
                          row.type === 'lease' ? (isActive ? 'badge-income' : 'badge-neutral') : 'badge-neutral'
                        )} style={{ background: row.type === 'vacancy' ? 'rgba(234, 179, 8, 0.15)' : undefined, color: row.type === 'vacancy' ? 'var(--yellow)' : undefined }}>
                          {row.type === 'lease' ? (isActive ? 'Active Lease' : 'Past Lease') : 'Vacant'}
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

      {/* MODALS */}
      <Modal 
        title="Manage Quick Links" 
        isOpen={isLinksModalOpen} 
        onClose={() => setIsLinksModalOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tempLinks.map((link, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input 
                className="form-input"
                placeholder="Label" 
                value={link.label} 
                onChange={e => {
                  const val = e.target.value
                  setTempLinks(prev => prev.map((l, i) => i === idx ? { ...l, label: val } : l))
                }}
              />
              <input 
                className="form-input" 
                placeholder="URL" 
                value={link.url} 
                onChange={e => {
                  const val = e.target.value
                  setTempLinks(prev => prev.map((l, i) => i === idx ? { ...l, url: val } : l))
                }}
              />
              <button 
                className="btn btn-ghost btn-sm" 
                style={{ color: 'var(--red)' }}
                onClick={() => setTempLinks(prev => prev.filter((_, i) => i !== idx))}
              >
                ✕
              </button>
            </div>
          ))}
          <button 
            className="btn btn-outline btn-sm" 
            style={{ marginTop: 8 }}
            onClick={() => setTempLinks(prev => [...prev, { label: '', url: '' }])}
          >
            + Add Link
          </button>
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveLinks}>Save Changes</button>
            <button className="btn btn-outline" onClick={() => setIsLinksModalOpen(false)}>Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal 
        title="Manage Contacts" 
        isOpen={isContactsModalOpen} 
        onClose={() => setIsContactsModalOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tempContacts.map((contact, idx) => (
            <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, position: 'relative' }}>
              <button 
                className="btn btn-ghost btn-sm" 
                style={{ position: 'absolute', top: 8, right: 8, color: 'var(--red)' }}
                onClick={() => setTempContacts(prev => prev.filter((_, i) => i !== idx))}
              >
                ✕
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Name</label>
                  <input className="form-input" value={contact.name} onChange={e => {
                    const val = e.target.value
                    setTempContacts(prev => prev.map((c, i) => i === idx ? { ...c, name: val } : c))
                  }} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Role</label>
                  <input className="form-input" value={contact.role} onChange={e => {
                    const val = e.target.value
                    setTempContacts(prev => prev.map((c, i) => i === idx ? { ...c, role: val } : c))
                  }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Email</label>
                  <input className="form-input" value={contact.email} onChange={e => {
                    const val = e.target.value
                    setTempContacts(prev => prev.map((c, i) => i === idx ? { ...c, email: val } : c))
                  }} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Phone</label>
                  <input className="form-input" value={contact.phone} onChange={e => {
                    const val = e.target.value
                    setTempContacts(prev => prev.map((c, i) => i === idx ? { ...c, phone: val } : c))
                  }} />
                </div>
              </div>
            </div>
          ))}
          <button 
            className="btn btn-outline btn-sm" 
            onClick={() => setTempContacts(prev => [...prev, { name: '', role: '', email: '', phone: '' }])}
          >
            + Add Contact
          </button>
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveContacts}>Save Changes</button>
            <button className="btn btn-outline" onClick={() => setIsContactsModalOpen(false)}>Cancel</button>
          </div>
        </div>
      </Modal>
    </main>
  )
}
