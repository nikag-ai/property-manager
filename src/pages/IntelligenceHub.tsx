import { useState, useMemo } from 'react'
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
type Category = 'Returns' | 'Efficiency' | 'Risk' | 'Wealth'

interface MetricConfig {
  key: string
  label: string
  value: string
  sub: string
  tooltip: string
  color: string
  health: Health
  category: Category
  performanceScore: number // 3=Healthy, 2=Warning, 1=Critical, 0=Info
  linkTo: string
}

export default function IntelligenceHub() {
  const navigate = useNavigate()
  const { activeProperty: prop } = useProperty()
  const { data: metrics } = useMetrics(prop?.id ?? null)
  const activeLease = useActiveLease(prop?.id ?? null)

  const [simRent, setSimRent] = useState<string>('')
  const [simValue, setSimValue] = useState<string>('')
  const [simOpEx, setSimOpEx] = useState<string>('')

  const r = simRent ? parseFloat(simRent) : undefined
  const v = simValue ? parseFloat(simValue) : undefined
  const o = simOpEx ? parseFloat(simOpEx) : undefined

  const calc = prop ? computeInvestmentIntelligence(prop, metrics, activeLease, 1295.11, r, v, o) : null

  const items = useMemo(() => {
    if (!prop || !calc) return []

    const list: MetricConfig[] = []

    // 1. Returns & Yields
    const tar = calc.totalAnnualizedReturn
    list.push({
      key: 'tar', label: "Total Annualized Return", value: tar != null ? formatPct(tar) : '—',
      sub: "Combined IRR from all vectors", tooltip: "Sum of Cash Flow + Principal + Appreciation divided by total deployed.",
      color: "var(--purple)", category: 'Returns', performanceScore: tar != null ? (tar >= 12 ? 3 : tar >= 8 ? 2 : 1) : 0,
      health: tar != null ? (tar >= 12 ? 'healthy' : tar >= 8 ? 'warning' : 'critical') : 'unknown',
      linkTo: "/intelligence/total-return"
    })

    const coc = calc.cocReturn
    list.push({
      key: 'coc', label: "Cash-on-Cash Return", value: coc != null ? formatPct(coc) : '—',
      sub: "Operational cash yield", tooltip: "Annualized operational cash flow ÷ total cash invested.",
      color: "var(--green)", category: 'Returns', performanceScore: coc != null ? (coc >= 8 ? 3 : coc >= 5 ? 2 : 1) : 0,
      health: coc != null ? (coc >= 8 ? 'healthy' : coc >= 5 ? 'warning' : 'critical') : 'unknown',
      linkTo: "/intelligence/coc"
    })

    const roe = calc.roe
    list.push({
      key: 'roe', label: "Return on Equity (ROE)", value: roe != null ? formatPct(roe) : '—',
      sub: "Efficiency of locked capital", tooltip: "Cash flow divided by current net equity.",
      color: "var(--yellow)", category: 'Returns', performanceScore: roe != null ? (roe >= 8 ? 3 : roe >= 4 ? 2 : 1) : 0,
      health: roe != null ? (roe >= 8 ? 'healthy' : roe >= 4 ? 'warning' : 'critical') : 'unknown',
      linkTo: "/intelligence/roe"
    })

    const yoc = calc.yoc
    list.push({
      key: 'yoc', label: "Yield on Cost (YOC)", value: yoc != null ? formatPct(yoc) : '—',
      sub: "NOI relative to original basis", tooltip: "Current NOI divided by your original purchase price plus closing costs.",
      color: "var(--teal)", category: 'Returns', performanceScore: yoc != null ? (yoc >= 6 ? 3 : yoc >= 4.5 ? 2 : 1) : 0,
      health: yoc != null ? (yoc >= 6 ? 'healthy' : yoc >= 4.5 ? 'warning' : 'critical') : 'unknown',
      linkTo: "/intelligence/yoc"
    })

    const em = calc.equityMultiple
    list.push({
      key: 'em', label: "Equity Multiple", value: em != null ? `${em.toFixed(2)}×` : '—',
      sub: "Total capital growth factor", tooltip: "(Net equity + cash deployed) ÷ cash deployed.",
      color: "var(--purple)", category: 'Returns', performanceScore: em != null ? (em >= 1.5 ? 3 : em >= 1.2 ? 2 : 1) : 0,
      health: em != null ? (em >= 1.5 ? 'healthy' : em >= 1.2 ? 'warning' : 'critical') : 'unknown',
      linkTo: "/intelligence/equity-multiple"
    })

    // 2. Efficiency & Operations
    const cap = calc.capRate
    list.push({
      key: 'cap', label: "Cap Rate (Market)", value: cap != null ? formatPct(cap) : '—',
      sub: "Unleveraged yield on value", tooltip: "Net Operating Income ÷ property value.",
      color: "var(--blue)", category: 'Efficiency', performanceScore: cap != null ? (cap >= 5.5 ? 3 : cap >= 4 ? 2 : 1) : 0,
      health: cap != null ? (cap >= 5.5 ? 'healthy' : cap >= 4 ? 'warning' : 'critical') : 'unknown',
      linkTo: "/intelligence/cap-rate"
    })

    const rtv = calc.rtv
    list.push({
      key: 'rtv', label: "Rent-to-Value (RTV)", value: rtv != null ? formatPct(rtv) : '—',
      sub: "Gross monthly rental efficiency", tooltip: "Monthly Rent ÷ property value. Target is usually 0.7% to 1.0% in common markets.",
      color: "var(--pink)", category: 'Efficiency', performanceScore: rtv != null ? (rtv >= 0.7 ? 3 : rtv >= 0.5 ? 2 : 1) : 0,
      health: rtv != null ? (rtv >= 0.7 ? 'healthy' : rtv >= 0.5 ? 'warning' : 'critical') : 'unknown',
      linkTo: "/intelligence/rtv"
    })

    const oer = calc.oer
    list.push({
      key: 'oer', label: "Expense Ratio (OER)", value: oer != null ? formatPct(oer) : '—',
      sub: "Operational overhead efficiency", tooltip: "Operational expenses divided by gross rent.",
      color: "var(--red)", category: 'Efficiency', performanceScore: oer != null ? (oer <= 45 ? 3 : oer <= 55 ? 2 : 1) : 0,
      health: oer != null ? (oer <= 45 ? 'healthy' : oer <= 55 ? 'warning' : 'critical') : 'unknown',
      linkTo: "/intelligence/oer"
    })

    const intens = calc.expenseIntensity
    list.push({
      key: 'intensity', label: "Expense Intensity", value: intens != null ? formatPct(intens) : '—',
      sub: "Mgmt/Maintenance % of Revenue", tooltip: "Combined maintenance and management costs relative to revenue.",
      color: "var(--orange)", category: 'Efficiency', performanceScore: intens != null ? (intens <= 15 ? 3 : intens <= 25 ? 2 : 1) : 0,
      health: intens != null ? (intens <= 15 ? 'healthy' : intens <= 25 ? 'warning' : 'critical') : 'unknown',
      linkTo: "/intelligence/intensity"
    })

    const adjCap = calc.adjustedCapRate
    list.push({
      key: 'adjCap', label: "Adjusted Cap Rate", value: adjCap != null ? formatPct(adjCap) : '—',
      sub: "NOI including 5% CapEx reserve", tooltip: "More realistic Cap Rate that accounts for long-term physical asset needs.",
      color: "var(--indigo)", category: 'Efficiency', performanceScore: adjCap != null ? (adjCap >= 5.0 ? 3 : adjCap >= 3.5 ? 2 : 1) : 0,
      health: adjCap != null ? (adjCap >= 5.0 ? 'healthy' : adjCap >= 3.5 ? 'warning' : 'critical') : 'unknown',
      linkTo: "/intelligence/adjusted-cap"
    })

    // 3. Risk & Leverage
    const dscr = calc.dscr
    list.push({
      key: 'dscr', label: "DSCR", value: dscr != null ? dscr.toFixed(2) : '—',
      sub: "Debt coverage safety margin", tooltip: "Debt Service Coverage Ratio. Represents bankability and risk.",
      color: "var(--green)", category: 'Risk', performanceScore: dscr != null ? (dscr >= 1.25 ? 3 : dscr >= 1.0 ? 2 : 1) : 0,
      health: dscr != null ? (dscr >= 1.25 ? 'healthy' : dscr >= 1.0 ? 'warning' : 'critical') : 'unknown',
      linkTo: "/intelligence/dscr"
    })

    const ltv = calc.ltv
    list.push({
      key: 'ltv', label: "Current LTV", value: ltv != null ? formatPct(ltv) : '—',
      sub: "Real-time leverage level", tooltip: "Remaining loan balance divided by current property value.",
      color: "var(--blue)", category: 'Risk', performanceScore: ltv != null ? (ltv <= 70 ? 3 : ltv <= 85 ? 2 : 1) : 0,
      health: ltv != null ? (ltv <= 70 ? 'healthy' : ltv <= 85 ? 'warning' : 'critical') : 'unknown',
      linkTo: "/intelligence/ltv"
    })

    const dy = calc.debtYield
    list.push({
      key: 'debtYield', label: "Debt Yield", value: dy != null ? formatPct(dy) : '—',
      sub: "Income coverage of total loan", tooltip: "NOI ÷ Loan Amount. Measures risk regardless of interest rates.",
      color: "var(--teal)", category: 'Risk', performanceScore: dy != null ? (dy >= 10 ? 3 : dy >= 8 ? 2 : 1) : 0,
      health: dy != null ? (dy >= 10 ? 'healthy' : dy >= 8 ? 'warning' : 'critical') : 'unknown',
      linkTo: "/intelligence/debt-yield"
    })

    const beoc = calc.breakEvenOccupancy
    list.push({
      key: 'ber', label: "Break-Even Occupancy", value: beoc != null ? formatPct(beoc) : '—',
      sub: "Safety floor for vacancy", tooltip: "Percentage of year needed to be rented just to cover all costs.",
      color: "var(--pink)", category: 'Risk', performanceScore: beoc != null ? (beoc <= 75 ? 3 : beoc <= 85 ? 2 : 1) : 0,
      health: beoc != null ? (beoc <= 75 ? 'healthy' : beoc <= 85 ? 'warning' : 'critical') : 'unknown',
      linkTo: "/intelligence/ber"
    })

    const sens = calc.interestSensitivity
    list.push({
      key: 'sensitivity', label: "Interest Sensitivity", value: sens != null ? `${sens.toFixed(1)}%` : '—',
      sub: "CF delta per 1% rate shift", tooltip: "How much your cash flow changes if interest rates move by 1 percentage point.",
      color: "var(--red)", category: 'Risk', performanceScore: sens != null ? (sens <= 30 ? 3 : sens <= 60 ? 2 : 1) : 0,
      health: sens != null ? (sens <= 30 ? 'healthy' : sens <= 60 ? 'warning' : 'critical') : 'unknown',
      linkTo: "/intelligence/sensitivity"
    })

    // 4. Wealth & Context
    const capture = calc.equityCapture
    list.push({
      key: 'capture', label: "Equity Capture", value: capture != null ? formatPct(capture) : '—',
      sub: "Unrealized gain on basis", tooltip: "Percentage growth in property value above your total acquisition basis.",
      color: "var(--purple)", category: 'Wealth', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/capture"
    })

    const shield = calc.taxShieldImpact
    list.push({
      key: 'shield', label: "Tax Shield Impact", value: shield != null ? formatPct(shield) : '—',
      sub: "% of income shielded by depreciation", tooltip: "Heuristic based on legal depreciation limits over a 27.5-year span.",
      color: "var(--indigo)", category: 'Wealth', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/tax-shield"
    })

    const ipr = calc.interestRatio
    list.push({
      key: 'ipr', label: "Interest:Principal Ratio", value: ipr != null ? `${ipr.toFixed(1)}:1` : '—',
      sub: "Bank share vs Equity share", tooltip: "How much interest is paid for every dollar of principal amortization.",
      color: "var(--orange)", category: 'Wealth', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/interest-ratio"
    })

    const tcd = calc.totalDeployed
    list.push({
      key: 'tcd', label: "Total Cash Deployed", value: formatCurrency(tcd),
      sub: "Your total 'skin in the game'", tooltip: "Down payment plus closing costs.",
      color: "var(--yellow)", category: 'Wealth', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/tcd"
    })

    return list
  }, [prop, calc])

  if (!prop || !calc) return <div className="empty-state" style={{ marginTop: 80 }}><p>Loading...</p></div>

  const categories: Category[] = ['Returns', 'Efficiency', 'Risk', 'Wealth']

  return (
    <main className="page-content">
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ paddingLeft: 0 }}>
          ← Back to Overview
        </button>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 'var(--h1-size, 2rem)', marginBottom: 8 }}>Investment Intelligence Hub</h1>
        <p style={{ color: 'var(--text-muted)' }}>Institutional property metrics evaluated against industry benchmarks.</p>
      </div>

      {/* Scenario Simulator */}
      <div className="card" style={{ marginBottom: 48, border: '2px solid var(--purple)', padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--purple)', marginBottom: 16 }}>✨ Scenario Simulator</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          <div>
            <label className="form-label">Monthly Rent</label>
            <input type="number" className="form-input" placeholder={activeLease?.monthly_rent.toString()} value={simRent} onChange={e => setSimRent(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Property Value</label>
            <input type="number" className="form-input" placeholder={prop.current_value?.toString()} value={simValue} onChange={e => setSimValue(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Annual Operating Exp.</label>
            <input type="number" className="form-input" placeholder={calc.annualOpExp.toFixed(0)} value={simOpEx} onChange={e => setSimOpEx(e.target.value)} />
          </div>
          {(simRent || simValue || simOpEx) && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => { setSimRent(''); setSimValue(''); setSimOpEx('') }}>Reset Simulation</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
        {categories.map(cat => {
            const catItems = items.filter(i => i.category === cat)
            if (catItems.length === 0) return null
            return (
              <section key={cat}>
                <h2 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                  {cat === 'Returns' && '📈'} {cat === 'Efficiency' && '⚙️'} {cat === 'Risk' && '🛡️'} {cat === 'Wealth' && '🏦'}
                  {cat}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                  {catItems.map(item => (
                    <MetricTile key={item.key} label={item.label} value={item.value} sub={item.sub} color={item.color} tooltip={item.tooltip} linkTo={item.linkTo} />
                  ))}
                </div>
              </section>
            )
          })}
      </div>
    </main>
  )
}
