import { useEffect, useMemo, useState } from 'react'
import { BadgePercent, Ban, Minus, Plus, ShieldAlert, SlidersHorizontal, Armchair, Users } from 'lucide-react'
import { Badge, Button, Checkbox, Field, Input, Modal, Segmented, Select, VegMark } from '@/components/ui'
import { useShortcut } from '@/lib/shortcuts'
import { useStore } from '@/store/useStore'
import { computeTotals } from '@/lib/billing'
import { cn, inr, minutesSince } from '@/lib/format'
import type { MenuItem, Modifier, Order, Table, TableStatus } from '@/types'
import { defaultVariant } from './posUtils'

/* ------------------------------------------------------------ Customize item */
export function CustomizeModal({ item, onClose, onConfirm }: {
  item: MenuItem | null; onClose: () => void; onConfirm: (variant: string | undefined, mods: Modifier[], qty: number, note: string) => void
}) {
  const [variant, setVariant] = useState<string | undefined>()
  const [mods, setMods] = useState<string[]>([])
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  useEffect(() => {
    if (!item) return
    setVariant(defaultVariant(item)?.name)
    setMods([]); setQty(1); setNote('')
  }, [item])
  const base = item?.variants?.find((v) => v.name === variant)?.price ?? item?.price ?? 0
  const modsSel = (item?.modifiers ?? []).filter((m) => mods.includes(m.name))
  const unit = base + modsSel.reduce((s, m) => s + m.price, 0)
  const confirm = () => item && onConfirm(variant, modsSel, qty, note)
  useShortcut('enter', confirm, !!item)
  if (!item) return null
  return (
    <Modal open onClose={onClose} size="sm" icon={<SlidersHorizontal />} title={<span className="flex items-center gap-2"><VegMark veg={item.veg} />{item.name}</span>}
      subtitle={`#${item.code} · ${item.short} · ${item.description ?? ''}`}
      footer={
        <>
          <div className="mr-auto flex items-center gap-1 rounded-lg border border-slate-200 p-0.5">
            <button className="rounded-md p-1.5 hover:bg-slate-100" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="size-3.5" /></button>
            <span className="w-7 text-center font-semibold tabular">{qty}</span>
            <button className="rounded-md p-1.5 hover:bg-slate-100" onClick={() => setQty(qty + 1)}><Plus className="size-3.5" /></button>
          </div>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="accent" kbd="Enter" onClick={confirm}>Add · {inr(unit * qty)}</Button>
        </>
      }>
      <div onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "BUTTON") { e.preventDefault(); confirm() } }}>
      {item.variants?.length ? (
        <div className="mb-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Portion / size</p>
          <div className="grid grid-cols-2 gap-2">
            {item.variants.map((v) => (
              <button key={v.name} onClick={() => setVariant(v.name)}
                className={cn('flex items-center justify-between rounded-lg border px-3 py-2 text-left transition', variant === v.name ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-100' : 'border-slate-200 hover:bg-slate-50')}>
                <span className="flex items-center gap-2">
                  <span className={cn('size-3.5 rounded-full border-2', variant === v.name ? 'border-brand-500 bg-brand-500 shadow-[inset_0_0_0_2px_#fff]' : 'border-slate-300')} />
                  <span className="font-medium">{v.name}</span>
                </span>
                <span className="tabular text-slate-600">{inr(v.price)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {item.modifiers?.length ? (
        <div className="mb-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Add-ons & preferences</p>
          <div className="space-y-1">
            {item.modifiers.map((m) => (
              <div key={m.name} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50">
                <Checkbox checked={mods.includes(m.name)} onChange={(v) => setMods(v ? [...mods, m.name] : mods.filter((x) => x !== m.name))} label={m.name} />
                <span className="text-[12px] text-slate-500 tabular">{m.price ? '+' + inr(m.price) : 'Free'}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <Field label="Special instruction (prints on KOT)">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. less oil, no onion" onKeyDown={(e) => e.key === 'Enter' && confirm()} />
      </Field>
      <div className="mt-2 flex flex-wrap gap-1">
        {['Less spicy', 'Extra spicy', 'No onion', 'Pack separately', 'Serve first'].map((s) => (
          <button key={s} onClick={() => setNote(note ? `${note}, ${s.toLowerCase()}` : s)} className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:border-brand-300 hover:bg-brand-50">{s}</button>
        ))}
      </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------ Discount */
export function DiscountModal({ open, onClose, current, subtotal, onApply }: {
  open: boolean; onClose: () => void; current: Order['discount']; subtotal: number; onApply: (d: Order['discount']) => void
}) {
  const [type, setType] = useState<'pct' | 'flat'>('pct')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  useEffect(() => {
    if (!open) return
    setType(current.type); setValue(current.value ? String(current.value) : ''); setReason(current.reason ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const v = parseFloat(value) || 0
  const amt = Math.min(subtotal, type === 'pct' ? (subtotal * v) / 100 : v)
  const effPct = subtotal ? (amt / subtotal) * 100 : 0
  const needsApproval = effPct > 15
  const apply = () => { onApply({ type, value: v, reason: reason || undefined }); onClose() }
  useShortcut('enter', apply, open)
  return (
    <Modal open={open} onClose={onClose} size="sm" icon={<BadgePercent />} title="Bill discount" subtitle={`On subtotal ${inr(subtotal)}`}
      footer={
        <>
          {current.value > 0 && <Button variant="ghost" className="mr-auto text-rose-600" onClick={() => { onApply({ type: 'pct', value: 0 }); onClose() }}>Remove discount</Button>}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" kbd="Enter" onClick={apply}>Apply −{inr(amt)}</Button>
        </>
      }>
      <Segmented value={type} onChange={setType} className="mb-3 w-full" items={[{ value: 'pct', label: 'Percentage %' }, { value: 'flat', label: 'Flat ₹' }]} />
      <div className="mb-3 grid grid-cols-4 gap-1.5">
        {[5, 10, 15, 20].map((p) => (
          <Button key={p} variant={type === 'pct' && v === p ? 'primary' : 'outline'} onClick={() => { setType('pct'); setValue(String(p)) }}>{p}%</Button>
        ))}
      </div>
      <Field label={type === 'pct' ? 'Discount %' : 'Discount amount (₹)'}>
        <Input autoFocus type="number" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()} suffix={type === 'pct' ? '%' : '₹'} />
      </Field>
      <Field label="Reason" className="mt-3">
        <Select value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Select reason…</option>
          {['Loyalty customer', 'Staff / family', 'Food complaint', 'Delay in service', 'Corporate tie-up', 'Festival offer', 'Manager discretion'].map((r) => <option key={r}>{r}</option>)}
        </Select>
      </Field>
      {needsApproval && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <span><b>Requires manager approval</b> — discounts above 15% ({effPct.toFixed(1)}%) are flagged on the day-end report and need an Outlet Manager PIN at settlement.</span>
        </div>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------ Cancel KOT'd line */
export function CancelLineModal({ name, onClose, onConfirm }: { name: string | null; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('Customer changed mind')
  const [remarks, setRemarks] = useState('')
  useEffect(() => { if (name) { setReason('Customer changed mind'); setRemarks('') } }, [name])
  if (!name) return null
  const ok = () => { onConfirm(remarks ? `${reason} – ${remarks}` : reason); onClose() }
  return (
    <Modal open onClose={onClose} size="sm" icon={<Ban />} title="Cancel item already sent to kitchen" subtitle={name}
      footer={<><Button onClick={onClose}>Keep item</Button><Button variant="danger" onClick={ok}>Cancel item & notify kitchen</Button></>}>
      <p className="mb-3 text-[12px] text-slate-500">This item is on a KOT. A cancellation KOT will be printed and the action is recorded in the audit log.</p>
      <Field label="Reason" required>
        <Select value={reason} onChange={(e) => setReason(e.target.value)}>
          {['Customer changed mind', 'Wrong item punched', 'Item not available', 'Taking too long', 'Quality issue'].map((r) => <option key={r}>{r}</option>)}
        </Select>
      </Field>
      <Field label="Remarks" className="mt-3"><Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" /></Field>
    </Modal>
  )
}

/* ------------------------------------------------------------ Table picker */
const T_STYLE: Record<TableStatus, string> = {
  Available: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400',
  Occupied: 'border-sky-200 bg-sky-50 text-sky-800 hover:border-sky-400',
  Billing: 'border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-400',
  Reserved: 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400',
  Cleaning: 'border-slate-200 bg-slate-100 text-slate-500 hover:border-slate-400',
}
export function TablePickerModal({ open, onClose, outletId, currentTableId, onPick }: {
  open: boolean; onClose: () => void; outletId: string; currentTableId?: string; onPick: (t: Table) => void
}) {
  const tables = useStore((s) => s.tables)
  const orders = useStore((s) => s.orders)
  const list = useMemo(() => tables.filter((t) => t.outletId === outletId), [tables, outletId])
  const floors = Array.from(new Set(list.map((t) => t.floor)))
  const counts = list.reduce<Record<string, number>>((a, t) => ({ ...a, [t.status]: (a[t.status] ?? 0) + 1 }), {})
  return (
    <Modal open={open} onClose={onClose} size="lg" icon={<Armchair />} title="Select table" subtitle="Tap a free table to assign · tap a running table to open its order">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(Object.keys(T_STYLE) as TableStatus[]).map((s) => <Badge key={s} tone={s === 'Available' ? 'green' : s === 'Occupied' ? 'blue' : s === 'Billing' ? 'violet' : s === 'Reserved' ? 'amber' : 'gray'} dot>{s} · {counts[s] ?? 0}</Badge>)}
      </div>
      {floors.map((f) => (
        <div key={f} className="mb-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{f}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {list.filter((t) => t.floor === f).map((t) => {
              const o = orders.find((x) => x.id === t.orderId)
              const amt = o ? computeTotals(o).total : 0
              return (
                <button key={t.id} onClick={() => onPick(t)}
                  className={cn('relative flex h-[76px] flex-col justify-between rounded-xl border-2 p-2 text-left transition', T_STYLE[t.status], t.id === currentTableId && 'ring-2 ring-navy-700 ring-offset-1')}>
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-bold">{t.label}</span>
                    <span className="flex items-center gap-0.5 text-[10.5px] opacity-70"><Users className="size-3" />{t.capacity}</span>
                  </div>
                  <div className="text-[11px] leading-tight">
                    {o ? <><b className="tabular">{inr(amt)}</b><span className="opacity-70"> · {t.since ? minutesSince(t.since) + 'm' : ''}</span></> : t.status === 'Reserved' ? <span className="truncate">{t.reservedFor ?? 'Reserved'} {t.reservedAt}</span> : <span className="opacity-70">{t.status}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </Modal>
  )
}
