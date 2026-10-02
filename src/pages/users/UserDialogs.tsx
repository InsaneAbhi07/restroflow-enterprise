import { Fragment, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, LogIn, ShieldCheck, UserPlus, X } from 'lucide-react'
import { Avatar, Badge, Button, Checkbox, Drawer, Field, Input, Modal, Select, StatusBadge, Toggle } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { toast } from '@/store/toast'
import { uid } from '@/lib/format'
import { ACTIONS, MODULES } from '@/data/people'
import type { User } from '@/types'
import { ACTION_LABEL, MODULE_GROUPS, RoleBadge, SCOPE_TONE } from './shared'

const COLORS = ['#0f2a4a', '#264f8a', '#14a891', '#7c3aed', '#ea580c', '#dc2626', '#0891b2', '#db2777', '#65a30d', '#4f46e5']

export function UserFormModal({ open, onClose, user }: { open: boolean; onClose: () => void; user?: User | null }) {
  const roles = useStore((s) => s.roles)
  const outlets = useStore((s) => s.outlets)
  const employees = useStore((s) => s.employees)
  const upsertUser = useStore((s) => s.upsertUser)
  const log = useStore((s) => s.log)
  const blank = (): User => ({
    id: uid('u'), name: '', email: '', phone: '+91 ', roleId: 'r_cashier', outletIds: ['o1'], status: 'Active', lastActive: 'Never',
    pin: String(Math.floor(1000 + Math.random() * 9000)), color: COLORS[Math.floor(Math.random() * COLORS.length)],
  })
  const [f, setF] = useState<User>(blank)
  const [err, setErr] = useState<Record<string, string>>({})
  useEffect(() => { if (open) { setF(user ? { ...user, outletIds: [...user.outletIds] } : blank()); setErr({}) } }, [open, user]) // eslint-disable-line

  const role = roles.find((r) => r.id === f.roleId)
  const multiWarn = role?.scope === 'Outlet' && f.outletIds.length > 1
  const set = <K extends keyof User>(k: K, v: User[K]) => setF((p) => ({ ...p, [k]: v }))
  const toggleOutlet = (id: string) => set('outletIds', f.outletIds.includes(id) ? f.outletIds.filter((x) => x !== id) : [...f.outletIds, id])

  const save = () => {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = 'Name is required'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email'
    if (!f.outletIds.length) e.outlets = 'Assign at least one outlet'
    if (!/^\d{4}$/.test(f.pin)) e.pin = '4-digit PIN'
    setErr(e)
    if (Object.keys(e).length) return
    upsertUser(f)
    log(`${user ? 'Updated' : 'Created'} user ${f.name} (${role?.name})`, 'users', 'info')
    toast.success(user ? 'User updated' : 'User created', `${f.name} · ${role?.name}`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" icon={<UserPlus />} title={user ? 'Edit user' : 'Create user'} subtitle="Login credentials, role and outlet access"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={<Check className="size-3.5" />} onClick={save}>{user ? 'Save changes' : 'Create user'}</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" required error={err.name}><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Meera Iyer" /></Field>
        <Field label="Email" required error={err.email}><Input value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="name@grandkitchen.in" /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Role" required>
          <Select value={f.roleId} onChange={(e) => set('roleId', e.target.value)}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.scope})</option>)}
          </Select>
        </Field>
        <Field label="Linked employee" hint="Used for attendance & payroll">
          <Select value={f.employeeId ?? ''} onChange={(e) => set('employeeId', e.target.value || undefined)}>
            <option value="">— None —</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.designation}</option>)}
          </Select>
        </Field>
        <Field label="POS PIN" required error={err.pin} hint="4-digit quick login PIN"><Input value={f.pin} maxLength={4} onChange={(e) => set('pin', e.target.value.replace(/\D/g, ''))} /></Field>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11.5px] font-medium text-slate-600">Assigned outlets <span className="text-rose-500">*</span></span>
          <button className="text-[11.5px] font-medium text-brand-600 hover:underline" onClick={() => set('outletIds', f.outletIds.length === outlets.length ? [] : outlets.map((o) => o.id))}>
            {f.outletIds.length === outlets.length ? 'Clear' : 'Select all'}
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {outlets.map((o) => (
            <div key={o.id} onClick={() => toggleOutlet(o.id)} className={'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition ' + (f.outletIds.includes(o.id) ? 'border-brand-300 bg-brand-50/50' : 'border-slate-200 hover:bg-slate-50')}>
              <Checkbox checked={f.outletIds.includes(o.id)} onChange={() => toggleOutlet(o.id)} />
              <span className="size-2 rounded-full" style={{ background: o.color }} />
              <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-medium text-slate-800">{o.short}</span><span className="block text-[11px] text-slate-500">{o.city}</span></span>
            </div>
          ))}
        </div>
        {err.outlets && <p className="mt-1 text-[11px] text-rose-600">{err.outlets}</p>}
        {multiWarn && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span><b>{role?.name}</b> is an outlet-scoped role. Assigning multiple outlets lets this user switch between them — make sure this is intended.</span>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
        <div><p className="text-[12.5px] font-medium text-slate-800">Account active</p><p className="text-[11.5px] text-slate-500">Inactive users cannot sign in to web, POS or mobile.</p></div>
        <Toggle checked={f.status === 'Active'} onChange={(v) => set('status', v ? 'Active' : 'Inactive')} />
      </div>
    </Modal>
  )
}

export function AccessDrawer({ user, onClose }: { user: User | null; onClose: () => void }) {
  const roles = useStore((s) => s.roles)
  const outlets = useStore((s) => s.outlets)
  const setUser = useStore((s) => s.setUser)
  const nav = useNavigate()
  const role = roles.find((r) => r.id === user?.roleId)
  if (!user) return null
  const perms = role?.permissions ?? {}
  const accessible = MODULES.filter((m) => perms[m.key]?.includes('view')).length
  return (
    <Drawer open={!!user} onClose={onClose} width={560} title="Access summary" subtitle={`${user.name} · ${user.email}`}
      icon={<Avatar name={user.name} color={user.color} size={36} />}
      footer={<>
        <Button onClick={() => { onClose(); nav('/users/roles?role=' + user.roleId) }} icon={<ShieldCheck className="size-3.5" />}>Edit role permissions</Button>
        <Button variant="primary" icon={<LogIn className="size-3.5" />} disabled={user.status !== 'Active'} onClick={() => {
          setUser(user.id); onClose(); nav('/'); toast.info(`Signed in as ${user.name}`, `${role?.name} view (demo)`)
        }}>Sign in as this user (demo)</Button>
      </>}>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-slate-200 p-2.5"><p className="text-[11px] text-slate-500">Role</p><div className="mt-1"><RoleBadge role={role} /></div></div>
        <div className="rounded-lg border border-slate-200 p-2.5"><p className="text-[11px] text-slate-500">Scope</p><div className="mt-1">{role && <Badge tone={SCOPE_TONE[role.scope]}>{role.scope}</Badge>}</div></div>
        <div className="rounded-lg border border-slate-200 p-2.5"><p className="text-[11px] text-slate-500">Modules</p><p className="mt-0.5 text-[15px] font-semibold text-slate-900">{accessible}<span className="text-[12px] font-normal text-slate-400"> / {MODULES.length}</span></p></div>
      </div>
      <div className="mt-3">
        <p className="mb-1.5 text-[11.5px] font-medium text-slate-600">Outlet access</p>
        <div className="flex flex-wrap gap-1.5">
          {user.outletIds.map((id) => { const o = outlets.find((x) => x.id === id); return <Badge key={id} tone="gray"><span className="size-1.5 rounded-full" style={{ background: o?.color }} />{o?.short}</Badge> })}
          <StatusBadge status={user.status} />
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-[12px]">
          <thead><tr className="bg-slate-50 text-[10.5px] uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2 text-left font-semibold">Module</th>
            {ACTIONS.map((a) => <th key={a} className="px-1 py-2 text-center font-semibold">{ACTION_LABEL[a].slice(0, 4)}</th>)}
          </tr></thead>
          <tbody>
            {MODULE_GROUPS.map((g) => (
              <Fragment key={g.group}>
                <tr className="bg-slate-50/60"><td colSpan={8} className="px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{g.group}</td></tr>
                {g.modules.map((m) => {
                  const acts = perms[m.key] ?? []
                  return (
                    <tr key={m.key} className={'border-t border-slate-100 ' + (acts.includes('view') ? '' : 'text-slate-400')}>
                      <td className="px-3 py-1.5">{m.label}</td>
                      {ACTIONS.map((a) => <td key={a} className="text-center">{acts.includes(a) ? <Check className="mx-auto size-3.5 text-brand-600" strokeWidth={3} /> : <X className="mx-auto size-3 text-slate-300" />}</td>)}
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Drawer>
  )
}
