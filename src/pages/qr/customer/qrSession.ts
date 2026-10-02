import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { MenuItem, Modifier, Variant } from '@/types'

/** Guest-side QR session: which orders this table's guest placed (persisted so a reload keeps tracking) */
interface QrSessionStore {
  sessions: Record<string, { orderIds: string[] }>
  addOrder: (key: string, orderId: string) => void
  clear: (key: string) => void
}

export const useQrSession = create<QrSessionStore>()(
  persist(
    (set) => ({
      sessions: {},
      addOrder: (key, orderId) =>
        set((s) => {
          const cur = s.sessions[key]?.orderIds ?? []
          return { sessions: { ...s.sessions, [key]: { orderIds: cur.includes(orderId) ? cur : [...cur, orderId] } } }
        }),
      clear: (key) => set((s) => ({ sessions: { ...s.sessions, [key]: { orderIds: [] } } })),
    }),
    { name: 'restroflow-qr-session-v1', storage: createJSONStorage(() => localStorage) },
  ),
)

export interface CartLine {
  key: string
  item: MenuItem
  variant?: Variant
  modifiers: Modifier[]
  note: string
  qty: number
}

export const unitPrice = (l: Pick<CartLine, 'item' | 'variant' | 'modifiers'>) => (l.variant?.price ?? l.item.price) + l.modifiers.reduce((s, m) => s + m.price, 0)
export const lineKey = (itemId: string, variant?: Variant, modifiers: Modifier[] = [], note = '') =>
  [itemId, variant?.name ?? '', modifiers.map((m) => m.name).sort().join('+'), note.trim()].join('|')
