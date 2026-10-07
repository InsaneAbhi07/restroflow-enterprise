import { useState } from 'react'
import { BrushCleaning, CalendarClock, ExternalLink, Sparkles, UserPlus, Wrench } from 'lucide-react'
import { Badge, Button, Drawer, Field, Input, KeyValue, Modal } from '@/components/ui'
import { usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { cn, fmtDateShort, inr } from '@/lib/format'
import { useHotel } from './hotelStore'
import { folioTotals, roomState } from './hotelModel'
import { RS_STYLE, SectionTitle } from './hotelUi'

export function RoomDrawer({ roomId, onClose, onOpenStay, onWalkIn }: { roomId: string; onClose: () => void; onOpenStay: (resId: string) => void; onWalkIn: (roomId: string) => void }) {
  const { rooms, types, reservations, setHk } = useHotel()
  const { can } = usePermission()
  const [ooo, setOoo] = useState(false)
  const [reason, setReason] = useState('')
  const room = rooms.find((r) => r.id === roomId)
  if (!room) return null
  const type = types.find((t) => t.id === room.typeId)
  const { state, stay, next, dueOut } = roomState(room, reservations)
  const edit = can('hotel', 'edit')
  const upcoming = reservations.filter((r) => r.roomId === room.id && r.status === 'Confirmed').sort((a, b) => a.arrival.localeCompare(b.arrival)).slice(0, 4)

  const hk = (v: 'Clean' | 'Dirty') => { setHk(room.id, v); toast.success(`Room ${room.no} marked ${v.toLowerCase()}`) }

  return (
    <>
      <Drawer open onClose={onClose} width={440}
        icon={<span className={cn('flex size-10 items-center justify-center rounded-xl text-[14px] font-bold text-white', RS_STYLE[state].dot)}>{room.no}</span>}
        title={`Room ${room.no}`} subtitle={`${type?.name} · ${room.floor} · ${room.view} view`}
        footer={state === 'Vacant Clean' && can('hotel', 'create') ? <Button variant="primary" icon={<UserPlus className="size-3.5" />} onClick={() => onWalkIn(room.id)}>Walk-in to this room</Button> : stay ? <Button variant="primary" icon={<ExternalLink className="size-3.5" />} onClick={() => onOpenStay(stay.id)}>Open folio</Button> : undefined}>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11.5px] font-medium ring-1 ring-inset', RS_STYLE[state].chip)}><span className={cn('size-1.5 rounded-full', RS_STYLE[state].dot)} />{state}</span>
            <Badge tone={room.hk === 'Clean' ? 'green' : room.hk === 'Dirty' ? 'amber' : 'gray'}>Housekeeping: {room.hk}</Badge>
            {dueOut && <Badge tone="amber">Due out</Badge>}
            {room.smoking && <Badge>Smoking</Badge>}
          </div>
          {room.hk === 'Out of Order' && room.note && <p className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-[12.5px] text-slate-700"><Wrench className="size-3.5" />{room.note}</p>}

          <div className="rounded-xl border border-slate-200 p-3">
            <KeyValue cols={2} items={[
              ['Rack rate', inr(type?.baseRate ?? 0)], ['Max occupancy', `${type?.maxAdults}A + ${type?.maxChildren}C`],
              ['Bed', type?.bed ?? '—'], ['Size', `${type?.sizeSqft} sq ft`],
            ]} />
            <p className="mt-2 text-[11.5px] text-slate-500">{type?.amenities.join(' · ')}</p>
          </div>

          {stay && (
            <button onClick={() => onOpenStay(stay.id)} className="block w-full rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-left transition hover:border-sky-400">
              <SectionTitle>Current guest</SectionTitle>
              <div className="text-[14px] font-semibold text-slate-900">{stay.guest.name}</div>
              <div className="text-[12px] text-slate-600">{stay.no} · till {fmtDateShort(stay.departure)} · {stay.adults + stay.children} pax</div>
              <div className="mt-1 text-[12px]">Folio balance <b className={folioTotals(stay).balance > 0 ? 'text-rose-600' : 'text-emerald-600'}>{inr(folioTotals(stay).balance)}</b></div>
            </button>
          )}

          {upcoming.length > 0 && (
            <div>
              <SectionTitle>Upcoming bookings</SectionTitle>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {upcoming.map((r) => (
                  <li key={r.id}><button onClick={() => onOpenStay(r.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] hover:bg-slate-50">
                    <CalendarClock className="size-3.5 text-violet-500" /><span className="flex-1 truncate">{r.guest.name}</span>
                    <span className="text-slate-500">{fmtDateShort(r.arrival)} → {fmtDateShort(r.departure)}</span>
                  </button></li>
                ))}
              </ul>
            </div>
          )}
          {!stay && !next && upcoming.length === 0 && <p className="text-[12px] text-slate-400">No upcoming bookings on this room.</p>}

          {edit && (
            <div>
              <SectionTitle>Housekeeping</SectionTitle>
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" variant={room.hk === 'Clean' ? 'success' : 'outline'} icon={<Sparkles className="size-3.5" />} disabled={room.hk === 'Clean'} onClick={() => hk('Clean')}>Clean</Button>
                <Button size="sm" variant={room.hk === 'Dirty' ? 'warning' : 'outline'} icon={<BrushCleaning className="size-3.5" />} disabled={room.hk === 'Dirty'} onClick={() => hk('Dirty')}>Dirty</Button>
                <Button size="sm" icon={<Wrench className="size-3.5" />} disabled={!!stay} onClick={() => (room.hk === 'Out of Order' ? hk('Dirty') : setOoo(true))}>{room.hk === 'Out of Order' ? 'Return' : 'Out of order'}</Button>
              </div>
            </div>
          )}
        </div>
      </Drawer>

      <Modal open={ooo} onClose={() => setOoo(false)} size="sm" icon={<Wrench />} title={`Room ${room.no} out of order`}
        footer={<><Button onClick={() => setOoo(false)}>Cancel</Button><Button variant="warning" disabled={!reason.trim()} onClick={() => { setHk(room.id, 'Out of Order', reason.trim()); setOoo(false); toast.warning(`Room ${room.no} out of order`, reason) }}>Block room</Button></>}>
        <Field label="Reason / work order" required><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Leaking tap, AC repair, deep cleaning…" autoFocus /></Field>
        {next && <p className="mt-3 text-[12px] text-amber-700">Heads-up: {next.guest.name} is booked from {fmtDateShort(next.arrival)}. Re-assign them from Reservations.</p>}
      </Modal>
    </>
  )
}
