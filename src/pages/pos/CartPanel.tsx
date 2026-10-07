import type React from 'react'
import { useState } from 'react'
import { Armchair, BadgePercent, Banknote, ChefHat, CreditCard, FileText, Minus, PauseCircle, Plus, Printer, QrCode, Save, ShoppingBag, SplitSquareHorizontal, StickyNote, Trash2, Users, Wallet, Bike, UtensilsCrossed, Lock, Clock, Receipt, BedDouble, X, Coffee } from 'lucide-react'
import { Badge, Button, Input, Kbd, Segmented, Select, StatusBadge, Toggle, VegMark } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { waitersFor } from '@/data/operations'
import { lineTotal } from '@/lib/billing'
import { cn, inr, timeAgo } from '@/lib/format'
import type { OrderSource, OrderType } from '@/types'
import type { PosCtl } from './usePosOrder'
import { CustomerPicker } from './CustomerPicker'
import { usePosUI, type QuickPay } from './posStore'
import { SOURCE_TONE } from './posUtils'
import { useHotel } from '@/pages/hotel/hotelStore'
import { mealAllowance } from '@/pages/hotel/roomBilling'

export interface CartActions {
  onTable: () => void; onRoom: () => void; onDiscount: () => void; onCancelLine: (id: string, name: string) => void
  onSave: () => void; onHold: () => void; onKot: () => void; onKotPrint: () => void; onSaveBill: () => void; onSettle: () => void; onQuickSettle: () => void
}

const QP: { id: QuickPay; label: string; icon: React.ReactNode }[] = [
  { id: 'Cash', label: 'Cash', icon: <Banknote className="size-3.5" /> },
  { id: 'Card', label: 'Card', icon: <CreditCard className="size-3.5" /> },
  { id: 'UPI', label: 'UPI', icon: <QrCode className="size-3.5" /> },
  { id: 'Due', label: 'Due', icon: <Wallet className="size-3.5" /> },
  { id: 'Part', label: 'Part', icon: <SplitSquareHorizontal className="size-3.5" /> },
]
const QP_ROOM = { id: 'Room' as const, label: 'Room', icon: <BedDouble className="size-3.5" /> }

export function CartPanel({ ctl, readOnly, actions, customerSignal, isHotel }: { ctl: PosCtl; readOnly: boolean; actions: CartActions; customerSignal: number; isHotel: boolean }) {
  const settings = useStore((s) => s.settings)
  const { view, totals: t, type, order } = ctl
  const { quickPay: qpRaw, setQuickPay } = usePosUI()
  const quickPay = qpRaw === 'Room' && !isHotel ? 'Cash' : qpRaw
  const payModes = isHotel ? [...QP.slice(0, 3), QP_ROOM, ...QP.slice(3)] : QP
  const stay = useHotel((s) => (view.resId ? s.reservations.find((r) => r.id === view.resId) : undefined))
  const plan = useHotel((s) => s.plans.find((p) => p.id === stay?.planId))
  const mealUse = useHotel((s) => s.mealUse)
  const meal = mealAllowance(stay, plan, mealUse, order?.id)
  const mealApplied = view.discount.reason?.startsWith('Meal plan')
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const waiters = waitersFor(ctl.outletId)
  const items = view.items
  const live = items.filter((i) => !i.cancelled)
  const pendingCount = live.filter((i) => !i.kotNo).length
  const empty = live.length === 0
  const dis = readOnly

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-slate-200 bg-white">
      {/* ------------ header ------------ */}
      <div className="space-y-2 border-b border-slate-200 px-3 pt-2.5 pb-2.5">
        <div className="flex items-center gap-2">
          <Segmented size="md" className="flex-1" value={type} onChange={(v: OrderType) => !dis && ctl.setType(v)}
            items={[
              { value: 'Dine-in', label: 'Dine-in', icon: <UtensilsCrossed className="size-3.5" /> }, { value: 'Takeaway', label: isHotel ? 'Take' : 'Takeaway', icon: <ShoppingBag className="size-3.5" /> },
              { value: 'Delivery', label: isHotel ? 'Deliv.' : 'Delivery', icon: <Bike className="size-3.5" /> },
              ...(isHotel ? [{ value: 'Room Service' as OrderType, label: 'Room', icon: <BedDouble className="size-3.5" /> }] : []),
            ]} />
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-slate-500">
          <span className="font-mono font-semibold text-slate-800">{order ? order.no : 'New order'}</span>
          {order && <StatusBadge status={order.status === 'Draft' ? 'Draft' : order.status} />}
          {order && order.source !== 'POS' && <Badge tone={SOURCE_TONE[order.source]}>{order.source}</Badge>}
          {order?.billNo && <Badge tone="violet">{order.billNo}</Badge>}
          <span className="ml-auto flex items-center gap-1"><Clock className="size-3" />{order ? timeAgo(order.createdAt) : 'now'}</span>
        </div>

        {type === 'Dine-in' && (
          <div className="flex items-center gap-1.5">
            <button disabled={dis} onClick={actions.onTable}
              className={cn('flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-semibold transition', view.tableLabel ? 'border-navy-900 bg-navy-900 text-white' : 'border-dashed border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100')}>
              <Armchair className="size-3.5" />{view.tableLabel ? `Table ${view.tableLabel}` : 'Select table'}
            </button>
            <Select disabled={dis} value={view.waiterId ?? ''} className="min-w-0 flex-1" onChange={(e) => { const w = waiters.find((x) => x.id === e.target.value); ctl.patch({ waiterId: w?.id, waiterName: w?.name }) }}>
              <option value="">Captain…</option>
              {waiters.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
            <div className="flex h-8 shrink-0 items-center rounded-lg border border-slate-200" title="Pax">
              <Users className="ml-1.5 size-3.5 text-slate-400" />
              <button disabled={dis} className="px-1 text-slate-500 hover:text-slate-900" onClick={() => ctl.patch({ pax: Math.max(1, (view.pax ?? 2) - 1) })}><Minus className="size-3" /></button>
              <span className="w-4 text-center text-[12px] font-semibold tabular">{view.pax ?? 2}</span>
              <button disabled={dis} className="pr-1.5 pl-1 text-slate-500 hover:text-slate-900" onClick={() => ctl.patch({ pax: (view.pax ?? 2) + 1 })}><Plus className="size-3" /></button>
            </div>
          </div>
        )}

        {type === 'Delivery' && (
          <div className="space-y-1.5 rounded-lg bg-slate-50 p-2">
            <Segmented size="sm" className="w-full" value={(['Phone', 'Swiggy', 'Zomato'].includes(view.source) ? view.source : 'Phone') as OrderSource}
              onChange={(v: OrderSource) => !dis && ctl.patch({ source: v, deliveryCharge: v === 'Phone' ? 40 : 0 })}
              items={[{ value: 'Phone', label: 'Phone order' }, { value: 'Swiggy', label: 'Swiggy' }, { value: 'Zomato', label: 'Zomato' }]} />
            <div className="grid grid-cols-2 gap-1.5">
              <Input disabled={dis} placeholder="Customer name" value={view.customerName ?? ''} onChange={(e) => ctl.patch({ customerName: e.target.value })} />
              <Input disabled={dis} placeholder="Mobile" value={view.customerPhone ?? ''} onChange={(e) => ctl.patch({ customerPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
            </div>
            <Input disabled={dis} placeholder="Delivery address, landmark" value={view.note ?? ''} onChange={(e) => ctl.patch({ note: e.target.value })} />
          </div>
        )}

        {type === 'Room Service' && (
          <button disabled={dis} onClick={actions.onRoom}
            className={cn('flex h-8 w-full items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-semibold transition', view.roomNo ? 'border-sky-600 bg-sky-600 text-white' : 'border-dashed border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100')}>
            <BedDouble className="size-3.5" />{view.roomNo ? `Room ${view.roomNo} · ${view.customerName ?? ''}` : 'Select room'}
            {view.roomNo && <span className="ml-auto text-[11px] font-normal text-white/80">tray {inr(t.delivery)}</span>}
          </button>
        )}
        {isHotel && type !== 'Room Service' && type !== 'Delivery' && (
          view.resId ? (
            <div className="flex h-8 items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 text-[12px] text-sky-800 ring-1 ring-sky-200">
              <BedDouble className="size-3.5" />Hotel guest · <b>Room {view.roomNo}</b><span className="truncate">{view.customerName}</span>
              {!dis && <button onClick={ctl.unlinkRoom} title="Unlink room" className="ml-auto rounded p-0.5 hover:bg-sky-100"><X className="size-3.5" /></button>}
            </div>
          ) : (
            <button disabled={dis} onClick={actions.onRoom} className="flex h-7 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 text-[11.5px] font-medium text-slate-500 hover:border-sky-400 hover:text-sky-700">
              <BedDouble className="size-3.5" />Hotel guest? Link room to charge bill / use meal plan
            </button>
          )
        )}
        {meal && !dis && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11.5px] text-emerald-800 ring-1 ring-emerald-200">
            <Coffee className="size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate"><b>{meal.plan.code}</b> {meal.plan.meals.toLowerCase()} · {inr(meal.left)} of {inr(meal.allowance)} left today</span>
            {mealApplied
              ? <button onClick={() => ctl.patch({ discount: { type: 'pct', value: 0 } })} className="font-semibold hover:underline">Remove</button>
              : <button disabled={meal.left <= 0 || empty} onClick={() => ctl.patch({ discount: { type: 'flat', value: Math.min(meal.left, t.subtotal), reason: `Meal plan ${meal.plan.code} · Room ${view.roomNo}` } })} className="font-semibold hover:underline disabled:opacity-40 disabled:no-underline">Apply</button>}
          </div>
        )}

        <CustomerPicker disabled={dis} outletId={ctl.outletId} customerId={view.customerId} name={view.customerName} phone={view.customerPhone} openSignal={customerSignal}
          onChange={(c) => ctl.patch(c)} />
      </div>

      {/* ------------ lines ------------ */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><ShoppingBag className="size-5" /></div>
            <p className="text-[13px] font-semibold text-slate-700">Cart is empty</p>
            <p className="mt-1 text-[12px] text-slate-400">Tap items, or type a code like <b className="font-mono">113</b> / <b className="font-mono">2*PBM</b> and press Enter</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((i, idx) => (
              <div key={i.id} className={cn('group px-3 py-2', i.cancelled && 'bg-rose-50/40 opacity-60', !i.kotNo && !i.cancelled && 'bg-brand-50/25')}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 w-4 text-[10.5px] text-slate-300 tabular">{idx + 1}</span>
                  <VegMark veg={i.veg} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-[12.5px] font-semibold leading-tight text-slate-800', i.cancelled && 'line-through')}>
                      {i.name}{i.variant && <span className="font-normal text-slate-500"> ({i.variant})</span>}
                    </p>
                    {i.modifiers?.length ? <p className="text-[11px] text-slate-500">+ {i.modifiers.map((m) => m.name + (m.price ? ` ₹${m.price}` : '')).join(', ')}</p> : null}
                    {i.note && noteFor !== i.id && <p className="text-[11px] italic text-amber-700">» {i.note}</p>}
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 tabular">{inr(i.price)}</span>
                      {i.kotNo ? <span className="inline-flex items-center gap-0.5 rounded bg-sky-50 px-1 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-200"><ChefHat className="size-2.5" />KOT {i.kotNo}</span>
                        : !i.cancelled && <span className="rounded bg-brand-50 px-1 text-[10px] font-semibold text-brand-700 ring-1 ring-brand-200">NEW</span>}
                      {i.cancelled && <span className="rounded bg-rose-100 px-1 text-[10px] font-semibold text-rose-700">CANCELLED</span>}
                      {!i.cancelled && !dis && (
                        <button onClick={() => setNoteFor(noteFor === i.id ? null : i.id)} title="Add note" className={cn('rounded p-0.5 transition', i.note ? 'text-amber-600' : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-600')}><StickyNote className="size-3" /></button>
                      )}
                    </div>
                    {noteFor === i.id && (
                      <Input autoFocus className="mt-1 [&_input]:h-7 [&_input]:text-[12px]" defaultValue={i.note} placeholder="Instruction for kitchen, Enter to save"
                        onKeyDown={(e) => { if (e.key === 'Enter') { ctl.setLineNote(i.id, (e.target as HTMLInputElement).value); setNoteFor(null) } }}
                        onBlur={(e) => { ctl.setLineNote(i.id, e.target.value); setNoteFor(null) }} />
                    )}
                  </div>
                  {!i.cancelled && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[13px] font-semibold text-slate-900 tabular">{inr(lineTotal(i))}</span>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center rounded-md border border-slate-200">
                          <button disabled={dis} onClick={() => { if (ctl.changeQty(i.id, -1) === 'needsReason') actions.onCancelLine(i.id, i.name) }} className="flex size-6 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Minus className="size-3" /></button>
                          <span className="w-6 text-center text-[12px] font-bold tabular">{i.qty}</span>
                          <button disabled={dis} onClick={() => ctl.changeQty(i.id, 1)} title={i.kotNo ? 'Adds a new line for the next KOT' : undefined} className="flex size-6 items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Plus className="size-3" /></button>
                        </div>
                        <button disabled={dis} onClick={() => { if (ctl.removeLine(i.id) === 'needsReason') actions.onCancelLine(i.id, i.name) }}
                          title={i.kotNo ? 'Cancel (reason required)' : 'Remove'} className="flex size-6 items-center justify-center rounded-md text-slate-300 hover:bg-rose-50 hover:text-rose-600">
                          {i.kotNo ? <Lock className="size-3" /> : <Trash2 className="size-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------ totals ------------ */}
      <div className="border-t border-slate-200 bg-slate-50/70 px-3 py-2 text-[12px] text-slate-600">
        <Row l={<>Subtotal <span className="text-slate-400">({t.qty} qty)</span></>} r={inr(t.subtotal, true)} />
        <Row l={
          <button disabled={dis || empty} onClick={actions.onDiscount} className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline disabled:text-slate-400 disabled:no-underline">
            <BadgePercent className="size-3.5" />Discount{view.discount.value > 0 && <span className="text-slate-500">({view.discount.type === 'pct' ? view.discount.value + '%' : 'flat'}{view.discount.reason ? ' · ' + view.discount.reason : ''})</span>}
          </button>} r={t.discount > 0 ? <span className="text-emerald-600">−{inr(t.discount, true)}</span> : '—'} />
        <Row l={<span className="inline-flex items-center gap-1.5">Service charge {settings.serviceCharge}%<Toggle size="sm" disabled={dis} checked={view.serviceCharge > 0} onChange={(v) => ctl.patch({ serviceCharge: v ? settings.serviceCharge : 0 })} /></span>} r={inr(t.service, true)} />
        <Row l={`CGST ${(live[0]?.gst ?? 5) / 2}% + SGST ${(live[0]?.gst ?? 5) / 2}%`} r={inr(t.cgst + t.sgst, true)} />
        {type === 'Delivery' && <Row l="Delivery charge" r={inr(t.delivery, true)} />}
        {type === 'Room Service' && <Row l="Tray charge" r={inr(t.delivery, true)} />}
        {Math.abs(t.roundOff) > 0.004 && <Row l="Round off" r={(t.roundOff > 0 ? '+' : '−') + inr(Math.abs(t.roundOff), true)} />}
        <div className="mt-1 flex items-end justify-between border-t border-dashed border-slate-300 pt-1.5">
          <span className="text-[12px] font-semibold text-slate-800">Grand Total {pendingCount > 0 && order?.items.some((i) => i.kotNo) && <span className="ml-1 font-normal text-brand-600">· {pendingCount} new</span>}</span>
          <span className="text-[24px] font-bold leading-none tracking-tight text-navy-900 tabular">{inr(t.total)}</span>
        </div>
      </div>

      {/* ------------ payment + actions ------------ */}
      <div className="space-y-1.5 border-t border-slate-200 p-2.5">
        {settings.pos.quickPayModes && (
          <div className="flex items-center gap-1">
            {payModes.map((p) => (
              <label key={p.id} className={cn('flex h-7 flex-1 cursor-pointer items-center justify-center gap-1 rounded-md border text-[11.5px] font-semibold transition', quickPay === p.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}>
                <input type="radio" name="qp" className="sr-only" checked={quickPay === p.id} onChange={() => setQuickPay(p.id)} />
                <span className={cn('size-2.5 rounded-full border-2', quickPay === p.id ? 'border-brand-500 bg-brand-500 shadow-[inset_0_0_0_1.5px_#fff]' : 'border-slate-300')} />{p.label}
              </label>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-1.5">
          <Button size="sm" disabled={dis || empty} onClick={actions.onSave} icon={<Save className="size-3.5" />} kbd="^S">Save</Button>
          <Button size="sm" disabled={dis || empty} onClick={actions.onHold} icon={<PauseCircle className="size-3.5" />}>Hold</Button>
          <Button size="sm" variant="secondary" disabled={dis || pendingCount === 0} onClick={actions.onKot} icon={<ChefHat className="size-3.5" />} kbd="F9">KOT</Button>
          <Button size="sm" variant="secondary" disabled={dis || pendingCount === 0} onClick={actions.onKotPrint} icon={<Printer className="size-3.5" />} className="col-span-1">KOT & Print</Button>
          <Button size="sm" variant="primary" disabled={dis || empty} onClick={actions.onSaveBill} icon={<FileText className="size-3.5" />}>Save & Print</Button>
          <Button size="sm" variant="primary" disabled={dis || empty} onClick={actions.onSettle} icon={<Receipt className="size-3.5" />} kbd="F4">Settle</Button>
        </div>
        {settings.pos.quickPayModes && (
          <Button size="lg" variant="accent" block disabled={dis || empty} onClick={actions.onQuickSettle} className="justify-between"
            icon={payModes.find((p) => p.id === quickPay)?.icon}>
            <span className="flex-1 text-left">{quickPay === 'Part' ? 'Split payment & Print' : quickPay === 'Room' ? `Charge to Room${view.roomNo ? ' ' + view.roomNo : ''}` : `${quickPay} & Print`}</span>
            <span className="text-[15px] font-bold tabular">{inr(t.total)}</span>
          </Button>
        )}
        {dis && <p className="text-center text-[11px] text-slate-400"><Lock className="mr-1 inline size-3" />Read-only — your role cannot create bills</p>}
        {!dis && <p className="flex items-center justify-center gap-2 text-[10.5px] text-slate-400"><Kbd>F8</Kbd> bill preview <Kbd>Ctrl+B</Kbd> new bill</p>}
      </div>
    </aside>
  )
}

const Row = ({ l, r }: { l: React.ReactNode; r: React.ReactNode }) => (
  <div className="flex items-center justify-between py-[1px]"><span className="min-w-0 truncate">{l}</span><span className="shrink-0 tabular">{r}</span></div>
)
