import { useMemo, useState } from 'react'
import { ClipboardList, PackageCheck, Plus, Trash2, Undo2, Sparkles } from 'lucide-react'
import type { PurchaseOrder } from '@/types'
import { useStore } from '@/store/useStore'
import { useCurrentUser, useScope } from '@/store/hooks'
import { toast } from '@/store/toast'
import { Modal, Button, Field, Input, Select, Textarea, Checkbox, Badge } from '@/components/ui'
import { cn, inr, isoDate, uid } from '@/lib/format'
import { GST_RATE, fmtQty, poSubtotal, stockStatus } from './shared'

export interface POPrefill { supplierId?: string; outletId?: string; lines?: { materialId: string; qty: number }[] }

/* ------------------------------------------------------------------ New purchase order */
export function NewPOModal(props: { open: boolean; onClose: () => void; prefill?: POPrefill; onCreated?: (po: PurchaseOrder) => void }) {
  if (!props.open) return null
  return <NewPOInner {...props} />
}
type Line = { key: string; materialId: string; qty: number; rate: number }
function NewPOInner({ onClose, prefill, onCreated }: { onClose: () => void; prefill?: POPrefill; onCreated?: (po: PurchaseOrder) => void }) {
  const suppliers = useStore((s) => s.suppliers)
  const materials = useStore((s) => s.materials)
  const outlets = useStore((s) => s.outlets)
  const seq = useStore((s) => s.seq.po)
  const upsertPO = useStore((s) => s.upsertPO)
  const log = useStore((s) => s.log)
  const notify = useStore((s) => s.notify)
  const user = useCurrentUser()
  const { outletIds } = useScope()
  const matById = useMemo(() => Object.fromEntries(materials.map((m) => [m.id, m])), [materials])
  const [supplierId, setSupplierId] = useState(prefill?.supplierId ?? suppliers[0]?.id ?? '')
  const [outletId, setOutletId] = useState(prefill?.outletId && outletIds.includes(prefill.outletId) ? prefill.outletId : outletIds[0])
  const [expected, setExpected] = useState(isoDate(new Date(Date.now() + 2 * 864e5)))
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<Line[]>(() => (prefill?.lines ?? []).map((l) => ({ key: uid('l'), materialId: l.materialId, qty: l.qty, rate: matById[l.materialId]?.cost ?? 0 })))

  const supMats = materials.filter((m) => m.supplierId === supplierId)
  const suggestions = supMats.filter((m) => !lines.some((l) => l.materialId === m.id))
  const addLine = (materialId?: string) => {
    const m = materialId ? matById[materialId] : suggestions[0] ?? materials[0]
    if (!m) return
    const cur = m.stock[outletId] ?? 0
    setLines((p) => [...p, { key: uid('l'), materialId: m.id, qty: Math.max(1, Math.ceil(m.min * 2 - cur)), rate: m.cost }])
  }
  const upd = (key: string, patch: Partial<Line>) => setLines((p) => p.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  const sub = poSubtotal({ items: lines })
  const gst = sub * GST_RATE

  const save = (status: PurchaseOrder['status']) => {
    if (!supplierId) return toast.error('Select a supplier')
    const items = lines.filter((l) => l.qty > 0)
    if (!items.length) return toast.error('Add at least one line item')
    const po: PurchaseOrder = {
      id: uid('po'), no: 'PO/25-26/' + seq, supplierId, outletId, date: isoDate(), expected, status, createdBy: user.name, note: note || undefined,
      items: items.map((l) => ({ materialId: l.materialId, qty: l.qty, rate: l.rate, received: 0 })),
    }
    upsertPO(po)
    const sup = suppliers.find((s) => s.id === supplierId)
    log(`Created purchase order ${po.no} for ${sup?.name} (${inr(sub + gst)})`, 'purchase', 'info', outletId)
    if (status === 'Pending Approval') notify({ title: `PO ${po.no} awaiting approval`, body: `${sup?.name} · ${inr(sub + gst)}`, type: 'approval', link: '/inventory/purchases' })
    toast.success(status === 'Draft' ? 'Draft saved' : 'Purchase order submitted', `${po.no} · ${inr(sub + gst)}`)
    onCreated?.(po)
    onClose()
  }

  return (
    <Modal open onClose={onClose} size="xl" title="New purchase order" subtitle={`PO/25-26/${seq} · raised by ${user.name}`} icon={<ClipboardList />}
      footer={
        <>
          <div className="mr-auto text-[12.5px] text-slate-500">{lines.length} items · Total <b className="text-slate-900">{inr(sub + gst)}</b></div>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={() => save('Draft')}>Save draft</Button>
          <Button variant="primary" onClick={() => save('Pending Approval')}>Submit for approval</Button>
        </>
      }>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Field label="Supplier" required className="sm:col-span-2">
          <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.category}</option>)}
          </Select>
        </Field>
        <Field label="Deliver to outlet">
          <Select value={outletId} onChange={(e) => setOutletId(e.target.value)}>
            {outlets.filter((o) => outletIds.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{o.short}</option>)}
          </Select>
        </Field>
        <Field label="Expected delivery"><Input type="date" value={expected} min={isoDate()} onChange={(e) => setExpected(e.target.value)} /></Field>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-3 rounded-lg border border-brand-100 bg-brand-50/50 p-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-brand-700"><Sparkles className="size-3.5" />Materials supplied by this vendor — click to add</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((m) => {
              const st = stockStatus(m.stock[outletId] ?? 0, m.min)
              return (
                <button key={m.id} onClick={() => addLine(m.id)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11.5px] text-slate-700 hover:border-brand-300">
                  <Plus className="size-3" />{m.name}
                  {st !== 'In Stock' && <span className={cn('size-1.5 rounded-full', st === 'Low Stock' ? 'bg-amber-500' : 'bg-rose-500')} title={st} />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-[12.5px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr><th className="px-2 py-2 text-left">Material</th><th className="px-2 py-2 text-right">In stock</th><th className="w-24 px-2 py-2 text-right">Qty</th><th className="w-28 px-2 py-2 text-right">Rate (₹)</th><th className="px-2 py-2 text-right">Amount</th><th className="w-8" /></tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const m = matById[l.materialId]
              return (
                <tr key={l.key} className="border-t border-slate-100">
                  <td className="px-2 py-1.5">
                    <Select value={l.materialId} onChange={(e) => upd(l.key, { materialId: e.target.value, rate: matById[e.target.value]?.cost ?? 0 })}>
                      {supMats.length > 0 && <optgroup label="This supplier">{supMats.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.unit})</option>)}</optgroup>}
                      <optgroup label="All materials">{materials.filter((x) => x.supplierId !== supplierId).map((x) => <option key={x.id} value={x.id}>{x.name} ({x.unit})</option>)}</optgroup>
                    </Select>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular text-slate-500">{m ? `${fmtQty(m.stock[outletId] ?? 0)} ${m.unit}` : '—'}</td>
                  <td className="px-2 py-1.5"><Input type="number" min={0} className="text-right" value={l.qty || ''} onChange={(e) => upd(l.key, { qty: Number(e.target.value) })} /></td>
                  <td className="px-2 py-1.5"><Input type="number" min={0} className="text-right" value={l.rate || ''} onChange={(e) => upd(l.key, { rate: Number(e.target.value) })} /></td>
                  <td className="px-2 py-1.5 text-right font-medium tabular">{inr(l.qty * l.rate)}</td>
                  <td className="px-1"><button onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="size-3.5" /></button></td>
                </tr>
              )
            })}
            {lines.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No items yet — add from suggestions or use “Add line”.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => addLine()}>Add line</Button>
        <div className="w-60 space-y-1 text-[12.5px]">
          <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="tabular">{inr(sub, true)}</span></div>
          <div className="flex justify-between text-slate-500"><span>CGST 2.5%</span><span className="tabular">{inr(gst / 2, true)}</span></div>
          <div className="flex justify-between text-slate-500"><span>SGST 2.5%</span><span className="tabular">{inr(gst / 2, true)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 text-[14px] font-semibold text-slate-900"><span>Total</span><span className="tabular">{inr(sub + gst, true)}</span></div>
        </div>
      </div>
      <Field label="Notes to supplier" className="mt-2"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Delivery window, quality specs…" /></Field>
    </Modal>
  )
}

/* ------------------------------------------------------------------ GRN (receive goods) */
export function GRNModal(props: { po: PurchaseOrder | null; onClose: () => void }) {
  if (!props.po) return null
  return <GRNInner po={props.po} onClose={props.onClose} />
}
function GRNInner({ po, onClose }: { po: PurchaseOrder; onClose: () => void }) {
  const materials = useStore((s) => s.materials)
  const receivePO = useStore((s) => s.receivePO)
  const adjustStock = useStore((s) => s.adjustStock)
  const upsertPO = useStore((s) => s.upsertPO)
  const upsertMaterial = useStore((s) => s.upsertMaterial)
  const log = useStore((s) => s.log)
  const matById = useMemo(() => Object.fromEntries(materials.map((m) => [m.id, m])), [materials])
  const [rows, setRows] = useState(() => po.items.map((it, i) => ({
    materialId: it.materialId, ordered: it.qty, prev: it.received ?? 0, now: Math.max(0, it.qty - (it.received ?? 0)),
    batch: 'B' + po.no.slice(-4) + '-' + (i + 1), expiry: matById[it.materialId]?.expiry ?? '',
  })))
  const upd = (i: number, patch: Partial<(typeof rows)[number]>) => setRows((p) => p.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const value = rows.reduce((s, r, i) => s + r.now * po.items[i].rate, 0)
  const confirm = () => {
    if (rows.every((r) => r.now <= 0)) return toast.error('Enter received quantities')
    const full = rows.every((r) => r.prev + r.now >= r.ordered)
    rows.forEach((r) => { const m = matById[r.materialId]; if (m && r.expiry && r.expiry !== m.expiry) upsertMaterial({ ...m, expiry: r.expiry }) })
    if (full) {
      receivePO(po.id)
      toast.success('Goods received – stock updated', `${po.no} fully received · ${inr(value)}`)
    } else {
      const grn = po.grnNo ?? 'GRN/' + Math.floor(900 + Math.random() * 99)
      rows.forEach((r) => r.now > 0 && adjustStock(r.materialId, po.outletId, r.now, 'Purchase', grn))
      upsertPO({ ...po, status: 'Partially Received', grnNo: grn, items: po.items.map((it, i) => ({ ...it, received: Math.min(it.qty, rows[i].prev + rows[i].now) })) })
      log(`Partial goods receipt against ${po.no} (${grn})`, 'purchase', 'info', po.outletId)
      toast.success('Partial receipt recorded', `${grn} · ${inr(value)} added to stock`)
    }
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="lg" title="Goods Receipt Note (GRN)" subtitle={`Against ${po.no}`} icon={<PackageCheck />}
      footer={<><div className="mr-auto text-[12.5px] text-slate-500">Receiving value <b className="text-slate-900">{inr(value)}</b> (excl. GST)</div><Button onClick={onClose}>Cancel</Button><Button variant="success" onClick={confirm}>Confirm receipt</Button></>}>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-[12.5px]">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr><th className="px-2 py-2 text-left">Material</th><th className="px-2 py-2 text-right">Ordered</th><th className="px-2 py-2 text-right">Prev. recd</th><th className="w-24 px-2 py-2 text-right">Receiving</th><th className="w-32 px-2 py-2 text-left">Batch no.</th><th className="w-36 px-2 py-2 text-left">Expiry</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const m = matById[r.materialId]
              const short = r.prev + r.now < r.ordered
              return (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-2 py-1.5"><p className="font-medium text-slate-800">{m?.name}</p><p className="text-[11px] text-slate-400">{m?.code} · {inr(po.items[i].rate)}/{m?.unit}</p></td>
                  <td className="px-2 py-1.5 text-right tabular">{fmtQty(r.ordered)} {m?.unit}</td>
                  <td className="px-2 py-1.5 text-right tabular text-slate-500">{fmtQty(r.prev)}</td>
                  <td className="px-2 py-1.5"><Input type="number" min={0} max={r.ordered - r.prev} className={cn('text-right', short && 'ring-1 ring-amber-300 rounded-lg')} value={r.now} onChange={(e) => upd(i, { now: Math.max(0, Math.min(r.ordered - r.prev, Number(e.target.value))) })} /></td>
                  <td className="px-2 py-1.5"><Input value={r.batch} onChange={(e) => upd(i, { batch: e.target.value })} /></td>
                  <td className="px-2 py-1.5"><Input type="date" value={r.expiry} onChange={(e) => upd(i, { expiry: e.target.value })} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11.5px] text-slate-500">Short-received lines keep the PO in <Badge tone="blue">Partially Received</Badge>. Stock is posted to the receiving outlet instantly.</p>
    </Modal>
  )
}

/* ------------------------------------------------------------------ Purchase return */
const REASONS = ['Damaged in transit', 'Quality not as per spec', 'Expired / near expiry', 'Excess supply', 'Wrong item delivered']
export function ReturnModal(props: { po: PurchaseOrder | null; onClose: () => void }) {
  if (!props.po) return null
  return <ReturnInner po={props.po} onClose={props.onClose} />
}
function ReturnInner({ po, onClose }: { po: PurchaseOrder; onClose: () => void }) {
  const materials = useStore((s) => s.materials)
  const suppliers = useStore((s) => s.suppliers)
  const adjustStock = useStore((s) => s.adjustStock)
  const upsertPO = useStore((s) => s.upsertPO)
  const upsertSupplier = useStore((s) => s.upsertSupplier)
  const log = useStore((s) => s.log)
  const matById = useMemo(() => Object.fromEntries(materials.map((m) => [m.id, m])), [materials])
  const lines = po.items.filter((i) => (i.received ?? 0) > 0)
  const [sel, setSel] = useState<Record<string, { on: boolean; qty: number }>>(() => Object.fromEntries(lines.map((l) => [l.materialId, { on: false, qty: Math.max(1, Math.round((l.received ?? 0) * 0.1 * 10) / 10) }])))
  const [reason, setReason] = useState(REASONS[0])
  const [remarks, setRemarks] = useState('')
  const chosen = lines.filter((l) => sel[l.materialId]?.on && sel[l.materialId].qty > 0)
  const value = chosen.reduce((s, l) => s + sel[l.materialId].qty * l.rate, 0) * (1 + GST_RATE)
  const confirm = () => {
    if (!chosen.length) return toast.error('Select at least one line to return')
    const ref = 'PRN/' + po.no.slice(-4)
    chosen.forEach((l) => adjustStock(l.materialId, po.outletId, -sel[l.materialId].qty, 'Return', ref))
    const summary = chosen.map((l) => `${matById[l.materialId]?.name} ×${sel[l.materialId].qty}`).join(', ')
    upsertPO({ ...po, status: 'Returned', note: `Returned (${reason}): ${summary}${remarks ? ' — ' + remarks : ''}` })
    const sup = suppliers.find((s) => s.id === po.supplierId)
    if (sup) upsertSupplier({ ...sup, outstanding: Math.max(0, sup.outstanding - Math.round(value)) })
    log(`Purchase return ${ref} against ${po.no}: ${summary}`, 'purchase', 'warning', po.outletId)
    toast.success('Purchase return posted', `${ref} · debit note ${inr(value)} raised on ${sup?.name}`)
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="md" title="Purchase return" subtitle={`Against ${po.no}`} icon={<Undo2 />}
      footer={<><div className="mr-auto text-[12.5px] text-slate-500">Debit note <b className="text-slate-900">{inr(value)}</b></div><Button onClick={onClose}>Cancel</Button><Button variant="danger" onClick={confirm}>Post return</Button></>}>
      <div className="space-y-2">
        {lines.map((l) => {
          const m = matById[l.materialId]
          const s = sel[l.materialId]
          return (
            <div key={l.materialId} className={cn('flex items-center gap-3 rounded-lg border px-3 py-2', s.on ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200')}>
              <Checkbox checked={s.on} onChange={(v) => setSel((p) => ({ ...p, [l.materialId]: { ...p[l.materialId], on: v } }))} />
              <div className="min-w-0 flex-1"><p className="font-medium text-slate-800">{m?.name}</p><p className="text-[11px] text-slate-400">Received {fmtQty(l.received ?? 0)} {m?.unit} @ {inr(l.rate)}</p></div>
              <Input type="number" className="w-24 text-right" min={0} max={l.received} disabled={!s.on} value={s.qty}
                onChange={(e) => setSel((p) => ({ ...p, [l.materialId]: { ...p[l.materialId], qty: Math.max(0, Math.min(l.received ?? 0, Number(e.target.value))) } }))} suffix={m?.unit} />
            </div>
          )
        })}
        {lines.length === 0 && <p className="py-4 text-center text-slate-400">Nothing received on this PO yet.</p>}
        <Field label="Reason"><Select value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((r) => <option key={r}>{r}</option>)}</Select></Field>
        <Field label="Remarks"><Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}
