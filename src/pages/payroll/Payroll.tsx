import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BadgeIndianRupee, Banknote, Calculator, CheckCircle2, Clock, Download, FileText, MinusCircle, Settings2, Timer, Users, Wallet } from 'lucide-react'
import {
  Avatar, Badge, Button, CHART, Card, CardHeader, DataTable, FilterBar, IconButton, PageHeader, SearchInput, Select, StatCard, StatusBadge, Stepper, tooltipStyle, type Column,
} from '@/components/ui'
import { PrintPreviewModal } from '@/components/print/Print'
import { useStore } from '@/store/useStore'
import { useCurrentUser, usePermission, useScope } from '@/store/hooks'
import { toast } from '@/store/toast'
import { fmtDateTime, inr, inrShort, isoDate, monthLabel } from '@/lib/format'
import type { PayrollRun } from '@/types'
import { computeRow, currentMonth, monthOptions, runFor, type PayRow } from './calc'
import { ProcessWizard, SalaryDrawer } from './PayrollDialogs'
import { SalarySlip } from './SalarySlip'

const RUN_STEPS: PayrollRun['status'][] = ['Not Started', 'Draft', 'Processed', 'Approved', 'Paid']

export default function Payroll() {
  const employees = useStore((s) => s.employees)
  const attendance = useStore((s) => s.attendance)
  const settings = useStore((s) => s.settings)
  const runs = useStore((s) => s.payrollRuns)
  const outlets = useStore((s) => s.outlets)
  const setPayrollRun = useStore((s) => s.setPayrollRun)
  const log = useStore((s) => s.log)
  const me = useCurrentUser()
  const { can } = usePermission()
  const { outletIds, isAll } = useScope()
  const [month, setMonth] = useState(currentMonth())
  const [outlet, setOutlet] = useState('all')
  const [dept, setDept] = useState('all')
  const [q, setQ] = useState('')
  const [wizard, setWizard] = useState(false)
  const [cfgRow, setCfgRow] = useState<PayRow | null>(null)
  const [slip, setSlip] = useState<PayRow | null>(null)

  const run = runFor(runs, month)
  const idx = RUN_STEPS.indexOf(run.status)

  const all = useMemo(() => employees.filter((e) => e.status !== 'Inactive' && outletIds.includes(e.outletId)).map((e) => computeRow(e, month, attendance, settings, run.status)),
    [employees, outletIds, month, attendance, settings, run.status])
  const rows = useMemo(() => all.filter((r) => (outlet === 'all' || r.emp.outletId === outlet) && (dept === 'all' || r.emp.department === dept) && (!q || (r.emp.name + r.emp.code).toLowerCase().includes(q.toLowerCase()))), [all, outlet, dept, q])
  const depts = Array.from(new Set(all.map((r) => r.emp.department)))

  const sum = (k: keyof Pick<PayRow, 'gross' | 'net' | 'deductions' | 'advance' | 'overtime'>) => rows.reduce((s, r) => s + r[k], 0)
  const processed = idx >= 2
  const byOutlet = outlets.filter((o) => outletIds.includes(o.id)).map((o) => ({ name: o.short, value: rows.filter((r) => r.emp.outletId === o.id).reduce((s, r) => s + r.net, 0), color: o.color })).filter((x) => x.value > 0)
  const byDept = depts.map((d) => ({ name: d, value: rows.filter((r) => r.emp.department === d).reduce((s, r) => s + r.net, 0) })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value)

  const approve = () => {
    setPayrollRun(month, { status: 'Approved', approvedBy: me.name })
    log(`Payroll approved for ${monthLabel(month)} by ${me.name}`, 'payroll', 'success')
    toast.success('Payroll approved', `${monthLabel(month)} · ${inr(sum('net'))} ready for disbursal`)
  }
  const markPaid = () => {
    setPayrollRun(month, { status: 'Paid', paidOn: isoDate() })
    log(`Salaries disbursed for ${monthLabel(month)} · ${inr(sum('net'))}`, 'payroll', 'success')
    toast.success('Marked as paid', 'Salary credit advice generated (simulated NEFT batch)')
  }

  const columns: Column<PayRow>[] = [
    {
      key: 'emp', header: 'Employee', sortValue: (r) => r.emp.name,
      render: (r) => (
        <div className="flex items-center gap-2">
          <Avatar name={r.emp.name} color={r.emp.color} size={26} />
          <div className="min-w-0"><p className="truncate font-medium text-slate-900">{r.emp.name}</p><p className="truncate text-[11px] text-slate-500">{r.emp.code} · {r.emp.designation}</p></div>
        </div>
      ),
    },
    ...(isAll ? [{ key: 'outlet', header: 'Outlet', sortValue: (r: PayRow) => r.emp.outletId, render: (r: PayRow) => { const o = outlets.find((x) => x.id === r.emp.outletId); return <span className="inline-flex items-center gap-1 text-[12px]"><span className="size-1.5 rounded-full" style={{ background: o?.color }} />{o?.short}</span> } }] : []),
    { key: 'basic', header: 'Basic', align: 'right', render: (r) => inr(r.basic) },
    { key: 'payable', header: 'Payable days', align: 'right', sortValue: (r) => r.att.payable, render: (r) => <span title={`${r.att.recorded} recorded · ${r.att.projected} projected`}>{r.att.payable}<span className="text-slate-400">/{r.att.dim}</span></span> },
    { key: 'allowances', header: 'Allowances', align: 'right', render: (r) => inr(r.allowances) },
    { key: 'overtime', header: 'Overtime', align: 'right', render: (r) => r.overtime ? <span title={`${r.att.otHours} hrs × ₹${r.emp.salary.otRate}`}>{inr(r.overtime)}</span> : <span className="text-slate-300">—</span> },
    { key: 'deductions', header: 'Deductions', align: 'right', render: (r) => <span className="text-rose-600">{inr(r.deductions)}</span> },
    { key: 'advance', header: 'Advance', align: 'right', render: (r) => r.advance ? <span className="text-amber-600">{inr(r.advance)}</span> : <span className="text-slate-300">—</span> },
    { key: 'net', header: 'Net salary', align: 'right', render: (r) => <span className="font-semibold text-slate-900">{inr(r.net)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'act', header: '', sortable: false, align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          <IconButton tooltip="Salary slip" onClick={() => setSlip(r)}><FileText className="size-3.5" /></IconButton>
          <IconButton tooltip="Salary configuration" onClick={() => setCfgRow(r)}><Settings2 className="size-3.5" /></IconButton>
        </div>
      ),
    },
  ]

  const totalRow = (
    <tr className="border-t-2 border-slate-200 bg-slate-50 text-[12.5px] font-semibold text-slate-800">
      <td className="px-3 py-2" colSpan={isAll ? 2 : 1}>Total · {rows.length} employees</td>
      <td className="px-3 text-right">{inr(rows.reduce((s, r) => s + r.basic, 0))}</td><td />
      <td className="px-3 text-right">{inr(rows.reduce((s, r) => s + r.allowances, 0))}</td>
      <td className="px-3 text-right">{inr(sum('overtime'))}</td>
      <td className="px-3 text-right text-rose-600">{inr(sum('deductions'))}</td>
      <td className="px-3 text-right text-amber-600">{inr(sum('advance'))}</td>
      <td className="px-3 text-right">{inr(sum('net'))}</td><td colSpan={2} />
    </tr>
  )

  return (
    <div>
      <PageHeader title="Payroll" subtitle="Attendance-linked salary processing with approvals and printable salary slips" breadcrumbs={[{ label: 'People & HR' }, { label: 'Payroll' }]}
        actions={<>
          <Select className="w-44" value={month} onChange={(e) => setMonth(e.target.value)}>
            {monthOptions().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </Select>
          {can('payroll', 'export') && <Button icon={<Download className="size-3.5" />} onClick={() => toast.success('Payroll register exported', `${monthLabel(month)} · payroll_${month}.xlsx (simulated)`)}>Export</Button>}
        </>} />

      {/* Run status */}
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-slate-900">{monthLabel(month)} payroll run</h3>
              <StatusBadge status={run.status} />
            </div>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {run.status === 'Not Started' && 'Not processed yet — figures below are provisional and update live with attendance.'}
              {run.status === 'Draft' && `Draft saved ${run.processedAt ? fmtDateTime(run.processedAt) : ''} · process to send for approval.`}
              {run.status === 'Processed' && `Processed ${run.processedAt ? fmtDateTime(run.processedAt) : ''} · awaiting Accountant approval.`}
              {run.status === 'Approved' && `Approved by ${run.approvedBy} · ready for disbursal on day ${settings.payroll.payDay}.`}
              {run.status === 'Paid' && `Paid on ${run.paidOn} · approved by ${run.approvedBy ?? '—'}.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {idx <= 1 && <Button variant="primary" icon={<Calculator className="size-3.5" />} disabled={!can('payroll', 'create') && !can('payroll', 'edit')} onClick={() => setWizard(true)}>Process payroll</Button>}
            {run.status === 'Processed' && <>
              {can('payroll', 'edit') && <Button onClick={() => setWizard(true)}>Re-process</Button>}
              <Button variant="success" icon={<CheckCircle2 className="size-3.5" />} disabled={!can('payroll', 'approve')} title={!can('payroll', 'approve') ? 'Requires payroll approve permission (Accountant)' : ''} onClick={approve}>Approve</Button>
            </>}
            {run.status === 'Approved' && <Button variant="accent" icon={<Banknote className="size-3.5" />} disabled={!can('payroll', 'approve') && !can('payroll', 'edit')} onClick={markPaid}>Mark paid</Button>}
            {run.status === 'Paid' && <Button icon={<Download className="size-3.5" />} onClick={() => toast.success('Bank advice downloaded', `NEFT_${month}.txt (simulated)`)}>Bank advice</Button>}
          </div>
        </div>
        <Stepper className="mt-4" steps={RUN_STEPS} current={run.status === 'Paid' ? RUN_STEPS.length : idx} />
        {run.status === 'Processed' && !can('payroll', 'approve') && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">Approval requires the <b>Accountant</b> role (payroll → approve). Switch user to Karan Mehta to approve.</p>
        )}
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total monthly payroll" value={inrShort(sum('gross'))} icon={<BadgeIndianRupee />} tone="navy" sub="gross earnings" />
        <StatCard label="Employees processed" value={`${processed ? rows.length : 0}/${rows.length}`} icon={<Users />} tone="teal" sub={processed ? 'all processed' : 'pending run'} />
        <StatCard label="Pending payroll" value={inrShort(run.status === 'Paid' ? 0 : sum('net'))} icon={<Clock />} tone="amber" sub={run.status === 'Paid' ? 'nothing pending' : 'to be disbursed'} />
        <StatCard label="Total deductions" value={inrShort(sum('deductions') + sum('advance'))} icon={<MinusCircle />} tone="red" sub="PF, ESI, loans, advances" />
        <StatCard label="Overtime amount" value={inrShort(sum('overtime'))} icon={<Timer />} tone="violet" sub={`${Math.round(rows.reduce((s, r) => s + r.att.otHours, 0))} OT hrs`} />
        <StatCard label="Net salary" value={inrShort(sum('net'))} icon={<Wallet />} tone="green" sub="take-home" />
      </div>

      <Card className="mb-4">
        <FilterBar>
          <SearchInput className="w-full sm:w-56" placeholder="Search employee…" value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} />
          {isAll && (
            <Select className="w-40" value={outlet} onChange={(e) => setOutlet(e.target.value)}>
              <option value="all">All outlets</option>{outlets.filter((o) => outletIds.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{o.short}</option>)}
            </Select>
          )}
          <Select className="w-40" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="all">All departments</option>{depts.map((d) => <option key={d}>{d}</option>)}
          </Select>
          <span className="ml-auto flex items-center gap-1.5 text-[11.5px] text-slate-500">
            <Badge tone="teal">Live</Badge> Pro-rated by payable days · attendance changes update instantly
          </span>
        </FilterBar>
        <DataTable columns={columns} rows={rows} onRowClick={setCfgRow} pageSize={15} footer={totalRow} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Payroll by outlet" subtitle="Net salary" />
          <div className="h-60 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byOutlet}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="name" tick={CHART.axis} axisLine={false} tickLine={false} />
                <YAxis tick={CHART.axis} axisLine={false} tickLine={false} tickFormatter={(v) => inrShort(v)} width={56} />
                <Tooltip {...tooltipStyle} formatter={(v) => inr(Number(v))} />
                <Bar dataKey="value" name="Net salary" radius={[5, 5, 0, 0]} maxBarSize={56}>
                  {byOutlet.map((o) => <Cell key={o.name} fill={o.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Payroll by department" subtitle="Net salary" />
          <div className="h-60 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDept} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" tick={CHART.axis} axisLine={false} tickLine={false} tickFormatter={(v) => inrShort(v)} />
                <YAxis type="category" dataKey="name" tick={CHART.axis} axisLine={false} tickLine={false} width={92} />
                <Tooltip {...tooltipStyle} formatter={(v) => inr(Number(v))} />
                <Bar dataKey="value" name="Net salary" radius={[0, 5, 5, 0]} maxBarSize={18}>
                  {byDept.map((d, i) => <Cell key={d.name} fill={CHART.series[i % CHART.series.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <ProcessWizard open={wizard} onClose={() => setWizard(false)} month={month} outletIds={outletIds} />
      <SalaryDrawer row={cfgRow} month={month} onClose={() => setCfgRow(null)} canEdit={can('payroll', 'edit')} onSlip={(r) => setSlip(r)} />
      <PrintPreviewModal open={!!slip} onClose={() => setSlip(null)} paper="a4" title="Salary slip" subtitle={slip ? `${slip.emp.name} · ${monthLabel(month)}` : ''}
        actions={<Button icon={<FileText className="size-3.5" />} onClick={() => toast.success('Salary slip emailed', `${slip?.emp.email} (simulated)`)}>Email</Button>}>
        {slip && <SalarySlip row={all.find((r) => r.id === slip.id) ?? slip} month={month} run={run} />}
      </PrintPreviewModal>
    </div>
  )
}
