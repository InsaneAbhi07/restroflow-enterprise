import { useMemo, useState } from 'react'
import { PackagePlus, SlidersHorizontal, PackageOpen, History, Minus, Plus } from 'lucide-react'
import type { Material, StockMovement } from '@/types'
import { useStore } from '@/store/useStore'
import { useScope } from '@/store/hooks'
import { toast } from '@/store/toast'
import { Modal, Drawer, Button, Field, Input, Select, Segmented, Textarea, Badge, EmptyState, StatusBadge, DataTable, FilterBar, SearchInput, type Column } from '@/components/ui'
import { cn, fmtDateTime, inr, isoDate, timeAgo, uid } from '@/lib/format'
import { MoveBadge, OutletChip, fmtQty, stockStatus, qtyIn } from './shared'

/* ------------------------------------------------------------------ Stock adjustment */
type AdjType = 'Adjustment' | 'Wastage' | 'Return'
export function AdjustStockModal(props: { material: Material | null; onClose: () => void; outletId?: string }) {
  if (!props.material) return null
  return <AdjustInner {...props} material={props.material} />
}
function AdjustInner({ material, onClose, outletId }: { material: Material; onClose: () => void; outletId?: string }) {
  const { outletIds } = useScope()
  const outlets = useStore((s) => s.outlets)
  const adjustStock = useStore((s) => s.adjustStock)
  const log = useStore((s) => s.log)
  const live = useStore((s) => s.materials.find((m) => m.id === material.id)) ?? material
  const [outlet, setOutlet] = useState(outletId ?? outletIds[0])
  const [type, setType] = useState<AdjType>('Adjustment')
  const [dir, setDir] = useState<1 | -1>(-1)
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const sign = type === 'Adjustment' ? dir : -1
  const cur = live.stock[outlet] ?? 0
  const q = Number(qty) || 0
  const next = Math.max(0, cur + sign * q)
  const err = q <= 0 ? 'Enter a quantity' : sign < 0 && q > cur ? `Only ${fmtQty(cur)} ${live.unit} available` : ''
  const save = () => {
    if (err) return toast.error('Cannot adjust', err)
    adjustStock(live.id, outlet, sign * q, type, reason.trim() || (type === 'Adjustment' ? 'Physical count' : type))
    log(`${type}: ${live.name} ${sign > 0 ? '+' : '−'}${fmtQty(q)} ${live.unit}${reason ? ' — ' + reason : ''}`, 'inventory', type === 'Wastage' ? 'warning' : 'info', outlet)
    toast.success('Stock updated', `${live.name}: ${fmtQty(cur)} → ${fmtQty(next)} ${live.unit}`)
    onClose()
  }
  return (
    <Modal open onClose={onClose} title="Stock adjustment" subtitle={`${live.name} · ${live.code}`} icon={<SlidersHorizontal />} size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={!!err}>Save adjustment</Button></>}>
      <div className="space-y-3">
        <Field label="Outlet">
          <Select value={outlet} onChange={(e) => setOutlet(e.target.value)}>
            {outlets.filter((o) => outletIds.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </Field>
        <Field label="Adjustment type">
          <Segmented className="w-full" value={type} onChange={setType} items={[{ value: 'Adjustment', label: 'Adjustment' }, { value: 'Wastage', label: 'Wastage' }, { value: 'Return', label: 'Return' }]} />
        </Field>
        <div className="grid grid-cols-[auto_1fr] items-end gap-2">
          <Field label="Direction">
            <Segmented value={type === 'Adjustment' ? (dir > 0 ? 'in' : 'out') : 'out'} onChange={(v) => type === 'Adjustment' && setDir(v === 'in' ? 1 : -1)}
              items={[{ value: 'in', label: <Plus className="size-3.5" /> }, { value: 'out', label: <Minus className="size-3.5" /> }]} />
          </Field>
          <Field label={`Quantity (${live.unit})`}>
            <Input type="number" min={0} step="0.1" autoFocus value={qty} onChange={(e) => setQty(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
          </Field>
        </div>
        <Field label="Reason">
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={type === 'Wastage' ? 'e.g. Spoiled / expired, spillage' : type === 'Return' ? 'e.g. Returned to supplier – damaged' : 'e.g. Physical stock count variance'} />
        </Field>
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[12.5px]">
          <span className="text-slate-500">Current → After</span>
          <span className="font-semibold tabular">
            {fmtQty(cur)} → <span className={cn(sign > 0 ? 'text-emerald-600' : 'text-rose-600')}>{fmtQty(next)}</span> {live.unit}
            <span className="ml-2 font-normal text-slate-400">({sign > 0 ? '+' : '−'}{inr(q * live.cost)})</span>
          </span>
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ Quick inward */
export function AddStockModal(props: { material: Material | null; onClose: () => void; outletId?: string }) {
  if (!props.material) return null
  return <AddStockInner {...props} material={props.material} />
}
function AddStockInner({ material, onClose, outletId }: { material: Material; onClose: () => void; outletId?: string }) {
  const { outletIds } = useScope()
  const outlets = useStore((s) => s.outlets)
  const adjustStock = useStore((s) => s.adjustStock)
  const log = useStore((s) => s.log)
  const [outlet, setOutlet] = useState(outletId ?? outletIds[0])
  const [qty, setQty] = useState('')
  const [ref, setRef] = useState('INV-' + Math.floor(10000 + Math.random() * 89999))
  const q = Number(qty) || 0
  const save = () => {
    if (q <= 0) return toast.error('Enter a quantity')
    adjustStock(material.id, outlet, q, 'Purchase', ref || 'Quick inward')
    log(`Stock inward: ${material.name} +${fmtQty(q)} ${material.unit} (${ref})`, 'inventory', 'success', outlet)
    toast.success('Stock added', `${material.name} +${fmtQty(q)} ${material.unit}`)
    onClose()
  }
  return (
    <Modal open onClose={onClose} title="Add stock (quick inward)" subtitle={`${material.name} · ${material.code}`} icon={<PackagePlus />} size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="accent" onClick={save}>Add stock</Button></>}>
      <div className="space-y-3">
        <Field label="Outlet">
          <Select value={outlet} onChange={(e) => setOutlet(e.target.value)}>
            {outlets.filter((o) => outletIds.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Quantity (${material.unit})`}><Input type="number" min={0} autoFocus value={qty} onChange={(e) => setQty(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} /></Field>
          <Field label="Invoice / ref no."><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
        </div>
        <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-[12.5px]">
          <span className="text-slate-500">Current stock: <b className="text-slate-800">{fmtQty(material.stock[outlet] ?? 0)} {material.unit}</b></span>
          <span className="text-slate-500">Value: <b className="text-slate-800">{inr(q * material.cost)}</b></span>
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ Add / edit material */
export function MaterialModal(props: { open: boolean; material?: Material | null; onClose: () => void }) {
  if (!props.open) return null
  return <MaterialInner {...props} />
}
function MaterialInner({ material, onClose }: { material?: Material | null; onClose: () => void }) {
  const materials = useStore((s) => s.materials)
  const suppliers = useStore((s) => s.suppliers)
  const outlets = useStore((s) => s.outlets)
  const { outletIds } = useScope()
  const upsertMaterial = useStore((s) => s.upsertMaterial)
  const log = useStore((s) => s.log)
  const cats = useMemo(() => [...new Set(materials.map((m) => m.category))], [materials])
  const [f, setF] = useState<Material>(() => material ?? {
    id: uid('rm'), code: 'RM' + (201 + materials.length), name: '', category: cats[0] ?? 'Vegetables', unit: 'kg', min: 5, cost: 0,
    stock: Object.fromEntries(outlets.map((o) => [o.id, 0])), supplierId: suppliers[0]?.id,
  })
  const set = <K extends keyof Material>(k: K, v: Material[K]) => setF((p) => ({ ...p, [k]: v }))
  const save = () => {
    if (!f.name.trim()) return toast.error('Material name is required')
    if (f.cost <= 0) return toast.error('Enter a valid unit cost')
    upsertMaterial({ ...f, name: f.name.trim() })
    log(`${material ? 'Updated' : 'Added'} raw material ${f.name}`, 'inventory', 'info')
    toast.success(material ? 'Material updated' : 'Material added', f.name)
    onClose()
  }
  return (
    <Modal open onClose={onClose} title={material ? 'Edit material' : 'Add raw material'} subtitle={f.code} icon={<PackageOpen />} size="md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{material ? 'Save changes' : 'Add material'}</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Material name" required className="col-span-2"><Input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Paneer" /></Field>
        <Field label="Code"><Input value={f.code} onChange={(e) => set('code', e.target.value)} /></Field>
        <Field label="Category">
          <Input list="rf-mat-cats" value={f.category} onChange={(e) => set('category', e.target.value)} />
          <datalist id="rf-mat-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Unit">
          <Select value={f.unit} onChange={(e) => set('unit', e.target.value)}>
            {['kg', 'ltr', 'pcs', 'tray', 'case', 'pkt', 'gm', 'ml'].map((u) => <option key={u}>{u}</option>)}
          </Select>
        </Field>
        <Field label="Unit cost (₹)" required><Input type="number" min={0} value={f.cost || ''} onChange={(e) => set('cost', Number(e.target.value))} /></Field>
        <Field label="Minimum stock (per outlet)"><Input type="number" min={0} value={f.min} onChange={(e) => set('min', Number(e.target.value))} /></Field>
        <Field label="Preferred supplier">
          <Select value={f.supplierId ?? ''} onChange={(e) => set('supplierId', e.target.value || undefined)}>
            <option value="">— None —</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Expiry / best before" hint="Optional – for perishables"><Input type="date" value={f.expiry ?? ''} min={isoDate()} onChange={(e) => set('expiry', e.target.value || undefined)} /></Field>
        {!material && (
          <div className="col-span-2">
            <p className="mb-1.5 text-[11.5px] font-medium text-slate-600">Opening stock</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {outlets.filter((o) => outletIds.includes(o.id)).map((o) => (
                <Field key={o.id} label={<OutletChip id={o.id} />}>
                  <Input type="number" min={0} value={f.stock[o.id] || ''} suffix={f.unit} onChange={(e) => set('stock', { ...f.stock, [o.id]: Number(e.target.value) })} />
                </Field>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ Movement history drawer */
export function MovementDrawer({ material, onClose, onAdjust }: { material: Material | null; onClose: () => void; onAdjust?: (m: Material) => void }) {
  const { outletIds } = useScope()
  const movements = useStore((s) => s.movements)
  const live = useStore((s) => s.materials.find((m) => m.id === material?.id))
  const rows = useMemo(() => (material ? movements.filter((mv) => mv.materialId === material.id && outletIds.includes(mv.outletId)) : []), [movements, material, outletIds])
  if (!material || !live) return null
  const inQ = rows.filter((r) => r.qty > 0).reduce((s, r) => s + r.qty, 0)
  const outQ = rows.filter((r) => r.qty < 0).reduce((s, r) => s - r.qty, 0)
  return (
    <Drawer open onClose={onClose} width={520} title={live.name} subtitle={`${live.code} · ${live.category} · ${inr(live.cost)}/${live.unit}`}
      icon={<span className="flex size-9 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><History className="size-4" /></span>}
      footer={onAdjust && <Button variant="primary" icon={<SlidersHorizontal className="size-3.5" />} onClick={() => onAdjust(live)}>Adjust stock</Button>}>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {outletIds.map((id) => {
          const q = live.stock[id] ?? 0
          return (
            <div key={id} className="rounded-lg border border-slate-200 p-2.5">
              <div className="flex items-center justify-between"><OutletChip id={id} /><StatusBadge status={stockStatus(q, live.min)} /></div>
              <p className="mt-1.5 text-[16px] font-semibold tabular text-slate-900">{fmtQty(q)} <span className="text-[11px] font-normal text-slate-400">{live.unit} · min {live.min}</span></p>
            </div>
          )
        })}
      </div>
      <div className="mb-3 flex gap-2 text-[12px]">
        <Badge tone="green">In: +{fmtQty(inQ)} {live.unit}</Badge>
        <Badge tone="red">Out: −{fmtQty(outQ)} {live.unit}</Badge>
        <Badge tone="gray">Total in scope: {fmtQty(qtyIn(live, outletIds))} {live.unit}</Badge>
      </div>
      {rows.length === 0 ? <EmptyState icon={<History />} title="No movements yet" body="Purchases, consumption, transfers and adjustments will appear here." /> : (
        <ol className="relative space-y-0 border-l border-slate-200 pl-4">
          {rows.map((mv) => (
            <li key={mv.id} className="relative pb-3">
              <span className={cn('absolute -left-[21px] top-1.5 size-2.5 rounded-full ring-4 ring-white', mv.qty > 0 ? 'bg-emerald-500' : 'bg-rose-500')} />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5"><MoveBadge type={mv.type} /><OutletChip id={mv.outletId} /></div>
                  <p className="mt-1 truncate text-[12px] text-slate-500">Ref: <span className="font-medium text-slate-700">{mv.ref}</span> · by {mv.by}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn('text-[13px] font-semibold tabular', mv.qty > 0 ? 'text-emerald-600' : 'text-rose-600')}>{mv.qty > 0 ? '+' : ''}{fmtQty(mv.qty)} {live.unit}</p>
                  <p className="text-[11px] text-slate-400" title={fmtDateTime(mv.at)}>{timeAgo(mv.at)}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Drawer>
  )
}

/* ------------------------------------------------------------------ Global movement log */
const TYPES: (StockMovement['type'] | 'All')[] = ['All', 'Purchase', 'Consumption', 'Adjustment', 'Transfer In', 'Transfer Out', 'Wastage', 'Return']
export function MovementLog({ outletIds, onOpen }: { outletIds: string[]; onOpen: (m: Material) => void }) {
  const movements = useStore((s) => s.movements)
  const materials = useStore((s) => s.materials)
  const [type, setType] = useState<(typeof TYPES)[number]>('All')
  const [q, setQ] = useState('')
  const mat = useMemo(() => Object.fromEntries(materials.map((m) => [m.id, m])), [materials])
  type Row = StockMovement & { m?: Material }
  const rows: Row[] = useMemo(() => movements
    .filter((mv) => outletIds.includes(mv.outletId) && (type === 'All' || mv.type === type))
    .map((mv) => ({ ...mv, m: mat[mv.materialId] }))
    .filter((r) => !q || r.m?.name.toLowerCase().includes(q.toLowerCase()) || r.ref.toLowerCase().includes(q.toLowerCase())), [movements, outletIds, type, q, mat])
  const cols: Column<Row>[] = [
    { key: 'at', header: 'Time', render: (r) => <span className="whitespace-nowrap text-slate-500">{fmtDateTime(r.at)}</span> },
    { key: 'mat', header: 'Material', sortValue: (r) => r.m?.name ?? '', render: (r) => <div><p className="font-medium text-slate-800">{r.m?.name ?? r.materialId}</p><p className="text-[11px] text-slate-400">{r.m?.code}</p></div> },
    { key: 'type', header: 'Type', render: (r) => <MoveBadge type={r.type} /> },
    { key: 'outletId', header: 'Outlet', render: (r) => <OutletChip id={r.outletId} /> },
    { key: 'qty', header: 'Qty', align: 'right', render: (r) => <span className={cn('font-semibold', r.qty > 0 ? 'text-emerald-600' : 'text-rose-600')}>{r.qty > 0 ? '+' : ''}{fmtQty(r.qty)} {r.m?.unit}</span> },
    { key: 'val', header: 'Value', align: 'right', sortValue: (r) => Math.abs(r.qty) * (r.m?.cost ?? 0), render: (r) => inr(Math.abs(r.qty) * (r.m?.cost ?? 0)) },
    { key: 'ref', header: 'Reference', render: (r) => <span className="font-mono text-[11.5px] text-slate-600">{r.ref}</span> },
    { key: 'by', header: 'By' },
  ]
  return (
    <>
      <FilterBar>
        <SearchInput className="w-60" placeholder="Search material or reference…" value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} />
        <div className="flex flex-wrap gap-1">
          {TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)} className={cn('rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium transition', type === t ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>{t}</button>
          ))}
        </div>
        <span className="ml-auto text-[11.5px] text-slate-400">{rows.length} movements</span>
      </FilterBar>
      <DataTable columns={cols} rows={rows} dense pageSize={15} onRowClick={(r) => r.m && onOpen(r.m)} />
    </>
  )
}
