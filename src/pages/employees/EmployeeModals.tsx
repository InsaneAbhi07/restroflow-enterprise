import { useState } from 'react'
import { Building2, Clock, ShieldCheck, UserPlus, UserCog } from 'lucide-react'
import type { Department, Employee } from '@/types'
import { Avatar, Button, Field, Input, Modal, Select } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { toast } from '@/store/toast'
import { cn, isoDate, uid } from '@/lib/format'
import { SHIFT_LABEL } from '@/pages/attendance/attUtils'

export const DEPTS: Department[] = ['Service', 'Kitchen', 'Billing', 'Management', 'Stores', 'Housekeeping', 'HR & Admin', 'Accounts']
const SHIFTS: Employee['shift'][] = ['Morning', 'Evening', 'General', 'Night']
const PALETTE = ['#1d3f70', '#14a891', '#7c3aed', '#ea580c', '#db2777', '#0891b2', '#65a30d', '#b45309', '#4f46e5', '#dc2626']

function salaryFor(basic: number, department: Department): Employee['salary'] {
  return {
    basic, hra: Math.round(basic * 0.4), allowance: Math.round(basic * 0.12), incentive: department === 'Service' || department === 'Billing' ? 1500 : 0,
    otRate: Math.round((basic / 26 / 8) * 1.5), pf: Math.round(Math.min(basic, 15000) * 0.12), esi: basic <= 21000 ? Math.round(basic * 0.0075) : 0, advance: 0, loan: 0,
  }
}

export function EmployeeFormModal({ open, onClose, employee, defaultOutlet }: { open: boolean; onClose: () => void; employee?: Employee; defaultOutlet: string }) {
  const employees = useStore((s) => s.employees)
  const outlets = useStore((s) => s.outlets)
  const upsertEmployee = useStore((s) => s.upsertEmployee)
  const log = useStore((s) => s.log)
  const nextCode = 'GK' + (Math.max(...employees.map((e) => Number(e.code.replace(/\D/g, '')) || 1000)) + 1)
  const [f, setF] = useState(() => ({
    name: employee?.name ?? '', designation: employee?.designation ?? '', department: employee?.department ?? ('Service' as Department),
    outletId: employee?.outletId ?? defaultOutlet, phone: employee?.phone ?? '+91 ', email: employee?.email ?? '', shift: employee?.shift ?? ('Morning' as Employee['shift']),
    gender: employee?.gender ?? ('M' as 'M' | 'F'), joinDate: employee?.joinDate ?? isoDate(), dob: employee?.dob ?? '1998-01-01', address: employee?.address ?? '',
    basic: employee?.salary.basic ?? 16000, bank: employee?.bank ?? '', pan: employee?.pan ?? '', status: employee?.status ?? ('Active' as Employee['status']),
  }))
  const [err, setErr] = useState<Record<string, string>>({})
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))

  const save = () => {
    const e: Record<string, string> = {}
    if (!f.name.trim() || f.name.trim().split(' ').length < 2) e.name = 'Enter first and last name'
    if (!f.designation.trim()) e.designation = 'Required'
    if (f.phone.replace(/\D/g, '').length < 12) e.phone = 'Enter a valid +91 mobile number'
    if (f.pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(f.pan)) e.pan = 'Format: ABCDE1234F'
    setErr(e)
    if (Object.keys(e).length) return
    const [first, last] = f.name.trim().toLowerCase().split(' ')
    const emp: Employee = {
      id: employee?.id ?? uid('e'), code: employee?.code ?? nextCode, name: f.name.trim(), designation: f.designation.trim(), department: f.department,
      outletId: f.outletId, joinDate: f.joinDate, status: f.status, phone: f.phone, email: f.email || `${first}.${last}@grandkitchen.in`, shift: f.shift,
      gender: f.gender, dob: f.dob, address: f.address || '—', color: employee?.color ?? PALETTE[employees.length % PALETTE.length],
      bank: f.bank || 'HDFC Bank ••0000', pan: f.pan || 'XXXXX0000X',
      salary: employee ? (employee.salary.basic === f.basic ? employee.salary : { ...salaryFor(f.basic, f.department), advance: employee.salary.advance, loan: employee.salary.loan }) : salaryFor(f.basic, f.department),
    }
    upsertEmployee(emp)
    log(`${employee ? 'Updated' : 'Added'} employee ${emp.name} (${emp.code})`, 'employees', 'success', emp.outletId)
    toast.success(employee ? 'Employee updated' : 'Employee added', `${emp.name} · ${emp.code}`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" icon={employee ? <UserCog /> : <UserPlus />} title={employee ? `Edit ${employee.name}` : 'Add employee'} subtitle={employee ? employee.code : `Employee ID will be ${nextCode}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{employee ? 'Save changes' : 'Add employee'}</Button></>}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Personal</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Full name" required error={err.name} className="sm:col-span-2"><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Rakesh Sharma" autoFocus /></Field>
        <Field label="Gender"><Select value={f.gender} onChange={(e) => set('gender', e.target.value as 'M' | 'F')}><option value="M">Male</option><option value="F">Female</option></Select></Field>
        <Field label="Mobile" required error={err.phone}><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Email"><Input value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="auto-generated if blank" /></Field>
        <Field label="Date of birth"><Input type="date" value={f.dob} onChange={(e) => set('dob', e.target.value)} /></Field>
        <Field label="Address" className="sm:col-span-3"><Input value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="Locality, City" /></Field>
      </div>
      <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Employment</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Designation" required error={err.designation}><Input value={f.designation} onChange={(e) => set('designation', e.target.value)} placeholder="e.g. Waiter" /></Field>
        <Field label="Department"><Select value={f.department} onChange={(e) => set('department', e.target.value as Department)}>{DEPTS.map((d) => <option key={d}>{d}</option>)}</Select></Field>
        <Field label="Outlet"><Select value={f.outletId} onChange={(e) => set('outletId', e.target.value)}>{outlets.map((o) => <option key={o.id} value={o.id}>{o.short}</option>)}</Select></Field>
        <Field label="Shift"><Select value={f.shift} onChange={(e) => set('shift', e.target.value as Employee['shift'])}>{SHIFTS.map((s) => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Joining date"><Input type="date" value={f.joinDate} onChange={(e) => set('joinDate', e.target.value)} /></Field>
        <Field label="Status"><Select value={f.status} onChange={(e) => set('status', e.target.value as Employee['status'])}><option>Active</option><option>On Leave</option><option>Inactive</option></Select></Field>
      </div>
      <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Payroll</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Basic salary (₹/month)" hint="HRA 40%, allowance 12%, PF/ESI auto-computed"><Input type="number" value={f.basic} onChange={(e) => set('basic', Number(e.target.value) || 0)} /></Field>
        <Field label="Bank account"><Input value={f.bank} onChange={(e) => set('bank', e.target.value)} placeholder="HDFC Bank ••1234" /></Field>
        <Field label="PAN" error={err.pan}><Input value={f.pan} onChange={(e) => set('pan', e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} /></Field>
      </div>
    </Modal>
  )
}

export type QuickKind = 'outlet' | 'shift' | 'role'
export function QuickAssignModal({ kind, employee, onClose }: { kind: QuickKind; employee: Employee; onClose: () => void }) {
  const outlets = useStore((s) => s.outlets)
  const roles = useStore((s) => s.roles)
  const users = useStore((s) => s.users)
  const upsertEmployee = useStore((s) => s.upsertEmployee)
  const log = useStore((s) => s.log)
  const linked = users.find((u) => u.employeeId === employee.id)
  const [val, setVal] = useState<string>(kind === 'outlet' ? employee.outletId : kind === 'shift' ? employee.shift : linked?.roleId ?? 'r_waiter')

  const save = () => {
    if (kind === 'outlet') {
      upsertEmployee({ ...employee, outletId: val })
      log(`Assigned ${employee.name} to ${outlets.find((o) => o.id === val)?.short}`, 'employees', 'info', val)
      toast.success('Outlet assigned', `${employee.name} → ${outlets.find((o) => o.id === val)?.short}`)
    } else if (kind === 'shift') {
      upsertEmployee({ ...employee, shift: val as Employee['shift'] })
      log(`Changed shift of ${employee.name} to ${val}`, 'employees', 'info', employee.outletId)
      toast.success('Shift updated', `${employee.name} · ${val} (${SHIFT_LABEL[val as Employee['shift']]})`)
    } else {
      const r = roles.find((x) => x.id === val)
      log(`Role change requested for ${employee.name} → ${r?.name}`, 'users', 'info', employee.outletId)
      toast.success('Role change submitted', `${employee.name} → ${r?.name}. Access updates on next login.`)
    }
    onClose()
  }

  const title = kind === 'outlet' ? 'Assign outlet' : kind === 'shift' ? 'Assign shift' : 'Change role'
  const icon = kind === 'outlet' ? <Building2 /> : kind === 'shift' ? <Clock /> : <ShieldCheck />
  const options = kind === 'outlet'
    ? outlets.map((o) => ({ id: o.id, label: o.short, desc: `${o.city} · ${o.manager}`, color: o.color }))
    : kind === 'shift'
      ? SHIFTS.map((s) => ({ id: s, label: s, desc: SHIFT_LABEL[s], color: '#1d3f70' }))
      : roles.map((r) => ({ id: r.id, label: r.name, desc: `${r.scope} · ${r.description}`, color: r.color }))

  return (
    <Modal open onClose={onClose} size="md" icon={icon} title={title} subtitle={`${employee.name} · ${employee.code}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-slate-50 p-3">
        <Avatar name={employee.name} color={employee.color} size={32} />
        <div className="text-[12.5px]"><p className="font-semibold">{employee.designation}</p><p className="text-slate-500">{kind === 'role' ? (linked ? `Login: ${linked.email}` : 'No login account linked — a user will be created') : `${employee.department} department`}</p></div>
      </div>
      <div className="max-h-80 space-y-1.5 overflow-y-auto">
        {options.map((o) => (
          <button key={o.id} onClick={() => setVal(o.id)} className={cn('flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition', val === o.id ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300')}>
            <span className="size-3 shrink-0 rounded-full" style={{ background: o.color }} />
            <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold">{o.label}</span><span className="block truncate text-[11.5px] text-slate-500">{o.desc}</span></span>
            <span className={cn('flex size-4 items-center justify-center rounded-full border-2', val === o.id ? 'border-brand-500' : 'border-slate-300')}>{val === o.id && <span className="size-2 rounded-full bg-brand-500" />}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
