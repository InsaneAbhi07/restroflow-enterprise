import { useEffect, useMemo, useState } from 'react'
import { BedDouble, CalendarPlus, UserPlus } from 'lucide-react'
import { Badge, Button, Field, Input, Modal, Select, Textarea } from '@/components/ui'
import { toast } from '@/store/toast'
import { cn, fmtDateShort, inr } from '@/lib/format'
import { useHotel } from './hotelStore'
import {
  addDays, isWeekend, mealRateFor, nightsBetween, roomFree, roomGst, roomRateFor, stayDates, stayEstimate, today, typeAvailability,
  type BookingSource, type FolioPayMode, type Reservation,
} from './hotelModel'
import { PAY_MODES, SOURCES, SectionTitle } from './hotelUi'

export interface ResPreset { typeId?: string; roomId?: string; arrival?: string }

export function ReservationModal({ open, onClose, editId, walkIn, preset, onSaved }: {
  open: boolean; onClose: () => void; editId?: string; walkIn?: boolean; preset?: ResPreset; onSaved?: (r: Reservation) => void
}) {
  const { types, rooms, plans, reservations, config, createReservation, updateReservation } = useHotel()
  const editing = reservations.find((r) => r.id === editId)
  /** in-house stays only change dates / occupancy here — room moves have their own flow */
  const inHouse = editing?.status === 'In House'

  const blank = () => {
    const arrival = walkIn ? today() : preset?.arrival ?? today()
    const roomType = preset?.roomId ? rooms.find((r) => r.id === preset.roomId)?.typeId : undefined
    return {
      name: '', phone: '', email: '', company: '', gstin: '', nationality: 'Indian',
      arrival, departure: addDays(arrival, 1), adults: 2, children: 0,
      typeId: preset?.typeId ?? roomType ?? types[0]?.id ?? '', planId: 'rp_cp', roomId: preset?.roomId ?? '',
      source: (walkIn ? 'Walk-in' : 'Phone') as BookingSource, otaRef: '', notes: '',
      roomRate: 0, rateTouched: false, advance: 0, advMode: 'UPI' as FolioPayMode,
    }
  }
  const [f, setF] = useState(blank)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))

  useEffect(() => {
    if (!open) return
    if (editing) {
      setF({
        ...blank(), name: editing.guest.name, phone: editing.guest.phone, email: editing.guest.email, company: editing.guest.company ?? '', gstin: editing.guest.gstin ?? '',
        nationality: editing.guest.nationality, arrival: editing.arrival, departure: editing.departure, adults: editing.adults, children: editing.children,
        typeId: editing.typeId, planId: editing.planId, roomId: editing.roomId ?? '', source: editing.source, otaRef: editing.otaRef ?? '', notes: editing.notes ?? '',
        roomRate: editing.roomRate, rateTouched: true,
      })
    } else setF(blank())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editId])

  const type = types.find((t) => t.id === f.typeId)
  const plan = plans.find((p) => p.id === f.planId)
  const autoRate = type ? roomRateFor(type, f.adults, f.children) : 0
  const roomRate = f.rateTouched ? f.roomRate : autoRate
  const mealRate = mealRateFor(plan, f.adults, f.children)
  const nights = nightsBetween(f.arrival, f.departure)
  const est = stayEstimate({ roomRate, mealRate, arrival: f.arrival, departure: f.departure }, config)
  const weekendNights = stayDates(f.arrival, f.departure).filter((d) => isWeekend(d, config)).length

  const avail = useMemo(() => Object.fromEntries(types.map((t) => [t.id, typeAvailability(t.id, f.arrival, f.departure, rooms, reservations, editId)])), [types, rooms, reservations, f.arrival, f.departure, editId])
  const freeRooms = rooms.filter((r) => r.typeId === f.typeId && r.hk !== 'Out of Order' && roomFree(r.id, f.arrival, f.departure, reservations, editId))
  useEffect(() => { if (!inHouse && f.roomId && !freeRooms.some((r) => r.id === f.roomId)) set('roomId', '') }, [f.typeId, f.arrival, f.departure]) // eslint-disable-line react-hooks/exhaustive-deps

  const errors: string[] = []
  if (!f.name.trim()) errors.push('Guest name is required')
  if (!/^[+\d][\d\s-]{7,}$/.test(f.phone.trim())) errors.push('Enter a valid phone number')
  if (nights < 1) errors.push('Departure must be after arrival')
  if (!walkIn && !editing && f.arrival < today()) errors.push('Arrival cannot be in the past')
  if (type && f.adults > type.maxAdults) errors.push(`${type.name} allows max ${type.maxAdults} adults`)
  if (type && f.children > type.maxChildren) errors.push(`${type.name} allows max ${type.maxChildren} children`)
  if (!inHouse && (avail[f.typeId] ?? 0) < 1) errors.push(`No ${type?.name ?? 'rooms'} available for these dates`)
  if (inHouse && f.roomId && !roomFree(f.roomId, f.arrival, f.departure, reservations, editId)) errors.push('Room is booked by another guest for the new dates – move the guest first')
  if (walkIn && !f.roomId) errors.push('Pick a room for the walk-in guest')
  if (f.source === 'Corporate' && !f.company.trim()) errors.push('Company name is needed for corporate bookings')

  const save = () => {
    if (errors.length) return toast.error('Cannot save reservation', errors[0])
    const guest = {
      ...(editing?.guest ?? { idType: 'Aadhaar' as const, idNo: '', address: '' }),
      name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), nationality: f.nationality.trim() || 'Indian',
      company: f.company.trim() || undefined, gstin: f.gstin.trim() || undefined,
    }
    const body = {
      guest, source: f.source, otaRef: f.otaRef.trim() || undefined, typeId: f.typeId, roomId: f.roomId || undefined, planId: f.planId,
      arrival: f.arrival, departure: f.departure, adults: f.adults, children: f.children, roomRate, mealRate, notes: f.notes.trim() || undefined,
    }
    if (editing) {
      updateReservation(editing.id, body)
      toast.success('Reservation updated', `${editing.no} · ${guest.name}`)
      onSaved?.({ ...editing, ...body })
    } else {
      const r = createReservation(body, f.advance > 0 ? { mode: f.advMode, amount: f.advance } : undefined)
      toast.success(walkIn ? 'Walk-in booked' : 'Reservation confirmed', `${r.no} · ${guest.name} · ${nights} night${nights > 1 ? 's' : ''}`)
      onSaved?.(r)
    }
    onClose()
  }

  const num = (v: string) => Math.max(0, Number(v) || 0)

  return (
    <Modal open={open} onClose={onClose} size="xl" icon={walkIn ? <UserPlus /> : <CalendarPlus />}
      title={editing ? `Edit reservation ${editing.no}` : walkIn ? 'Walk-in guest' : 'New reservation'}
      subtitle={`${config.name} · check-in ${config.checkInTime} / check-out ${config.checkOutTime}`}
      footer={<>
        {errors.length > 0 && <span className="mr-auto truncate text-[12px] text-rose-600">{errors[0]}</span>}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={errors.length > 0}>{editing ? 'Save changes' : walkIn ? 'Continue to check-in' : 'Confirm booking'}</Button>
      </>}>
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <section>
            <SectionTitle>Guest</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" required><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Guest name" autoFocus /></Field>
              <Field label="Mobile" required><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98xxx xxxxx" /></Field>
              <Field label="Email"><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="guest@email.com" /></Field>
              <Field label="Nationality"><Input value={f.nationality} onChange={(e) => set('nationality', e.target.value)} /></Field>
              <Field label="Company (bill-to)" hint="For corporate / GST invoice"><Input value={f.company} onChange={(e) => set('company', e.target.value)} placeholder="Optional" /></Field>
              <Field label="Company GSTIN"><Input value={f.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} placeholder="Optional" /></Field>
            </div>
          </section>

          <section>
            <SectionTitle>Stay</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Arrival" required><Input type="date" value={f.arrival} disabled={walkIn || inHouse} min={editing ? undefined : today()} onChange={(e) => setF((x) => ({ ...x, arrival: e.target.value, departure: x.departure <= e.target.value ? addDays(e.target.value, 1) : x.departure }))} /></Field>
              <Field label="Departure" required><Input type="date" value={f.departure} min={addDays(f.arrival, 1)} onChange={(e) => set('departure', e.target.value)} /></Field>
              <Field label="Adults"><Input type="number" min={1} value={f.adults} onChange={(e) => set('adults', Math.max(1, num(e.target.value)))} /></Field>
              <Field label="Children" hint="Under 12"><Input type="number" min={0} value={f.children} onChange={(e) => set('children', num(e.target.value))} /></Field>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-5">
              {types.map((t) => {
                const a = avail[t.id] ?? 0
                return (
                  <button key={t.id} type="button" disabled={inHouse || (a < 1 && t.id !== f.typeId)} onClick={() => setF((x) => ({ ...x, typeId: t.id, rateTouched: false }))}
                    className={cn('rounded-xl border p-2.5 text-left transition disabled:opacity-40', f.typeId === t.id ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300')}>
                    <div className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: t.color }} /><span className="text-[11px] font-bold text-slate-500">{t.code}</span></div>
                    <div className="mt-0.5 truncate text-[12.5px] font-semibold text-slate-800">{t.name}</div>
                    <div className="text-[11.5px] text-slate-500 tabular">{inr(t.baseRate)}</div>
                    <div className={cn('mt-1 text-[11px] font-medium', a < 1 ? 'text-rose-600' : a <= 2 ? 'text-amber-600' : 'text-emerald-600')}>{a < 1 ? 'Sold out' : `${a} left`}</div>
                  </button>
                )
              })}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Meal plan">
                <Select value={f.planId} onChange={(e) => set('planId', e.target.value)}>
                  {plans.filter((p) => p.active || p.id === f.planId).map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}{p.addonPerAdult ? ` (+${inr(p.addonPerAdult)}/adult)` : ''}</option>)}
                </Select>
              </Field>
              <Field label={walkIn ? 'Room' : 'Room (optional)'} required={walkIn} hint={`${freeRooms.length} free for these dates`}>
                <Select value={f.roomId} disabled={inHouse} onChange={(e) => set('roomId', e.target.value)}>
                  <option value="">{walkIn ? '— Select room —' : 'Assign at check-in'}</option>
                  {inHouse && <option value={f.roomId}>{rooms.find((r) => r.id === f.roomId)?.no} (current)</option>}
                  {!inHouse && freeRooms.map((r) => <option key={r.id} value={r.id}>{r.no} · {r.view} view{r.hk === 'Dirty' ? ' · dirty' : ''}</option>)}
                </Select>
              </Field>
              <Field label="Source">
                <Select value={f.source} disabled={walkIn} onChange={(e) => set('source', e.target.value as BookingSource)}>
                  {SOURCES.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
            </div>
            {['Booking.com', 'MakeMyTrip', 'Agoda', 'Expedia', 'Travel Agent'].includes(f.source) && (
              <Field label="OTA / agent reference" className="mt-3"><Input value={f.otaRef} onChange={(e) => set('otaRef', e.target.value)} placeholder="Booking ID from channel" /></Field>
            )}
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <Field label="Special requests / notes"><Textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Early arrival, extra pillows, airport pickup…" /></Field>
            {!editing && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Advance received"><Input type="number" min={0} value={f.advance || ''} onChange={(e) => set('advance', num(e.target.value))} placeholder="₹0" /></Field>
                <Field label="Mode"><Select value={f.advMode} onChange={(e) => set('advMode', e.target.value as FolioPayMode)}>{PAY_MODES.filter((m) => m !== 'Bill to Company').map((m) => <option key={m}>{m}</option>)}</Select></Field>
              </div>
            )}
          </section>
        </div>

        {/* summary */}
        <aside className="h-fit space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-800"><BedDouble className="size-4 text-slate-400" />{type?.name ?? '—'}</div>
          <p className="text-[12px] text-slate-500">{fmtDateShort(f.arrival)} → {fmtDateShort(f.departure)} · {nights} night{nights === 1 ? '' : 's'} · {f.adults}A{f.children ? ` + ${f.children}C` : ''}</p>
          <Field label="Room rate / night (weekday)" hint={f.rateTouched && roomRate !== autoRate ? `Rack rate ${inr(autoRate)} · ${roomRate < autoRate ? 'discounted' : 'overridden'}` : 'Rack rate incl. extra-person charges'}>
            <Input type="number" min={0} value={roomRate} onChange={(e) => setF((x) => ({ ...x, roomRate: num(e.target.value), rateTouched: true }))} suffix="₹" />
          </Field>
          <div className="space-y-1.5 border-t border-slate-200 pt-3 text-[12.5px]">
            <Row k={`Room · ${nights} night${nights === 1 ? '' : 's'}`} v={inr(est.room)} />
            {weekendNights > 0 && <p className="-mt-1 text-[11px] text-slate-400">incl. {weekendNights} weekend night{weekendNights > 1 ? 's' : ''} at +{config.weekendUplift}%</p>}
            {est.meal > 0 && <Row k={`Meal plan ${plan?.code} (${inr(mealRate)}/night)`} v={inr(est.meal)} />}
            <Row k="GST" v={inr(est.tax)} />
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-[15px] font-semibold text-slate-900"><span>Estimated total</span><span className="tabular">{inr(est.total)}</span></div>
          </div>
          <Badge tone={roomGst(roomRate, config) > config.gstLow ? 'amber' : 'green'}>Room GST {roomGst(roomRate, config)}% · tariff {roomRate > config.gstThreshold ? 'above' : 'up to'} {inr(config.gstThreshold)}</Badge>
          {f.advance > 0 && <Row k="Advance" v={`− ${inr(f.advance)}`} />}
        </aside>
      </div>
    </Modal>
  )
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-2 text-slate-600"><span className="truncate">{k}</span><span className="shrink-0 tabular font-medium text-slate-800">{v}</span></div>
)
