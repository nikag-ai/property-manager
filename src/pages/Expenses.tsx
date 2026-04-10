import { useState, useMemo } from 'react'
import { useProperty } from '../contexts/PropertyContext'
import { useTransactions } from '../hooks/useData'
import { formatCurrency } from '../lib/utils'
import { TransactionTable } from '../components/ledger/TransactionTable'
import { DateSelector } from '../components/common/DateSelector'

export default function Expenses() {
  const { activeProperty: prop } = useProperty()
  const [duration, setDuration] = useState<'ytd' | 'all' | 'custom'>('ytd')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filters = useMemo(() => {
    if (duration === 'ytd') return { date_from: `${new Date().getFullYear()}-01-01` }
    if (duration === 'custom') return {
      date_from: customStart || undefined, 
      date_to: customEnd || undefined 
    }
    return {}
  }, [duration, customStart, customEnd])

  const { data: transactions, isLoading } = useTransactions(prop?.id ?? null, filters)

  const expenseData = useMemo(() => {
    if (!transactions) return []
    const expenses = transactions.filter(t => t.amount < 0)
    
    // Group by tag_name
    const grouped = expenses.reduce((acc, tx) => {
      const tag = tx.tag_name || 'Uncategorized'
      if (!acc[tag]) acc[tag] = 0
      acc[tag] += Math.abs(tx.amount) // Store positive magnitudes
      return acc
    }, {} as Record<string, number>)

    // Convert to array and sort descending
    return Object.entries(grouped)
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [transactions])

  const totalExpense = expenseData.reduce((sum, item) => sum + item.amount, 0)

  if (!prop) return <div className="empty-state" style={{ marginTop: 80 }}><p>No property found.</p></div>

  // Vibrant color palette for charts
  const colors = [
    'var(--red)', 'var(--orange)', 'var(--yellow)', 'var(--teal)',
    'var(--blue)', 'var(--purple)', 'var(--pink)', 'var(--green)'
  ]

  return (
    <main className="page-content" style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 'var(--h1-size, 2rem)', marginBottom: 8 }}>Expenses Breakdown</h1>
          <p style={{ color: 'var(--text-muted)' }}>Visualize cash out flows grouped by category.</p>
        </div>
        
        {/* Toggle Filter */}
        <div style={{ display: 'flex', background: 'var(--surface-2)', padding: 4, borderRadius: 'var(--radius-md)', alignSelf: 'flex-start' }}>
          <button 
            onClick={() => { setDuration('ytd'); setSelectedCategory(null); }}
            className={`btn btn-sm ${duration === 'ytd' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-sm)', flex: 1 }}>
            YTD
          </button>
          <button 
            onClick={() => { setDuration('all'); setSelectedCategory(null); }}
            className={`btn btn-sm ${duration === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-sm)', flex: 1 }}>
            All-Time
          </button>
          <button 
            onClick={() => { setDuration('custom'); setSelectedCategory(null); }}
            className={`btn btn-sm ${duration === 'custom' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-sm)', flex: 1 }}>
            Custom…
          </button>
        </div>
      </div>

      {/* Custom Date Filters */}
      {duration === 'custom' && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', background: 'var(--surface-1)' }}>
          <DateSelector 
            label="START" 
            value={customStart} 
            min={prop?.purchase_date}
            max={new Date().toISOString().split('T')[0]}
            onChange={val => {
              setCustomStart(val)
              if (customEnd && val > customEnd) setCustomEnd(val)
            }}
          />
          <DateSelector 
            label="END" 
            value={customEnd} 
            min={customStart || prop?.purchase_date}
            max={new Date().toISOString().split('T')[0]}
            align="right"
            onChange={setCustomEnd}
          />
          {(customStart || customEnd) && (
            <button className="btn btn-ghost btn-sm" style={{ flex: '0 0 auto', marginLeft: 'auto' }} onClick={() => { setCustomStart(''); setCustomEnd(''); }}>Clear Custom</button>
          )}
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading ledger...</div>
      ) : expenseData.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>📉</div>
          <h3>No expenses found</h3>
          <p style={{ color: 'var(--text-muted)' }}>You have no recorded expenses for {duration === 'ytd' ? 'this year' : duration === 'custom' ? 'this custom period' : 'all time'}.</p>
        </div>
      ) : (
        <>
          {/* Top Line KPI */}
          <div className="card" style={{ marginBottom: 32, textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
              {duration === 'ytd' ? `${new Date().getFullYear()} Total Expenses` : duration === 'custom' ? 'Custom Period Total Expenses' : 'Lifetime Total Expenses'}
            </div>
            <div style={{ fontSize: 'clamp(1.75rem, 8vw, 3rem)', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--red)' }}>
              {formatCurrency(totalExpense)}
            </div>
          </div>

          {/* Horizontal Bar Breakdown Segment */}
          <div className="card" style={{ marginBottom: 32 }}>
            <h3 className="section-title" style={{ marginBottom: 24, fontSize: '1.2rem' }}>Percentage Breakdown</h3>
            <div style={{ display: 'flex', height: 32, borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 20 }}>
              {expenseData.map((item, idx) => {
                const pct = (item.amount / totalExpense) * 100
                if (pct < 1) return null // Hide tiny slivers
                return (
                  <div key={item.label} style={{
                    width: `${pct}%`,
                    background: colors[idx % colors.length],
                    transition: 'width 0.3s ease',
                    borderRight: idx !== expenseData.length - 1 ? '2px solid var(--surface-1)' : 'none'
                  }} title={`${item.label}: ${formatCurrency(item.amount)}`} />
                )
              })}
            </div>
            
            {/* Legend grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
              {expenseData.map((item, idx) => {
                const pct = (item.amount / totalExpense) * 100
                if (pct < 1) return null
                return (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[idx % colors.length], flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label} ({pct.toFixed(0)}%)</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Line Item Detailed List */}
          <h3 className="section-title" style={{ marginBottom: 16 }}>Category Totals</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {expenseData.map((item, idx) => {
              const pct = (item.amount / totalExpense) * 100
              const isSelected = selectedCategory === item.label
              return (
                <div 
                  key={item.label} 
                  className="card" 
                  onClick={() => setSelectedCategory(isSelected ? null : item.label)}
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    padding: '12px 16px', 
                    borderTop: isSelected ? `2px solid var(--purple)` : '1px solid var(--border)',
                    borderBottom: isSelected ? `2px solid var(--purple)` : '1px solid var(--border)',
                    borderRight: isSelected ? `2px solid var(--purple)` : '1px solid var(--border)',
                    borderLeft: isSelected ? `2px solid var(--purple)` : `4px solid ${colors[idx % colors.length]}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    gap: 12
                  }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ background: 'var(--surface-3)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {pct.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{item.label}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700 }}>
                    {formatCurrency(item.amount)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Drill Down Ledger Modal */}
          {selectedCategory && (
            <div className="card" style={{ marginTop: 40, borderTop: '4px solid var(--border)', padding: 'var(--space-4) 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '0 var(--space-4)' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Ledger: {selectedCategory}</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedCategory(null)}>✕ Close</button>
              </div>
              <div className="table-responsive">
                <TransactionTable 
                  transactions={(transactions ?? []).filter(t => (t.tag_name || 'Uncategorized') === selectedCategory && t.amount < 0)} 
                  isLoading={isLoading} 
                />
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}
