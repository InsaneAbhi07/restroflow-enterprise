import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRightLeft, Ban, CheckCircle2, IndianRupee, LogOut, Moon, Plus, ReceiptText, Trash2 } from 'lucide-react'
import { Badge, Button, Field, Input, Modal, Select, Textarea, Toggle } from '@/components/ui'
import { toast } from '@/store/toast'
import { cn, fmtDate, fmtDateShort, inr } from '@/lib/format'
import { useHotel, type Settle } from './hotelStore'
import {
  billableNights, folioTotals, nightRoomCharge, postedNights, roomFree, roomGst, today,
  type ChargeKind, type FolioPayMode, type FolioPayment, type Reservation,
} from './hotelModel'
import { PAY_MODES } from './hotelUi'

/* ------------------------------------------------------------------ post a charge */
const PRESETS: { label: string; kind: ChargeKind; gst: 'fnb' | 'service'; amount?: number }[] = [
  { label: 'Restaurant bill', kind: 'F&B', gst: 'fnb' },
  { label: 'Room service', kind: 'F&B', gst: 'fnb' },
  { label: 'Minibar', kind: 'Service', gst: 'service' },
  { label: 'Laundry', kind: 'Service', gst: 'service' },
  { label: 'Extra bed', kind: 'Service', gst: 'service', amount: 1200 },
  { label: 'Airport transfer', kind: 'Service', gst: 'service', amount: 1800 },
  { label: 'Spa', kind: 'Service', gst: 'service' },
  { label: 'Allowance / correction', kind: 'Allowance', gst: 'service' },
]
export function AddChargeModal({ res, onClose }: { res: Reservation; onClose: () => void }) {
  const { config, addCharge } = useHotel()
  const [preset, setPreset] = useState(0)
  const p = PRESETS[preset]
  const [desc, setDesc] = useState(p.label)
  const [amount, setAmount] = useState(0)
  const [gst, setGst] = useState(config.fnbGst)
  const [ref, setRef] = useState('')
  const pick = (i: number) => {
    const x = PRESETS[i]
    setPreset(i); setDesc(x.label); setAmount(x.amount ?? 0)
    setGst(x.kind === 'Allowance' ? roomGst(res.roomRate, config) : x.gst === 'fnb' ? config.fnbGst : config.serviceGst)
  }
  const allowance = p.kind === 'Allowance'
  const save = () => {
    if (!desc.trim() || amount <= 0) return toast.error('Enter description and amount')
    addCharge(res.id, { kind: p.kind, desc: desc.trim() + (ref.trim() ? ` · ${ref.trim()}` : ''), amount: allowance ? -amount : amount, gst, date: today(), ref: allowance ? 'allowance' : p.kind === 'F&B' ? 'pos' : 'service' })
    toast.success(allowance ? 'Allowance posted' : 'Charge posted', `${desc} · ${inr(amount * (1 + gst / 100))} incl. GST`)
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="md" icon={<Plus />} title="Post to folio" subtitle={`${res.no} · ${res.guest.name}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant={allowance ? 'warning' : 'primary'} onClick={save}>{allowance ? 'Post allowance' : 'Post charge'}</Button></>}>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {PRESETS.map((x, i) => (
          <button key={x.label} onClick={() => pick(i)} className={cn('rounded-lg px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset transition', i === preset ? 'bg-navy-900 text-white ring-navy-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{x.label}</button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Description" className="sm:col-span-2"><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        <Field label={allowance ? 'Allowance amount (pre-tax)' : 'Amount (pre-tax)'}><Input type="number" min={0} value={amount || ''} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} suffix="₹" /></Field>
        <Field label="GST rate"><Select value={gst} onChange={(e) => setGst(Number(e.target.value))}>{[0, 5, 12, 18].map((g) => <option key={g} value={g}>{g}%</option>)}</Select></Field>
        <Field label="Reference" hint="Bill / KOT / voucher no." className="sm:col-span-2"><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Optional" /></Field>
      </div>
      <p className="mt-3 text-right text-[13px] text-slate-600">Total incl. GST: <b className={cn('tabular', allowance ? 'text-rose-600' : 'text-slate-900')}>{allowance ? '− ' : ''}{inr(amount * (1 + gst / 100), true)}</b></p>
    </Modal>
  )
}

/* ------------------------------------------------------------------ take a payment */
export function AddPaymentModal({ res, onClose }: { res: Reservation; onClose: () => void }) {
  const addPayment = useHotel((s) => s.addPayment)
  const bal = folioTotals(res).balance
  const [kind, setKind] = useState<FolioPayment['kind']>(res.status === 'Confirmed' ? 'Advance' : bal < 0 ? 'Refund' : 'Payment')
  const [mode, setMode] = useState<FolioPayMode>('UPI')
  const [amount, setAmount] = useState(Math.abs(Math.round(bal)) || 0)
  const [ref, setRef] = useState('')
  const save = () => {
    if (amount <= 0) return toast.error('Enter an amount')
    addPayment(res.id, { kind, mode, amount, ref: ref.trim() || undefined })
    toast.success(`${kind} recorded`, `${inr(amount)} via ${mode}`)
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="sm" icon={<IndianRupee />} title="Record payment" subtitle={`${res.no} · balance ${inr(bal)}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <div className="grid gap-3">
        <Field label="Type"><Select value={kind} onChange={(e) => setKind(e.target.value as FolioPayment['kind'])}>{(['Advance', 'Payment', 'Refund'] as const).map((k) => <option key={k}>{k}</option>)}</Select></Field>
        <Field label="Mode"><Select value={mode} onChange={(e) => setMode(e.target.value as FolioPayMode)}>{PAY_MODES.filter((m) => m !== 'Bill to Company').map((m) => <option key={m}>{m}</option>)}</Select></Field>
        <Field label="Amount"><Input type="number" min={0} value={amount || ''} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} suffix="₹" /></Field>
        <Field label="Reference"><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="UTR / card last 4 / receipt" /></Field>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ check-out */
export function CheckOutModal({ res, onClose, onDone }: { res: Reservation; onClose: () => void; onDone?: (invoiceNo: string) => void }) {
  const { config, rooms, checkOut } = useHotel()
  const t = today()
  const nowHHMM = new Date().toTimeString().slice(0, 5)
  const [late, setLate] = useState(nowHHMM > config.checkOutTime && nowHHMM < '18:00' && res.departure <= t)
  const pending = useMemo(() => {
    const posted = postedNights(res)
    return billableNights(res, t).filter((d) => !posted.has(d)).map((d) => {
      const rc = nightRoomCharge(res, d, config)
      return { date: d, room: rc, roomTax: (rc * roomGst(rc, config)) / 100, meal: res.mealRate, mealTax: (res.mealRate * config.fnbGst) / 100 }
    })
  }, [res, t, config])
  const ft = folioTotals(res)
  const pendingTotal = pending.reduce((s, p) => s + p.room + p.roomTax + p.meal + p.mealTax, 0) + (late ? config.lateCheckOutFee * (1 + config.serviceGst / 100) : 0)
  const grand = ft.total + pendingTotal
  const balance = Math.round((grand - ft.paid) * 100) / 100
  const [rows, setRows] = useState<Settle[]>([{ mode: res.guest.company ? 'Bill to Company' : 'Card', amount: Math.max(0, Math.round(balance)) }])
  const settled = rows.reduce((s, r) => s + r.amount, 0)
  const diff = Math.round(Math.max(0, balance) - settled)
  const early = res.departure > t
  const room = rooms.find((x) => x.id === res.roomId)

  const confirm = () => {
    if (balance > 0 && Math.abs(diff) > 1) return toast.error('Settlement does not match', `Balance ${inr(balance)} · entered ${inr(settled)}`)
    if (rows.some((r) => r.mode === 'Bill to Company' && r.amount > 0) && !res.guest.company) return toast.error('No company on this booking', 'Add a bill-to company to use City Ledger')
    // absorb rounding into the last row
    const fixed = balance > 0 ? rows.map((r, i) => (i === rows.length - 1 ? { ...r, amount: Math.round((r.amount + (balance - settled)) * 100) / 100 } : r)) : []
    const inv = checkOut(res.id, fixed, late)
    if (!inv) return
    toast.success(`${res.guest.name} checked out`, `Invoice ${inv} · room ${room?.no} sent to housekeeping`)
    onDone?.(inv)
    onClose()
  }

  return (
    <Modal open onClose={onClose} size="lg" icon={<LogOut />} title={`Check-out · Room ${room?.no}`} subtitle={`${res.guest.name} · ${res.no} · arrived ${fmtDate(res.arrival)}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="success" icon={<ReceiptText className="size-3.5" />} onClick={confirm}>Settle & generate invoice</Button></>}>
      {early && <p className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800"><AlertTriangle className="size-3.5" />Early departure — booked till {fmtDate(res.departure)}. Only nights stayed are billed.</p>}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 text-[12.5px]">
          <Line k="Folio charges so far" v={inr(ft.total, true)} />
          {pending.map((p) => <Line key={p.date} k={`Room night ${fmtDateShort(p.date)}${p.meal ? ' + meals' : ''} (to post)`} v={inr(p.room + p.roomTax + p.meal + p.mealTax, true)} muted />)}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <span className="text-slate-600">Late check-out fee ({inr(config.lateCheckOutFee)} + GST)</span><Toggle size="sm" checked={late} onChange={setLate} />
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900"><span>Grand total</span><span className="tabular">{inr(grand, true)}</span></div>
          <Line k="Paid / advance" v={`− ${inr(ft.paid, true)}`} />
          <div className={cn('flex justify-between rounded-lg px-3 py-2 text-[14px] font-semibold', balance > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700')}>
            <span>{balance >= 0 ? 'Balance due' : 'Refund to guest'}</span><span className="tabular">{inr(Math.abs(balance), true)}</span>
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Settlement</p>
          {balance <= 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[12.5px] text-slate-500">{balance < 0 ? `${inr(-balance, true)} will be refunded in cash.` : 'Nothing to collect — folio is fully paid.'}</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select className="flex-1" value={r.mode} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, mode: e.target.value as FolioPayMode } : x)))}>
                    {PAY_MODES.map((m) => <option key={m} disabled={m === 'Bill to Company' && !res.guest.company}>{m}{m === 'Bill to Company' ? ' (City Ledger)' : ''}</option>)}
                  </Select>
                  <Input className="w-28" type="number" min={0} value={r.amount || ''} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, amount: Math.max(0, Number(e.target.value) || 0) } : x)))} />
                  {rows.length > 1 && <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="size-3.5" /></button>}
                </div>
              ))}
              <div className="flex items-center justify-between">
                <Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => setRows([...rows, { mode: 'Cash', amount: Math.max(0, diff) }])}>Split payment</Button>
                <span className={cn('text-[12px] font-medium', Math.abs(diff) <= 1 ? 'text-emerald-600' : 'text-rose-600')}>{Math.abs(diff) <= 1 ? 'Matched' : diff > 0 ? `${inr(diff)} remaining` : `${inr(-diff)} excess`}</span>
              </div>
              {res.guest.company && <p className="text-[11.5px] text-slate-500">City Ledger bills <b>{res.guest.company}</b>{res.guest.gstin && <> (GSTIN {res.guest.gstin})</>} on credit.</p>}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ night audit */
export function NightAuditModal({ onClose }: { onClose: () => void }) {
  const { reservations, rooms, config, nightAudit } = useHotel()
  const t = today()
  const inHouse = reservations.filter((r) => r.status === 'In House')
  const toPost = inHouse.filter((r) => !postedNights(r).has(t))
  const amount = toPost.reduce((s, r) => s + nightRoomCharge(r, t, config) + r.mealRate, 0)
  const noShows = reservations.filter((r) => r.status === 'Confirmed' && r.arrival < t)
  const pendingArrivals = reservations.filter((r) => r.status === 'Confirmed' && r.arrival === t)
  const dueOut = inHouse.filter((r) => r.departure <= t)
  const dirty = rooms.filter((r) => r.hk === 'Dirty').length
  const ran = config.lastAudit === t
  const run = () => {
    const res = nightAudit()
    toast.success('Night audit complete', `${res.posted} room nights posted · ${inr(res.amount)}${res.noShows ? ` · ${res.noShows} no-show(s)` : ''}`)
    onClose()
  }
  const items: [string, React.ReactNode, 'ok' | 'warn' | 'info'][] = [
    ['Room & meal-plan charges to post', <>{toPost.length} rooms · <b>{inr(amount)}</b> + GST</>, 'ok'],
    ['Confirmed bookings past arrival → No Show', noShows.length ? noShows.map((r) => r.guest.name).join(', ') : 'None', noShows.length ? 'warn' : 'ok'],
    ['Expected arrivals still pending today', pendingArrivals.length ? `${pendingArrivals.length} (kept for late arrival)` : 'None', 'info'],
    ['Due-outs not yet checked out', dueOut.length ? dueOut.map((r) => rooms.find((x) => x.id === r.roomId)?.no).join(', ') : 'None', dueOut.length ? 'warn' : 'ok'],
    ['Rooms still dirty', `${dirty}`, dirty ? 'info' : 'ok'],
  ]
  return (
    <Modal open onClose={onClose} size="md" icon={<Moon />} title={`Night audit · ${fmtDate(t)}`} subtitle={`Last run: ${config.lastAudit ? fmtDate(config.lastAudit) : 'never'}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={<Moon className="size-3.5" />} onClick={run}>Run night audit & close day</Button></>}>
      {ran && <p className="mb-3 flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-[12px] text-sky-800"><CheckCircle2 className="size-3.5" />Already run today — running again only posts rooms checked in since.</p>}
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {items.map(([k, v, tone]) => (
          <li key={k} className="flex items-start gap-3 px-3 py-2.5 text-[12.5px]">
            <span className={cn('mt-1 size-2 shrink-0 rounded-full', tone === 'ok' ? 'bg-emerald-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-sky-500')} />
            <span className="flex-1 text-slate-600">{k}</span><span className="max-w-[55%] text-right text-slate-800">{v}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11.5px] text-slate-500">Night audit posts tonight's tariff to every in-house folio, rolls the business date and produces the day-end report. Run it after the last check-in of the day.</p>
    </Modal>
  )
}

/* ------------------------------------------------------------------ assign / move room */
export function MoveRoomModal({ res, onClose }: { res: Reservation; onClose: () => void }) {
  const { rooms, types, reservations, moveRoom } = useHotel()
  const from = res.status === 'In House' ? today() : res.arrival
  const options = rooms.filter((r) => r.id !== res.roomId && r.hk !== 'Out of Order' && (res.status !== 'In House' || r.hk === 'Clean') && roomFree(r.id, from, res.departure, reservations, res.id))
  const [roomId, setRoomId] = useState(options.find((r) => r.typeId === res.typeId)?.id ?? options[0]?.id ?? '')
  const [reason, setReason] = useState('')
  const moving = res.status === 'In House'
  const save = () => {
    if (!roomId) return toast.error('Select a room')
    if (moving && !reason.trim()) return toast.error('Enter a reason for the room move')
    moveRoom(res.id, roomId, reason.trim())
    toast.success(moving ? 'Room moved' : 'Room assigned', `${res.guest.name} → ${rooms.find((r) => r.id === roomId)?.no}`)
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="sm" icon={<ArrowRightLeft />} title={moving ? 'Room move' : 'Assign room'} subtitle={`${res.guest.name} · ${fmtDateShort(from)} → ${fmtDateShort(res.departure)}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save} disabled={!roomId}>{moving ? 'Move guest' : 'Assign'}</Button></>}>
      <div className="grid gap-3">
        <Field label="Room" hint={`${options.length} rooms free for these dates`}>
          <Select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            {types.map((t) => {
              const list = options.filter((r) => r.typeId === t.id)
              return list.length ? <optgroup key={t.id} label={`${t.name}${t.id === res.typeId ? ' (booked)' : ''}`}>{list.map((r) => <option key={r.id} value={r.id}>{r.no} · {r.view}{r.hk === 'Dirty' ? ' · dirty' : ''}</option>)}</optgroup> : null
            })}
          </Select>
        </Field>
        {moving && <Field label="Reason" required><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="AC not cooling, guest request, upgrade…" /></Field>}
        {moving && <p className="text-[11.5px] text-slate-500">The booked rate stays the same. The old room is sent to housekeeping as dirty.</p>}
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ cancel */
export function CancelReservationModal({ res, onClose }: { res: Reservation; onClose: () => void }) {
  const cancel = useHotel((s) => s.cancelReservation)
  const [reason, setReason] = useState('')
  const paid = folioTotals(res).paid
  return (
    <Modal open onClose={onClose} size="sm" icon={<Ban />} title={`Cancel ${res.no}`} subtitle={res.guest.name}
      footer={<><Button onClick={onClose}>Keep booking</Button><Button variant="danger" disabled={!reason.trim()} onClick={() => { cancel(res.id, reason.trim()); toast.success('Reservation cancelled', res.no); onClose() }}>Cancel reservation</Button></>}>
      <Field label="Reason" required><Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Guest request, duplicate, payment failed…" /></Field>
      {paid > 0 && <p className="mt-3 flex items-center gap-2 text-[12px] text-amber-700"><Badge tone="amber">Advance {inr(paid)}</Badge>Record a refund from the folio if applicable.</p>}
    </Modal>
  )
}

const Line = ({ k, v, muted }: { k: string; v: string; muted?: boolean }) => (
  <div className={cn('flex justify-between gap-2', muted ? 'text-slate-500' : 'text-slate-600')}><span className="truncate">{k}</span><span className="shrink-0 font-medium text-slate-800 tabular">{v}</span></div>
)
