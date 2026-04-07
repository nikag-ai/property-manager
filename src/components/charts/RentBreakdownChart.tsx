import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { formatCurrency } from '../../lib/utils'

interface RentBreakdownProps {
  data: { 
    interest: number, 
    principal: number, 
    taxes: number, 
    opex: number, 
    net: number,
    total: number 
  }
  onSegmentClick?: (segmentName: string) => void
}

export function RentBreakdownChart({ data, onSegmentClick }: RentBreakdownProps) {
  const chartData = [
    { name: 'Interest', value: Math.max(0, data.interest), color: 'var(--red)' },
    { name: 'Principal (Equity)', value: Math.max(0, data.principal), color: 'var(--teal)' },
    { name: 'Taxes & Insurance', value: Math.max(0, data.taxes), color: 'var(--orange)' },
    { name: 'Operating Exp (OpEx)', value: Math.max(0, data.opex), color: 'var(--red)', opacity: 0.6 },
    { name: 'Net Cash Flow', value: Math.max(0, data.net), color: 'var(--green)' }
  ]

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <div style={{ position: 'relative', width: '100%', height: 320, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            onClick={(entry) => {
              if (onSegmentClick && entry && entry.name) {
                onSegmentClick(entry.name)
              }
            }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(val: any, name: any) => [formatCurrency(Number(val)), String(name)]}
            contentStyle={{ borderRadius: 'var(--radius-md)', border: 'none', boxShadow: 'var(--shadow-lg)', background: 'var(--surface-1)', color: 'var(--text)' }}
          />
          <Legend layout="vertical" align="right" verticalAlign="middle" />
        </PieChart>
      </ResponsiveContainer>
      
      <div style={{ 
        position: 'absolute', 
        top: '50%', 
        left: 'calc(50% - 60px)', // Offset left to center within the pie rather than the whole div 
        transform: 'translate(-50%, -50%)', 
        textAlign: 'center',
        pointerEvents: 'none'
      }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Rent</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{formatCurrency(total)}</div>
      </div>
    </div>
  )
}
