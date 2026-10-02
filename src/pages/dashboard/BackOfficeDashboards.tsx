import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  ArrowLeftRight, BadgeIndianRupee, Boxes, Cake, CalendarCheck, ClipboardList, Clock, PackageX, Plus, ShoppingCart, Truck, UserCheck, UserMinus,
  Users, UserX, Plane,
} from 'lucide-react'
import { Avatar, Badge, Button, CHART, Card, CardHeader, EmptyState, Legend, PageHeader, StatCard, StatusBadge, tooltipStyle } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { useCurrentUser, usePermission, useScope } from '@/store/hooks'
import { fmtDate, inr, inrShort, isoDate, monthLabel, timeAgo } from '@/lib/format'
import { ChartCard, greeting, todayLong, useDashMetrics, useTodayAttendance } from './dashShared'
import { ApprovalsCard, AttendanceCard, LowStockCard } from './Widgets'

const outletShort = (id: string) => useStore.getState().outlets.find((o) => o.id === id)?.short ?? id

/* ================================================================== Inventory */
export function InventoryDashboard() {
  const user = useCurrentUser()
  const { outletIds, isAll } = useScope()
  const materials = useStore((s) => s.materials)
  const pos = useStore((s) => s.purchaseOrders)
  const transfers = useStore((s) => s.transfers)
  const suppliers = useStore((s) => s.suppliers)
  const movements = useStore((s) => s.movements)
  const outlets = useStore((s) => s.outlets)
  const { can } = usePermission()
  const nav = useNavigate()
  const m = useDashMetrics('today')

  const d = useMemo(() => {
    const value = materials.reduce((s, mt) => s + outletIds.reduce((a, o) => a + (mt.stock[o] ?? 0) * mt.cost, 0), 0)
    const byCat: Record<string, number> = {}
    materials.forEach((mt) => { byCat[mt.category] = (byCat[mt.category] ?? 0) + outletIds.reduce((a, o) => a + (mt.stock[o] ?? 0) * mt.cost, 0) })
    const cats = Object.entries(byCat).map(([name, v]) => ({ name, value: Math.round(v) })).sort((a, b) => b.value - a.value)
    const byOutlet = outletIds.map((o) => ({ name: outletShort(o), value: Math.round(materials.reduce((s, mt) => s + (mt.stock[o] ?? 0) * mt.cost, 0)), color: outlets.find((x) => x.id === o)?.color ?? CHART.navy }))
    const pendingPOs = pos.filter((p) => outletIds.includes(p.outletId) && ['Draft', 'Pending Approval', 'Approved', 'Partially Received'].includes(p.status))
    const poValue = (p: typeof pos[number]) => p.items.reduce((s, i) => s + i.qty * i.rate, 0)
    const openTransfers = transfers.filter((t) => (outletIds.includes(t.from) || outletIds.includes(t.to)) && ['Pending Approval', 'Approved', 'In Transit'].includes(t.status))
    const expiring = materials.filter((mt) => mt.expiry && new Date(mt.expiry).getTime() - Date.now() < 7 * 864e5).length
    const recent = movements.filter((mv) => outletIds.includes(mv.outletId)).slice(0, 8)
    return { value, cats, byOutlet, pendingPOs, poValue, openTransfers, expiring, recent }
  }, [materials, pos, transfers, movements, outletIds, outlets])
  const out = m.lowStock.filter((l) => l.out).length

  return (
    <div className="space-y-4">
      <PageHeader className="mb-0" title={`${greeting()}, ${user.name.split(' ')[0]}`} subtitle={`${todayLong()} · Stores & purchasing`}
        actions={<>
          {can('transfer', 'create') && <Button icon={<ArrowLeftRight className="size-3.5" />} onClick={() => nav('/inventory/transfers')}>New transfer</Button>}
          {can('purchase', 'create') && <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => nav('/inventory/purchases')}>New purchase order</Button>}
        </>} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Stock value" value={inrShort(d.value)} icon={<Boxes />} tone="teal" sub={`${materials.length} materials`} onClick={() => nav('/inventory')} />
        <StatCard label="Low stock" value={m.lowStock.length - out} icon={<PackageX />} tone="amber" sub="below minimum" onClick={() => nav('/inventory')} />
        <StatCard label="Out of stock" value={out} icon={<UserX />} tone="red" sub="reorder now" onClick={() => nav('/inventory')} />
        <StatCard label="Pending POs" value={d.pendingPOs.length} icon={<ShoppingCart />} tone="violet" sub={inrShort(d.pendingPOs.reduce((s, p) => s + d.poValue(p), 0)) + ' value'} onClick={() => nav('/inventory/purchases')} />
        <StatCard label="Open transfers" value={d.openTransfers.length} icon={<Truck />} tone="blue" sub={`${d.openTransfers.filter((t) => t.status === 'In Transit').length} in transit`} onClick={() => nav('/inventory/transfers')} />
        <StatCard label="Expiring ≤ 7 days" value={d.expiring} icon={<Clock />} tone="orange" sub="use first (FEFO)" />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7 [&>*]:h-full">
          <ChartCard title="Stock value by category" subtitle="Valued at last purchase cost" icon={<Boxes className="size-3.5" />}>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.cats} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} horizontal={false} />
                  <XAxis type="number" tick={CHART.axis} axisLine={false} tickLine={false} tickFormatter={(v: number) => inrShort(v)} />
                  <YAxis type="category" dataKey="name" tick={{ ...CHART.axis, fontSize: 10.5 }} axisLine={false} tickLine={false} width={104} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [inr(Number(v)), 'Value']} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={13}>
                    {d.cats.map((c, i) => <Cell key={c.name} fill={CHART.series[i % CHART.series.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
        <div className="xl:col-span-5 [&>*]:h-full"><LowStockCard m={m} limit={7} /></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <Card>
          <CardHeader title="Pending purchase orders" subtitle={`${d.pendingPOs.length} open`} icon={<ShoppingCart className="size-3.5" />} actions={<Button size="xs" variant="ghost" onClick={() => nav('/inventory/purchases')}>All POs</Button>} />
          <div className="divide-y divide-slate-100">
            {d.pendingPOs.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2 text-[12.5px]">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">{p.no}</p>
                  <p className="truncate text-[10.5px] text-slate-400">{suppliers.find((s) => s.id === p.supplierId)?.name}{isAll ? ` · ${outletShort(p.outletId)}` : ''} · due {fmtDate(p.expected)}</p>
                </div>
                <span className="font-semibold tabular text-slate-800">{inrShort(d.poValue(p))}</span>
                <StatusBadge status={p.status} />
              </div>
            ))}
            {!d.pendingPOs.length && <EmptyState title="No open purchase orders" />}
          </div>
        </Card>
        <Card>
          <CardHeader title="Stock transfers" subtitle="Pending, approved & in transit" icon={<ArrowLeftRight className="size-3.5" />} actions={<Button size="xs" variant="ghost" onClick={() => nav('/inventory/transfers')}>Manage</Button>} />
          <div className="divide-y divide-slate-100">
            {d.openTransfers.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2 text-[12.5px]">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">{t.no}</p>
                  <p className="truncate text-[10.5px] text-slate-400">{outletShort(t.from)} → {outletShort(t.to)} · {t.items.length} items</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
            {!d.openTransfers.length && <EmptyState title="No open transfers" />}
          </div>
        </Card>
        <Card className="lg:col-span-2 2xl:col-span-1">
          <CardHeader title={isAll ? 'Stock value by outlet' : 'Recent stock movements'} icon={<ClipboardList className="size-3.5" />} />
          {isAll ? (
            <div className="p-4">
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={d.byOutlet} dataKey="value" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={2} stroke="none">
                      {d.byOutlet.map((o) => <Cell key={o.name} fill={o.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v) => inr(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <Legend className="mt-3" items={d.byOutlet.map((o) => ({ name: o.name, color: o.color, value: inrShort(o.value) }))} />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {d.recent.map((mv) => (
                <div key={mv.id} className="flex items-center gap-3 px-4 py-2 text-[12.5px]">
                  <span className="min-w-0 flex-1 truncate text-slate-700">{materials.find((x) => x.id === mv.materialId)?.name}</span>
                  <Badge tone={mv.qty >= 0 ? 'green' : 'red'}>{mv.type}</Badge>
                  <span className="w-14 text-right tabular text-slate-600">{mv.qty > 0 ? '+' : ''}{mv.qty}</span>
                  <span className="w-14 text-right text-[10.5px] text-slate-400">{timeAgo(mv.at)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

/* ================================================================== HR */
export function HRDashboard() {
  const user = useCurrentUser()
  const { outletIds } = useScope()
  const employees = useStore((s) => s.employees)
  const attendance = useStore((s) => s.attendance)
  const payrollRuns = useStore((s) => s.payrollRuns)
  const nav = useNavigate()
  const a = useTodayAttendance()

  const d = useMemo(() => {
    const emps = employees.filter((e) => outletIds.includes(e.outletId))
    const active = emps.filter((e) => e.status !== 'Inactive')
    const onLeave = emps.filter((e) => e.status === 'On Leave').length
    const depts: Record<string, number> = {}
    active.forEach((e) => (depts[e.department] = (depts[e.department] ?? 0) + 1))
    const deptData = Object.entries(depts).map(([name, value], i) => ({ name, value, color: CHART.series[i % CHART.series.length] })).sort((x, y) => y.value - x.value)
    // last 14 days attendance %
    const ids = new Set(active.map((e) => e.id))
    const trend = Array.from({ length: 14 }, (_, i) => {
      const dt = new Date(Date.now() - (13 - i) * 864e5)
      const date = isoDate(dt)
      const recs = attendance.filter((r) => r.date === date && ids.has(r.employeeId) && r.status !== 'Weekly Off')
      const present = recs.filter((r) => ['Present', 'Late', 'Half Day'].includes(r.status)).length
      return { label: dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), pct: recs.length ? Math.round((present / recs.length) * 100) : 0, late: recs.filter((r) => r.status === 'Late').length }
    })
    const now = new Date()
    const birthdays = active.map((e) => {
      const [, mm, dd] = e.dob.split('-').map(Number)
      let next = new Date(now.getFullYear(), mm - 1, dd)
      if (next.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) next = new Date(now.getFullYear() + 1, mm - 1, dd)
      return { e, next, days: Math.round((next.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 864e5) }
    }).filter((b) => b.days <= 45).sort((x, y) => x.days - y.days)
    const gross = active.reduce((s, e) => s + e.salary.basic + e.salary.hra + e.salary.allowance + e.salary.incentive, 0)
    const lateToday = attendance.filter((r) => r.date === isoDate() && r.status === 'Late' && ids.has(r.employeeId))
    return { emps, active, onLeave, deptData, trend, birthdays, gross, lateToday }
  }, [employees, attendance, outletIds])
  const month = isoDate().slice(0, 7)
  const run = payrollRuns.find((r) => r.month === month) ?? { month, status: 'Not Started' as const }

  return (
    <div className="space-y-4">
      <PageHeader className="mb-0" title={`${greeting()}, ${user.name.split(' ')[0]}`} subtitle={`${todayLong()} · People & payroll`}
        actions={<>
          <Button icon={<CalendarCheck className="size-3.5" />} onClick={() => nav('/attendance')}>Attendance</Button>
          <Button variant="primary" icon={<BadgeIndianRupee className="size-3.5" />} onClick={() => nav('/payroll')}>Run payroll</Button>
        </>} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Headcount" value={d.active.length} icon={<Users />} sub={`${d.emps.length} on rolls`} onClick={() => nav('/employees')} />
        <StatCard label="Present today" value={a.present} icon={<UserCheck />} tone="green" sub={`of ${a.total} staff`} onClick={() => nav('/attendance')} />
        <StatCard label="Late today" value={a.late} icon={<Clock />} tone="amber" sub="beyond grace period" />
        <StatCard label="Absent / not in" value={a.absent + a.notIn} icon={<UserMinus />} tone="red" sub={`${a.absent} absent · ${a.notIn} not in`} />
        <StatCard label="On leave" value={Math.max(a.leave, d.onLeave)} icon={<Plane />} tone="violet" sub="approved leave" />
        <StatCard label="Payroll" value={run.status} icon={<BadgeIndianRupee />} tone="teal" sub={`${monthLabel(month)} · ${inrShort(d.gross)} gross`} onClick={() => nav('/payroll')} />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8 [&>*]:h-full">
          <ChartCard title="Attendance rate" subtitle="Last 14 days · excluding weekly offs" icon={<CalendarCheck className="size-3.5" />}>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.trend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hrAtt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.pink} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={CHART.pink} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="label" tick={CHART.axis} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis tick={CHART.axis} axisLine={false} tickLine={false} domain={[50, 100]} tickFormatter={(v: number) => v + '%'} />
                  <Tooltip {...tooltipStyle} formatter={(v, n) => (n === 'pct' ? [v + '%', 'Attendance'] : [String(v), 'Late'])} />
                  <Area type="monotone" dataKey="pct" stroke={CHART.pink} strokeWidth={2} fill="url(#hrAtt)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
        <div className="xl:col-span-4 [&>*]:h-full"><AttendanceCard /></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <ChartCard title="Department mix" subtitle={`${d.active.length} active employees`} icon={<Users className="size-3.5" />}>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={d.deptData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={2} stroke="none">
                  {d.deptData.map((x) => <Cell key={x.name} fill={x.color} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <Legend className="mt-3" items={d.deptData.map((x) => ({ name: x.name, color: x.color, value: x.value }))} />
        </ChartCard>
        <Card>
          <CardHeader title="Upcoming birthdays" subtitle="Next 45 days" icon={<Cake className="size-3.5" />} />
          <div className="divide-y divide-slate-100">
            {d.birthdays.slice(0, 7).map(({ e, next, days }) => (
              <div key={e.id} className="flex items-center gap-2.5 px-4 py-2">
                <Avatar name={e.name} color={e.color} size={26} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-slate-800">{e.name}</p>
                  <p className="text-[10.5px] text-slate-400">{e.designation} · {outletShort(e.outletId)}</p>
                </div>
                <Badge tone={days === 0 ? 'pink' : days <= 7 ? 'amber' : 'gray'}>{days === 0 ? 'Today 🎂' : next.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Badge>
              </div>
            ))}
            {!d.birthdays.length && <EmptyState icon={<Cake />} title="No birthdays soon" />}
          </div>
        </Card>
        <Card>
          <CardHeader title="Late arrivals today" subtitle={`${d.lateToday.length} employees`} icon={<Clock className="size-3.5" />} />
          <div className="divide-y divide-slate-100">
            {d.lateToday.slice(0, 7).map((r) => {
              const e = employees.find((x) => x.id === r.employeeId)!
              return (
                <div key={r.id} className="flex items-center gap-2.5 px-4 py-2">
                  <Avatar name={e.name} color={e.color} size={26} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-slate-800">{e.name}</p>
                    <p className="text-[10.5px] text-slate-400">{e.shift} shift · {outletShort(e.outletId)}</p>
                  </div>
                  <span className="text-[12px] font-semibold text-amber-600 tabular">{r.checkIn}</span>
                </div>
              )
            })}
            {!d.lateToday.length && <EmptyState title="Everyone on time" />}
          </div>
        </Card>
        <ApprovalsCard limit={4} />
      </div>
    </div>
  )
}
