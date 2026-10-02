import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface DemoState {
  active: string | null
  step: number
  done: Record<string, number[]>
  collapsed: boolean
  start: (id: string) => void
  setStep: (n: number) => void
  toggleDone: (id: string, i: number, v?: boolean) => void
  setCollapsed: (v: boolean) => void
  end: () => void
}

export const useDemo = create<DemoState>()(
  persist(
    (set) => ({
      active: null, step: 0, done: {}, collapsed: false,
      start: (id) => set((s) => ({ active: id, step: 0, collapsed: false, done: { ...s.done, [id]: [] } })),
      setStep: (step) => set({ step }),
      toggleDone: (id, i, v) => set((s) => {
        const cur = new Set(s.done[id] ?? [])
        const on = v ?? !cur.has(i)
        if (on) cur.add(i); else cur.delete(i)
        return { done: { ...s.done, [id]: [...cur] } }
      }),
      setCollapsed: (collapsed) => set({ collapsed }),
      end: () => set({ active: null, step: 0 }),
    }),
    { name: 'restroflow-demo-scenario', storage: createJSONStorage(() => sessionStorage) },
  ),
)
