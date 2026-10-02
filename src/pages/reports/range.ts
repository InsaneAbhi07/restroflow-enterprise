import { fmtDate, isoDate } from '@/lib/format'
import type { RangePreset } from './types'

export const PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'custom', label: 'Custom' },
]

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export function resolveRange(preset: RangePreset, customFrom?: string, customTo?: string) {
  const today = startOfDay(new Date())
  let from = today
  let to = today
  switch (preset) {
    case 'yesterday': from = to = new Date(today.getTime() - 864e5); break
    case 'last7': from = new Date(today.getTime() - 6 * 864e5); break
    case 'thisMonth': from = new Date(today.getFullYear(), today.getMonth(), 1); break
    case 'lastMonth':
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      to = new Date(today.getFullYear(), today.getMonth(), 0)
      break
    case 'custom': {
      const f = customFrom ? new Date(customFrom + 'T00:00:00') : today
      const t = customTo ? new Date(customTo + 'T00:00:00') : today
      from = f <= t ? f : t
      to = f <= t ? t : f
      break
    }
  }
  if (to > today) to = today
  if (from > to) from = to
  const dates: string[] = []
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) dates.push(isoDate(d))
  // safety cap (1 year)
  const capped = dates.slice(-366)
  const label = capped.length === 1 ? fmtDate(from) : `${fmtDate(new Date(capped[0] + 'T00:00:00'))} – ${fmtDate(to)}`
  return { from: new Date(capped[0] + 'T00:00:00'), to: new Date(to.getTime() + 864e5 - 1), dates: capped, label }
}

export const inRange = (t: number | undefined, from: Date, to: Date) => !!t && t >= from.getTime() && t <= to.getTime()
export const dateInRange = (iso: string, dates: string[]) => iso >= dates[0] && iso <= dates[dates.length - 1]
