import { useState, useMemo, Fragment } from 'react'

import { useProperty } from '../contexts/PropertyContext'
import { useTransactions, useTags } from '../hooks/useData'
import { formatCurrency } from '../lib/utils'

// Helper to get all months between two dates
const getMonthsInRange = (start: string, end: string) => {
  const months: string[] = []
  let current = new Date(start + '-01T00:00:00')
  const last = new Date(end + '-01T00:00:00')

  while (current <= last) {
    months.push(current.toISOString().substring(0, 7))
    current.setMonth(current.getMonth() + 1)
  }
  return months
}

const formatMonthHeader = (m: string) => {
  const [yy, mm] = m.split('-')
  const date = new Date(Number(yy), Number(mm) - 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function IncomeStatement() {
  const { activePropertyId: propId } = useProperty()
  
  // Default range: Last 6 months from current local month
  const now = new Date()
  const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  
  const startD = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const start = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}`
  
  const [startMonth, setStartMonth] = useState(start)
  const [endMonth, setEndMonth]     = useState(end)


  const months = useMemo(() => getMonthsInRange(startMonth, endMonth), [startMonth, endMonth])
  
  const { data: transactions = [], isLoading: txLoading } = useTransactions(propId, {
    date_from: `${startMonth}-01`,
    date_to: (() => {
      const [yy, mm] = endMonth.split('-')
      const lastDay = new Date(Number(yy), Number(mm), 0).getDate()
      return `${endMonth}-${lastDay}`
    })()
  })

  
  const { data: tags = [] } = useTags(propId)

  const reportData = useMemo(() => {
    if (!transactions.length || !tags.length) return null

    const tagToCategory = new Map(tags.map(t => [t.name, t.category]))
    
    // Structure: category -> group -> tag -> month -> amount
    const tree: any = { income: {}, expense: {} }

    transactions.forEach(tx => {
      const cat = tagToCategory.get(tx.tag_name) || (tx.amount > 0 ? 'income' : 'expense')
      if (cat === 'equity') return // Skip equity for P&L
      
      const month = tx.date.substring(0, 7)
      
      // Parse hierarchy from tag name (e.g. "Utilities - Electricity")
      const delimiters = [' — ', ' - ', ': ', '/']
      let groupName = 'General'
      let leafName = tx.tag_name

      for (const d of delimiters) {
        if (tx.tag_name.includes(d)) {
          const parts = tx.tag_name.split(d)
          groupName = parts[0]
          leafName = parts[1]
          break
        }
      }

      // Handle Rental Income specifically if needed (optional refinement)
      if (tx.tag_name === 'Rent Income') {
        groupName = 'Rental Income'
        leafName = 'Rent'
      }

      if (!tree[cat][groupName]) tree[cat][groupName] = {}
      if (!tree[cat][groupName][leafName]) {
        tree[cat][groupName][leafName] = {}
        months.forEach(m => tree[cat][groupName][leafName][m] = 0)
      }
      
      tree[cat][groupName][leafName][month] += tx.amount
    })

    return tree
  }, [transactions, tags, months])

  if (!propId) return <div className="page-content">Please select a property.</div>

  return (
    <main className="page-content">
      <div className="section-header" style={{ marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.25rem' }}>Income Statement</h1>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginLeft: 'auto' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <input type="month" className="form-input" value={startMonth} 
              onChange={e => setStartMonth(e.target.value)} />
          </div>
          <span style={{ color: 'var(--text-muted)' }}>to</span>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <input type="month" className="form-input" value={endMonth} 
              onChange={e => setEndMonth(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive" style={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
          <table className="is-table">
            <thead>
              <tr className="is-header-row">
                <th style={{ position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 10, minWidth: 200 }}>Account</th>
                {months.map(m => (
                  <th key={m} style={{ textAlign: 'right', minWidth: 100 }}>{formatMonthHeader(m)}</th>
                ))}
                <th style={{ textAlign: 'right', minWidth: 120, borderLeft: '1px solid var(--border)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {txLoading ? (
                <tr><td colSpan={months.length + 2} style={{ textAlign: 'center', padding: 40 }}>Loading data…</td></tr>
              ) : !reportData ? (
                <tr><td colSpan={months.length + 2} style={{ textAlign: 'center', padding: 40 }}>No data for this range.</td></tr>
              ) : (
                <>
                  {/* INCOME SECTION */}
                  <tr className="is-cat-header"><td colSpan={months.length + 2}>Operating Income & Expense</td></tr>
                  <tr className="is-group-header" style={{ paddingLeft: 20 }}><td colSpan={months.length + 2}>Income</td></tr>
                  
                  {Object.entries(reportData.income).map(([group, leaves]: [string, any]) => {
                    const groupTotals = months.reduce((acc, m) => {
                      acc[m] = Object.values(leaves).reduce((sum, leaf: any) => sum + (leaf[m] || 0), 0)
                      return acc
                    }, {} as any)
                    const groupGrandTotal = Object.values(groupTotals).reduce((a: any, b: any) => a + b, 0) as number

                    return (
                      <Fragment key={group}>
                        <tr className="is-subgroup-header">
                          <td style={{ paddingLeft: 40 }}>{group}</td>
                          {months.map(m => <td key={m} style={{ textAlign: 'right' }}>{formatCurrency(groupTotals[m])}</td>)}
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(groupGrandTotal)}</td>
                        </tr>
                        {Object.entries(leaves).map(([leaf, monthVals]: [string, any]) => {
                          const leafTotal = Object.values(monthVals).reduce((a: any, b: any) => a + b, 0) as number
                          return (
                            <tr key={leaf} className="is-leaf-row">
                              <td style={{ paddingLeft: 60, color: 'var(--text-muted)' }}>{leaf}</td>
                              {months.map(m => <td key={m} style={{ textAlign: 'right' }}>{formatCurrency(monthVals[m])}</td>)}
                              <td style={{ textAlign: 'right', borderLeft: '1px solid var(--border-subtle)' }}>{formatCurrency(leafTotal)}</td>
                            </tr>
                          )
                        })}
                      </Fragment>
                    )
                  })}

                  {/* Income Totals */}
                  <tr className="is-total-row">
                    <td style={{ paddingLeft: 20 }}>Total Operating Income</td>
                    {months.map(m => {
                      const mTotal = Object.values(reportData.income).reduce((sum, leaves: any) => 
                        sum + Object.values(leaves).reduce((s, leaf: any) => s + (leaf[m] || 0), 0)
                      , 0) as number
                      return <td key={m} style={{ textAlign: 'right' }}>{formatCurrency(mTotal)}</td>
                    })}
                    <td style={{ textAlign: 'right' }}>
                      {formatCurrency(Object.values(reportData.income).reduce((sum, leaves: any) => 
                        sum + Object.values(leaves).reduce((s, leaf: any) => s + Object.values(leaf).reduce((a:any,b:any)=>a+b,0), 0)
                      , 0) as number)}
                    </td>
                  </tr>

                  {/* EXPENSE SECTION */}
                  <tr className="is-group-header" style={{ paddingTop: 20 }}><td colSpan={months.length + 2}>Expense</td></tr>
                  
                  {Object.entries(reportData.expense).map(([group, leaves]: [string, any]) => {
                    const groupTotals = months.reduce((acc, m) => {
                      acc[m] = Object.values(leaves).reduce((sum, leaf: any) => sum + (leaf[m] || 0), 0)
                      return acc
                    }, {} as any)
                    const groupGrandTotal = Object.values(groupTotals).reduce((a: any, b: any) => a + b, 0) as number

                    return (
                      <Fragment key={group}>
                        <tr className="is-subgroup-header">
                          <td style={{ paddingLeft: 40 }}>{group}</td>
                          {months.map(m => <td key={m} style={{ textAlign: 'right' }}>{formatCurrency(Math.abs(groupTotals[m]))}</td>)}
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(Math.abs(groupGrandTotal))}</td>
                        </tr>
                        {Object.entries(leaves).map(([leaf, monthVals]: [string, any]) => {
                          const leafTotal = Object.values(monthVals).reduce((a: any, b: any) => a + b, 0) as number
                          return (
                            <tr key={leaf} className="is-leaf-row">
                              <td style={{ paddingLeft: 60, color: 'var(--text-muted)' }}>{leaf}</td>
                              {months.map(m => <td key={m} style={{ textAlign: 'right' }}>{formatCurrency(Math.abs(monthVals[m]))}</td>)}
                              <td style={{ textAlign: 'right', borderLeft: '1px solid var(--border-subtle)' }}>{formatCurrency(Math.abs(leafTotal))}</td>
                            </tr>
                          )
                        })}
                      </Fragment>
                    )
                  })}

                  {/* Expense Totals */}
                  <tr className="is-total-row">
                    <td style={{ paddingLeft: 20 }}>Total Operating Expense</td>
                    {months.map(m => {
                      const mTotal = Object.values(reportData.expense).reduce((sum, leaves: any) => 
                        sum + Object.values(leaves).reduce((s, leaf: any) => s + (leaf[m] || 0), 0)
                      , 0) as number
                      return <td key={m} style={{ textAlign: 'right' }}>{formatCurrency(Math.abs(mTotal))}</td>
                    })}
                    <td style={{ textAlign: 'right' }}>
                      {formatCurrency(Math.abs(Object.values(reportData.expense).reduce((sum, leaves: any) => 
                        sum + Object.values(leaves).reduce((s, leaf: any) => s + Object.values(leaf).reduce((a:any,b:any)=>a+b,0), 0)
                      , 0) as number))}
                    </td>
                  </tr>

                  {/* NET INCOME */}
                  <tr className="is-net-row">
                    <td style={{ paddingLeft: 20 }}>Net Operating Income (NOI)</td>
                    {months.map(m => {
                      const inc = Object.values(reportData.income).reduce((sum, leaves: any) => 
                        sum + Object.values(leaves).reduce((s, leaf: any) => s + (leaf[m] || 0), 0)
                      , 0) as number
                      const exp = Object.values(reportData.expense).reduce((sum, leaves: any) => 
                        sum + Object.values(leaves).reduce((s, leaf: any) => s + (leaf[m] || 0), 0)
                      , 0) as number
                      return <td key={m} style={{ textAlign: 'right' }}>{formatCurrency(inc + exp)}</td>
                    })}
                    <td style={{ textAlign: 'right', borderTop: '2px solid var(--text)' }}>
                      {formatCurrency(
                        Object.values(reportData.income).reduce((sum, leaves: any) => 
                          sum + Object.values(leaves).reduce((s, leaf: any) => s + Object.values(leaf).reduce((a:any,b:any)=>a+b,0), 0)
                        , 0) as number +
                        Object.values(reportData.expense).reduce((sum, leaves: any) => 
                          sum + Object.values(leaves).reduce((s, leaf: any) => s + Object.values(leaf).reduce((a:any,b:any)=>a+b,0), 0)
                        , 0) as number
                      )}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .is-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
        .is-table th, .is-table td { padding: 10px 14px; border-bottom: 1px solid var(--border-subtle); }
        .is-header-row th { background: var(--surface-2); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; color: var(--text-muted); }
        
        .is-cat-header td { font-weight: 800; text-transform: uppercase; background: var(--surface-2); font-size: 0.75rem; border-bottom: 2px solid var(--border); padding: 12px 14px; }
        .is-group-header td { font-weight: 700; color: var(--text); padding-top: 24px; border-bottom: none; }
        .is-subgroup-header td { font-weight: 600; color: var(--text); background: var(--surface-3); }
        .is-leaf-row td { font-size: 0.8125rem; }
        
        .is-total-row td { font-weight: 700; background: var(--surface-2); border-top: 1px solid var(--border); margin-top: 8px; }
        .is-net-row td { font-weight: 800; font-size: 0.9375rem; padding-top: 20px; padding-bottom: 20px; color: var(--text); border-bottom: none; }
        
        .page-content { overflow-x: hidden; }
      `}</style>
    </main>
  )
}


