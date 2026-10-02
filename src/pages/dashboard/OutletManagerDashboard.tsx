import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChefHat, Clock, IndianRupee, LayoutGrid, MapPin, Phone, ReceiptText, ShoppingBag, Smartphone, Sparkles, UserCheck, UserRound, Users } from 'lucide-react'
import { Badge, Button, CHART, Card, PageHeader, StatCard, StatusBadge, tooltipStyle } from '@/components/ui'
import { useUI } from '@/components/layout/uiStore'
import { useStore } from '@/store/useStore'
import { useCurrentUser, usePermission, useWorkingOutlet } from '@/store/hooks'
import { hourlySeries } from '@/data/analytics'
import { cn, inr, inrShort } from '@/lib/format'
import type { TableStatus } from '@/types'
import { OutletStatusMenu } from '@/pages/outlets/OutletDetailDrawer'
import { analyticsIds, ChartCard, delta, greeting, todayLong, useDashMetrics, useTodayAttendance } from './dashShared'
import { TopItemsCard } from './OwnerCharts'
import { ApprovalsCard, LowStockCard, RecentOrdersCard } from './Widgets'

const FLOOR: { s: TableStatus; cls: string }[] = [
  { s: 'Available', cls: 'bg-emerald-500' }, { s: 'Occupied', cls: 'bg-sky-500' }, { s: 'Billing', cls: 'bg-amber-500' },
  { s: 'Reserved', cls: 'bg-violet-500' }, { s: 'Cleaning', cls: 'bg-slate-400' },
]

export default function OutletManagerDashboard() {
  const m = useDashMetrics('today')
  const outletId = useWorkingOutlet()
  const outlet = useStore((s) => s.outlets.find((o) => o.id === outletId))
  const tables = useStore((s) => s.tables)
  const kots = useStore((s) => s.kots)
  const user = useCurrentUser()
  const ui = useUI()
  const nav = useNavigate()
  const { can } = usePermission()
  const att = useTodayAttendance()

  const outletTables = tables.filter((t) => m.outletIds.includes(t.outletId))
  const counts = FLOOR.map((f) => ({ ...f, n: outletTables.filter((t) => t.status === f.s).length }))
  const active = outletTables.filter((t) => t.status === 'Occupied' || t.status === 'Billing').length
  const pendingKots = kots.filter((k) => m.outletIds.includes(k.outletId) && (k.status === 'New' || k.status === 'Preparing'))
  const ids = analyticsIds(m.outletIds)
  const hourly = useMemo(() => {
    if (!ids.length) return []
    const h = new Date().getHours()
    return hourlySeries(ids).map((x) => ({ ...x, sales: x.hour === h ? x.sales + m.live.revenue : x.sales, today: x.hour <= h }))
  }, [ids.join(), m.live.revenue])

  if (!outlet) return null

  return (
    <div className="space-y-4">
      <PageHeader className="mb-0" title={`${greeting()}, ${user.name.split(' ')[0]}`} subtitle={`${todayLong()} · Outlet dashboard`}
        actions={<>
          <Button variant="accent" icon={<Smartphone className="size-3.5" />} onClick={() => ui.setMobilePreview(true)}>Mobile App Preview</Button>
          <Button icon={<Sparkles className="size-3.5" />} onClick={() => ui.setScenarios(true)}>Demo Scenarios</Button>
          {can('pos', 'create') && <Button variant="primary" icon={<ReceiptText className="size-3.5" />} onClick={() => nav('/pos?new=1')}>New Bill</Button>}
        </>} />

      {/* Banner */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4" style={{ background: `linear-gradient(100deg, ${outlet.color}14, transparent 60%)` }}>
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-xl text-[13px] font-bold text-white shadow-sm" style={{ background: outlet.color }}>{outlet.code.split('-')[1] ?? outlet.code}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold text-slate-900">{outlet.name}</h2>
                <OutletStatusMenu outletId={outlet.id} size="xs" />
              </div>
              <p className="flex flex-wrap items-center gap-x-3 text-[12px] text-slate-500">
                <span>{outlet.code}</span>
                <span className="flex items-center gap-1"><MapPin className="size-3" />{outlet.city}</span>
                <span className="flex items-center gap-1"><UserRound className="size-3" />{outlet.manager}</span>
                <span className="flex items-center gap-1"><Clock className="size-3" />{outlet.hours}</span>
                <span className="flex items-center gap-1"><Phone className="size-3" />{outlet.phone}</span>
              </p>
            </div>
          </div>
          {/* floor strip */}
          <button onClick={() => nav('/tables')} className="ml-auto flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 p-1.5 text-left transition hover:border-brand-300" title="Open floor plan">
            <span className="px-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><LayoutGrid className="mb-0.5 inline size-3.5" /> Floor</span>
            {counts.map((c) => (
              <span key={c.s} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1">
                <span className={cn('size-2 rounded-full', c.cls)} />
                <span className="text-[13px] font-semibold text-slate-800 tabular">{c.n}</span>
                <span className="text-[10.5px] text-slate-500">{c.s}</span>
              </span>
            ))}
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Today’s sales" value={inrShort(m.revenue)} delta={delta(m.revenue, m.prevRevenue)} icon={<IndianRupee />} tone="teal" sub={m.live.revenue ? `+${inrShort(m.live.revenue)} live` : 'vs yesterday'} />
        <StatCard label="Total orders" value={m.orders} delta={delta(m.orders, m.prevOrders)} icon={<ShoppingBag />} sub={`AOV ${inr(m.aov)}`} onClick={() => nav('/orders')} />
        <StatCard label="Active tables" value={`${active}/${outletTables.length}`} icon={<LayoutGrid />} tone="blue" sub={inrShort(m.live.runningValue) + ' running'} onClick={() => nav('/tables')} />
        <StatCard label="Pending KOTs" value={pendingKots.length} icon={<ChefHat />} tone="orange" sub={`${pendingKots.filter((k) => k.status === 'New').length} new`} onClick={() => nav('/kot')} />
        <StatCard label="Staff present" value={`${att.present + att.late}/${att.total}`} icon={<UserCheck />} tone="green" sub={`${att.absent + att.notIn} absent / not in`} onClick={() => nav('/attendance')} />
        <StatCard label="Alerts" value={m.lowStock.length + m.pendingApprovals.length} icon={<Users />} tone="amber" sub={`${m.lowStock.length} stock · ${m.pendingApprovals.length} approvals`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8 [&>*]:h-full">
          <ChartCard title="Hourly sales" subtitle="Today · live orders included in the current hour" icon={<IndianRupee className="size-3.5" />}>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={hourly} margin={{ top: 4, right: 0, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="omHour" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={outlet.color} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={outlet.color} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="label" tick={CHART.axis} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="l" tick={CHART.axis} axisLine={false} tickLine={false} tickFormatter={(v: number) => inrShort(v)} width={52} />
                  <YAxis yAxisId="r" orientation="right" tick={CHART.axis} axisLine={false} tickLine={false} width={28} />
                  <Tooltip {...tooltipStyle} formatter={(v, n) => (n === 'sales' ? [inr(Number(v)), 'Sales'] : [String(v), 'Orders'])} />
                  <Bar yAxisId="r" dataKey="orders" fill="#e2e8f0" radius={[3, 3, 0, 0]} maxBarSize={14} />
                  <Area yAxisId="l" type="monotone" dataKey="sales" stroke={outlet.color} strokeWidth={2} fill="url(#omHour)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
        <div className="xl:col-span-4 [&>*]:h-full"><ApprovalsCard limit={4} /></div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <RecentOrdersCard className="xl:col-span-8" limit={7} />
        <div className="xl:col-span-4 [&>*]:h-full"><TopItemsCard m={m} /></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <LowStockCard m={m} />
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-[13px] font-semibold text-slate-900">Staff on duty</h3>
            <Button size="xs" variant="ghost" onClick={() => nav('/attendance')}>Attendance</Button>
          </div>
          <div className="grid gap-1.5 p-3 sm:grid-cols-2">
            {att.emps.map((e) => {
              const rec = att.recs.find((r) => r.employeeId === e.id)
              return (
                <div key={e.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-2.5 py-1.5">
                  <span className="flex size-6 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: e.color }}>{e.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-slate-800">{e.name}</p>
                    <p className="truncate text-[10.5px] text-slate-400">{e.designation}{rec?.checkIn ? ` · in ${rec.checkIn}` : ''}</p>
                  </div>
                  {rec ? <StatusBadge status={rec.status} /> : <Badge tone="gray">Not in</Badge>}
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
