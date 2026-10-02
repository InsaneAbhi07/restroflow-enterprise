import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRightLeft, ChevronDown, Clock, Mail, MapPin, Pencil, Phone, Power, Wrench, CheckCircle2 } from 'lucide-react'
import {
  Avatar, Badge, Button, CHART, Divider, Dropdown, KeyValue, MenuItemBtn, StatusBadge, VegMark, tooltipStyle,
} from '@/components/ui'
import { useStore } from '@/store/useStore'
import { usePermission, useScope } from '@/store/hooks'
import { toast } from '@/store/toast'
import { topItems } from '@/data/analytics'
import { OUTLETS } from '@/data/outlets'
import { cn, fmtDate, inr, inrShort, isoDate } from '@/lib/format'
import { Drawer } from '@/components/ui'
import type { OutletStatus, TableStatus } from '@/types'
import { useOutletStats } from './outletStats'

/* ------------------------------------------------------------------ status menu */
const STATUS_ICON: Record<OutletStatus, JSX.Element> = {
  Open: <CheckCircle2 />, Closed: <Power />, Maintenance: <Wrench />,
}
export function OutletStatusMenu({ outletId, size = 'sm' }: { outletId: string; size?: 'xs' | 'sm' }) {
  const outlet = useStore((s) => s.outlets.find((o) => o.id === outletId))
  const upsert = useStore((s) => s.upsertOutlet)
  const log = useStore((s) => s.log)
  const { can } = usePermission()
  if (!outlet) return null
  const set = (status: OutletStatus) => {
    if (status === outlet.status) return
    upsert({ ...outlet, status })
    log(`Changed ${outlet.short} status to ${status}`, 'outlets', status === 'Open' ? 'success' : 'warning', outlet.id)
    toast.success(`${outlet.short} is now ${status}`, status === 'Closed' ? 'POS & QR ordering paused for this outlet' : status === 'Maintenance' ? 'Outlet flagged for maintenance' : 'Outlet accepting orders')
  }
  if (!can('outlets', 'edit')) return <StatusBadge status={outlet.status} />
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Dropdown width={190} trigger={
        <button className="inline-flex items-center gap-1 rounded-md hover:opacity-80" title="Change status">
          <StatusBadge status={outlet.status} /><ChevronDown className={cn('text-slate-400', size === 'xs' ? 'size-3' : 'size-3.5')} />
        </button>
      }>
        {(['Open', 'Closed', 'Maintenance'] as OutletStatus[]).map((s) => (
          <MenuItemBtn key={s} icon={STATUS_ICON[s]} onClick={() => set(s)}>
            {s}{s === outlet.status && <span className="ml-1 text-[10.5px] text-slate-400">(current)</span>}
          </MenuItemBtn>
        ))}
      </Dropdown>
    </div>
  )
}

/* ------------------------------------------------------------------ drawer */
const TABLE_TONES: Record<TableStatus, string> = {
  Available: 'bg-emerald-50 text-emerald-700', Occupied: 'bg-sky-50 text-sky-700', Reserved: 'bg-violet-50 text-violet-700', Billing: 'bg-amber-50 text-amber-700', Cleaning: 'bg-slate-100 text-slate-600',
}

export function OutletDetailDrawer({ outletId, onClose, onEdit }: { outletId: string | null; onClose: () => void; onEdit?: (id: string) => void }) {
  const outlets = useStore((s) => s.outlets)
  const outlet = outlets.find((o) => o.id === outletId)
  const employees = useStore((s) => s.employees)
  const attendance = useStore((s) => s.attendance)
  const tables = useStore((s) => s.tables)
  const setOutlet = useStore((s) => s.setOutlet)
  const { can } = usePermission()
  const { allowed, single } = useScope()
  const list = useMemo(() => (outlet ? [outlet] : []), [outlet])
  const stats = useOutletStats(list)
  const st = outlet ? stats[outlet.id] : undefined

  const staff = useMemo(() => {
    if (!outlet) return []
    const today = isoDate()
    return employees.filter((e) => e.outletId === outlet.id && e.status !== 'Inactive').map((e) => ({ e, att: attendance.find((a) => a.employeeId === e.id && a.date === today) }))
  }, [outlet, employees, attendance])
  const tableCounts = useMemo(() => {
    const c: Record<TableStatus, number> = { Available: 0, Occupied: 0, Reserved: 0, Billing: 0, Cleaning: 0 }
    tables.filter((t) => t.outletId === outletId).forEach((t) => c[t.status]++)
    return c
  }, [tables, outletId])
  const items = useMemo(() => (outlet && OUTLETS.some((o) => o.id === outlet.id) ? topItems([outlet.id], 5) : []), [outlet])

  if (!outlet || !st) return null
  const canSwitch = allowed.includes(outlet.id)
  const aov = st.todayOrders ? st.todaySales / st.todayOrders : 0
  const dlt = st.yesterdaySales ? ((st.todaySales - st.yesterdaySales) / st.yesterdaySales) * 100 : 0

  return (
    <Drawer open={!!outletId} onClose={onClose} width={560}
      icon={<span className="flex size-10 items-center justify-center rounded-xl text-[12px] font-bold text-white" style={{ background: outlet.color }}>{outlet.code.split('-')[1] ?? outlet.code.slice(0, 2)}</span>}
      title={outlet.name}
      subtitle={<span className="flex items-center gap-2">{outlet.code} · {outlet.city}</span>}
      footer={
        <>
          {can('outlets', 'edit') && onEdit && <Button icon={<Pencil className="size-3.5" />} onClick={() => onEdit(outlet.id)}>Edit outlet</Button>}
          <Button variant="primary" icon={<ArrowRightLeft className="size-3.5" />} disabled={!canSwitch || single === outlet.id}
            onClick={() => { setOutlet(outlet.id); toast.success(`Switched to ${outlet.short}`, 'All screens now show this outlet’s data'); onClose() }}>
            {single === outlet.id ? 'Current outlet' : 'Switch to this outlet'}
          </Button>
        </>
      }>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <OutletStatusMenu outletId={outlet.id} />
          <Badge tone="gray"><Clock className="size-3" />{outlet.hours}</Badge>
          <Badge tone="navy">{outlet.seats} seats</Badge>
          <Badge tone="teal">Since {fmtDate(outlet.openedOn)}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Today’s sales', inrShort(st.todaySales), `${dlt >= 0 ? '▲' : '▼'} ${Math.abs(dlt).toFixed(1)}%`, dlt >= 0],
            ['Orders', String(st.todayOrders), `${st.liveRevenue ? inrShort(st.liveRevenue) + ' live' : 'today'}`, true],
            ['Avg bill', inr(aov), 'per order', true],
            ['Tables running', `${st.running}/${st.tables}`, `${st.present}/${st.employees} staff in`, true],
          ].map(([l, v, s, good]) => (
            <div key={l as string} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
              <p className="text-[11px] text-slate-500">{l}</p>
              <p className="text-[15px] font-semibold text-slate-900 tabular">{v}</p>
              <p className={cn('text-[10.5px]', good ? 'text-emerald-600' : 'text-rose-600')}>{s}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-semibold text-slate-800">Last 7 days</p>
            <span className="text-[11.5px] text-slate-500">Total <b className="text-slate-800 tabular">{inr(st.weekSales)}</b></span>
          </div>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={st.week} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id={`od_${outlet.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={outlet.color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={outlet.color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" tick={CHART.axis} axisLine={false} tickLine={false} />
                <YAxis tick={CHART.axis} axisLine={false} tickLine={false} tickFormatter={(v: number) => inrShort(v)} width={52} />
                <Tooltip {...tooltipStyle} formatter={(v) => [inr(Number(v)), 'Sales']} />
                <Area type="monotone" dataKey="sales" stroke={outlet.color} strokeWidth={2} fill={`url(#od_${outlet.id})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <Divider label="Contact & compliance" />
        <KeyValue items={[
          [<span className="flex items-center gap-1"><MapPin className="size-3" />Address</span>, <span className="whitespace-normal">{outlet.address}</span>],
          ['Outlet manager', outlet.manager],
          [<span className="flex items-center gap-1"><Phone className="size-3" />Phone</span>, outlet.phone],
          [<span className="flex items-center gap-1"><Mail className="size-3" />Email</span>, outlet.email],
          ['GSTIN', <span className="font-mono text-[12px]">{outlet.gstin}</span>],
          ['FSSAI licence', <span className="font-mono text-[12px]">{outlet.fssai}</span>],
        ]} />

        <Divider label="Tables" />
        <div className="grid grid-cols-5 gap-1.5">
          {(Object.keys(tableCounts) as TableStatus[]).map((k) => (
            <div key={k} className={cn('rounded-lg px-2 py-1.5 text-center', TABLE_TONES[k])}>
              <p className="text-[15px] font-semibold tabular">{tableCounts[k]}</p>
              <p className="text-[10px]">{k}</p>
            </div>
          ))}
        </div>

        <Divider label={`Staff (${staff.length})`} />
        <div className="grid gap-1.5 sm:grid-cols-2">
          {staff.map(({ e, att }) => (
            <div key={e.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-2.5 py-1.5">
              <Avatar name={e.name} color={e.color} size={26} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-slate-800">{e.name}</p>
                <p className="truncate text-[10.5px] text-slate-400">{e.designation}</p>
              </div>
              {att ? <StatusBadge status={att.status} /> : <Badge tone="gray">Not in</Badge>}
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <>
            <Divider label="Top items" />
            <ul className="space-y-1.5">
              {items.map((it, i) => (
                <li key={it.id} className="flex items-center gap-2.5 text-[12.5px]">
                  <span className="w-4 text-[11px] font-bold text-slate-400">{i + 1}</span>
                  <span className="text-[16px]">{it.emoji}</span>
                  <VegMark veg={it.veg} />
                  <span className="flex-1 truncate text-slate-700">{it.name}</span>
                  <span className="text-[11px] text-slate-400 tabular">{it.qty} sold</span>
                  <span className="w-16 text-right font-semibold text-slate-800 tabular">{inrShort(it.revenue)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Drawer>
  )
}
