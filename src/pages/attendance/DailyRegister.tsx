import { useMemo, useState } from 'react'
import { Check, Pencil, ShieldCheck, X } from 'lucide-react'
import type { Attendance, AttStatus, Employee } from '@/types'
import { Avatar, Badge, Button, Card, DataTable, Field, FilterBar, Input, Modal, SearchInput, Segmented, StatusBadge, Textarea, type Column } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { fmtDate } from '@/lib/format'
import { ATT_STATUSES, METHOD_TONE, SHIFT_LABEL, fmtHours, hm12, shiftStartHM, workedHours } from './attUtils'

type Row = { id: string; emp: Employee; rec?: Attendance }

export function DailyRegister({ emps, date, showOutlet }: { emps: Employee[]; date: string; showOutlet: boolean }) {
  const attendance = useStore((s) => s.attendance)
  const outlets = useStore((s) => s.outlets)
  const upsertAttendance = useStore((s) => s.upsertAttendance)
  const log = useStore((s) => s.log)
  const { can } = usePermission()
  const [q, setQ] = useState('')
  const [view, setView] = useState<'all' | 'marked' | 'unmarked' | 'exceptions'>('all')
  const [edit, setEdit] = useState<Row | null>(null)

  const rows: Row[] = useMemo(() => emps.map((emp) => ({ id: emp.id, emp, rec: attendance.find((a) => a.employeeId === emp.id && a.date === date) }))
    .filter((r) => !q || r.emp.name.toLowerCase().includes(q.toLowerCase()) || r.emp.code.toLowerCase().includes(q.toLowerCase()))
    .filter((r) => view === 'all' || (view === 'marked' ? !!r.rec : view === 'unmarked' ? !r.rec : r.rec && ['Late', 'Absent', 'Half Day'].includes(r.rec.status))), [emps, attendance, date, q, view])

  const quick = (emp: Employee, status: AttStatus) => {
    upsertAttendance({ id: `att_${emp.id}_${date}`, employeeId: emp.id, date, status, checkIn: status === 'Present' ? shiftStartHM(emp.shift) : undefined, method: 'Manual', remarks: 'Marked from daily register' })
    log(`Marked ${emp.name} ${status} for ${fmtDate(date)}`, 'attendance', status === 'Absent' ? 'warning' : 'success', emp.outletId)
    toast.success(`${emp.name} marked ${status}`)
  }

  const columns: Column<Row>[] = [
    {
      key: 'emp', header: 'Employee', sortValue: (r) => r.emp.name, render: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.emp.name} color={r.emp.color} size={28} />
          <div className="min-w-0"><p className="truncate font-medium text-slate-800">{r.emp.name}</p><p className="text-[11px] text-slate-500">{r.emp.code} · {r.emp.designation}</p></div>
        </div>
      ),
    },
    ...(showOutlet ? [{ key: 'outlet', header: 'Outlet', sortValue: (r: Row) => r.emp.outletId, render: (r: Row) => <span className="text-slate-600">{outlets.find((o) => o.id === r.emp.outletId)?.short}</span> }] : []),
    { key: 'dept', header: 'Department', sortValue: (r) => r.emp.department, render: (r) => <span className="text-slate-600">{r.emp.department}</span> },
    { key: 'in', header: 'Check-in', sortValue: (r) => r.rec?.checkIn ?? '', render: (r) => <span className="tabular">{hm12(r.rec?.checkIn)}</span> },
    { key: 'out', header: 'Check-out', sortValue: (r) => r.rec?.checkOut ?? '', render: (r) => <span className="tabular">{r.rec?.checkIn && !r.rec.checkOut ? <span className="text-emerald-600">On duty</span> : hm12(r.rec?.checkOut)}</span> },
    { key: 'hrs', header: 'Working hrs', sortValue: (r) => workedHours(r.rec) ?? -1, render: (r) => <span className="tabular">{fmtHours(workedHours(r.rec))}{(r.rec?.ot ?? 0) > 0 && <span className="ml-1 text-[11px] text-brand-600">+{r.rec!.ot}h OT</span>}</span> },
    { key: 'method', header: 'Method', sortValue: (r) => r.rec?.method ?? '', render: (r) => (r.rec?.method ? <Badge tone={METHOD_TONE[r.rec.method]}>{r.rec.method}</Badge> : <span className="text-slate-300">—</span>) },
    { key: 'status', header: 'Status', sortValue: (r) => r.rec?.status ?? 'zz', render: (r) => (r.rec ? <StatusBadge status={r.rec.status} /> : <Badge tone="gray">Not marked</Badge>) },
    {
      key: 'actions', header: '', sortable: false, align: 'right', render: (r) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {!r.rec && can('attendance', 'create') && (
            <>
              <Button size="xs" variant="success" icon={<Check className="size-3" />} onClick={() => quick(r.emp, 'Present')}>Present</Button>
              <Button size="xs" variant="outline" className="text-rose-600" icon={<X className="size-3" />} onClick={() => quick(r.emp, 'Absent')}>Absent</Button>
            </>
          )}
          <Button size="xs" variant="ghost" icon={<Pencil className="size-3" />} disabled={!can('attendance', 'edit')} onClick={() => setEdit(r)}>Edit</Button>
        </div>
      ),
    },
  ]

  const counts = {
    all: emps.length,
    marked: emps.filter((e) => attendance.some((a) => a.employeeId === e.id && a.date === date)).length,
  }

  return (
    <Card>
      <FilterBar>
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Search employee or code…" className="w-64" />
        <Segmented size="sm" value={view} onChange={setView} items={[
          { value: 'all', label: `All (${counts.all})` }, { value: 'marked', label: `Marked (${counts.marked})` },
          { value: 'unmarked', label: `Not marked (${counts.all - counts.marked})` }, { value: 'exceptions', label: 'Exceptions' },
        ]} />
        <span className="ml-auto text-[12px] text-slate-500">{fmtDate(date)}</span>
      </FilterBar>
      <DataTable columns={columns} rows={rows} pageSize={15} onRowClick={(r) => can('attendance', 'edit') && setEdit(r)}
        rowClassName={(r) => (!r.rec ? 'bg-amber-50/30' : undefined)} />
      {edit && <ManualAttendanceModal row={edit} date={date} onClose={() => setEdit(null)} />}
    </Card>
  )
}

function ManualAttendanceModal({ row, date, onClose }: { row: Row; date: string; onClose: () => void }) {
  const upsertAttendance = useStore((s) => s.upsertAttendance)
  const log = useStore((s) => s.log)
  const { emp, rec } = row
  const [status, setStatus] = useState<AttStatus>(rec?.status ?? 'Present')
  const [ci, setCi] = useState(rec?.checkIn ?? shiftStartHM(emp.shift))
  const [co, setCo] = useState(rec?.checkOut ?? '')
  const [remarks, setRemarks] = useState(rec?.remarks ?? '')
  const needsTime = status === 'Present' || status === 'Late' || status === 'Half Day'

  const save = () => {
    if (!remarks.trim()) return toast.error('Remarks required', 'Add a reason for this correction (audit trail).')
    upsertAttendance({
      id: rec?.id ?? `att_${emp.id}_${date}`, employeeId: emp.id, date, status,
      checkIn: needsTime ? ci || undefined : undefined, checkOut: needsTime ? co || undefined : undefined,
      method: rec?.method ?? 'Manual', remarks: remarks.trim(), ot: rec?.ot ?? 0,
    })
    log(`Attendance correction approved for ${emp.name} (${fmtDate(date)}): ${status}${needsTime && ci ? ` ${ci}–${co || '…'}` : ''}`, 'attendance', 'success', emp.outletId)
    toast.success('Correction approved', `${emp.name} · ${status} on ${fmtDate(date)}`)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Manual attendance" subtitle={`${emp.name} · ${emp.code} · ${fmtDate(date)}`} icon={<Pencil />}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={<ShieldCheck className="size-3.5" />} onClick={save}>Approve correction</Button></>}>
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
        <Avatar name={emp.name} color={emp.color} size={36} />
        <div className="flex-1 text-[12.5px]">
          <p className="font-semibold text-slate-800">{emp.designation} · {emp.department}</p>
          <p className="text-slate-500">{emp.shift} shift · {SHIFT_LABEL[emp.shift]}</p>
        </div>
        {rec ? <StatusBadge status={rec.status} /> : <Badge>Not marked</Badge>}
      </div>
      <Field label="Status" required>
        <div className="flex flex-wrap gap-1.5">
          {ATT_STATUSES.map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)} className={`rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition ${status === s ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{s}</button>
          ))}
        </div>
      </Field>
      {needsTime && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Check-in time"><Input type="time" value={ci} onChange={(e) => setCi(e.target.value)} /></Field>
          <Field label="Check-out time" hint="Leave blank if still on duty"><Input type="time" value={co} onChange={(e) => setCo(e.target.value)} /></Field>
        </div>
      )}
      <Field label="Remarks / reason" required className="mt-3">
        <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Forgot to check out — verified with CCTV / manager" />
      </Field>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {['Missed check-out', 'Biometric failure', 'Network issue on phone', 'Approved by outlet manager'].map((r) => (
          <button key={r} type="button" onClick={() => setRemarks(r)} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] text-slate-600 hover:bg-slate-200">{r}</button>
        ))}
      </div>
    </Modal>
  )
}
