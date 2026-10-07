import { isoDate } from '@/lib/format'

/* ------------------------------------------------------------------ types */
export type HkStatus = 'Clean' | 'Dirty' | 'Out of Order'
export type ResStatus = 'Confirmed' | 'In House' | 'Checked Out' | 'Cancelled' | 'No Show'
export type BookingSource = 'Walk-in' | 'Phone' | 'Website' | 'Booking.com' | 'MakeMyTrip' | 'Agoda' | 'Expedia' | 'Corporate' | 'Travel Agent'
export type FolioPayMode = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'OTA Prepaid' | 'Bill to Company'
export type ChargeKind = 'Room' | 'F&B' | 'Service' | 'Allowance'
export type IdType = 'Aadhaar' | 'Passport' | 'Driving Licence' | 'Voter ID' | 'PAN'

export interface RoomType {
  id: string; code: string; name: string; baseRate: number; maxAdults: number; maxChildren: number
  extraAdult: number; extraChild: number; bed: string; sizeSqft: number; amenities: string[]; color: string; description: string
}
export interface Room { id: string; no: string; floor: string; typeId: string; view: string; hk: HkStatus; smoking: boolean; note?: string }
export interface RatePlan { id: string; code: string; name: string; meals: string; addonPerAdult: number; active: boolean; description: string }

export interface GuestInfo {
  name: string; phone: string; email: string; nationality: string; idType: IdType; idNo: string; address: string
  company?: string; gstin?: string; visaNo?: string
}
export interface FolioCharge { id: string; at: number; date: string; kind: ChargeKind; desc: string; amount: number; gst: number; ref?: string; by: string }
export interface FolioPayment { id: string; at: number; mode: FolioPayMode; amount: number; ref?: string; kind: 'Advance' | 'Payment' | 'Refund'; by: string }

export interface Reservation {
  id: string; no: string; guest: GuestInfo; source: BookingSource; otaRef?: string
  typeId: string; roomId?: string; planId: string
  arrival: string; departure: string; adults: number; children: number
  /** locked weekday room rate per night (pre-tax). Weekend nights add the property uplift */
  roomRate: number
  /** meal-plan amount per night (pre-tax), from the rate plan */
  mealRate: number
  status: ResStatus; createdAt: number; createdBy: string
  checkedInAt?: number; checkedOutAt?: number; cancelledAt?: number; cancelReason?: string
  notes?: string; charges: FolioCharge[]; payments: FolioPayment[]; invoiceNo?: string
}

export interface HotelConfig {
  name: string; outletId: string; checkInTime: string; checkOutTime: string
  weekendUplift: number; weekendNights: number[] // 5 = Fri, 6 = Sat
  gstThreshold: number; gstLow: number; gstHigh: number; fnbGst: number; serviceGst: number
  earlyCheckInFee: number; lateCheckOutFee: number; invoicePrefix: string; lastAudit?: string
}

/* ------------------------------------------------------------------ dates */
export const today = () => isoDate()
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return isoDate(d)
}
export const nightsBetween = (from: string, to: string) =>
  Math.max(0, Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 864e5))
/** nights of a stay: [from, to) */
export const stayDates = (from: string, to: string) => Array.from({ length: nightsBetween(from, to) }, (_, i) => addDays(from, i))
export const overlaps = (aFrom: string, aTo: string, bFrom: string, bTo: string) => aFrom < bTo && bFrom < aTo
export const weekday = (iso: string) => new Date(iso + 'T00:00:00').getDay()

/* ------------------------------------------------------------------ tariff */
export const isWeekend = (iso: string, cfg: HotelConfig) => cfg.weekendNights.includes(weekday(iso))

/** Weekday room rate for an occupancy (before meal plan) */
export function roomRateFor(t: RoomType, adults: number, children: number) {
  return t.baseRate + Math.max(0, adults - 2) * t.extraAdult + children * t.extraChild
}
/** Meal plan per night — children are charged at half */
export const mealRateFor = (p: RatePlan | undefined, adults: number, children: number) =>
  p ? Math.round(p.addonPerAdult * (adults + children * 0.5)) : 0

export const nightRoomCharge = (r: Pick<Reservation, 'roomRate'>, date: string, cfg: HotelConfig) =>
  Math.round(r.roomRate * (isWeekend(date, cfg) ? 1 + cfg.weekendUplift / 100 : 1))

/** GST slab on accommodation depends on the per-night tariff */
export const roomGst = (perNight: number, cfg: HotelConfig) => (perNight > cfg.gstThreshold ? cfg.gstHigh : cfg.gstLow)

/** Projected bill for a stay (used on booking & check-out previews) */
export function stayEstimate(r: Pick<Reservation, 'roomRate' | 'mealRate' | 'arrival' | 'departure'>, cfg: HotelConfig) {
  const dates = stayDates(r.arrival, r.departure)
  let room = 0, mealTotal = 0, tax = 0
  for (const d of dates) {
    const rc = nightRoomCharge(r, d, cfg)
    room += rc
    tax += (rc * roomGst(rc, cfg)) / 100
    mealTotal += r.mealRate
    tax += (r.mealRate * cfg.fnbGst) / 100
  }
  return { nights: dates.length, room, meal: mealTotal, tax, total: room + mealTotal + tax }
}

/* ------------------------------------------------------------------ folio */
export const chargeTax = (c: FolioCharge) => (c.amount * c.gst) / 100
export function folioTotals(r: Pick<Reservation, 'charges' | 'payments'>) {
  const charges = r.charges.reduce((s, c) => s + c.amount, 0)
  const tax = r.charges.reduce((s, c) => s + chargeTax(c), 0)
  const total = charges + tax
  const paid = r.payments.reduce((s, p) => s + (p.kind === 'Refund' ? -p.amount : p.amount), 0)
  const byKind = (k: ChargeKind) => r.charges.filter((c) => c.kind === k).reduce((s, c) => s + c.amount + chargeTax(c), 0)
  return { charges, tax, total, paid, balance: Math.round((total - paid) * 100) / 100, room: byKind('Room'), fnb: byKind('F&B'), service: byKind('Service'), allowance: byKind('Allowance') }
}
export const postedNights = (r: Reservation) => new Set(r.charges.filter((c) => c.kind === 'Room' && c.ref === 'night').map((c) => c.date))

/** Nights a departing guest is billed for: arrival … yesterday (min. one night for day-use) */
export function billableNights(r: Reservation, on = today()) {
  const end = on > r.arrival ? on : addDays(r.arrival, 1)
  return stayDates(r.arrival, end)
}

/* ------------------------------------------------------------------ room state */
export type RoomState = 'Vacant Clean' | 'Vacant Dirty' | 'Occupied' | 'Arriving' | 'Out of Order'
export const ROOM_STATES: RoomState[] = ['Vacant Clean', 'Vacant Dirty', 'Occupied', 'Arriving', 'Out of Order']
export function roomState(room: Room, reservations: Reservation[], on = today()): { state: RoomState; stay?: Reservation; next?: Reservation; dueOut?: boolean } {
  const stay = reservations.find((r) => r.roomId === room.id && r.status === 'In House')
  const next = reservations
    .filter((r) => r.roomId === room.id && r.status === 'Confirmed' && r.departure > on)
    .sort((a, b) => a.arrival.localeCompare(b.arrival))[0]
  if (room.hk === 'Out of Order') return { state: 'Out of Order', stay, next }
  if (stay) return { state: 'Occupied', stay, next, dueOut: stay.departure <= on }
  if (next && next.arrival <= on) return { state: 'Arriving', next }
  return { state: room.hk === 'Dirty' ? 'Vacant Dirty' : 'Vacant Clean', next }
}

/** Is the room free for [from, to) — ignores one reservation (when editing / moving) */
export function roomFree(roomId: string, from: string, to: string, reservations: Reservation[], ignoreId?: string) {
  return !reservations.some((r) => r.id !== ignoreId && r.roomId === roomId && (r.status === 'Confirmed' || r.status === 'In House') && overlaps(from, to, r.arrival, r.departure))
}

/** Rooms of a type still sellable on every night of [from, to) */
export function typeAvailability(typeId: string, from: string, to: string, rooms: Room[], reservations: Reservation[], ignoreId?: string) {
  const pool = rooms.filter((r) => r.typeId === typeId && r.hk !== 'Out of Order').length
  const active = reservations.filter((r) => r.id !== ignoreId && r.typeId === typeId && (r.status === 'Confirmed' || r.status === 'In House'))
  const dates = stayDates(from, to)
  if (!dates.length) return pool
  return Math.min(...dates.map((d) => pool - active.filter((r) => r.arrival <= d && d < r.departure).length))
}
