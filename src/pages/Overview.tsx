import { useState, useMemo } from 'react'
import { useProperty } from '../contexts/PropertyContext'
import { useMetrics, useMonthlySummary, useActiveLease } from '../hooks/useData'
import { KpiCard, KpiRow } from '../components/kpi/KpiCard'
import clsx from 'clsx'
import { EquityPanels } from '../components/equity/EquityPanels'
import { LeaseTracker } from '../components/lease/LeaseTracker'
import { CashFlowChart } from '../components/charts/CashFlowChart'
import { InfoTooltip } from '../components/common/InfoTooltip'
import { useUpdatePropertyValue } from '../hooks/useData'
import { formatCurrency, formatDate, formatPct } from '../lib/utils'
import { computeInvestmentIntelligence } from '../lib/calculations'
import { METRIC_COUNT } from '../lib/metrics'
import { Link } from 'react-router-dom'
import { TransactionTable } from '../components/ledger/TransactionTable'
import { useTransactions } from '../hooks/useData'

function EditableValue({ label, value, sub, onSave }: {
  label: string; value: number | null; sub?: string; onSave: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const start = () => { setDraft(String(value ?? '')); setEditing(true) }
  const commit = () => { const n = parseFloat(draft); if (!isNaN(n) && n > 0) onSave(n); setEditing(false) }
  return (
    <div>
      <div className="form-label" style={{ marginBottom: 4 }}>{label}</div>
      {editing ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input autoFocus type="number" value={draft} onChange={e => setDraft(e.target.value)}
            onBlur={commit} onKeyDown={e => { if (e.key==='Enter') commit(); if (e.key==='Escape') setEditing(false) }}
            className="form-input mono" style={{ width: 160 }} />
          <button className="btn btn-primary btn-sm" onClick={commit}>Save</button>
        </div>
      ) : (
        <div className="editable-field" onClick={start} title="Click to edit">
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1.1rem' }}>
            {value != null ? formatCurrency(value) : '—'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>✎</span>
        </div>
      )}
      {sub && <div className="form-hint" style={{ marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function MetricTile({ label, value, sub, color, tooltip, linkTo }: {
  label: string; value: string; sub?: string; color?: string; tooltip?: string; linkTo?: string
}) {
  const content = (
    <div className={linkTo ? 'metric-tile-link' : ''} style={{ padding: '24px', background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)',
      borderTop: `4px solid ${color ?? 'var(--border)'}`, 
      display: 'flex', flexDirection: 'column', height: '100%',
      transition: 'transform 0.1s, box-shadow 0.1s', cursor: linkTo ? 'pointer' : 'default' }}>
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}
        {tooltip && <div onClick={e => e.preventDefault()}><InfoTooltip content={tooltip} /></div>}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.75rem', color: color ?? 'var(--text)', marginBottom: 'auto' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)', marginTop: 16, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  )
  return linkTo ? <Link to={linkTo} style={{ textDecoration: 'none', color: 'inherit' }}>{content}</Link> : content
}

export default function Overview() {
  const { activeProperty: prop } = useProperty()
  const { data: metrics, isLoading } = useMetrics(prop?.id ?? null)
  const { data: monthlySummary = [] } = useMonthlySummary(prop?.id ?? null)
  const activeLease = useActiveLease(prop?.id ?? null)
  const updateValue = useUpdatePropertyValue()

  // Activity section logic
  const [timeRange, setTimeRange] = useState<'30d' | '3m' | '6m' | 'ytd' | 'all'>('30d')


  const dateFrom = useMemo(() => {
    const d = new Date()
    if (timeRange === '30d') d.setDate(d.getDate() - 30)
    else if (timeRange === '3m') d.setMonth(d.getMonth() - 3)
    else if (timeRange === '6m') d.setMonth(d.getMonth() - 6)
    else if (timeRange === 'ytd') {
      d.setMonth(0); d.setDate(1) // Jan 1st
    } else {
      return undefined
    }
    return d.toISOString().split('T')[0]
  }, [timeRange])

  const { data: allActivityTxns = [], isLoading: txLoading } = useTransactions(prop?.id ?? null, { date_from: dateFrom })

  const activityTxns = useMemo(() => {
    return allActivityTxns.filter(tx => Math.abs(tx.amount) !== 94200)
  }, [allActivityTxns])

  const activitySummary = useMemo(() => {
    return activityTxns.reduce((acc, tx) => {
      // 🚨 Operational Cash Flow logic (matches v_monthly_summary and computeInvestmentIntelligence)
      // Exclude Down Payment and Closing Costs from operational P&L
      if (tx.tag_name === 'Down Payment' || tx.tag_name === 'Closing Costs') return acc

      let effectiveAmount = tx.amount
      
      if (effectiveAmount > 0) acc.income += effectiveAmount
      else acc.expenses += Math.abs(effectiveAmount)
      acc.cashflow += effectiveAmount
      return acc
    }, { income: 0, expenses: 0, cashflow: 0 })

  }, [activityTxns])

  const calc = computeInvestmentIntelligence(prop, metrics, activeLease, 1295.11)

  const summaryWithCumulative = useMemo(() => {
    if (!monthlySummary || monthlySummary.length === 0) return []
    // Sort chronological (oldest to newest) to get the trailing months
    const chronological = [...monthlySummary].sort((a, b) => a.month.localeCompare(b.month))
    let cum = 0
    return chronological.map(row => {
      // For operational display, treat principal as an expense (matching MonthlyBreakdown)
      const principal = row.principal_paid || 0
      const net = row.net_cash_flow - principal
      cum += net
      return {
        ...row,
        expenses: row.expenses - principal,
        net_cash_flow: net,
        cumulative_cf: cum
      }
    })
  }, [monthlySummary])

  const maintenanceTtmPct = useMemo(() => {
    if (!summaryWithCumulative || summaryWithCumulative.length === 0) return null
    const last12 = summaryWithCumulative.slice(-12)
    
    const totalMaintenance = last12.reduce((acc, row) => acc + (row.maintenance || 0), 0)
    const totalRent = last12.reduce((acc, row) => acc + (row.income || 0), 0)
    
    if (totalRent === 0) return 0
    return (totalMaintenance / totalRent) * 100
  }, [summaryWithCumulative])


  const latestSummary = summaryWithCumulative[summaryWithCumulative.length - 1]
  const realMonthlyCashFlow = latestSummary?.net_cash_flow
  const equityMonthlyBenefit = latestSummary ? (latestSummary.net_cash_flow + (latestSummary.principal_paid || 0)) : null

  if (!prop) return <div className="empty-state" style={{ marginTop: 80 }}><p>No property found.</p></div>



  return (
    <main className="page-content">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 'var(--h1-size, 1.5rem)' }}>{prop.address}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
          Purchased {formatDate(prop.purchase_date)} · {prop.loan_term_months / 12}yr @ {(prop.interest_rate * 100).toFixed(2)}% · {calc?.monthsOwned} months owned
        </p>
      </div>

      {/* ── Main KPIs ── */}
      <KpiRow>
        <Link to="/equity/net" style={{ textDecoration: 'none', color: 'inherit' }}>
          <KpiCard label="Net Equity" value={metrics?.net_equity} accent="var(--purple)" isLoading={isLoading}
            sub="Current value − loan − selling costs − all-in P&L" />
        </Link>
        <Link to="/equity/gross" style={{ textDecoration: 'none', color: 'inherit' }}>
          <KpiCard label="Gross Equity" value={metrics?.gross_equity} accent="var(--blue)" isLoading={isLoading}
            sub="Current value − remaining loan balance" />
        </Link>
        <KpiCard 
          label="Monthly Cash Flow" 
          value={realMonthlyCashFlow} 
          accent="var(--green)" 
          isLoading={isLoading}
          sub="Money in bank: Rent − (mortgage + expenses)" 
        />
        <KpiCard 
          label="Monthly Equity Benefit" 
          value={equityMonthlyBenefit} 
          accent="var(--indigo)" 
          isLoading={isLoading}
          sub="Wealth grow: Rent − (interest + escrow + expenses)" 
        />

        <Link to="/monthly?view=table" style={{ textDecoration: 'none', color: 'inherit' }}>
          <KpiCard 
            label="Cumulative CF" 
            value={summaryWithCumulative[summaryWithCumulative.length - 1]?.cumulative_cf} 
            accent="var(--teal)" 
            isLoading={isLoading}
            sub="All-time operational P&L (excl. closing costs & principal)" 
          />
        </Link>

        <KpiCard label="Vacancy Rate" value={metrics?.vacancy_rate_pct} accent="var(--yellow)" format="pct" isLoading={isLoading}
          sub="% of days vacant since purchase" />
        <Link to="/ledger?tag=Maintenance&tag=Rent Income" style={{ textDecoration: 'none', color: 'inherit' }}>
          <KpiCard label="Maintenance % (TTM)" value={maintenanceTtmPct} accent="var(--orange)" format="pct" isLoading={isLoading}
            sub="Maintenance vs Rent (Last 12 mo)" />
        </Link>
      </KpiRow>

      {/* ── Property value editors ── */}
      <div className="card" style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 24 }}>
        <EditableValue label="Value" value={prop.current_value}
          sub={prop.current_value_updated_at ? `Updated ${formatDate(prop.current_value_updated_at)}` : 'Not set'}
          onSave={v => updateValue.mutate({ propertyId: prop.id, value: v })} />
        <div>
          <div className="form-label" style={{ marginBottom: 4 }}>Remaining Loan Balance</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1.1rem' }}>
            {metrics ? formatCurrency(metrics.remaining_loan_balance) : '—'}
          </div>
          <div className="form-hint">From amortization · 5 payments made</div>
        </div>
        <div>
          <div className="form-label" style={{ marginBottom: 4 }}>Total Principal Paid</div>
          <div className="text-green" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1.1rem' }}>
            {metrics ? formatCurrency(metrics.total_principal_paid) : '—'}
          </div>
        </div>
        <div>
          <div className="form-label" style={{ marginBottom: 4 }}>Total Interest Paid</div>
          <div className="text-red" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1.1rem' }}>
            {metrics ? formatCurrency(metrics.total_interest_paid) : '—'}
          </div>
        </div>
      </div>

      {/* ── Investment Intelligence ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-header" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="section-title" style={{ display: 'inline-block', marginRight: 8 }}>Investment Intelligence</h3>
            <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>Health Snapshot</span>
          </div>
          <Link to="/intelligence/all" className="btn btn-secondary btn-sm">
            View all {METRIC_COUNT} metrics →
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          <MetricTile
            label="Total Annualized Return"
            linkTo="/intelligence/total-return"
            value={calc?.totalAnnualizedReturn != null ? `${formatPct(calc.totalAnnualizedReturn)}` : '—'}
            color="var(--purple)"
            sub="Cash flow + principal + appreciation"
            tooltip="Sum of Annual Cash Flow + Principal Paydown + Appreciation divided by your total cash deployed. This is the true metric of your wealth growth." />
          <MetricTile
            label="Cash-on-Cash Return"
            linkTo="/intelligence/coc"
            value={calc?.cocReturn != null ? `${calc.cocReturn.toFixed(1)}%` : '—'}
            color={calc?.cocReturn != null && calc.cocReturn > 0 ? 'var(--green)' : 'var(--red)'}
            sub={`${formatCurrency(calc?.annualCF ?? 0)}/yr on ${formatCurrency(calc?.totalDeployed ?? 0)} deployed`}
            tooltip="Annualized operational cash flow ÷ total cash invested. Excludes principal paydown and appreciation." />
          <MetricTile
            label="DSCR"
            linkTo="/intelligence/dscr"
            value={calc?.dscr != null ? calc.dscr.toFixed(2) : '—'}
            color={calc?.dscr != null && calc.dscr >= 1.25 ? 'var(--green)' : 'var(--orange)'}
            sub={`${calc?.dscr != null && calc.dscr >= 1.25 ? '✓ Bankable' : calc?.dscr != null && calc.dscr >= 1 ? 'Marginal' : '✗ Below 1.0'}`}
            tooltip="Debt Service Coverage Ratio = Annual NOI ÷ Annual mortgage payments." />
        </div>
      </div>

      {/* ── Equity Panels ── */}
      {metrics && (
        <div style={{ marginBottom: 24 }}>
          <EquityPanels
            metrics={metrics}
            closingCosts={prop.closing_costs}
            purchasePrice={prop.purchase_price}
            loanAmount={prop.loan_amount}
          />
        </div>
      )}

      {/* ── Cash Flow Chart ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 20 }}>Recent Cash Flow <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: 400 }}>— last 6 months</span></h3>
        <CashFlowChart data={summaryWithCumulative.slice(-6)} />
      </div>



      {/* ── Lease Tracker ── */}
      <LeaseTracker propertyId={prop.id} />

      {/* ── Activity Hub ── */}
      <section style={{ marginTop: 48 }}>
        <div className="section-header" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.25rem' }}>Activity</h2>
          <div className="toggle-group" style={{ marginLeft: 'auto' }}>
            {(['30d', '3m', '6m', 'ytd', 'all'] as const).map(range => (
              <button
                key={range}
                className={clsx('toggle-btn', timeRange === range && 'active')}
                onClick={() => setTimeRange(range)}
                style={{ textTransform: 'uppercase', fontSize: '0.7rem', padding: '6px 12px' }}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20, padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Income:</span>
            <span className="td-mono text-green" style={{ fontWeight: 600 }}>{formatCurrency(activitySummary.income)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Expenses:</span>
            <span className="td-mono text-red" style={{ fontWeight: 600 }}>{formatCurrency(-activitySummary.expenses)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Net CF:</span>
            <span className={clsx('td-mono', activitySummary.cashflow >= 0 ? 'text-green' : 'text-red')} style={{ fontWeight: 700 }}>
              {formatCurrency(activitySummary.cashflow)}
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: '0 0 var(--space-4) 0' }}>
          <TransactionTable transactions={activityTxns} isLoading={txLoading} />
        </div>
      </section>
    </main>
  )
}
