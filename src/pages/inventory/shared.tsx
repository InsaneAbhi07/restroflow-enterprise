import { NavLink } from 'react-router-dom'
import { Boxes, ShoppingCart, Truck, ArrowLeftRight, ChefHat } from 'lucide-react'
import type { Material, PurchaseOrder, StockMovement } from '@/types'
import { useStore } from '@/store/useStore'
import { Badge, type Tone } from '@/components/ui'
import { cn } from '@/lib/format'

/* ------------------------------------------------------------------ Sub navigation */
const LINKS = [
  { to: '/inventory', label: 'Inventory', icon: Boxes, end: true },
  { to: '/inventory/purchases', label: 'Purchases', icon: ShoppingCart },
  { to: '/inventory/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/inventory/transfers', label: 'Stock Transfer', icon: ArrowLeftRight },
  { to: '/recipes', label: 'Recipes / BOM', icon: ChefHat },
]
export function InvNav({ className }: { className?: string }) {
  return (
    <nav className={cn('mb-3 flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-white p-1 shadow-card no-scrollbar', className)}>
      {LINKS.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end}
          className={({ isActive }) => cn('flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition',
            isActive ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
          <l.icon className="size-3.5" />{l.label}
        </NavLink>
      ))}
    </nav>
  )
}

/* ------------------------------------------------------------------ Stock helpers */
export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock'
export const stockStatus = (qty: number, min: number): StockStatus => (qty <= 0 ? 'Out of Stock' : qty < min ? 'Low Stock' : 'In Stock')
const RANK: Record<StockStatus, number> = { 'In Stock': 0, 'Low Stock': 1, 'Out of Stock': 2 }
/** worst status across a set of outlets */
export const worstStatus = (m: Material, ids: string[]): StockStatus =>
  ids.map((id) => stockStatus(m.stock[id] ?? 0, m.min)).reduce<StockStatus>((w, s) => (RANK[s] > RANK[w] ? s : w), 'In Stock')
export const qtyIn = (m: Material, ids: string[]) => ids.reduce((s, id) => s + (m.stock[id] ?? 0), 0)
export const fmtQty = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })
export const daysTo = (iso?: string) => {
  if (!iso) return Infinity
  const d = new Date(iso + 'T00:00:00').getTime()
  const t = new Date(new Date().toDateString()).getTime()
  return Math.round((d - t) / 864e5)
}

/* ------------------------------------------------------------------ Purchase helpers */
export const GST_RATE = 0.05
export const poSubtotal = (po: Pick<PurchaseOrder, 'items'>) => po.items.reduce((s, i) => s + i.qty * i.rate, 0)
export const poTotal = (po: Pick<PurchaseOrder, 'items'>) => poSubtotal(po) * (1 + GST_RATE)

/* ------------------------------------------------------------------ Outlet chip */
export function useOutletMap() {
  const outlets = useStore((s) => s.outlets)
  return Object.fromEntries(outlets.map((o) => [o.id, o]))
}
export function OutletChip({ id, className, full }: { id: string; className?: string; full?: boolean }) {
  const o = useStore((s) => s.outlets.find((x) => x.id === id))
  if (!o) return <span className="text-slate-400">—</span>
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11.5px] font-medium', className)}
      style={{ background: o.color + '14', color: o.color }}>
      <span className="size-1.5 rounded-full" style={{ background: o.color }} />
      {full ? o.name : o.short}
    </span>
  )
}

/* ------------------------------------------------------------------ Movement type badge */
export const MOVE_TONE: Record<StockMovement['type'], Tone> = {
  Purchase: 'green', Consumption: 'blue', Adjustment: 'violet', 'Transfer In': 'teal', 'Transfer Out': 'orange', Wastage: 'red', Return: 'amber',
}
export const MoveBadge = ({ type }: { type: StockMovement['type'] }) => <Badge tone={MOVE_TONE[type]}>{type}</Badge>

/** deterministic 0..1 hash from a string */
export const hash01 = (s: string) => {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0
  return (h % 10000) / 10000
}

export function StockBar({ qty, min }: { qty: number; min: number }) {
  const max = Math.max(min * 2.5, qty, 1)
  const pctv = Math.min(100, (qty / max) * 100)
  const st = stockStatus(qty, min)
  return (
    <div className="relative h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-slate-100">
      <div className={cn('h-full rounded-full', st === 'In Stock' ? 'bg-emerald-500' : st === 'Low Stock' ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${Math.max(pctv, qty > 0 ? 3 : 0)}%` }} />
      <div className="absolute inset-y-0 w-px bg-slate-400" style={{ left: `${(min / max) * 100}%` }} title={`Min ${min}`} />
    </div>
  )
}
