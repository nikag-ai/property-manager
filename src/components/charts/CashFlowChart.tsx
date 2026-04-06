import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import type { MonthlySummary } from '../../lib/types'
import { formatMonthLabel, formatCurrency } from '../../lib/utils'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', minWidth: 180 }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: '0.8125rem', marginBottom: 4 }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: p.color }}>{formatCurrency(p.value)}</span>
        </div>
      ))}
      <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Click to view transactions →</div>
    </div>
  )
}

interface CashFlowChartProps {
  data: MonthlySummary[]
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const navigate = useNavigate()

  const chartData = data.map(d => ({
    month:    formatMonthLabel(d.month),
    monthKey: d.month.slice(0, 7),          // YYYY-MM
    Income:   d.income,
    Expenses: Math.abs(d.expenses),
    'Net CF': d.net_cash_flow,
  }))

  const handleClick = useCallback((data: any) => {
    if (!data) return
    // If clicked on the chart background/tooltip area
    let monthKey = data?.activePayload?.[0]?.payload?.monthKey
    // If clicked directly on a graphical element (Bar, Line, dot)
    if (!monthKey && data.payload && data.payload.monthKey) monthKey = data.payload.monthKey
    if (!monthKey && data.monthKey) monthKey = data.monthKey

    if (monthKey) navigate(`/monthly?month=${monthKey}&view=ledger`)
  }, [navigate])

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
          onClick={handleClick}
          style={{ cursor: 'pointer' }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={v => `$${Math.abs(v / 1000).toFixed(0)}k`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingTop: 8 }} />
          <ReferenceLine y={0} stroke="var(--border)" />
          <Bar dataKey="Income"   fill="var(--green)" radius={[4,4,0,0]} maxBarSize={40} onClick={handleClick} />
          <Bar dataKey="Expenses" fill="var(--red)"   radius={[4,4,0,0]} maxBarSize={40} opacity={0.8} onClick={handleClick} />
          <Line dataKey="Net CF"  stroke="var(--blue)" strokeWidth={2} dot={{ r: 3, fill: 'var(--blue)' }} type="monotone" onClick={handleClick} />

        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 8 }}>
        Click any month bar to open transactions ledger
      </div>
    </div>
  )
}
