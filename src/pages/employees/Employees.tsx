import { useMemo, useState } from 'react'
import { Building2, CalendarCheck2, Clock, Download, LayoutGrid, List, MoreVertical, Pencil, PlaneTakeoff, ShieldCheck, UserPlus, Users, Wallet } from 'lucide-react'
import type { Department, Employee } from '@/types'
import { Avatar, Badge, Button, Card, DataTable, Dropdown, FilterBar, IconButton, MenuItemBtn, PageHeader, SearchInput, Segmented, Select, StatCard, StatusBadge, type Column } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { usePermission, useScope } from '@/store/hooks'
import { toast } from '@/store/toast'
import { fmtDate, isoDate } from '@/lib/format'
import { EmployeeDrawer, type DrawerTab } from './EmployeeDrawer'
import { DEPTS, EmployeeFormModal, QuickAssignModal, type QuickKind } from './EmployeeModals'

export default function Employees() {
  const { outletIds, isAll, canSwitch, single, allowed } = useScope()
  const { can } = usePermission()
  const employees = useStore((s) => s.employees)
  const outlets = useStore((s) => s.outlets)
  const attendance = useStore((s) => s.attendance)
  const [q, setQ] = useState('')
  const [dept, setDept] = useState<'all' | Department>('all')
  const [outlet, setOutlet] = useState('all')
  const [status, setStatus] = useState<'all' | Employee['status']>('all')
  const [view, setView] = useState<'table' | 'grid'>('table')
  const [openId, setOpenId] = useState<string | null>(null)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('overview')
  const [form, setForm] = useState<{ open: boolean; emp?: Employee }>({ open: false })
  const [quick, setQuick] = useState<{ kind: QuickKind; emp: Employee } | null>(null)

  const scoped = useMemo(() => employees.filter((e) => outletIds.includes(e.outletId)), [employees, outletIds])
  const rows = useMemo(() => scoped.filter((e) =>
    (!q || [e.name, e.code, e.designation, e.phone].some((x) => x.toLowerCase().includes(q.toLowerCase()))) &&
    (dept === 'all' || e.department === dept) && (outlet === 'all' || e.outletId === outlet) && (status === 'all' || e.status === status)), [scoped, q, dept, outlet, status])

  const today = isoDate()
  const active = scoped.filter((e) => e.status === 'Active').length
  const onLeaveIds = new Set([...scoped.filter((e) => e.status === 'On Leave').map((e) => e.id), ...attendance.filter((a) => a.date === today && a.status === 'Leave').map((a) => a.employeeId)])
  const onLeave = scoped.filter((e) => onLeaveIds.has(e.id)).length
  const cutoff = isoDate(new Date(Date.now() - 3 * 365 * 864e5))
  const newJoiners = scoped.filter((e) => e.joinDate >= cutoff).length
  const byDept = DEPTS.map((d) => ({ d, n: scoped.filter((e) => e.department === d).length })).filter((x) => x.n).sort((a, b) => b.n - a.n)
  const maxDept = Math.max(1, ...byDept.map((x) => x.n))

  const openEmp = (e: Employee, tab: DrawerTab = 'overview') => { setDrawerTab(tab); setOpenId(e.id) }
  const openEmployee = employees.find((e) => e.id === openId)
  const outletName = (id: string) => outlets.find((o) => o.id === id)?.short ?? id

  const actionsMenu = (e: Employee) => (
    <Dropdown width={200} trigger={<button className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={(ev) => ev.stopPropagation()}><MoreVertical className="size-4" /></button>}>
      {(close) => (
        <div onClick={(ev) => ev.stopPropagation()}>
          <MenuItemBtn icon={<Pencil />} onClick={() => { close(); can('employees', 'edit') ? setForm({ open: true, emp: e }) : toast.error('Permission denied', 'You cannot edit employees') }}>Edit</MenuItemBtn>
          <MenuItemBtn icon={<Building2 />} onClick={() => { close(); can('employees', 'edit') ? setQuick({ kind: 'outlet', emp: e }) : toast.error('Permission denied') }}>Assign outlet</MenuItemBtn>
          <MenuItemBtn icon={<Clock />} onClick={() => { close(); can('employees', 'edit') ? setQuick({ kind: 'shift', emp: e }) : toast.error('Permission denied') }}>Assign shift</MenuItemBtn>
          <MenuItemBtn icon={<ShieldCheck />} onClick={() => { close(); can('employees', 'edit') ? setQuick({ kind: 'role', emp: e }) : toast.error('Permission denied') }}>Change role</MenuItemBtn>
          <div className="my-1 h-px bg-slate-100" />
          <MenuItemBtn icon={<CalendarCheck2 />} onClick={() => { close(); openEmp(e, 'attendance') }}>View attendance</MenuItemBtn>
          <MenuItemBtn icon={<Wallet />} onClick={() => { close(); openEmp(e, 'salary') }}>View salary records</MenuItemBtn>
        </div>
      )}
    </Dropdown>
  )

  const columns: Column<Employee>[] = [
    { key: 'code', header: 'Employee ID', render: (e) => <span className="font-mono text-[12px] font-medium text-navy-700">{e.code}</span> },
    {
      key: 'name', header: 'Name', render: (e) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={e.name} color={e.color} size={28} />
          <div className="min-w-0"><p className="truncate font-medium text-slate-800">{e.name}</p><p className="truncate text-[11px] text-slate-500">{e.phone}</p></div>
        </div>
      ),
    },
    { key: 'designation', header: 'Designation' },
    { key: 'department', header: 'Department', render: (e) => <Badge tone="gray">{e.department}</Badge> },
    { key: 'outletId', header: 'Outlet', sortValue: (e) => outletName(e.outletId), render: (e) => <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: outlets.find((o) => o.id === e.outletId)?.color }} />{outletName(e.outletId)}</span> },
    { key: 'joinDate', header: 'Joining date', render: (e) => <span className="tabular text-slate-600">{fmtDate(e.joinDate)}</span> },
    { key: 'status', header: 'Status', render: (e) => <StatusBadge status={e.status} /> },
    {
      key: 'actions', header: '', sortable: false, align: 'right', render: (e) => (
        <div className="flex items-center justify-end gap-0.5" onClick={(ev) => ev.stopPropagation()}>
          {([
            [Pencil, 'Edit', () => setForm({ open: true, emp: e }), true],
            [Building2, 'Assign outlet', () => setQuick({ kind: 'outlet', emp: e }), true],
            [Clock, 'Assign shift', () => setQuick({ kind: 'shift', emp: e }), true],
            [ShieldCheck, 'Change role', () => setQuick({ kind: 'role', emp: e }), true],
            [CalendarCheck2, 'View attendance', () => openEmp(e, 'attendance'), false],
            [Wallet, 'View salary records', () => openEmp(e, 'salary'), false],
          ] as const).map(([I, label, fn, needsEdit]) => (
            <IconButton key={label} tooltip={label} className="size-7 disabled:opacity-30" disabled={needsEdit && !can('employees', 'edit')} onClick={fn}><I className="size-3.5" /></IconButton>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div className="page-enter">
      <PageHeader title="Employees" icon={<Users />} breadcrumbs={[{ label: 'People & HR' }, { label: 'Employees' }]}
        subtitle={`${scoped.length} employees${isAll ? ` across ${allowed.length} outlets` : ' · ' + outletName(single ?? outletIds[0])}`}
        actions={<>
          <Button icon={<Download className="size-3.5" />} disabled={!can('employees', 'export')} onClick={() => toast.success('Employee directory exported', `employees_${today}.xlsx`)}>Export</Button>
          <Button variant="primary" icon={<UserPlus className="size-3.5" />} disabled={!can('employees', 'create')} onClick={() => setForm({ open: true })}>Add employee</Button>
        </>} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Headcount" value={scoped.length} icon={<Users />} tone="navy" sub={`${active} active`} />
        <div className="row-span-1 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-card">
          <p className="text-[11.5px] font-medium text-slate-500">By department</p>
          <div className="mt-2 space-y-1">
            {byDept.slice(0, 4).map((x) => (
              <button key={x.d} onClick={() => setDept(x.d)} className="flex w-full items-center gap-2 text-[11px] hover:opacity-80">
                <span className="w-20 truncate text-left text-slate-600">{x.d}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-brand-500" style={{ width: `${(x.n / maxDept) * 100}%` }} /></span>
                <span className="w-4 text-right font-semibold tabular">{x.n}</span>
              </button>
            ))}
          </div>
        </div>
        <StatCard label="New joiners" value={newJoiners} icon={<UserPlus />} tone="teal" sub="last 3 years" />
        <StatCard label="On leave" value={onLeave} icon={<PlaneTakeoff />} tone="violet" sub="today" onClick={() => setStatus('On Leave')} />
      </div>

      <Card>
        <FilterBar>
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Search name, ID, designation, phone…" className="w-72" />
          <Select value={dept} onChange={(e) => setDept(e.target.value as Department | 'all')} className="w-40">
            <option value="all">All departments</option>{DEPTS.map((d) => <option key={d}>{d}</option>)}
          </Select>
          {canSwitch && (
            <Select value={outlet} onChange={(e) => setOutlet(e.target.value)} className="w-40">
              <option value="all">All outlets</option>{outlets.filter((o) => outletIds.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{o.short}</option>)}
            </Select>
          )}
          <Select value={status} onChange={(e) => setStatus(e.target.value as Employee['status'] | 'all')} className="w-32">
            <option value="all">All status</option><option>Active</option><option>On Leave</option><option>Inactive</option>
          </Select>
          {(q || dept !== 'all' || outlet !== 'all' || status !== 'all') && <Button size="sm" variant="ghost" onClick={() => { setQ(''); setDept('all'); setOutlet('all'); setStatus('all') }}>Clear</Button>}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[12px] text-slate-500">{rows.length} shown</span>
            <Segmented size="sm" value={view} onChange={setView} items={[{ value: 'table', label: '', icon: <List className="size-3.5" /> }, { value: 'grid', label: '', icon: <LayoutGrid className="size-3.5" /> }]} />
          </div>
        </FilterBar>
        {view === 'table' ? (
          <DataTable columns={columns} rows={rows} onRowClick={(e) => openEmp(e)} pageSize={12} />
        ) : (
          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((e) => (
              <div key={e.id} onClick={() => openEmp(e)} className="group cursor-pointer rounded-xl border border-slate-200 p-3.5 transition hover:border-brand-200 hover:shadow-md">
                <div className="flex items-start justify-between">
                  <Avatar name={e.name} color={e.color} size={42} />
                  <div onClick={(ev) => ev.stopPropagation()}>{actionsMenu(e)}</div>
                </div>
                <p className="mt-2.5 truncate text-[13.5px] font-semibold text-slate-900">{e.name}</p>
                <p className="truncate text-[12px] text-slate-500">{e.designation}</p>
                <div className="mt-2 flex flex-wrap gap-1"><Badge tone="navy">{e.code}</Badge><Badge>{e.department}</Badge><StatusBadge status={e.status} /></div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11.5px] text-slate-500">
                  <span className="flex items-center gap-1"><Building2 className="size-3" />{outletName(e.outletId)}</span>
                  <span className="flex items-center gap-1"><Clock className="size-3" />{e.shift}</span>
                </div>
              </div>
            ))}
            {rows.length === 0 && <p className="col-span-full py-10 text-center text-[13px] text-slate-500">No employees match the filters.</p>}
          </div>
        )}
      </Card>

      {openEmployee && (
        <EmployeeDrawer employee={openEmployee} tab={drawerTab} setTab={setDrawerTab} onClose={() => setOpenId(null)}
          onEdit={() => setForm({ open: true, emp: openEmployee })} onQuick={(kind) => setQuick({ kind, emp: openEmployee })} />
      )}
      {form.open && <EmployeeFormModal open onClose={() => setForm({ open: false })} employee={form.emp} defaultOutlet={single ?? outletIds[0]} />}
      {quick && <QuickAssignModal kind={quick.kind} employee={employees.find((e) => e.id === quick.emp.id) ?? quick.emp} onClose={() => setQuick(null)} />}
    </div>
  )
}
