import { useState } from 'react'
import { Fingerprint, Info, LocateFixed, LogIn, LogOut, MapPin, Wifi } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { cn, fmtDate, isoDate } from '@/lib/format'
import { ATT_COLOR, AttLegend, MonthCalendar, SHIFT_LABEL, fmtHours, hm12, summarize, workedHours } from '@/pages/attendance/attUtils'
import { useMe, useMobile } from './ctx'
import { MCard, MHeader, SectionTitle, useClock } from './ui'
import { MobileLeave } from './MobileLeave'

export function AttendanceScreen() {
  const { emp, outlet } = useMe()
  const m = useMobile()
  const now = useClock(1000)
  const attendance = useStore((s) => s.attendance)
  const ssid = useStore((s) => s.settings.attendance.networkSSID)
  const checkIn = useStore((s) => s.checkIn)
  const checkOut = useStore((s) => s.checkOut)
  const [method, setMethod] = useState<'Mobile' | 'Network'>('Mobile')
  const [busy, setBusy] = useState(false)
  if (!emp) return null

  const date = isoDate()
  const ym = date.slice(0, 7)
  const mine = attendance.filter((a) => a.employeeId === emp.id)
  const today = mine.find((a) => a.date === date)
  const month = mine.filter((a) => a.date.startsWith(ym))
  const sum = summarize(month)
  const history = [...mine].filter((a) => a.date <= date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
  const inState = !today?.checkIn ? 'in' : !today.checkOut ? 'out' : 'done'

  const act = () => {
    if (inState === 'done') return m.snack("You've completed today's shift", 'info')
    setBusy(true)
    setTimeout(() => {
      if (inState === 'in') { checkIn(emp.id, method); m.snack(`Checked in via ${method === 'Mobile' ? 'Mobile GPS' : ssid + ' Wi-Fi'} (simulated)`) }
      else { checkOut(emp.id); m.snack('Checked out successfully') }
      setBusy(false)
    }, 900)
  }

  return (
    <div>
      <MHeader title="Attendance" subtitle={`${outlet?.short} · ${emp.shift} shift`} />
      <div className="px-4 pt-4">
        <MCard className="flex flex-col items-center py-6">
          <p className="text-[34px] font-bold leading-none tracking-tight text-slate-900 tabular">
            {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </p>
          <p className="mt-1 text-[13px] text-slate-500">{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

          <button onClick={act} disabled={busy}
            className={cn('mt-6 flex size-44 flex-col items-center justify-center rounded-full text-white shadow-2xl transition active:scale-95',
              inState === 'in' ? 'm-pulse bg-gradient-to-br from-brand-400 to-brand-600 shadow-brand-500/40' : inState === 'out' ? 'm-pulse-red bg-gradient-to-br from-rose-500 to-rose-700 shadow-rose-500/40' : 'bg-gradient-to-br from-slate-300 to-slate-400 shadow-slate-400/30')}>
            {busy ? <span className="size-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
              : inState === 'in' ? <LogIn className="size-11" /> : inState === 'out' ? <LogOut className="size-11" /> : <Fingerprint className="size-11" />}
            <span className="mt-2 text-[18px] font-bold">{busy ? 'Verifying…' : inState === 'in' ? 'Check in' : inState === 'out' ? 'Check out' : 'Done'}</span>
            <span className="text-[11.5px] opacity-80">{inState === 'done' ? 'Shift complete' : 'Tap to ' + (inState === 'in' ? 'start shift' : 'end shift')}</span>
          </button>

          <div className="mt-6 grid w-full grid-cols-3 divide-x divide-slate-100 text-center">
            <div><p className="text-[11px] text-slate-500">Check in</p><p className="text-[14px] font-bold">{hm12(today?.checkIn)}</p></div>
            <div><p className="text-[11px] text-slate-500">Check out</p><p className="text-[14px] font-bold">{hm12(today?.checkOut)}</p></div>
            <div><p className="text-[11px] text-slate-500">Worked</p><p className="text-[14px] font-bold">{fmtHours(workedHours(today))}</p></div>
          </div>
          {today && (
            <span className={cn('mt-3 rounded-full px-3 py-1 text-[12px] font-bold', ATT_COLOR[today.status].bg, ATT_COLOR[today.status].text)}>
              {today.status}{today.method ? ` · ${today.method}` : ''}
            </span>
          )}
          <p className="mt-2 text-[11.5px] text-slate-400">Shift {SHIFT_LABEL[emp.shift]}</p>
        </MCard>

        <SectionTitle>Verification method</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {([['Mobile', LocateFixed, 'Mobile GPS', '(simulated)'], ['Network', Wifi, 'Office Wi-Fi', '(simulated)']] as const).map(([k, I, l, s]) => (
            <button key={k} onClick={() => setMethod(k)} disabled={inState !== 'in'}
              className={cn('flex items-center gap-2.5 rounded-2xl border-2 bg-white p-3 text-left transition', method === k ? 'border-brand-500 bg-brand-50/50' : 'border-slate-200', inState !== 'in' && 'opacity-60')}>
              <span className={cn('flex size-9 items-center justify-center rounded-xl', method === k ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500')}><I className="size-4.5" /></span>
              <span><span className="block text-[13px] font-bold text-slate-800">{l}</span><span className="block text-[11px] text-slate-500">{s}</span></span>
            </button>
          ))}
        </div>
        <div className="mt-2 space-y-1.5 rounded-2xl bg-white p-3 text-[12.5px] ring-1 ring-slate-200/70">
          <p className="flex items-center gap-2 text-emerald-700"><MapPin className="size-4" />Within 50 m of {outlet?.short} (simulated)</p>
          <p className="flex items-center gap-2 text-emerald-700"><Wifi className="size-4" />Network: {ssid} Wi-Fi detected (simulated)</p>
        </div>
        <p className="mt-2 flex items-start gap-1.5 rounded-2xl bg-amber-50 p-3 text-[11.5px] text-amber-800"><Info className="mt-0.5 size-3.5 shrink-0" />Location and network verification are simulated in this prototype and are not real attendance verification.</p>

        <SectionTitle>{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</SectionTitle>
        <MCard>
          <div className="mb-3 grid grid-cols-4 gap-2 text-center">
            {[['Present', sum.Present, 'text-emerald-600'], ['Late', sum.Late, 'text-amber-600'], ['Absent', sum.Absent, 'text-rose-600'], ['Leave', sum.Leave, 'text-violet-600']].map(([l, v, c]) => (
              <div key={l as string} className="rounded-xl bg-slate-50 py-2"><p className={cn('text-[18px] font-bold', c as string)}>{v}</p><p className="text-[10.5px] text-slate-500">{l}</p></div>
            ))}
          </div>
          <MonthCalendar ym={ym} size="sm" statusOf={(d) => month.find((a) => a.date === d)?.status} />
          <AttLegend className="mt-3" />
          <p className="mt-2 text-[12px] text-slate-500">Attendance this month: <b className="text-slate-800">{sum.pct.toFixed(0)}%</b>{sum.ot > 0 && <> · Overtime <b className="text-slate-800">{sum.ot.toFixed(1)} h</b></>}</p>
        </MCard>

        <MobileLeave />

        <SectionTitle>History</SectionTitle>
        <MCard className="divide-y divide-slate-100 p-0">
          {history.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
              <span className={cn('flex size-10 shrink-0 flex-col items-center justify-center rounded-xl text-[10px] font-semibold', ATT_COLOR[a.status].bg, ATT_COLOR[a.status].text)}>
                <span className="text-[15px] font-bold leading-none">{a.date.slice(8)}</span>
                {new Date(a.date).toLocaleDateString('en-IN', { weekday: 'short' })}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-slate-800">{a.status}</p>
                <p className="text-[12px] text-slate-500">{a.checkIn ? `${hm12(a.checkIn)} → ${hm12(a.checkOut)}` : fmtDate(a.date)}{a.method ? ` · ${a.method}` : ''}</p>
              </div>
              <span className="text-[12.5px] font-semibold text-slate-600 tabular">{fmtHours(workedHours(a))}</span>
            </div>
          ))}
        </MCard>
        <div className="h-4" />
      </div>
    </div>
  )
}
