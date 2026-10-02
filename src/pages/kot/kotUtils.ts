import { useEffect, useState } from 'react'
import type { Kot, KotStatus, MenuItem, OrderSource } from '@/types'
import type { Tone } from '@/components/ui'

/** Re-render every `ms` milliseconds and return the current timestamp */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export const KOT_STATUSES: KotStatus[] = ['New', 'Preparing', 'Ready', 'Served', 'Cancelled']
export const STATIONS = ['All', 'Main Kitchen', 'Tandoor', 'Chinese', 'Bar'] as const
export type StationFilter = (typeof STATIONS)[number]

/** Map a menu station to a KDS station */
const toKds = (s?: MenuItem['station']): Exclude<StationFilter, 'All'> =>
  s === 'Tandoor' ? 'Tandoor' : s === 'Chinese' ? 'Chinese' : s === 'Bar' ? 'Bar' : 'Main Kitchen'

export function itemStation(name: string, menu: MenuItem[]) {
  return toKds(menu.find((m) => m.name === name)?.station)
}
export function kotStations(kot: Kot, menu: MenuItem[]) {
  return Array.from(new Set(kot.items.map((i) => itemStation(i.name, menu))))
}

export const SOURCE_TONE: Record<OrderSource, Tone> = {
  POS: 'navy', 'Waiter App': 'orange', 'QR Order': 'teal', Swiggy: 'amber', Zomato: 'red', Phone: 'violet',
}

export const STATUS_STYLE: Record<KotStatus, { dot: string; head: string; label: string }> = {
  New: { dot: 'bg-sky-500', head: 'text-sky-700', label: 'New' },
  Preparing: { dot: 'bg-amber-500', head: 'text-amber-700', label: 'Preparing' },
  Ready: { dot: 'bg-emerald-500', head: 'text-emerald-700', label: 'Ready' },
  Served: { dot: 'bg-slate-400', head: 'text-slate-600', label: 'Served' },
  Cancelled: { dot: 'bg-rose-500', head: 'text-rose-700', label: 'Cancelled' },
}

/** timer colour by minutes elapsed */
export function timerTone(mins: number) {
  if (mins < 10) return { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500' }
  if (mins < 20) return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300', bar: 'bg-amber-500' }
  return { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-400', bar: 'bg-rose-500' }
}
