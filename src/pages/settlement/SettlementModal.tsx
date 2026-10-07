import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Banknote, BedDouble, CheckCircle2, CreditCard, Loader2, MessageCircle, Plus, Printer, QrCode, Smartphone, SplitSquareHorizontal, Trash2, Wallet, Receipt } from 'lucide-react'
import { Badge, Button, Checkbox, Input, Modal, Select, Stepper, VegMark } from '@/components/ui'
import { MiniQR, PrintPreviewModal } from '@/components/print/Print'
import { ThermalReceipt } from '@/components/print/Receipts'
import { useStore } from '@/store/useStore'
import { toast } from '@/store/toast'
import { computeTotals, lineTotal } from '@/lib/billing'
import { cn, inr } from '@/lib/format'
import { useShortcut } from '@/lib/shortcuts'
import type { PayMode, Payment } from '@/types'
import { useHotel } from '@/pages/hotel/hotelStore'
import { RoomGuestPicker } from '@/pages/hotel/RoomGuestPicker'
import { roomCredit, useIsHotelOutlet } from '@/pages/hotel/roomBilling'

export type SettleMethod = 'Cash' | 'UPI' | 'Credit Card' | 'Debit Card' | 'Room' | 'Split'
const METHODS: { id: SettleMethod; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'Cash', label: 'Cash', icon: <Banknote />, hint: 'Tender & change' },
  { id: 'UPI', label: 'UPI', icon: <QrCode />, hint: 'GPay · PhonePe · Paytm' },
  { id: 'Credit Card', label: 'Credit Card', icon: <CreditCard />, hint: 'EDC terminal' },
  { id: 'Debit Card', label: 'Debit Card', icon: <Wallet />, hint: 'EDC terminal' },
  { id: 'Room', label: 'Charge to Room', icon: <BedDouble />, hint: 'Post to hotel guest folio' },
  { id: 'Split', label: 'Split', icon: <SplitSquareHorizontal />, hint: 'Multiple modes' },
]
const SPLIT_MODES: PayMode[] = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Wallet', 'Due']

interface Row { mode: PayMode; amount: string }

export function SettlementModal({ orderId, open, onClose, onSettled, initialMethod = 'Cash' }: {
  orderId: string | null; open: boolean; onClose: () => void; onSettled?: (id: string) => void; initialMethod?: SettleMethod
}) {
  const order = useStore((s) => s.orders.find((o) => o.id === orderId))
  const settleOrder = useStore((s) => s.settleOrder)
  const [step, setStep] = useState(0)
  const [method, setMethod] = useState<SettleMethod>(initialMethod)
  const [tendered, setTendered] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [card, setCard] = useState<'idle' | 'processing' | 'approved'>('idle')
  const [upiRef, setUpiRef] = useState('')
  const [change, setChange] = useState(0)
  const [print, setPrint] = useState(false)
  const [signed, setSigned] = useState(false)
  const [pickRoom, setPickRoom] = useState(false)
  const isHotel = useIsHotelOutlet(order?.outletId)
  const hotelCfg = useHotel((s) => s.config)
  const stay = useHotel((s) => (order?.resId ? s.reservations.find((r) => r.id === order.resId && r.status === 'In House') : undefined))
  const methods = METHODS.filter((m) => m.id !== 'Room' || isHotel)
  const splitModes = SPLIT_MODES.concat(stay ? ['Room'] : [])
  const tenderRef = useRef<HTMLInputElement>(null)

  const t = useMemo(() => (order ? computeTotals(order) : null), [order])
  const total = t?.total ?? 0

  useEffect(() => {
    if (!open) return
    setStep(order?.status === 'Settled' ? 2 : 0)
    setMethod(initialMethod)
    setTendered('')
    setRows([{ mode: 'Cash', amount: '' }])
    setCard('idle')
    setUpiRef('')
    setChange(0)
    setSigned(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId])

  useEffect(() => {
    if (open && step === 1 && method === 'Cash') setTimeout(() => tenderRef.current?.focus(), 40)
  }, [open, step, method])

  const splitPaid = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  const splitRemaining = Math.round((total - splitPaid) * 100) / 100
  const cashGiven = parseFloat(tendered) || 0
  const cashShort = method === 'Cash' && tendered !== '' && cashGiven < total
  const roomPart = method === 'Room' ? total : method === 'Split' ? rows.filter((r) => r.mode === 'Room').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0) : 0
  const credit = stay ? roomCredit(stay, roomPart, hotelCfg) : null
  const roomOk = roomPart === 0 || (!!stay && !!credit?.ok && signed)

  const canComplete =
    method === 'Split' ? Math.abs(splitRemaining) < 0.01 && rows.every((r) => (parseFloat(r.amount) || 0) > 0)
      : method === 'Cash' ? !cashShort
        : method === 'Credit Card' || method === 'Debit Card' ? card === 'approved'
          : method === 'Room' ? !!stay
            : true
  const canSettle = canComplete && roomOk

  const complete = () => {
    if (order && canComplete && !roomOk) {
      toast.warning(!stay ? 'Select the hotel guest' : !credit?.ok ? 'Room credit limit exceeded' : 'Guest signature required', !stay ? 'Pick the room to charge' : !credit?.ok ? `Folio would reach ${inr(credit!.after)} (limit ${inr(credit!.limit)})` : 'Tick “guest signed the bill”')
      return
    }
    if (!order || !canComplete) {
      if (method === 'Room') toast.warning('Select the hotel guest')
      else if (method === 'Split') toast.warning('Split amounts must match the bill', `Remaining ${inr(splitRemaining, true)}`)
      else if (method.includes('Card')) toast.warning('Waiting for card approval', 'Send the amount to the EDC terminal first')
      else if (cashShort) toast.warning('Tendered amount is less than bill')
      return
    }
    let payments: Omit<Payment, 'at'>[]
    if (method === 'Split') payments = rows.map((r) => ({ mode: r.mode, amount: parseFloat(r.amount) || 0, ref: r.mode === 'Room' ? `Room ${order.roomNo} · ${stay?.no}` : undefined }))
    else if (method === 'UPI') payments = [{ mode: 'UPI', amount: total, ref: upiRef || 'UPI' + Math.floor(1e8 + Math.random() * 9e8) }]
    else if (method === 'Cash') payments = [{ mode: 'Cash', amount: total }]
    else if (method === 'Room') payments = [{ mode: 'Room', amount: total, ref: `Room ${order.roomNo} · ${stay?.no}` }]
    else payments = [{ mode: method, amount: total, ref: 'AUTH' + Math.floor(1000 + Math.random() * 9000) }]
    setChange(method === 'Cash' && cashGiven > total ? cashGiven - total : 0)
    settleOrder(order.id, payments)
    setStep(2)
    toast.success(`Bill settled · ${inr(total)}`, payments.map((p) => p.mode).join(' + '))
    onSettled?.(order.id)
  }

  const next = () => {
    if (print) return
    if (step === 0) setStep(1)
    else if (step === 1) complete()
    else onClose()
  }
  useShortcut('enter', next, open && !print)

  const sendToTerminal = () => {
    setCard('processing')
    setTimeout(() => { setCard('approved'); toast.success('Card approved', 'EDC terminal · Auth code ' + Math.floor(100000 + Math.random() * 899999)) }, 1600)
  }

  if (!order || !t) return null
  const items = order.items.filter((i) => !i.cancelled)
  const quick = Array.from(new Set([total, Math.ceil(total / 100) * 100, 500, 1000, 2000].filter((v) => v >= total))).sort((a, b) => a - b).slice(0, 5)

  return (
    <>
      <Modal open={open} onClose={onClose} size="lg" icon={<Receipt />}
        title={step === 2 ? 'Settlement complete' : `Settle ${order.billNo ?? order.no}`}
        subtitle={`${order.type}${order.tableLabel ? ' · Table ' + order.tableLabel : ''} · ${order.source}${order.customerName ? ' · ' + order.customerName : ''}`}
        bodyClassName="p-0"
        footer={
          step === 0 ? (
            <>
              <span className="mr-auto text-[12px] text-slate-500">{t.qty} items · Grand total <b className="text-slate-900">{inr(total)}</b></span>
              <Button onClick={onClose}>Cancel</Button>
              <Button variant="primary" kbd="Enter" onClick={() => setStep(1)}>Proceed to payment</Button>
            </>
          ) : step === 1 ? (
            <>
              <Button className="mr-auto" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={onClose}>Cancel</Button>
              <Button variant="accent" kbd="Enter" disabled={!canSettle} onClick={complete} icon={<CheckCircle2 className="size-4" />}>Complete settlement · {inr(total)}</Button>
            </>
          ) : (
            <>
              <Button className="mr-auto" icon={<MessageCircle className="size-3.5" />} onClick={() => toast.success('e-Bill sent on WhatsApp', order.customerPhone ? `To +91 ${order.customerPhone}` : 'Simulated')}>WhatsApp e-bill</Button>
              <Button icon={<Printer className="size-3.5" />} onClick={() => setPrint(true)}>Print receipt</Button>
              <Button variant="primary" kbd="Enter" onClick={onClose}>Done</Button>
            </>
          )
        }>
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <Stepper steps={['Review bill', 'Payment', 'Done']} current={step} />
        </div>

        {step === 0 && (
          <div className="grid gap-5 px-5 py-4 md:grid-cols-[1fr_260px]">
            <div className="min-w-0">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Items</p>
              <div className="max-h-[300px] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100">
                {items.map((i) => (
                  <div key={i.id} className="flex items-center gap-2 px-3 py-2">
                    <VegMark veg={i.veg} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800">{i.name}{i.variant && <span className="text-slate-400"> · {i.variant}</span>}</p>
                      {i.modifiers?.length ? <p className="truncate text-[11px] text-slate-400">+ {i.modifiers.map((m) => m.name).join(', ')}</p> : null}
                    </div>
                    <span className="text-slate-500 tabular">{i.qty} × {inr(i.price)}</span>
                    <span className="w-20 text-right font-medium tabular">{inr(lineTotal(i))}</span>
                  </div>
                ))}
              </div>
            </div>
            <BillSummary t={t} trayLabel={order.type === 'Room Service'} discountLabel={order.discount.type === 'pct' && order.discount.value ? `${order.discount.value}%` : undefined} serviceRate={order.serviceCharge} />
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-5 px-5 py-4 md:grid-cols-[220px_1fr]" onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "BUTTON") { e.preventDefault(); complete() } }}>
            <div className="space-y-1.5">
              {methods.map((m) => (
                <button key={m.id} onClick={() => { setMethod(m.id); if (m.id === 'Split') setRows([{ mode: 'Cash', amount: '' }]) }}
                  className={cn('flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                    method === m.id ? 'border-brand-400 bg-brand-50/60 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
                  <span className={cn('flex size-8 items-center justify-center rounded-lg [&>svg]:size-4', method === m.id ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500')}>{m.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-slate-800">{m.label}</span>
                    <span className="block truncate text-[11px] text-slate-400">{m.hint}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="min-w-0 rounded-xl border border-slate-200 p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[12px] text-slate-500">Amount payable</span>
                <span className="text-[24px] font-bold tracking-tight text-navy-900 tabular">{inr(total)}</span>
              </div>

              {method === 'Cash' && (
                <div className="space-y-3">
                  <Input ref={tenderRef} type="number" placeholder={`Amount tendered (default ${total})`} value={tendered}
                    onChange={(e) => setTendered(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && complete()} className="[&_input]:h-10 [&_input]:text-[15px]" />
                  <div className="flex flex-wrap gap-1.5">
                    {quick.map((q, i) => (
                      <Button key={q} size="sm" variant={cashGiven === q ? 'primary' : 'outline'} onClick={() => setTendered(String(q))}>{i === 0 ? `Exact ${inr(q)}` : inr(q)}</Button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-[11px] text-slate-500">Remaining</p><p className={cn('text-[16px] font-semibold tabular', cashShort ? 'text-rose-600' : 'text-slate-800')}>{inr(Math.max(0, total - (tendered ? cashGiven : total)))}</p></div>
                    <div className="rounded-lg bg-emerald-50 px-3 py-2"><p className="text-[11px] text-emerald-700">Change due</p><p className="text-[16px] font-semibold text-emerald-700 tabular">{inr(Math.max(0, cashGiven - total))}</p></div>
                  </div>
                  {cashShort && <p className="text-[12px] text-rose-600">Tendered amount is {inr(total - cashGiven)} short. Use Split for part payments.</p>}
                </div>
              )}

              {method === 'Room' && (
                <div className="space-y-3">
                  {stay ? (
                    <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-sky-600 text-[14px] font-bold text-white">{order.roomNo}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{stay.guest.name}</p>
                        <p className="text-[12px] text-slate-500">{stay.no} · folio {inr(credit!.balance)} → <b className={credit!.ok ? 'text-slate-700' : 'text-rose-600'}>{inr(credit!.after)}</b> (limit {inr(credit!.limit)})</p>
                      </div>
                      <Button size="sm" onClick={() => setPickRoom(true)}>Change</Button>
                    </div>
                  ) : (
                    <Button variant="primary" icon={<BedDouble className="size-3.5" />} onClick={() => setPickRoom(true)}>Select hotel guest</Button>
                  )}
                  {stay && !credit!.ok && <p className="text-[12px] text-rose-600">This bill would take the guest over the room credit limit. Collect payment or ask the front desk to take a deposit.</p>}
                  {stay && <Checkbox checked={signed} onChange={setSigned} label="Guest signed the bill (room number & signature)" />}
                </div>
              )}
              {method === 'Split' && roomPart > 0 && stay && <Checkbox className="mb-3" checked={signed} onChange={setSigned} label={`Guest signed for ${inr(roomPart)} on Room ${order.roomNo}`} />}

              {method === 'UPI' && (
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                  <div className="rounded-xl border border-slate-200 bg-white p-2"><MiniQR seed={order.no + total} size={132} /></div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-[13px] font-semibold text-slate-800">Scan to pay {inr(total)}</p>
                    <p className="text-[12px] text-slate-500">grandkitchen@hdfcbank · Dynamic QR shown on customer display</p>
                    <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[12px] text-amber-700"><Loader2 className="size-3.5 animate-spin" /> Awaiting payment confirmation (simulated)</div>
                    <Input placeholder="UTR / reference (optional)" value={upiRef} onChange={(e) => setUpiRef(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && complete()} />
                    <div className="flex gap-1.5 text-[11px] text-slate-400"><Smartphone className="size-3.5" /> GPay · PhonePe · Paytm · BHIM</div>
                  </div>
                </div>
              )}

              {(method === 'Credit Card' || method === 'Debit Card') && (
                <div className="space-y-3">
                  <div className={cn('flex items-center gap-3 rounded-xl border-2 border-dashed p-4', card === 'approved' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50')}>
                    <span className={cn('flex size-11 items-center justify-center rounded-xl', card === 'approved' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 shadow-sm')}>
                      {card === 'processing' ? <Loader2 className="size-5 animate-spin" /> : card === 'approved' ? <CheckCircle2 className="size-5" /> : <CreditCard className="size-5" />}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">{card === 'idle' ? 'Swipe / tap / insert on EDC terminal (simulated)' : card === 'processing' ? 'Processing on Pine Labs terminal…' : 'Payment approved'}</p>
                      <p className="text-[12px] text-slate-500">{card === 'approved' ? `${method} •••• 4821 · ${inr(total)}` : `Terminal ID PL-${order.outletId.toUpperCase()}-02 · Amount ${inr(total)}`}</p>
                    </div>
                  </div>
                  {card !== 'approved' && <Button variant="primary" loading={card === 'processing'} onClick={sendToTerminal} icon={<CreditCard className="size-3.5" />}>Send {inr(total)} to terminal</Button>}
                </div>
              )}

              {method === 'Split' && (
                <div className="space-y-2">
                  {rows.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select value={r.mode} className="w-36" onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, mode: e.target.value as PayMode } : x)))}>
                        {splitModes.map((m) => <option key={m}>{m}</option>)}
                      </Select>
                      <Input type="number" placeholder="Amount" value={r.amount} className="flex-1" autoFocus={i === rows.length - 1}
                        onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, amount: e.target.value } : x)))}
                        onKeyDown={(e) => e.key === 'Enter' && (Math.abs(splitRemaining) < 0.01 ? complete() : splitRemaining > 0 && setRows([...rows, { mode: 'UPI', amount: String(splitRemaining) }]))} />
                      <button disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, k) => k !== i))} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"><Trash2 className="size-3.5" /></button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1">
                    <Button size="sm" icon={<Plus className="size-3.5" />} disabled={splitRemaining <= 0}
                      onClick={() => setRows([...rows, { mode: rows.some((x) => x.mode === 'UPI') ? 'Credit Card' : 'UPI', amount: String(Math.max(0, splitRemaining)) }])}>Add payment</Button>
                    {splitRemaining > 0 && <Button size="sm" variant="ghost" onClick={() => setRows(rows.map((x, k) => (k === rows.length - 1 ? { ...x, amount: String((parseFloat(x.amount) || 0) + splitRemaining) } : x)))}>Fill remaining</Button>}
                  </div>
                  <div className={cn('mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium', Math.abs(splitRemaining) < 0.01 ? 'bg-emerald-50 text-emerald-700' : splitRemaining < 0 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700')}>
                    <span>{Math.abs(splitRemaining) < 0.01 ? 'Balanced — ready to settle' : splitRemaining < 0 ? 'Over-paid by' : 'Remaining balance'}</span>
                    {Math.abs(splitRemaining) >= 0.01 && <span className="tabular">{inr(Math.abs(splitRemaining), true)}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-5 px-5 py-4 md:grid-cols-[1fr_auto]">
            <div>
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4">
                <CheckCircle2 className="size-9 text-emerald-600" />
                <div>
                  <p className="text-[15px] font-semibold text-emerald-800">Payment received · {inr(total)}</p>
                  <p className="text-[12px] text-emerald-700">Bill {order.billNo} settled{order.tableId ? ' · table released for cleaning' : ''} · stock auto-deducted via recipes</p>
                </div>
              </div>
              {change > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3">
                  <span className="font-semibold text-amber-800">Return change to customer</span>
                  <span className="text-[22px] font-bold text-amber-800 tabular">{inr(change)}</span>
                </div>
              )}
              <div className="mt-3 space-y-1.5">
                {order.payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <span className="flex items-center gap-2"><Badge tone="teal">{p.mode}</Badge>{p.ref && <span className="text-[11px] text-slate-400">{p.ref}</span>}</span>
                    <span className="font-semibold tabular">{inr(p.amount)}</span>
                  </div>
                ))}
              </div>
              {order.customerName && <p className="mt-3 text-[12px] text-slate-500">Loyalty: <b className="text-slate-700">+{Math.round(total / 100)} points</b> credited to {order.customerName}</p>}
            </div>
            <div className="hidden max-h-[380px] overflow-y-auto rounded-xl bg-slate-100 p-3 md:block">
              <div className="origin-top scale-[.82] shadow-md"><ThermalReceipt order={order} /></div>
            </div>
          </div>
        )}
      </Modal>
      <RoomGuestPicker open={pickRoom} onClose={() => setPickRoom(false)} outletId={order.outletId} amount={total} title="Charge bill to room"
        onPick={(g) => { useStore.getState().updateOrder(order.id, { resId: g.res.id, roomId: g.room?.id, roomNo: g.room?.no, customerName: order.customerName ?? g.res.guest.name }); setPickRoom(false) }} />
      <PrintPreviewModal open={print} onClose={() => setPrint(false)} title="Print receipt" subtitle={order.billNo}>
        {(w) => <ThermalReceipt order={order} width={w} />}
      </PrintPreviewModal>
    </>
  )
}

export function BillSummary({ t, discountLabel, serviceRate, className, trayLabel }: { t: ReturnType<typeof computeTotals>; discountLabel?: string; serviceRate?: number; className?: string; trayLabel?: boolean }) {
  const Row = ({ l, r, cls }: { l: React.ReactNode; r: React.ReactNode; cls?: string }) => <div className={cn('flex justify-between py-0.5', cls)}><span>{l}</span><span className="tabular">{r}</span></div>
  return (
    <div className={cn('rounded-xl bg-slate-50 p-3 text-[12.5px] text-slate-600', className)}>
      <Row l={`Subtotal (${t.qty} qty)`} r={inr(t.subtotal, true)} />
      {t.discount > 0 && <Row l={`Discount${discountLabel ? ` (${discountLabel})` : ''}`} r={'−' + inr(t.discount, true)} cls="text-emerald-600" />}
      {t.service > 0 && <Row l={`Service charge (${serviceRate}%)`} r={inr(t.service, true)} />}
      <Row l="CGST" r={inr(t.cgst, true)} />
      <Row l="SGST" r={inr(t.sgst, true)} />
      {t.delivery > 0 && <Row l={trayLabel ? 'Tray charge' : 'Delivery charge'} r={inr(t.delivery, true)} />}
      {Math.abs(t.roundOff) > 0.004 && <Row l="Round off" r={(t.roundOff > 0 ? '+' : '−') + inr(Math.abs(t.roundOff), true)} />}
      <div className="mt-2 flex items-end justify-between border-t border-dashed border-slate-300 pt-2">
        <span className="font-semibold text-slate-800">Grand total</span>
        <span className="text-[20px] font-bold text-navy-900 tabular">{inr(t.total)}</span>
      </div>
    </div>
  )
}
