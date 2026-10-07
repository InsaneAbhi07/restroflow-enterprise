import { useMemo, useState } from 'react'
import { BedDouble, BrushCleaning, CalendarPlus, ConciergeBell, IndianRupee, LogIn, LogOut, Moon, Percent, TrendingUp, UserPlus, Users, Utensils } from 'lucide-react'
import { Badge, Button, Card, DataTable, PageHeader, StatCard, Tabs, type Column } from '@/components/ui'
import { isToday, usePermission } from '@/store/hooks'
import { cn, fmtDate, fmtDateShort, fmtTime, inr } from '@/lib/format'
import { useHotel } from './hotelStore'
import { ROOM_STATES, folioTotals, nightRoomCharge, nightsBetween, roomState, today, type Reservation, type RoomState } from './hotelModel'
import { RS_STYLE, ResBadge, SourceTag } from './hotelUi'
import { RoomDrawer } from './RoomDrawer'
import { StayDrawer } from './StayDrawer'
import { ReservationModal } from './ReservationModal'
import { CheckInModal } from './CheckInModal'
import { CheckOutModal, NightAuditModal } from './FolioDialogs'
import { InRoomDining } from './InRoomDining'

type TabKey = 'rack' | 'arrivals' | 'inhouse' | 'departures' | 'dining'

export default function FrontDesk() {
  const { rooms, types, plans, reservations, config } = useHotel()
  const { can } = usePermission()
  const [tab, setTab] = useState<TabKey>('rack')
  const [stateFilter, setStateFilter] = useState<RoomState | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [stayId, setStayId] = useState<string | null>(null)
  const [modal, setModal] = useState<null | 'new' | 'audit'>(null)
  const [walkInRoom, setWalkInRoom] = useState<string | null | undefined>(undefined) // undefined = closed, null = any room
  const [checkInId, setCheckInId] = useState<string | null>(null)
  const [checkOutId, setCheckOutId] = useState<string | null>(null)
  const t = today()

  const rack = useMemo(() => rooms.map((r) => ({ room: r, ...roomState(r, reservations, t) })), [rooms, reservations, t])
  const inHouse = reservations.filter((r) => r.status === 'In House')
  const arrivals = reservations.filter((r) => (r.status === 'Confirmed' && r.arrival <= t) || (r.status === 'In House' && r.arrival === t))
    .sort((a, b) => Number(a.status === 'In House') - Number(b.status === 'In House'))
  const departures = reservations.filter((r) => (r.status === 'In House' && r.departure <= t) || (r.status === 'Checked Out' && isToday(r.checkedOutAt)))
    .sort((a, b) => Number(a.status === 'Checked Out') - Number(b.status === 'Checked Out'))
  const sellable = rooms.filter((r) => r.hk !== 'Out of Order').length
  const occ = sellable ? (inHouse.length / sellable) * 100 : 0
  const adr = inHouse.length ? inHouse.reduce((s, r) => s + nightRoomCharge(r, t, config), 0) / inHouse.length : 0
  const pax = inHouse.reduce((s, r) => s + r.adults + r.children, 0)
  const counts = ROOM_STATES.reduce((m, s) => ({ ...m, [s]: rack.filter((x) => x.state === s).length }), {} as Record<RoomState, number>)
  const floors = Array.from(new Set(rooms.map((r) => r.floor)))
  const auditDue = config.lastAudit !== t

  const roomNo = (r: Reservation) => rooms.find((x) => x.id === r.roomId)?.no
  const typeCode = (r: Reservation) => types.find((x) => x.id === r.typeId)?.code
  const guestCell = (r: Reservation) => (
    <div className="min-w-0"><div className="truncate font-medium text-slate-900">{r.guest.name}</div><div className="truncate text-[11px] text-slate-500">{r.no}{r.guest.company ? ` · ${r.guest.company}` : ''}</div></div>
  )
  const balCell = (r: Reservation) => { const b = folioTotals(r).balance; return <span className={cn('font-medium', b > 0 ? 'text-rose-600' : 'text-emerald-600')}>{inr(b)}</span> }

  const arrivalCols: Column<Reservation>[] = [
    { key: 'guest', header: 'Guest', render: guestCell, sortValue: (r) => r.guest.name },
    { key: 'type', header: 'Type', render: (r) => <Badge tone="gray">{typeCode(r)}</Badge>, sortValue: (r) => typeCode(r) ?? '' },
    { key: 'room', header: 'Room', render: (r) => roomNo(r) ?? <span className="text-slate-400">Unassigned</span>, sortValue: (r) => roomNo(r) ?? '' },
    { key: 'nights', header: 'Nights', align: 'right', render: (r) => nightsBetween(r.arrival, r.departure), sortValue: (r) => nightsBetween(r.arrival, r.departure) },
    { key: 'pax', header: 'Pax', align: 'right', render: (r) => `${r.adults}${r.children ? '+' + r.children : ''}` },
    { key: 'source', header: 'Source', render: (r) => <SourceTag source={r.source} /> },
    { key: 'paid', header: 'Prepaid', align: 'right', render: (r) => inr(folioTotals(r).paid), sortValue: (r) => folioTotals(r).paid },
    { key: 'notes', header: 'Notes', sortable: false, render: (r) => <span className="line-clamp-1 max-w-[200px] text-[11.5px] text-slate-500">{r.arrival < t ? `Expected ${fmtDateShort(r.arrival)} · ` : ''}{r.notes ?? ''}</span> },
    {
      key: 'act', header: '', sortable: false, align: 'right', render: (r) => r.status === 'In House'
        ? <span className="text-[11.5px] text-emerald-600">Arrived {r.checkedInAt ? fmtTime(r.checkedInAt) : ''}</span>
        : can('hotel', 'create') && <Button size="xs" variant="success" icon={<LogIn className="size-3" />} onClick={(e) => { e.stopPropagation(); setCheckInId(r.id) }}>Check in</Button>,
    },
  ]
  const inHouseCols: Column<Reservation>[] = [
    { key: 'room', header: 'Room', render: (r) => <span className="font-semibold text-slate-900">{roomNo(r)}</span>, sortValue: (r) => roomNo(r) ?? '' },
    { key: 'guest', header: 'Guest', render: guestCell, sortValue: (r) => r.guest.name },
    { key: 'type', header: 'Type', render: (r) => typeCode(r) },
    { key: 'plan', header: 'Plan', render: (r) => plans.find((p) => p.id === r.planId)?.code },
    { key: 'arrival', header: 'Arrived', render: (r) => fmtDateShort(r.arrival) },
    { key: 'departure', header: 'Departs', render: (r) => <span className={cn(r.departure <= t && 'font-semibold text-amber-600')}>{r.departure <= t ? 'Today' : fmtDateShort(r.departure)}</span> },
    { key: 'pax', header: 'Pax', align: 'right', render: (r) => r.adults + r.children },
    { key: 'charges', header: 'Charges', align: 'right', render: (r) => inr(folioTotals(r).total), sortValue: (r) => folioTotals(r).total },
    { key: 'bal', header: 'Balance', align: 'right', render: balCell, sortValue: (r) => folioTotals(r).balance },
  ]
  const depCols: Column<Reservation>[] = [
    { key: 'room', header: 'Room', render: (r) => <span className="font-semibold text-slate-900">{roomNo(r)}</span> },
    { key: 'guest', header: 'Guest', render: guestCell, sortValue: (r) => r.guest.name },
    { key: 'stay', header: 'Stay', render: (r) => `${fmtDateShort(r.arrival)} → ${fmtDateShort(r.departure)}` },
    { key: 'status', header: 'Status', render: (r) => <ResBadge status={r.status} /> },
    { key: 'total', header: 'Folio', align: 'right', render: (r) => inr(folioTotals(r).total) },
    { key: 'bal', header: 'Balance', align: 'right', render: balCell },
    {
      key: 'act', header: '', sortable: false, align: 'right', render: (r) => r.status === 'In House' && can('hotel', 'edit')
        ? <Button size="xs" variant="primary" icon={<LogOut className="size-3" />} onClick={(e) => { e.stopPropagation(); setCheckOutId(r.id) }}>Check out</Button>
        : r.invoiceNo ? <span className="text-[11.5px] text-slate-500">{r.invoiceNo}</span> : null,
    },
  ]

  const checkOutRes = reservations.find((r) => r.id === checkOutId)

  return (
    <div className="page-enter">
      <PageHeader title="Front Desk" icon={<ConciergeBell />} subtitle={`${config.name} · ${fmtDate(Date.now())} · business date ${config.lastAudit === t ? 'closed' : 'open'}`}
        breadcrumbs={[{ label: 'Hotel' }, { label: 'Front Desk' }]}
        actions={<>
          {can('hotel', 'edit') && <Button icon={<Moon className="size-3.5" />} onClick={() => setModal('audit')} className={cn(auditDue && 'border-amber-300 text-amber-700')}>Night audit{auditDue ? ' due' : ''}</Button>}
          {can('hotel', 'create') && <Button icon={<UserPlus className="size-3.5" />} onClick={() => setWalkInRoom(null)}>Walk-in</Button>}
          {can('hotel', 'create') && <Button variant="primary" icon={<CalendarPlus className="size-3.5" />} onClick={() => setModal('new')}>New reservation</Button>}
        </>} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Occupancy" value={`${occ.toFixed(0)}%`} icon={<Percent />} tone="blue" sub={`${inHouse.length} of ${sellable} rooms`} />
        <StatCard label="Arrivals" value={`${arrivals.filter((r) => r.status === 'In House').length} / ${arrivals.length}`} icon={<LogIn />} tone="violet" sub="checked in / expected" onClick={() => setTab('arrivals')} />
        <StatCard label="Departures" value={`${departures.filter((r) => r.status === 'Checked Out').length} / ${departures.length}`} icon={<LogOut />} tone="orange" sub="checked out / due" onClick={() => setTab('departures')} />
        <StatCard label="In-house guests" value={pax} icon={<Users />} tone="teal" sub={`${inHouse.length} rooms`} onClick={() => setTab('inhouse')} />
        <StatCard label="ADR" value={inr(adr)} icon={<IndianRupee />} tone="green" sub="avg room rate tonight" />
        <StatCard label="RevPAR" value={inr((adr * occ) / 100)} icon={<TrendingUp />} tone="navy" sub="revenue / available room" />
      </div>

      <Card>
        <div className="px-3 pt-1">
          <Tabs value={tab} onChange={setTab} className="border-0" items={[
            { value: 'rack', label: 'Room rack', icon: <BedDouble className="size-3.5" />, count: rooms.length },
            { value: 'arrivals', label: 'Arrivals', count: arrivals.filter((r) => r.status === 'Confirmed').length },
            { value: 'inhouse', label: 'In-house', count: inHouse.length },
            { value: 'departures', label: 'Departures', count: departures.filter((r) => r.status === 'In House').length },
            { value: 'dining', label: 'In-room dining', icon: <Utensils className="size-3.5" /> },
          ]} />
        </div>
        <div className="border-t border-slate-100">
          {tab === 'rack' && (
            <div className="p-4">
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                {ROOM_STATES.map((s) => (
                  <button key={s} onClick={() => setStateFilter(stateFilter === s ? null : s)}
                    className={cn('inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-medium ring-1 ring-inset transition', RS_STYLE[s].chip, stateFilter && stateFilter !== s && 'opacity-40', stateFilter === s && 'ring-2')}>
                    <span className={cn('size-2 rounded-full', RS_STYLE[s].dot)} />{s}<span className="font-bold tabular">{counts[s]}</span>
                  </button>
                ))}
                <span className="ml-auto flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><BrushCleaning className="size-3 text-amber-600" />needs cleaning</span>
                  <span className="flex items-center gap-1"><LogOut className="size-3 text-orange-600" />due out</span>
                </span>
              </div>
              <div className="space-y-4">
                {floors.map((fl) => {
                  const list = rack.filter((x) => x.room.floor === fl && (!stateFilter || x.state === stateFilter))
                  if (!list.length) return null
                  return (
                    <div key={fl}>
                      <p className="mb-2 text-[12px] font-semibold text-slate-600">{fl} <span className="font-normal text-slate-400">· {list.filter((x) => x.state === 'Occupied').length}/{list.length} occupied</span></p>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(122px,1fr))] gap-2">
                        {list.map(({ room, state, stay, next, dueOut }) => {
                          const type = types.find((x) => x.id === room.typeId)
                          const guest = stay?.guest.name ?? (state === 'Arriving' ? next?.guest.name : undefined)
                          return (
                            <button key={room.id} onClick={() => setRoomId(room.id)}
                              className={cn('relative flex h-[86px] flex-col rounded-xl border p-2 text-left transition', RS_STYLE[state].tile, roomId === room.id && 'ring-2 ring-brand-400')}>
                              <div className="flex items-center justify-between">
                                <span className="text-[16px] font-bold leading-none text-slate-900">{room.no}</span>
                                <span className="rounded px-1 text-[9.5px] font-bold text-white" style={{ background: type?.color }}>{type?.code}</span>
                              </div>
                              <span className="mt-1 line-clamp-2 text-[11px] leading-tight text-slate-600">{guest ?? (state === 'Out of Order' ? room.note ?? 'Out of order' : state)}</span>
                              <div className="mt-auto flex items-center gap-1">
                                <span className={cn('size-1.5 rounded-full', RS_STYLE[state].dot)} />
                                {stay && <span className="text-[10px] text-slate-500">till {fmtDateShort(stay.departure)}</span>}
                                <span className="ml-auto flex gap-0.5">
                                  {room.hk === 'Dirty' && <BrushCleaning className="size-3 text-amber-600" />}
                                  {dueOut && <LogOut className="size-3 text-orange-600" />}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {tab === 'arrivals' && <DataTable columns={arrivalCols} rows={arrivals} onRowClick={(r) => setStayId(r.id)} pageSize={15} />}
          {tab === 'inhouse' && <DataTable columns={inHouseCols} rows={inHouse} onRowClick={(r) => setStayId(r.id)} pageSize={15} />}
          {tab === 'dining' && <InRoomDining onOpenStay={setStayId} />}
          {tab === 'departures' && <DataTable columns={depCols} rows={departures} onRowClick={(r) => setStayId(r.id)} pageSize={15} />}
        </div>
      </Card>

      {roomId && <RoomDrawer roomId={roomId} onClose={() => setRoomId(null)} onOpenStay={(id) => { setRoomId(null); setStayId(id) }} onWalkIn={(id) => { setRoomId(null); setWalkInRoom(id) }} />}
      {stayId && <StayDrawer resId={stayId} onClose={() => setStayId(null)} />}
      <ReservationModal open={modal === 'new'} onClose={() => setModal(null)} onSaved={(r) => setStayId(r.id)} />
      <ReservationModal open={walkInRoom !== undefined} walkIn preset={walkInRoom ? { roomId: walkInRoom } : undefined} onClose={() => setWalkInRoom(undefined)} onSaved={(r) => setCheckInId(r.id)} />
      {checkInId && <CheckInModal resId={checkInId} onClose={() => setCheckInId(null)} />}
      {checkOutRes && <CheckOutModal res={checkOutRes} onClose={() => setCheckOutId(null)} onDone={() => setStayId(checkOutRes.id)} />}
      {modal === 'audit' && <NightAuditModal onClose={() => setModal(null)} />}
    </div>
  )
}
