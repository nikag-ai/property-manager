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
  const initTags  = searchParams.getAll('tag')

  const [viewMode, setViewMode] = useState<'chart' | 'ledger' | 'table'>(initView)
  const [filters, setFilters]   = useState<TransactionFilters>({ 
    month: initMonth || undefined,
    tags: initTags.length > 0 ? initTags : undefined
  })

  // Sync URL → state when navigating here from chart click
  useEffect(() => {
    const m = searchParams.get('month')
    const v = searchParams.get('view')
    const urlTags = searchParams.getAll('tag')
    
    if (v === 'ledger' || v === 'table' || v === 'chart') setViewMode(v as 'chart'|'ledger'|'table')
    
    setFilters(f => ({ 
      ...f, 
      month: m || undefined,
      tags: urlTags.length > 0 ? urlTags : undefined
    }))
  }, [searchParams])

  const { data: monthlySummary = [], isLoading: chartLoading } = useMonthlySummary(propId)
  const { data: transactions = [],   isLoading: txLoading }    = useTransactions(propId, filters)

  const switchView = (v: 'chart' | 'ledger' | 'table') => {
    setViewMode(v)
    setSearchParams(prev => { prev.set('view', v); return prev }, { replace: true })
  }

  const [includeClosingCosts, setIncludeClosingCosts] = useState(false)

  const summaryWithCumulative = useMemo(() => {
    if (!monthlySummary || monthlySummary.length === 0) return []
    // Sort chronologically (oldest to newest) to calculate running total
    const chronological = [...monthlySummary].sort((a, b) => a.month.localeCompare(b.month))
    let cum = 0
    return chronological.map(row => {
      const cc = includeClosingCosts ? (row.closing_costs || 0) : 0
      const net = row.net_cash_flow - cc
      cum += net
      return { 
        ...row, 
        display_expenses: row.expenses - cc, 
        display_net: net,
        cumulative_cf: cum 
      }
    }).reverse() // Display newest at the top
  }, [monthlySummary, includeClosingCosts])

  const hasFilters = Object.values(filters).some(v => v !== undefined && v !== '')

  const displayTransactions = useMemo(() => {
    if (includeClosingCosts) return transactions

    return transactions
      .filter(tx => tx.tag_name !== 'Closing Costs' && tx.tag_name !== 'Down Payment')
      .map(tx => {
        if (!tx.breakdown) return tx
        
        // Operational Mode: Hide Principal and adjust the effective amount
        const opLines = tx.breakdown.filter(line => line.label !== 'Principal')
        const opAmount = opLines.reduce((sum, line) => sum + (line.amount || 0), 0)
        
        return {
          ...tx,
          amount: tx.amount < 0 ? -opAmount : opAmount,
          breakdown: opLines
        }
      })
  }, [transactions, includeClosingCosts])

  return (
    <main className="page-content">
      <div className="section-header" style={{ marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.25rem' }}>Monthly Breakdown</h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 'auto', background: 'var(--surface-2)', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>All-in Mode</span>
          <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 34, height: 20 }}>
            <input type="checkbox" checked={includeClosingCosts} onChange={e => setIncludeClosingCosts(e.target.checked)} 
              style={{ opacity: 0, width: 0, height: 0 }} />
            <span className="slider" style={{ 
              position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
              backgroundColor: includeClosingCosts ? 'var(--purple)' : '#ccc', transition: '.2s', borderRadius: 20 
            }}>
              <span style={{ 
                position: 'absolute', content: '""', height: 14, width: 14, left: includeClosingCosts ? 17 : 3, bottom: 3, 
                backgroundColor: 'white', transition: '.2s', borderRadius: '50%' 
              }} />
            </span>
          </label>
          <span style={{ fontSize: '0.7rem', color: includeClosingCosts ? 'var(--text)' : 'var(--text-muted)' }}>Include Closing Costs</span>
        </div>

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
            <table>
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
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(row.display_expenses)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--orange)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(row.maintenance + row.management_fee)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--teal)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(row.principal_paid)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-subtle)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(row.interest_paid)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: row.display_net < 0 ? 'var(--red)' : 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(row.display_net)}
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
            <div className="form-group" style={{ flex: '1 1 120px' }}>
              <label className="form-label">Month</label>
              <input type="month" className="form-input" value={filters.month ?? ''}
                onChange={e => setFilters(f => ({ ...f, month: e.target.value || undefined }))} />
            </div>
            <div className="form-group" style={{ flex: '1 1 160px' }}>
              <label className="form-label">Tag</label>
              <input type="text" className="form-input" placeholder="Filter by tag…" value={filters.tag_name ?? ''}
                onChange={e => setFilters(f => ({ ...f, tag_name: e.target.value || undefined }))} />
            </div>
            <div className="form-group" style={{ flex: '2 1 180px', minWidth: 200 }}>
              <label className="form-label">Search notes</label>
              <input type="text" className="form-input" placeholder="Search…" value={filters.search ?? ''}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value || undefined }))} />
            </div>
            {hasFilters && (
              <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => {
                setFilters({})
                setSearchParams({}, { replace: true })
              }}>Clear all</button>
            )}
          </div>

          {/* Active Filter Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, padding: '0 4px' }}>
            {!includeClosingCosts && (
              <div className="badge" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 16, background: 'rgba(147, 51, 234, 0.1)', border: '1px solid var(--purple)', color: 'var(--purple)', fontSize: '0.8125rem' }}>
                <span style={{ fontWeight: 600 }}>Operational View</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>(Excl. Principal & Acquisition)</span>
                <button 
                  onClick={() => setIncludeClosingCosts(true)} 
                  title="Show all costs (All-in Mode)"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', color: 'var(--purple)', fontWeight: 800 }}>✕</button>
              </div>
            )}

            {hasFilters && (
              <>
                {filters.month && (
                  <div className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 16, background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Month:</span>
                    <span style={{ fontWeight: 600 }}>{formatMonth(filters.month)}</span>
                    <button onClick={() => setFilters(f => ({ ...f, month: undefined }))} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>✕</button>
                  </div>
                )}
                {filters.tag_name && (
                  <div className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 16, background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Tag:</span>
                    <span style={{ fontWeight: 600 }}>{filters.tag_name}</span>
                    <button onClick={() => setFilters(f => ({ ...f, tag_name: undefined }))} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>✕</button>
                  </div>
                )}
                {filters.tags?.map(tag => (
                  <div key={tag} className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 16, background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Tag:</span>
                    <span style={{ fontWeight: 600 }}>{tag}</span>
                    <button onClick={() => {
                        const newTags = filters.tags?.filter(t => t !== tag)
                        setFilters(f => ({ ...f, tags: newTags && newTags.length > 0 ? newTags : undefined }))
                    }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>✕</button>
                  </div>
                ))}
                {filters.search && (
                  <div className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 16, background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Search:</span>
                    <span style={{ fontWeight: 600 }}>"{filters.search}"</span>
                    <button onClick={() => setFilters(f => ({ ...f, search: undefined }))} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>✕</button>
                  </div>
                )}
              </>
            )}
          </div>
          <TransactionTable transactions={displayTransactions} isLoading={txLoading} />
        </div>
      )}
    </main>
  )
}
