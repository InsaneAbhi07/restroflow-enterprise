import { useState } from 'react'
import { ArrowRightLeft, Ban, CalendarClock, IndianRupee, LogIn, LogOut, Pencil, Plus, Printer, UserX } from 'lucide-react'
import { Badge, Button, Drawer, EmptyState, KeyValue, Tabs, type Tone } from '@/components/ui'
import { PrintPreviewModal } from '@/components/print/Print'
import { usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { cn, fmtDate, fmtDateShort, fmtDateTime, fmtTime, inr } from '@/lib/format'
import { useHotel } from './hotelStore'
import { chargeTax, folioTotals, nightsBetween, stayEstimate, today, type ChargeKind } from './hotelModel'
import { ResBadge, SectionTitle, SourceTag } from './hotelUi'
import { ReservationModal } from './ReservationModal'
import { CheckInModal } from './CheckInModal'
import { AddChargeModal, AddPaymentModal, CancelReservationModal, CheckOutModal, MoveRoomModal } from './FolioDialogs'
import { FolioInvoice } from './FolioInvoice'

type ModalKey = 'edit' | 'checkin' | 'checkout' | 'charge' | 'payment' | 'move' | 'cancel' | 'print'
const KIND_TONE: Record<ChargeKind, Tone> = { Room: 'navy', 'F&B': 'orange', Service: 'teal', Allowance: 'red' }

export function StayDrawer({ resId, onClose }: { resId: string; onClose: () => void }) {
  const { reservations, rooms, types, plans, config, markNoShow } = useHotel()
  const { can } = usePermission()
  const r = reservations.find((x) => x.id === resId)
  const [tab, setTab] = useState<'folio' | 'details'>(r && (r.status === 'In House' || r.status === 'Checked Out') ? 'folio' : 'details')
  const [modal, setModal] = useState<ModalKey | null>(null)
  if (!r) return null

  const room = rooms.find((x) => x.id === r.roomId)
  const type = types.find((x) => x.id === r.typeId)
  const plan = plans.find((x) => x.id === r.planId)
  const ft = folioTotals(r)
  const est = stayEstimate(r, config)
  const t = today()
  const edit = can('hotel', 'edit'), create = can('hotel', 'create')
  const close = () => setModal(null)

  const byDate = Array.from(new Set(r.charges.map((c) => c.date))).sort().reverse().map((d) => ({ date: d, items: r.charges.filter((c) => c.date === d) }))

  const primary = r.status === 'Confirmed' ? (r.arrival <= t && create ? <Button variant="success" icon={<LogIn className="size-3.5" />} onClick={() => setModal('checkin')}>Check in</Button> : null)
    : r.status === 'In House' ? (edit ? <Button variant="primary" icon={<LogOut className="size-3.5" />} onClick={() => setModal('checkout')}>Check out</Button> : null)
      : r.status === 'Checked Out' ? <Button variant="primary" icon={<Printer className="size-3.5" />} onClick={() => setModal('print')}>Invoice</Button> : null

  return (
    <>
      <Drawer open onClose={onClose} width={520}
        icon={<span className={cn('flex size-10 items-center justify-center rounded-xl text-[13px] font-bold text-white', r.status === 'In House' ? 'bg-sky-600' : 'bg-navy-900')}>{room?.no ?? type?.code}</span>}
        title={r.guest.name} subtitle={`${r.no} · ${type?.name} · ${fmtDateShort(r.arrival)} → ${fmtDateShort(r.departure)}`}
        footer={<>
          {r.status !== 'Cancelled' && r.status !== 'Checked Out' && can('hotel', 'print') && <Button icon={<Printer className="size-3.5" />} onClick={() => setModal('print')}>Folio</Button>}
          {primary}
        </>}>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <ResBadge status={r.status} /><SourceTag source={r.source} />
          {r.guest.company && <Badge tone="navy">{r.guest.company}</Badge>}
          {r.status === 'In House' && r.departure <= t && <Badge tone="amber">Due out today</Badge>}
          {r.status === 'Confirmed' && !r.roomId && <Badge tone="gray">Room not assigned</Badge>}
        </div>

        {(r.status === 'Confirmed' || r.status === 'In House') && (edit || create) && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {edit && <Button size="sm" icon={<Pencil className="size-3.5" />} onClick={() => setModal('edit')}>{r.status === 'In House' ? 'Extend / amend' : 'Edit'}</Button>}
            {edit && <Button size="sm" icon={<ArrowRightLeft className="size-3.5" />} onClick={() => setModal('move')}>{r.status === 'In House' ? 'Room move' : r.roomId ? 'Change room' : 'Assign room'}</Button>}
            {r.status === 'Confirmed' && create && <Button size="sm" icon={<IndianRupee className="size-3.5" />} onClick={() => setModal('payment')}>Advance</Button>}
            {r.status === 'Confirmed' && r.arrival <= t && edit && <Button size="sm" icon={<UserX className="size-3.5" />} onClick={() => { markNoShow(r.id); toast.warning('Marked as no-show', r.no) }}>No-show</Button>}
            {r.status === 'Confirmed' && edit && <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" icon={<Ban className="size-3.5" />} onClick={() => setModal('cancel')}>Cancel booking</Button>}
          </div>
        )}

        <div className="mb-4 grid grid-cols-3 gap-2">
          <Kpi label={r.status === 'Confirmed' ? 'Estimated stay' : 'Charges'} value={inr(r.status === 'Confirmed' ? est.total : ft.total)} />
          <Kpi label="Paid" value={inr(ft.paid)} />
          <Kpi label="Balance" value={inr(r.status === 'Confirmed' ? est.total - ft.paid : ft.balance)} tone={ft.balance > 0 && r.status !== 'Confirmed' ? 'text-rose-600' : 'text-emerald-600'} />
        </div>

        <Tabs value={tab} onChange={setTab} className="mb-4" items={[{ value: 'folio', label: 'Folio', count: r.charges.length }, { value: 'details', label: 'Booking & guest' }]} />

        {tab === 'folio' ? (
          <div className="space-y-4">
            {r.status === 'In House' && create && (
              <div className="flex gap-2">
                <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setModal('charge')}>Post charge</Button>
                <Button size="sm" icon={<IndianRupee className="size-3.5" />} onClick={() => setModal('payment')}>Payment</Button>
              </div>
            )}
            {byDate.length === 0 ? (
              <EmptyState className="rounded-xl border border-dashed border-slate-200 py-6" icon={<CalendarClock />} title="No charges yet" body={r.status === 'Confirmed' ? 'Charges start posting after check-in (room tariff is posted by night audit).' : 'Room tariff is posted each night by the night audit.'} />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                {byDate.map((g) => (
                  <div key={g.date}>
                    <div className="bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500">{fmtDate(g.date)}</div>
                    <ul className="divide-y divide-slate-100">
                      {g.items.map((c) => (
                        <li key={c.id} className="flex items-start gap-2 px-3 py-2 text-[12.5px]">
                          <Badge tone={KIND_TONE[c.kind]} className="mt-0.5">{c.kind}</Badge>
                          <div className="min-w-0 flex-1"><div className="text-slate-800">{c.desc}</div><div className="text-[11px] text-slate-400">{inr(c.amount, true)} + {c.gst}% GST · {c.by}</div></div>
                          <span className={cn('font-medium tabular', c.amount < 0 ? 'text-rose-600' : 'text-slate-800')}>{inr(c.amount + chargeTax(c), true)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            <div>
              <SectionTitle>Payments</SectionTitle>
              {r.payments.length === 0 ? <p className="text-[12px] text-slate-400">No payments yet.</p> : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {r.payments.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 px-3 py-2 text-[12.5px]">
                      <Badge tone={p.kind === 'Refund' ? 'red' : p.mode === 'Bill to Company' ? 'navy' : 'green'}>{p.kind}</Badge>
                      <span className="flex-1 text-slate-700">{p.mode}{p.ref && <span className="text-slate-400"> · {p.ref}</span>}<span className="block text-[11px] text-slate-400">{fmtDateTime(p.at)} · {p.by}</span></span>
                      <span className="font-medium tabular">{p.kind === 'Refund' ? '− ' : ''}{inr(p.amount, true)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-3">
              <KeyValue cols={2} items={[
                ['Arrival', `${fmtDate(r.arrival)}${r.checkedInAt ? ' · ' + fmtTime(r.checkedInAt) : ` · ${config.checkInTime}`}`],
                ['Departure', `${fmtDate(r.departure)}${r.checkedOutAt ? ' · ' + fmtTime(r.checkedOutAt) : ` · ${config.checkOutTime}`}`],
                ['Nights', String(nightsBetween(r.arrival, r.departure))],
                ['Guests', `${r.adults} adult${r.adults > 1 ? 's' : ''}${r.children ? ` · ${r.children} child` : ''}`],
                ['Room', room ? `${room.no} · ${room.view} view` : 'Not assigned'],
                ['Plan', plan ? `${plan.code} · ${plan.meals}` : '—'],
                ['Room rate / night', inr(r.roomRate)],
                ['Meal plan / night', r.mealRate ? inr(r.mealRate) : '—'],
                ['Booked', `${fmtDateShort(r.createdAt)} by ${r.createdBy}`],
                ['Channel ref', r.otaRef ?? '—'],
              ]} />
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <SectionTitle>Guest</SectionTitle>
              <KeyValue cols={2} items={[
                ['Mobile', r.guest.phone], ['Email', r.guest.email || '—'],
                ['Nationality', r.guest.nationality], ['ID proof', r.guest.idNo ? `${r.guest.idType} · ${r.guest.idNo}` : 'Collect at check-in'],
                ['Address', r.guest.address || '—'], ['Company GSTIN', r.guest.gstin ?? '—'],
                ...(r.guest.visaNo ? [['Visa', r.guest.visaNo] as [string, string]] : []),
              ]} />
            </div>
            {r.notes && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800"><b>Notes:</b> {r.notes}</p>}
            {r.cancelReason && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700"><b>Cancelled {r.cancelledAt ? fmtDateShort(r.cancelledAt) : ''}:</b> {r.cancelReason}</p>}
            {r.invoiceNo && <p className="text-[12px] text-slate-500">Invoice <b className="text-slate-700">{r.invoiceNo}</b> · checked out {r.checkedOutAt ? fmtDateTime(r.checkedOutAt) : ''}</p>}
          </div>
        )}
      </Drawer>

      {modal === 'edit' && <ReservationModal open onClose={close} editId={r.id} />}
      {modal === 'checkin' && <CheckInModal resId={r.id} onClose={close} />}
      {modal === 'checkout' && <CheckOutModal res={r} onClose={close} onDone={() => setTimeout(() => setModal('print'), 50)} />}
      {modal === 'charge' && <AddChargeModal res={r} onClose={close} />}
      {modal === 'payment' && <AddPaymentModal res={r} onClose={close} />}
      {modal === 'move' && <MoveRoomModal res={r} onClose={close} />}
      {modal === 'cancel' && <CancelReservationModal res={r} onClose={close} />}
      {modal === 'print' && (
        <PrintPreviewModal open onClose={close} paper="a4" title={r.invoiceNo ? `Invoice ${r.invoiceNo}` : `Folio ${r.no}`} subtitle={`${r.guest.name} · Room ${room?.no ?? '—'}`}>
          <FolioInvoice res={r} />
        </PrintPreviewModal>
      )}
    </>
  )
}

const Kpi = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
  <div className="rounded-xl border border-slate-200 px-3 py-2">
    <p className="text-[11px] text-slate-500">{label}</p>
    <p className={cn('text-[15px] font-semibold tabular text-slate-900', tone)}>{value}</p>
  </div>
)
