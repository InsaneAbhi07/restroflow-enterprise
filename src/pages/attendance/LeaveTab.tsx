import { useMemo, useState } from 'react'
import { CalendarPlus, CheckCircle2, Clock3, Pencil, Plus, PlaneTakeoff, Ban, Wallet, Eye, Smartphone, Monitor } from 'lucide-react'
import { Card, CardHeader, Button, Badge, StatusBadge, Avatar, DataTable, Segmented, Select, SearchInput, Toggle, StatCard, IconButton, DOT, ConfirmDialog, type Column } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { cn, fmtDate, isoDate, timeAgo } from '@/lib/format'
import type { Employee } from '@/types'
import { useLeave, balanceOf, type LeaveRequest, type LeaveType } from './leaveStore'
import { ApplyLeaveModal, DecideLeaveModal, LeaveTypeModal } from './LeaveForms'

type View = 'requests' | 'balances' | 'types'

export function LeaveTab({ emps, showOutlet }: { emps: Employee[]; showOutlet: boolean }) {
  const { can } = usePermission()
  const outlets = useStore((s) => s.outlets)
  const types = useLeave((s) => s.types)
  const requests = useLeave((s) => s.requests)
  const opening = useLeave((s) => s.opening)
  const upsertType = useLeave((s) => s.upsertType)
  const cancel = useLeave((s) => s.cancel)
  const [view, setView] = useState<View>('requests')
  const [status, setStatus] = useState<'all' | LeaveRequest['status']>('Pending')
  const [typeFilter, setTypeFilter] = useState('all')
  const [q, setQ] = useState('')
  const [applyFor, setApplyFor] = useState<string | undefined | null>(null) // null = closed
  const [deciding, setDeciding] = useState<LeaveRequest | null>(null)
  const [editType, setEditType] = useState<LeaveType | null | undefined>(undefined) // undefined = closed, null = new
  const [cancelling, setCancelling] = useState<LeaveRequest | null>(null)

  const empMap = useMemo(() => new Map(emps.map((e) => [e.id, e])), [emps])
  const typeMap = useMemo(() => new Map(types.map((t) => [t.id, t])), [types])
  const scoped = useMemo(() => requests.filter((r) => empMap.has(r.employeeId)), [requests, empMap])
  const today = isoDate()
  const month = today.slice(0, 7)

  const pending = scoped.filter((r) => r.status === 'Pending')
  const onLeaveToday = scoped.filter((r) => r.status === 'Approved' && r.from <= today && r.to >= today)
  const approvedMonth = scoped.filter((r) => r.status === 'Approved' && (r.from.startsWith(month) || r.to.startsWith(month))).reduce((s, r) => s + r.days, 0)
  const lwp = scoped.filter((r) => r.status === 'Approved' && typeMap.get(r.typeId)?.paid === false).reduce((s, r) => s + r.days, 0)
  const upcoming = scoped.filter((r) => r.status === 'Approved' && r.from > today).sort((a, b) => a.from.localeCompare(b.from)).slice(0, 5)

  const rows = scoped
    .filter((r) => (status === 'all' || r.status === status) && (typeFilter === 'all' || r.typeId === typeFilter))
    .filter((r) => !q || empMap.get(r.employeeId)?.name.toLowerCase().includes(q.toLowerCase()) || r.reason.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.appliedAt - a.appliedAt)

  const canApprove = can('attendance', 'approve')
  const canCreate = can('attendance', 'create')
  const canEditTypes = can('attendance', 'edit')

  const reqCols: Column<LeaveRequest>[] = [
    { key: 'emp', header: 'Employee', sortValue: (r) => empMap.get(r.employeeId)?.name ?? '', render: (r) => {
      const e = empMap.get(r.employeeId)
      return e ? <div className="flex items-center gap-2"><Avatar name={e.name} color={e.color} size={26} /><div className="min-w-0"><p className="truncate font-medium text-slate-800">{e.name}</p><p className="truncate text-[11px] text-slate-500">{e.designation}</p></div></div> : '-'
    } },
    ...(showOutlet ? [{ key: 'outlet', header: 'Outlet', render: (r: LeaveRequest) => <span className="text-slate-600">{outlets.find((o) => o.id === empMap.get(r.employeeId)?.outletId)?.short}</span> }] : []),
    { key: 'type', header: 'Type', sortValue: (r) => typeMap.get(r.typeId)?.code ?? '', render: (r) => { const t = typeMap.get(r.typeId); return t ? <Badge tone={t.tone}>{t.code}</Badge> : '-' } },
    { key: 'from', header: 'Dates', render: (r) => <span className="whitespace-nowrap">{fmtDate(r.from)}{r.to !== r.from && <> – {fmtDate(r.to)}</>}{r.session !== 'Full Day' && <span className="ml-1 text-[11px] text-slate-500">({r.session})</span>}</span> },
    { key: 'days', header: 'Days', align: 'right', render: (r) => <b className="tabular">{r.days}</b> },
    { key: 'reason', header: 'Reason', sortable: false, render: (r) => <span className="line-clamp-1 max-w-[220px] text-slate-600" title={r.reason}>{r.reason}{r.docName && ' 📎'}</span> },
    { key: 'appliedAt', header: 'Applied', render: (r) => <span className="flex items-center gap-1 whitespace-nowrap text-[12px] text-slate-500">{r.source === 'Staff App' ? <Smartphone className="size-3" /> : <Monitor className="size-3" />}{timeAgo(r.appliedAt)}</span> },
    { key: 'status', header: 'Status', render: (r) => <div><StatusBadge status={r.status} />{r.decidedBy && <p className="mt-0.5 text-[10.5px] text-slate-400">by {r.decidedBy}</p>}</div> },
    { key: 'act', header: '', sortable: false, align: 'right', render: (r) => (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        {r.status === 'Pending' && canApprove && <Button size="xs" variant="accent" onClick={() => setDeciding(r)}>Review</Button>}
        {r.status === 'Pending' && !canApprove && <IconButton tooltip="View" onClick={() => setDeciding(r)}><Eye className="size-3.5" /></IconButton>}
        {(r.status === 'Pending' || (r.status === 'Approved' && r.from > today)) && canCreate && <IconButton tooltip="Cancel request" onClick={() => setCancelling(r)}><Ban className="size-3.5" /></IconButton>}
      </div>
    ) },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending requests" value={pending.length} icon={<Clock3 />} tone="amber" sub={`${pending.reduce((s, r) => s + r.days, 0)} days awaiting approval`} onClick={() => { setView('requests'); setStatus('Pending') }} />
        <StatCard label="On leave today" value={onLeaveToday.length} icon={<PlaneTakeoff />} tone="violet" sub={onLeaveToday.map((r) => empMap.get(r.employeeId)?.name.split(' ')[0]).join(', ') || 'Everyone available'} />
        <StatCard label="Approved this month" value={`${approvedMonth} days`} icon={<CheckCircle2 />} tone="green" sub="paid + unpaid" />
        <StatCard label="Loss of pay (LWP)" value={`${lwp} days`} icon={<Wallet />} tone="red" sub="deducted in payroll" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented value={view} onChange={setView} items={[
          { value: 'requests', label: `Leave requests${pending.length ? ` (${pending.length})` : ''}` },
          { value: 'balances', label: 'Leave balances' },
          { value: 'types', label: `Leave types (${types.length})` },
        ]} />
        <div className="ml-auto flex gap-2">
          {view === 'types' && <Button icon={<Plus className="size-3.5" />} disabled={!canEditTypes} onClick={() => setEditType(null)}>New leave type</Button>}
          <Button variant="primary" icon={<CalendarPlus className="size-3.5" />} disabled={!canCreate} onClick={() => setApplyFor(undefined)}>Apply leave</Button>
        </div>
      </div>

      {view === 'requests' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Card>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5">
              <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Search employee or reason" className="w-60" />
              <Segmented size="sm" value={status} onChange={setStatus} items={(['Pending', 'Approved', 'Rejected', 'Cancelled', 'all'] as const).map((s) => ({ value: s, label: s === 'all' ? 'All' : s }))} />
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-44">
                <option value="all">All leave types</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.code} · {t.name}</option>)}
              </Select>
            </div>
            <DataTable columns={reqCols} rows={rows} pageSize={10} onRowClick={(r) => setDeciding(r.status === 'Pending' ? r : null)} />
          </Card>
          <Card>
            <CardHeader title="Upcoming approved leave" subtitle="Plan shift coverage" icon={<PlaneTakeoff className="size-3.5" />} />
            <div className="divide-y divide-slate-100">
              {upcoming.length === 0 && <p className="px-4 py-6 text-center text-[12.5px] text-slate-400">No upcoming leave</p>}
              {upcoming.map((r) => {
                const e = empMap.get(r.employeeId)!
                const t = typeMap.get(r.typeId)
                return (
                  <div key={r.id} className="flex items-center gap-2.5 px-4 py-2.5">
                    <Avatar name={e.name} color={e.color} size={28} />
                    <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-medium text-slate-800">{e.name}</p><p className="text-[11px] text-slate-500">{fmtDate(r.from)}{r.to !== r.from && ` – ${fmtDate(r.to)}`} · {r.days}d</p></div>
                    {t && <Badge tone={t.tone}>{t.code}</Badge>}
                  </div>
                )
              })}
            </div>
            <div className="border-t border-slate-100 px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Leave mix (approved, this year)</p>
              {types.filter((t) => t.active).map((t) => {
                const used = scoped.filter((r) => r.status === 'Approved' && r.typeId === t.id).reduce((s, r) => s + r.days, 0)
                const total = scoped.filter((r) => r.status === 'Approved').reduce((s, r) => s + r.days, 0) || 1
                return used ? (
                  <div key={t.id} className="mb-1.5 flex items-center gap-2 text-[12px]">
                    <span className="w-9 font-medium text-slate-600">{t.code}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', DOT[t.tone])} style={{ width: `${(used / total) * 100}%` }} /></div>
                    <span className="w-10 text-right tabular text-slate-700">{used}d</span>
                  </div>
                ) : null
              })}
            </div>
          </Card>
        </div>
      )}

      {view === 'balances' && <BalancesTable emps={emps} types={types.filter((t) => t.active)} onApply={(id) => setApplyFor(id)} canCreate={canCreate} requests={requests} opening={opening} />}

      {view === 'types' && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {types.map((t) => {
            const usedBy = new Set(requests.filter((r) => r.typeId === t.id && r.status === 'Approved').map((r) => r.employeeId)).size
            return (
              <Card key={t.id} className={cn('p-4', !t.active && 'opacity-60')}>
                <div className="flex items-start gap-3">
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold text-white', DOT[t.tone])}>{t.code}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-slate-900">{t.name}</p>
                    <p className="text-[12px] text-slate-500">{t.annual ? `${t.annual} days / year` : t.paid ? 'Credited on request' : 'No limit · unpaid'}</p>
                  </div>
                  <Toggle size="sm" checked={t.active} disabled={!canEditTypes} onChange={(v) => { upsertType({ ...t, active: v }); toast.info(`${t.name} ${v ? 'activated' : 'deactivated'}`) }} />
                </div>
                <p className="mt-2.5 line-clamp-2 min-h-[34px] text-[12px] text-slate-500">{t.description}</p>
                <div className="mt-2.5 flex flex-wrap gap-1">
                  <Badge tone={t.paid ? 'green' : 'red'}>{t.paid ? 'Paid' : 'Unpaid'}</Badge>
                  {t.halfDay && <Badge tone="blue">Half-day</Badge>}
                  {t.carryForward && <Badge tone="violet">Carry ≤ {t.maxCarry}</Badge>}
                  {t.encashable && <Badge tone="amber">Encashable</Badge>}
                  {t.gender !== 'All' && <Badge>{t.gender === 'F' ? 'Female' : 'Male'} only</Badge>}
                  {t.docAfterDays > 0 && <Badge>Doc &gt; {t.docAfterDays}d</Badge>}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11.5px] text-slate-500">
                  <span>Notice {t.noticeDays}d{t.maxConsecutive ? ` · max ${t.maxConsecutive}d at a time` : ''} · {usedBy} used</span>
                  <Button size="xs" variant="ghost" icon={<Pencil className="size-3" />} disabled={!canEditTypes} onClick={() => setEditType(t)}>Edit</Button>
                </div>
              </Card>
            )
          })}
          {canEditTypes && (
            <button onClick={() => setEditType(null)} className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 transition hover:border-brand-300 hover:text-brand-600">
              <Plus className="size-5" /><span className="text-[13px] font-medium">Add leave type</span>
            </button>
          )}
        </div>
      )}

      <ApplyLeaveModal open={applyFor !== null} defaultEmployeeId={applyFor ?? undefined} onClose={() => setApplyFor(null)} />
      <DecideLeaveModal request={canApprove ? deciding : null} onClose={() => setDeciding(null)} />
      <LeaveTypeModal open={editType !== undefined} editing={editType} onClose={() => setEditType(undefined)} />
      <ConfirmDialog open={!!cancelling} onClose={() => setCancelling(null)} tone="danger" confirmLabel="Cancel leave"
        title="Cancel this leave request?" body={cancelling?.status === 'Approved' ? 'The approved leave will be withdrawn and the attendance entries removed.' : 'The pending request will be withdrawn.'}
        onConfirm={() => { if (cancelling) { cancel(cancelling.id); toast.success('Leave request cancelled') } }} />
    </div>
  )
}

function BalancesTable({ emps, types, onApply, canCreate, requests, opening }: {
  emps: Employee[]; types: LeaveType[]; onApply: (id: string) => void; canCreate: boolean
  requests: LeaveRequest[]; opening: ReturnType<typeof useLeave.getState>['opening']
}) {
  const [q, setQ] = useState('')
  const rows = emps.filter((e) => !q || e.name.toLowerCase().includes(q.toLowerCase()) || e.code.toLowerCase().includes(q.toLowerCase()))
  const shown = types.filter((t) => t.paid)
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-3 py-2.5">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Search employee" className="w-60" />
        <span className="text-[11.5px] text-slate-500">Available / entitlement for {isoDate().slice(0, 4)} · includes carried-forward balance · pending requests are held</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2 text-left">Employee</th>
              {shown.map((t) => <th key={t.id} className="px-3 py-2 text-center"><span className="inline-flex items-center gap-1.5"><span className={cn('size-2 rounded-full', DOT[t.tone])} />{t.code}</span></th>)}
              <th className="px-3 py-2 text-right">Total available</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const bals = shown.filter((t) => t.gender === 'All' || t.gender === e.gender).map((t) => [t, balanceOf(e.id, t, requests, opening)] as const)
              const total = bals.filter(([t]) => t.annual <= 30 || t.id === 'lt_co').reduce((s, [, b]) => s + (Number.isFinite(b.available) ? b.available : 0), 0)
              return (
                <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-3 py-2"><div className="flex items-center gap-2"><Avatar name={e.name} color={e.color} size={26} /><div className="min-w-0"><p className="truncate font-medium text-slate-800">{e.name}</p><p className="text-[11px] text-slate-500">{e.code} · {e.department}</p></div></div></td>
                  {shown.map((t) => {
                    const hit = bals.find(([x]) => x.id === t.id)
                    if (!hit) return <td key={t.id} className="px-3 py-2 text-center text-slate-300">—</td>
                    const b = hit[1]
                    const pct = b.quota ? ((b.quota - b.available) / b.quota) * 100 : 0
                    return (
                      <td key={t.id} className="px-3 py-2 text-center" title={`Used ${b.used} · Pending ${b.pending}${b.carried ? ` · Carried ${b.carried}` : ''}`}>
                        <span className={cn('font-semibold tabular', b.available === 0 && b.quota > 0 ? 'text-rose-600' : 'text-slate-800')}>{b.available}</span>
                        <span className="text-slate-400 tabular">/{b.quota}</span>
                        {b.quota > 0 && <div className="mx-auto mt-1 h-1 w-14 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', DOT[t.tone])} style={{ width: `${100 - pct}%` }} /></div>}
                        {b.pending > 0 && <p className="text-[10px] text-amber-600">{b.pending} pending</p>}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-right font-semibold text-navy-900 tabular">{total} d</td>
                  <td className="px-3 py-2 text-right"><Button size="xs" disabled={!canCreate} onClick={() => onApply(e.id)}>Apply</Button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
