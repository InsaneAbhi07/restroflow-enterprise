import { create } from 'zustand'

export interface Toast { id: number; title: string; body?: string; type: 'success' | 'error' | 'info' | 'warning' }
interface ToastStore { toasts: Toast[]; push: (t: Omit<Toast, 'id'>) => void; dismiss: (id: number) => void }

let n = 0
export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = ++n
    set((s) => ({ toasts: [...s.toasts, { ...t, id }].slice(-4) }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3200)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

/** toast.success('Saved') — callable from anywhere */
export const toast = {
  success: (title: string, body?: string) => useToastStore.getState().push({ title, body, type: 'success' }),
  error: (title: string, body?: string) => useToastStore.getState().push({ title, body, type: 'error' }),
  info: (title: string, body?: string) => useToastStore.getState().push({ title, body, type: 'info' }),
  warning: (title: string, body?: string) => useToastStore.getState().push({ title, body, type: 'warning' }),
}
