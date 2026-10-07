import { useEffect, useState } from 'react'
import { BedDouble } from 'lucide-react'
import { Badge, EmptyState, Modal, SearchInput } from '@/components/ui'
import { cn, fmtDateShort, inr } from '@/lib/format'
import { useHotel } from './hotelStore'
import { roomCredit, useInHouseGuests, type RoomGuest } from './roomBilling'

/** Pick an in-house hotel guest (for room service or "Charge to Room"). Pass `amount` to enforce the credit limit. */
export function RoomGuestPicker({ open, onClose, outletId, amount, onPick, title = 'Select room / hotel guest' }: {
  open: boolean; onClose: () => void; outletId: string; amount?: number; onPick: (g: RoomGuest) => void; title?: string
}) {
  const guests = useInHouseGuests(outletId)
  const config = useHotel((s) => s.config)
  const [q, setQ] = useState('')
  useEffect(() => { if (open) setQ('') }, [open])
  const s = q.trim().toLowerCase()
  const list = guests.filter((g) => !s || g.room?.no.includes(s) || g.res.guest.name.toLowerCase().includes(s) || g.res.no.toLowerCase().includes(s))

  return (
    <Modal open={open} onClose={onClose} size="md" icon={<BedDouble />} title={title}
      subtitle={`${config.name} · ${guests.length} rooms in house${amount !== undefined ? ` · credit limit ${inr(config.roomCreditLimit)}` : ''}`}>
      <SearchInput autoFocus className="mb-3" value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Room number or guest name…"
        onKeyDown={(e) => { if (e.key === 'Enter' && list.length === 1) onPick(list[0]) }} />
      {list.length === 0 ? (
        <EmptyState icon={<BedDouble />} title={guests.length ? 'No matching guest' : 'No guests in house'} body="Only checked-in guests can order room service or charge bills to their room." />
      ) : (
        <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
          {list.map((g) => {
            const credit = amount !== undefined ? roomCredit(g.res, amount, config) : null
            const blocked = credit && !credit.ok
            return (
              <button key={g.res.id} disabled={!!blocked} onClick={() => onPick(g)}
                className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-left transition', blocked ? 'cursor-not-allowed bg-rose-50/40' : 'hover:bg-brand-50/50')}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-[13px] font-bold text-white">{g.room?.no}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-slate-900">{g.res.guest.name}</div>
                  <div className="truncate text-[11.5px] text-slate-500">{g.res.no} · {g.res.adults + g.res.children} pax · till {fmtDateShort(g.res.departure)}{g.res.guest.company ? ` · ${g.res.guest.company}` : ''}</div>
                </div>
                <div className="shrink-0 text-right">
                  {g.plan && <Badge tone={g.plan.addonPerAdult ? 'teal' : 'gray'}>{g.plan.code}</Badge>}
                  <div className={cn('mt-0.5 text-[11px] tabular', blocked ? 'font-semibold text-rose-600' : 'text-slate-500')}>
                    {blocked ? `Over limit (${inr(credit!.after)})` : `Bal ${inr(g.balance)}`}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
