import type { Attendance, AttStatus, Employee } from '@/types'
import { cn, isoDate } from '@/lib/format'

export const ATT_STATUSES: AttStatus[] = ['Present', 'Late', 'Half Day', 'Absent', 'Leave', 'Weekly Off']

/** Calendar cell colours per status */
export const ATT_COLOR: Record<AttStatus, { bg: string; text: string; hex: string }> = {
  Present: { bg: 'bg-emerald-500', text: 'text-white', hex: '#10b981' },
  Late: { bg: 'bg-amber-400', text: 'text-white', hex: '#fbbf24' },
  'Half Day': { bg: 'bg-orange-400', text: 'text-white', hex: '#fb923c' },
  Absent: { bg: 'bg-rose-500', text: 'text-white', hex: '#f43f5e' },
  Leave: { bg: 'bg-violet-400', text: 'text-white', hex: '#a78bfa' },
  'Weekly Off': { bg: 'bg-slate-200', text: 'text-slate-500', hex: '#e2e8f0' },
}

export const SHIFT_START: Record<Employee['shift'], number> = { Morning: 8, Evening: 14, General: 10, Night: 20 }
export const SHIFT_LABEL: Record<Employee['shift'], string> = {
  Morning: '08:00 AM – 04:30 PM', Evening: '02:00 PM – 10:30 PM', General: '10:00 AM – 07:00 PM', Night: '08:00 PM – 04:30 AM',
}
export const shiftStartHM = (s: Employee['shift']) => `${String(SHIFT_START[s]).padStart(2, '0')}:00`

export const toMin = (hm?: string) => {
  if (!hm) return 0
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + m
}
/** hours worked; when not checked out and the record is today, counts until now */
export function workedHours(a?: Pick<Attendance, 'checkIn' | 'checkOut' | 'date'>): number | null {
  if (!a?.checkIn) return null
  let end: number
  if (a.checkOut) end = toMin(a.checkOut)
  else if (a.date === isoDate()) { const n = new Date(); end = n.getHours() * 60 + n.getMinutes() } else return null
  let d = end - toMin(a.checkIn)
  if (d < 0) d += 1440
  return d / 60
}
export const fmtHours = (h: number | null) => (h === null ? '—' : `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}m`)
/** "14:05" -> "02:05 PM" */
export const hm12 = (hm?: string) => {
  if (!hm) return '—'
  const [h, m] = hm.split(':').map(Number)
  return `${String(((h + 11) % 12) + 1).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
export const lateMinutes = (a: Attendance, e?: Employee) => (a.checkIn && e ? Math.max(0, toMin(a.checkIn) - SHIFT_START[e.shift] * 60) : 0)

export const METHOD_TONE = { Mobile: 'teal', Network: 'blue', Biometric: 'violet', Manual: 'gray' } as const

/** list of ISO dates for a month "YYYY-MM" */
export function monthDates(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const n = new Date(y, m, 0).getDate()
  return Array.from({ length: n }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`)
}
export const shiftMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split('-').map(Number)
  return isoDate(new Date(y, m - 1 + delta, 15)).slice(0, 7)
}

export function summarize(recs: Attendance[]) {
  const c: Record<AttStatus, number> = { Present: 0, Late: 0, 'Half Day': 0, Absent: 0, Leave: 0, 'Weekly Off': 0 }
  recs.forEach((r) => (c[r.status] += 1))
  const working = recs.length - c['Weekly Off']
  const pct = working ? ((c.Present + c.Late + c['Half Day'] * 0.5) / working) * 100 : 0
  const ot = recs.reduce((s, r) => s + (r.ot ?? 0), 0)
  return { ...c, working, pct, ot }
}

/** Compact month calendar. `cell(date)` returns status (or percent for heatmap). */
export function MonthCalendar({ ym, statusOf, heat, size = 'md', onPick, selected }: {
  ym: string; statusOf?: (date: string) => AttStatus | undefined; heat?: (date: string) => number | null; size?: 'sm' | 'md'; onPick?: (date: string) => void; selected?: string
}) {
  const dates = monthDates(ym)
  const [y, m] = ym.split('-').map(Number)
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7 // monday-first
  const today = isoDate()
  return (
    <div>
      <div className={cn('grid grid-cols-7 gap-1 text-center font-medium text-slate-400', size === 'sm' ? 'text-[10px]' : 'text-[11px]')}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: lead }).map((_, i) => <div key={'l' + i} />)}
        {dates.map((d) => {
          const st = statusOf?.(d)
          const h = heat?.(d)
          const future = d > today
          const style = h !== undefined && h !== null ? { background: `rgba(20,168,145,${0.15 + (h / 100) * 0.85})`, color: h > 55 ? '#fff' : '#0f6c60' } : undefined
          return (
            <button key={d} type="button" onClick={() => onPick?.(d)} title={st ? `${d} · ${st}` : h != null ? `${d} · ${Math.round(h)}% present` : d}
              className={cn('flex flex-col items-center justify-center rounded-md font-medium tabular transition',
                size === 'sm' ? 'h-7 text-[10.5px]' : 'h-11 text-[12px]',
                st ? [ATT_COLOR[st].bg, ATT_COLOR[st].text] : !style && (future ? 'bg-slate-50 text-slate-300' : 'bg-slate-100 text-slate-400'),
                d === today && 'ring-2 ring-navy-700 ring-offset-1', selected === d && 'ring-2 ring-brand-500 ring-offset-1', onPick && 'hover:opacity-80')}
              style={style}>
              {Number(d.slice(8))}
              {size === 'md' && h != null && <span className="text-[9px] opacity-90">{Math.round(h)}%</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AttLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600', className)}>
      {ATT_STATUSES.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5"><span className={cn('size-2.5 rounded-sm', ATT_COLOR[s].bg)} />{s}</span>
      ))}
    </div>
  )
}

/** Salary slip numbers from employee salary config */
export function salarySlip(e: Employee) {
  const s = e.salary
  const earnings = [
    { label: 'Basic', amount: s.basic }, { label: 'HRA', amount: s.hra }, { label: 'Allowances', amount: s.allowance }, { label: 'Incentive', amount: s.incentive },
  ]
  const deductions = [
    { label: 'Provident Fund', amount: s.pf }, { label: 'ESI', amount: s.esi }, { label: 'Salary Advance', amount: s.advance }, { label: 'Loan EMI', amount: s.loan },
  ]
  const gross = earnings.reduce((a, b) => a + b.amount, 0)
  const ded = deductions.reduce((a, b) => a + b.amount, 0)
  return { earnings, deductions, gross, ded, net: gross - ded }
}
