import { createContext, useContext, useMemo } from 'react'
import type { Kot, KotStatus, Order, OrderItem } from '@/types'
import { useStore } from '@/store/useStore'
import { isToday } from '@/store/hooks'

export type Tab = 'home' | 'tables' | 'orders' | 'attendance' | 'profile'
export type StackScreen =
  | { kind: 'menu'; tableId: string; pax: number; orderId?: string }
  | { kind: 'cart'; tableId: string; pax: number; orderId?: string }
  | { kind: 'success'; orderId: string; kotNo: string; count: number }
  | { kind: 'order'; orderId: string }
  | { kind: 'salary' }

export interface MobileApi {
  tab: Tab
  setTab: (t: Tab) => void
  stack: StackScreen[]
  push: (s: StackScreen) => void
  pop: () => void
  reset: (s?: StackScreen) => void
  cart: OrderItem[]
  setCart: (fn: (c: OrderItem[]) => OrderItem[]) => void
  snack: (text: string, tone?: 'success' | 'error' | 'info') => void
  sheet: (node: React.ReactNode | null) => void
}
export const MobileCtx = createContext<MobileApi>(null as unknown as MobileApi)
export const useMobile = () => useContext(MobileCtx)

/** logged-in staff member (user + employee + outlet) */
export function useMe() {
  const mobileUserId = useStore((s) => s.mobileUserId)
  const users = useStore((s) => s.users)
  const employees = useStore((s) => s.employees)
  const outlets = useStore((s) => s.outlets)
  const roles = useStore((s) => s.roles)
  return useMemo(() => {
    const user = users.find((u) => u.id === mobileUserId)
    const emp = employees.find((e) => e.id === user?.employeeId)
    const outlet = outlets.find((o) => o.id === (emp?.outletId ?? user?.outletIds[0]))
    const role = roles.find((r) => r.id === user?.roleId)
    return { user, emp, outlet, role }
  }, [mobileUserId, users, employees, outlets, roles])
}

export type LiveStatus = KotStatus | 'Billed' | 'Settled' | 'Cancelled'

/** Order progress derived from its KOTs so web KDS changes reflect instantly */
export function kotProgress(kots: Kot[]): KotStatus {
  const live = kots.filter((k) => k.status !== 'Cancelled')
  if (!live.length) return 'New'
  if (live.every((k) => k.status === 'Served')) return 'Served'
  if (live.every((k) => k.status === 'Ready' || k.status === 'Served')) return 'Ready'
  if (live.some((k) => k.status === 'Preparing' || k.status === 'Ready' || k.status === 'Served')) return 'Preparing'
  return 'New'
}
export function liveStatus(o: Order, kots: Kot[]): LiveStatus {
  if (o.status === 'Settled' || o.status === 'Cancelled') return o.status
  return kotProgress(kots.filter((k) => k.orderId === o.id))
}
export const LIVE_TONE: Record<LiveStatus, string> = {
  New: 'bg-sky-100 text-sky-700', Preparing: 'bg-amber-100 text-amber-700', Ready: 'bg-emerald-100 text-emerald-700', Served: 'bg-slate-100 text-slate-600',
  Billed: 'bg-violet-100 text-violet-700', Settled: 'bg-emerald-100 text-emerald-700', Cancelled: 'bg-rose-100 text-rose-700',
}

/** orders taken by me today (plus any still running) */
export function useMyOrders() {
  const { emp } = useMe()
  const orders = useStore((s) => s.orders)
  return useMemo(() => orders
    .filter((o) => emp && (o.waiterId === emp.id || o.waiterName === emp.name))
    .filter((o) => isToday(o.createdAt) || o.status === 'Running' || o.status === 'Billed')
    .sort((a, b) => b.createdAt - a.createdAt), [orders, emp])
}
