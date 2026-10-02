import { useMemo, useState } from 'react'
import { CalendarCheck2, CalendarDays, Clock, Download, FileBarChart, Fingerprint, PlaneTakeoff, Timer, UserCheck, UserX, Users } from 'lucide-react'
import { PageHeader, StatCard, Tabs, Button, Card, Input, Select, Badge } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { usePermission, useScope } from '@/store/hooks'
import { toast } from '@/store/toast'
import { fmtDate, isoDate } from '@/lib/format'
import type { Department } from '@/types'
import { DailyRegister } from './DailyRegister'
import { CalendarTab } from './CalendarTab'
import { MethodsTab } from './MethodsTab'
import { ReportsTab } from './ReportsTab'
import { RecordFlowModal } from './RecordFlowModal'

type TabKey = 'daily' | 'calendar' | 'methods' | 'reports'
const DEPTS: Department[] = ['Service', 'Kitchen', 'Billing', 'Management', 'Stores', 'Housekeeping', 'HR & Admin', 'Accounts']

export default function Attendance() {
  const { outletIds, isAll, canSwitch } = useScope()
  const { can } = usePermission()
  const employees = useStore((s) => s.employees)
  const attendance = useStore((s) => s.attendance)
  const outlets = useStore((s) => s.outlets)
  const attCfg = useStore((s) => s.settings.attendance)
  const [tab, setTab] = useState<TabKey>('daily')
  const [date, setDate] = useState(isoDate())
  const [outlet, setOutlet] = useState('all')
  const [dept, setDept] = useState<'all' | Department>('all')
  const [record, setRecord] = useState(false)

  const emps = useMemo(() => employees.filter((e) => e.status !== 'Inactive' && outletIds.includes(e.outletId) && (outlet === 'all' || e.outletId === outlet) && (dept === 'all' || e.department === dept)), [employees, outletIds, outlet, dept])
  const empIds = useMemo(() => new Set(emps.map((e) => e.id)), [emps])
  const dayRecs = useMemo(() => attendance.filter((a) => a.date === date && empIds.has(a.employeeId)), [attendance, date, empIds])
  const monthOt = useMemo(() => attendance.filter((a) => a.date.startsWith(date.slice(0, 7)) && a.date <= date && empIds.has(a.employeeId)).reduce((s, a) => s + (a.ot ?? 0), 0), [attendance, date, empIds])

  const present = dayRecs.filter((a) => a.status === 'Present' || a.status === 'Late' || a.status === 'Half Day').length
  const late = dayRecs.filter((a) => a.status === 'Late').length
  const absent = dayRecs.filter((a) => a.status === 'Absent').length
  const leave = dayRecs.filter((a) => a.status === 'Leave').length
  const notMarked = emps.length - dayRecs.length
  const isTodaySel = date === isoDate()
  const scopeOutlets = outlets.filter((o) => outletIds.includes(o.id))

  return (
    <div className="page-enter">
      <PageHeader title="Attendance" icon={<CalendarCheck2 />}
        subtitle={`${isTodaySel ? 'Today' : fmtDate(date)} · ${emps.length} employees${isAll ? ' across ' + scopeOutlets.length + ' outlets' : ' · ' + (scopeOutlets[0]?.short ?? '')}`}
        breadcrumbs={[{ label: 'People & HR' }, { label: 'Attendance' }]}
        actions={<>
          <Button icon={<Download className="size-3.5" />} disabled={!can('attendance', 'export')} onClick={() => toast.success('Attendance exported', `attendance_${date}.xlsx downloaded`)}>Export</Button>
          <Button variant="primary" icon={<Fingerprint className="size-3.5" />} disabled={!can('attendance', 'create')} onClick={() => setRecord(true)}>Record attendance</Button>
        </>} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Employees" value={emps.length} icon={<Users />} tone="navy" sub={`${notMarked} not marked yet`} />
        <StatCard label={isTodaySel ? 'Present Today' : 'Present'} value={present} icon={<UserCheck />} tone="green" sub={emps.length ? `${Math.round((present / emps.length) * 100)}% attendance` : undefined} onClick={() => setTab('daily')} />
        <StatCard label={isTodaySel ? 'Absent Today' : 'Absent'} value={absent} icon={<UserX />} tone="red" sub="unplanned" />
        <StatCard label="Late Arrivals" value={late} icon={<Clock />} tone="amber" sub="beyond grace period" />
        <StatCard label="On Leave" value={leave} icon={<PlaneTakeoff />} tone="violet" sub="approved leave" />
        <StatCard label="Overtime (hrs)" value={monthOt.toFixed(1)} icon={<Timer />} tone="teal" sub="month to date" />
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-2 px-3 py-2.5">
        <Input type="date" value={date} max={isoDate()} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-40" />
        <Button size="sm" variant="ghost" onClick={() => setDate(isoDate())} disabled={isTodaySel}>Today</Button>
        {canSwitch && (
          <Select value={outlet} onChange={(e) => setOutlet(e.target.value)} className="w-48">
            <option value="all">All outlets in scope</option>
            {scopeOutlets.map((o) => <option key={o.id} value={o.id}>{o.short}</option>)}
          </Select>
        )}
        <Select value={dept} onChange={(e) => setDept(e.target.value as Department | 'all')} className="w-44">
          <option value="all">All departments</option>
          {DEPTS.map((d) => <option key={d}>{d}</option>)}
        </Select>
        <div className="ml-auto flex items-center gap-2 text-[12px] text-slate-500">
          <Badge tone="teal" dot>Grace {attCfg.graceMinutes} min</Badge>
          <Badge tone="blue">Wi-Fi: {attCfg.networkSSID}</Badge>
        </div>
      </Card>

      <Tabs<TabKey> className="mb-4" value={tab} onChange={setTab} items={[
        { value: 'daily', label: 'Daily register', icon: <CalendarCheck2 className="size-3.5" />, count: emps.length },
        { value: 'calendar', label: 'Calendar', icon: <CalendarDays className="size-3.5" /> },
        { value: 'methods', label: 'Attendance methods', icon: <Fingerprint className="size-3.5" /> },
        { value: 'reports', label: 'Reports', icon: <FileBarChart className="size-3.5" /> },
      ]} />

      {tab === 'daily' && <DailyRegister emps={emps} date={date} showOutlet={isAll} />}
      {tab === 'calendar' && <CalendarTab emps={emps} />}
      {tab === 'methods' && <MethodsTab emps={emps} />}
      {tab === 'reports' && <ReportsTab emps={emps} />}

      <RecordFlowModal open={record} onClose={() => setRecord(false)} emps={emps} />
    </div>
  )
}
