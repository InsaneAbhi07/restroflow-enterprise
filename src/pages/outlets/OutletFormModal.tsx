import { useEffect, useState } from 'react'
import { Store } from 'lucide-react'
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { toast } from '@/store/toast'
import { useShortcut } from '@/lib/shortcuts'
import { cn, isoDate, uid } from '@/lib/format'
import type { Outlet, OutletStatus } from '@/types'

const COLORS = ['#1d3f70', '#14a891', '#7c3aed', '#ea580c', '#db2777', '#0891b2', '#65a30d', '#b45309']
const blank = (): Outlet => ({
  id: '', code: '', name: 'The Grand Kitchen – ', short: '', city: '', address: '', phone: '+91 ', email: '', manager: '',
  hours: '11:00 AM – 11:00 PM', status: 'Open', gstin: '', fssai: '', seats: 60, factor: 0.6, color: COLORS[4], openedOn: isoDate(),
})

type Errors = Partial<Record<keyof Outlet, string>>

export function OutletFormModal({ open, onClose, editId }: { open: boolean; onClose: () => void; editId?: string | null }) {
  const outlets = useStore((s) => s.outlets)
  const upsert = useStore((s) => s.upsertOutlet)
  const log = useStore((s) => s.log)
  const existing = outlets.find((o) => o.id === editId)
  const [f, setF] = useState<Outlet>(blank())
  const [err, setErr] = useState<Errors>({})

  useEffect(() => {
    if (open) {
      setF(existing ? { ...existing } : { ...blank(), color: COLORS[outlets.length % COLORS.length] })
      setErr({})
    }
  }, [open, editId]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Outlet>(k: K, v: Outlet[K]) => setF((p) => ({ ...p, [k]: v }))

  const genCode = (short: string) => 'GK-' + (short.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 3) || 'NW')

  const save = () => {
    const e: Errors = {}
    if (f.short.trim().length < 3) e.short = 'Enter a short name (min 3 characters)'
    if (f.name.trim().length < 5) e.name = 'Enter the full outlet name'
    if (!f.city.trim()) e.city = 'City is required'
    if (!f.address.trim()) e.address = 'Address is required'
    if (!f.manager.trim()) e.manager = 'Assign an outlet manager'
    if (f.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid 10-digit phone number'
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email'
    if (f.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(f.gstin.toUpperCase())) e.gstin = 'GSTIN format: 15 characters, e.g. 09AAGCG4521K1Z7'
    if (f.fssai && !/^\d{14}$/.test(f.fssai)) e.fssai = 'FSSAI licence is a 14-digit number'
    if (!f.seats || f.seats < 1) e.seats = 'Seats must be at least 1'
    setErr(e)
    if (Object.keys(e).length) { toast.error('Please fix the highlighted fields'); return }
    let code = f.code || genCode(f.short)
    if (!existing) {
      let n = 1
      const base = code
      while (outlets.some((o) => o.code === code)) code = base + ++n
    }
    const out: Outlet = { ...f, id: f.id || uid('o'), code, gstin: f.gstin.toUpperCase() }
    upsert(out)
    log(`${existing ? 'Updated' : 'Created'} outlet ${out.short} (${out.code})`, 'outlets', 'success', out.id)
    toast.success(existing ? 'Outlet updated' : 'Outlet created', `${out.name} · ${out.code}`)
    onClose()
  }

  useShortcut('save', save, open)

  return (
    <Modal open={open} onClose={onClose} size="lg" icon={<Store />} title={existing ? `Edit ${existing.short}` : 'Add new outlet'}
      subtitle={existing ? existing.code : 'Outlet code is generated automatically from the short name'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} kbd="Ctrl+S">{existing ? 'Save changes' : 'Create outlet'}</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Short name" required error={err.short} hint={!existing && f.short ? `Code: ${genCode(f.short)}` : undefined}>
          <Input value={f.short} onChange={(e) => set('short', e.target.value)} placeholder="e.g. Airport Lounge" autoFocus />
        </Field>
        <Field label="Full name" required error={err.name}>
          <Input value={f.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="City" required error={err.city}>
          <Input value={f.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Lucknow" />
        </Field>
        <Field label="Outlet manager" required error={err.manager}>
          <Input value={f.manager} onChange={(e) => set('manager', e.target.value)} placeholder="Manager name" />
        </Field>
        <Field label="Address" required error={err.address} className="sm:col-span-2">
          <Textarea rows={2} value={f.address} onChange={(e) => set('address', e.target.value)} placeholder="Building, street, area, PIN" />
        </Field>
        <Field label="Phone" required error={err.phone}>
          <Input value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Email" error={err.email}>
          <Input value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="outlet@grandkitchen.in" />
        </Field>
        <Field label="GSTIN" error={err.gstin}>
          <Input value={f.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} placeholder="09AAGCG4521K1Z7" maxLength={15} className="font-mono" />
        </Field>
        <Field label="FSSAI licence no." error={err.fssai}>
          <Input value={f.fssai} onChange={(e) => set('fssai', e.target.value.replace(/\D/g, ''))} placeholder="14 digits" maxLength={14} className="font-mono" />
        </Field>
        <Field label="Operating hours">
          <Input value={f.hours} onChange={(e) => set('hours', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Seats" required error={err.seats}>
            <Input type="number" min={1} value={f.seats} onChange={(e) => set('seats', Number(e.target.value))} />
          </Field>
          <Field label="Status">
            <Select value={f.status} onChange={(e) => set('status', e.target.value as OutletStatus)}>
              <option>Open</option><option>Closed</option><option>Maintenance</option>
            </Select>
          </Field>
        </div>
        <Field label="Opening date">
          <Input type="date" value={f.openedOn} onChange={(e) => set('openedOn', e.target.value)} />
        </Field>
        <Field label="Brand colour">
          <div className="flex h-8 items-center gap-1.5">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => set('color', c)} className={cn('size-6 rounded-full ring-offset-2 transition', f.color === c && 'ring-2 ring-slate-400')} style={{ background: c }} />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  )
}
