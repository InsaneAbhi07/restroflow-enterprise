import React, { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, Info, List, ScrollText, ShieldAlert, Rows3, XCircle } from 'lucide-react'
import { Avatar, Badge, Button, Card, DataTable, FilterBar, PageHeader, SearchInput, Segmented, Select, StatCard, type Column, type Tone } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { usePermission, useScope } from '@/store/hooks'
import { toast } from '@/store/toast'
import { cn, fmtDate, fmtDateTime, fmtTime, timeAgo } from '@/lib/format'
import { MODULES } from '@/data/people'
import type { Activity, ModuleKey } from '@/types'

type AType = NonNullable<Activity['type']>
const TYPE_TONE: Record<AType, Tone> = { info: 'blue', success: 'green', warning: 'amber', danger: 'red' }
const TYPE_LABEL: Record<AType, string> = { info: 'Info', success: 'Success', warning: 'Warning', danger: 'Critical' }
const TYPE_ICON: Record<AType, React.ReactNode> = { info: <Info className="size-3.5" />, success: <CheckCircle2 className="size-3.5" />, warning: <AlertTriangle className="size-3.5" />, danger: <XCircle className="size-3.5" /> }
const modLabel = (m: ModuleKey) => MODULES.find((x) => x.key === m)?.label ?? m

/** Deterministic older audit trail so the log looks lived-in */
const SYNTH: [string, string, ModuleKey, string | undefined, AType][] = [
  ['Abhishek Singh', 'Signed in from Chrome · Windows (103.21.x.x)', 'users', undefined, 'info'],
  ['Neha Gupta', 'Applied 10% discount on bill B4131 (Manager PIN)', 'pos', 'o1', 'warning'],
  ['Amit Verma', 'Approved discount request for table T4', 'pos', 'o1', 'success'],
  ['Priya Sharma', 'Received GRN/912 against PO-1197 · 14 items', 'purchase', 'o1', 'success'],
  ['Vikram Singh', 'Updated recipe Butter Chicken (yield 4 portions)', 'recipes', 'o1', 'info'],
  ['Kavita Joshi', 'Cancelled KOT item Masala Papad (customer request)', 'kot', 'o2', 'warning'],
  ['Sanjay Malhotra', 'Day-end closing completed · ₹1,84,220', 'settlement', 'o2', 'success'],
  ['Rahul Sharma', 'Approved stock transfer TRF-0412 (City Center → Mall)', 'transfer', 'o2', 'success'],
  ['Anjali Verma', 'Added employee Ritu Saxena (Waiter)', 'employees', 'o2', 'info'],
  ['Karan Mehta', 'Exported GST sales report (GSTR-1) for last month', 'reports', undefined, 'info'],
  ['Pooja Arora', 'Marked table M5 out of service', 'tables', 'o3', 'warning'],
  ['Manish Tiwari', 'Failed login attempt (wrong PIN ×3)', 'users', 'o3', 'danger'],
  ['Gurpreet Singh', 'Changed menu price Amritsari Kulcha ₹180 → ₹200', 'menu', 'o4', 'warning'],
  ['Harpreet Kaur', 'Resettled bill B4022 Cash → UPI (approved by Gurpreet Singh)', 'settlement', 'o4', 'warning'],
  ['Abhishek Singh', 'Updated GST settings · service charge 5%', 'settings', undefined, 'info'],
  ['Priya Sharma', 'Stock adjustment: Paneer −2.5 kg (wastage)', 'inventory', 'o4', 'danger'],
  ['Anjali Verma', 'Corrected attendance for Ajay Chauhan (Absent → Present)', 'attendance', 'o4', 'warning'],
  ['Karan Mehta', 'Approved payroll for previous month', 'payroll', undefined, 'success'],
  ['Abhishek Singh', 'Created outlet Highway Outlet (Murthal)', 'outlets', 'o4', 'success'],
  ['Rahul Sharma', 'Deleted draft purchase order PO-1188', 'purchase', 'o3', 'danger'],
  ['Neha Gupta', 'Reprinted bill B4119 (duplicate)', 'pos', 'o1', 'info'],
  ['Arjun Nair', 'Placed waiter app order for table C3', 'pos', 'o2', 'info'],
  ['Amit Verma', 'Added customer Meera Iyer to CRM', 'customers', 'o1', 'info'],
  ['Abhishek Singh', 'Disabled QR ordering at Highway Outlet (maintenance)', 'qr', 'o4', 'warning'],
]
function synthetic(): Activity[] {
  const base = Date.now() - 5 * 36e5
  return SYNTH.flatMap(([user, text, module, outletId, type], i) => [
    { id: 'syn' + i, at: base - i * 2.7 * 36e5, user, text, module, outletId, type },
    { id: 'syn2' + i, at: base - (i + SYNTH.length) * 3.1 * 36e5, user, text, module, outletId, type },
  ])
}
const SYN = synthetic()

export default function Audit() {
  const activity = useStore((s) => s.activity)
  const users = useStore((s) => s.users)
  const outlets = useStore((s) => s.outlets)
  const { outletIds, isAll } = useScope()
  const { can } = usePermission()
  const [q, setQ] = useState('')
  const [mod, setMod] = useState('all')
  const [user, setUser] = useState('all')
  const [outlet, setOutlet] = useState('all')
  const [type, setType] = useState('all')
  const [view, setView] = useState<'table' | 'timeline'>('table')

  const all = useMemo(() => [...activity, ...SYN].filter((a) => !a.outletId || outletIds.includes(a.outletId)).sort((a, b) => b.at - a.at), [activity, outletIds])
  const rows = useMemo(() => all.filter((a) =>
    (mod === 'all' || a.module === mod) && (user === 'all' || a.user === user) && (outlet === 'all' || a.outletId === outlet) && (type === 'all' || (a.type ?? 'info') === type) &&
    (!q || (a.text + a.user).toLowerCase().includes(q.toLowerCase())),
  ), [all, mod, user, outlet, type, q])
  const actors = Array.from(new Set(all.map((a) => a.user))).sort()
  const colorOf = (name: string) => users.find((u) => u.name === name)?.color ?? '#64748b'
  const outletOf = (id?: string) => outlets.find((o) => o.id === id)
  const today = all.filter((a) => fmtDate(a.at) === fmtDate(Date.now())).length

  const columns: Column<Activity>[] = [
    { key: 'at', header: 'Time', sortValue: (a) => a.at, width: 150, render: (a) => <div><p className="text-slate-800">{fmtDateTime(a.at)}</p><p className="text-[11px] text-slate-400">{timeAgo(a.at)}</p></div> },
    { key: 'user', header: 'User', render: (a) => <span className="flex items-center gap-2"><Avatar name={a.user} color={colorOf(a.user)} size={24} /><span className="whitespace-nowrap font-medium text-slate-800">{a.user}</span></span> },
    { key: 'text', header: 'Activity', render: (a) => <span className="text-slate-700">{a.text}</span> },
    { key: 'module', header: 'Module', sortValue: (a) => modLabel(a.module), render: (a) => <Badge tone="gray">{modLabel(a.module)}</Badge> },
    ...(isAll ? [{ key: 'outlet', header: 'Outlet', sortValue: (a: Activity) => a.outletId ?? '', render: (a: Activity) => { const o = outletOf(a.outletId); return o ? <span className="inline-flex items-center gap-1 whitespace-nowrap text-[12px]"><span className="size-1.5 rounded-full" style={{ background: o.color }} />{o.short}</span> : <span className="text-[12px] text-slate-400">Organization</span> } }] : []),
    { key: 'type', header: 'Type', sortValue: (a) => a.type ?? 'info', render: (a) => { const t = a.type ?? 'info'; return <Badge tone={TYPE_TONE[t]} dot>{TYPE_LABEL[t]}</Badge> } },
  ]

  // timeline grouped by day
  const days = useMemo(() => {
    const m = new Map<string, Activity[]>()
    rows.slice(0, 80).forEach((a) => { const k = fmtDate(a.at); m.set(k, [...(m.get(k) ?? []), a]) })
    return Array.from(m.entries())
  }, [rows])

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Tamper-evident trail of every sensitive action across outlets" breadcrumbs={[{ label: 'Insights' }, { label: 'Audit Logs' }]}
        actions={<>
          <Segmented size="sm" value={view} onChange={setView} items={[{ value: 'table', label: 'Table', icon: <Rows3 className="size-3" /> }, { value: 'timeline', label: 'Timeline', icon: <List className="size-3" /> }]} />
          <Button icon={<Download className="size-3.5" />} disabled={!can('audit', 'export')} onClick={() => toast.success('Audit log exported', `${rows.length} entries · audit_log.csv (simulated)`)}>Export</Button>
        </>} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total events" value={all.length} icon={<ScrollText />} tone="navy" sub="last 7 days" />
        <StatCard label="Today" value={today} icon={<Info />} tone="blue" sub="events logged" />
        <StatCard label="Warnings" value={all.filter((a) => a.type === 'warning').length} icon={<AlertTriangle />} tone="amber" sub="discounts, resettlements, edits" />
        <StatCard label="Critical" value={all.filter((a) => a.type === 'danger').length} icon={<ShieldAlert />} tone="red" sub="deletions, failed logins" />
      </div>

      <Card>
        <FilterBar>
          <SearchInput className="w-full sm:w-60" placeholder="Search activity…" value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} />
          <Select className="w-44" value={mod} onChange={(e) => setMod(e.target.value)}><option value="all">All modules</option>{MODULES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</Select>
          <Select className="w-40" value={user} onChange={(e) => setUser(e.target.value)}><option value="all">All users</option>{actors.map((u) => <option key={u}>{u}</option>)}</Select>
          {isAll && <Select className="w-36" value={outlet} onChange={(e) => setOutlet(e.target.value)}><option value="all">All outlets</option>{outlets.filter((o) => outletIds.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{o.short}</option>)}</Select>}
          <Select className="w-32" value={type} onChange={(e) => setType(e.target.value)}><option value="all">All types</option>{(Object.keys(TYPE_LABEL) as AType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</Select>
          <span className="ml-auto text-[12px] text-slate-500">{rows.length} entries</span>
        </FilterBar>
        {view === 'table' ? <DataTable columns={columns} rows={rows} pageSize={15} /> : (
          <div className="px-4 py-3">
            {days.length === 0 && <p className="py-10 text-center text-[13px] text-slate-500">No entries match the filters.</p>}
            {days.map(([day, items]) => (
              <div key={day} className="mb-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{day}</p>
                <div className="relative ml-3 border-l border-slate-200 pl-5">
                  {items.map((a) => {
                    const t = a.type ?? 'info'
                    const o = outletOf(a.outletId)
                    return (
                      <div key={a.id} className="relative pb-3">
                        <span className={cn('absolute -left-[31px] top-0.5 flex size-5 items-center justify-center rounded-full ring-4 ring-white [&>svg]:size-3', {
                          'bg-sky-100 text-sky-600': t === 'info', 'bg-emerald-100 text-emerald-600': t === 'success', 'bg-amber-100 text-amber-600': t === 'warning', 'bg-rose-100 text-rose-600': t === 'danger',
                        })}>{TYPE_ICON[t]}</span>
                        <p className="text-[12.5px] text-slate-800"><b className="font-semibold">{a.user}</b> · {a.text}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                          {fmtTime(a.at)} · <Badge tone="gray" className="!py-0">{modLabel(a.module)}</Badge>
                          {o && <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full" style={{ background: o.color }} />{o.short}</span>}
                          <Badge tone={TYPE_TONE[t]} className="!py-0">{TYPE_LABEL[t]}</Badge>
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
