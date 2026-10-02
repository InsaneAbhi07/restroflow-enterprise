import { useMemo } from 'react'
import { useStore } from './useStore'
import type { Action, ModuleKey, Order } from '@/types'
import { computeTotals } from '@/lib/billing'
import { isoDate } from '@/lib/format'

export function useCurrentUser() {
  const id = useStore((s) => s.currentUserId)
  const users = useStore((s) => s.users)
  return users.find((u) => u.id === id) ?? users[0]
}

export function useRole() {
  const user = useCurrentUser()
  const roles = useStore((s) => s.roles)
  return roles.find((r) => r.id === user.roleId) ?? roles[0]
}

/** Permission check against the active demo user's role */
export function usePermission() {
  const role = useRole()
  return useMemo(() => {
    const can = (m: ModuleKey, a: Action = 'view') => !!role.permissions[m]?.includes(a)
    return { can, role }
  }, [role])
}

/**
 * Outlet scope for the active user.
 *  - outletIds: outlets whose data should be shown right now
 *  - canSwitch: user may change selection (owner / regional / multi-outlet)
 *  - single: currently-selected single outlet id (undefined when "All Outlets")
 */
export function useScope() {
  const user = useCurrentUser()
  const selected = useStore((s) => s.selectedOutlet)
  const outlets = useStore((s) => s.outlets)
  return useMemo(() => {
    const allowed = outlets.filter((o) => user.outletIds.includes(o.id)).map((o) => o.id)
    const canSwitch = allowed.length > 1
    const valid = selected === 'all' ? canSwitch : allowed.includes(selected)
    const effective = valid ? selected : allowed[0]
    const outletIds = effective === 'all' ? allowed : [effective]
    return { outletIds, allowed, canSwitch, isAll: effective === 'all', single: effective === 'all' ? undefined : effective, selected: effective }
  }, [user, selected, outlets])
}

/** Outlet that "operational" screens (POS, KOT, tables) work on — first in scope when "All" */
export function useWorkingOutlet() {
  const { single, allowed } = useScope()
  return single ?? allowed[0]
}

export function useScopedOrders() {
  const { outletIds } = useScope()
  const orders = useStore((s) => s.orders)
  return useMemo(() => orders.filter((o) => outletIds.includes(o.outletId)), [orders, outletIds])
}

export const isToday = (t?: number) => !!t && isoDate(new Date(t)) === isoDate()

/** Live KPIs computed from orders in the store (today) */
export function useLiveSales(orders: Order[]) {
  return useMemo(() => {
    const settled = orders.filter((o) => o.status === 'Settled' && isToday(o.settledAt))
    const revenue = settled.reduce((s, o) => s + computeTotals(o).total, 0)
    const running = orders.filter((o) => o.status === 'Running' || o.status === 'Billed')
    const runningValue = running.reduce((s, o) => s + computeTotals(o).total, 0)
    return { settled, revenue, count: settled.length, running, runningValue }
  }, [orders])
}
