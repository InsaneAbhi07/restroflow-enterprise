import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { GroupKey } from './types'

interface ReportUI {
  favourites: string[]
  usage: Record<string, number>
  recent: string[]
  collapsed: Partial<Record<GroupKey, boolean>>
  catalogueSearch: string
  toggleFav: (id: string) => void
  touch: (id: string) => void
  toggleGroup: (g: GroupKey) => void
  setSearch: (q: string) => void
}

/** Reports-only UI state (favourites, usage counts, collapsed groups) */
export const useReportUI = create<ReportUI>()(
  persist(
    (set) => ({
      favourites: ['day-end', 'daily-sales', 'item-wise', 'payment-mode', 'tax-gst', 'current-stock'],
      usage: { 'day-end': 42, 'daily-sales': 31, 'item-wise': 24, 'payment-mode': 19, 'tax-gst': 15, 'bill-wise': 14, 'current-stock': 12, 'kot-performance': 9, 'daily-attendance': 8, 'food-cost': 6 },
      recent: [],
      collapsed: {},
      catalogueSearch: '',
      toggleFav: (id) => set((s) => ({ favourites: s.favourites.includes(id) ? s.favourites.filter((x) => x !== id) : [...s.favourites, id] })),
      touch: (id) => set((s) => ({ usage: { ...s.usage, [id]: (s.usage[id] ?? 0) + 1 }, recent: [id, ...s.recent.filter((x) => x !== id)].slice(0, 6) })),
      toggleGroup: (g) => set((s) => ({ collapsed: { ...s.collapsed, [g]: !s.collapsed[g] } })),
      setSearch: (q) => set({ catalogueSearch: q }),
    }),
    { name: 'rf-reports-ui', storage: createJSONStorage(() => localStorage), partialize: (s) => ({ favourites: s.favourites, usage: s.usage, recent: s.recent, collapsed: s.collapsed }) },
  ),
)
