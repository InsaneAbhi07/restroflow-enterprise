import { useMemo } from 'react'
import { BedDouble, Coffee, ConciergeBell, IndianRupee, Send, Utensils } from 'lucide-react'
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, Progress, StatCard, StatusBadge, type Column } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { isToday, usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { computeTotals } from '@/lib/billing'
import { fmtTime, inr } from '@/lib/format'
import type { Order } from '@/types'
import { useHotel } from './hotelStore'
import { mealAllowance, postOrderToRoom, useInHouseGuests } from './roomBilling'

type Row = Order & { total: number; roomAmt: number; guest?: string }

/** Front-desk view of today's restaurant activity for hotel guests + meal-plan redemption */
export function InRoomDining({ onOpenStay }: { onOpenStay: (resId: string) => void }) {
  const orders = useStore((s) => s.orders)
  const { reservations, mealUse, config } = useHotel()
  const guests = useInHouseGuests()
  const { can } = usePermission()

  const rows: Row[] = useMemo(() => orders
    .filter((o) => o.outletId === config.outletId && (o.resId || o.type === 'Room Service') && (isToday(o.createdAt) || (o.status !== 'Settled' && o.status !== 'Cancelled')))
    .map((o) => ({
      ...o, total: computeTotals(o).total,
      roomAmt: o.payments.filter((p) => p.mode === 'Room').reduce((s, p) => s + p.amount, 0),
      guest: reservations.find((r) => r.id === o.resId)?.guest.name ?? o.customerName,
    }))
    .sort((a, b) => b.createdAt - a.createdAt), [orders, reservations, config.outletId])

  const open = rows.filter((r) => r.status !== 'Settled' && r.status !== 'Cancelled')
  const charged = rows.filter((r) => r.status === 'Settled').reduce((s, r) => s + r.roomAmt, 0)
  const meals = guests.map((g) => ({ g, m: mealAllowance(g.res, g.plan, mealUse) })).filter((x) => x.m)
  const redeemed = meals.reduce((s, x) => s + (x.m?.used ?? 0), 0)
  const entitled = meals.reduce((s, x) => s + (x.m?.allowance ?? 0), 0)

  const post = (id: string) => {
    const r = postOrderToRoom(id)
    if (r.ok) toast.success(r.title, r.body)
    else toast.error(r.title, r.body)
  }

  const cols: Column<Row>[] = [
    { key: 'time', header: 'Time', render: (r) => fmtTime(r.createdAt), sortValue: (r) => r.createdAt },
    { key: 'room', header: 'Room', render: (r) => <span className="font-semibold text-slate-900">{r.roomNo ?? '—'}</span> },
    { key: 'guest', header: 'Guest', render: (r) => <span className="truncate">{r.guest ?? '—'}</span> },
    { key: 'type', header: 'Type', render: (r) => <Badge tone={r.type === 'Room Service' ? 'teal' : 'gray'}>{r.type === 'Room Service' ? (r.source === 'QR Order' ? 'Room QR' : 'Room service') : r.type}</Badge> },
    { key: 'no', header: 'Order', render: (r) => <span className="font-mono text-[12px]">{r.billNo ?? r.no}</span> },
    { key: 'items', header: 'Items', align: 'right', render: (r) => r.items.filter((i) => !i.cancelled).reduce((s, i) => s + i.qty, 0) },
    { key: 'total', header: 'Amount', align: 'right', render: (r) => inr(r.total), sortValue: (r) => r.total },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'pay', header: 'Billing', sortable: false, align: 'right', render: (r) => r.status === 'Settled'
        ? (r.roomAmt > 0 ? <Badge tone="teal">To room {inr(r.roomAmt)}</Badge> : <span className="text-[11.5px] text-slate-500">{r.payments.map((p) => p.mode).join(' + ')}</span>)
        : r.status === 'Cancelled' ? null
          : r.resId && can('hotel', 'edit') && <Button size="xs" variant="primary" icon={<Send className="size-3" />} onClick={(e) => { e.stopPropagation(); post(r.id) }}>Post to room</Button>,
    },
  ]

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Room-service orders today" value={rows.filter((r) => r.type === 'Room Service' && isToday(r.createdAt)).length} icon={<ConciergeBell />} tone="teal" sub={`${rows.filter((r) => r.source === 'QR Order').length} via in-room QR`} />
        <StatCard label="F&B charged to rooms" value={inr(charged)} icon={<IndianRupee />} tone="green" sub="today, incl. GST" />
        <StatCard label="Open orders on rooms" value={open.length} icon={<Utensils />} tone="amber" sub={open.length ? inr(open.reduce((s, r) => s + r.total, 0)) + ' to post' : 'all posted'} />
        <StatCard label="Meal-plan redemption" value={entitled ? `${Math.round((redeemed / entitled) * 100)}%` : '—'} icon={<Coffee />} tone="violet" sub={`${inr(redeemed)} of ${inr(entitled)} today`} />
      </div>

      <Card>
        <CardHeader title="Restaurant orders for hotel guests" subtitle={`Room service, in-room QR and diners who charge to their room · ${config.name}`} icon={<BedDouble className="size-3.5" />} />
        <DataTable columns={cols} rows={rows} pageSize={10} onRowClick={(r) => r.resId && onOpenStay(r.resId)}
          empty={<EmptyState icon={<ConciergeBell />} title="No guest orders yet today" body="Use POS → Room, or Scan QR Menu → Hotel rooms, to place an in-room order." />} />
      </Card>

      <Card>
        <CardHeader title="Meal plans today" subtitle="Daily allowance from CP / MAP / AP plans and how much was used at the restaurant" icon={<Coffee className="size-3.5" />} />
        {meals.length === 0 ? <EmptyState icon={<Coffee />} title="No in-house guests on meal plans" /> : (
          <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {meals.map(({ g, m }) => (
              <button key={g.res.id} onClick={() => onOpenStay(g.res.id)} className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-slate-300">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-sky-600 text-[12px] font-bold text-white">{g.room?.no}</span>
                  <div className="min-w-0 flex-1"><div className="truncate text-[12.5px] font-semibold text-slate-900">{g.res.guest.name}</div><div className="text-[11px] text-slate-500">{m!.plan.code} · {m!.plan.meals} · {g.res.adults + g.res.children} pax</div></div>
                  <span className="text-right text-[11.5px] tabular text-slate-600">{inr(m!.used)} / {inr(m!.allowance)}</span>
                </div>
                <Progress className="mt-2" value={(m!.used / m!.allowance) * 100} tone={m!.used >= m!.allowance ? 'green' : 'teal'} />
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
