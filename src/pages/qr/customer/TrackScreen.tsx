import { BellRing, Check, ChefHat, ChevronLeft, ClipboardCheck, HandPlatter, Plus, Receipt, Soup } from 'lucide-react'
import type { Kot, Order } from '@/types'
import { VegMark } from '@/components/ui'
import { computeTotals } from '@/lib/billing'
import { cn, fmtTime, inr } from '@/lib/format'
import { useNow } from '@/pages/kot/kotUtils'

const STEPS = [
  { key: 'New', label: 'Order received', sub: 'Kitchen has your order', icon: ClipboardCheck },
  { key: 'Preparing', label: 'Preparing', sub: 'Chef is cooking your food', icon: ChefHat },
  { key: 'Ready', label: 'Ready', sub: 'Being brought to your table', icon: Soup },
  { key: 'Served', label: 'Served', sub: 'Enjoy your meal!', icon: HandPlatter },
]
const idx = (s: Kot['status']) => (s === 'New' ? 0 : s === 'Preparing' ? 1 : s === 'Ready' ? 2 : s === 'Served' ? 3 : -1)

export function TrackScreen({ orders, kots, tableLabel, inRoom, embedded, onBack, onOrderMore, onCallWaiter, onRequestBill }: {
  orders: Order[]; kots: Kot[]; tableLabel: string; inRoom?: boolean; embedded?: boolean
  onBack: () => void; onOrderMore: () => void; onCallWaiter: () => void; onRequestBill: () => void
}) {
  const now = useNow(1000)
  const live = kots.filter((k) => k.status !== 'Cancelled')
  const step = live.length ? Math.min(...live.map((k) => idx(k.status))) : 0
  const latest = [...live].sort((a, b) => b.createdAt - a.createdAt)[0]
  const order = orders[orders.length - 1]
  const billed = order?.status === 'Billed'
  const settled = order?.status === 'Settled'
  const total = orders.filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + computeTotals(o).total, 0)
  const eta = latest ? Math.max(1, 18 - Math.floor((now - latest.createdAt) / 60000)) : 0
  const cur = STEPS[Math.max(0, step)]
  const CurIcon = cur.icon

  return (
    <div className="flex h-full flex-col bg-[#f7f5f1]">
      <div className={cn('bg-gradient-to-b from-navy-900 to-navy-800 px-4 pb-16 text-white', embedded ? 'pt-11' : 'pt-3')}>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="flex size-9 items-center justify-center rounded-full bg-white/10"><ChevronLeft className="size-5" /></button>
          <div className="flex-1"><div className="text-[15px] font-bold">Order status</div><div className="text-[11.5px] text-white/60">{tableLabel} · {order?.no}</div></div>
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium"><span className="size-1.5 animate-pulse rounded-full bg-brand-400" />Live</span>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <div className={cn('flex size-16 items-center justify-center rounded-2xl bg-brand-500 shadow-lg shadow-brand-500/40', step < 3 && 'animate-pulse')}>
            {settled ? <Check className="size-8" strokeWidth={3} /> : <CurIcon className="size-8" />}
          </div>
          <div>
            <div className="text-[20px] font-extrabold leading-tight">{settled ? 'Paid · Thank you!' : billed ? 'Bill is ready' : cur.label}</div>
            <div className="text-[13px] text-white/70">{settled ? (inRoom ? 'Added to your room bill' : 'Hope to see you again soon') : billed ? 'Your server will bring it shortly' : step < 2 ? `Estimated ${eta} min` : inRoom && cur.key === 'Ready' ? 'On its way to your room' : cur.sub}</div>
          </div>
        </div>
      </div>

      <div className="-mt-10 flex-1 space-y-3 overflow-y-auto px-4 pb-28">
        {/* steps */}
        <div className="rounded-3xl bg-white p-4 shadow-md ring-1 ring-slate-100">
          {STEPS.map((s, i) => {
            const done = i < step || (i === 3 && step === 3)
            const active = i === step && step < 3
            const Icon = s.icon
            return (
              <div key={s.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={cn('flex size-9 items-center justify-center rounded-full transition', done ? 'bg-brand-500 text-white' : active ? 'bg-navy-900 text-white ring-4 ring-navy-100' : 'bg-slate-100 text-slate-400')}>
                    {done ? <Check className="size-4" strokeWidth={3} /> : <Icon className="size-4" />}
                  </span>
                  {i < STEPS.length - 1 && <span className={cn('my-1 w-0.5 flex-1 rounded', i < step ? 'bg-brand-400' : 'bg-slate-200')} style={{ minHeight: 18 }} />}
                </div>
                <div className="pb-4 pt-1.5">
                  <div className={cn('text-[14px] font-bold', done || active ? 'text-slate-900' : 'text-slate-400')}>{s.label}</div>
                  <div className="text-[12px] text-slate-500">{active ? s.sub : done ? 'Done' : 'Waiting'}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* actions */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCallWaiter} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-white text-[14px] font-bold text-navy-900 shadow-sm ring-1 ring-slate-200 active:scale-[.98]"><BellRing className="size-4.5 text-brand-600" />{inRoom ? 'Call reception' : 'Call waiter'}</button>
          <button onClick={onRequestBill} disabled={settled} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-white text-[14px] font-bold text-navy-900 shadow-sm ring-1 ring-slate-200 active:scale-[.98] disabled:opacity-50"><Receipt className="size-4.5 text-brand-600" />{inRoom ? 'Room bill' : 'Request bill'}</button>
        </div>

        {/* kots */}
        {[...kots].sort((a, b) => b.createdAt - a.createdAt).map((k) => (
          <div key={k.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-slate-500">Placed {fmtTime(k.createdAt)} · {k.no}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold',
                k.status === 'New' ? 'bg-sky-50 text-sky-700' : k.status === 'Preparing' ? 'bg-amber-50 text-amber-700' : k.status === 'Ready' ? 'bg-emerald-50 text-emerald-700' : k.status === 'Served' ? 'bg-slate-100 text-slate-600' : 'bg-rose-50 text-rose-600')}>
                {k.status === 'New' ? 'Received' : k.status}
              </span>
            </div>
            {k.items.map((it, i) => (
              <div key={i} className={cn('flex items-center gap-2 py-1 text-[13.5px]', it.cancelled && 'line-through opacity-50')}>
                <VegMark veg={it.veg} /><span className="flex-1 text-slate-800">{it.name}{it.variant ? ` (${it.variant})` : ''}</span><span className="font-semibold text-slate-500">×{it.qty}</span>
              </div>
            ))}
          </div>
        ))}

        <div className="flex items-center justify-between rounded-3xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-100">
          <span className="text-[13.5px] font-semibold text-slate-600">Running total</span>
          <span className="text-[17px] font-extrabold text-navy-900">{inr(total)}</span>
        </div>
      </div>

      {!settled && (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#f7f5f1] via-[#f7f5f1] to-transparent px-4 pb-4 pt-6">
          <button onClick={onOrderMore} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 text-[15px] font-bold text-white shadow-xl shadow-brand-500/30 active:scale-[.99]"><Plus className="size-5" />Order more items</button>
        </div>
      )}
    </div>
  )
}
