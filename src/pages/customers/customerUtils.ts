import type { Customer } from '@/types'
import type { Tone } from '@/components/ui'

export const TIERS: Customer['tier'][] = ['Bronze', 'Silver', 'Gold', 'Platinum']
export const TIER_MIN: Record<Customer['tier'], number> = { Bronze: 0, Silver: 10000, Gold: 30000, Platinum: 60000 }
export const TIER_TONE: Record<Customer['tier'], Tone> = { Bronze: 'orange', Silver: 'gray', Gold: 'amber', Platinum: 'violet' }
export const TIER_EMOJI: Record<Customer['tier'], string> = { Bronze: '🥉', Silver: '🥈', Gold: '🥇', Platinum: '💎' }
export const AVATAR_COLORS = ['#1d3f70', '#14a891', '#7c3aed', '#ea580c', '#db2777', '#0891b2', '#65a30d', '#b45309']

export const tierFor = (spend: number): Customer['tier'] => (spend >= TIER_MIN.Platinum ? 'Platinum' : spend >= TIER_MIN.Gold ? 'Gold' : spend >= TIER_MIN.Silver ? 'Silver' : 'Bronze')

export function tierProgress(c: Customer) {
  const idx = TIERS.indexOf(c.tier)
  const next = TIERS[idx + 1]
  if (!next) return { next: undefined, pct: 100, remaining: 0 }
  const from = TIER_MIN[c.tier], to = TIER_MIN[next]
  return { next, pct: Math.min(100, Math.max(0, ((c.spend - from) / (to - from)) * 100)), remaining: Math.max(0, to - c.spend) }
}

export const colorFor = (id: string) => AVATAR_COLORS[id.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0) % AVATAR_COLORS.length]

/** Birthday stored as MM-DD */
export const fmtBirthday = (b?: string) => {
  if (!b) return '—'
  const [mm, dd] = b.split('-').map(Number)
  return new Date(2000, mm - 1, dd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
export const daysToBirthday = (b?: string) => {
  if (!b) return Infinity
  const [mm, dd] = b.split('-').map(Number)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let next = new Date(now.getFullYear(), mm - 1, dd)
  if (next < today) next = new Date(now.getFullYear() + 1, mm - 1, dd)
  return Math.round((next.getTime() - today.getTime()) / 864e5)
}

export const fmtPhone = (p: string) => (p.length === 10 ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : p)
