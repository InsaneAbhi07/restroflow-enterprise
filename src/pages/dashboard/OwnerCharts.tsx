import { useMemo, useState } from 'react'
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { BarChart3, CreditCard, Crown, LineChart as LineIcon, PieChart as PieIcon, Receipt, Target, TrendingUp } from 'lucide-react'
import { CHART, Legend, Segmented, Progress, VegMark, tooltipStyle } from '@/components/ui'
import { categorySplit, dailySeries, expenseBreakdown, hourlySeries, monthlySeries, paymentSplit, sourceSplit, topItems, weeklySeries } from '@/data/analytics'
import { useStore } from '@/store/useStore'
import { inr, inrShort, num } from '@/lib/format'
import { analyticsIds, ChartCard, type DashMetrics } from './dashShared'

const fmtMoney = (v: unknown) => inr(Number(v))
const axisMoney = (v: number) => inrShort(v).replace('₹', '₹')

/* ------------------------------------------------------------------ Sales trend (Daily / Weekly / Monthly tabs) */
export function TrendCard({ m }: { m: DashMetrics }) {
  const [tab, setTab] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const ids = analyticsIds(m.outletIds)
  const data = useMemo(() => {
    if (!ids.length) return []
    if (tab === 'weekly') return weeklySeries(ids).map((w) => ({ label: w.label.split(' · ')[1], sales: w.sales, orders: w.orders }))
    if (tab === 'monthly') {
      const ms = monthlySeries(ids)
      ms[ms.length - 1] = { ...ms[ms.length - 1], sales: ms[ms.length - 1].sales + m.live.revenue }
      return ms.map((x) => ({ label: x.label, sales: x.sales, orders: Math.round(x.sales / 742) }))
    }
    if (m.range === 'today') {
      const h = new Date().getHours()
      const hs = hourlySeries(ids).filter((x) => x.hour <= Math.max(h, 12))
      const cur = hs.find((x) => x.hour === h) ?? hs[hs.length - 1]
      return hs.map((x) => (x === cur ? { label: x.label, sales: x.sales + m.live.revenue, orders: x.orders + m.live.count } : { label: x.label, sales: x.sales, orders: x.orders }))
    }
    const ds = dailySeries(ids, Math.max(m.days, 2))
    ds[ds.length - 1] = { ...ds[ds.length - 1], sales: ds[ds.length - 1].sales + m.live.revenue, orders: ds[ds.length - 1].orders + m.live.count }
    return ds.map((d) => ({ label: d.label, sales: d.sales, orders: d.orders }))
  }, [tab, ids.join(), m.range, m.days, m.live.revenue, m.live.count])

  const total = data.reduce((s, d) => s + d.sales, 0)
  const peak = data.reduce((a, b) => (b.sales > a.sales ? b : a), data[0] ?? { label: '-', sales: 0 })

  return (
    <ChartCard
      title="Sales trend"
      subtitle={tab === 'daily' ? (m.range === 'today' ? 'Hourly sales today · live orders included' : `Daily sales · last ${m.days} days`) : tab === 'weekly' ? 'Last 8 weeks' : 'Last 12 months'}
      icon={<LineIcon className="size-3.5" />}
      actions={<Segmented size="sm" value={tab} onChange={setTab} items={[{ value: 'daily', label: m.range === 'today' ? 'Hourly' : 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]} />}
    >
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px]">
        <span className="text-slate-500">Total <b className="ml-1 text-slate-900 tabular">{inr(total)}</b></span>
        <span className="text-slate-500">Peak <b className="ml-1 text-slate-900">{peak?.label}</b> <span className="tabular text-slate-400">({inrShort(peak?.sales ?? 0)})</span></span>
        <span className="ml-auto flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-[#14a891]" />Sales</span>
          <span className="flex items-center gap-1"><span className="h-0.5 w-3 bg-[#1d3f70]" />Orders</span>
        </span>
      </div>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          {tab === 'weekly' ? (
            <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="label" tick={CHART.axis} axisLine={false} tickLine={false} />
              <YAxis tick={CHART.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={56} />
              <Tooltip {...tooltipStyle} formatter={(v, n) => (n === 'sales' ? [fmtMoney(v), 'Sales'] : [num(Number(v)), 'Orders'])} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="sales" fill={CHART.teal} radius={[5, 5, 0, 0]} maxBarSize={38} />
            </BarChart>
          ) : (
            <ComposedChart data={data} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.teal} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={CHART.teal} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="label" tick={CHART.axis} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis yAxisId="l" tick={CHART.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={56} />
              <YAxis yAxisId="r" orientation="right" tick={CHART.axis} axisLine={false} tickLine={false} width={34} />
              <Tooltip {...tooltipStyle} formatter={(v, n) => (n === 'sales' ? [fmtMoney(v), 'Sales'] : [num(Number(v)), 'Orders'])} />
              <Area yAxisId="l" type="monotone" dataKey="sales" stroke={CHART.teal} strokeWidth={2} fill="url(#gSales)" />
              <Line yAxisId="r" type="monotone" dataKey="orders" stroke={CHART.navy} strokeWidth={1.75} dot={false} strokeDasharray="4 3" />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

/* ------------------------------------------------------------------ Revenue by outlet (or by source for a single outlet) */
export function RevenueByOutletCard({ m }: { m: DashMetrics }) {
  if (!m.isAll) {
    const data = sourceSplit(m.revenue)
    return (
      <ChartCard title="Revenue by channel" subtitle={m.rows[0]?.outlet.short} icon={<BarChart3 className="size-3.5" />}>
        <div className="h-[262px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis type="number" tick={CHART.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} />
              <YAxis type="category" dataKey="name" tick={CHART.axis} axisLine={false} tickLine={false} width={82} />
              <Tooltip {...tooltipStyle} formatter={(v) => [fmtMoney(v), 'Revenue']} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={18}>
                {data.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    )
  }
  const data = m.rows.map((r) => ({ name: r.outlet.short, revenue: Math.round(r.revenue), color: r.outlet.color }))
  return (
    <ChartCard title="Revenue by outlet" subtitle={`${m.rows.length} outlets · selected period`} icon={<BarChart3 className="size-3.5" />}>
      <div className="h-[262px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="name" tick={CHART.axis} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={CHART.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={56} />
            <Tooltip {...tooltipStyle} formatter={(v) => [fmtMoney(v), 'Revenue']} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={46}>
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

/* ------------------------------------------------------------------ Monthly revenue vs expenses vs profit */
export function MonthlyPnLCard({ m }: { m: DashMetrics }) {
  const ids = analyticsIds(m.outletIds)
  const data = useMemo(() => (ids.length ? monthlySeries(ids) : []), [ids.join()])
  const last = data[data.length - 1]
  return (
    <ChartCard title="Revenue vs expenses vs profit" subtitle="Monthly · last 12 months" icon={<TrendingUp className="size-3.5" />}
      actions={last && <span className="text-[11.5px] text-slate-500">Margin <b className="text-emerald-600">{((last.profit / (last.sales || 1)) * 100).toFixed(1)}%</b></span>}>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="label" tick={CHART.axis} axisLine={false} tickLine={false} />
            <YAxis tick={CHART.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={56} />
            <Tooltip {...tooltipStyle} formatter={(v, n) => [fmtMoney(v), String(n).charAt(0).toUpperCase() + String(n).slice(1)]} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="sales" name="revenue" fill={CHART.navy} radius={[4, 4, 0, 0]} maxBarSize={16} />
            <Bar dataKey="expenses" name="expenses" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={16} />
            <Line type="monotone" dataKey="profit" name="profit" stroke={CHART.teal} strokeWidth={2.25} dot={{ r: 2.5, fill: CHART.teal }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex justify-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-[#1d3f70]" />Revenue</span>
        <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-slate-300" />Expenses</span>
        <span className="flex items-center gap-1"><span className="h-0.5 w-3 bg-[#14a891]" />Profit</span>
      </div>
    </ChartCard>
  )
}

/* ------------------------------------------------------------------ Donut helper */
function Donut({ data, center, sub }: { data: { name: string; value: number; color: string }[]; center: string; sub: string }) {
  return (
    <div className="relative h-[150px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none">
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip {...tooltipStyle} formatter={(v) => fmtMoney(v)} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] font-semibold text-slate-900 tabular">{center}</span>
        <span className="text-[10.5px] text-slate-400">{sub}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Payment methods (analytics + live settled payments) */
export function PaymentCard({ m }: { m: DashMetrics }) {
  const data = useMemo(() => {
    const base = paymentSplit(m.revenue - m.live.revenue)
    const map: Record<string, string> = { UPI: 'UPI', Cash: 'Cash', 'Credit Card': 'Card', 'Debit Card': 'Card', Wallet: 'Online (Swiggy/Zomato)', Due: 'Cash' }
    m.live.settled.forEach((o) => o.payments.forEach((p) => {
      const row = base.find((b) => b.name === map[p.mode])
      if (row) row.value += p.amount
    }))
    return base
  }, [m.revenue, m.live])
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  return (
    <ChartCard title="Payment methods" subtitle="Share of collections" icon={<CreditCard className="size-3.5" />}>
      <Donut data={data} center={inrShort(total)} sub="collected" />
      <Legend className="mt-3" items={data.map((d) => ({ name: d.name.replace('Online (Swiggy/Zomato)', 'Online / Aggregator'), color: d.color, value: `${((d.value / total) * 100).toFixed(0)}%` }))} />
    </ChartCard>
  )
}

/* ------------------------------------------------------------------ Category-wise sales */
export function CategoryCard({ m }: { m: DashMetrics }) {
  const data = categorySplit(m.revenue).sort((a, b) => b.value - a.value)
  const top = data.slice(0, 5)
  const rest = data.slice(5).reduce((s, d) => s + d.value, 0)
  const pie = [...top, { name: 'Others', value: rest, color: '#cbd5e1' }]
  return (
    <ChartCard title="Category-wise sales" subtitle="Top categories" icon={<PieIcon className="size-3.5" />}>
      <Donut data={pie} center={top[0]?.name.split(' ')[0] ?? '-'} sub="top category" />
      <Legend className="mt-3" items={pie.map((d) => ({ name: d.name, color: d.color, value: inrShort(d.value) }))} />
    </ChartCard>
  )
}

/* ------------------------------------------------------------------ Top-selling items */
export function TopItemsCard({ m }: { m: DashMetrics }) {
  const orders = useStore((s) => s.orders)
  const ids = analyticsIds(m.outletIds)
  const items = useMemo(() => {
    if (!ids.length) return []
    const mult = m.range === 'today' ? 0.62 : m.days
    const liveQty: Record<string, number> = {}
    m.live.settled.forEach((o) => o.items.forEach((i) => { if (!i.cancelled) liveQty[i.itemId] = (liveQty[i.itemId] ?? 0) + i.qty }))
    return topItems(ids, 8).map((t) => {
      const qty = Math.max(1, Math.round(t.qty * mult)) + (liveQty[t.id] ?? 0)
      return { ...t, qty, revenue: Math.round((t.revenue / t.qty) * qty) }
    }).sort((a, b) => b.revenue - a.revenue)
  }, [ids.join(), m.range, m.days, m.live, orders])
  const max = items[0]?.revenue || 1
  return (
    <ChartCard title="Top-selling items" subtitle="By revenue · selected period" icon={<Crown className="size-3.5" />} bodyClassName="p-0">
      <ul className="divide-y divide-slate-100">
        {items.map((it, i) => (
          <li key={it.id} className="flex items-center gap-3 px-4 py-2">
            <span className={`w-4 text-center text-[11px] font-bold ${i < 3 ? 'text-amber-500' : 'text-slate-400'}`}>{i + 1}</span>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-[17px]">{it.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <VegMark veg={it.veg} />
                <p className="truncate text-[12.5px] font-medium text-slate-800">{it.name}</p>
              </div>
              <Progress value={(it.revenue / max) * 100} className="mt-1 h-1" tone={i < 3 ? 'teal' : 'navy'} />
            </div>
            <div className="text-right">
              <p className="text-[12.5px] font-semibold text-slate-900 tabular">{inrShort(it.revenue)}</p>
              <p className="text-[10.5px] text-slate-400 tabular">{num(it.qty)} sold</p>
            </div>
          </li>
        ))}
      </ul>
    </ChartCard>
  )
}

/* ------------------------------------------------------------------ Expense comparison */
export function ExpenseCard({ m }: { m: DashMetrics }) {
  const [tab, setTab] = useState<'head' | 'outlet'>('head')
  const heads = expenseBreakdown(m.revenue)
  const byOutlet = m.rows.map((r) => ({ name: r.outlet.short, revenue: Math.round(r.revenue), expenses: Math.round(r.expenses), color: r.outlet.color }))
  return (
    <ChartCard title="Expense comparison" subtitle={tab === 'head' ? 'By expense head' : 'Revenue vs expenses by outlet'} icon={<Receipt className="size-3.5" />}
      actions={<Segmented size="sm" value={tab} onChange={setTab} items={[{ value: 'head', label: 'Heads' }, { value: 'outlet', label: 'Outlets' }]} />}>
      <div className="h-[262px]">
        <ResponsiveContainer width="100%" height="100%">
          {tab === 'head' ? (
            <BarChart data={heads} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis type="number" tick={CHART.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} />
              <YAxis type="category" dataKey="name" tick={{ ...CHART.axis, fontSize: 10.5 }} axisLine={false} tickLine={false} width={96} />
              <Tooltip {...tooltipStyle} formatter={(v) => [fmtMoney(v), 'Amount']} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={14}>
                {heads.map((h, i) => <Cell key={h.name} fill={CHART.series[(i + 3) % CHART.series.length]} />)}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={byOutlet} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="name" tick={CHART.axis} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={CHART.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={56} />
              <Tooltip {...tooltipStyle} formatter={(v, n) => [fmtMoney(v), n === 'revenue' ? 'Revenue' : 'Expenses']} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="revenue" fill={CHART.navy} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="expenses" fill={CHART.orange} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

/* ------------------------------------------------------------------ Outlet performance (target achievement) */
export function PerformanceCard({ m }: { m: DashMetrics }) {
  const data = m.rows.map((r) => ({ name: r.outlet.short, value: Math.round((r.revenue / r.target) * 100), fill: r.outlet.color, revenue: r.revenue, target: r.target }))
  return (
    <ChartCard title="Outlet performance" subtitle="Revenue vs target (prev. period +6%)" icon={<Target className="size-3.5" />}>
      <div className="h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart data={data} innerRadius="28%" outerRadius="100%" startAngle={90} endAngle={-270} barSize={10}>
            <PolarAngleAxis type="number" domain={[0, 120]} tick={false} />
            <RadialBar dataKey="value" background={{ fill: '#f1f5f9' }} cornerRadius={6} />
            <Tooltip {...tooltipStyle} formatter={(v) => [`${v}% of target`, 'Achievement']} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 space-y-2">
        {data.map((d) => (
          <div key={d.name}>
            <div className="mb-0.5 flex items-center justify-between text-[11.5px]">
              <span className="flex items-center gap-1.5 text-slate-600"><span className="size-2 rounded-full" style={{ background: d.fill }} />{d.name}</span>
              <span className="tabular text-slate-500">{inrShort(d.revenue)} / {inrShort(d.target)} · <b className={d.value >= 100 ? 'text-emerald-600' : d.value >= 90 ? 'text-amber-600' : 'text-rose-600'}>{d.value}%</b></span>
            </div>
            <Progress value={Math.min(100, d.value)} tone={d.value >= 100 ? 'green' : d.value >= 90 ? 'amber' : 'red'} />
          </div>
        ))}
      </div>
    </ChartCard>
  )
}


