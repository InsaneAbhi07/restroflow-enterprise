import { useMemo, useState } from 'react'
import { CalendarClock, ChefHat, Plus, Sparkles, Users } from 'lucide-react'
import type { Table } from '@/types'
import { useStore } from '@/store/useStore'
import { computeTotals } from '@/lib/billing'
import { cn, inr, minutesSince } from '@/lib/format'
import { VegMark } from '@/components/ui'
import { LIVE_TONE, liveStatus, useMe, useMobile } from './ctx'
import { BottomSheet, Chip, MButton, MHeader } from './ui'

const STATUS_STYLE: Record<Table['status'], { card: string; dot: string; label: string }> = {
  Available: { card: 'border-emerald-200 bg-emerald-50 text-emerald-900', dot: 'bg-emerald-500', label: 'Free' },
  Occupied: { card: 'border-sky-300 bg-sky-500 text-white', dot: 'bg-white', label: 'Occupied' },
  Billing: { card: 'border-amber-300 bg-amber-400 text-white', dot: 'bg-white', label: 'Billing' },
  Reserved: { card: 'border-violet-200 bg-violet-50 text-violet-900', dot: 'bg-violet-500', label: 'Reserved' },
  Cleaning: { card: 'border-slate-200 bg-slate-100 text-slate-500', dot: 'bg-slate-400', label: 'Cleaning' },
}
type Filter = 'All' | 'Mine' | 'Free' | 'Occupied'

export function TablesScreen() {
  const { emp } = useMe()
  const m = useMobile()
  const tables = useStore((s) => s.tables)
  const [filter, setFilter] = useState<Filter>('All')
  const outletTables = useMemo(() => tables.filter((t) => t.outletId === emp?.outletId), [tables, emp])
  const floors = useMemo(() => [...new Set(outletTables.map((t) => t.floor))], [outletTables])
  const [floor, setFloor] = useState<string>('All')
  if (!emp) return null

  const shown = outletTables.filter((t) => (floor === 'All' || t.floor === floor) && (
    filter === 'All' || (filter === 'Mine' && t.waiterId === emp.id && (t.status === 'Occupied' || t.status === 'Billing')) ||
    (filter === 'Free' && t.status === 'Available') || (filter === 'Occupied' && (t.status === 'Occupied' || t.status === 'Billing'))))
  const count = (f: Filter) => outletTables.filter((t) => f === 'All' || (f === 'Mine' ? t.waiterId === emp.id && (t.status === 'Occupied' || t.status === 'Billing') : f === 'Free' ? t.status === 'Available' : t.status === 'Occupied' || t.status === 'Billing')).length

  const open = (t: Table) => {
    if ((t.status === 'Occupied' || t.status === 'Billing') && t.orderId) m.sheet(<RunningOrderSheet table={t} />)
    else if (t.status === 'Cleaning') m.sheet(<CleaningSheet table={t} />)
    else m.sheet(<PaxSheet table={t} />)
  }

  return (
    <div>
      <div className="sticky top-0 z-20">
      <MHeader title="Tables" subtitle={`${count('Free')} free · ${count('Occupied')} occupied`} />
      <div className="space-y-2 bg-slate-50/95 px-4 pb-2 pt-3 backdrop-blur">
        <div className="flex rounded-2xl bg-slate-200/70 p-1">
          {['All', ...floors].map((f) => (
            <button key={f} onClick={() => setFloor(f)} className={cn('h-8 flex-1 rounded-xl text-[12.5px] font-semibold transition', floor === f ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500')}>{f}</button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(['All', 'Mine', 'Free', 'Occupied'] as Filter[]).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}<span className={cn('rounded-full px-1.5 text-[11px]', filter === f ? 'bg-white/20' : 'bg-slate-100')}>{count(f)}</span></Chip>
          ))}
        </div>
      </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 px-4 pt-1">
        {shown.map((t) => {
          const st = STATUS_STYLE[t.status]
          const mine = t.waiterId === emp.id && (t.status === 'Occupied' || t.status === 'Billing')
          return (
            <button key={t.id} onClick={() => open(t)}
              className={cn('relative flex aspect-square flex-col items-center justify-center rounded-2xl border-2 p-1.5 transition active:scale-95', st.card, mine && 'ring-2 ring-navy-900 ring-offset-2')}>
              {mine && <span className="absolute left-1.5 top-1.5 rounded-md bg-navy-900 px-1 text-[9px] font-bold text-white">MINE</span>}
              <span className="text-[22px] font-extrabold leading-none">{t.label}</span>
              <span className="mt-1 flex items-center gap-0.5 text-[11px] opacity-80"><Users className="size-3" />{t.capacity}</span>
              <span className="mt-1 flex items-center gap-1 text-[10.5px] font-semibold"><span className={cn('size-1.5 rounded-full', st.dot)} />{t.since && (t.status === 'Occupied' || t.status === 'Billing') ? `${minutesSince(t.since)}m` : st.label}</span>
            </button>
          )
        })}
      </div>
      {shown.length === 0 && <p className="px-6 py-12 text-center text-[13px] text-slate-500">No tables match this filter.</p>}

      <div className="mx-4 mt-4 flex flex-wrap gap-x-3 gap-y-1 rounded-2xl bg-white p-3 text-[11px] text-slate-500 ring-1 ring-slate-200/70">
        {Object.entries(STATUS_STYLE).map(([k, v]) => <span key={k} className="flex items-center gap-1"><span className={cn('size-2.5 rounded-sm border', v.card)} />{v.label}</span>)}
      </div>
    </div>
  )
}

function PaxSheet({ table }: { table: Table }) {
  const m = useMobile()
  const [pax, setPax] = useState(Math.min(2, table.capacity))
  const max = Math.max(table.capacity + 2, 8)
  return (
    <BottomSheet title={`Table ${table.label}`} onClose={() => m.sheet(null)}
      footer={<MButton variant="accent" className="w-full" onClick={() => { m.setCart(() => []); m.push({ kind: 'menu', tableId: table.id, pax }) }}><Plus className="size-5" />Start order · {pax} guest{pax > 1 ? 's' : ''}</MButton>}>
      <p className="text-[13px] text-slate-500">{table.floor} · seats {table.capacity}</p>
      {table.status === 'Reserved' && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-violet-50 p-3 text-[13px] text-violet-800"><CalendarClock className="size-4.5" />Reserved for <b>{table.reservedFor}</b> at {table.reservedAt}</div>
      )}
      <p className="mb-2 mt-4 text-[13px] font-semibold text-slate-700">How many guests?</p>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => setPax(n)}
            className={cn('h-14 rounded-2xl text-[20px] font-bold transition active:scale-95', pax === n ? 'bg-navy-900 text-white shadow-lg' : 'bg-slate-100 text-slate-700', n > table.capacity && pax !== n && 'text-slate-400')}>{n}</button>
        ))}
      </div>
      {pax > table.capacity && <p className="mt-2 text-[12px] text-amber-600">Exceeds table capacity — consider merging tables.</p>}
    </BottomSheet>
  )
}

function CleaningSheet({ table }: { table: Table }) {
  const m = useMobile()
  const updateTable = useStore((s) => s.updateTable)
  return (
    <BottomSheet title={`Table ${table.label}`} onClose={() => m.sheet(null)}
      footer={<MButton variant="accent" className="w-full" onClick={() => { updateTable(table.id, { status: 'Available', waiterId: undefined }); m.sheet(null); m.snack(`Table ${table.label} marked ready`) }}><Sparkles className="size-5" />Mark as cleaned</MButton>}>
      <p className="text-[13.5px] text-slate-600">This table is being cleaned after the last guests. Mark it as available once it is ready for seating.</p>
    </BottomSheet>
  )
}

function RunningOrderSheet({ table }: { table: Table }) {
  const m = useMobile()
  const order = useStore((s) => s.orders.find((o) => o.id === table.orderId))
  const kots = useStore((s) => s.kots)
  if (!order) return null
  const t = computeTotals(order)
  const st = liveStatus(order, kots)
  const items = order.items.filter((i) => !i.cancelled)
  return (
    <BottomSheet title={<div className="flex items-center gap-2">Table {table.label}<span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', LIVE_TONE[st])}>{order.status === 'Billed' ? 'Billed' : st}</span></div>} onClose={() => m.sheet(null)}
      footer={
        <div className="flex gap-2">
          <MButton variant="outline" className="flex-1" onClick={() => m.push({ kind: 'order', orderId: order.id })}><ChefHat className="size-5" />Track</MButton>
          <MButton variant="accent" className="flex-[1.4]" disabled={order.status !== 'Running'} onClick={() => { m.setCart(() => []); m.push({ kind: 'menu', tableId: table.id, pax: order.pax ?? 2, orderId: order.id }) }}><Plus className="size-5" />Add items</MButton>
        </div>
      }>
      <p className="text-[12.5px] text-slate-500">{order.no} · {order.pax ?? '-'} guests · {order.waiterName} · {minutesSince(order.createdAt)} min</p>
      <div className="mt-3 divide-y divide-slate-100 rounded-2xl bg-slate-50 px-3">
        {items.map((i) => (
          <div key={i.id} className="flex items-center gap-2 py-2.5 text-[13.5px]">
            <VegMark veg={i.veg} />
            <span className="w-6 font-bold text-slate-500">{i.qty}×</span>
            <span className="min-w-0 flex-1 truncate">{i.name}{i.variant && <span className="text-slate-400"> · {i.variant}</span>}</span>
            <span className="text-[11px] text-slate-400">{i.kotNo}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[15px] font-bold"><span>Bill total</span><span className="tabular">{inr(t.total)}</span></div>
      {order.status === 'Billed' && <p className="mt-1 text-[12px] text-violet-600">Bill printed {order.billNo} — awaiting settlement at counter.</p>}
    </BottomSheet>
  )
}
