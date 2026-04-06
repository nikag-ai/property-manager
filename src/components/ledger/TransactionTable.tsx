import { useState } from 'react'
import type { Transaction } from '../../lib/types'
import { formatDate, formatCurrency, colorClass, downloadBlob } from '../../lib/utils'
import Papa from 'papaparse'
import clsx from 'clsx'

interface TransactionTableProps {
  transactions: Transaction[]
  isLoading?: boolean
}

export function TransactionTable({ transactions, isLoading }: TransactionTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const exportCsv = () => {
    const rows = transactions.map(t => ({
      Date:        t.date,
      Tag:         t.tag_name,
      Amount:      t.amount,
      Notes:       t.notes ?? '',
      AutoPosted:  t.is_auto_posted,
    }))
    downloadBlob(Papa.unparse(rows), `rentledger-transactions.csv`)
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 44 }} />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="empty-state">
        <span style={{ fontSize: '2rem' }}>📋</span>
        <p>No transactions match your filters</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-secondary btn-sm" onClick={exportCsv}>
          ↓ Export CSV
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Date</th>
              <th>Tag</th>
              <th>Notes</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <>
                <tr key={t.id}>
                  <td>
                    {t.breakdown && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                        onClick={() => toggleExpand(t.id)}
                        aria-label="Toggle breakdown"
                      >
                        {expanded.has(t.id) ? '▼' : '▶'}
                      </button>
                    )}
                  </td>
                  <td className="td-mono" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {formatDate(t.date)}
                  </td>
                  <td>
                    <span className={clsx('badge', t.amount > 0 ? 'badge-income' : 'badge-expense')}>
                      {t.tag_name}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.notes}
                  </td>
                  <td className={clsx('td-mono', colorClass(t.amount))} style={{ textAlign: 'right', fontWeight: 600 }}>
                    {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
                  </td>
                  <td>
                    {t.is_auto_posted && (
                      <span title="Auto-posted by rule" style={{ color: 'var(--blue)', fontSize: '0.75rem' }}>⚡</span>
                    )}
                  </td>
                </tr>
                {expanded.has(t.id) && t.breakdown && (
                  <tr key={`${t.id}-breakdown`} style={{ background: 'var(--surface-2)' }}>
                    <td />
                    <td colSpan={5} style={{ paddingTop: 0, paddingBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 24, paddingLeft: 8 }}>
                        {t.breakdown.map((line, idx) => (
                          <div key={idx} style={{ fontSize: '0.8125rem' }}>
                            <span style={{ color: 'var(--text-subtle)' }}>{line.label}: </span>
                            <span className="td-mono" style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                              {formatCurrency(line.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
