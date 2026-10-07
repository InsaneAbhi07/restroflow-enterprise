import { Badge, type Tone } from '@/components/ui'
import type { BookingSource, FolioPayMode, IdType, ResStatus, RoomState } from './hotelModel'

export const SOURCES: BookingSource[] = ['Walk-in', 'Phone', 'Website', 'Booking.com', 'MakeMyTrip', 'Agoda', 'Expedia', 'Corporate', 'Travel Agent']
export const PAY_MODES: FolioPayMode[] = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Bill to Company']
export const ID_TYPES: IdType[] = ['Aadhaar', 'Passport', 'Driving Licence', 'Voter ID', 'PAN']

const RES_TONE: Record<ResStatus, Tone> = { Confirmed: 'violet', 'In House': 'blue', 'Checked Out': 'gray', Cancelled: 'red', 'No Show': 'orange' }
export const ResBadge = ({ status }: { status: ResStatus }) => <Badge tone={RES_TONE[status]} dot>{status}</Badge>

const SRC_TONE: Partial<Record<BookingSource, Tone>> = { 'Booking.com': 'blue', MakeMyTrip: 'red', Agoda: 'violet', Expedia: 'amber', Corporate: 'navy', Website: 'teal', 'Walk-in': 'green', 'Travel Agent': 'orange' }
export const SourceTag = ({ source }: { source: BookingSource }) => <Badge tone={SRC_TONE[source] ?? 'gray'}>{source}</Badge>

/** Colours for the room rack — tile body, legend chip and dot */
export const RS_STYLE: Record<RoomState, { tile: string; chip: string; dot: string; bar: string }> = {
  'Vacant Clean': { tile: 'border-emerald-200 bg-emerald-50/70 hover:border-emerald-400', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  'Vacant Dirty': { tile: 'border-amber-200 bg-amber-50/70 hover:border-amber-400', chip: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  Occupied: { tile: 'border-sky-200 bg-sky-50 hover:border-sky-400', chip: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-600', bar: 'bg-sky-600' },
  Arriving: { tile: 'border-violet-200 bg-violet-50/70 hover:border-violet-400', chip: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500', bar: 'bg-violet-500' },
  'Out of Order': { tile: 'border-slate-300 bg-slate-100 hover:border-slate-400', chip: 'bg-slate-100 text-slate-600 ring-slate-300', dot: 'bg-slate-500', bar: 'bg-slate-500' },
}

/** Tape-chart bar colour by reservation status */
export const BAR_STYLE: Record<ResStatus, string> = {
  Confirmed: 'bg-violet-500 hover:bg-violet-600',
  'In House': 'bg-sky-600 hover:bg-sky-700',
  'Checked Out': 'bg-slate-400 hover:bg-slate-500',
  Cancelled: 'bg-rose-300',
  'No Show': 'bg-orange-400',
}

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{children}</p>
)
