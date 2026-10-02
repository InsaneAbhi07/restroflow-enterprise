import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, History, KeyRound, Plus, Search, ShieldCheck, Trash2, Send, AlertCircle } from 'lucide-react'
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Field, Input, Select, Stepper, Textarea } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { usePermission, useScope } from '@/store/hooks'
import { toast } from '@/store/toast'
import { computeTotals } from '@/lib/billing'
import { cn, fmtDateTime, inr } from '@/lib/format'
import { hasOpenOverlay, useShortcut } from '@/lib/shortcuts'
import type { Order, PayMode } from '@/types'
import { PAY_TONE } from '@/pages/pos/posUtils'

const MODES: PayMode[] = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Wallet', 'Due']
const REASONS = ['Wrong payment mode punched', 'Customer paid by different mode', 'Split payment not recorded', 'Card terminal failure', 'UPI payment reversed', 'Cash shortage adjustment']
const MANAGER_ROLES = ['r_owner', 'r_regional', 'r_outlet']
interface PRow { mode: PayMode; amount: string }

export function Resettlement() {
  const { outletIds } = useScope()
  const { can } = usePermission()
  const orders = useStore((s) => s.orders)
  const users = useStore((s) => s.users)
  const outlets = useStore((s) => s.outlets)
  const resettleOrder = useStore((s) => s.resettleOrder)
  const allowed = can('settlement', 'create') || can('settlement', 'edit')

  const [step, setStep] = useState(0)
  const [q, setQ] = useState('')
  const [selId, setSelId] = useState<string | null>(null)
  const [rows, setRows] = useState<PRow[]>([])
  const [reason, setReason] = useState('')
  const [remarks, setRemarks] = useState('')
  const [managerId, setManagerId] = useState('')
  const [pin, setPin] = useState('')
  const [approved, setApproved] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [tried, setTried] = useState(false)

  const settled = useMemo(() => orders.filter((o) => o.status === 'Settled' && outletIds.includes(o.outletId)).sort((a, b) => (b.settledAt ?? 0) - (a.settledAt ?? 0)), [orders, outletIds])
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (s ? settled.filter((o) => [o.billNo, o.no, o.customerPhone, o.customerName].some((v) => v?.toLowerCase().includes(s))) : settled).slice(0, 8)
  }, [settled, q])
  const sel = orders.find((o) => o.id === selId)
  const total = sel ? computeTotals(sel).total : 0
  const managers = users.filter((u) => MANAGER_ROLES.includes(u.roleId) && u.status === 'Active' && (!sel || u.outletIds.includes(sel.outletId)))
  const manager = users.find((u) => u.id === managerId)

  const sum = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  const diff = Math.round((total - sum) * 100) / 100
  const sameAsBefore = !!sel && JSON.stringify([...sel.payments].map((p) => `${p.mode}:${p.amount}`).sort()) === JSON.stringify(rows.map((r) => `${r.mode}:${parseFloat(r.amount) || 0}`).sort())
  const errors: string[] = []
  if (Math.abs(diff) >= 0.01) errors.push(diff > 0 ? `Revised payments are ${inr(diff, true)} short of the bill total` : `Revised payments exceed the bill total by ${inr(-diff, true)}`)
  if (rows.some((r) => !(parseFloat(r.amount) > 0))) errors.push('Every payment row needs an amount greater than zero')
  if (sameAsBefore) errors.push('Revised payment is identical to the original settlement')
  if (!reason) errors.push('Select a reason for resettlement')

  const pick = (o: Order) => {
    setSelId(o.id)
    setRows(o.payments.map((p) => ({ mode: p.mode, amount: String(p.amount) })))
    setReason(''); setRemarks(''); setManagerId(''); setPin(''); setApproved(false); setTried(false)
    setStep(1)
  }
  const reset = () => { setStep(0); setSelId(null); setQ(''); setApproved(false); setPin('') }

  const next = () => {
    if (!allowed || confirm) return
    if (step === 0) { if (results[0]) pick(results[0]); return }
    if (step === 1) { setTried(true); if (errors.length) return void toast.warning('Fix the highlighted issues', errors[0]); setStep(2); return }
    if (step === 2) {
      if (approved) return setStep(3)
      if (!managerId) return void toast.warning('Select an approving manager')
      if (!/^\d{4}$/.test(pin)) return void toast.warning('Enter the 4-digit manager PIN')
      setApproved(true); toast.success('Manager approval verified', `${manager?.name} approved via PIN`); setStep(3); return
    }
    if (step === 3) setConfirm(true)
  }
  const back = () => { if (step > 0) setStep(step - 1) }
  useShortcut('enter', next, allowed && !confirm)
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !hasOpenOverlay()) back() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const requestRemote = () => {
    if (!managerId) return void toast.warning('Select a manager to send the request to')
    setRequesting(true)
    toast.info('Approval request sent', `Push notification sent to ${manager?.name}'s app`)
    setTimeout(() => { setRequesting(false); setApproved(true); toast.success(`${manager?.name} approved the resettlement`, 'Approved remotely from mobile') }, 2200)
  }

  const finish = () => {
    if (!sel || !manager) return
    resettleOrder(sel.id, rows.map((r) => ({ mode: r.mode, amount: parseFloat(r.amount) || 0 })), remarks ? `${reason} – ${remarks}` : reason, manager.name)
    toast.success(`Bill ${sel.billNo} resettled`, `${sel.payments.map((p) => p.mode).join('+')} → ${rows.map((r) => r.mode).join('+')}`)
    reset()
  }

  const history = useMemo(() => orders.filter((o) => outletIds.includes(o.outletId) && o.resettlements?.length)
    .flatMap((o) => (o.resettlements ?? []).map((r, i) => ({ ...r, key: o.id + i, billNo: o.billNo, outletId: o.outletId })))
    .sort((a, b) => b.at - a.at), [orders, outletIds])

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <Stepper steps={['Find bill', 'Revise payment', 'Manager approval', 'Confirm']} current={step} />
        </div>
        {!allowed ? <EmptyState icon={<ShieldCheck />} title="Resettlement not permitted" body="Your role can view settlement history but cannot change payment modes on settled bills." /> : (
          <div className="p-4" onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') { e.preventDefault(); next() } }}>
            {step === 0 && (
              <div>
                <Input autoFocus icon={<Search />} placeholder="Search settled bill by bill no, order no, customer or phone…" value={q} onChange={(e) => setQ(e.target.value)} className="[&_input]:h-10" />
                <p className="mt-1 text-[11px] text-slate-400">Press Enter to pick the first match</p>
                <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {results.map((o) => (
                    <button key={o.id} onClick={() => pick(o)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-brand-50/40">
                      <span className="w-16 font-semibold text-slate-800">{o.billNo}</span>
                      <span className="min-w-0 flex-1 truncate text-[12px] text-slate-500">{o.customerName ?? 'Walk-in'}{o.customerPhone && ` · ${o.customerPhone}`} · {o.tableLabel ? 'T ' + o.tableLabel : o.type} · {outlets.find((x) => x.id === o.outletId)?.short}</span>
                      <span className="flex gap-1">{o.payments.map((p, i) => <Badge key={i} tone={PAY_TONE[p.mode]}>{p.mode}</Badge>)}</span>
                      <span className="w-20 text-right font-semibold tabular">{inr(computeTotals(o).total)}</span>
                      <span className="w-28 text-right text-[11px] text-slate-400">{o.settledAt && fmtDateTime(o.settledAt)}</span>
                    </button>
                  ))}
                  {results.length === 0 && <p className="py-8 text-center text-[12px] text-slate-400">No settled bill matches “{q}”</p>}
                </div>
              </div>
            )}

            {step >= 1 && sel && (
              <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-slate-50 px-4 py-3">
                <div><p className="text-[11px] text-slate-500">Bill</p><p className="font-semibold">{sel.billNo} <span className="font-normal text-slate-400">· {sel.no}</span></p></div>
                <div><p className="text-[11px] text-slate-500">Settled</p><p className="font-medium">{sel.settledAt && fmtDateTime(sel.settledAt)}</p></div>
                <div><p className="text-[11px] text-slate-500">Customer</p><p className="font-medium">{sel.customerName ?? 'Walk-in'}</p></div>
                <div><p className="text-[11px] text-slate-500">Cashier</p><p className="font-medium">{sel.cashier}</p></div>
                <div className="ml-auto text-right"><p className="text-[11px] text-slate-500">Bill total</p><p className="text-[20px] font-bold text-navy-900 tabular">{inr(total)}</p></div>
              </div>
            )}

            {step === 1 && sel && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Original payment</p>
                  <div className="space-y-1.5">
                    {sel.payments.map((p, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <Badge tone={PAY_TONE[p.mode]}>{p.mode}</Badge><span className="font-semibold tabular text-slate-500 line-through decoration-slate-300">{inr(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <Field label="Reason" required className="mt-4" error={tried && !reason ? 'Required' : undefined}>
                    <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                      <option value="">Select reason…</option>
                      {REASONS.map((r) => <option key={r}>{r}</option>)}
                    </Select>
                  </Field>
                  <Field label="Remarks" className="mt-3"><Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Customer showed UPI success screen, txn 4521…" /></Field>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Revised payment</p>
                  <div className="space-y-1.5">
                    {rows.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Select className="w-36" value={r.mode} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, mode: e.target.value as PayMode } : x)))}>
                          {MODES.map((m) => <option key={m}>{m}</option>)}
                        </Select>
                        <Input type="number" className="flex-1" value={r.amount} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, amount: e.target.value } : x)))} />
                        <button disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, k) => k !== i))} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"><Trash2 className="size-3.5" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setRows([...rows, { mode: 'UPI', amount: String(Math.max(0, diff)) }])}>Add row</Button>
                    {Math.abs(diff) >= 0.01 && <Button size="sm" variant="ghost" onClick={() => setRows(rows.map((x, k) => (k === rows.length - 1 ? { ...x, amount: String(Math.max(0, (parseFloat(x.amount) || 0) + diff)) } : x)))}>Balance last row</Button>}
                  </div>
                  <div className={cn('mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-[12.5px] font-medium', Math.abs(diff) < 0.01 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                    <span>Revised total</span><span className="tabular">{inr(sum, true)} / {inr(total)}</span>
                  </div>
                  {(tried || Math.abs(diff) >= 0.01 || sameAsBefore) && errors.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {errors.filter((e) => tried || !e.startsWith('Select')).map((e) => <li key={e} className="flex items-start gap-1.5 text-[12px] text-rose-600"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{e}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {step === 2 && sel && (
              <div className="mx-auto max-w-md">
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-800">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0" />
                  <span>Changing payment on a settled bill affects the cash drawer and GST reports. An Outlet / Regional manager must approve.</span>
                </div>
                {approved ? (
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800"><CheckCircle2 className="size-6" /><div><p className="font-semibold">Approved by {manager?.name}</p><p className="text-[12px]">Press Enter to continue</p></div></div>
                ) : (
                  <div className="space-y-3">
                    <Field label="Approving manager" required>
                      <Select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
                        <option value="">Select manager…</option>
                        {managers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </Select>
                    </Field>
                    <Field label="Manager PIN" hint="Demo: any 4 digits are accepted">
                      <Input type="password" inputMode="numeric" icon={<KeyRound />} placeholder="••••" value={pin} maxLength={4} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} className="[&_input]:tracking-[.5em]" />
                    </Field>
                    <div className="flex gap-2">
                      <Button variant="primary" className="flex-1" icon={<KeyRound className="size-3.5" />} onClick={next}>Verify PIN</Button>
                      <Button className="flex-1" icon={<Send className="size-3.5" />} loading={requesting} onClick={requestRemote}>Request approval</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && sel && (
              <div className="mx-auto max-w-lg space-y-3">
                <div className="flex items-center justify-center gap-4 rounded-xl border border-slate-200 p-4">
                  <div className="space-y-1 text-center">{sel.payments.map((p, i) => <div key={i}><Badge tone={PAY_TONE[p.mode]}>{p.mode}</Badge> <b className="tabular">{inr(p.amount)}</b></div>)}</div>
                  <ArrowRight className="size-5 text-slate-400" />
                  <div className="space-y-1 text-center">{rows.map((r, i) => <div key={i}><Badge tone={PAY_TONE[r.mode]}>{r.mode}</Badge> <b className="tabular">{inr(parseFloat(r.amount) || 0)}</b></div>)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-[12.5px]">
                  <p><span className="text-slate-500">Reason:</span> <b>{reason}</b>{remarks && ` – ${remarks}`}</p>
                  <p><span className="text-slate-500">Approved by:</span> <b>{manager?.name}</b></p>
                </div>
              </div>
            )}

            {step > 0 && (
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                <Button onClick={back} kbd="Esc">Back</Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={reset}>Start over</Button>
                  <Button variant={step === 3 ? 'accent' : 'primary'} kbd="Enter" onClick={next}>{step === 3 ? 'Complete resettlement' : step === 2 && !approved ? 'Verify & continue' : 'Continue'}</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="flex max-h-[640px] flex-col">
        <CardHeader title="Resettlement audit trail" subtitle={`${history.length} changes in scope`} icon={<History className="size-3.5" />} />
        <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
          {history.length === 0 && <EmptyState icon={<History />} title="No resettlements yet" body="Completed resettlements appear here with full before/after detail." />}
          {history.map((h) => (
            <div key={h.key} className="px-4 py-2.5">
              <div className="flex items-center justify-between">
                <b className="text-[12.5px]">{h.billNo}</b>
                <span className="text-[11px] text-slate-400">{fmtDateTime(h.at)}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1 text-[12px]">
                {h.from.map((p, i) => <Badge key={'f' + i} tone="gray">{p.mode} {inr(p.amount)}</Badge>)}
                <ArrowRight className="size-3 text-slate-400" />
                {h.to.map((p, i) => <Badge key={'t' + i} tone={PAY_TONE[p.mode]}>{p.mode} {inr(p.amount)}</Badge>)}
              </div>
              <p className="mt-1 text-[11.5px] text-slate-500">{h.reason}</p>
              <p className="text-[11px] text-slate-400">By {h.by} · approved by <b className="text-slate-600">{h.approvedBy}</b> · {outlets.find((o) => o.id === h.outletId)?.short}</p>
            </div>
          ))}
        </div>
      </Card>

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={finish} tone="accent" confirmLabel="Yes, resettle bill"
        title={`Resettle ${sel?.billNo}?`} body="The payment records will be replaced and the change is permanently logged in the audit trail with the approving manager." />
    </div>
  )
}
