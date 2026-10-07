import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { useCurrentUser, useWorkingOutlet } from '@/store/hooks'
import { toast } from '@/store/toast'
import { computeTotals } from '@/lib/billing'
import type { Kot, Order, OrderItem, OrderType, PayMode, Table } from '@/types'
import { discardIfEmpty, mergeLine } from './posUtils'
import { usePosUI, type PendingMeta } from './posStore'
import { useHotel } from '@/pages/hotel/hotelStore'
import type { RoomGuest } from '@/pages/hotel/roomBilling'

const S = () => useStore.getState()
const tray = () => useHotel.getState().config.trayCharge
const extraCharge = (t: OrderType) => (t === 'Delivery' ? 40 : t === 'Room Service' ? tray() : 0)
const activeOrder = (): Order | undefined => {
  const id = usePosUI.getState().activeId
  const o = id ? S().orders.find((x) => x.id === id) : undefined
  return o && o.status !== 'Settled' && o.status !== 'Cancelled' ? o : undefined
}

/** All order-lifecycle logic for the POS screen, backed by the shared store */
export function usePosOrder() {
  const working = useWorkingOutlet()
  const user = useCurrentUser()
  const settings = useStore((s) => s.settings)
  const activeId = usePosUI((s) => s.activeId)
  const meta = usePosUI((s) => s.meta)
  const stored = useStore((s) => (activeId ? s.orders.find((o) => o.id === activeId) : undefined))
  // a settled / cancelled order is no longer editable in the cart
  const order = stored && stored.status !== 'Settled' && stored.status !== 'Cancelled' ? stored : undefined
  const outletId = order?.outletId ?? working
  const type: OrderType = order?.type ?? meta.type ?? settings.pos.defaultOrderType

  const view: Order = useMemo(() => order ?? {
    id: '', no: 'NEW', outletId, type, source: meta.source ?? (type === 'Delivery' ? 'Phone' : 'POS'), status: 'Draft', items: [], payments: [], createdAt: Date.now(),
    discount: meta.discount ?? { type: 'pct', value: 0 },
    serviceCharge: meta.serviceCharge ?? (type === 'Dine-in' ? settings.serviceCharge : 0),
    deliveryCharge: meta.deliveryCharge ?? extraCharge(type),
    ...meta,
  } as Order, [order, meta, outletId, type, settings.serviceCharge])
  const totals = useMemo(() => computeTotals(view), [view])

  const setMeta = usePosUI.getState().setMeta
  const setActive = usePosUI.getState().setActive

  const patch = (p: Partial<Order>) => {
    const o = activeOrder()
    if (o) S().updateOrder(o.id, p)
    else setMeta((m) => ({ ...m, ...(p as PendingMeta) }))
  }

  /** Creates the Draft order on first use */
  const ensure = (items: OrderItem[] = []): Order => {
    const o = activeOrder()
    if (o) return o
    const m = usePosUI.getState().meta
    const t: OrderType = m.type ?? settings.pos.defaultOrderType
    const created = S().createOrder({
      outletId: working, type: t, source: m.source ?? (t === 'Delivery' ? 'Phone' : 'POS'), items, status: 'Draft', cashier: user.name,
      serviceCharge: m.serviceCharge ?? (t === 'Dine-in' ? settings.serviceCharge : 0),
      deliveryCharge: m.deliveryCharge ?? extraCharge(t),
      ...m,
    })
    setActive(created.id)
    setMeta({})
    return created
  }

  const addLine = (line: OrderItem) => {
    const o = activeOrder()
    if (!o) return void ensure([line])
    S().updateOrder(o.id, { items: mergeLine(o.items, line) })
  }

  const freeTable = (tableId?: string) => {
    if (!tableId) return
    const t = S().tables.find((x) => x.id === tableId)
    if (t && (t.orderId === activeOrder()?.id || !t.orderId)) S().updateTable(tableId, { status: 'Available', orderId: undefined, since: undefined })
  }

  const setType = (t: OrderType) => {
    const o = activeOrder()
    const src = o?.source ?? usePosUI.getState().meta.source
    const p: Partial<Order> = {
      type: t,
      serviceCharge: t === 'Dine-in' ? settings.serviceCharge : 0,
      deliveryCharge: extraCharge(t),
    }
    if (t === 'Delivery' && (!src || src === 'POS')) p.source = 'Phone'
    if (t !== 'Delivery' && (src === 'Phone' || src === 'Swiggy' || src === 'Zomato')) p.source = 'POS'
    if (t !== 'Dine-in' && o?.tableId) { freeTable(o.tableId); p.tableId = undefined; p.tableLabel = undefined }
    patch(p)
  }

  /** Link an in-house hotel guest: room-service delivery target and/or "Charge to Room" */
  const linkRoom = (g: RoomGuest) => {
    const digits = g.res.guest.phone.replace(/D/g, '').slice(-10)
    patch({ roomId: g.room?.id, roomNo: g.room?.no, resId: g.res.id, customerName: g.res.guest.name, customerPhone: digits, customerId: undefined })
    toast.success(`Room ${g.room?.no} linked`, `${g.res.guest.name}${g.plan?.addonPerAdult ? ' · ' + g.plan.code + ' plan' : ''}`)
  }
  const unlinkRoom = () => {
    const d = (activeOrder() ?? usePosUI.getState().meta).discount
    patch({ roomId: undefined, roomNo: undefined, resId: undefined, ...(d?.reason?.startsWith('Meal plan') ? { discount: { type: 'pct', value: 0 } } : {}) })
  }

  const load = (id: string) => {
    const cur = usePosUI.getState().activeId
    if (cur === id) return
    discardIfEmpty(cur)
    setActive(id)
    setMeta({})
  }
  const reset = () => {
    discardIfEmpty(usePosUI.getState().activeId)
    setActive(null)
    setMeta({})
  }

  /** returns 'loaded' when the table had another running order which got opened instead */
  const pickTable = (t: Table): 'assigned' | 'loaded' => {
    const cur = activeOrder()
    if (t.orderId && t.orderId !== cur?.id && S().orders.some((o) => o.id === t.orderId && o.status !== 'Settled' && o.status !== 'Cancelled')) {
      load(t.orderId)
      toast.info(`Opened running order of table ${t.label}`)
      return 'loaded'
    }
    const o = ensure([])
    if (o.tableId && o.tableId !== t.id) freeTable(o.tableId)
    S().updateOrder(o.id, { tableId: t.id, tableLabel: t.label, type: 'Dine-in', serviceCharge: o.type === 'Dine-in' ? o.serviceCharge : settings.serviceCharge, deliveryCharge: 0 })
    S().updateTable(t.id, { status: o.status === 'Billed' ? 'Billing' : 'Occupied', orderId: o.id, since: t.since ?? Date.now(), waiterId: o.waiterId ?? t.waiterId })
    if (t.status === 'Reserved') toast.warning(`Table ${t.label} was reserved`, `${t.reservedFor ?? ''} ${t.reservedAt ?? ''}`.trim())
    else toast.success(`Table ${t.label} assigned`)
    return 'assigned'
  }

  const changeQty = (lineId: string, delta: number): 'needsReason' | void => {
    const o = activeOrder()
    if (!o) return
    const line = o.items.find((i) => i.id === lineId)
    if (!line) return
    if (line.kotNo) {
      if (delta < 0) return 'needsReason'
      const { id: _id, kotNo: _k, ...rest } = line
      void _id; void _k
      return void S().updateOrder(o.id, { items: mergeLine(o.items, { ...rest, id: 'oi_' + Date.now().toString(36), qty: delta }) })
    }
    const q = line.qty + delta
    S().updateOrder(o.id, { items: q <= 0 ? o.items.filter((i) => i.id !== lineId) : o.items.map((i) => (i.id === lineId ? { ...i, qty: q } : i)) })
  }

  const changeLastQty = (delta: number) => {
    const o = activeOrder()
    const last = o?.items.filter((i) => !i.cancelled && !i.kotNo).pop()
    if (!last) return void toast.info('No editable item', 'Items already sent to kitchen need a cancel reason')
    changeQty(last.id, delta)
  }

  const removeLine = (lineId: string): 'needsReason' | void => {
    const o = activeOrder()
    const line = o?.items.find((i) => i.id === lineId)
    if (!o || !line) return
    if (line.kotNo) return 'needsReason'
    S().updateOrder(o.id, { items: o.items.filter((i) => i.id !== lineId) })
  }

  const cancelLine = (lineId: string, reason: string) => {
    const o = activeOrder()
    const line = o?.items.find((i) => i.id === lineId)
    if (!o || !line) return
    S().updateOrder(o.id, { items: o.items.map((i) => (i.id === lineId ? { ...i, cancelled: true, note: `Cancelled: ${reason}` } : i)) })
    const kot = S().kots.find((k) => k.orderId === o.id && k.no === line.kotNo)
    const idx = kot?.items.findIndex((it) => it.name === line.name && !it.cancelled) ?? -1
    if (kot && idx >= 0) S().cancelKotItem(kot.id, idx)
    S().log(`Cancelled ${line.qty}× ${line.name} on ${line.kotNo} (${o.no}) — ${reason}`, 'pos', 'warning', o.outletId)
    toast.warning(`${line.name} cancelled`, `Cancellation sent to kitchen · ${line.kotNo}`)
  }

  const setLineNote = (lineId: string, note: string) => {
    const o = activeOrder()
    if (o) S().updateOrder(o.id, { items: o.items.map((i) => (i.id === lineId ? { ...i, note: note || undefined } : i)) })
  }

  const hasItems = () => !!activeOrder()?.items.some((i) => !i.cancelled)
  const pending = () => activeOrder()?.items.filter((i) => !i.kotNo && !i.cancelled) ?? []

  const kot = (): Kot | null => {
    const o = activeOrder()
    if (!o || !pending().length) { toast.info('No new items for KOT', o ? 'All items are already in the kitchen' : 'Add items first'); return null }
    const k = S().sendKot(o.id)
    if (k) toast.success(`${k.no} sent to kitchen`, `${k.items.length} items · ${o.tableLabel ? 'Table ' + o.tableLabel : o.type}`)
    return k
  }

  const bill = (): string | null => {
    const o = activeOrder()
    if (!o || !hasItems()) { toast.info('Add items before billing'); return null }
    if (pending().length) S().sendKot(o.id)
    S().billOrder(o.id)
    toast.success(`Bill ${S().orders.find((x) => x.id === o.id)?.billNo} generated`, `${o.tableLabel ? 'Table ' + o.tableLabel : o.type} · ${inrPlain(computeTotals(o).total)}`)
    return o.id
  }

  const settleQuick = (mode: PayMode): string | null => {
    const o = activeOrder()
    if (!o || !hasItems()) { toast.info('Add items before settling'); return null }
    if (pending().length) S().sendKot(o.id)
    const total = computeTotals(S().orders.find((x) => x.id === o.id)!).total
    const cur = S().orders.find((x) => x.id === o.id)!
    if (mode === 'Room' && !cur.resId) { toast.warning('Link a room guest first'); return null }
    S().settleOrder(o.id, [{ mode, amount: total, ref: mode === 'UPI' ? 'UPI' + Math.floor(1e8 + Math.random() * 9e8) : mode === 'Room' ? `Room ${cur.roomNo}` : undefined }])
    toast.success(mode === 'Room' ? `${inrPlain(total)} charged to Room ${cur.roomNo}` : `Settled ${inrPlain(total)} by ${mode}`, `Bill ${S().orders.find((x) => x.id === o.id)?.billNo}${o.tableLabel ? ' · table ' + o.tableLabel + ' released' : ''}`)
    return o.id
  }

  const hold = () => {
    const o = activeOrder()
    if (!o || !hasItems()) return void toast.info('Nothing to hold', 'Add items to the cart first')
    S().updateOrder(o.id, { status: 'Hold' })
    toast.info(`Order ${o.no} on hold`, 'Find it in the running orders strip')
    setActive(null); setMeta({})
  }

  const save = () => {
    const o = activeOrder()
    if (!o || !hasItems()) return void toast.info('Nothing to save', 'Add items to the cart first')
    if (o.status === 'Hold') S().updateOrder(o.id, { status: o.items.some((i) => i.kotNo) ? 'Running' : 'Draft' })
    toast.success(`Order ${o.no} saved`, o.tableLabel ? `Table ${o.tableLabel}` : o.type)
    setActive(null); setMeta({})
  }

  return { order, view, totals, outletId, type, activeId, patch, ensure, addLine, setType, linkRoom, unlinkRoom, load, reset, pickTable, changeQty, changeLastQty, removeLine, cancelLine, setLineNote, kot, bill, settleQuick, hold, save, hasItems, pending }
}

const inrPlain = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
export type PosCtl = ReturnType<typeof usePosOrder>
