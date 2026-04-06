import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProperty } from '../contexts/PropertyContext'
import { useMonthlySummary, useTransactions } from '../hooks/useData'
import { CashFlowChart } from '../components/charts/CashFlowChart'
import { TransactionTable } from '../components/ledger/TransactionTable'
import type { TransactionFilters } from '../lib/types'

import { formatCurrency } from '../lib/utils'

const formatMonth = (m: string) => {
  const [yy, mm] = m.split('-')
  const date = new Date(Number(yy), Number(mm) - 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function MonthlyBreakdown() {
  const { activePropertyId: propId } = useProperty()
  const [searchParams, setSearchParams] = useSearchParams()

  const initView  = (searchParams.get('view') as 'chart' | 'ledger' | 'table') || 'table'
  const initMonth = searchParams.get('month') ?? ''

  const [viewMode, setViewMode] = useState<'chart' | 'ledger' | 'table'>(initView)
  const [filters, setFilters]   = useState<TransactionFilters>({ month: initMonth || undefined })

  // Sync URL → state when navigating here from chart click
  useEffect(() => {
    const m = searchParams.get('month')
    const v = searchParams.get('view')
    if (v === 'ledger' || v === 'table' || v === 'chart') setViewMode(v as 'chart'|'ledger'|'table')
    if (m) setFilters(f => ({ ...f, month: m }))
  }, [searchParams])

  const { data: monthlySummary = [], isLoading: chartLoading } = useMonthlySummary(propId)
  const { data: transactions = [],   isLoading: txLoading }    = useTransactions(propId, filters)

  const switchView = (v: 'chart' | 'ledger' | 'table') => {
    setViewMode(v)
    setSearchParams(prev => { prev.set('view', v); return prev }, { replace: true })
  }

  const hasFilters = Object.values(filters).some(v => v !== undefined && v !== '')

  const summaryWithCumulative = useMemo(() => {
    if (!monthlySummary || monthlySummary.length === 0) return []
    // Sort chronologically (oldest to newest) to calculate running total
    const chronological = [...monthlySummary].sort((a, b) => a.month.localeCompare(b.month))
    let cum = 0
    return chronological.map(row => {
      cum += row.net_cash_flow
      return { ...row, cumulative_cf: cum }
    }).reverse() // Display newest at the top
  }, [monthlySummary])

  return (
    <main className="page-content">
      <div className="section-header" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.25rem' }}>Monthly Breakdown</h1>
        <div className="toggle-group">
          <button className={`toggle-btn${viewMode === 'chart'  ? ' active' : ''}`} onClick={() => switchView('chart')}>📊 Chart</button>
          <button className={`toggle-btn${viewMode === 'table' ? ' active' : ''}`} onClick={() => switchView('table')}>🧮 Summary</button>
          <button className={`toggle-btn${viewMode === 'ledger' ? ' active' : ''}`} onClick={() => switchView('ledger')}>📋 Ledger</button>
        </div>
      </div>

      {viewMode === 'chart' ? (
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Cash Flow by Month</h3>
          {chartLoading
            ? <div className="skeleton" style={{ height: 320 }} />
            : <CashFlowChart data={monthlySummary} />
          }
        </div>
      ) : viewMode === 'table' ? (
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>High-Level Month over Month</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Gross Income</th>
                  <th style={{ textAlign: 'right' }}>Hard Expenses</th>
                  <th style={{ textAlign: 'right' }}>OpEx (Mgmt/Maint)</th>
                  <th style={{ textAlign: 'right' }}>Principal</th>
                  <th style={{ textAlign: 'right' }}>Interest</th>
                  <th style={{ textAlign: 'right' }}>Net Cash Flow</th>
                  <th style={{ textAlign: 'right', color: 'var(--purple)' }}>Cumulative CF</th>
                </tr>
              </thead>
              <tbody>
                {summaryWithCumulative.map(row => (
                  <tr 
                    key={row.month} 
                    style={{ cursor: 'pointer', transition: 'background-color 0.1s' }} 
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => {
                      setFilters(f => ({ ...f, month: row.month.substring(0, 7) }))
                      switchView('ledger')
                    }}
                  >
                    <td style={{ fontWeight: 600 }}>{formatMonth(row.month)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(row.income)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(row.expenses)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--orange)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(row.maintenance + row.management_fee)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--teal)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(row.principal_paid)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(row.interest_paid)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: row.net_cash_flow < 0 ? 'var(--red)' : 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(row.net_cash_flow)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--purple)', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(row.cumulative_cf)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: '0 0 160px' }}>
              <label className="form-label">Month</label>
              <input type="month" className="form-input" value={filters.month ?? ''}
                onChange={e => setFilters(f => ({ ...f, month: e.target.value || undefined }))} />
            </div>
            <div className="form-group" style={{ flex: '0 0 180px' }}>
              <label className="form-label">Tag</label>
              <input type="text" className="form-input" placeholder="Filter by tag…" value={filters.tag_name ?? ''}
                onChange={e => setFilters(f => ({ ...f, tag_name: e.target.value || undefined }))} />
            </div>
            <div className="form-group" style={{ flex: '1 1 180px' }}>
              <label className="form-label">Search notes</label>
              <input type="text" className="form-input" placeholder="Search…" value={filters.search ?? ''}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value || undefined }))} />
            </div>
            {hasFilters && (
              <button className="btn btn-ghost btn-sm" onClick={() => {
                setFilters({})
                setSearchParams({}, { replace: true })
              }}>Clear filters</button>
            )}
          </div>
          <TransactionTable transactions={transactions} isLoading={txLoading} />
        </div>
      )}
    </main>
  )
}
