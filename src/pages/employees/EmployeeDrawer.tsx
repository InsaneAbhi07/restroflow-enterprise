import { useMemo } from 'react'
import { Building2, CalendarCheck2, Clock, Eye, FileText, IdCard, Mail, Pencil, Phone, ShieldCheck, Wallet } from 'lucide-react'
import type { Employee } from '@/types'
import { Avatar, Badge, Button, Card, Drawer, KeyValue, StatusBadge, Tabs } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { cn, fmtDate, inr, isoDate, monthLabel } from '@/lib/format'
import { ATT_COLOR, AttLegend, MonthCalendar, SHIFT_LABEL, fmtHours, hm12, salarySlip, summarize, workedHours } from '@/pages/attendance/attUtils'
import type { QuickKind } from './EmployeeModals'

export type DrawerTab = 'overview' | 'attendance' | 'salary' | 'documents'

export function EmployeeDrawer({ employee, tab, setTab, onClose, onEdit, onQuick }: {
  employee: Employee; tab: DrawerTab; setTab: (t: DrawerTab) => void; onClose: () => void; onEdit: () => void; onQuick: (k: QuickKind) => void
}) {
  const outlets = useStore((s) => s.outlets)
  const users = useStore((s) => s.users)
  const roles = useStore((s) => s.roles)
  const { can } = usePermission()
  const outlet = outlets.find((o) => o.id === employee.outletId)
  const user = users.find((u) => u.employeeId === employee.id)
  const role = roles.find((r) => r.id === user?.roleId)
  const tenure = Math.max(0, (Date.now() - new Date(employee.joinDate).getTime()) / (365.25 * 864e5))

  return (
    <Drawer open onClose={onClose} width={640} title="Employee profile" subtitle={`${employee.code} · ${outlet?.short}`}
      footer={<>
        <Button size="sm" icon={<Building2 className="size-3.5" />} disabled={!can('employees', 'edit')} onClick={() => onQuick('outlet')}>Assign outlet</Button>
        <Button size="sm" icon={<Clock className="size-3.5" />} disabled={!can('employees', 'edit')} onClick={() => onQuick('shift')}>Assign shift</Button>
        <Button size="sm" icon={<ShieldCheck className="size-3.5" />} disabled={!can('employees', 'edit')} onClick={() => onQuick('role')}>Change role</Button>
        <Button size="sm" variant="primary" icon={<Pencil className="size-3.5" />} disabled={!can('employees', 'edit')} onClick={onEdit}>Edit</Button>
      </>}>
      <div className="-mx-5 -mt-4 mb-4 border-b border-slate-100 bg-gradient-to-br from-navy-50 to-white px-5 py-5">
        <div className="flex items-start gap-4">
          <Avatar name={employee.name} color={employee.color} size={60} className="ring-4 ring-white shadow" />
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-semibold text-slate-900">{employee.name}</h3>
            <p className="text-[12.5px] text-slate-500">{employee.designation} · {employee.department}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge status={employee.status} />
              <Badge tone="navy">{employee.code}</Badge>
              <Badge tone="teal">{outlet?.short}</Badge>
              <Badge tone="blue">{employee.shift} shift</Badge>
              {role && <Badge tone="violet">{role.name}</Badge>}
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-[11px] text-slate-500">Tenure</p>
            <p className="text-[15px] font-semibold">{tenure.toFixed(1)} yrs</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-600">
          <span className="flex items-center gap-1"><Phone className="size-3.5 text-slate-400" />{employee.phone}</span>
          <span className="flex items-center gap-1"><Mail className="size-3.5 text-slate-400" />{employee.email}</span>
        </div>
      </div>

      <Tabs<DrawerTab> className="mb-4" value={tab} onChange={setTab} items={[
        { value: 'overview', label: 'Overview', icon: <IdCard className="size-3.5" /> },
        { value: 'attendance', label: 'Attendance', icon: <CalendarCheck2 className="size-3.5" /> },
        { value: 'salary', label: 'Salary', icon: <Wallet className="size-3.5" /> },
        { value: 'documents', label: 'Documents', icon: <FileText className="size-3.5" /> },
      ]} />

      {tab === 'overview' && (
        <div className="space-y-4">
          <Section title="Personal information">
            <KeyValue cols={2} items={[['Full name', employee.name], ['Gender', employee.gender === 'M' ? 'Male' : 'Female'], ['Date of birth', fmtDate(employee.dob)], ['Address', employee.address]]} />
          </Section>
          <Section title="Contact">
            <KeyValue cols={2} items={[['Mobile', employee.phone], ['Email', employee.email], ['Login account', user ? `${user.email} (${user.status})` : 'Not linked'], ['Staff app PIN', user ? '••••' : '—']]} />
          </Section>
          <Section title="Employment">
            <KeyValue cols={2} items={[['Designation', employee.designation], ['Department', employee.department], ['Outlet', outlet?.name], ['Joining date', fmtDate(employee.joinDate)], ['Shift', `${employee.shift} · ${SHIFT_LABEL[employee.shift]}`], ['Role', role?.name ?? '—']]} />
          </Section>
          <Section title="Bank & statutory">
            <KeyValue cols={2} items={[['Bank account', employee.bank], ['PAN', employee.pan.slice(0, 2) + '•••••' + employee.pan.slice(-3)], ['PF', employee.salary.pf ? 'Enrolled (12%)' : 'Not applicable'], ['ESI', employee.salary.esi ? 'Enrolled (0.75%)' : 'Not applicable']]} />
          </Section>
        </div>
      )}
      {tab === 'attendance' && <AttendanceTab employee={employee} />}
      {tab === 'salary' && <SalaryTab employee={employee} />}
      {tab === 'documents' && <DocumentsTab employee={employee} />}
    </Drawer>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-slate-200 p-4">
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
    {children}
  </div>
)

function AttendanceTab({ employee }: { employee: Employee }) {
  const attendance = useStore((s) => s.attendance)
  const ym = isoDate().slice(0, 7)
  const recs = useMemo(() => attendance.filter((a) => a.employeeId === employee.id && a.date.startsWith(ym)), [attendance, employee.id, ym])
  const s = summarize(recs)
  const recent = [...recs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {(['Present', 'Late', 'Half Day', 'Absent', 'Leave', 'Weekly Off'] as const).map((k) => (
          <div key={k} className="rounded-xl border border-slate-200 p-2.5 text-center">
            <p className="text-[18px] font-semibold tabular" style={{ color: k === 'Weekly Off' ? '#64748b' : ATT_COLOR[k].hex }}>{s[k]}</p>
            <p className="text-[10.5px] text-slate-500">{k}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] font-semibold">{monthLabel(ym)}</p>
          <span className="text-[12px] text-slate-500">Attendance <b className="text-brand-700">{s.pct.toFixed(1)}%</b> · OT {s.ot.toFixed(1)} h</span>
        </div>
        <MonthCalendar ym={ym} size="sm" statusOf={(d) => recs.find((a) => a.date === d)?.status} />
        <AttLegend className="mt-3" />
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-[12px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">In</th><th className="px-3 py-2 text-left">Out</th><th className="px-3 py-2 text-left">Hours</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
          <tbody>
            {recent.map((a) => (
              <tr key={a.id} className="border-t border-slate-100"><td className="px-3 py-1.5">{fmtDate(a.date)}</td><td className="px-3 py-1.5 tabular">{hm12(a.checkIn)}</td><td className="px-3 py-1.5 tabular">{hm12(a.checkOut)}</td><td className="px-3 py-1.5 tabular">{fmtHours(workedHours(a))}</td><td className="px-3 py-1.5"><StatusBadge status={a.status} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SalaryTab({ employee }: { employee: Employee }) {
  const attendance = useStore((s) => s.attendance)
  const runs = useStore((s) => s.payrollRuns)
  const slip = salarySlip(employee)
  const history = [1, 2, 3].map((back) => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - back, 15)
    const ym = isoDate(d).slice(0, 7)
    const ot = attendance.filter((a) => a.employeeId === employee.id && a.date.startsWith(ym)).reduce((s, a) => s + (a.ot ?? 0), 0)
    const otPay = Math.round(ot * employee.salary.otRate)
    const run = runs.find((r) => r.month === ym)
    const vary = back === 3 ? -employee.salary.incentive : 0
    return { ym, gross: slip.gross + otPay + vary, ded: slip.ded, net: slip.net + otPay + vary, otPay, status: run?.status ?? 'Paid' }
  })
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3"><p className="text-[11px] text-slate-500">Gross / month</p><p className="text-[17px] font-semibold tabular">{inr(slip.gross)}</p></Card>
        <Card className="p-3"><p className="text-[11px] text-slate-500">Deductions</p><p className="text-[17px] font-semibold text-rose-600 tabular">−{inr(slip.ded)}</p></Card>
        <Card className="p-3"><p className="text-[11px] text-slate-500">Net pay</p><p className="text-[17px] font-semibold text-emerald-600 tabular">{inr(slip.net)}</p></Card>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Earnings</p>
          {slip.earnings.map((e) => <Line key={e.label} l={e.label} v={inr(e.amount)} />)}
          <Line l="OT rate" v={`₹${employee.salary.otRate}/hour`} />
          <Line l="Gross" v={inr(slip.gross)} bold />
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-rose-600">Deductions</p>
          {slip.deductions.map((e) => <Line key={e.label} l={e.label} v={inr(e.amount)} />)}
          <Line l="Total" v={inr(slip.ded)} bold />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="border-b border-slate-100 px-4 py-2.5 text-[13px] font-semibold">Last 3 months</div>
        <table className="w-full text-[12.5px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2 text-left">Month</th><th className="px-3 py-2 text-right">Gross</th><th className="px-3 py-2 text-right">OT</th><th className="px-3 py-2 text-right">Deductions</th><th className="px-3 py-2 text-right">Net</th><th className="px-3 py-2">Status</th><th /></tr></thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.ym} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium">{monthLabel(h.ym)}</td>
                <td className="px-3 py-2 text-right tabular">{inr(h.gross)}</td>
                <td className="px-3 py-2 text-right tabular text-brand-700">{h.otPay ? inr(h.otPay) : '—'}</td>
                <td className="px-3 py-2 text-right tabular text-rose-600">−{inr(h.ded)}</td>
                <td className="px-3 py-2 text-right font-semibold tabular">{inr(h.net)}</td>
                <td className="px-3 py-2 text-center"><StatusBadge status={h.status} /></td>
                <td className="px-2 py-2 text-right"><Button size="xs" variant="ghost" onClick={() => toast.success('Payslip downloaded', `Payslip_${employee.code}_${h.ym}.pdf`)}>Slip</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
const Line = ({ l, v, bold }: { l: string; v: string; bold?: boolean }) => (
  <div className={cn('flex justify-between py-1 text-[12.5px]', bold ? 'mt-1 border-t border-dashed border-slate-200 pt-2 font-semibold text-slate-900' : 'text-slate-600')}><span>{l}</span><span className="tabular">{v}</span></div>
)

function DocumentsTab({ employee }: { employee: Employee }) {
  const docs = [
    { name: 'Aadhaar card', meta: `XXXX XXXX ${String(4000 + Number(employee.code.slice(2))).slice(-4)}`, color: 'from-orange-100 to-amber-50', verified: true },
    { name: 'PAN card', meta: employee.pan.slice(0, 2) + '•••••' + employee.pan.slice(-3), color: 'from-sky-100 to-sky-50', verified: true },
    { name: 'Offer letter', meta: `Issued ${fmtDate(employee.joinDate)}`, color: 'from-violet-100 to-violet-50', verified: true },
    { name: 'Bank proof', meta: employee.bank, color: 'from-emerald-100 to-emerald-50', verified: true },
    { name: 'Food handler certificate', meta: employee.department === 'Kitchen' ? 'FSSAI FoSTaC · valid' : 'Not required', color: 'from-rose-100 to-rose-50', verified: employee.department === 'Kitchen' },
    { name: 'Police verification', meta: 'Pending submission', color: 'from-slate-100 to-slate-50', verified: false },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {docs.map((d) => (
        <div key={d.name} className="overflow-hidden rounded-xl border border-slate-200">
          <div className={cn('flex h-24 items-center justify-center bg-gradient-to-br', d.color)}>
            <div className="w-20 rounded-md bg-white/90 p-2 shadow-sm">
              <div className="mb-1 h-1.5 w-10 rounded bg-slate-300" /><div className="mb-1 h-1 w-14 rounded bg-slate-200" /><div className="mb-1 h-1 w-12 rounded bg-slate-200" /><div className="h-1 w-8 rounded bg-slate-200" />
            </div>
          </div>
          <div className="p-2.5">
            <p className="truncate text-[12.5px] font-semibold">{d.name}</p>
            <p className="truncate text-[11px] text-slate-500">{d.meta}</p>
            <div className="mt-2 flex items-center justify-between">
              <Badge tone={d.verified ? 'green' : 'amber'}>{d.verified ? 'Verified' : 'Pending'}</Badge>
              <Button size="xs" variant="ghost" icon={<Eye className="size-3" />} onClick={() => toast.info(`Opening ${d.name}`, `${employee.name} · secure document viewer (demo)`)}>View</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
