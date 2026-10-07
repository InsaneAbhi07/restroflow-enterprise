import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Order } from '@/types'

export type QuickPay = 'Cash' | 'Card' | 'UPI' | 'Due' | 'Part' | 'Room'
export type PosView = 'grid' | 'compact'

/** Fields captured before the first item is added (no store order exists yet) */
export type PendingMeta = Partial<Pick<Order, 'type' | 'source' | 'waiterId' | 'waiterName' | 'pax' | 'customerId' | 'customerName' | 'customerPhone' | 'note' | 'serviceCharge' | 'deliveryCharge' | 'discount' | 'roomId' | 'roomNo' | 'resId'>>

interface PosUI {
  activeId: string | null
  meta: PendingMeta
  view: PosView | null
  vegOnly: boolean
  quickPay: QuickPay
  setActive: (id: string | null) => void
  setMeta: (m: PendingMeta | ((p: PendingMeta) => PendingMeta)) => void
  setView: (v: PosView) => void
  setVegOnly: (v: boolean) => void
  setQuickPay: (q: QuickPay) => void
}

/** Session-local POS state so the cart survives navigation between screens */
export const usePosUI = create<PosUI>()(
  persist(
    (set) => ({
      activeId: null,
      meta: {},
      view: null,
      vegOnly: false,
      quickPay: 'Cash',
      setActive: (id) => set({ activeId: id }),
      setMeta: (m) => set((s) => ({ meta: typeof m === 'function' ? m(s.meta) : m })),
      setView: (v) => set({ view: v }),
      setVegOnly: (v) => set({ vegOnly: v }),
      setQuickPay: (q) => set({ quickPay: q }),
    }),
    { name: 'restroflow-pos-ui', storage: createJSONStorage(() => sessionStorage) },
  ),
)
