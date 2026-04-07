import { formatCurrency, formatPct } from '../../lib/utils'

interface AdvisoryData {
  dscr: number | null
  ltv: number | null
  capRate: number | null
  maintPct: number
  annualCF: number | null
  equityAcc: number | null
  refiEquity: number
}

export function AdvisoryBoard({ data }: { data: AdvisoryData }) {
  const insights: { title: string, content: string, status: 'success' | 'warning' | 'info' }[] = []

  // 1. Leverage/Refi Check
  if (data.dscr && data.dscr > 1.4 && data.ltv && data.ltv < 70 && data.refiEquity > 30000) {
    insights.push({
      title: 'Equity Release Opportunity',
      content: `Your high DSCR (${data.dscr.toFixed(2)}) and low LTV (${data.ltv.toFixed(1)}%) make this a strong candidate for a cash-out refinance. You have approx. ${formatCurrency(data.refiEquity)} in "dry powder" equity.`,
      status: 'success'
    })
  }

  // 2. Efficiency/Maintenance Check
  if (data.maintPct > 10) {
    insights.push({
      title: 'Operational Intensity High',
      content: `Maintenance is currently ${formatPct(data.maintPct)} of gross rent, which is above the 5-8% target. Consider a preventative maintenance audit to lower long-term costs.`,
      status: 'warning'
    })
  }

  // 3. Wealth/Performance Check
  if (data.equityAcc && data.equityAcc > 12) {
    insights.push({
      title: 'Wealth Acceleration Lead',
      content: `This asset is growing your net worth at ${formatPct(data.equityAcc)} per year via paydown and appreciation. It is a core wealth-builder in your portfolio.`,
      status: 'success'
    })
  } else if (data.annualCF && data.annualCF < 0) {
    insights.push({
      title: 'Cash Flow Drain',
      content: 'Property is currently operating at a negative cash flow. Ensure you have at least 12 months of mortgage reserves to weather long vacancies or major repairs.',
      status: 'warning'
    })
  }

  // Default Info if no major flags
  if (insights.length === 0) {
    insights.push({
      title: 'Asset Performance Stable',
      content: 'Your operational and risk metrics are currently within normal ranges. No immediate interventions suggested.',
      status: 'info'
    })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 40 }}>
      {insights.map((insight, idx) => (
        <div key={idx} style={{ 
          padding: '16px 20px', 
          borderRadius: 'var(--radius-lg)', 
          background: insight.status === 'success' ? 'rgba(74, 222, 128, 0.05)' : insight.status === 'warning' ? 'rgba(251, 146, 60, 0.05)' : 'var(--surface-2)',
          border: `1px solid ${insight.status === 'success' ? 'var(--green)' : insight.status === 'warning' ? 'var(--orange)' : 'var(--border)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
             <span style={{ fontSize: '1.1rem' }}>
               {insight.status === 'success' ? '✨' : insight.status === 'warning' ? '⚠️' : 'ℹ️'}
             </span>
             <h4 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{insight.title}</h4>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{insight.content}</p>
        </div>
      ))}
    </div>
  )
}
