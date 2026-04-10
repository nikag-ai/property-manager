import { useState, Fragment } from 'react'

import type { Transaction } from '../../lib/types'
import { formatDate, formatCurrency, colorClass, downloadBlob } from '../../lib/utils'
import Papa from 'papaparse'
import clsx from 'clsx'
import { InfoTooltip } from '../common/InfoTooltip'
import { TransactionEditModal } from './TransactionEditModal'


interface TransactionTableProps {
  transactions: Transaction[]
  isLoading?: boolean
}

export function TransactionTable({ transactions, isLoading }: TransactionTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)


  const totalPages = Math.ceil(transactions.length / pageSize)
  const paginated = transactions.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Reset to first page if total results change (e.g. search/filter)
  const [lastLength, setLastLength] = useState(transactions.length)
  if (transactions.length !== lastLength) {
    setLastLength(transactions.length)
    setCurrentPage(1)
  }

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
              <th style={{ width: 64, textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(t => (
              <Fragment key={t.id}>

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
                    <>{t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}</>
                  </td>

                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      {t.is_auto_posted && (
                        <span className="info-tooltip-wrap plain-trigger tooltip-left">
                          <InfoTooltip content="Auto-posted: This transaction was automatically generated based on your recurring rules or loan amortization schedule.">
                            <span style={{ color: 'var(--blue)', fontSize: '0.9rem' }}>⚡</span>
                          </InfoTooltip>
                        </span>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0 4px', fontSize: '0.9rem', opacity: 0.4 }}
                        onClick={() => setSelectedTx(t)}
                        title="Edit transaction"
                      >
                        ✏️
                      </button>
                    </div>
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
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '0 4px' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, transactions.length)} of {transactions.length}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              ← Prev
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-subtle)', padding: '0 8px' }}>
              Page {currentPage} of {totalPages}
            </div>
            <button
              className="btn btn-secondary btn-sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      <TransactionEditModal 
        isOpen={!!selectedTx} 
        onClose={() => setSelectedTx(null)} 
        transaction={selectedTx} 
      />
    </div>

  )
}
