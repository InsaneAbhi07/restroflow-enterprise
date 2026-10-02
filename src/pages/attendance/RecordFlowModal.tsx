import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ClipboardEdit, Fingerprint, Smartphone, Wifi } from 'lucide-react'
import type { Attendance, AttStatus, Employee } from '@/types'
import { Avatar, Badge, Button, Field, Input, KeyValue, Modal, SearchInput, Stepper, StatusBadge, Textarea } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { toast } from '@/store/toast'
import { cn, fmtDate, isoDate } from '@/lib/format'
import { ATT_STATUSES, SHIFT_LABEL, hm12, shiftStartHM } from './attUtils'

type Method = NonNullable<Attendance['method']>
const METHODS: { id: Method; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'Mobile', label: 'Mobile app (GPS)', desc: 'Staff app with geofence check — simulated', icon: <Smartphone className="size-5" /> },
  { id: 'Network', label: 'Outlet Wi-Fi', desc: 'Detected on authorised SSID — simulated', icon: <Wifi className="size-5" /> },
  { id: 'Biometric', label: 'Biometric terminal', desc: 'Fingerprint / face device sync', icon: <Fingerprint className="size-5" /> },
  { id: 'Manual', label: 'Manual entry', desc: 'Manager records status & times', icon: <ClipboardEdit className="size-5" /> },
]

export function RecordFlowModal({ open, onClose, emps }: { open: boolean; onClose: () => void; emps: Employee[] }) {
  const attendance = useStore((s) => s.attendance)
  const ssid = useStore((s) => s.settings.attendance.networkSSID)
  const { checkIn, upsertAttendance, log } = useStore.getState()
  const [step, setStep] = useState(0)
  const [q, setQ] = useState('')
  const [empId, setEmpId] = useState<string>()
  const [method, setMethod] = useState<Method>('Mobile')
  const [status, setStatus] = useState<AttStatus>('Present')
  const [ci, setCi] = useState('')
  const [co, setCo] = useState('')
  const [remarks, setRemarks] = useState('')
  const emp = emps.find((e) => e.id === empId)
  const date = isoDate()
  const existing = attendance.find((a) => a.employeeId === empId && a.date === date)
  const nowHM = new Date().toTimeString().slice(0, 5)

  const close = () => { onClose(); setTimeout(() => { setStep(0); setEmpId(undefined); setQ(''); setMethod('Mobile'); setRemarks(''); setCi(''); setCo('') }, 200) }

  const submit = () => {
    if (!emp) return
    if (method === 'Manual') {
      const timed = status === 'Present' || status === 'Late' || status === 'Half Day'
      upsertAttendance({ id: `att_${emp.id}_${date}`, employeeId: emp.id, date, status, method: 'Manual', checkIn: timed ? ci || shiftStartHM(emp.shift) : undefined, checkOut: timed ? co || undefined : undefined, remarks: remarks || 'Recorded via guided flow' })
      log(`Manual attendance recorded for ${emp.name}: ${status}`, 'attendance', 'success', emp.outletId)
    } else {
      checkIn(emp.id, method)
    }
    toast.success('Attendance recorded', `${emp.name} · ${method === 'Manual' ? status : 'checked in via ' + method}`)
    close()
  }

  const list = emps.filter((e) => !q || e.name.toLowerCase().includes(q.toLowerCase()) || e.code.toLowerCase().includes(q.toLowerCase()))

  return (
    <Modal open={open} onClose={close} size="lg" title="Record attendance" subtitle={`Guided flow · ${fmtDate(date)}`} icon={<Fingerprint />}
      footer={<>
        {step > 0 && <Button icon={<ArrowLeft className="size-3.5" />} onClick={() => setStep(step - 1)}>Back</Button>}
        <span className="flex-1" />
        <Button onClick={close}>Cancel</Button>
        {step < 2 ? <Button variant="primary" iconRight={<ArrowRight className="size-3.5" />} disabled={step === 0 && !emp} onClick={() => setStep(step + 1)}>Continue</Button>
          : <Button variant="accent" icon={<Check className="size-3.5" />} onClick={submit}>Confirm & record</Button>}
      </>}>
      <Stepper steps={['Select employee', 'Method', 'Confirm']} current={step} className="mb-5" />

      {step === 0 && (
        <div>
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Search by name or employee code…" autoFocus />
          <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
            {list.map((e) => {
              const rec = attendance.find((a) => a.employeeId === e.id && a.date === date)
              return (
                <button key={e.id} onClick={() => setEmpId(e.id)} className={cn('flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition', empId === e.id ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300')}>
                  <Avatar name={e.name} color={e.color} size={32} />
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{e.name}</p><p className="text-[11px] text-slate-500">{e.code} · {e.designation}</p></div>
                  {rec ? <StatusBadge status={rec.status} /> : <Badge>Not marked</Badge>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {step === 1 && emp && (
        <div>
          {existing?.checkIn && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">{emp.name} already checked in at {hm12(existing.checkIn)} — recording again will overwrite today's entry.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {METHODS.map((m) => (
              <button key={m.id} onClick={() => setMethod(m.id)} className={cn('flex items-start gap-3 rounded-xl border p-3 text-left transition', method === m.id ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300')}>
                <span className={cn('flex size-10 items-center justify-center rounded-xl', method === m.id ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500')}>{m.icon}</span>
                <span><span className="block text-[13px] font-semibold">{m.label}</span><span className="block text-[11.5px] text-slate-500">{m.id === 'Network' ? `Detected on “${ssid}” — simulated` : m.desc}</span></span>
              </button>
            ))}
          </div>
          {method === 'Manual' && (
            <div className="mt-4 space-y-3 rounded-xl border border-slate-200 p-3">
              <Field label="Status">
                <div className="flex flex-wrap gap-1.5">
                  {ATT_STATUSES.map((s) => <button key={s} onClick={() => setStatus(s)} className={cn('rounded-lg border px-2.5 py-1 text-[12px] font-medium', status === s ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-200 text-slate-600')}>{s}</button>)}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Check-in"><Input type="time" value={ci || shiftStartHM(emp.shift)} onChange={(e) => setCi(e.target.value)} /></Field>
                <Field label="Check-out"><Input type="time" value={co} onChange={(e) => setCo(e.target.value)} /></Field>
              </div>
              <Field label="Remarks"><Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Reason for manual entry" /></Field>
            </div>
          )}
        </div>
      )}

      {step === 2 && emp && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
            <Avatar name={emp.name} color={emp.color} size={44} />
            <div><p className="text-[14px] font-semibold">{emp.name}</p><p className="text-[12px] text-slate-500">{emp.code} · {emp.designation} · {emp.department}</p></div>
          </div>
          <KeyValue cols={3} className="rounded-xl border border-slate-200 p-4" items={[
            ['Date', fmtDate(date)], ['Method', method], ['Shift', `${emp.shift} (${SHIFT_LABEL[emp.shift]})`],
            ['Status', method === 'Manual' ? status : 'Auto (Present / Late by grace rule)'], ['Check-in', method === 'Manual' ? hm12(ci || shiftStartHM(emp.shift)) : hm12(nowHM) + ' (now)'], ['Check-out', method === 'Manual' ? hm12(co) : '—'],
          ]} />
          {method !== 'Manual' && <p className="text-[11.5px] text-slate-500">{method === 'Biometric' ? 'Biometric sync is simulated for this demo.' : 'Location / network verification is simulated in this prototype.'}</p>}
        </div>
      )}
    </Modal>
  )
}
