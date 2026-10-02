/**
 * Deterministic report data engine.
 * Synthetic history uses the exact same per-day/per-outlet formula as `data/analytics.dailySeries`
 * (so numbers line up with the dashboard); live settled/cancelled orders from the store are layered on top.
 */
import type { Order, OrderSource, OrderType, Outlet } from '@/types'
import { seeded, hashStr } from '@/lib/rand'
import { isoDate, todayISO, fmtDate, fmtTime, fmtDateTime, num, num2 } from '@/lib/format'
import { computeTotals, lineTotal } from '@/lib/billing'
import { categorySplit, hourlySeries } from '@/data/analytics'
import { CHART } from '@/components/ui'
import type { Fmt, ReportCtx, Cell } from './types'
import { inRange } from './range'

export const BASE_DAILY = 168000
export const AOV = 742
export const DISC_RATE = 0.045
export const GST_RATE = 0.05

export const TYPE_SHARE: { name: OrderType; amt: number; ord: number; color: string }[] = [
  { name: 'Dine-in', amt: 0.59, ord: 0.52, color: CHART.navy },
  { name: 'Takeaway', amt: 0.15, ord: 0.22, color: CHART.teal },
  { name: 'Delivery', amt: 0.26, ord: 0.26, color: CHART.orange },
]
export const SOURCE_SHARE: { name: OrderSource; amt: number; color: string; type: OrderType }[] = [
  { name: 'POS', amt: 0.37, color: CHART.navy, type: 'Dine-in' },
  { name: 'Waiter App', amt: 0.26, color: CHART.teal, type: 'Dine-in' },
  { name: 'QR Order', amt: 0.11, color: CHART.violet, type: 'Dine-in' },
  { name: 'Swiggy', amt: 0.12, color: CHART.orange, type: 'Delivery' },
  { name: 'Zomato', amt: 0.1, color: CHART.red, type: 'Delivery' },
  { name: 'Phone', amt: 0.04, color: CHART.sky, type: 'Delivery' },
]
export const PAY_SHARE: { name: string; share: number; color: string }[] = [
  { name: 'UPI', share: 0.37, color: CHART.teal },
  { name: 'Online (Swiggy/Zomato)', share: 0.22, color: CHART.orange },
  { name: 'Cash', share: 0.18, color: CHART.navy },
  { name: 'Credit Card', share: 0.11, color: CHART.violet },
  { name: 'Debit Card', share: 0.07, color: CHART.sky },
  { name: 'Wallet (Paytm)', share: 0.03, color: CHART.pink },
  { name: 'Due / Credit', share: 0.02, color: CHART.amber },
]
export const CASHIERS: Record<string, string[]> = {
  o1: ['Neha Gupta', 'Amit Verma'], o2: ['Kavita Joshi', 'Sanjay Malhotra'], o3: ['Manish Tiwari', 'Pooja Arora'], o4: ['Harpreet Kaur', 'Gurpreet Singh'],
}

export interface Agg {
  gross: number; discount: number; net: number; cgst: number; sgst: number; service: number; delivery: number; roundOff: number; total: number
  orders: number; pax: number; cancelledCount: number; cancelledAmt: number; ncCount: number; ncAmt: number
}
const zero = (): Agg => ({ gross: 0, discount: 0, net: 0, cgst: 0, sgst: 0, service: 0, delivery: 0, roundOff: 0, total: 0, orders: 0, pax: 0, cancelledCount: 0, cancelledAmt: 0, ncCount: 0, ncAmt: 0 })
const add = (a: Agg, b: Agg) => { (Object.keys(a) as (keyof Agg)[]).forEach((k) => (a[k] += b[k])) }

export interface DayCell extends Agg { date: string; outletId: string }

/** synthetic day for one outlet (same formula as analytics.dailySeries) */
export function dayOutlet(iso: string, o: Outlet): DayCell {
  const dt = new Date(iso + 'T12:00:00')
  const dow = dt.getDay()
  const weekend = dow === 0 || dow === 6 ? 1.32 : dow === 5 ? 1.15 : 1
  const r = seeded(Number(iso.replace(/-/g, '')) + o.id.charCodeAt(1) * 977)
  const isToday = iso === todayISO()
  const opened = iso >= o.openedOn ? 1 : 0
  const gross = BASE_DAILY * o.factor * weekend * r.range(0.84, 1.16) * (isToday ? 0.62 : 1) * opened
  const orders = opened ? Math.round(gross / (AOV * r.range(0.92, 1.08))) : 0
  const r2 = seeded(hashStr(iso + o.id))
  const discount = gross * DISC_RATE * r2.range(0.8, 1.2)
  const net = gross - discount
  const tax = net * GST_RATE
  const service = net * TYPE_SHARE[0].amt * 0.05
  const delivery = Math.round(orders * 0.04) * 40
  const raw = net + tax + service + delivery
  const total = Math.round(raw)
  const cancelledCount = Math.round(orders * r2.range(0.006, 0.013))
  const ncCount = Math.round(orders * r2.range(0.002, 0.006))
  return {
    date: iso, outletId: o.id, gross, discount, net, cgst: tax / 2, sgst: tax / 2, service, delivery, roundOff: total - raw, total, orders,
    pax: Math.round(orders * TYPE_SHARE[0].ord * 2.7), cancelledCount, cancelledAmt: cancelledCount * AOV * r2.range(0.9, 1.3), ncCount, ncAmt: ncCount * AOV * 0.8,
  }
}

function liveAgg(o: Order): Agg {
  const t = computeTotals(o)
  return {
    gross: t.subtotal, discount: t.discount, net: t.taxable, cgst: t.cgst, sgst: t.sgst, service: t.service, delivery: t.delivery, roundOff: t.roundOff,
    total: t.total, orders: 1, pax: o.pax ?? 0, cancelledCount: 0, cancelledAmt: 0, ncCount: 0, ncAmt: 0,
  }
}

export interface NamedAmt { name: string; value: number; count: number; color: string }
export interface ItemAgg { id: string; name: string; category: string; categoryId: string; veg: boolean; price: number; qty: number; net: number; station: string }
export interface SalesBase {
  cells: DayCell[]
  total: Agg
  byDate: (Agg & { date: string; label: string })[]
  byOutlet: (Agg & { outletId: string; name: string; color: string })[]
  pay: NamedAmt[]
  types: (NamedAmt & { amount: number })[]
  sources: (NamedAmt & { amount: number; type: OrderType })[]
  categories: { id: string; name: string; color: string; net: number; qty: number }[]
  items: ItemAgg[]
  live: Order[]
  liveCancelled: Order[]
}

const cache = new WeakMap<ReportCtx, SalesBase>()

export function salesBase(ctx: ReportCtx): SalesBase {
  const hit = cache.get(ctx)
  if (hit) return hit
  const cells: DayCell[] = []
  for (const d of ctx.dates) for (const o of ctx.outlets) cells.push(dayOutlet(d, o))
  const synth = zero()
  cells.forEach((c) => add(synth, c))

  const live = ctx.orders.filter((o) => o.status === 'Settled' && ctx.outletIds.includes(o.outletId) && inRange(o.settledAt, ctx.from, ctx.to))
  const liveCancelled = ctx.orders.filter((o) => o.status === 'Cancelled' && ctx.outletIds.includes(o.outletId) && inRange(o.createdAt, ctx.from, ctx.to))
  const total = { ...synth }
  live.forEach((o) => add(total, liveAgg(o)))
  liveCancelled.forEach((o) => { total.cancelledCount += 1; total.cancelledAmt += computeTotals({ ...o, items: o.items.map((i) => ({ ...i, cancelled: false })) }).total })

  // by date
  const dateMap = new Map<string, Agg>()
  ctx.dates.forEach((d) => dateMap.set(d, zero()))
  cells.forEach((c) => add(dateMap.get(c.date)!, c))
  live.forEach((o) => { const k = isoDate(new Date(o.settledAt!)); if (dateMap.has(k)) add(dateMap.get(k)!, liveAgg(o)) })
  const byDate = ctx.dates.map((d) => ({ ...dateMap.get(d)!, date: d, label: new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) }))

  // by outlet
  const byOutlet = ctx.outlets.map((o) => {
    const a = zero()
    cells.filter((c) => c.outletId === o.id).forEach((c) => add(a, c))
    live.filter((x) => x.outletId === o.id).forEach((x) => add(a, liveAgg(x)))
    return { ...a, outletId: o.id, name: o.short, color: o.color }
  })

  // payments
  const pay: NamedAmt[] = PAY_SHARE.map((p) => ({ name: p.name, color: p.color, value: synth.total * p.share, count: Math.round(synth.orders * p.share) }))
  live.forEach((o) => o.payments.forEach((p) => {
    const name = p.mode === 'Wallet' && (o.source === 'Swiggy' || o.source === 'Zomato') ? 'Online (Swiggy/Zomato)'
      : p.mode === 'Wallet' ? 'Wallet (Paytm)' : p.mode === 'Due' ? 'Due / Credit' : p.mode
    const row = pay.find((x) => x.name === name)
    if (row) { row.value += p.amount; row.count += 1 }
  }))
  // make payments reconcile exactly with collection total
  const paySum = pay.reduce((s, p) => s + p.value, 0)
  if (paySum) pay[0].value += total.total - paySum

  const types = TYPE_SHARE.map((t) => ({ name: t.name, color: t.color, value: synth.net * t.amt, amount: synth.net * t.amt, count: Math.round(synth.orders * t.ord) }))
  const sources = SOURCE_SHARE.map((s) => ({ name: s.name, color: s.color, type: s.type, value: synth.net * s.amt, amount: synth.net * s.amt, count: Math.round(synth.orders * s.amt * (s.type === 'Dine-in' ? 0.88 : 1.12)) }))
  live.forEach((o) => {
    const t = computeTotals(o)
    const ty = types.find((x) => x.name === o.type); if (ty) { ty.value += t.taxable; ty.amount += t.taxable; ty.count += 1 }
    const so = sources.find((x) => x.name === o.source); if (so) { so.value += t.taxable; so.amount += t.taxable; so.count += 1 }
  })

  // categories + items
  const cs = categorySplit(synth.net)
  const catMap = new Map(ctx.categories.map((c, i) => [c.id, { id: c.id, name: c.name, color: c.color, net: cs[i]?.value ?? 0, qty: 0 }]))
  const items: ItemAgg[] = []
  ctx.categories.forEach((c) => {
    const menu = ctx.menu.filter((m) => m.categoryId === c.id && m.outlets.some((x) => ctx.outletIds.includes(x)))
    const w = menu.map((m) => seeded(hashStr(m.id)).range(0.5, 1.5) * (m.bestseller ? 2.6 : 1))
    const ws = w.reduce((a, b) => a + b, 0) || 1
    const catNet = catMap.get(c.id)!.net
    menu.forEach((m, i) => {
      const net = (catNet * w[i]) / ws
      const unit = m.price * (1 - DISC_RATE)
      items.push({ id: m.id, name: m.name, category: c.name, categoryId: c.id, veg: m.veg, price: m.price, qty: Math.round(net / unit), net, station: m.station })
    })
  })
  live.forEach((o) => {
    const t = computeTotals(o)
    const ratio = t.subtotal ? t.taxable / t.subtotal : 1
    o.items.filter((i) => !i.cancelled).forEach((li) => {
      const it = items.find((x) => x.id === li.itemId)
      if (it) { it.qty += li.qty; it.net += lineTotal(li) * ratio; const c = catMap.get(it.categoryId); if (c) c.net += lineTotal(li) * ratio }
    })
  })
  items.forEach((it) => { const c = catMap.get(it.categoryId); if (c) c.qty += it.qty })
  items.sort((a, b) => b.net - a.net)

  const res: SalesBase = { cells, total, byDate, byOutlet, pay, types, sources, categories: [...catMap.values()], items, live, liveCancelled }
  cache.set(ctx, res)
  return res
}

/** share of sales per hour (07..23) for the scope */
export function hourShares(outletIds: string[]) {
  const h = hourlySeries(outletIds)
  const s = h.reduce((a, b) => a + b.sales, 0) || 1
  return h.map((x) => ({ hour: x.hour, label: x.label, share: x.sales / s }))
}

/* ---------------- synthetic bills (for bill-wise & derived reports) ---------------- */
export interface Bill {
  id: string; billNo: string; at: number; date: string; outletId: string; type: OrderType; source: OrderSource; pax: number; items: number
  gross: number; discount: number; tax: number; service: number; total: number; mode: string; cashier: string; customer?: string; live?: boolean; status: string
}
const billCache = new WeakMap<ReportCtx, Bill[]>()
export function syntheticBills(ctx: ReportCtx, cap = 3000): Bill[] {
  const hit = billCache.get(ctx)
  if (hit) return hit
  const base = salesBase(ctx)
  const hrs = hourShares(ctx.outletIds)
  const bills: Bill[] = []
  base.live.forEach((o) => {
    const t = computeTotals(o)
    bills.push({
      id: o.id, billNo: o.billNo ?? o.no, at: o.settledAt!, date: isoDate(new Date(o.settledAt!)), outletId: o.outletId, type: o.type, source: o.source, pax: o.pax ?? 1,
      items: t.qty, gross: t.subtotal, discount: t.discount, tax: t.cgst + t.sgst, service: t.service, total: t.total,
      mode: o.payments.length > 1 ? 'Split' : o.payments[0]?.mode ?? 'Cash', cashier: o.cashier ?? '-', customer: o.customerName, live: true, status: o.resettlements?.length ? 'Resettled' : 'Settled',
    })
  })
  const cells = [...base.cells].sort((a, b) => (a.date < b.date ? 1 : -1))
  outer: for (const c of cells) {
    const r = seeded(hashStr('bills' + c.date + c.outletId))
    const outlet = ctx.outlets.find((o) => o.id === c.outletId)!
    const seqBase = 1000 + (Number(c.date.replace(/-/g, '')) % 997) * 7
    for (let i = 0; i < c.orders; i++) {
      if (bills.length >= cap) break outer
      const src = pickWeighted(r.next(), SOURCE_SHARE.map((s) => s.amt))
      const source = SOURCE_SHARE[src]
      const type: OrderType = source.type === 'Dine-in' && r.chance(0.2) ? 'Takeaway' : source.type
      const gross = (c.gross / c.orders) * r.range(0.35, 1.75)
      const discount = r.chance(0.18) ? gross * 0.1 : r.chance(0.05) ? gross * 0.2 : 0
      const net = gross - discount
      const tax = net * GST_RATE
      const service = type === 'Dine-in' ? net * 0.05 : 0
      const total = Math.round(net + tax + service + (source.name === 'Phone' ? 40 : 0))
      let hi = pickWeighted(r.next(), hrs.map((h) => h.share))
      if (c.date === todayISO()) hi = Math.min(hi, Math.max(0, new Date().getHours() - 7))
      const at = new Date(c.date + 'T00:00:00').getTime() + (hrs[hi].hour * 60 + r.int(0, 59)) * 60000
      const modeIdx = pickWeighted(r.next(), PAY_SHARE.map((p) => p.share))
      const mode = source.type === 'Delivery' && source.name !== 'Phone' ? 'Online (' + source.name + ')' : PAY_SHARE[modeIdx === 1 ? 0 : modeIdx].name
      bills.push({
        id: `b_${c.date}_${c.outletId}_${i}`, billNo: `${outlet.code.split('-')[1]}/${String(seqBase + i).padStart(5, '0')}`, at, date: c.date, outletId: c.outletId, type, source: source.name,
        pax: type === 'Dine-in' ? r.int(1, 6) : 1, items: r.int(1, 8), gross, discount, tax, service, total, mode, cashier: r.pick(CASHIERS[c.outletId] ?? ['Cashier']),
        customer: r.chance(0.35) ? r.pick(ctx.customers)?.name : undefined, status: 'Settled',
      })
    }
  }
  bills.sort((a, b) => b.at - a.at)
  billCache.set(ctx, bills)
  return bills
}

export function pickWeighted(x: number, w: number[]) {
  const s = w.reduce((a, b) => a + b, 0)
  let acc = 0
  for (let i = 0; i < w.length; i++) { acc += w[i] / s; if (x <= acc) return i }
  return w.length - 1
}

/* ---------------- formatting ---------------- */
const inrNoRound = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
export function fmtCell(v: Cell, f: Fmt = 'text'): string {
  if (v === undefined || v === null || v === '') return f === 'text' ? '' : '-'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  switch (f) {
    case 'inr': return '₹' + inrNoRound.format(Math.round(Number(v)))
    case 'inr2': return '₹' + num2(Number(v))
    case 'num': return num(Math.round(Number(v)))
    case 'dec': return Number(v).toFixed(2)
    case 'pct': return Number(v).toFixed(1) + '%'
    case 'min': return Number(v).toFixed(1) + ' min'
    case 'date': return fmtDate(typeof v === 'number' ? v : String(v).length === 10 ? String(v) + 'T00:00:00' : String(v))
    case 'time': return fmtTime(Number(v))
    case 'datetime': return fmtDateTime(Number(v))
    default: return String(v)
  }
}
export const r2 = (n: number) => Math.round(n * 100) / 100
export const outletShort = (ctx: ReportCtx, id?: string) => ctx.allOutlets.find((o) => o.id === id)?.short ?? '-'
