import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useProperty } from '../contexts/PropertyContext'
import { useMonthlySummary, useTransactions } from '../hooks/useData'
import { CashFlowChart } from '../components/charts/CashFlowChart'
import { TransactionTable } from '../components/ledger/TransactionTable'
import type { TransactionFilters } from '../lib/types'

export default function MonthlyBreakdown() {
  const { activePropertyId: propId } = useProperty()
  const [searchParams, setSearchParams] = useSearchParams()

  const initView  = (searchParams.get('view') === 'ledger') ? 'ledger' : 'chart'
  const initMonth = searchParams.get('month') ?? ''

  const [viewMode, setViewMode] = useState<'chart' | 'ledger'>(initView)
  const [filters, setFilters]   = useState<TransactionFilters>({ month: initMonth || undefined })

  // Sync URL → state when navigating here from chart click
  useEffect(() => {
    const m = searchParams.get('month')
    const v = searchParams.get('view')
    if (v === 'ledger') setViewMode('ledger')
    if (m) setFilters(f => ({ ...f, month: m }))
  }, [searchParams])

  const { data: monthlySummary = [], isLoading: chartLoading } = useMonthlySummary(propId)
  const { data: transactions = [],   isLoading: txLoading }    = useTransactions(propId, filters)

  const switchView = (v: 'chart' | 'ledger') => {
    setViewMode(v)
    setSearchParams(prev => { prev.set('view', v); return prev }, { replace: true })
  }

  const hasFilters = Object.values(filters).some(v => v !== undefined && v !== '')

  return (
    <main className="page-content">
      <div className="section-header" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.25rem' }}>Monthly Breakdown</h1>
        <div className="toggle-group">
          <button className={`toggle-btn${viewMode === 'chart'  ? ' active' : ''}`} onClick={() => switchView('chart')}>📊 Chart</button>
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
