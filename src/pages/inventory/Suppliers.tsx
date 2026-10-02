import { useMemo, useState } from 'react'
import { Truck, Plus, Star, Phone, Mail, Pencil, Wallet, ShoppingCart, LayoutGrid, List, IndianRupee, Building2 } from 'lucide-react'
import type { Supplier } from '@/types'
import { useStore } from '@/store/useStore'
import { useScope, usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { PageHeader, Card, StatCard, Button, DataTable, FilterBar, SearchInput, Select, Segmented, Badge, Avatar, Drawer, Modal, Field, Input, KeyValue, StatusBadge, IconButton, EmptyState, type Column } from '@/components/ui'
import { cn, fmtDate, inr, inrShort, uid } from '@/lib/format'
import { InvNav, OutletChip, fmtQty, poTotal } from './shared'
import { NewPOModal } from './PurchaseModals'

const COLORS = ['#1d3f70', '#14a891', '#7c3aed', '#ea580c', '#db2777', '#0891b2', '#65a30d', '#d97706', '#dc2626', '#64748b']

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn('size-3', i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />)}
      <span className="ml-1 text-[11px] font-medium text-slate-600">{value.toFixed(1)}</span>
    </span>
  )
}

export default function Suppliers() {
  const { can } = usePermission()
  const { outletIds } = useScope()
  const suppliers = useStore((s) => s.suppliers)
  const pos = useStore((s) => s.purchaseOrders)
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const [edit, setEdit] = useState<{ open: boolean; s?: Supplier }>({ open: false })
  const [openId, setOpenId] = useState<string | null>(null)
  const [pay, setPay] = useState<Supplier | null>(null)
  const [poFor, setPoFor] = useState<string | null>(null)

  const scopedPOs = useMemo(() => pos.filter((p) => outletIds.includes(p.outletId)), [pos, outletIds])
  const poCount = (id: string) => scopedPOs.filter((p) => p.supplierId === id).length
  const cats = ['All', ...new Set(suppliers.map((s) => s.category))]
  const rows = suppliers.filter((s) => (cat === 'All' || s.category === cat) && (!q || [s.name, s.contact, s.gstin, s.code].some((x) => x.toLowerCase().includes(q.toLowerCase()))))
  const open = suppliers.find((s) => s.id === openId) ?? null
  const color = (s: Supplier) => COLORS[suppliers.indexOf(s) % COLORS.length]

  const cols: Column<Supplier>[] = [
    { key: 'name', header: 'Supplier', render: (s) => <div className="flex items-center gap-2.5"><Avatar name={s.name} color={color(s)} size={28} /><div><p className="font-medium text-slate-800">{s.name}</p><p className="text-[11px] text-slate-400">{s.code} · {s.city}</p></div></div> },
    { key: 'category', header: 'Category', render: (s) => <Badge tone="navy">{s.category}</Badge> },
    { key: 'contact', header: 'Contact', render: (s) => <div><p>{s.contact}</p><p className="text-[11px] text-slate-400">{s.phone}</p></div> },
    { key: 'gstin', header: 'GSTIN', render: (s) => <span className="font-mono text-[11.5px]">{s.gstin}</span> },
    { key: 'rating', header: 'Rating', render: (s) => <Stars value={s.rating} /> },
    { key: 'outstanding', header: 'Outstanding', align: 'right', render: (s) => <span className={cn('font-semibold', s.outstanding > 30000 ? 'text-rose-600' : 'text-slate-800')}>{inr(s.outstanding)}</span> },
    { key: 'terms', header: 'Terms' },
    { key: 'pos', header: 'POs', align: 'right', sortValue: (s) => poCount(s.id), render: (s) => poCount(s.id) },
    { key: 'act', header: '', sortable: false, render: (s) => can('purchase', 'edit') && <IconButton tooltip="Edit" onClick={(e) => { e.stopPropagation(); setEdit({ open: true, s }) }}><Pencil className="size-3.5" /></IconButton> },
  ]

  return (
    <div>
      <InvNav />
      <PageHeader title="Suppliers" subtitle="Vendor directory, payables and purchase history" breadcrumbs={[{ label: 'Inventory', to: '/inventory' }, { label: 'Suppliers' }]}
        actions={can('purchase', 'create') && <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setEdit({ open: true })}>Add supplier</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active suppliers" value={suppliers.length} icon={<Truck />} sub={`${cats.length - 1} categories`} />
        <StatCard label="Total outstanding" value={inrShort(suppliers.reduce((s, x) => s + x.outstanding, 0))} icon={<IndianRupee />} tone="red" sub="payables" />
        <StatCard label="Avg. rating" value={(suppliers.reduce((s, x) => s + x.rating, 0) / Math.max(1, suppliers.length)).toFixed(2)} icon={<Star />} tone="amber" sub="quality & timeliness" />
        <StatCard label="POs in scope" value={scopedPOs.length} icon={<ShoppingCart />} tone="teal" sub={inrShort(scopedPOs.reduce((s, p) => s + poTotal(p), 0))} />
      </div>

      <Card className="mt-3 overflow-hidden">
        <FilterBar>
          <SearchInput className="w-60" placeholder="Search name, contact, GSTIN…" value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} />
          <Select className="w-44" value={cat} onChange={(e) => setCat(e.target.value)}>{cats.map((c) => <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>)}</Select>
          <Segmented className="ml-auto" size="sm" value={view} onChange={setView} items={[{ value: 'cards', label: 'Cards', icon: <LayoutGrid className="size-3" /> }, { value: 'table', label: 'Table', icon: <List className="size-3" /> }]} />
        </FilterBar>
        {view === 'table' ? <DataTable columns={cols} rows={rows} onRowClick={(s) => setOpenId(s.id)} /> : (
          rows.length === 0 ? <EmptyState title="No suppliers found" /> :
          <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((s) => (
              <div key={s.id} onClick={() => setOpenId(s.id)} className="cursor-pointer rounded-xl border border-slate-200 p-3.5 transition hover:border-brand-200 hover:shadow-md">
                <div className="flex items-start gap-3">
                  <Avatar name={s.name} color={color(s)} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{s.name}</p>
                    <p className="text-[11.5px] text-slate-500">{s.code} · {s.city}</p>
                  </div>
                  <Badge tone="navy">{s.category}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-[12px]">
                  <span className="text-slate-500">Contact</span><span className="truncate text-right font-medium text-slate-700">{s.contact}</span>
                  <span className="text-slate-500">Phone</span><span className="text-right text-slate-700">{s.phone}</span>
                  <span className="text-slate-500">GSTIN</span><span className="truncate text-right font-mono text-[11px] text-slate-700">{s.gstin}</span>
                  <span className="text-slate-500">Rating</span><span className="text-right"><Stars value={s.rating} /></span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <div><p className="text-[10.5px] uppercase tracking-wide text-slate-400">Outstanding</p><p className={cn('font-semibold tabular', s.outstanding > 30000 ? 'text-rose-600' : 'text-slate-900')}>{inr(s.outstanding)}</p></div>
                  <div className="text-right"><p className="text-[10.5px] uppercase tracking-wide text-slate-400">Terms · POs</p><p className="font-medium text-slate-700">{s.terms} · {poCount(s.id)}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <SupplierDrawer supplier={open} onClose={() => setOpenId(null)} onEdit={(s) => setEdit({ open: true, s })} onPay={setPay} onPO={(s) => setPoFor(s.id)} />
      <SupplierModal open={edit.open} supplier={edit.s} onClose={() => setEdit({ open: false })} />
      <PaymentModal supplier={pay} onClose={() => setPay(null)} />
      <NewPOModal open={!!poFor} prefill={{ supplierId: poFor ?? undefined }} onClose={() => setPoFor(null)} />
    </div>
  )
}

/* ------------------------------------------------------------------ Drawer */
function SupplierDrawer({ supplier, onClose, onEdit, onPay, onPO }: { supplier: Supplier | null; onClose: () => void; onEdit: (s: Supplier) => void; onPay: (s: Supplier) => void; onPO: (s: Supplier) => void }) {
  const { can } = usePermission()
  const { outletIds } = useScope()
  const pos = useStore((s) => s.purchaseOrders)
  const materials = useStore((s) => s.materials)
  if (!supplier) return null
  const history = pos.filter((p) => p.supplierId === supplier.id && outletIds.includes(p.outletId))
  const mats = materials.filter((m) => m.supplierId === supplier.id)
  const total = history.filter((p) => p.status !== 'Cancelled').reduce((s, p) => s + poTotal(p), 0)
  return (
    <Drawer open onClose={onClose} width={580} title={supplier.name} subtitle={`${supplier.code} · ${supplier.category}`}
      icon={<span className="flex size-9 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><Building2 className="size-4" /></span>}
      footer={<>
        <Button className="mr-auto" icon={<Phone className="size-3.5" />} onClick={() => toast.info(`Calling ${supplier.contact}`, supplier.phone + ' (simulated)')}>Call</Button>
        <Button icon={<Mail className="size-3.5" />} onClick={() => toast.success('Email sent', `To ${supplier.email} (simulated)`)}>Email</Button>
        {can('purchase', 'edit') && <Button icon={<Pencil className="size-3.5" />} onClick={() => onEdit(supplier)}>Edit</Button>}
        {can('purchase', 'create') && <Button icon={<ShoppingCart className="size-3.5" />} onClick={() => onPO(supplier)}>Create PO</Button>}
        <Button variant="primary" icon={<Wallet className="size-3.5" />} onClick={() => onPay(supplier)}>Record payment</Button>
      </>}>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-slate-200 p-2.5"><p className="text-[11px] text-slate-500">Purchases</p><p className="font-semibold tabular">{inr(total)}</p></div>
        <div className="rounded-lg border border-slate-200 p-2.5"><p className="text-[11px] text-slate-500">Outstanding</p><p className="font-semibold tabular text-rose-600">{inr(supplier.outstanding)}</p></div>
        <div className="rounded-lg border border-slate-200 p-2.5"><p className="text-[11px] text-slate-500">Rating</p><Stars value={supplier.rating} /></div>
      </div>
      <KeyValue className="mb-4 rounded-xl border border-slate-200 p-3" items={[
        ['Contact person', supplier.contact], ['Phone', supplier.phone], ['Email', supplier.email], ['City', supplier.city], ['GSTIN', supplier.gstin], ['Payment terms', supplier.terms],
      ]} />
      <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">Materials supplied ({mats.length})</p>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {mats.map((m) => <Badge key={m.id} tone="gray">{m.name} · {inr(m.cost)}/{m.unit}</Badge>)}
        {mats.length === 0 && <span className="text-[12px] text-slate-400">No materials mapped</span>}
      </div>
      <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">Purchase history</p>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        {history.length === 0 ? <EmptyState title="No purchase orders" body="No POs with this supplier for outlets in scope." /> : (
          <table className="w-full text-[12.5px]">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-2 py-1.5 text-left">PO</th><th className="px-2 py-1.5 text-left">Outlet</th><th className="px-2 py-1.5 text-left">Date</th><th className="px-2 py-1.5 text-right">Amount</th><th className="px-2 py-1.5 text-left">Status</th></tr></thead>
            <tbody>
              {history.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-mono text-[11.5px]">{p.no}<p className="font-sans text-[10.5px] text-slate-400">{p.items.length} items · {fmtQty(p.items.reduce((s, i) => s + i.qty, 0))} units</p></td>
                  <td className="px-2 py-1.5"><OutletChip id={p.outletId} /></td>
                  <td className="px-2 py-1.5 text-slate-500">{fmtDate(p.date)}</td>
                  <td className="px-2 py-1.5 text-right font-medium tabular">{inr(poTotal(p))}</td>
                  <td className="px-2 py-1.5"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Drawer>
  )
}

/* ------------------------------------------------------------------ Add / edit */
function SupplierModal({ open, supplier, onClose }: { open: boolean; supplier?: Supplier; onClose: () => void }) {
  if (!open) return null
  return <SupplierForm supplier={supplier} onClose={onClose} />
}
function SupplierForm({ supplier, onClose }: { supplier?: Supplier; onClose: () => void }) {
  const suppliers = useStore((s) => s.suppliers)
  const upsertSupplier = useStore((s) => s.upsertSupplier)
  const log = useStore((s) => s.log)
  const [f, setF] = useState<Supplier>(() => supplier ?? {
    id: uid('s'), code: 'SUP' + (101 + suppliers.length), name: '', contact: '', phone: '+91 ', email: '', gstin: '', category: 'Vegetables', city: '', rating: 4, outstanding: 0, terms: '15 days',
  })
  const set = <K extends keyof Supplier>(k: K, v: Supplier[K]) => setF((p) => ({ ...p, [k]: v }))
  const gstOk = !f.gstin || /^[0-9]{2}[A-Z0-9]{13}$/.test(f.gstin)
  const save = () => {
    if (!f.name.trim()) return toast.error('Supplier name is required')
    if (!gstOk) return toast.error('Invalid GSTIN', 'GSTIN must be 15 characters')
    upsertSupplier(f)
    log(`${supplier ? 'Updated' : 'Added'} supplier ${f.name}`, 'purchase', 'info')
    toast.success(supplier ? 'Supplier updated' : 'Supplier added', f.name)
    onClose()
  }
  return (
    <Modal open onClose={onClose} title={supplier ? 'Edit supplier' : 'Add supplier'} subtitle={f.code} icon={<Truck />}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{supplier ? 'Save changes' : 'Add supplier'}</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Supplier / firm name" required className="col-span-2"><Input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Category">
          <Input list="rf-sup-cats" value={f.category} onChange={(e) => set('category', e.target.value)} />
          <datalist id="rf-sup-cats">{[...new Set(suppliers.map((s) => s.category))].map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="City"><Input value={f.city} onChange={(e) => set('city', e.target.value)} /></Field>
        <Field label="Contact person"><Input value={f.contact} onChange={(e) => set('contact', e.target.value)} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="GSTIN" error={gstOk ? undefined : '15-character GSTIN expected'}><Input value={f.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} /></Field>
        <Field label="Payment terms"><Select value={f.terms} onChange={(e) => set('terms', e.target.value)}>{['Immediate', '7 days', '15 days', '30 days', '45 days'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Rating"><Select value={f.rating} onChange={(e) => set('rating', Number(e.target.value))}>{[5, 4.5, 4, 3.5, 3, 2.5, 2].map((r) => <option key={r} value={r}>{r} ★</option>)}</Select></Field>
        <Field label="Opening outstanding (₹)"><Input type="number" min={0} value={f.outstanding} onChange={(e) => set('outstanding', Number(e.target.value))} /></Field>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ Payment (simulated) */
function PaymentModal({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  if (!supplier) return null
  return <PaymentForm supplier={supplier} onClose={onClose} />
}
function PaymentForm({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const upsertSupplier = useStore((s) => s.upsertSupplier)
  const log = useStore((s) => s.log)
  const live = useStore((s) => s.suppliers.find((x) => x.id === supplier.id)) ?? supplier
  const [amt, setAmt] = useState(String(live.outstanding))
  const [mode, setMode] = useState('NEFT')
  const [ref, setRef] = useState('UTR' + Math.floor(1e9 + Math.random() * 9e9))
  const a = Number(amt) || 0
  const save = () => {
    if (a <= 0) return toast.error('Enter an amount')
    upsertSupplier({ ...live, outstanding: Math.max(0, live.outstanding - a) })
    log(`Payment ${inr(a)} recorded to ${live.name} via ${mode} (${ref})`, 'purchase', 'success')
    toast.success('Payment recorded', `${inr(a)} to ${live.name} via ${mode} · simulated`)
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="sm" title="Record payment" subtitle={live.name} icon={<Wallet />}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="success" onClick={save}>Record {inr(a)}</Button></>}>
      <div className="space-y-3">
        <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-[12.5px]"><span className="text-slate-500">Outstanding</span><b className="text-rose-600">{inr(live.outstanding)}</b></div>
        <Field label="Amount (₹)"><Input type="number" autoFocus value={amt} onChange={(e) => setAmt(e.target.value)} /></Field>
        <Field label="Mode"><Segmented className="w-full" value={mode} onChange={setMode} items={['NEFT', 'RTGS', 'UPI', 'Cheque', 'Cash'].map((m) => ({ value: m, label: m }))} /></Field>
        <Field label="Reference / UTR"><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
        <p className="text-[11.5px] text-slate-500">Balance after payment: <b className="text-slate-800">{inr(Math.max(0, live.outstanding - a))}</b></p>
      </div>
    </Modal>
  )
}
