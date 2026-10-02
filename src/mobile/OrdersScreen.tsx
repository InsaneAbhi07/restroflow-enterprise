import { useState } from 'react'
import { BellRing, Check, ChefHat, ChevronRight, ClipboardList, Clock, HandPlatter, Plus, Receipt, Utensils } from 'lucide-react'
import type { KotStatus } from '@/types'
import { useStore } from '@/store/useStore'
import { computeTotals, lineTotal } from '@/lib/billing'
import { cn, fmtTime, inr, timeAgo } from '@/lib/format'
import { VegMark } from '@/components/ui'
import { LIVE_TONE, kotProgress, liveStatus, useMe, useMobile, useMyOrders } from './ctx'
import { MButton, MCard, MHeader } from './ui'

const STEPS: KotStatus[] = ['New', 'Preparing', 'Ready', 'Served']
type F = 'Active' | 'Completed' | 'All'

export function OrdersScreen() {
  const m = useMobile()
  const orders = useMyOrders()
  const kots = useStore((s) => s.kots)
  const [f, setF] = useState<F>('Active')
  const active = orders.filter((o) => o.status === 'Running' || o.status === 'Billed')
  const done = orders.filter((o) => o.status === 'Settled' || o.status === 'Cancelled')
  const list = f === 'Active' ? active : f === 'Completed' ? done : orders

  return (
    <div>
      <div className="sticky top-0 z-20">
        <MHeader title="My orders" subtitle={`Today · ${orders.length} orders · live from kitchen`}
          right={<span className="mr-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />Live</span>} />
        <div className="bg-slate-50/95 px-4 pb-2 pt-3 backdrop-blur">
          <div className="flex rounded-2xl bg-slate-200/70 p-1">
            {([['Active', active.length], ['Completed', done.length], ['All', orders.length]] as [F, number][]).map(([k, n]) => (
              <button key={k} onClick={() => setF(k)} className={cn('h-9 flex-1 rounded-xl text-[13px] font-semibold transition', f === k ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500')}>{k} <span className="text-slate-400">{n}</span></button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2.5 px-4 pt-1">
        {list.length === 0 && (
          <div className="flex flex-col items-center py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><ClipboardList className="size-7" /></span>
            <p className="mt-3 text-[14px] font-semibold text-slate-700">No {f.toLowerCase()} orders</p>
            <button onClick={() => m.setTab('tables')} className="mt-3 rounded-full bg-brand-500 px-4 py-2 text-[13px] font-semibold text-white">Take an order</button>
          </div>
        )}
        {list.map((o) => {
          const st = liveStatus(o, kots)
          const okots = kots.filter((k) => k.orderId === o.id)
          const prog = kotProgress(okots)
          const step = STEPS.indexOf(prog)
          const running = o.status === 'Running' || o.status === 'Billed'
          return (
            <MCard key={o.id} onClick={() => m.push({ kind: 'order', orderId: o.id })} className="p-3.5">
              <div className="flex items-start gap-3">
                <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-navy-900 text-white">
                  <span className="text-[9px] font-medium opacity-70">TABLE</span>
                  <span className="text-[15px] font-extrabold leading-none">{o.tableLabel ?? '-'}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14.5px] font-bold text-slate-900">{o.no}</p>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10.5px] font-bold', LIVE_TONE[o.status === 'Billed' ? 'Billed' : st])}>{o.status === 'Billed' ? 'Billed' : st}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-slate-500">{o.items.filter((i) => !i.cancelled).length} items · {okots.length} KOT · {timeAgo(o.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[14.5px] font-bold tabular">{inr(computeTotals(o).total)}</p>
                  <ChevronRight className="ml-auto mt-1 size-4 text-slate-300" />
                </div>
              </div>
              {running && (
                <div className="mt-3 flex items-center gap-1">
                  {STEPS.map((s, i) => (
                    <div key={s} className="flex-1">
                      <div className={cn('h-1.5 rounded-full transition-all', i <= step ? (prog === 'Ready' ? 'bg-emerald-500' : 'bg-brand-500') : 'bg-slate-200')} />
                      <p className={cn('mt-1 text-[10px] font-semibold', i <= step ? 'text-slate-700' : 'text-slate-400')}>{s}</p>
                    </div>
                  ))}
                </div>
              )}
            </MCard>
          )
        })}
      </div>
    </div>
  )
}

export function OrderDetailScreen({ orderId }: { orderId: string }) {
  const m = useMobile()
  const { emp } = useMe()
  const order = useStore((s) => s.orders.find((o) => o.id === orderId))
  const allKots = useStore((s) => s.kots)
  const { billOrder, updateKotStatus, notify, log } = useStore.getState()
  if (!order) return <MHeader onBack={m.pop} title="Order not found" />
  const kots = allKots.filter((k) => k.orderId === orderId).sort((a, b) => a.createdAt - b.createdAt)
  const prog = kotProgress(kots)
  const step = STEPS.indexOf(prog)
  const t = computeTotals(order)
  const st = liveStatus(order, allKots)

  const requestBill = () => {
    billOrder(order.id)
    notify({ title: `Bill requested · Table ${order.tableLabel}`, body: `${emp?.name} requested the bill for ${order.no} (${inr(t.total)})`, type: 'order', link: '/settlement' })
    log(`${emp?.name} requested bill for table ${order.tableLabel} from Waiter App`, 'pos', 'info', order.outletId)
    m.snack('Bill requested · cashier notified')
  }
  const markServed = () => {
    kots.filter((k) => k.status === 'Ready').forEach((k) => updateKotStatus(k.id, 'Served'))
    m.snack('Marked as served')
  }

  const ICON = { New: Clock, Preparing: ChefHat, Ready: BellRing, Served: HandPlatter }

  return (
    <div className="flex h-full flex-col">
      <MHeader onBack={m.pop} title={`Table ${order.tableLabel ?? '-'}`} subtitle={`${order.no} · ${order.pax ?? '-'} guests · ${fmtTime(order.createdAt)}`}
        right={<span className={cn('mr-1 rounded-full px-2.5 py-1 text-[11px] font-bold', LIVE_TONE[order.status === 'Billed' ? 'Billed' : st])}>{order.status === 'Billed' ? 'Billed' : st}</span>} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-32 pt-3 no-scrollbar">
        {order.status !== 'Settled' && order.status !== 'Cancelled' && (
          <MCard>
            <p className="text-[12px] font-bold uppercase tracking-wide text-slate-500">Kitchen status</p>
            <div className="mt-3 flex items-start">
              {STEPS.map((s, i) => {
                const I = ICON[s as keyof typeof ICON]
                const on = i <= step
                return (
                  <div key={s} className="relative flex flex-1 flex-col items-center">
                    {i > 0 && <div className={cn('absolute right-1/2 top-5 h-1 w-full -translate-y-1/2', i <= step ? 'bg-brand-500' : 'bg-slate-200')} />}
                    <span className={cn('relative z-10 flex size-10 items-center justify-center rounded-full transition', on ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-400', i === step && 'ring-4 ring-brand-100')}><I className="size-5" /></span>
                    <span className={cn('mt-1.5 text-[11px] font-semibold', on ? 'text-slate-800' : 'text-slate-400')}>{s}</span>
                  </div>
                )
              })}
            </div>
            {prog === 'Ready' && <p className="mt-3 rounded-xl bg-emerald-50 p-2.5 text-center text-[12.5px] font-semibold text-emerald-700">🔔 Food is ready — please pick up from the kitchen pass</p>}
          </MCard>
        )}

        <p className="mb-2 mt-5 px-1 text-[12px] font-bold uppercase tracking-wide text-slate-500">KOT timeline</p>
        <div className="relative space-y-3 pl-5">
          <div className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-slate-200" />
          {kots.length === 0 && <p className="text-[13px] text-slate-500">No KOTs yet.</p>}
          {kots.map((k) => (
            <div key={k.id} className="relative">
              <span className={cn('absolute -left-5 top-3.5 size-3.5 rounded-full ring-4 ring-slate-50', k.status === 'Ready' ? 'bg-emerald-500' : k.status === 'Preparing' ? 'bg-amber-500' : k.status === 'New' ? 'bg-sky-500' : k.status === 'Cancelled' ? 'bg-rose-500' : 'bg-slate-400')} />
              <MCard className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold text-slate-900">{k.no} <span className="text-[12px] font-medium text-slate-400">· {fmtTime(k.createdAt)}</span></p>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10.5px] font-bold', LIVE_TONE[k.status])}>{k.status}</span>
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {k.items.map((it, i) => (
                    <p key={i} className={cn('flex items-center gap-1.5 text-[12.5px] text-slate-600', it.cancelled && 'line-through opacity-50')}>
                      <VegMark veg={it.veg} /><b>{it.qty}×</b> {it.name}{it.variant && ` (${it.variant})`}{it.note && <span className="italic text-amber-700"> · {it.note}</span>}
                    </p>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">Updated {timeAgo(k.updatedAt)}</p>
              </MCard>
            </div>
          ))}
        </div>

        <p className="mb-2 mt-5 px-1 text-[12px] font-bold uppercase tracking-wide text-slate-500">Bill summary</p>
        <MCard className="p-0">
          <div className="divide-y divide-slate-100 px-4">
            {order.items.filter((i) => !i.cancelled).map((i) => (
              <div key={i.id} className="flex items-center gap-2 py-2.5 text-[13px]">
                <VegMark veg={i.veg} /><span className="font-semibold">{i.qty}×</span><span className="min-w-0 flex-1 truncate">{i.name}</span><span className="tabular text-slate-600">{inr(lineTotal(i))}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1 border-t border-slate-100 px-4 py-3 text-[13px] text-slate-600">
            <div className="flex justify-between"><span>Subtotal</span><span className="tabular">{inr(t.subtotal, true)}</span></div>
            <div className="flex justify-between"><span>GST (CGST + SGST)</span><span className="tabular">{inr(t.cgst + t.sgst, true)}</span></div>
            {t.service > 0 && <div className="flex justify-between"><span>Service charge</span><span className="tabular">{inr(t.service, true)}</span></div>}
            <div className="flex justify-between pt-1.5 text-[16px] font-bold text-slate-900"><span>Total</span><span className="tabular">{inr(t.total)}</span></div>
          </div>
        </MCard>
        {order.billNo && <p className="mt-2 text-center text-[12px] text-slate-500"><Receipt className="mr-1 inline size-3.5" />Bill {order.billNo} {order.status === 'Settled' ? 'settled' : 'generated'}</p>}
      </div>

      {order.status === 'Running' || order.status === 'Billed' ? (
        <div className="absolute inset-x-0 bottom-0 z-10 space-y-2 border-t border-slate-200 bg-white px-4 pb-6 pt-3">
          {prog === 'Ready' && <MButton variant="accent" className="w-full" onClick={markServed}><Check className="size-5" />Mark as served</MButton>}
          <div className="flex gap-2">
            <MButton variant="outline" className="flex-1" disabled={order.status !== 'Running'} onClick={() => { m.setCart(() => []); m.push({ kind: 'menu', tableId: order.tableId!, pax: order.pax ?? 2, orderId: order.id }) }}><Plus className="size-5" />Add items</MButton>
            <MButton variant="primary" className="flex-1" disabled={order.status === 'Billed'} onClick={requestBill}><Receipt className="size-5" />{order.status === 'Billed' ? 'Bill requested' : 'Request bill'}</MButton>
          </div>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white px-4 pb-6 pt-3">
          <MButton variant="outline" className="w-full" onClick={() => m.setTab('tables')}><Utensils className="size-5" />Take new order</MButton>
        </div>
      )}
    </div>
  )
}
