import { Fragment, useMemo } from 'react'
import { cn } from '@/lib/format'
import { useHotel } from './hotelStore'
import { addDays, isWeekend, nightsBetween, today, type Reservation } from './hotelModel'
import { BAR_STYLE } from './hotelUi'

const SHOWN: Reservation['status'][] = ['Confirmed', 'In House', 'Checked Out']
const DAY = new Intl.DateTimeFormat('en-IN', { weekday: 'short' })

/** Rooms × dates grid. Bars are reservations; click an empty cell to book that room from that night. */
export function TapeChart({ start, days, onOpen, onBook }: { start: string; days: number; onOpen: (resId: string) => void; onBook?: (roomId: string, date: string) => void }) {
  const { rooms, types, reservations, config } = useHotel()
  const t = today()
  const end = addDays(start, days)
  const dates = useMemo(() => Array.from({ length: days }, (_, i) => addDays(start, i)), [start, days])
  const inWindow = reservations.filter((r) => SHOWN.includes(r.status) && r.arrival < end && r.departure > start)
  const sellable = rooms.filter((r) => r.hk !== 'Out of Order').length
  const occ = dates.map((d) => reservations.filter((r) => (r.status === 'Confirmed' || r.status === 'In House' || r.status === 'Checked Out') && r.arrival <= d && d < r.departure).length)

  const bar = (r: Reservation, key: string) => {
    const s = nightsBetween(start, r.arrival) // 0 when the stay began before the window
    const e = r.departure > end ? days : nightsBetween(start, r.departure)
    return (
      <button key={key} onClick={(ev) => { ev.stopPropagation(); onOpen(r.id) }} title={`${r.guest.name} · ${r.no} · ${r.status}`}
        className={cn('absolute inset-y-1 z-[1] truncate rounded-md px-1.5 text-left text-[11px] font-medium text-white shadow-sm transition', BAR_STYLE[r.status], r.arrival < start && 'rounded-l-none', r.departure > end && 'rounded-r-none')}
        style={{ left: `calc(${(s / days) * 100}% + 2px)`, width: `calc(${((e - s) / days) * 100}% - 4px)` }}>
        {r.guest.name}
      </button>
    )
  }

  // unassigned bookings stacked into lanes so they never overlap
  const lanesFor = (typeId: string) => {
    const lanes: Reservation[][] = []
    inWindow.filter((r) => r.typeId === typeId && !r.roomId).sort((a, b) => a.arrival.localeCompare(b.arrival)).forEach((r) => {
      const lane = lanes.find((l) => l.every((x) => x.departure <= r.arrival || r.departure <= x.arrival))
      if (lane) lane.push(r)
      else lanes.push([r])
    })
    return lanes
  }

  const cells = (roomId?: string) => dates.map((d) => (
    <div key={d} onClick={() => roomId && onBook && d >= t && onBook(roomId, d)}
      className={cn('border-l border-slate-100', isWeekend(d, config) && 'bg-slate-50/80', d === t && 'bg-brand-50/60', roomId && onBook && d >= t && 'cursor-pointer hover:bg-brand-100/50')} />
  ))
  const grid = { gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[980px] text-[12px]">
        {/* header */}
        <div className="sticky top-0 z-[2] flex border-b border-slate-200 bg-white">
          <div className="w-28 shrink-0 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Room</div>
          <div className="grid flex-1" style={grid}>
            {dates.map((d) => (
              <div key={d} className={cn('border-l border-slate-100 py-1.5 text-center', isWeekend(d, config) && 'bg-slate-50', d === t && 'bg-brand-50')}>
                <div className={cn('text-[10px] uppercase', d === t ? 'font-bold text-brand-700' : 'text-slate-400')}>{d === t ? 'Today' : DAY.format(new Date(d + 'T00:00:00'))}</div>
                <div className="font-semibold text-slate-700">{+d.slice(8)}</div>
              </div>
            ))}
          </div>
        </div>

        {types.map((ty) => {
          const lanes = lanesFor(ty.id)
          return (
            <Fragment key={ty.id}>
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-1 text-[11px] font-semibold text-slate-600">
                <span className="size-2 rounded-full" style={{ background: ty.color }} />{ty.name}
              </div>
              {lanes.map((lane, i) => (
                <div key={'u' + i} className="flex h-8 border-b border-dashed border-slate-200 bg-amber-50/30">
                  <div className="w-28 shrink-0 px-3 py-1.5 text-[11px] italic text-amber-700">{i === 0 ? 'Unassigned' : ''}</div>
                  <div className="relative grid flex-1" style={grid}>{cells()}{lane.map((r) => bar(r, r.id))}</div>
                </div>
              ))}
              {rooms.filter((r) => r.typeId === ty.id).map((rm) => (
                <div key={rm.id} className="flex h-8 border-b border-slate-100">
                  <div className="flex w-28 shrink-0 items-center gap-1.5 px-3">
                    <span className="font-semibold text-slate-800">{rm.no}</span>
                    {rm.hk === 'Dirty' && <span className="size-1.5 rounded-full bg-amber-500" title="Dirty" />}
                    {rm.hk === 'Out of Order' && <span className="rounded bg-slate-200 px-1 text-[9.5px] font-semibold text-slate-600">OOO</span>}
                  </div>
                  <div className={cn('relative grid flex-1', rm.hk === 'Out of Order' && 'bg-[repeating-linear-gradient(45deg,#f1f5f9_0,#f1f5f9_6px,#fff_6px,#fff_12px)]')} style={grid}>
                    {cells(rm.hk === 'Out of Order' ? undefined : rm.id)}
                    {inWindow.filter((r) => r.roomId === rm.id).map((r) => bar(r, r.id))}
                  </div>
                </div>
              ))}
            </Fragment>
          )
        })}

        {/* occupancy forecast */}
        <div className="flex border-t border-slate-200 bg-slate-50/70">
          <div className="w-28 shrink-0 px-3 py-2 text-[11px] font-semibold text-slate-500">Occupancy</div>
          <div className="grid flex-1" style={grid}>
            {occ.map((n, i) => {
              const pct = sellable ? Math.round((n / sellable) * 100) : 0
              return <div key={i} className={cn('border-l border-slate-100 py-2 text-center text-[11px] font-semibold tabular', pct >= 80 ? 'text-rose-600' : pct >= 50 ? 'text-amber-600' : 'text-emerald-600')}>{pct}%</div>
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
