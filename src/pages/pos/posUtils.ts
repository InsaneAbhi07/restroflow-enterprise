import type { MenuItem, Modifier, Order, OrderItem, OrderSource, PayMode } from '@/types'
import type { Tone } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { uid } from '@/lib/format'

/* ---------------- quick / short-code billing ---------------- */
export interface QuickQuery { qty: number; term: string }

/** "2*PBM" | "2 x PBM" | "3 113" | "PBM*2" | "113" | "paneer" */
export function parseQuick(raw: string): QuickQuery {
  const s = raw.trim()
  let m = s.match(/^(\d{1,2})\s*[*xX×]\s*(.+)$/)
  if (m) return { qty: Math.max(1, +m[1]), term: m[2].trim() }
  m = s.match(/^(.+?)\s*[*×]\s*(\d{1,2})$/)
  if (m) return { qty: Math.max(1, +m[2]), term: m[1].trim() }
  m = s.match(/^(\d{1,2})\s+(\S.*)$/)
  if (m) return { qty: Math.max(1, +m[1]), term: m[2].trim() }
  return { qty: 1, term: s }
}

const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).join('').toLowerCase()
const subseq = (needle: string, hay: string) => {
  let i = 0
  for (const c of hay) if (c === needle[i]) i++
  return i === needle.length
}

/** Ranked search over menu: exact code → exact short code → prefix → contains → initials → fuzzy */
export function searchMenu(menu: MenuItem[], term: string, limit = 8): MenuItem[] {
  const t = term.trim().toLowerCase()
  if (!t) return []
  const scored: { m: MenuItem; s: number }[] = []
  for (const m of menu) {
    const name = m.name.toLowerCase()
    let s = 0
    if (m.code === t) s = 100
    else if (m.short.toLowerCase() === t) s = 95
    else if (m.code.startsWith(t)) s = 70
    else if (name.startsWith(t)) s = 80
    else if (name.split(/\s+/).some((w) => w.startsWith(t))) s = 65
    else if (m.short.toLowerCase().startsWith(t)) s = 60
    else if (name.includes(t)) s = 50
    else if (initialsOf(m.name).startsWith(t)) s = 45
    else if (t.length >= 3 && subseq(t.replace(/\s/g, ''), name.replace(/\s/g, ''))) s = 25
    if (s) scored.push({ m, s: s + (m.available ? 2 : 0) + (m.bestseller ? 1 : 0) })
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.m)
}

/* ---------------- cart lines ---------------- */
export const defaultVariant = (m: MenuItem) => (m.variants?.length ? m.variants[m.variants.length - 1] : undefined)

export function makeLine(m: MenuItem, qty = 1, variantName?: string, modifiers: Modifier[] = [], note?: string): OrderItem {
  const v = variantName ? m.variants?.find((x) => x.name === variantName) : defaultVariant(m)
  return {
    id: uid('oi'), itemId: m.id, name: m.name, price: v?.price ?? m.price, qty, veg: m.veg, gst: m.gst,
    variant: v?.name, modifiers: modifiers.length ? modifiers : undefined, note: note?.trim() || undefined,
  }
}

const sig = (i: OrderItem) => `${i.itemId}|${i.variant ?? ''}|${(i.modifiers ?? []).map((m) => m.name).sort().join(',')}|${i.note ?? ''}`

/** Adds a line, merging with an identical pending (not yet KOT'd) line */
export function mergeLine(items: OrderItem[], line: OrderItem): OrderItem[] {
  const idx = items.findIndex((i) => !i.kotNo && !i.cancelled && sig(i) === sig(line))
  if (idx === -1) return [...items, line]
  return items.map((i, k) => (k === idx ? { ...i, qty: i.qty + line.qty } : i))
}

/** Removes an abandoned, empty draft order and frees its table (keeps lists clean) */
export function discardIfEmpty(id: string | null) {
  if (!id) return
  const s = useStore.getState()
  const o = s.orders.find((x) => x.id === id)
  if (!o || o.status !== 'Draft' || o.items.length > 0) return
  useStore.setState((st) => ({
    orders: st.orders.filter((x) => x.id !== id),
    tables: st.tables.map((t) => (t.orderId === id ? { ...t, status: 'Available', orderId: undefined, since: undefined } : t)),
  }))
}

/* ---------------- display helpers shared by POS / Orders / Settlement ---------------- */
export const SOURCE_TONE: Record<OrderSource, Tone> = {
  POS: 'navy', 'Waiter App': 'teal', 'QR Order': 'violet', Swiggy: 'orange', Zomato: 'red', Phone: 'blue',
}
export const PAY_TONE: Record<PayMode, Tone> = {
  Cash: 'green', UPI: 'violet', 'Credit Card': 'blue', 'Debit Card': 'navy', Due: 'amber', Wallet: 'orange', Room: 'teal',
}
export const PAY_COLOR: Record<PayMode, string> = {
  Cash: '#16a34a', UPI: '#7c3aed', 'Credit Card': '#0891b2', 'Debit Card': '#1d3f70', Due: '#d97706', Wallet: '#ea580c', Room: '#14a891',
}
export const orderLabel = (o: Pick<Order, 'type' | 'tableLabel' | 'no' | 'roomNo'>) =>
  o.type === 'Room Service' ? `Room ${o.roomNo ?? '—'}` : o.type === 'Dine-in' ? (o.tableLabel ? `Table ${o.tableLabel}` : 'Dine-in') : o.type === 'Takeaway' ? `Takeaway · ${o.no.replace('ORD-', '#')}` : `Delivery · ${o.no.replace('ORD-', '#')}`

export const isFreshExternal = (o: Order) => o.source !== 'POS' && Date.now() - o.createdAt < 3 * 60000
