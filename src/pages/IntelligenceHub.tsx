import { useState } from 'react'
import { useProperty } from '../contexts/PropertyContext'
import { useMetrics, useActiveLease } from '../hooks/useData'
import { computeInvestmentIntelligence } from '../lib/calculations'
import { formatCurrency, formatPct } from '../lib/utils'
import { Link, useNavigate } from 'react-router-dom'
import { InfoTooltip } from '../components/common/InfoTooltip'

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

type Health = 'healthy' | 'warning' | 'critical' | 'info' | 'unknown'

interface MetricConfig {
  key: string
  label: string
  valueFormat: string
  color: string
  sub: string
  tooltip: string
  linkTo: string
  health: Health
}

export default function IntelligenceHub() {
  const navigate = useNavigate()
  const { activeProperty: prop } = useProperty()
  const { data: metrics } = useMetrics(prop?.id ?? null)
  const activeLease = useActiveLease(prop?.id ?? null)

  const [simRent, setSimRent] = useState<string>('')
  const [simValue, setSimValue] = useState<string>('')
  const [simOpEx, setSimOpEx] = useState<string>('')

  // Parse simulated values
  const r = simRent ? parseFloat(simRent) : undefined
  const v = simValue ? parseFloat(simValue) : undefined
  const o = simOpEx ? parseFloat(simOpEx) : undefined

  const calc = prop ? computeInvestmentIntelligence(prop, metrics, activeLease, 1295.11, r, v, o) : null

  if (!prop || !calc) {
    return <div className="empty-state" style={{ marginTop: 80 }}><p>Loading...</p></div>
  }

  // Define evaluating logic
  const items: MetricConfig[] = []

  // 1. Total Annualized Return
  const tar = calc.totalAnnualizedReturn
  let tarHealth: Health = 'unknown'
  if (tar != null) tarHealth = tar >= 12 ? 'healthy' : tar >= 8 ? 'warning' : 'critical'
  items.push({
    key: 'tar', label: "Total Annualized Return (IRR)", linkTo: "/intelligence/total-return",
    valueFormat: tar != null ? formatPct(tar) : '—', color: "var(--purple)",
    sub: "Cash flow + principal + appreciation",
    tooltip: "Sum of Annual Cash Flow + Principal Paydown + Appreciation divided by your total cash deployed.",
    health: tarHealth
  })

  // 2. Cash-on-Cash Return
  const coc = calc.cocReturn
  let cocHealth: Health = 'unknown'
  if (coc != null) cocHealth = coc >= 8 ? 'healthy' : coc >= 5 ? 'warning' : 'critical'
  items.push({
    key: 'coc', label: "Cash-on-Cash Return", linkTo: "/intelligence/coc",
    valueFormat: coc != null ? formatPct(coc) : '—', color: cocHealth === 'healthy' ? 'var(--green)' : 'var(--text)',
    sub: `${formatCurrency(calc.annualCF ?? 0)}/yr on ${formatCurrency(calc.totalDeployed)} deployed`,
    tooltip: "Annualized operational cash flow ÷ total cash invested.",
    health: cocHealth
  })

  // 3. DSCR
  const dscr = calc.dscr
  let dscrHealth: Health = 'unknown'
  if (dscr != null) dscrHealth = dscr >= 1.25 ? 'healthy' : dscr >= 1.0 ? 'warning' : 'critical'
  items.push({
    key: 'dscr', label: "DSCR", linkTo: "/intelligence/dscr",
    valueFormat: dscr != null ? dscr.toFixed(2) : '—', color: dscrHealth === 'healthy' ? 'var(--green)' : 'var(--text)',
    sub: dscr != null && dscr >= 1.25 ? '✓ Bankable' : dscr != null && dscr >= 1 ? 'Marginal' : '✗ Below 1.0',
    tooltip: "Debt Service Coverage Ratio. Represents how comfortably your net rental income covers the mortgage.",
    health: dscrHealth
  })

  // 4. Return on Equity (ROE)
  const roe = calc.roe
  let roeHealth: Health = 'unknown'
  if (roe != null) roeHealth = roe >= 8 ? 'healthy' : roe >= 4 ? 'warning' : 'critical'
  items.push({
    key: 'roe', label: "Return on Equity (ROE)", linkTo: "/intelligence/roe",
    valueFormat: roe != null ? formatPct(roe) : '—', color: "var(--yellow)",
    sub: `Yield on your $${((calc.capitalizedNetEq ?? 0)/1000).toFixed(1)}k net equity`,
    tooltip: "Cash flow divided by current net equity.",
    health: roeHealth
  })

  // 5. Cap Rate
  const cap = calc.capRate
  let capHealth: Health = 'unknown'
  if (cap != null) capHealth = cap >= 5.5 ? 'healthy' : cap >= 4 ? 'warning' : 'critical'
  items.push({
    key: 'cap', label: "Cap Rate", linkTo: "/intelligence/cap-rate",
    valueFormat: cap != null ? formatPct(cap) : '—', color: "var(--blue)",
    sub: `NOI ${formatCurrency(calc.noi)}/yr ÷ property value`,
    tooltip: "Net Operating Income ÷ property value. Measures yield independent of financing.",
    health: capHealth
  })

  // 6. Gross Yield (GRM)
  const grm = calc.grm
  let grmHealth: Health = 'unknown'
  if (grm != null) grmHealth = grm >= 8 ? 'healthy' : grm >= 5 ? 'warning' : 'critical'
  items.push({
    key: 'grm', label: "Gross Yield (GRM)", linkTo: "/intelligence/grm",
    valueFormat: grm != null ? formatPct(grm) : '—', color: "var(--pink)",
    sub: `$${((calc.annualRent)/1000).toFixed(1)}k rent on $${((prop.current_value ?? prop.purchase_price)/1000).toFixed(1)}k value`,
    tooltip: "High-level heuristic: Gross annual rent divided by property value.",
    health: grmHealth
  })

  // 7. Break-Even Occupancy
  const beoc = calc.breakEvenOccupancy
  let beHealth: Health = 'unknown'
  if (beoc != null) beHealth = beoc <= 75 ? 'healthy' : beoc <= 85 ? 'warning' : 'critical'
  items.push({
    key: 'beo', label: "Break-Even Occupancy", linkTo: "/intelligence/breakeven-occupancy",
    valueFormat: beoc != null ? formatPct(beoc) : '—', color: "var(--teal)",
    sub: "How empty forces negative CF",
    tooltip: "The percentage of the year the property must be rented just to cover all operational and debt expenses.",
    health: beHealth
  })

  // 8. OER
  const oer = calc.oer
  let oerHealth: Health = 'unknown'
  if (oer != null) oerHealth = oer <= 45 ? 'healthy' : oer <= 55 ? 'warning' : 'critical'
  items.push({
    key: 'oer', label: "Operating Expense Ratio (OER)", linkTo: "/intelligence/oer",
    valueFormat: oer != null ? formatPct(oer) : '—', color: "var(--red)",
    sub: "OpEx as percent of revenue",
    tooltip: "Operational expenses divided by gross rent. Rule of thumb is 50% for standard rentals.",
    health: oerHealth
  })

  // 9. Principal Paydown Yield
  const ppy = calc.principalPaydownYield
  let ppyHealth: Health = 'unknown'
  if (ppy != null) ppyHealth = ppy >= 3 ? 'healthy' : ppy >= 1.5 ? 'warning' : 'critical'
  items.push({
    key: 'ppy', label: "Principal Paydown Yield", linkTo: "/intelligence/principal-yield",
    valueFormat: ppy != null ? formatPct(ppy) : '—', color: "var(--green)",
    sub: "The silent return of debt amortization",
    tooltip: "Your tenant paying down your mortgage principal translates strictly to equity yield relative to your deploy.",
    health: ppyHealth
  })

  // 10. Equity Multiple (Info/Health blended)
  const em = calc.equityMultiple
  let emHealth: Health = 'info'
  if (em != null) emHealth = em >= 1.5 ? 'healthy' : em >= 1.0 ? 'warning' : 'critical'
  items.push({
    key: 'em', label: "Equity Multiple", linkTo: "/intelligence/equity-multiple",
    valueFormat: em != null ? `${em.toFixed(2)}×` : '—', color: "var(--purple)",
    sub: "(Net equity + cash deployed) ÷ cash deployed",
    tooltip: "How much your overall capital has grown across all vectors combined.",
    health: emHealth
  })

  // 11. Total Cash Deployed (Info)
  items.push({
    key: 'tcd', label: "Total Cash Deployed", linkTo: "/intelligence/cash-deployed",
    valueFormat: formatCurrency(calc.totalDeployed), color: "var(--yellow)",
    sub: `$${(calc.downPayment/1000).toFixed(0)}k down + $${(prop.closing_costs/1000).toFixed(1)}k closing`,
    tooltip: "All cash you put in. This sets the denominator for almost all yield calculations.",
    health: 'info'
  })

  // 12. Interest:Principal Ratio (Info)
  items.push({
    key: 'ipr', label: "Interest:Principal Ratio", linkTo: "/intelligence/interest-ratio",
    valueFormat: calc.interestRatio != null ? `${calc.interestRatio.toFixed(1)}:1` : '—', color: "var(--orange)",
    sub: `$${((metrics?.total_interest_paid ?? 0)/1000).toFixed(1)}k interest per $${((metrics?.total_principal_paid ?? 0)/1000).toFixed(1)}k principal`,
    tooltip: "How much of your mortgage payment goes to the bank vs your own equity bucket.",
    health: 'info'
  })

  // Grouping
  const healthyItems = items.filter(i => i.health === 'healthy')
  const warningItems = items.filter(i => i.health === 'warning')
  const criticalItems = items.filter(i => i.health === 'critical')
  const infoItems = items.filter(i => i.health === 'info' || i.health === 'unknown')

  return (
    <main className="page-content">
      <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ paddingLeft: 0, marginBottom: 24, alignSelf: 'flex-start' }}>
        ← Back to Overview
      </button>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Investment Intelligence Hub</h1>
        <p style={{ color: 'var(--text-muted)' }}>Metrics are evaluated against established real estate industry benchmarks.</p>
      </div>

      {/* Scenario Simulator Panel */}
      <div className="card" style={{ marginBottom: 40, border: '2px solid var(--purple)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: 8 }}>
              ✨ Scenario Simulator
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Tweak numbers to see how it instantly affects property health.</p>
          </div>
          {(simRent || simValue || simOpEx) && (
            <button className="btn btn-outline btn-sm" onClick={() => { setSimRent(''); setSimValue(''); setSimOpEx('') }}>
              Reset Values
            </button>
          )}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          <div>
            <label className="form-label">Monthly Rent</label>
            <input type="number" className="form-input" 
              placeholder={activeLease?.monthly_rent.toString() ?? '1200'} 
              value={simRent} onChange={e => setSimRent(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Property Value</label>
            <input type="number" className="form-input" 
              placeholder={(prop?.current_value ?? prop?.purchase_price ?? 0).toString()} 
              value={simValue} onChange={e => setSimValue(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Annual Operating Exp.</label>
            <input type="number" className="form-input" 
              placeholder={((metrics?.management_cost_ttm ?? 0) * (12/Math.max(1, calc?.monthsOwned??1)) + (prop?.hoa_amount??0)).toFixed(0)} 
              value={simOpEx} onChange={e => setSimOpEx(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>

        {/* 🟢 Healthy */}
        {healthyItems.length > 0 && (
          <section>
            <h2 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 20, color: 'var(--green)' }}>
              🟢 Excellent & Healthy <span style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: 400, marginLeft: 8 }}>Exceeding market benchmarks</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              {healthyItems.map(item => {
                const { key, valueFormat, health, ...props } = item
                return <MetricTile key={key} {...props} value={valueFormat} />
              })}
            </div>
          </section>
        )}

        {/* 🟡 Monitor */}
        {warningItems.length > 0 && (
          <section>
            <h2 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 20, color: 'var(--yellow)' }}>
              🟡 Borderline & Monitor <span style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: 400, marginLeft: 8 }}>Within standard deviation of targets</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              {warningItems.map(item => {
                const { key, valueFormat, health, ...props } = item
                return <MetricTile key={key} {...props} value={valueFormat} />
              })}
            </div>
          </section>
        )}

        {/* 🔴 Critical */}
        {criticalItems.length > 0 && (
          <section>
            <h2 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 20, color: 'var(--red)' }}>
              🔴 Needs Attention <span style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: 400, marginLeft: 8 }}>Drastically failing industry benchmarks</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              {criticalItems.map(item => {
                const { key, valueFormat, health, ...props } = item
                return <MetricTile key={key} {...props} value={valueFormat} />
              })}
            </div>
          </section>
        )}

        {/* ⚪ Informational */}
        {infoItems.length > 0 && (
          <section>
            <h2 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 20, color: 'var(--text-muted)' }}>
              ⚪ Contextual Factors
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              {infoItems.map(item => {
                const { key, valueFormat, health, ...props } = item
                return <MetricTile key={key} {...props} value={valueFormat} />
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
