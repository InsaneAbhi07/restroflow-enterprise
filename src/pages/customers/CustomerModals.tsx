import { useEffect, useState } from 'react'
import { Gift, Minus, Plus, UserPlus } from 'lucide-react'
import { Button, Field, Input, Modal, Segmented, Select, Textarea } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { useScope } from '@/store/hooks'
import { toast } from '@/store/toast'
import { useShortcut } from '@/lib/shortcuts'
import { cn, inr, isoDate, uid } from '@/lib/format'
import type { Customer } from '@/types'
import { tierFor } from './customerUtils'

/* ------------------------------------------------------------------ Add / edit customer */
export function CustomerFormModal({ open, onClose, editId, onCreated }: { open: boolean; onClose: () => void; editId?: string | null; onCreated?: (id: string) => void }) {
  const customers = useStore((s) => s.customers)
  const outlets = useStore((s) => s.outlets)
  const upsert = useStore((s) => s.upsertCustomer)
  const log = useStore((s) => s.log)
  const { outletIds } = useScope()
  const existing = customers.find((c) => c.id === editId)
  const [f, setF] = useState({ name: '', phone: '', email: '', birthday: '', favOutlet: outletIds[0], notes: '', tags: '' })
  const [err, setErr] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setErr({})
    if (existing) {
      const [mm, dd] = (existing.birthday ?? '').split('-')
      setF({ name: existing.name, phone: existing.phone, email: existing.email, birthday: existing.birthday ? `2000-${mm}-${dd}` : '', favOutlet: existing.favOutlet, notes: existing.notes, tags: existing.tags.join(', ') })
    } else setF({ name: '', phone: '', email: '', birthday: '', favOutlet: outletIds[0], notes: '', tags: '' })
  }, [open, editId]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    const e: Record<string, string> = {}
    if (f.name.trim().length < 2) e.name = 'Enter customer name'
    const phone = f.phone.replace(/\D/g, '').slice(-10)
    if (phone.length !== 10) e.phone = 'Enter a valid 10-digit mobile number'
    else if (customers.some((c) => c.phone === phone && c.id !== existing?.id)) e.phone = 'A customer with this mobile already exists'
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email'
    setErr(e)
    if (Object.keys(e).length) return
    const birthday = f.birthday ? f.birthday.slice(5) : undefined
    const tags = f.tags.split(',').map((t) => t.trim()).filter(Boolean)
    const c: Customer = existing
      ? { ...existing, name: f.name.trim(), phone, email: f.email.trim(), birthday, favOutlet: f.favOutlet, notes: f.notes, tags }
      : { id: uid('cu'), name: f.name.trim(), phone, email: f.email.trim(), visits: 0, spend: 0, lastVisit: isoDate(), points: 50, tier: tierFor(0), notes: f.notes, birthday, favOutlet: f.favOutlet, tags: tags.length ? tags : ['New'] }
    upsert(c)
    log(`${existing ? 'Updated' : 'Added'} customer ${c.name}`, 'customers', 'success', c.favOutlet)
    toast.success(existing ? 'Customer updated' : 'Customer added', existing ? c.name : `${c.name} · 50 welcome points credited`)
    if (!existing) onCreated?.(c.id)
    onClose()
  }
  useShortcut('save', save, open)

  return (
    <Modal open={open} onClose={onClose} icon={<UserPlus />} title={existing ? `Edit ${existing.name}` : 'Add customer'} subtitle={existing ? existing.phone : 'New customers get 50 welcome loyalty points'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} kbd="Ctrl+S">{existing ? 'Save' : 'Add customer'}</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" required error={err.name}><Input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Rakesh Agarwal" /></Field>
        <Field label="Mobile" required error={err.phone}><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="10-digit mobile" icon={<span className="text-[11px]">+91</span>} /></Field>
        <Field label="Email" error={err.email}><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="name@email.com" /></Field>
        <Field label="Birthday" hint="Used for birthday offers"><Input type="date" value={f.birthday} onChange={(e) => setF({ ...f, birthday: e.target.value })} /></Field>
        <Field label="Preferred outlet">
          <Select value={f.favOutlet} onChange={(e) => setF({ ...f, favOutlet: e.target.value })}>
            {outlets.filter((o) => outletIds.includes(o.id) || o.id === f.favOutlet).map((o) => <option key={o.id} value={o.id}>{o.short}</option>)}
          </Select>
        </Field>
        <Field label="Tags" hint="Comma separated, e.g. Regular, Jain"><Input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></Field>
        <Field label="Notes / preferences" className="sm:col-span-2"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Allergies, seating preference…" /></Field>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ Loyalty points */
const REASONS = { add: ['Birthday bonus', 'Feedback reward', 'Complaint goodwill', 'Referral bonus', 'Manual adjustment'], redeem: ['Redeemed on bill', 'Free dessert', 'Expired points', 'Manual adjustment'] }

export function PointsModal({ customer, mode: initial, onClose }: { customer: Customer | null; mode: 'add' | 'redeem'; onClose: () => void }) {
  const upsert = useStore((s) => s.upsertCustomer)
  const log = useStore((s) => s.log)
  const [mode, setMode] = useState(initial)
  const [pts, setPts] = useState(100)
  const [reason, setReason] = useState(REASONS[initial][0])
  useEffect(() => {
    if (customer) { setMode(initial); setPts(initial === 'add' ? 100 : Math.min(200, customer.points)); setReason(REASONS[initial][0]) }
  }, [customer?.id, initial]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!customer) return null
  const invalid = pts <= 0 || (mode === 'redeem' && pts > customer.points)
  const after = customer.points + (mode === 'add' ? pts : -pts)
  const apply = () => {
    if (invalid) return
    upsert({ ...customer, points: after })
    log(`${mode === 'add' ? 'Added' : 'Redeemed'} ${pts} loyalty points ${mode === 'add' ? 'to' : 'for'} ${customer.name} (${reason})`, 'customers', mode === 'add' ? 'success' : 'info', customer.favOutlet)
    toast.success(mode === 'add' ? `${pts} points added` : `${pts} points redeemed`, `${customer.name} · new balance ${after.toLocaleString('en-IN')} pts${mode === 'redeem' ? ` (worth ${inr(pts)})` : ''}`)
    onClose()
  }

  return (
    <Modal open={!!customer} onClose={onClose} size="sm" icon={<Gift />} title="Loyalty points" subtitle={`${customer.name} · balance ${customer.points.toLocaleString('en-IN')} pts`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant={mode === 'add' ? 'success' : 'primary'} disabled={invalid} onClick={apply}>{mode === 'add' ? 'Add points' : 'Redeem points'}</Button></>}>
      <div className="space-y-3">
        <Segmented className="w-full" value={mode} onChange={(v) => { setMode(v); setReason(REASONS[v][0]) }} items={[{ value: 'add', label: 'Add', icon: <Plus className="size-3.5" /> }, { value: 'redeem', label: 'Redeem', icon: <Minus className="size-3.5" /> }]} />
        <Field label="Points" error={mode === 'redeem' && pts > customer.points ? 'Cannot redeem more than the available balance' : undefined}>
          <Input type="number" min={1} value={pts} onChange={(e) => setPts(Math.max(0, Number(e.target.value)))} />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {[50, 100, 250, 500].map((v) => (
            <button key={v} onClick={() => setPts(v)} className={cn('rounded-md border px-2 py-0.5 text-[11.5px]', pts === v ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>{v}</button>
          ))}
          {mode === 'redeem' && <button onClick={() => setPts(customer.points)} className="rounded-md border border-slate-200 px-2 py-0.5 text-[11.5px] text-slate-600 hover:bg-slate-50">All ({customer.points})</button>}
        </div>
        <Field label="Reason">
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS[mode].map((r) => <option key={r}>{r}</option>)}</Select>
        </Field>
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[12.5px]">
          <span className="text-slate-500">Balance after</span>
          <span className={cn('font-semibold tabular', after < 0 ? 'text-rose-600' : 'text-slate-900')}>{after.toLocaleString('en-IN')} pts <span className="font-normal text-slate-400">≈ {inr(Math.max(0, after))}</span></span>
        </div>
        <p className="text-[11px] text-slate-400">Earn 1 point per ₹100 spent · 1 point = ₹1 on redemption</p>
      </div>
    </Modal>
  )
}
