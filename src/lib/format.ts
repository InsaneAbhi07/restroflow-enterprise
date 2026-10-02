import clsx, { type ClassValue } from 'clsx'

export const cn = (...c: ClassValue[]) => clsx(c)

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const inrFmt2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** ₹12,345 */
export const inr = (n: number, decimals = false) => '₹' + (decimals ? inrFmt2 : inrFmt).format(Math.round(n * 100) / 100)
/** 12,345.00 (no symbol) — for receipts */
export const num2 = (n: number) => inrFmt2.format(n)
export const num = (n: number) => inrFmt.format(n)
/** ₹1.24L / ₹3.2Cr / ₹12.5K */
export const inrShort = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1e7) return '₹' + (n / 1e7).toFixed(2) + 'Cr'
  if (a >= 1e5) return '₹' + (n / 1e5).toFixed(2) + 'L'
  if (a >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'K'
  return '₹' + Math.round(n)
}
export const pct = (n: number, d = 1) => (n >= 0 ? '' : '') + n.toFixed(d) + '%'

export const fmtDate = (d: number | string | Date) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
export const fmtDateShort = (d: number | string | Date) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
export const fmtTime = (d: number | string | Date) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
export const fmtDateTime = (d: number | string | Date) => fmtDate(d) + ', ' + fmtTime(d)
export const isoDate = (d: Date = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}
export const todayISO = () => isoDate(new Date())

export const timeAgo = (t: number) => {
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return m + 'm ago'
  const h = Math.floor(m / 60)
  if (h < 24) return h + 'h ago'
  return Math.floor(h / 24) + 'd ago'
}
/** mm:ss elapsed — for kitchen timers */
export const elapsed = (t: number, now = Date.now()) => {
  const s = Math.max(0, Math.floor((now - t) / 1000))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
export const minutesSince = (t: number) => Math.floor((Date.now() - t) / 60000)

let _c = 0
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${(_c++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

export const initials = (name: string) => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

export const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}
