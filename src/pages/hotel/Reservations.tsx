import { useMemo, useState } from 'react'
import { CalendarPlus, CalendarRange, ChevronLeft, ChevronRight, Globe2, List, Moon, XCircle } from 'lucide-react'
import { Button, Card, DataTable, FilterBar, PageHeader, SearchInput, Segmented, Select, StatCard, type Column } from '@/components/ui'
import { usePermission } from '@/store/hooks'
import { fmtDate, fmtDateShort, inr } from '@/lib/format'
import { useHotel } from './hotelStore'
import { addDays, folioTotals, nightsBetween, stayEstimate, today, type Reservation, type ResStatus } from './hotelModel'
import { ResBadge, SOURCES, SourceTag } from './hotelUi'
import { TapeChart } from './TapeChart'
import { StayDrawer } from './StayDrawer'
import { ReservationModal, type ResPreset } from './ReservationModal'

const STATUSES: ResStatus[] = ['Confirmed', 'In House', 'Checked Out', 'Cancelled', 'No Show']
const OTAS = ['Booking.com', 'MakeMyTrip', 'Agoda', 'Expedia']

export default function Reservations() {
  const { reservations, rooms, types, config } = useHotel()
  const { can } = usePermission()
  const t = today()
  const [view, setView] = useState<'chart' | 'list'>('chart')
  const [start, setStart] = useState(addDays(t, -2))
  const [days, setDays] = useState<'14' | '21'>('14')
  const [stayId, setStayId] = useState<string | null>(null)
  const [preset, setPreset] = useState<ResPreset | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | ResStatus>('all')
  const [source, setSource] = useState('all')

  const next7 = reservations.filter((r) => r.status === 'Confirmed' && r.arrival >= t && r.arrival < addDays(t, 7))
  const onBooks = reservations.filter((r) => r.status === 'Confirmed' || r.status === 'In House')
    .reduce((s, r) => s + nightsBetween(r.arrival > t ? r.arrival : t, r.departure < addDays(t, 30) ? r.departure : addDays(t, 30)), 0)
  const recent = reservations.filter((r) => r.createdAt > Date.now() - 30 * 864e5 && r.status !== 'Cancelled')
  const otaShare = recent.length ? (recent.filter((r) => OTAS.includes(r.source)).length / recent.length) * 100 : 0
  const cancelled = reservations.filter((r) => (r.status === 'Cancelled' || r.status === 'No Show') && (r.cancelledAt ?? r.createdAt) > Date.now() - 30 * 864e5).length

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return reservations
      .filter((r) => (status === 'all' || r.status === status) && (source === 'all' || r.source === source))
      .filter((r) => !s || [r.no, r.guest.name, r.guest.phone, r.guest.company ?? '', r.otaRef ?? '', rooms.find((x) => x.id === r.roomId)?.no ?? ''].some((v) => v.toLowerCase().includes(s)))
      .sort((a, b) => b.arrival.localeCompare(a.arrival))
  }, [reservations, rooms, q, status, source])

  const amount = (r: Reservation) => (r.status === 'Confirmed' ? stayEstimate(r, config).total : folioTotals(r).total)
  const cols: Column<Reservation>[] = [
    { key: 'no', header: 'Booking', render: (r) => <div><div className="font-medium text-slate-900">{r.no}</div><div className="text-[11px] text-slate-400">{fmtDateShort(r.createdAt)}</div></div> },
    { key: 'guest', header: 'Guest', render: (r) => <div className="min-w-0"><div className="truncate font-medium">{r.guest.name}</div><div className="truncate text-[11px] text-slate-500">{r.guest.company ?? r.guest.phone}</div></div>, sortValue: (r) => r.guest.name },
    { key: 'arrival', header: 'Arrival', render: (r) => fmtDate(r.arrival) },
    { key: 'departure', header: 'Departure', render: (r) => fmtDate(r.departure) },
    { key: 'nights', header: 'N', align: 'right', render: (r) => nightsBetween(r.arrival, r.departure), sortValue: (r) => nightsBetween(r.arrival, r.departure) },
    { key: 'room', header: 'Room', render: (r) => `${types.find((x) => x.id === r.typeId)?.code} · ${rooms.find((x) => x.id === r.roomId)?.no ?? '—'}` },
    { key: 'source', header: 'Source', render: (r) => <SourceTag source={r.source} /> },
    { key: 'status', header: 'Status', render: (r) => <ResBadge status={r.status} /> },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => inr(amount(r)), sortValue: amount },
    { key: 'bal', header: 'Balance', align: 'right', render: (r) => (r.status === 'Cancelled' || r.status === 'No Show' ? '—' : inr(amount(r) - folioTotals(r).paid)), sortValue: (r) => amount(r) - folioTotals(r).paid },
  ]

  return (
    <div className="page-enter">
      <PageHeader title="Reservations" icon={<CalendarRange />} subtitle={`${config.name} · ${rooms.length} rooms · ${reservations.filter((r) => r.status === 'Confirmed').length} upcoming bookings`}
        breadcrumbs={[{ label: 'Hotel' }, { label: 'Reservations' }]}
        actions={<>
          <Segmented value={view} onChange={setView} items={[{ value: 'chart', label: 'Tape chart', icon: <CalendarRange className="size-3.5" /> }, { value: 'list', label: 'List', icon: <List className="size-3.5" /> }]} />
          {can('hotel', 'create') && <Button variant="primary" icon={<CalendarPlus className="size-3.5" />} onClick={() => setPreset({})}>New reservation</Button>}
        </>} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Arrivals next 7 days" value={next7.length} icon={<CalendarPlus />} tone="violet" sub={`${next7.reduce((s, r) => s + nightsBetween(r.arrival, r.departure), 0)} room nights`} />
        <StatCard label="On the books (30 days)" value={`${onBooks} RN`} icon={<Moon />} tone="blue" sub={`${((onBooks / (rooms.length * 30)) * 100).toFixed(0)}% forecast occupancy`} />
        <StatCard label="OTA share" value={`${otaShare.toFixed(0)}%`} icon={<Globe2 />} tone="orange" sub="of bookings made in last 30 days" />
        <StatCard label="Cancellations & no-shows" value={cancelled} icon={<XCircle />} tone="red" sub="last 30 days" />
      </div>

      <Card>
        {view === 'chart' ? (
          <>
            <FilterBar>
              <Button size="sm" icon={<ChevronLeft className="size-3.5" />} onClick={() => setStart(addDays(start, -7))}>Week</Button>
              <Button size="sm" onClick={() => setStart(addDays(t, -2))}>Today</Button>
              <Button size="sm" iconRight={<ChevronRight className="size-3.5" />} onClick={() => setStart(addDays(start, 7))}>Week</Button>
              <span className="text-[12.5px] font-medium text-slate-700">{fmtDate(start)} – {fmtDate(addDays(start, +days - 1))}</span>
              <Segmented size="sm" className="ml-auto" value={days} onChange={setDays} items={[{ value: '14', label: '14 days' }, { value: '21', label: '21 days' }]} />
              <span className="hidden items-center gap-3 text-[11px] text-slate-500 lg:flex">
                <Legend c="bg-violet-500" l="Confirmed" /><Legend c="bg-sky-600" l="In house" /><Legend c="bg-slate-400" l="Checked out" />
              </span>
            </FilterBar>
            <TapeChart start={start} days={+days} onOpen={setStayId} onBook={can('hotel', 'create') ? (roomId, date) => setPreset({ roomId, arrival: date }) : undefined} />
            <p className="border-t border-slate-100 px-3 py-2 text-[11.5px] text-slate-500">Click a bar to open the booking · click an empty cell to book that room from that night.</p>
          </>
        ) : (
          <>
            <FilterBar>
              <SearchInput className="w-64" value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Guest, booking no, phone, room, OTA ref…" />
              <Select className="w-40" value={status} onChange={(e) => setStatus(e.target.value as 'all' | ResStatus)}>
                <option value="all">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
              </Select>
              <Select className="w-40" value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="all">All sources</option>{SOURCES.map((s) => <option key={s}>{s}</option>)}
              </Select>
              <span className="ml-auto text-[12px] text-slate-500">{rows.length} bookings</span>
            </FilterBar>
            <DataTable columns={cols} rows={rows} onRowClick={(r) => setStayId(r.id)} pageSize={15} />
          </>
        )}
      </Card>

      {stayId && <StayDrawer resId={stayId} onClose={() => setStayId(null)} />}
      <ReservationModal open={!!preset} preset={preset ?? undefined} onClose={() => setPreset(null)} onSaved={(r) => setStayId(r.id)} />
    </div>
  )
}

const Legend = ({ c, l }: { c: string; l: string }) => <span className="flex items-center gap-1"><span className={`h-2 w-3 rounded-sm ${c}`} />{l}</span>
