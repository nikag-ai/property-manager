import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

import { useProperty } from '../contexts/PropertyContext'
import { useMonthlySummary } from '../hooks/useData'
import { CashFlowChart } from '../components/charts/CashFlowChart'


import { formatCurrency } from '../lib/utils'

const formatMonth = (m: string) => {
  const [yy, mm] = m.split('-')
  const date = new Date(Number(yy), Number(mm) - 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function MonthlyBreakdown() {
  const { activePropertyId: propId } = useProperty()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()


  const initView  = (searchParams.get('view') as 'chart' | 'table') || 'table'

  const initMonth = searchParams.get('month') ?? ''
  const initTags  = searchParams.getAll('tag')

  const [viewMode, setViewMode] = useState<'chart' | 'table'>(initView)




  // Sync URL → state when navigating here from chart click
  useEffect(() => {
    const v = searchParams.get('view')
    if (v === 'table' || v === 'chart') setViewMode(v as 'chart'|'table')
  }, [searchParams])

  const { data: monthlySummary = [], isLoading: chartLoading } = useMonthlySummary(propId)


  const switchView = (v: 'chart' | 'table') => {

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
      
      // Treat principal as an expense
      const principal = row.principal_paid || 0;
      const net = row.net_cash_flow - cc - principal;
      cum += net;

      return { 
        ...row, 
        expenses: row.expenses - principal,
        net_cash_flow: net,
        display_expenses: row.expenses - cc - principal, 
        display_net: net,
        cumulative_cf: cum 
      }
    }).reverse() // Display newest at the top
  }, [monthlySummary, includeClosingCosts])

  // Prepare chronological data for the chart that includes the modified expenses and net_cash_flow
  const chartData = useMemo(() => {
    return [...summaryWithCumulative].reverse()
  }, [summaryWithCumulative])







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
        </div>
      </div>

      {viewMode === 'chart' ? (
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Cash Flow by Month</h3>
          {chartLoading
            ? <div className="skeleton" style={{ height: 320 }} />
            : <CashFlowChart data={chartData} />
          }
        </div>
      ) : (
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
                      const m = row.month.substring(0, 7)
                      // Navigate to dedicated ledger page
                      navigate(`/ledger?month=${m}`)
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
      )}

    </main>
  )
}
