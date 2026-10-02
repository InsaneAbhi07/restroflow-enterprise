import { useState } from 'react'
import { Bell, Building2, CalendarDays, ChevronRight, Clock, Download, FileText, Globe, HelpCircle, Landmark, LogOut, Mail, Phone, ShieldCheck, Smartphone } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { cn, fmtDate, inr, isoDate, monthLabel } from '@/lib/format'
import { Avatar, Toggle } from '@/components/ui'
import { SHIFT_LABEL, salarySlip } from '@/pages/attendance/attUtils'
import { useMe, useMobile } from './ctx'
import { BottomSheet, MButton, MCard, MHeader, SectionTitle } from './ui'

const lastMonth = () => isoDate(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15)).slice(0, 7)

export function ProfileScreen() {
  const { emp, outlet, role, user } = useMe()
  const m = useMobile()
  const setMobileUser = useStore((s) => s.setMobileUser)
  const log = useStore((s) => s.log)
  const [lang, setLang] = useState('English')
  const [prefs, setPrefs] = useState({ orders: true, kot: true, attendance: true, sound: false })
  if (!emp) return null
  const slip = salarySlip(emp)

  const logout = () => m.sheet(
    <BottomSheet title="Log out?" onClose={() => m.sheet(null)}
      footer={<div className="flex gap-2"><MButton variant="outline" className="flex-1" onClick={() => m.sheet(null)}>Cancel</MButton><MButton variant="danger" className="flex-1" onClick={() => { log(`${emp.name} signed out of Staff App`, 'attendance', 'info', emp.outletId); setMobileUser(null) }}>Log out</MButton></div>}>
      <p className="text-[13.5px] text-slate-600">You'll need your Employee ID and PIN to sign in again. Your attendance status is not affected.</p>
    </BottomSheet>,
  )
  const pickLang = () => m.sheet(
    <BottomSheet title="Language" onClose={() => m.sheet(null)}>
      <div className="space-y-2 pb-4">
        {['English', 'हिन्दी (Hindi)', 'ਪੰਜਾਬੀ (Punjabi)', 'मराठी (Marathi)'].map((l) => (
          <button key={l} onClick={() => { setLang(l); m.sheet(null); m.snack(`Language set to ${l}`) }}
            className={cn('flex h-12 w-full items-center justify-between rounded-2xl border-2 px-4 text-[14px] font-semibold', lang === l ? 'border-brand-500 bg-brand-50' : 'border-slate-200')}>
            {l}{lang === l && <span className="text-brand-600">✓</span>}
          </button>
        ))}
      </div>
    </BottomSheet>,
  )

  return (
    <div>
      <MHeader title="Profile" />
      <div className="px-4 pt-4">
        <MCard className="flex flex-col items-center py-5 text-center">
          <Avatar name={emp.name} color={emp.color} size={72} className="ring-4 ring-slate-100" />
          <p className="mt-3 text-[18px] font-bold text-slate-900">{emp.name}</p>
          <p className="text-[13px] text-slate-500">{emp.designation} · {emp.code}</p>
          <div className="mt-2 flex gap-1.5">
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white" style={{ background: role?.color ?? '#1d3f70' }}>{role?.name}</span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">{emp.status}</span>
          </div>
        </MCard>

        <SectionTitle>Work details</SectionTitle>
        <MCard className="divide-y divide-slate-100 p-0">
          {[
            [Building2, 'Outlet', outlet?.name],
            [Clock, 'Shift', `${emp.shift} · ${SHIFT_LABEL[emp.shift]}`],
            [ShieldCheck, 'Department', emp.department],
            [CalendarDays, 'Joined', fmtDate(emp.joinDate)],
            [Phone, 'Phone', emp.phone],
            [Mail, 'Email', user?.email ?? emp.email],
            [Landmark, 'Bank', emp.bank],
          ].map(([I, l, v], i) => {
            const Icon = I as typeof Clock
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Icon className="size-4" /></span>
                <span className="w-20 text-[12.5px] text-slate-500">{l as string}</span>
                <span className="min-w-0 flex-1 truncate text-right text-[13.5px] font-semibold text-slate-800">{v as string}</span>
              </div>
            )
          })}
        </MCard>

        <SectionTitle action={<button onClick={() => m.push({ kind: 'salary' })} className="text-[12px] font-semibold text-brand-600">View slip</button>}>Salary · {monthLabel(lastMonth())}</SectionTitle>
        <button onClick={() => m.push({ kind: 'salary' })} className="w-full overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 to-navy-700 p-4 text-left text-white shadow-lg shadow-navy-900/20 active:scale-[.99]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-navy-200">Net pay credited</span>
            <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10.5px] font-bold text-emerald-300">PAID</span>
          </div>
          <p className="mt-1 text-[28px] font-bold tabular">{inr(slip.net)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-xl bg-white/10 p-2.5"><p className="text-navy-200">Earnings</p><p className="text-[14px] font-bold tabular">{inr(slip.gross)}</p></div>
            <div className="rounded-xl bg-white/10 p-2.5"><p className="text-navy-200">Deductions</p><p className="text-[14px] font-bold tabular">−{inr(slip.ded)}</p></div>
          </div>
          <p className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-brand-300"><FileText className="size-3.5" />Tap to view full salary slip<ChevronRight className="size-3.5" /></p>
        </button>

        <SectionTitle>Settings</SectionTitle>
        <MCard className="divide-y divide-slate-100 p-0">
          <button onClick={pickLang} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50">
            <span className="flex size-8 items-center justify-center rounded-xl bg-sky-100 text-sky-600"><Globe className="size-4" /></span>
            <span className="flex-1 text-[14px] font-medium">Language</span>
            <span className="text-[13px] text-slate-500">{lang}</span><ChevronRight className="size-4 text-slate-300" />
          </button>
          {([['orders', 'New order alerts'], ['kot', 'KOT ready notifications'], ['attendance', 'Shift reminders'], ['sound', 'Sound & vibration']] as const).map(([k, l]) => (
            <div key={k} className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Bell className="size-4" /></span>
              <span className="flex-1 text-[14px] font-medium">{l}</span>
              <Toggle checked={prefs[k]} onChange={(v) => { setPrefs((p) => ({ ...p, [k]: v })); m.snack(`${l} ${v ? 'enabled' : 'disabled'}`, 'info') }} />
            </div>
          ))}
          <button onClick={() => m.snack('Support: +91 120 455 7800 · hr@grandkitchen.in', 'info')} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50">
            <span className="flex size-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><HelpCircle className="size-4" /></span>
            <span className="flex-1 text-[14px] font-medium">Help & support</span><ChevronRight className="size-4 text-slate-300" />
          </button>
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Smartphone className="size-4" /></span>
            <span className="flex-1 text-[14px] font-medium">App version</span><span className="text-[13px] text-slate-500">2.4.1 (demo)</span>
          </div>
        </MCard>

        <MButton variant="outline" className="mt-5 w-full border-rose-200 text-rose-600" onClick={logout}><LogOut className="size-5" />Log out</MButton>
        <div className="h-6" />
      </div>
    </div>
  )
}

export function SalarySlipScreen() {
  const { emp, outlet } = useMe()
  const m = useMobile()
  if (!emp) return null
  const slip = salarySlip(emp)
  const ym = lastMonth()
  return (
    <div className="flex h-full flex-col">
      <MHeader onBack={m.pop} title="Salary slip" subtitle={monthLabel(ym)} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-4 no-scrollbar">
        <MCard className="p-0">
          <div className="rounded-t-2xl bg-navy-900 px-4 py-4 text-white">
            <p className="text-[11px] uppercase tracking-wider text-navy-200">The Grand Kitchen · Payslip</p>
            <p className="mt-1 text-[16px] font-bold">{emp.name}</p>
            <p className="text-[12px] text-navy-200">{emp.code} · {emp.designation} · {outlet?.short}</p>
            <div className="mt-3 flex items-end justify-between">
              <div><p className="text-[11px] text-navy-200">Net pay</p><p className="text-[26px] font-bold tabular">{inr(slip.net)}</p></div>
              <p className="text-right text-[11px] text-navy-200">Paid on<br /><span className="text-[13px] font-semibold text-white">{fmtDate(ym + '-30')}</span></p>
            </div>
          </div>
          <div className="p-4">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-emerald-600">Earnings</p>
            {slip.earnings.map((e) => <Line key={e.label} l={e.label} v={inr(e.amount)} />)}
            <Line l="Gross earnings" v={inr(slip.gross)} bold />
            <p className="mb-2 mt-4 text-[12px] font-bold uppercase tracking-wide text-rose-600">Deductions</p>
            {slip.deductions.map((e) => <Line key={e.label} l={e.label} v={e.amount ? '−' + inr(e.amount) : inr(0)} />)}
            <Line l="Total deductions" v={'−' + inr(slip.ded)} bold />
            <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-3 text-[15px] font-bold text-emerald-800"><span>Net salary</span><span className="tabular">{inr(slip.net)}</span></div>
            <p className="mt-3 text-[11.5px] text-slate-500">Credited to {emp.bank} · PAN {emp.pan.slice(0, 2)}•••••{emp.pan.slice(-3)}</p>
          </div>
        </MCard>
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 bg-white px-4 pb-6 pt-3">
        <MButton variant="primary" className="w-full" onClick={() => m.snack(`Payslip_${emp.code}_${ym}.pdf downloaded`)}><Download className="size-5" />Download PDF</MButton>
      </div>
    </div>
  )
}
const Line = ({ l, v, bold }: { l: string; v: string; bold?: boolean }) => (
  <div className={cn('flex items-center justify-between py-1.5 text-[13.5px]', bold ? 'mt-1 border-t border-dashed border-slate-200 pt-2 font-bold text-slate-900' : 'text-slate-600')}><span>{l}</span><span className="tabular">{v}</span></div>
)
