import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '../../lib/utils'

interface WealthDataPoint {
  year: number
  downpayment: number
  principal: number
  appreciation: number
}

interface WealthData {
  timeline: WealthDataPoint[]
}

export function WealthCompositionChart({ data }: { data: WealthData }) {
  const chartData = data.timeline.map(pt => ({
    name: pt.year === 0 ? 'Today' : `Year ${pt.year}`,
    year: pt.year,
    'Down Payment': pt.downpayment,
    'Principal Paid': pt.principal,
    'Appreciation': Math.max(0, pt.appreciation),
  }))

  const xTicks = chartData.filter(d => d.year % 5 === 0).map(d => d.name)

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorDP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--blue)" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--teal)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--teal)" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorAP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--purple)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--purple)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
            dy={10}
            ticks={xTicks}
          />
          <YAxis 
            hide={true} 
          />
          <Tooltip 
            contentStyle={{ borderRadius: 'var(--radius-md)', border: 'none', boxShadow: 'var(--shadow-lg)', background: 'var(--surface-1)' }}
            formatter={(val: any, name: any) => [formatCurrency(Number(val)), String(name)]}
            labelStyle={{ color: 'var(--text)', fontWeight: 'bold', marginBottom: 8 }}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="Down Payment" 
            stackId="1" 
            stroke="var(--blue)" 
            fillOpacity={1} 
            fill="url(#colorDP)" 
          />
          <Area 
            type="monotone" 
            dataKey="Principal Paid" 
            stackId="1" 
            stroke="var(--teal)" 
            fillOpacity={1} 
            fill="url(#colorPP)" 
          />
          <Area 
            type="monotone" 
            dataKey="Appreciation" 
            stackId="1" 
            stroke="var(--purple)" 
            fillOpacity={1} 
            fill="url(#colorAP)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
