import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import type { MonthlySummary } from '../../lib/types'
import { formatMonthLabel, formatCurrency } from '../../lib/utils'
import { CHART_CONFIG } from '../../lib/constants'

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
  data: (MonthlySummary & { cumulative_cf: number })[]
}


export function CashFlowChart({ data }: CashFlowChartProps) {

  const navigate = useNavigate()

  const chartData = data.map((d: any) => ({
    month:    formatMonthLabel(d.month),
    monthKey: d.month.slice(0, 7),          // YYYY-MM
    Income:   d.income,
    Expenses: Math.abs(d.expenses),
    'Net CF': d.net_cash_flow,
    'Cumulative': d.cumulative_cf,
  }))

  const handleClick = useCallback((data: any) => {
    if (!data) return
    let monthKey = data?.activePayload?.[0]?.payload?.monthKey
    if (!monthKey && data.payload && data.payload.monthKey) monthKey = data.payload.monthKey
    if (!monthKey && data.monthKey) monthKey = data.monthKey

    if (monthKey) navigate(`/ledger?month=${monthKey}`)
  }, [navigate])

  return (
    <div>
      <ResponsiveContainer width="100%" height={CHART_CONFIG.HEIGHT}>
        <ComposedChart
          data={chartData}
          margin={CHART_CONFIG.MARGINS}
          onClick={handleClick}
          style={{ cursor: 'pointer' }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_CONFIG.COLORS.GRID} vertical={false} />
          <XAxis dataKey="month" tick={{ fill: CHART_CONFIG.COLORS.AXIS, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis 
            yAxisId="left" 
            domain={['auto', 'auto']}
            tickFormatter={v => {
              const k = v / 1000
              const absK = Math.abs(k)
              const formatted = absK < 10 && absK !== 0 ? absK.toFixed(1) : absK.toFixed(0)
              return `${v < 0 ? '-' : ''}$${formatted}k`
            }} 
            tick={{ fill: CHART_CONFIG.COLORS.AXIS, fontSize: 11 }} 
            axisLine={false} 
            tickLine={false} 
            width={54} 
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            domain={['auto', 'auto']}
            tickFormatter={v => {
              const k = v / 1000
              const absK = Math.abs(k)
              const formatted = absK < 10 && absK !== 0 ? absK.toFixed(1) : absK.toFixed(0)
              return `${v < 0 ? '-' : ''}$${formatted}k`
            }} 
            tick={{ fill: 'var(--purple)', fontSize: 11 }} 
            axisLine={false} 
            tickLine={false} 
            width={54} 
          />



          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '0.8rem', color: CHART_CONFIG.COLORS.AXIS, paddingTop: 8 }} />
          <ReferenceLine y={0} yAxisId="left" stroke="var(--border)" />
          <Bar yAxisId="left" dataKey="Income"   fill={CHART_CONFIG.COLORS.INCOME} radius={CHART_CONFIG.BAR_RADIUS} maxBarSize={CHART_CONFIG.MAX_BAR_SIZE} onClick={handleClick} />
          <Bar yAxisId="left" dataKey="Expenses" fill={CHART_CONFIG.COLORS.EXPENSE} radius={CHART_CONFIG.BAR_RADIUS} maxBarSize={CHART_CONFIG.MAX_BAR_SIZE} opacity={0.8} onClick={handleClick} />
          <Line yAxisId="left" dataKey="Net CF"  stroke={CHART_CONFIG.COLORS.NET} strokeWidth={2} dot={{ r: 3, fill: CHART_CONFIG.COLORS.NET }} type="monotone" onClick={handleClick} />
          <Line yAxisId="right" dataKey="Cumulative" stroke={CHART_CONFIG.COLORS.CUMULATIVE} strokeWidth={3} dot={false} type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>

      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 8 }}>
        Click any month bar to open transactions ledger
      </div>
    </div>
  )
}
