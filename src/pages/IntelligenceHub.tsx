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
type Category = 'Returns' | 'Efficiency' | 'Risk' | 'Wealth' | 'Projections' | 'Stress Tests'

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
    const tar = calc.wealthCompVelocity
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
      key: 'em', label: "Equity Multiple", value: em != null ? `${em.toFixed(2)}x` : '—',
      sub: "Total growth vs initial cash", tooltip: "Current net equity plus historical cash flow divided by total cash deployed.",
      color: "var(--purple)", category: 'Returns', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/equity-multiple"
    })

    // 2. Projections (EXPERT)
    const pcf = calc.projAnnualCF
    list.push({
      key: 'pcf', label: "Exp. Annual Cash Flow", value: pcf != null ? formatCurrency(pcf) : '—',
      sub: "TTM Run-rate projection", tooltip: "Forward-looking 12-month projection based on current active rent and precise fixed costs.",
      color: "var(--green)", category: 'Projections', performanceScore: pcf != null ? (pcf > 0 ? 3 : 1) : 0,
      health: pcf != null ? (pcf > 0 ? 'healthy' : 'critical') : 'unknown',
      linkTo: "/intelligence/proj-cf"
    })

    const refi = calc.refiEquity
    list.push({
      key: 'refi', label: "Refinance-able Equity", value: refi != null ? formatCurrency(refi) : '—',
      sub: "Available liquidity at 75% LTV", tooltip: "How much cash could be extracted in a standard 75% LTV cash-out refinance.",
      color: "var(--blue)", category: 'Projections', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/refi-equity"
    })

    const constnt = calc.loanConstant
    list.push({
      key: 'loanConstant', label: "Loan Constant", value: constnt != null ? formatPct(constnt) : '—',
      sub: "True annual cost of debt", tooltip: "Total annual debt service divided by the total loan amount.",
      color: "var(--indigo)", category: 'Projections', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/loan-constant"
    })

    const eacc = calc.equityAccRate
    list.push({
      key: 'equityAcc', label: "Equity Accumulation Rate", value: eacc != null ? formatPct(eacc) : '—',
      sub: "Wealth speed (Paydown + Growth)", tooltip: "Annual amortization plus annual appreciation divided by original deployed capital.",
      color: "var(--purple)", category: 'Projections', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/equity-acc"
    })

    const uy = calc.unleveredYield
    list.push({
      key: 'unleveredYield', label: "Unlevered Yield", value: uy != null ? formatPct(uy) : '—',
      sub: "Total asset yield (100% Cash)", tooltip: "NOI divided by total acquisition costs, assuming no debt.",
      color: "var(--teal)", category: 'Projections', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/unlevered-yield"
    })

    const yote = calc.yote
    list.push({
      key: 'yote', label: "Yield on Trapped Equity", value: yote != null ? formatPct(yote) : '—',
      sub: "ROI on current net equity", tooltip: "Annual cash flow divided by current net equity. A key metric for 'Sell or Hold' decisions.",
      color: "var(--orange)", category: 'Projections', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/yote"
    })

    // 3. Efficiency & Operations
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

    const eb = calc.opEffBenchmark
    list.push({
      key: 'opEffBenchmark', label: "Op. Efficiency Benchmark", value: eb != null ? `${eb.toFixed(2)}x` : '—',
      sub: "Actual OER vs 35% Target", tooltip: "Your current operating expense ratio relative to the institutional benchmark of 35%.",
      color: "var(--orange)", category: 'Efficiency', performanceScore: eb != null ? (eb <= 1.2 ? 3 : eb <= 1.5 ? 2 : 1) : 0,
      health: eb != null ? (eb <= 1.2 ? 'healthy' : eb <= 1.5 ? 'warning' : 'critical') : 'unknown',
      linkTo: "/intelligence/op-efficiency"
    })

    const acap = calc.adjustedCapRate
    list.push({
      key: 'adjCap', label: "Adjusted Cap Rate", value: acap != null ? formatPct(acap) : '—',
      sub: "Cap Rate including 5% reserves", tooltip: "Estimated cap rate after accounting for a 5% capital expenditure reserve.",
      color: "var(--indigo)", category: 'Efficiency', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/adjusted-cap"
    })

    // 4. Stress Tests
    const rst = calc.rateStressTest
    list.push({
      key: 'rateStress', label: "Interest Rate Stress Test", value: rst != null ? formatPct(rst) : '—',
      sub: "Max rate before $0 CF", tooltip: "The theoretical interest rate on your current loan balance that would reduce your cash flow to exactly zero.",
      color: "var(--red)", category: 'Stress Tests', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/rate-stress"
    })

    const mac = calc.maintAbsorpCap
    list.push({
      key: 'maintAbsorp', label: "Maint. Absorption Cap", value: formatCurrency(mac),
      sub: "Safe annual maintenance pad", tooltip: "Maximum amount of additional annual maintenance expense the property can absorb before becoming cash flow negative.",
      color: "var(--orange)", category: 'Stress Tests', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/maint-absorp"
    })

    const ler = calc.levEffectRatio
    list.push({
      key: 'levEffect', label: "Leverage Effect Ratio", value: ler != null ? ler.toFixed(2) : '—',
      sub: "Debt impact factor (ROE/Cap)", tooltip: "Compares your ROE to your Cap Rate. A ratio > 1 means leverage is positively amplifying your returns.",
      color: "var(--indigo)", category: 'Stress Tests', performanceScore: ler != null ? (ler > 1 ? 3 : 1) : 0,
      health: ler != null ? (ler > 1 ? 'healthy' : 'critical') : 'unknown',
      linkTo: "/intelligence/lev-effect"
    })

    const ae = calc.amortEff
    list.push({
      key: 'amortEff', label: "Amortization Efficiency", value: ae != null ? formatPct(ae) : '—',
      sub: "% of mortgage that is profit", tooltip: "Percentage of each mortgage payment that goes toward principal paydown (equity profit) vs interest expense.",
      color: "var(--green)", category: 'Stress Tests', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/amort-efficiency"
    })

    const mvg = calc.marketValGap
    list.push({
      key: 'marketValGap', label: "Implied Market Value Gap", value: mvg != null ? formatCurrency(mvg) : '—',
      sub: "Current Value vs 6.5% Cap", tooltip: "Difference between your estimated value and value based on NOI at a benchmark 6.5% Market Cap rate.",
      color: "var(--blue)", category: 'Stress Tests', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/value-gap"
    })

    const vsd = calc.vacSurvivalDuration
    list.push({
      key: 'vacSurvival', label: "Vacancy Survival Duration", value: vsd != null ? `${vsd.toFixed(1)} mos` : '—',
      sub: "Months till out of pocket", tooltip: "How many months of total vacancy the property can survive (using NOI + 3mo reserve) before requiring personal cash injections.",
      color: "var(--pink)", category: 'Stress Tests', performanceScore: vsd != null ? (vsd >= 6 ? 3 : vsd >= 3 ? 2 : 1) : 0,
      health: vsd != null ? (vsd >= 6 ? 'healthy' : vsd >= 3 ? 'warning' : 'critical') : 'unknown',
      linkTo: "/intelligence/vac-survival"
    })

    const tsi = calc.taxSensIndex
    list.push({
      key: 'taxSens', label: "Tax Sensitivity Index", value: tsi != null ? `${tsi.toFixed(1)}%` : '—',
      sub: "ROI hit per 10% tax hike", tooltip: "How much your cash flow would drop if fixed costs (taxes/insurance) spiked by 10%.",
      color: "var(--red)", category: 'Stress Tests', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/tax-sensitivity"
    })

    // 5. Risk & Leverage (Legacy cleanup)
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

    const sens = calc.interestSensitivity
    list.push({
      key: 'sensitivity', label: "Interest Sensitivity", value: sens != null ? `${sens.toFixed(1)}%` : '—',
      sub: "ROI hit per 1% rate hike", tooltip: "How much your cash flow would drop if your interest rate increased by 1%.",
      color: "var(--red)", category: 'Risk', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/sensitivity"
    })

    const dy = calc.debtYield
    list.push({
      key: 'debtYield', label: "Debt Yield", value: dy != null ? `${dy.toFixed(1)}%` : '—',
      sub: "NOI as % of total loan", tooltip: "Annual NOI divided by the original loan amount. A key bank metric.",
      color: "var(--teal)", category: 'Risk', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/debt-yield"
    })

    // 6. Wealth & Context
    const shield = calc.taxShieldImpact
    list.push({
      key: 'shield', label: "Tax Shield Impact", value: shield != null ? formatPct(shield) : '—',
      sub: "% of income shielded by depreciation", tooltip: "Heuristic based on legal depreciation limits over a 27.5-year span.",
      color: "var(--indigo)", category: 'Wealth', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/tax-shield"
    })

    const tcd = calc.totalDeployed
    list.push({
      key: 'tcd', label: "Total Cash Deployed", value: formatCurrency(tcd),
      sub: "Your total 'skin in the game'", tooltip: "Down payment plus closing costs.",
      color: "var(--yellow)", category: 'Wealth', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/tcd"
    })

    const capture = calc.equityCapture
    list.push({
      key: 'capture', label: "Equity Capture", value: capture != null ? formatPct(capture) : '—',
      sub: "Profit over basis", tooltip: "Unrealized gain (Current Value - Basis) divided by Basis.",
      color: "var(--purple)", category: 'Wealth', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/capture"
    })

    const ber = calc.breakEvenOccupancy
    list.push({
      key: 'ber', label: "Break-Even Occupancy", value: ber != null ? formatPct(ber) : '—',
      sub: "Required occupancy to cover costs", tooltip: "Percentage of the year the property must be occupied to cover all OpEx and debt service.",
      color: "var(--teal)", category: 'Wealth', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/ber"
    })

    const gross = metrics?.gross_equity
    list.push({
      key: 'gross', label: "Gross Equity", value: gross != null ? formatCurrency(gross) : '—',
      sub: "Value minus debt", tooltip: "Current market value minus the remaining mortgage balance.",
      color: "var(--blue)", category: 'Wealth', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/gross-equity"
    })

    const net = metrics?.net_equity
    list.push({
      key: 'net', label: "Net Equity (True Cash Out)", value: net != null ? formatCurrency(net) : '—',
      sub: "Actual cash out at sale", tooltip: "Gross equity minus estimated selling costs and historical P&L.",
      color: "var(--purple)", category: 'Wealth', performanceScore: 0, health: 'info',
      linkTo: "/intelligence/net-equity"
    })

    return list
  }, [prop, calc])

  if (!prop || !calc) return <div className="empty-state" style={{ marginTop: 80 }}><p>Loading...</p></div>

  const categories: Category[] = ['Returns', 'Projections', 'Efficiency', 'Risk', 'Stress Tests', 'Wealth']

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
