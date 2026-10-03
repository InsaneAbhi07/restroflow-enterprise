import { useState } from 'react'
import { CalendarPlus, ChevronRight } from 'lucide-react'
import { DOT } from '@/components/ui'
import { cn, fmtDate, isoDate } from '@/lib/format'
import { useLeave, balanceOf, leaveDays, type LeaveSession } from '@/pages/attendance/leaveStore'
import { useMe, useMobile } from './ctx'
import { BottomSheet, MButton, MCard, SectionTitle } from './ui'

const STATUS_CLS: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700', Approved: 'bg-emerald-50 text-emerald-700', Rejected: 'bg-rose-50 text-rose-700', Cancelled: 'bg-slate-100 text-slate-500',
}

/** Leave balances + requests on the staff app attendance tab */
export function MobileLeave() {
  const { emp } = useMe()
  const m = useMobile()
  const types = useLeave((s) => s.types)
  const requests = useLeave((s) => s.requests)
  const opening = useLeave((s) => s.opening)
  if (!emp) return null
  const mineTypes = types.filter((t) => t.active && t.paid && (t.gender === 'All' || t.gender === emp.gender) && t.annual <= 30)
  const mine = requests.filter((r) => r.employeeId === emp.id).sort((a, b) => b.appliedAt - a.appliedAt).slice(0, 5)

  return (
    <>
      <SectionTitle action={<button onClick={() => m.sheet(<ApplySheet />)} className="flex items-center gap-1 text-[13px] font-semibold text-brand-600"><CalendarPlus className="size-4" />Apply</button>}>My leave</SectionTitle>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
        {mineTypes.map((t) => {
          const b = balanceOf(emp.id, t, requests, opening)
          return (
            <div key={t.id} className="w-[104px] shrink-0 rounded-2xl border border-slate-200 bg-white p-3">
              <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white', DOT[t.tone])}>{t.code}</span>
              <p className="mt-1.5 text-[20px] font-bold leading-none text-slate-900">{b.available}<span className="text-[12px] font-medium text-slate-400">/{b.quota}</span></p>
              <p className="mt-1 truncate text-[10.5px] text-slate-500">{t.name}</p>
            </div>
          )
        })}
      </div>
      <MCard className="mt-2 divide-y divide-slate-100 p-0">
        {mine.length === 0 && <p className="px-4 py-5 text-center text-[13px] text-slate-400">No leave requests yet</p>}
        {mine.map((r) => {
          const t = types.find((x) => x.id === r.typeId)
          return (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold text-white', DOT[t?.tone ?? 'gray'])}>{t?.code}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-slate-800">{fmtDate(r.from)}{r.to !== r.from && ` – ${fmtDate(r.to)}`}</p>
                <p className="truncate text-[12px] text-slate-500">{r.days} day{r.days === 1 ? '' : 's'} · {r.remark ?? r.reason}</p>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_CLS[r.status])}>{r.status}</span>
            </div>
          )
        })}
      </MCard>
      <button onClick={() => m.sheet(<ApplySheet />)} className="mt-2 flex w-full items-center justify-between rounded-2xl bg-brand-50 px-4 py-3 text-[13.5px] font-semibold text-brand-700">
        <span className="flex items-center gap-2"><CalendarPlus className="size-4" />Apply for leave</span><ChevronRight className="size-4" />
      </button>
    </>
  )
}

function ApplySheet() {
  const { emp } = useMe()
  const m = useMobile()
  const types = useLeave((s) => s.types)
  const requests = useLeave((s) => s.requests)
  const opening = useLeave((s) => s.opening)
  const apply = useLeave((s) => s.apply)
  const tomorrow = isoDate(new Date(Date.now() + 864e5))
  const [typeId, setTypeId] = useState('lt_cl')
  const [from, setFrom] = useState(tomorrow)
  const [to, setTo] = useState(tomorrow)
  const [session, setSession] = useState<LeaveSession>('Full Day')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  if (!emp) return null
  const list = types.filter((t) => t.active && (t.gender === 'All' || t.gender === emp.gender))
  const type = list.find((t) => t.id === typeId) ?? list[0]
  const days = leaveDays(from, session === 'Full Day' ? to : from, session)
  const bal = balanceOf(emp.id, type, requests, opening)

  const submit = () => {
    if (!reason.trim()) return setError('Please add a reason')
    if (to < from) return setError('End date is before start date')
    if (!bal.unlimited && days > bal.available) return setError(`Only ${bal.available} ${type.code} day(s) left. Choose Leave Without Pay.`)
    if (type.maxConsecutive && days > type.maxConsecutive) return setError(`${type.code} allows max ${type.maxConsecutive} days at a time`)
    if (requests.some((r) => r.employeeId === emp.id && (r.status === 'Pending' || r.status === 'Approved') && !(r.to < from || r.from > (session === 'Full Day' ? to : from)))) return setError('You already have leave on these dates')
    apply({ employeeId: emp.id, typeId: type.id, from, to: session === 'Full Day' ? to : from, session, days, reason: reason.trim(), source: 'Staff App' })
    m.sheet(null)
    m.snack(`Leave request sent · ${days} day(s) ${type.code}`)
  }

  return (
    <BottomSheet title="Apply for leave" onClose={() => m.sheet(null)}
      footer={<MButton variant="accent" className="w-full" onClick={submit}>Submit · {days} day{days === 1 ? '' : 's'}</MButton>}>
      <p className="mb-2 text-[12px] font-semibold text-slate-500">Leave type</p>
      <div className="grid grid-cols-2 gap-2">
        {list.map((t) => {
          const b = balanceOf(emp.id, t, requests, opening)
          return (
            <button key={t.id} onClick={() => { setTypeId(t.id); if (!t.halfDay) setSession('Full Day'); setError('') }}
              className={cn('rounded-2xl border p-2.5 text-left transition', type.id === t.id ? 'border-brand-400 bg-brand-50' : 'border-slate-200')}>
              <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white', DOT[t.tone])}>{t.code}</span>
              <p className="mt-1 truncate text-[12.5px] font-semibold text-slate-800">{t.name}</p>
              <p className="text-[11px] text-slate-500">{b.unlimited ? 'Unpaid' : `${b.available} left`}</p>
            </button>
          )
        })}
      </div>
      {type.halfDay && (
        <div className="mt-3 flex gap-1.5">
          {(['Full Day', 'First Half', 'Second Half'] as LeaveSession[]).map((s) => (
            <button key={s} onClick={() => setSession(s)} className={cn('flex-1 rounded-xl py-2 text-[12px] font-semibold', session === s ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600')}>{s}</button>
          ))}
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-[12px] font-semibold text-slate-500">From
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value) }} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-[14px] text-slate-800" />
        </label>
        <label className="text-[12px] font-semibold text-slate-500">To
          <input type="date" value={session === 'Full Day' ? to : from} min={from} disabled={session !== 'Full Day'} onChange={(e) => setTo(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-[14px] text-slate-800 disabled:bg-slate-50" />
        </label>
      </div>
      <label className="mt-3 block text-[12px] font-semibold text-slate-500">Reason
        <textarea value={reason} onChange={(e) => { setReason(e.target.value); setError('') }} rows={3} placeholder="e.g. Family function" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] text-slate-800" />
      </label>
      {!bal.unlimited && <p className="mt-1 text-[12px] text-slate-500">Balance after request: <b className={bal.available - days < 0 ? 'text-rose-600' : 'text-emerald-600'}>{bal.available - days}</b> {type.code}</p>}
      {error && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">{error}</p>}
    </BottomSheet>
  )
}
