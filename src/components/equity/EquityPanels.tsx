import { useState } from 'react'
import type { PropertyMetrics } from '../../lib/types'
import { formatCurrency } from '../../lib/utils'
import { InfoTooltip } from '../common/InfoTooltip'

interface EquityPanelsProps {
  metrics: PropertyMetrics
  closingCosts: number      // from property record (e.g. $6,000)
  purchasePrice: number
  loanAmount: number
}

function StatRow({ label, value, cls, indent, bold }: { label: string; value: string; cls?: string; indent?: boolean; bold?: boolean }) {
  return (
    <div className="stat-row" style={{ fontWeight: bold ? 700 : undefined }}>
      <span className="stat-label" style={{ paddingLeft: indent ? 16 : 0 }}>{label}</span>
      <span className={`stat-value ${cls ?? ''}`}>{value}</span>
    </div>
  )
}

export function EquityPanels({ metrics, closingCosts, purchasePrice, loanAmount }: EquityPanelsProps) {
  const [view, setView] = useState<'expensed' | 'capitalized'>('expensed')

  const {
    current_value,
    remaining_loan_balance,
    cumulative_cash_flow,
    selling_costs,
    gross_equity,
  } = metrics

  const cv          = current_value ?? purchasePrice
  const downPayment = purchasePrice - loanAmount   // $94,200

  // ── Expensed view ────────────────────────────────────────
  // Closing costs ARE in the P&L (hit as expenses)
  // cumulative_cash_flow EXCLUDES CC by design → expensed P&L = cumul_cf - closingCosts
  const expensedCF      = cumulative_cash_flow - closingCosts   // more negative
  const expensedNetEq   = gross_equity + expensedCF - selling_costs   // same as net_equity from RPC
  const expensedBreakeven = (remaining_loan_balance + downPayment - expensedCF) / (1 - 0.10)

  // ── Capitalized view ─────────────────────────────────────
  // Closing costs go into COST BASIS — excluded from P&L
  // Operational cash flow = cumulative_cash_flow (CC already excluded)
  const capitalizedCF     = cumulative_cash_flow
  const capitalizedNetEq  = gross_equity + capitalizedCF - selling_costs  // higher by closingCosts
  const capitalizedBreakeven = (remaining_loan_balance + downPayment - capitalizedCF) / (1 - 0.10)

  const isExpensed    = view === 'expensed'
  const displayCF     = isExpensed ? expensedCF     : capitalizedCF
  const displayNetEq  = isExpensed ? expensedNetEq  : capitalizedNetEq
  const displayBE     = isExpensed ? expensedBreakeven : capitalizedBreakeven

  const totalDeployed = downPayment + closingCosts   // $100,200

  return (
    <div className="card" style={{ gridColumn: '1/-1' }}>
      <div className="section-header" style={{ marginBottom: 20 }}>
        <h3 className="section-title">
          Equity Breakdown
          <InfoTooltip content="Your true economic position if you sold today. Net equity = current value − loan balance − selling costs ± cumulative cash flow." />
        </h3>
        <div className="toggle-group">
          <button className={`toggle-btn${view === 'expensed'    ? ' active' : ''}`} onClick={() => setView('expensed')}>
            Expensed
          </button>
          <button className={`toggle-btn${view === 'capitalized' ? ' active' : ''}`} onClick={() => setView('capitalized')}>
            Capitalized
          </button>
        </div>
      </div>

      {/* View description */}
      <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>
        {isExpensed
          ? '⚡ Expensed: Closing costs ($' + closingCosts.toLocaleString() + ') count as P&L expenses — honest, all-in view.'
          : '📦 Capitalized: Closing costs folded into cost basis, not P&L. Operating cash flow looks cleaner by $' + closingCosts.toLocaleString() + '.'}
      </div>

      <div className="equity-grid-row">
        {/* Equity waterfall */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 700, marginBottom: 16,
            color: displayNetEq >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {formatCurrency(displayNetEq)}
            <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-subtle)', marginLeft: 8 }}>net equity</span>
          </div>

          <StatRow label="Current Value"      value={formatCurrency(cv)} />
          <StatRow label="− Loan Balance"     value={formatCurrency(-remaining_loan_balance)} cls="text-red" />
          <StatRow label="= Gross Equity"     value={formatCurrency(gross_equity)} cls="text-blue" bold />
          <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-subtle)' }} />
          <StatRow label="− Selling Costs (10%)" value={formatCurrency(-selling_costs)} cls="text-red" indent />
          {isExpensed
            ? <StatRow label="− Closing Costs (P&L)" value={formatCurrency(-closingCosts)} cls="text-red" indent />
            : <StatRow label="  (CC in basis, not P&L)" value={`+${formatCurrency(closingCosts)}`} cls="text-subtle" indent />
          }
          <StatRow label="+ Operational CF"   value={formatCurrency(capitalizedCF)} cls={capitalizedCF >= 0 ? 'text-green' : 'text-red'} indent />
          <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-subtle)' }} />
          <StatRow label="= Net Equity" value={formatCurrency(displayNetEq)} cls={displayNetEq >= 0 ? 'text-green' : 'text-red'} bold />
        </div>

        {/* Cash deployed + metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Cash Deployed at Closing
            </div>
            <StatRow label="Down Payment"   value={formatCurrency(downPayment)} />
            <StatRow label="Closing Costs"  value={formatCurrency(closingCosts)} />
            <div style={{ margin: '8px 0', borderTop: '1px solid var(--border-subtle)' }} />
            <StatRow label="Total Invested" value={formatCurrency(totalDeployed)} bold />
          </div>

          <div style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Operational P&L (excl. principal)
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.125rem',
              color: displayCF >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {formatCurrency(displayCF)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 4 }}>
              {isExpensed ? 'Incl. closing costs hit' : 'Clean operating P&L (CC in basis)'}
            </div>
          </div>
        </div>
      </div>

      {/* Break-even */}
      <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>
            Break-even Sale Price
            <InfoTooltip content="Minimum sale price to recover all invested capital: (Loan balance + Down payment + Closing costs + Net losses) ÷ 0.90" />
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>
            Covers loan payoff + ${(totalDeployed / 1000).toFixed(0)}k you put in + all losses
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.125rem', color: 'var(--yellow)' }}>
          {formatCurrency(displayBE)}
        </div>
      </div>
    </div>
  )
}
