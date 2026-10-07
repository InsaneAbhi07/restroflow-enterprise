import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useStore } from '@/store/useStore'
import { fmtDateShort, uid } from '@/lib/format'
import {
  addDays, billableNights, folioTotals, isWeekend, mealRateFor, nightRoomCharge, postedNights, roomGst, roomRateFor, stayEstimate, today,
  type BookingSource, type FolioCharge, type FolioPayment, type GuestInfo, type HkStatus, type HotelConfig, type RatePlan, type Reservation, type Room, type RoomType,
} from './hotelModel'

/* ------------------------------------------------------------------ masters */
const SEED_TYPES: RoomType[] = [
  { id: 'rt_std', code: 'STD', name: 'Standard Room', baseRate: 3800, maxAdults: 2, maxChildren: 1, extraAdult: 1200, extraChild: 600, bed: 'Queen', sizeSqft: 240, amenities: ['Wi-Fi', 'LED TV', 'Tea/Coffee maker', 'Work desk'], color: '#0891b2', description: 'Compact city-facing room, ideal for solo business travellers.' },
  { id: 'rt_dlx', code: 'DLX', name: 'Deluxe Room', baseRate: 5200, maxAdults: 3, maxChildren: 2, extraAdult: 1500, extraChild: 800, bed: 'King / Twin', sizeSqft: 320, amenities: ['Wi-Fi', 'Smart TV', 'Minibar', 'Bathtub', 'Work desk'], color: '#14a891', description: 'Spacious room with king or twin beds and a sit-out.' },
  { id: 'rt_prm', code: 'PRM', name: 'Premium Room', baseRate: 6900, maxAdults: 3, maxChildren: 2, extraAdult: 1800, extraChild: 900, bed: 'King', sizeSqft: 380, amenities: ['Wi-Fi', 'Smart TV', 'Minibar', 'Rain shower', 'Lounge access', 'Bathrobe'], color: '#7c3aed', description: 'Higher floor, garden view, includes club-lounge access.' },
  { id: 'rt_exs', code: 'EXS', name: 'Executive Suite', baseRate: 9500, maxAdults: 3, maxChildren: 2, extraAdult: 2200, extraChild: 1100, bed: 'King + sofa bed', sizeSqft: 560, amenities: ['Wi-Fi', 'Separate living room', 'Minibar', 'Nespresso', 'Lounge access', 'Bathtub'], color: '#ea580c', description: 'One-bedroom suite with living area and pantry.' },
  { id: 'rt_prs', code: 'PRS', name: 'Presidential Suite', baseRate: 16000, maxAdults: 4, maxChildren: 2, extraAdult: 2500, extraChild: 1200, bed: '2 × King', sizeSqft: 1100, amenities: ['Butler service', 'Dining room', 'Jacuzzi', 'Lounge access', 'Airport transfer'], color: '#db2777', description: 'Two-bedroom top-floor suite with butler service.' },
]
const floorOf = (no: string) => `Floor ${no[0]}`
const room = (no: string, typeId: string, view: string, hk: HkStatus = 'Clean', note?: string): Room => ({ id: 'rm_' + no, no, floor: floorOf(no), typeId, view, hk, smoking: no === '110', note })
const SEED_ROOMS: Room[] = [
  ...['101', '102', '103', '104', '105', '106', '107', '108', '109', '110'].map((n) => room(n, 'rt_std', +n % 2 ? 'City' : 'Courtyard', n === '105' ? 'Dirty' : n === '108' ? 'Out of Order' : 'Clean', n === '108' ? 'AC compressor replacement' : undefined)),
  ...['201', '202', '203', '204', '205', '206', '207', '208', '209', '210'].map((n) => room(n, 'rt_dlx', +n % 2 ? 'City' : 'Pool', n === '207' ? 'Dirty' : 'Clean')),
  ...['301', '302', '303', '304', '305', '306', '307', '308'].map((n) => room(n, 'rt_prm', 'Garden', n === '303' ? 'Dirty' : 'Clean')),
  room('401', 'rt_exs', 'Skyline'), room('402', 'rt_exs', 'Skyline'), room('403', 'rt_exs', 'Garden'), room('404', 'rt_prs', 'Panoramic'),
]
const SEED_PLANS: RatePlan[] = [
  { id: 'rp_ep', code: 'EP', name: 'Room Only', meals: 'No meals', addonPerAdult: 0, active: true, description: 'European Plan – room only.' },
  { id: 'rp_cp', code: 'CP', name: 'Bed & Breakfast', meals: 'Breakfast', addonPerAdult: 450, active: true, description: 'Continental Plan – buffet breakfast at the restaurant.' },
  { id: 'rp_map', code: 'MAP', name: 'Half Board', meals: 'Breakfast + Dinner', addonPerAdult: 1100, active: true, description: 'Modified American Plan – breakfast and one main meal.' },
  { id: 'rp_ap', code: 'AP', name: 'Full Board', meals: 'All meals', addonPerAdult: 1700, active: true, description: 'American Plan – breakfast, lunch and dinner.' },
]
const SEED_CONFIG: HotelConfig = {
  name: 'The Grand Residency', outletId: 'o1', checkInTime: '14:00', checkOutTime: '11:00',
  weekendUplift: 15, weekendNights: [5, 6], gstThreshold: 7500, gstLow: 5, gstHigh: 18, fnbGst: 5, serviceGst: 18,
  earlyCheckInFee: 1500, lateCheckOutFee: 1500, invoicePrefix: 'GR/26-27/',
}

/* ------------------------------------------------------------------ seed bookings */
type G = [name: string, city: string, nationality?: string, company?: string]
const GUESTS: G[] = [
  ['Rajesh Khanna', 'Mumbai'], ['Sunita Rao', 'Bengaluru'], ['Aditya Bansal', 'Jaipur'], ['Meenakshi Iyer', 'Chennai', undefined, 'Infosys Ltd.'],
  ['Harsh Vardhan', 'Lucknow'], ['Oliver Bennett', 'London', 'United Kingdom'], ['Nikhil Joshi', 'Pune', undefined, 'Tata Consultancy Services'], ['Farhan Qureshi', 'Hyderabad'],
  ['Pallavi Deshmukh', 'Nagpur'], ['Emily Carter', 'Boston', 'United States'], ['Varun Kapoor', 'Chandigarh'], ['Shreya Ghoshal', 'Kolkata'],
  ['Ramesh Agarwal', 'Kanpur', undefined, 'Deloitte India'], ['Kunal & Ritu Malhotra', 'New Delhi'], ['Ankita Sharma', 'Indore'], ['Sameer Kulkarni', 'Mumbai', undefined, 'Wipro Ltd.'],
  ['Hiroshi Tanaka', 'Osaka', 'Japan'], ['Deepak Chauhan', 'Dehradun'], ['Neelam Saxena', 'Bhopal'], ['Arvind Menon', 'Kochi'],
  ['Tanvi Shah', 'Ahmedabad', undefined, 'HCLTech'], ['Gaurav Sethi', 'Amritsar'], ['Lakshmi Narayanan', 'Coimbatore'], ['Rohan Bhatia', 'Gurugram'],
  ['Pritam Das', 'Guwahati', undefined, 'Deloitte India'], ['Anand Mahajan', 'Ludhiana'], ['Sophie Laurent', 'Paris', 'France'], ['Vivek Oberoi', 'Shimla'],
  ['Kiran Reddy', 'Vijayawada'], ['Manpreet Gill', 'Jalandhar'], ['Jatin Arora', 'Faridabad'], ['Swati Mishra', 'Varanasi'],
  ['Alok Tiwari', 'Prayagraj'], ['Divya Pillai', 'Thiruvananthapuram'], ['Carlos Mendes', 'Lisbon', 'Portugal'], ['Yash Thakur', 'Patna'],
]
const guestInfo = (i: number): GuestInfo => {
  const [name, city, nationality = 'Indian', company] = GUESTS[i]
  const foreign = nationality !== 'Indian'
  const slug = name.toLowerCase().split(' ')[0].replace(/[^a-z]/g, '')
  return {
    name, nationality, company, address: city,
    phone: foreign ? `+44 7700 9${String(10000 + i * 731).slice(-5)}` : `+91 9${String(810000000 + i * 7919237).slice(0, 9)}`,
    email: `${slug}${i + 3}@${company ? company.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') + '.com' : 'gmail.com'}`,
    idType: foreign ? 'Passport' : i % 3 === 0 ? 'Driving Licence' : 'Aadhaar',
    idNo: foreign ? `P${String(5480000 + i * 3373)}` : i % 3 === 0 ? `DL-${String(1420110000000 + i * 99731).slice(0, 13)}` : `XXXX XXXX ${String(1000 + i * 271).slice(-4)}`,
    visaNo: foreign ? `V${String(9000000 + i * 1777)}` : undefined,
    gstin: company ? `27AAAC${String.fromCharCode(65 + (i % 26))}${String(1000 + i * 37).slice(-4)}Q1Z${i % 9}` : undefined,
  }
}
const OTA: BookingSource[] = ['Booking.com', 'MakeMyTrip', 'Agoda', 'Expedia']

type SeedRow = {
  g: number; type: string; room?: string; plan: string; arr: number; dep: number; a?: number; c?: number; src: BookingSource
  status: Reservation['status']; extras?: [kind: 'F&B' | 'Service', desc: string, amount: number][]; notes?: string; adv?: number
}
const ROWS: SeedRow[] = [
  // in house
  { g: 0, type: 'rt_std', room: '102', plan: 'rp_cp', arr: -2, dep: 1, src: 'MakeMyTrip', status: 'In House', extras: [['F&B', 'Restaurant · Bill B4171 (charged to room)', 1840]] },
  { g: 1, type: 'rt_std', room: '103', plan: 'rp_ep', arr: -1, dep: 0, a: 1, src: 'Walk-in', status: 'In House', adv: 2000 },
  { g: 2, type: 'rt_std', room: '106', plan: 'rp_cp', arr: -3, dep: 2, c: 1, src: 'Booking.com', status: 'In House', extras: [['Service', 'Laundry · 6 pcs', 540], ['F&B', 'Room service · KOT 412', 960]] },
  { g: 3, type: 'rt_std', room: '109', plan: 'rp_ep', arr: -1, dep: 3, a: 1, src: 'Corporate', status: 'In House', notes: 'Bill to company – room + breakfast only' },
  { g: 4, type: 'rt_dlx', room: '201', plan: 'rp_map', arr: -4, dep: 0, src: 'Website', status: 'In House', adv: 5000, extras: [['Service', 'Minibar · 2 soft drinks, 1 chips', 420], ['F&B', 'Bar · Bill B4150 (charged to room)', 2360]] },
  { g: 5, type: 'rt_dlx', room: '202', plan: 'rp_cp', arr: -2, dep: 2, src: 'Agoda', status: 'In House', notes: 'Form C submitted to FRRO' },
  { g: 6, type: 'rt_dlx', room: '204', plan: 'rp_ep', arr: -1, dep: 1, src: 'Corporate', status: 'In House' },
  { g: 7, type: 'rt_dlx', room: '205', plan: 'rp_map', arr: -5, dep: 2, c: 1, src: 'Travel Agent', status: 'In House', adv: 10000, extras: [['Service', 'Airport transfer (Sedan)', 1800], ['F&B', 'Restaurant · Bill B4122 (charged to room)', 3120]] },
  { g: 8, type: 'rt_dlx', room: '208', plan: 'rp_cp', arr: -1, dep: 0, a: 1, src: 'Phone', status: 'In House', adv: 3000 },
  { g: 9, type: 'rt_prm', room: '301', plan: 'rp_cp', arr: -3, dep: 1, src: 'Expedia', status: 'In House', notes: 'Form C submitted · vegetarian', extras: [['Service', 'Spa · Swedish massage 60 min', 3500]] },
  { g: 10, type: 'rt_prm', room: '304', plan: 'rp_map', arr: -2, dep: 0, src: 'Booking.com', status: 'In House', extras: [['F&B', 'Room service · KOT 418', 1260]] },
  { g: 11, type: 'rt_prm', room: '306', plan: 'rp_ap', arr: -1, dep: 4, src: 'Website', status: 'In House', adv: 15000 },
  { g: 12, type: 'rt_exs', room: '401', plan: 'rp_cp', arr: -2, dep: 3, src: 'Corporate', status: 'In House', extras: [['Service', 'Business centre · printing', 350]] },
  { g: 13, type: 'rt_prs', room: '404', plan: 'rp_ap', arr: -1, dep: 2, c: 2, src: 'Phone', status: 'In House', adv: 25000, notes: 'Anniversary – cake & flowers on arrival' },
  // arriving today
  { g: 14, type: 'rt_std', room: '104', plan: 'rp_cp', arr: 0, dep: 2, src: 'MakeMyTrip', status: 'Confirmed' },
  { g: 15, type: 'rt_dlx', plan: 'rp_ep', arr: 0, dep: 1, a: 1, src: 'Corporate', status: 'Confirmed', notes: 'Late arrival ~ 10 PM' },
  { g: 16, type: 'rt_prm', room: '302', plan: 'rp_cp', arr: 0, dep: 3, src: 'Booking.com', status: 'Confirmed', notes: 'Japanese national – Form C required' },
  { g: 17, type: 'rt_std', plan: 'rp_ep', arr: 0, dep: 1, src: 'Phone', status: 'Confirmed' },
  { g: 18, type: 'rt_exs', room: '402', plan: 'rp_map', arr: 0, dep: 2, src: 'Website', status: 'Confirmed', adv: 10000 },
  // future
  { g: 19, type: 'rt_std', plan: 'rp_cp', arr: 1, dep: 3, src: 'Agoda', status: 'Confirmed' },
  { g: 20, type: 'rt_dlx', room: '203', plan: 'rp_ep', arr: 1, dep: 2, a: 1, src: 'Corporate', status: 'Confirmed' },
  { g: 21, type: 'rt_prm', room: '305', plan: 'rp_cp', arr: 2, dep: 5, src: 'Website', status: 'Confirmed', adv: 6000 },
  { g: 22, type: 'rt_std', room: '101', plan: 'rp_ep', arr: 3, dep: 4, src: 'Phone', status: 'Confirmed' },
  { g: 23, type: 'rt_dlx', plan: 'rp_cp', arr: 3, dep: 6, src: 'MakeMyTrip', status: 'Confirmed' },
  { g: 24, type: 'rt_exs', room: '403', plan: 'rp_cp', arr: 5, dep: 7, src: 'Corporate', status: 'Confirmed' },
  { g: 25, type: 'rt_prs', room: '404', plan: 'rp_map', arr: 6, dep: 9, src: 'Travel Agent', status: 'Confirmed', adv: 20000 },
  { g: 26, type: 'rt_dlx', room: '206', plan: 'rp_cp', arr: 8, dep: 10, src: 'Booking.com', status: 'Confirmed' },
  { g: 27, type: 'rt_std', room: '107', plan: 'rp_cp', arr: 2, dep: 3, src: 'Travel Agent', status: 'Confirmed' },
  // checked out
  { g: 28, type: 'rt_std', room: '101', plan: 'rp_cp', arr: -4, dep: -1, src: 'MakeMyTrip', status: 'Checked Out' },
  { g: 29, type: 'rt_dlx', room: '203', plan: 'rp_ep', arr: -3, dep: -1, src: 'Walk-in', status: 'Checked Out', extras: [['F&B', 'Restaurant · Bill B4098 (charged to room)', 2210]] },
  { g: 30, type: 'rt_prm', room: '302', plan: 'rp_map', arr: -5, dep: -2, src: 'Website', status: 'Checked Out' },
  { g: 31, type: 'rt_std', room: '105', plan: 'rp_cp', arr: -2, dep: 0, src: 'Phone', status: 'Checked Out', extras: [['Service', 'Laundry · 3 pcs', 270]] },
  { g: 24, type: 'rt_dlx', room: '207', plan: 'rp_cp', arr: -3, dep: 0, src: 'Corporate', status: 'Checked Out' },
  { g: 32, type: 'rt_prm', room: '303', plan: 'rp_ep', arr: -1, dep: 0, src: 'Expedia', status: 'Checked Out' },
  // cancelled / no-show
  { g: 34, type: 'rt_dlx', plan: 'rp_cp', arr: 4, dep: 6, src: 'Expedia', status: 'Cancelled' },
  { g: 35, type: 'rt_std', plan: 'rp_ep', arr: -1, dep: 1, src: 'Booking.com', status: 'No Show' },
]

const STAFF = ['Meera Kapoor', 'Arjun Rawat', 'Amit Verma']

function nightCharges(r: Reservation, date: string, cfg: HotelConfig, rooms: Room[], types: RoomType[], plans: RatePlan[], by: string, at = Date.now()): FolioCharge[] {
  const rc = nightRoomCharge(r, date, cfg)
  const no = rooms.find((x) => x.id === r.roomId)?.no ?? '—'
  const type = types.find((t) => t.id === r.typeId)
  const plan = plans.find((p) => p.id === r.planId)
  const out: FolioCharge[] = [{
    id: uid('fc'), at, date, kind: 'Room', ref: 'night', by, gst: roomGst(rc, cfg), amount: rc,
    desc: `Room ${no} · ${type?.name ?? ''} · night of ${fmtDateShort(date)}${isWeekend(date, cfg) ? ' (weekend)' : ''}`,
  }]
  if (r.mealRate > 0) out.push({ id: uid('fc'), at, date, kind: 'F&B', ref: 'meal', by, gst: cfg.fnbGst, amount: r.mealRate, desc: `Meal plan ${plan?.code} · ${plan?.meals} · ${fmtDateShort(date)}` })
  return out
}

function seedReservations(): Reservation[] {
  const t = today()
  const cfg = SEED_CONFIG
  const dayMs = (offset: number, hour: number) => new Date(addDays(t, offset) + `T${String(hour).padStart(2, '0')}:${String((offset * 17 + 60) % 60).padStart(2, '0')}:00`).getTime()
  let inv = 300
  return ROWS.map((s, i) => {
    const type = SEED_TYPES.find((x) => x.id === s.type)!
    const plan = SEED_PLANS.find((x) => x.id === s.plan)
    const adults = s.a ?? 2, children = s.c ?? 0
    const r: Reservation = {
      id: `res_${i + 1}`, no: `RES-${1001 + i}`, guest: guestInfo(s.g), source: s.src, otaRef: OTA.includes(s.src) ? `${s.src.slice(0, 2).toUpperCase()}${4410000 + i * 1373}` : undefined,
      typeId: s.type, roomId: s.room ? 'rm_' + s.room : undefined, planId: s.plan,
      arrival: addDays(t, s.arr), departure: addDays(t, s.dep), adults, children,
      roomRate: roomRateFor(type, adults, children), mealRate: mealRateFor(plan, adults, children),
      status: s.status, createdAt: dayMs(s.arr - 6 - (i % 9), 11), createdBy: STAFF[i % 3], notes: s.notes, charges: [], payments: [],
    }
    const by = STAFF[(i + 1) % 3]
    if (OTA.includes(s.src) && s.status !== 'Cancelled' && s.status !== 'No Show') {
      r.payments.push({ id: uid('fp'), at: r.createdAt, mode: 'OTA Prepaid', amount: Math.round(stayEstimate(r, cfg).total), ref: r.otaRef, kind: 'Advance', by: 'Channel Manager' })
    } else if (s.adv) {
      r.payments.push({ id: uid('fp'), at: r.createdAt, mode: i % 2 ? 'UPI' : 'Card', amount: s.adv, ref: `TXN${88120 + i * 31}`, kind: 'Advance', by: r.createdBy })
    }
    if (s.status === 'In House' || s.status === 'Checked Out') {
      r.checkedInAt = dayMs(s.arr, 14)
      const lastNight = s.status === 'In House' ? addDays(t, -1) : addDays(r.departure, -1)
      for (let d = r.arrival; d <= lastNight; d = addDays(d, 1)) r.charges.push(...nightCharges(r, d, cfg, SEED_ROOMS, SEED_TYPES, SEED_PLANS, 'Night Audit', dayMs(nightIndex(t, d), 23)))
      s.extras?.forEach(([kind, desc, amount], k) => r.charges.push({ id: uid('fc'), at: dayMs(Math.min(-1, s.arr + k), 20), date: addDays(t, Math.min(-1, s.arr + k)), kind, desc, amount, gst: kind === 'F&B' ? cfg.fnbGst : cfg.serviceGst, ref: kind === 'F&B' ? 'pos' : 'service', by }))
    }
    if (s.status === 'Checked Out') {
      r.checkedOutAt = dayMs(s.dep, 10)
      const bal = folioTotals(r).balance
      if (bal > 0) r.payments.push({ id: uid('fp'), at: r.checkedOutAt, mode: s.src === 'Corporate' ? 'Bill to Company' : (['Card', 'UPI', 'Cash'] as const)[i % 3], amount: bal, kind: 'Payment', by })
      r.invoiceNo = cfg.invoicePrefix + String(++inv).padStart(4, '0')
    }
    if (s.status === 'Cancelled') { r.cancelledAt = dayMs(-1, 16); r.cancelReason = 'Guest cancelled – change of plans (free cancellation)' }
    return r
  })
}
const nightIndex = (t: string, d: string) => -Math.round((new Date(t).getTime() - new Date(d).getTime()) / 864e5)

/* ------------------------------------------------------------------ store */
export type NewReservation = Omit<Reservation, 'id' | 'no' | 'status' | 'createdAt' | 'createdBy' | 'charges' | 'payments'>
export type Settle = { mode: FolioPayment['mode']; amount: number; ref?: string }

interface HotelState {
  config: HotelConfig
  types: RoomType[]
  rooms: Room[]
  plans: RatePlan[]
  reservations: Reservation[]
  seq: { res: number; inv: number }
  createReservation: (r: NewReservation, advance?: Settle) => Reservation
  updateReservation: (id: string, patch: Partial<Reservation>) => void
  cancelReservation: (id: string, reason: string) => void
  markNoShow: (id: string) => void
  checkIn: (id: string, o: { roomId: string; guest: GuestInfo; deposit?: Settle; earlyCheckIn?: boolean }) => void
  moveRoom: (id: string, roomId: string, reason: string) => void
  addCharge: (id: string, c: Omit<FolioCharge, 'id' | 'at' | 'by'>) => void
  addPayment: (id: string, p: Omit<FolioPayment, 'id' | 'at' | 'by'>) => void
  checkOut: (id: string, settle: Settle[], lateCheckOut?: boolean) => string | undefined
  nightAudit: () => { posted: number; amount: number; noShows: number }
  setHk: (roomId: string, hk: HkStatus, note?: string) => void
  upsertType: (t: RoomType) => void
  upsertRoom: (r: Room) => void
  upsertPlan: (p: RatePlan) => void
  updateConfig: (patch: Partial<HotelConfig>) => void
  reset: () => void
}

const seed = () => ({
  config: { ...SEED_CONFIG, lastAudit: addDays(today(), -1) },
  types: SEED_TYPES.map((t) => ({ ...t, amenities: [...t.amenities] })),
  rooms: SEED_ROOMS.map((r) => ({ ...r })),
  plans: SEED_PLANS.map((p) => ({ ...p })),
  reservations: seedReservations(),
  seq: { res: 1001 + ROWS.length, inv: 307 },
})

const me = () => {
  const s = useStore.getState()
  return s.users.find((u) => u.id === s.currentUserId)?.name ?? 'Front Desk'
}
const log = (text: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info') => {
  const s = useStore.getState()
  s.log(text, 'hotel', type, useHotel.getState().config.outletId)
}

export const useHotel = create<HotelState>()(
  persist(
    (set, get) => {
      const patchRes = (id: string, fn: (r: Reservation) => Reservation) => set((s) => ({ reservations: s.reservations.map((r) => (r.id === id ? fn(r) : r)) }))
      const roomNo = (roomId?: string) => get().rooms.find((x) => x.id === roomId)?.no ?? '—'
      const pay = (p: Settle, kind: FolioPayment['kind']): FolioPayment => ({ id: uid('fp'), at: Date.now(), by: me(), kind, ...p })

      return {
        ...seed(),

        createReservation: (input, advance) => {
          const no = `RES-${get().seq.res}`
          const r: Reservation = { ...input, id: uid('res'), no, status: 'Confirmed', createdAt: Date.now(), createdBy: me(), charges: [], payments: advance && advance.amount > 0 ? [pay(advance, 'Advance')] : [] }
          set((s) => ({ reservations: [r, ...s.reservations], seq: { ...s.seq, res: s.seq.res + 1 } }))
          log(`New reservation ${no} · ${r.guest.name} · ${r.arrival} → ${r.departure} (${r.source})`, 'success')
          useStore.getState().notify({ title: 'New room reservation', body: `${r.guest.name} · ${no} · ${r.source}`, type: 'order', link: '/hotel/reservations' })
          return r
        },
        updateReservation: (id, patch) => patchRes(id, (r) => ({ ...r, ...patch })),
        cancelReservation: (id, reason) => {
          const r = get().reservations.find((x) => x.id === id)
          patchRes(id, (x) => ({ ...x, status: 'Cancelled', cancelledAt: Date.now(), cancelReason: reason }))
          log(`Cancelled reservation ${r?.no} · ${r?.guest.name} — ${reason}`, 'warning')
        },
        markNoShow: (id) => {
          const r = get().reservations.find((x) => x.id === id)
          patchRes(id, (x) => ({ ...x, status: 'No Show' }))
          log(`Marked ${r?.no} · ${r?.guest.name} as no-show`, 'warning')
        },
        checkIn: (id, { roomId, guest, deposit, earlyCheckIn }) => {
          const { config, rooms, types } = get()
          const t = today()
          patchRes(id, (r) => {
            const moved = rooms.find((x) => x.id === roomId)
            // upgrade: keep the booked rate, record the new type
            const charges = [...r.charges]
            if (earlyCheckIn) charges.push({ id: uid('fc'), at: Date.now(), date: t, kind: 'Service', desc: 'Early check-in fee', amount: config.earlyCheckInFee, gst: config.serviceGst, ref: 'service', by: me() })
            return {
              ...r, status: 'In House', roomId, typeId: moved?.typeId ?? r.typeId, guest, checkedInAt: Date.now(),
              arrival: t, departure: r.departure > t ? r.departure : addDays(t, 1), charges,
              payments: deposit && deposit.amount > 0 ? [...r.payments, pay(deposit, 'Advance')] : r.payments,
            }
          })
          const r = get().reservations.find((x) => x.id === id)!
          const typeName = types.find((x) => x.id === r.typeId)?.name
          log(`Checked in ${r.guest.name} to room ${roomNo(roomId)} (${typeName}) · ${r.no}`, 'success')
          useStore.getState().notify({ title: `Check-in · Room ${roomNo(roomId)}`, body: `${r.guest.name} · ${r.adults + r.children} guest(s) till ${fmtDateShort(r.departure)}`, type: 'system', link: '/hotel' })
        },
        moveRoom: (id, roomId, reason) => {
          const r = get().reservations.find((x) => x.id === id)
          if (!r) return
          const from = r.roomId
          const to = get().rooms.find((x) => x.id === roomId)
          patchRes(id, (x) => ({ ...x, roomId, typeId: x.status === 'In House' ? to?.typeId ?? x.typeId : x.typeId }))
          if (r.status === 'In House' && from) set((s) => ({ rooms: s.rooms.map((x) => (x.id === from ? { ...x, hk: 'Dirty' } : x)) }))
          log(`${r.status === 'In House' ? 'Room move' : 'Room assigned'} · ${r.guest.name} ${from ? roomNo(from) + ' → ' : ''}${to?.no}${reason ? ' — ' + reason : ''}`)
        },
        addCharge: (id, c) => {
          patchRes(id, (r) => ({ ...r, charges: [...r.charges, { ...c, id: uid('fc'), at: Date.now(), by: me() }] }))
          const r = get().reservations.find((x) => x.id === id)
          log(`Posted ${c.kind === 'Allowance' ? 'allowance' : 'charge'} “${c.desc}” ₹${Math.abs(c.amount)} to room ${roomNo(r?.roomId)} folio`, c.kind === 'Allowance' ? 'warning' : 'info')
        },
        addPayment: (id, p) => {
          patchRes(id, (r) => ({ ...r, payments: [...r.payments, { ...p, id: uid('fp'), at: Date.now(), by: me() }] }))
          const r = get().reservations.find((x) => x.id === id)
          log(`${p.kind} ₹${p.amount} (${p.mode}) on ${r?.no} · ${r?.guest.name}`, 'success')
        },
        checkOut: (id, settle, lateCheckOut) => {
          const { config, rooms, types, plans } = get()
          const r0 = get().reservations.find((x) => x.id === id)
          if (!r0 || r0.status !== 'In House') return
          const t = today()
          const posted = postedNights(r0)
          const by = me()
          const charges = [...r0.charges]
          billableNights(r0, t).filter((d) => !posted.has(d)).forEach((d) => charges.push(...nightCharges(r0, d, config, rooms, types, plans, by)))
          if (lateCheckOut) charges.push({ id: uid('fc'), at: Date.now(), date: t, kind: 'Service', desc: 'Late check-out fee', amount: config.lateCheckOutFee, gst: config.serviceGst, ref: 'service', by })
          const balance = folioTotals({ charges, payments: r0.payments }).balance
          const payments = [...r0.payments, ...settle.filter((p) => p.amount > 0).map((p) => pay(p, 'Payment'))]
          if (balance < 0) payments.push(pay({ mode: 'Cash', amount: -balance }, 'Refund'))
          const invoiceNo = config.invoicePrefix + String(get().seq.inv).padStart(4, '0')
          set((s) => ({
            seq: { ...s.seq, inv: s.seq.inv + 1 },
            reservations: s.reservations.map((x) => (x.id === id ? { ...x, charges, payments, status: 'Checked Out', checkedOutAt: Date.now(), departure: t > x.arrival ? t : addDays(x.arrival, 1), invoiceNo } : x)),
            rooms: s.rooms.map((x) => (x.id === r0.roomId ? { ...x, hk: 'Dirty' } : x)),
          }))
          const r = get().reservations.find((x) => x.id === id)!
          const total = folioTotals(r).total
          log(`Checked out ${r.guest.name} from room ${roomNo(r.roomId)} · invoice ${invoiceNo} · ₹${Math.round(total)}`, 'success')
          // guest profile → CRM
          const st = useStore.getState()
          const existing = st.customers.find((c) => c.phone === r.guest.phone)
          if (existing) st.upsertCustomer({ ...existing, visits: existing.visits + 1, spend: existing.spend + Math.round(total), lastVisit: t, points: existing.points + Math.floor(total / 100), tags: Array.from(new Set([...existing.tags, 'Hotel guest'])) })
          else st.upsertCustomer({ id: uid('c'), name: r.guest.name, phone: r.guest.phone, email: r.guest.email, visits: 1, spend: Math.round(total), lastVisit: t, points: Math.floor(total / 100), tier: 'Bronze', notes: `Hotel guest · ${r.no} · Room ${roomNo(r.roomId)}`, favOutlet: config.outletId, tags: ['Hotel guest'] })
          return invoiceNo
        },
        nightAudit: () => {
          const { config, rooms, types, plans, reservations } = get()
          const t = today()
          let posted = 0, amount = 0, noShows = 0
          const next = reservations.map((r) => {
            if (r.status === 'In House' && !postedNights(r).has(t)) {
              const add = nightCharges(r, t, config, rooms, types, plans, 'Night Audit')
              posted++
              amount += add.reduce((s, c) => s + c.amount, 0)
              return { ...r, charges: [...r.charges, ...add] }
            }
            if (r.status === 'Confirmed' && r.arrival < t) { noShows++; return { ...r, status: 'No Show' as const } }
            return r
          })
          set({ reservations: next, config: { ...config, lastAudit: t } })
          log(`Night audit for ${t}: ${posted} room nights posted (₹${Math.round(amount)}), ${noShows} no-show(s)`, 'success')
          return { posted, amount, noShows }
        },
        setHk: (roomId, hk, note) => {
          set((s) => ({ rooms: s.rooms.map((x) => (x.id === roomId ? { ...x, hk, note: hk === 'Out of Order' ? note ?? x.note : undefined } : x)) }))
          log(`Room ${roomNo(roomId)} marked ${hk}${note ? ' — ' + note : ''}`, hk === 'Out of Order' ? 'warning' : 'info')
        },
        upsertType: (t) => set((s) => ({ types: s.types.some((x) => x.id === t.id) ? s.types.map((x) => (x.id === t.id ? t : x)) : [...s.types, t] })),
        upsertRoom: (r) => set((s) => ({ rooms: (s.rooms.some((x) => x.id === r.id) ? s.rooms.map((x) => (x.id === r.id ? r : x)) : [...s.rooms, r]).sort((a, b) => a.no.localeCompare(b.no, undefined, { numeric: true })) })),
        upsertPlan: (p) => set((s) => ({ plans: s.plans.some((x) => x.id === p.id) ? s.plans.map((x) => (x.id === p.id ? p : x)) : [...s.plans, p] })),
        updateConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
        reset: () => set(seed()),
      }
    },
    { name: 'restroflow-hotel-v1' },
  ),
)

// keep front desk / reservations open in several tabs in sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'restroflow-hotel-v1') useHotel.persist.rehydrate()
  })
}
