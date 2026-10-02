import { useMemo, useState } from 'react'
import { ArrowLeftRight, ArrowRight, ArrowLeft, Plus, Trash2, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react'
import type { StockTransfer } from '@/types'
import { useStore } from '@/store/useStore'
import { useCurrentUser, useScope } from '@/store/hooks'
import { toast } from '@/store/toast'
import { useShortcut } from '@/lib/shortcuts'
import { Modal, Button, Stepper, Field, Select, Input, Kbd } from '@/components/ui'
import { cn, inr, uid } from '@/lib/format'
import { OutletChip, fmtQty, stockStatus } from './shared'

const STEPS = ['Source & destination', 'Items & quantities', 'Review', 'Submitted']

export function TransferWizard(props: { open: boolean; onClose: () => void; onView: (t: StockTransfer) => void }) {
  if (!props.open) return null
  return <Wizard {...props} />
}
type Line = { key: string; materialId: string; qty: number }

function Wizard({ onClose, onView }: { onClose: () => void; onView: (t: StockTransfer) => void }) {
  const outlets = useStore((s) => s.outlets)
  const materials = useStore((s) => s.materials)
  const createTransfer = useStore((s) => s.createTransfer)
  const notify = useStore((s) => s.notify)
  const user = useCurrentUser()
  const { allowed } = useScope()
  const matById = useMemo(() => Object.fromEntries(materials.map((m) => [m.id, m])), [materials])
  const [step, setStep] = useState(0)
  const [from, setFrom] = useState(allowed[0])
  const [to, setTo] = useState(outlets.find((o) => o.id !== allowed[0])?.id ?? '')
  const [lines, setLines] = useState<Line[]>([])
  const [note, setNote] = useState('')
  const [created, setCreated] = useState<StockTransfer | null>(null)

  const errs = lines.map((l) => {
    const avail = matById[l.materialId]?.stock[from] ?? 0
    if (!l.qty || l.qty <= 0) return 'Enter qty'
    if (l.qty > avail) return `Max ${fmtQty(avail)}`
    return ''
  })
  const dup = new Set(lines.map((l) => l.materialId)).size !== lines.length
  const stepError = step === 0 ? (!from || !to ? 'Select both outlets' : from === to ? 'Source and destination must differ' : '')
    : step === 1 ? (lines.length === 0 ? 'Add at least one item' : dup ? 'Same material added twice' : errs.some(Boolean) ? 'Fix quantities exceeding available stock' : '') : ''
  const value = lines.reduce((s, l) => s + l.qty * (matById[l.materialId]?.cost ?? 0), 0)

  // suggestions: low at destination & healthy at source
  const suggestions = materials.filter((m) => stockStatus(m.stock[to] ?? 0, m.min) !== 'In Stock' && (m.stock[from] ?? 0) > m.min * 1.2 && !lines.some((l) => l.materialId === m.id)).slice(0, 8)
  const addLine = (materialId?: string) => {
    const m = materialId ? matById[materialId] : materials.find((x) => (x.stock[from] ?? 0) > 0 && !lines.some((l) => l.materialId === x.id))
    if (!m) return
    const need = Math.max(0, m.min * 1.5 - (m.stock[to] ?? 0))
    const qty = Math.round(Math.min(need || m.min, Math.max(0, (m.stock[from] ?? 0) - m.min)) * 10) / 10
    setLines((p) => [...p, { key: uid('l'), materialId: m.id, qty: qty > 0 ? qty : 1 }])
  }

  const next = () => {
    if (step >= 3) return
    if (stepError) return toast.error('Cannot continue', stepError)
    if (step === 2) {
      const t = createTransfer({ from, to, items: lines.map((l) => ({ materialId: l.materialId, qty: l.qty })), createdBy: user.name, note: note || undefined })
      notify({ title: `Transfer ${t.no} needs approval`, body: `${outlets.find((o) => o.id === from)?.short} → ${outlets.find((o) => o.id === to)?.short} · ${lines.length} items`, type: 'approval', link: '/inventory/transfers' })
      setCreated(t)
      toast.success('Transfer request submitted', `${t.no} sent for approval`)
    }
    setStep((s) => s + 1)
  }
  const back = () => setStep((s) => Math.max(0, s - 1))
  useShortcut('enter', next, step < 3)
  const onKey = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement
    if (e.key === 'Enter' && t.tagName === 'INPUT') { e.preventDefault(); next() }
  }

  return (
    <Modal open onClose={onClose} size="xl" title="New stock transfer" subtitle="Inter-outlet stock movement with approval" icon={<ArrowLeftRight />}
      footer={step < 3 ? (
        <>
          <span className="mr-auto flex items-center gap-1.5 text-[11.5px] text-slate-400">{stepError ? <><AlertTriangle className="size-3.5 text-amber-500" /><span className="text-amber-600">{stepError}</span></> : <>Press <Kbd>Enter</Kbd> to continue</>}</span>
          {step > 0 && <Button icon={<ArrowLeft className="size-3.5" />} onClick={back}>Back</Button>}
          <Button variant="primary" iconRight={<ArrowRight className="size-3.5" />} onClick={next} disabled={!!stepError}>{step === 2 ? 'Submit transfer' : 'Continue'}</Button>
        </>
      ) : (
        <>
          <Button onClick={() => { setStep(0); setLines([]); setNote(''); setCreated(null) }}>Create another</Button>
          <Button variant="primary" onClick={() => { if (created) onView(created); onClose() }}>View transfer</Button>
        </>
      )}>
      <Stepper steps={STEPS} current={step} className="mb-5" />
      <div onKeyDown={onKey}>
        {step === 0 && (
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
            <OutletPicker label="Source outlet (dispatch from)" value={from} onChange={(v) => { setFrom(v); setLines([]); if (v === to) setTo(outlets.find((o) => o.id !== v)?.id ?? '') }} ids={allowed} />
            <div className="flex items-center justify-center"><span className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-brand-600"><ArrowRight className="size-4" /></span></div>
            <OutletPicker label="Destination outlet (receive at)" value={to} onChange={setTo} ids={outlets.filter((o) => o.id !== from).map((o) => o.id)} />
            <Field label="Purpose / note" className="md:col-span-3"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Weekend demand at destination, emergency shortage…" /></Field>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px]"><OutletChip id={from} /><ArrowRight className="size-3.5 text-slate-400" /><OutletChip id={to} /><span className="ml-auto text-slate-500">Transfer value <b className="text-slate-900">{inr(value)}</b></span></div>
            {suggestions.length > 0 && (
              <div className="mb-3 rounded-lg border border-brand-100 bg-brand-50/50 p-2.5">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-brand-700"><Sparkles className="size-3.5" />Low at destination, surplus at source</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((m) => <button key={m.id} onClick={() => addLine(m.id)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11.5px] text-slate-700 hover:border-brand-300"><Plus className="size-3" />{m.name}</button>)}
                </div>
              </div>
            )}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-[12.5px]">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr><th className="px-2 py-2 text-left">Material</th><th className="px-2 py-2 text-right">Available at source</th><th className="px-2 py-2 text-right">Current at destination</th><th className="w-32 px-2 py-2 text-right">Transfer qty</th><th className="w-8" /></tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => {
                    const m = matById[l.materialId]
                    const avail = m?.stock[from] ?? 0
                    const dest = m?.stock[to] ?? 0
                    return (
                      <tr key={l.key} className="border-t border-slate-100">
                        <td className="px-2 py-1.5">
                          <Select value={l.materialId} onChange={(e) => setLines((p) => p.map((x) => (x.key === l.key ? { ...x, materialId: e.target.value } : x)))}>
                            {materials.map((x) => <option key={x.id} value={x.id} disabled={(x.stock[from] ?? 0) <= 0}>{x.name} ({x.unit})</option>)}
                          </Select>
                        </td>
                        <td className="px-2 py-1.5 text-right tabular">{fmtQty(avail)} {m?.unit}</td>
                        <td className={cn('px-2 py-1.5 text-right tabular', m && stockStatus(dest, m.min) !== 'In Stock' ? 'text-amber-600' : 'text-slate-600')}>{fmtQty(dest)} {m?.unit}<span className="block text-[10.5px] text-slate-400">min {m?.min}</span></td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min={0} max={avail} step="0.1" autoFocus={i === lines.length - 1} className={cn('text-right', errs[i] && 'rounded-lg ring-2 ring-rose-200')} value={l.qty || ''}
                            onChange={(e) => setLines((p) => p.map((x) => (x.key === l.key ? { ...x, qty: Number(e.target.value) } : x)))} />
                          {errs[i] && <span className="mt-0.5 block text-right text-[10.5px] text-rose-600">{errs[i]}</span>}
                        </td>
                        <td className="px-1"><button onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="size-3.5" /></button></td>
                      </tr>
                    )
                  })}
                  {lines.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">No items yet. Add from suggestions or click “Add item”.</td></tr>}
                </tbody>
              </table>
            </div>
            <Button size="sm" className="mt-2" icon={<Plus className="size-3.5" />} onClick={() => addLine()}>Add item</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-3"><p className="text-[11px] text-slate-500">From</p><OutletChip id={from} full /></div>
              <div className="rounded-lg border border-slate-200 p-3"><p className="text-[11px] text-slate-500">To</p><OutletChip id={to} full /></div>
              <div className="rounded-lg border border-slate-200 p-3"><p className="text-[11px] text-slate-500">Items · Value</p><p className="font-semibold">{lines.length} · {inr(value)}</p></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-[12.5px]">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-2 py-2 text-left">Material</th><th className="px-2 py-2 text-right">Qty</th><th className="px-2 py-2 text-right">Source after</th><th className="px-2 py-2 text-right">Destination after</th><th className="px-2 py-2 text-right">Value</th></tr></thead>
                <tbody>
                  {lines.map((l) => {
                    const m = matById[l.materialId]
                    return (
                      <tr key={l.key} className="border-t border-slate-100">
                        <td className="px-2 py-1.5 font-medium">{m?.name}</td>
                        <td className="px-2 py-1.5 text-right tabular">{fmtQty(l.qty)} {m?.unit}</td>
                        <td className="px-2 py-1.5 text-right tabular text-slate-500">{fmtQty(m?.stock[from] ?? 0)} → <b className="text-rose-600">{fmtQty((m?.stock[from] ?? 0) - l.qty)}</b></td>
                        <td className="px-2 py-1.5 text-right tabular text-slate-500">{fmtQty(m?.stock[to] ?? 0)} → <b className="text-emerald-600">{fmtQty((m?.stock[to] ?? 0) + l.qty)}</b></td>
                        <td className="px-2 py-1.5 text-right tabular">{inr(l.qty * (m?.cost ?? 0))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {note && <p className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600"><b>Note:</b> {note}</p>}
            <p className="text-[11.5px] text-slate-500">Stock moves only on dispatch (source) and receipt (destination). The request goes to an approver first.</p>
          </div>
        )}

        {step === 3 && created && (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="size-7" /></span>
            <p className="text-[16px] font-semibold text-slate-900">Transfer {created.no} submitted</p>
            <p className="mt-1 text-[12.5px] text-slate-500">{lines.length} items · {inr(value)} · awaiting approval from Regional / Inventory Manager</p>
            <div className="mt-3 flex items-center gap-2"><OutletChip id={from} /><ArrowRight className="size-3.5 text-slate-400" /><OutletChip id={to} /></div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function OutletPicker({ label, value, onChange, ids }: { label: string; value: string; onChange: (v: string) => void; ids: string[] }) {
  const outlets = useStore((s) => s.outlets)
  return (
    <div>
      <p className="mb-1.5 text-[11.5px] font-medium text-slate-600">{label}</p>
      <div className="space-y-1.5">
        {outlets.filter((o) => ids.includes(o.id)).map((o) => (
          <button key={o.id} onClick={() => onChange(o.id)}
            className={cn('flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition', value === o.id ? 'border-brand-400 bg-brand-50/60 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300')}>
            <span className="size-8 shrink-0 rounded-lg" style={{ background: o.color }} />
            <div className="min-w-0"><p className="truncate font-medium text-slate-800">{o.name}</p><p className="text-[11px] text-slate-500">{o.city} · {o.manager}</p></div>
          </button>
        ))}
      </div>
    </div>
  )
}

