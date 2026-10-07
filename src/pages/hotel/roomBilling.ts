import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { computeTotals } from '@/lib/billing'
import { useHotel } from './hotelStore'
import { folioTotals, today, type HotelConfig, type MealUse, type RatePlan, type Reservation, type Room } from './hotelModel'

/** Everything the restaurant needs to know about one in-house guest */
export interface RoomGuest { res: Reservation; room?: Room; plan?: RatePlan; balance: number }

/** In-house guests, sorted by room number. Empty when the outlet is not the hotel's restaurant. */
export function useInHouseGuests(outletId?: string): RoomGuest[] {
  const { reservations, rooms, plans, config } = useHotel()
  return useMemo(() => {
    if (outletId && outletId !== config.outletId) return []
    return reservations
      .filter((r) => r.status === 'In House')
      .map((res) => ({ res, room: rooms.find((x) => x.id === res.roomId), plan: plans.find((p) => p.id === res.planId), balance: folioTotals(res).balance }))
      .sort((a, b) => (a.room?.no ?? '').localeCompare(b.room?.no ?? '', undefined, { numeric: true }))
  }, [reservations, rooms, plans, config.outletId, outletId])
}

/** True when this outlet serves the hotel (shows Room Service / Charge to Room) */
export const useIsHotelOutlet = (outletId?: string) => useHotel((s) => !!outletId && s.config.outletId === outletId)

/** Remaining meal-plan value a guest can redeem today (per-night meal rate minus what was already used) */
export function mealAllowance(res: Reservation | undefined, plan: RatePlan | undefined, uses: MealUse[], excludeOrderId?: string, date = today()) {
  if (!res || !plan || res.mealRate <= 0) return null
  const used = uses.filter((u) => u.resId === res.id && u.date === date && u.orderId !== excludeOrderId).reduce((s, u) => s + u.amount, 0)
  return { plan, allowance: res.mealRate, used, left: Math.max(0, res.mealRate - used) }
}

/** Credit check before charging an amount to a room */
export function roomCredit(res: Reservation, amount: number, cfg: HotelConfig) {
  const balance = folioTotals(res).balance
  const after = balance + amount
  return { balance, after, limit: cfg.roomCreditLimit, ok: after <= cfg.roomCreditLimit }
}

/** Close an open restaurant order (room service / dining guest) onto the linked room's folio */
export function postOrderToRoom(orderId: string): { ok: boolean; title: string; body?: string } {
  const st = useStore.getState()
  const o = st.orders.find((x) => x.id === orderId)
  const h = useHotel.getState()
  const res = h.reservations.find((r) => r.id === o?.resId)
  if (!o || o.status === 'Settled' || o.status === 'Cancelled') return { ok: false, title: 'Order is already closed' }
  if (!res || res.status !== 'In House') return { ok: false, title: 'Guest is not in house', body: 'Settle this order at the POS instead' }
  const total = computeTotals(o).total
  const c = roomCredit(res, total, h.config)
  if (!c.ok) return { ok: false, title: 'Room credit limit exceeded', body: `Folio would reach ₹${Math.round(c.after).toLocaleString('en-IN')} (limit ₹${c.limit.toLocaleString('en-IN')})` }
  if (o.items.some((i) => !i.kotNo && !i.cancelled)) st.sendKot(o.id)
  st.settleOrder(o.id, [{ mode: 'Room', amount: total, ref: `Room ${o.roomNo} · ${res.no}` }])
  return { ok: true, title: `₹${total.toLocaleString('en-IN')} posted to Room ${o.roomNo}`, body: `${o.no} · ${res.guest.name}` }
}
