import { useEffect, useMemo, useState } from 'react'
import { ListOrdered, Plus, Smartphone, QrCode, Bike, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { Badge, Button, Drawer, Kbd, Segmented, StatusBadge } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { computeTotals } from '@/lib/billing'
import { cn, inr, minutesSince, fmtTime } from '@/lib/format'
import type { Order } from '@/types'
import { SOURCE_TONE, isFreshExternal } from './posUtils'

const OPEN = ['Draft', 'Running', 'Billed', 'Hold']
const icon = (o: Order) => o.source === 'Waiter App' ? <Smartphone className="size-3" /> : o.source === 'QR Order' ? <QrCode className="size-3" /> : o.type === 'Delivery' ? <Bike className="size-3" /> : o.type === 'Takeaway' ? <ShoppingBag className="size-3" /> : <UtensilsCrossed className="size-3" />
const label = (o: Order) => (o.tableLabel ? o.tableLabel : o.type === 'Takeaway' ? 'TK ' + o.no.slice(-3) : o.type === 'Delivery' ? 'DL ' + o.no.slice(-3) : o.no.slice(-4))

export function useOpenOrders(outletId: string) {
  const orders = useStore((s) => s.orders)
  return useMemo(() => orders.filter((o) => o.outletId === outletId && OPEN.includes(o.status) && (o.status !== 'Draft' || o.items.length > 0)).sort((a, b) => b.createdAt - a.createdAt), [orders, outletId])
}

export function RunningStrip({ outletId, activeId, onLoad, onNew, readOnly }: { outletId: string; activeId: string | null; onLoad: (id: string) => void; onNew: () => void; readOnly?: boolean }) {
  const list = useOpenOrders(outletId)
  const [drawer, setDrawer] = useState(false)
  const [, tick] = useState(0)
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(i) }, [])
  const fresh = list.filter(isFreshExternal).length

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3">
      <Button size="sm" variant="accent" icon={<Plus className="size-3.5" />} onClick={onNew} disabled={readOnly} kbd="^B">New order</Button>
      <div className="h-5 w-px bg-slate-200" />
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Running</span>
      <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {list.length === 0 && <span className="text-[12px] text-slate-400">No open orders — new Waiter App / QR orders appear here instantly</span>}
        {list.map((o) => {
          const active = o.id === activeId
          const isNew = isFreshExternal(o)
          return (
            <button key={o.id} onClick={() => onLoad(o.id)}
              className={cn('relative flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2 text-[12px] transition',
                active ? 'border-navy-900 bg-navy-900 text-white' : o.status === 'Billed' ? 'border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-400' : o.status === 'Hold' ? 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300')}>
              <span className={cn('flex size-4 items-center justify-center rounded', active ? 'bg-white/15' : 'bg-slate-100 text-slate-500')}>{icon(o)}</span>
              <b>{label(o)}</b>
              <span className={cn('tabular', active ? 'text-white/80' : 'text-slate-500')}>{inr(computeTotals(o).total)}</span>
              <span className={cn('text-[10.5px]', active ? 'text-white/60' : 'text-slate-400')}>{minutesSince(o.createdAt)}m</span>
              {isNew && <span className="absolute -right-1 -top-1 flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" /><span className="relative inline-flex size-2.5 rounded-full bg-rose-500" /></span>}
            </button>
          )
        })}
      </div>
      <Button size="sm" variant="ghost" icon={<ListOrdered className="size-3.5" />} onClick={() => setDrawer(true)}>
        All <span className="rounded-full bg-slate-100 px-1.5 text-[10.5px] text-slate-600">{list.length}</span>
        {fresh > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[10.5px] font-semibold text-white">{fresh} new</span>}
      </Button>
      <RunningDrawer open={drawer} onClose={() => setDrawer(false)} list={list} activeId={activeId} onLoad={(id) => { onLoad(id); setDrawer(false) }} />
    </div>
  )
}

function RunningDrawer({ open, onClose, list, activeId, onLoad }: { open: boolean; onClose: () => void; list: Order[]; activeId: string | null; onLoad: (id: string) => void }) {
  const [f, setF] = useState<'all' | 'Running' | 'Billed' | 'Hold'>('all')
  const rows = list.filter((o) => f === 'all' || o.status === f || (f === 'Running' && o.status === 'Draft'))
  return (
    <Drawer open={open} onClose={onClose} title="Running orders" subtitle={`${list.length} open · click to load into cart`} width={460}>
      <Segmented value={f} onChange={setF} className="mb-3 w-full" items={[{ value: 'all', label: 'All' }, { value: 'Running', label: 'Running' }, { value: 'Billed', label: 'Billed' }, { value: 'Hold', label: 'Hold' }]} />
      <div className="space-y-2">
        {rows.map((o) => {
          const t = computeTotals(o)
          return (
            <button key={o.id} onClick={() => onLoad(o.id)}
              className={cn('w-full rounded-xl border p-3 text-left transition hover:border-brand-300 hover:shadow-sm', o.id === activeId ? 'border-navy-900 ring-2 ring-navy-100' : 'border-slate-200')}>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-slate-900">{o.tableLabel ? 'Table ' + o.tableLabel : o.type}</span>
                <Badge tone={SOURCE_TONE[o.source]}>{o.source}</Badge>
                <StatusBadge status={o.status === 'Draft' ? 'Draft' : o.status} />
                {isFreshExternal(o) && <Badge tone="red" dot>New</Badge>}
                <span className="ml-auto text-[15px] font-bold text-navy-900 tabular">{inr(t.total)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11.5px] text-slate-500">
                <span className="font-mono">{o.no}</span>·<span>{t.qty} items</span>·<span>{fmtTime(o.createdAt)} ({minutesSince(o.createdAt)}m)</span>
                {o.waiterName && <>·<span>{o.waiterName}</span></>}
              </div>
              <p className="mt-1 truncate text-[11.5px] text-slate-400">{o.items.filter((i) => !i.cancelled).map((i) => `${i.qty}× ${i.name}`).join(', ')}</p>
            </button>
          )
        })}
        {rows.length === 0 && <p className="py-10 text-center text-[12px] text-slate-400">No orders</p>}
      </div>
      <p className="mt-4 text-center text-[11px] text-slate-400">Tip: <Kbd>Ctrl+B</Kbd> starts a new bill from anywhere</p>
    </Drawer>
  )
}
