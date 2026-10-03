import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, CheckCircle2, FileUp, PlaneTakeoff, Settings2, XCircle, AlertTriangle, Info } from 'lucide-react'
import { Modal, Button, Field, Input, Select, Textarea, Toggle, Segmented, Badge, Avatar, DOT, type Tone } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { useScope } from '@/store/hooks'
import { toast } from '@/store/toast'
import { cn, fmtDate, isoDate, uid } from '@/lib/format'
import { useLeave, balanceOf, leaveDays, dateRange, type LeaveType, type LeaveSession, type LeaveRequest } from './leaveStore'

const TONES: Tone[] = ['teal', 'blue', 'red', 'amber', 'violet', 'pink', 'orange', 'green', 'navy', 'gray']

/* ------------------------------------------------------------------ Leave type form */
const blankType = (): LeaveType => ({
  id: uid('lt'), code: '', name: '', tone: 'teal', annual: 6, paid: true, carryForward: false, maxCarry: 0, halfDay: true,
  docAfterDays: 0, noticeDays: 1, maxConsecutive: 0, gender: 'All', encashable: false, active: true, description: '',
})

export function LeaveTypeModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: LeaveType | null }) {
  const types = useLeave((s) => s.types)
  const upsert = useLeave((s) => s.upsertType)
  const [f, setF] = useState<LeaveType>(blankType())
  const [errors, setErrors] = useState<Record<string, string>>({})
  useEffect(() => { if (open) { setF(editing ? { ...editing } : blankType()); setErrors({}) } }, [open, editing])
  const set = <K extends keyof LeaveType>(k: K, v: LeaveType[K]) => setF((p) => ({ ...p, [k]: v }))

  const save = () => {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = 'Leave type name is required'
    if (!/^[A-Z]{1,4}$/.test(f.code)) e.code = '1–4 capital letters, e.g. CL'
    else if (types.some((t) => t.code === f.code && t.id !== f.id)) e.code = 'Code already used by another leave type'
    if (f.annual < 0 || f.annual > 365) e.annual = '0–365 days'
    if (f.carryForward && f.maxCarry <= 0) e.maxCarry = 'Set a carry-forward limit'
    setErrors(e)
    if (Object.keys(e).length) return
    upsert({ ...f, name: f.name.trim(), maxCarry: f.carryForward ? f.maxCarry : 0 })
    useStore.getState().log(`${editing ? 'Updated' : 'Created'} leave type ${f.name} (${f.code})`, 'attendance', 'info')
    toast.success(editing ? 'Leave type updated' : 'Leave type created', `${f.name} · ${f.annual ? f.annual + ' days / year' : 'no annual quota'}`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" icon={<Settings2 />} title={editing ? `Edit leave type · ${editing.code}` : 'New leave type'}
      subtitle="Policy rules applied when employees apply for this leave"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{editing ? 'Save changes' : 'Create leave type'}</Button></>}>
      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <div className="space-y-3.5">
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <Field label="Leave type name" required error={errors.name}><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Casual Leave" autoFocus /></Field>
            <Field label="Code" required error={errors.code}><Input value={f.code} maxLength={4} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} placeholder="CL" /></Field>
          </div>
          <Field label="Description"><Textarea value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="When should employees use this leave?" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Annual quota (days)" error={errors.annual} hint="0 = credited manually"><Input type="number" min={0} value={f.annual} onChange={(e) => set('annual', Number(e.target.value))} /></Field>
            <Field label="Max consecutive days" hint="0 = no limit"><Input type="number" min={0} value={f.maxConsecutive} onChange={(e) => set('maxConsecutive', Number(e.target.value))} /></Field>
            <Field label="Advance notice (days)" hint="0 = same day"><Input type="number" min={0} value={f.noticeDays} onChange={(e) => set('noticeDays', Number(e.target.value))} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Document required after" hint="days · 0 = never"><Input type="number" min={0} value={f.docAfterDays} onChange={(e) => set('docAfterDays', Number(e.target.value))} /></Field>
            <Field label="Applicable to">
              <Select value={f.gender} onChange={(e) => set('gender', e.target.value as LeaveType['gender'])}>
                <option value="All">All employees</option><option value="F">Female only</option><option value="M">Male only</option>
              </Select>
            </Field>
            <Field label="Carry-forward limit" error={errors.maxCarry} hint={f.carryForward ? 'max days carried' : 'enable below'}>
              <Input type="number" min={0} disabled={!f.carryForward} value={f.maxCarry} onChange={(e) => set('maxCarry', Number(e.target.value))} />
            </Field>
          </div>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {([
              ['paid', 'Paid leave', 'Counted as a paid day in payroll. Off = deducted as loss of pay.'],
              ['carryForward', 'Carry forward unused balance', 'Unused days roll over to next year up to the limit.'],
              ['halfDay', 'Allow half-day', 'Employees can take first-half / second-half leave.'],
              ['encashable', 'Encashable', 'Balance can be paid out at year end or exit.'],
              ['active', 'Active', 'Inactive types are hidden from the apply form.'],
            ] as [keyof LeaveType, string, string][]).map(([k, label, hint]) => (
              <div key={k} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div><p className="text-[13px] font-medium text-slate-800">{label}</p><p className="text-[11.5px] text-slate-500">{hint}</p></div>
                <Toggle checked={f[k] as boolean} onChange={(v) => set(k, v as never)} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Field label="Colour">
            <div className="flex flex-wrap gap-1.5">
              {TONES.map((t) => (
                <button key={t} type="button" onClick={() => set('tone', t)} className={cn('size-7 rounded-lg ring-offset-2 transition', DOT[t], f.tone === t && 'ring-2 ring-navy-700')} />
              ))}
            </div>
          </Field>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Preview</p>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <span className={cn('flex size-8 items-center justify-center rounded-lg text-[11px] font-bold text-white', DOT[f.tone])}>{f.code || '—'}</span>
                <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-slate-800">{f.name || 'Leave type'}</p><p className="text-[11px] text-slate-500">{f.annual ? `${f.annual} days / year` : 'Credited on request'}</p></div>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1">
                <Badge tone={f.paid ? 'green' : 'red'}>{f.paid ? 'Paid' : 'Unpaid'}</Badge>
                {f.halfDay && <Badge tone="blue">Half-day</Badge>}
                {f.carryForward && <Badge tone="violet">Carry ≤ {f.maxCarry || 0}</Badge>}
                {f.encashable && <Badge tone="amber">Encashable</Badge>}
                {f.gender !== 'All' && <Badge>{f.gender === 'F' ? 'Female' : 'Male'} only</Badge>}
                {!f.active && <Badge tone="gray">Inactive</Badge>}
              </div>
              <ul className="mt-2.5 space-y-1 text-[11.5px] text-slate-500">
                <li>• Apply {f.noticeDays ? `${f.noticeDays} day(s) in advance` : 'same day'}</li>
                {f.maxConsecutive > 0 && <li>• Max {f.maxConsecutive} consecutive days</li>}
                {f.docAfterDays > 0 && <li>• Document needed beyond {f.docAfterDays} day(s)</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ Apply leave form */
export function ApplyLeaveModal({ open, onClose, defaultEmployeeId }: { open: boolean; onClose: () => void; defaultEmployeeId?: string }) {
  const { outletIds } = useScope()
  const employees = useStore((s) => s.employees)
  const types = useLeave((s) => s.types)
  const requests = useLeave((s) => s.requests)
  const opening = useLeave((s) => s.opening)
  const apply = useLeave((s) => s.apply)
  const emps = useMemo(() => employees.filter((e) => e.status !== 'Inactive' && outletIds.includes(e.outletId)), [employees, outletIds])

  const [empId, setEmpId] = useState('')
  const [typeId, setTypeId] = useState('lt_cl')
  const [from, setFrom] = useState(isoDate())
  const [to, setTo] = useState(isoDate())
  const [session, setSession] = useState<LeaveSession>('Full Day')
  const [reason, setReason] = useState('')
  const [contact, setContact] = useState('')
  const [doc, setDoc] = useState('')
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!open) return
    const t = isoDate(new Date(Date.now() + 864e5))
    setEmpId(defaultEmployeeId ?? emps[0]?.id ?? ''); setTypeId('lt_cl'); setFrom(t); setTo(t); setSession('Full Day'); setReason(''); setContact(''); setDoc(''); setTried(false)
  }, [open, defaultEmployeeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const emp = employees.find((e) => e.id === empId)
  const available = types.filter((t) => t.active && (t.gender === 'All' || t.gender === emp?.gender))
  const type = types.find((t) => t.id === typeId)
  useEffect(() => { if (type && !available.some((t) => t.id === type.id)) setTypeId(available[0]?.id ?? '') }, [empId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (session !== 'Full Day') setTo(from) }, [session, from])
  useEffect(() => { if (type && !type.halfDay) setSession('Full Day') }, [typeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const days = leaveDays(from, to, session)
  const bal = emp && type ? balanceOf(emp.id, type, requests, opening) : null
  const notice = Math.round((new Date(from + 'T00:00:00').getTime() - new Date(isoDate() + 'T00:00:00').getTime()) / 864e5)
  const overlap = emp ? requests.find((r) => r.employeeId === emp.id && (r.status === 'Pending' || r.status === 'Approved') && !(r.to < from || r.from > to)) : undefined

  const errors: string[] = []
  const warnings: string[] = []
  if (!emp) errors.push('Select an employee')
  if (!type) errors.push('Select a leave type')
  if (to < from) errors.push('“To” date cannot be before “From” date')
  if (!reason.trim()) errors.push('Enter a reason for the leave')
  if (overlap) errors.push(`Overlaps with an existing ${overlap.status.toLowerCase()} request (${fmtDate(overlap.from)}${overlap.to !== overlap.from ? ' – ' + fmtDate(overlap.to) : ''})`)
  if (type && bal && !bal.unlimited && days > bal.available) errors.push(`Insufficient ${type.code} balance — ${bal.available} day(s) available, ${days} requested. Choose Leave Without Pay for the extra days.`)
  if (type && type.maxConsecutive > 0 && days > type.maxConsecutive) errors.push(`${type.name} allows at most ${type.maxConsecutive} consecutive day(s)`)
  if (type && type.docAfterDays > 0 && days > type.docAfterDays && !doc) errors.push(`Attach a supporting document (required beyond ${type.docAfterDays} day(s))`)
  if (type && notice < type.noticeDays && notice >= 0) warnings.push(`Policy asks for ${type.noticeDays} day(s) notice — this request will be flagged as short notice.`)
  if (notice < 0) warnings.push('Back-dated leave — manager will regularise attendance for past dates.')

  const submit = () => {
    setTried(true)
    if (errors.length || !emp || !type) return
    apply({ employeeId: emp.id, typeId: type.id, from, to, session, days, reason: reason.trim(), contact: contact || undefined, docName: doc || undefined, source: 'Web' })
    toast.success('Leave request submitted', `${emp.name} · ${days} day(s) ${type.code} · sent for approval`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" icon={<CalendarPlus />} title="Apply for leave" subtitle="Request is routed to the outlet manager / HR for approval"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={<PlaneTakeoff className="size-3.5" />} onClick={submit}>Submit request</Button></>}>
      <div className="grid gap-4 md:grid-cols-[1fr_250px]">
        <div className="space-y-3.5">
          <Field label="Employee" required>
            <Select value={empId} onChange={(e) => setEmpId(e.target.value)}>
              {emps.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.code} · {e.designation}</option>)}
            </Select>
          </Field>
          <Field label="Leave type" required>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {available.map((t) => {
                const b = emp ? balanceOf(emp.id, t, requests, opening) : null
                return (
                  <button key={t.id} type="button" onClick={() => setTypeId(t.id)}
                    className={cn('flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition', typeId === t.id ? 'border-brand-400 bg-brand-50/50 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300')}>
                    <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white', DOT[t.tone])}>{t.code}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-medium text-slate-800">{t.name}</span>
                      <span className="block text-[11px] text-slate-500">{b?.unlimited ? 'Unpaid' : `${b?.available ?? 0} available`}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From" required><Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value) }} /></Field>
            <Field label="To" required><Input type="date" value={to} min={from} disabled={session !== 'Full Day'} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
          {type?.halfDay && (
            <Field label="Duration">
              <Segmented value={session} onChange={setSession} items={[{ value: 'Full Day', label: 'Full day(s)' }, { value: 'First Half', label: 'First half' }, { value: 'Second Half', label: 'Second half' }]} />
            </Field>
          )}
          <Field label="Reason" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe the reason for leave" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact during leave"><Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+91 98xxx xxxxx" /></Field>
            <Field label={`Supporting document${type?.docAfterDays && days > type.docAfterDays ? ' *' : ''}`}>
              <button type="button" onClick={() => setDoc(doc ? '' : type?.code === 'SL' ? 'medical_certificate.pdf' : 'supporting_document.pdf')}
                className={cn('flex h-8 w-full items-center gap-2 rounded-lg border border-dashed px-2.5 text-[12.5px] transition', doc ? 'border-brand-300 bg-brand-50/50 text-brand-700' : 'border-slate-300 text-slate-500 hover:border-slate-400')}>
                <FileUp className="size-3.5" />{doc || 'Attach file (simulated)'}
              </button>
            </Field>
          </div>
          {tried && errors.length > 0 && (
            <div className="space-y-1 rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{errors.map((e) => <p key={e}>• {e}</p>)}</div>
          )}
          {warnings.length > 0 && (
            <div className="space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">{warnings.map((w) => <p key={w} className="flex gap-1.5"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{w}</p>)}</div>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-3">
          {emp && (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3">
              <Avatar name={emp.name} color={emp.color} size={34} />
              <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-slate-800">{emp.name}</p><p className="truncate text-[11.5px] text-slate-500">{emp.designation} · {emp.shift} shift</p></div>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Request summary</p>
            <p className="mt-1 text-[26px] font-semibold text-navy-900 tabular">{days}<span className="ml-1 text-[13px] font-medium text-slate-500">day{days === 1 ? '' : 's'}</span></p>
            <p className="text-[12px] text-slate-500">{from && fmtDate(from)}{to !== from && ` → ${fmtDate(to)}`}{session !== 'Full Day' && ` · ${session}`}</p>
            {type && bal && (
              <div className="mt-3 space-y-1.5 text-[12px]">
                <Row l="Leave type" r={<Badge tone={type.tone}>{type.code} · {type.paid ? 'Paid' : 'Unpaid'}</Badge>} />
                {!bal.unlimited && <>
                  <Row l="Entitlement" r={`${bal.quota}${bal.carried ? ` (incl. ${bal.carried} carried)` : ''}`} />
                  <Row l="Used this year" r={bal.used} />
                  <Row l="Pending approval" r={bal.pending} />
                  <Row l="Balance after this" r={<b className={bal.available - days < 0 ? 'text-rose-600' : 'text-emerald-600'}>{bal.available - days}</b>} />
                </>}
                {bal.unlimited && <p className="flex gap-1.5 text-slate-500"><Info className="mt-0.5 size-3.5 shrink-0" />Unpaid — {days} day(s) will be deducted in payroll.</p>}
              </div>
            )}
          </div>
          {type?.description && <p className="px-1 text-[11.5px] text-slate-500">{type.description}</p>}
        </div>
      </div>
    </Modal>
  )
}
const Row = ({ l, r }: { l: string; r: React.ReactNode }) => <div className="flex items-center justify-between gap-2"><span className="text-slate-500">{l}</span><span className="font-medium text-slate-800 tabular">{r}</span></div>

/* ------------------------------------------------------------------ Approve / reject */
export function DecideLeaveModal({ request, onClose }: { request: LeaveRequest | null; onClose: () => void }) {
  const employees = useStore((s) => s.employees)
  const types = useLeave((s) => s.types)
  const requests = useLeave((s) => s.requests)
  const opening = useLeave((s) => s.opening)
  const decide = useLeave((s) => s.decide)
  const [remark, setRemark] = useState('')
  useEffect(() => setRemark(''), [request])
  if (!request) return null
  const emp = employees.find((e) => e.id === request.employeeId)
  const type = types.find((t) => t.id === request.typeId)
  const bal = emp && type ? balanceOf(emp.id, type, requests, opening) : null
  const teammatesOff = requests.filter((r) => r.id !== request.id && r.status === 'Approved' && employees.find((e) => e.id === r.employeeId)?.outletId === emp?.outletId && !(r.to < request.from || r.from > request.to))
  const act = (status: 'Approved' | 'Rejected') => {
    if (status === 'Rejected' && !remark.trim()) return toast.error('Add a remark when rejecting')
    decide(request.id, status, remark.trim() || undefined)
    toast.success(`Leave ${status.toLowerCase()}`, `${emp?.name} · ${request.days} day(s) ${type?.code}${status === 'Approved' ? ' · attendance updated' : ''}`)
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="md" icon={<PlaneTakeoff />} title="Review leave request" subtitle={`Applied ${fmtDate(request.appliedAt)} via ${request.source}`}
      footer={<>
        <Button variant="ghost" className="mr-auto" onClick={onClose}>Close</Button>
        <Button variant="danger" icon={<XCircle className="size-3.5" />} onClick={() => act('Rejected')}>Reject</Button>
        <Button variant="success" icon={<CheckCircle2 className="size-3.5" />} onClick={() => act('Approved')}>Approve</Button>
      </>}>
      {emp && (
        <div className="mb-4 flex items-center gap-3">
          <Avatar name={emp.name} color={emp.color} size={38} />
          <div className="min-w-0 flex-1"><p className="text-[14px] font-semibold text-slate-900">{emp.name}</p><p className="text-[12px] text-slate-500">{emp.code} · {emp.designation} · {emp.department}</p></div>
          {type && <Badge tone={type.tone}>{type.name}</Badge>}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {[['Dates', `${fmtDate(request.from)}${request.to !== request.from ? ' – ' + fmtDate(request.to) : ''}`], ['Duration', `${request.days} day(s)${request.session !== 'Full Day' ? ' · ' + request.session : ''}`], ['Balance', bal?.unlimited ? 'Unpaid' : `${bal?.available ?? 0} left`]].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-[11px] text-slate-500">{k}</p><p className="text-[12.5px] font-semibold text-slate-800">{v}</p></div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-slate-200 px-3 py-2.5 text-[12.5px] text-slate-700"><span className="text-slate-500">Reason: </span>{request.reason}</div>
      {(request.contact || request.docName) && (
        <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
          {request.contact && <Badge>📞 {request.contact}</Badge>}
          {request.docName && <button onClick={() => toast.info('Document preview simulated', request.docName)}><Badge tone="blue">📎 {request.docName}</Badge></button>}
        </div>
      )}
      <div className={cn('mt-3 flex gap-2 rounded-lg px-3 py-2 text-[12px]', teammatesOff.length ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800')}>
        {teammatesOff.length ? <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />}
        {teammatesOff.length ? `${teammatesOff.length} colleague(s) at this outlet are already on leave during these dates (${teammatesOff.map((r) => employees.find((e) => e.id === r.employeeId)?.name.split(' ')[0]).join(', ')}).` : 'No other approved leave at this outlet for these dates — shift coverage looks fine.'}
      </div>
      <p className="mt-2 text-[11.5px] text-slate-500">Approving marks {dateRange(request.from, request.to).length} day(s) as <b>{type?.paid === false ? 'Absent (LWP)' : request.session !== 'Full Day' ? 'Half Day' : 'Leave'}</b> in the attendance register and payroll.</p>
      <Field label="Remark" className="mt-3" hint="Required when rejecting"><Textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="e.g. Approved – arrange shift swap with Suresh" /></Field>
    </Modal>
  )
}
