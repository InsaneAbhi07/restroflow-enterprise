import type { Approval, AppNotification, Activity, Attendance, AttStatus, Customer, Kot, Order, OrderItem, OrderSource, OrderType, PayMode, Table, TableStatus } from '@/types'
import { seeded } from '@/lib/rand'
import { isoDate } from '@/lib/format'
import { MENU } from './menu'
import { EMPLOYEES } from './people'
import { computeTotals } from '@/lib/billing'

const OUTLET_IDS = ['o1', 'o2', 'o3', 'o4']
const WAITERS: Record<string, { id: string; name: string }[]> = {
  o1: [{ id: 'e5', name: 'Rohit Kumar' }, { id: 'e10', name: 'Suresh Yadav' }],
  o2: [{ id: 'e14', name: 'Arjun Nair' }, { id: 'e16', name: 'Ritu Saxena' }],
  o3: [{ id: 'e19', name: 'Sneha Kapoor' }],
  o4: [{ id: 'e23', name: 'Ajay Chauhan' }],
}
export const waitersFor = (outletId: string) => WAITERS[outletId] ?? []

// ---------------- Tables: 10 per outlet = 40 ----------------
const FLOORS: Record<string, string[]> = {
  o1: ['Ground Floor', 'Ground Floor', 'Ground Floor', 'Ground Floor', 'Ground Floor', 'Ground Floor', 'First Floor', 'First Floor', 'First Floor', 'First Floor'],
  o2: ['Main Hall', 'Main Hall', 'Main Hall', 'Main Hall', 'Main Hall', 'Main Hall', 'Terrace', 'Terrace', 'Terrace', 'Terrace'],
  o3: ['Food Court', 'Food Court', 'Food Court', 'Food Court', 'Food Court', 'Dining', 'Dining', 'Dining', 'Dining', 'Dining'],
  o4: ['AC Hall', 'AC Hall', 'AC Hall', 'AC Hall', 'AC Hall', 'Open Dhaba', 'Open Dhaba', 'Open Dhaba', 'Open Dhaba', 'Open Dhaba'],
}
const PRE: Record<string, string> = { 'Ground Floor': 'G', 'First Floor': 'F', 'Main Hall': 'H', Terrace: 'T', 'Food Court': 'FC', Dining: 'D', 'AC Hall': 'A', 'Open Dhaba': 'OD' }
const STAT_PATTERN: TableStatus[] = ['Occupied', 'Available', 'Occupied', 'Reserved', 'Billing', 'Available', 'Occupied', 'Cleaning', 'Available', 'Available']

export const TABLES: Table[] = OUTLET_IDS.flatMap((o, oi) => {
  const counters: Record<string, number> = {}
  return FLOORS[o].map((floor, i) => {
    counters[floor] = (counters[floor] ?? 0) + 1
    const status = STAT_PATTERN[(i + oi) % 10]
    const cap = [2, 4, 4, 6, 2, 4, 8, 4, 2, 6][i]
    return {
      id: `t_${o}_${i + 1}`, outletId: o, label: PRE[floor] + counters[floor], floor, capacity: cap, status,
      shape: cap >= 6 ? 'rect' : cap === 2 ? 'round' : 'square', qrEnabled: i !== 7,
      waiterId: status === 'Occupied' || status === 'Billing' ? WAITERS[o][i % WAITERS[o].length].id : undefined,
      since: status === 'Occupied' || status === 'Billing' ? Date.now() - (12 + i * 9) * 60000 : undefined,
      reservedFor: status === 'Reserved' ? ['Mr. Khanna (4 pax)', 'Mehra Family', 'Corporate – Infosys'][i % 3] : undefined,
      reservedAt: status === 'Reserved' ? '8:30 PM' : undefined,
    } as Table
  })
})

// ---------------- Customers ----------------
const CUST_NAMES = ['Rajesh Khanna', 'Sunita Mehra', 'Vivek Oberoi', 'Ananya Iyer', 'Farhan Qureshi', 'Meera Pillai', 'Siddharth Rao', 'Isha Bhatia', 'Nikhil Chopra', 'Tanvi Desai', 'Aditya Bose', 'Ritika Sethi', 'Gaurav Sood', 'Pallavi Reddy', 'Kunal Bajaj', 'Shreya Ghosh', 'Varun Dhawan', 'Neelam Kaur', 'Harsh Vardhan', 'Divya Menon', 'Rohan Gill', 'Simran Ahuja', 'Manoj Pandey', 'Kriti Arora', 'Yash Malhotra', 'Aarti Jain', 'Pranav Kulkarni', 'Zoya Ali', 'Sameer Chaudhary', 'Tara Singh']
export const CUSTOMERS: Customer[] = CUST_NAMES.map((name, i) => {
  const r = seeded(500 + i)
  const visits = r.int(1, 48)
  const spend = visits * r.int(650, 2400)
  const tier: Customer['tier'] = spend > 60000 ? 'Platinum' : spend > 30000 ? 'Gold' : spend > 10000 ? 'Silver' : 'Bronze'
  return {
    id: 'cu' + (i + 1), name, phone: '98' + String(10000000 + i * 3457913).slice(0, 8),
    email: name.toLowerCase().replace(' ', '.') + '@gmail.com', visits, spend,
    lastVisit: isoDate(new Date(Date.now() - r.int(0, 40) * 864e5)), points: Math.round(spend / 100), tier,
    notes: ['Prefers window seating', 'Jain food only', 'Allergic to peanuts', 'Regular Sunday lunch', 'Corporate client – GST invoice', ''][i % 6],
    birthday: `${String((i % 12) + 1).padStart(2, '0')}-${String((i * 7) % 28 + 1).padStart(2, '0')}`,
    favOutlet: OUTLET_IDS[i % 4], tags: [visits > 20 ? 'Regular' : 'New', spend > 30000 ? 'High Value' : ''].filter(Boolean),
  }
})

// ---------------- Historical orders (50 settled today/yesterday + running) ----------------
const SOURCES: OrderSource[] = ['POS', 'POS', 'POS', 'Waiter App', 'Waiter App', 'QR Order', 'Swiggy', 'Zomato']
const MODES: PayMode[] = ['Cash', 'UPI', 'UPI', 'UPI', 'Credit Card', 'Debit Card']
let billSeq = 4100
let orderSeq = 8800
export const nextSeeds = () => ({ billSeq, orderSeq })

function makeItems(r: ReturnType<typeof seeded>, n: number): OrderItem[] {
  const picked = new Set<string>()
  const out: OrderItem[] = []
  while (out.length < n) {
    const m = r.pick(MENU)
    if (picked.has(m.id) || !m.available) continue
    picked.add(m.id)
    const v = m.variants?.length ? m.variants[m.variants.length - 1] : undefined
    out.push({ id: 'oi' + Math.floor(r.next() * 1e9), itemId: m.id, name: m.name, price: v?.price ?? m.price, variant: v?.name, qty: r.int(1, 3), veg: m.veg, gst: m.gst })
  }
  return out
}

export function seedOrders(): Order[] {
  const r = seeded(99)
  const orders: Order[] = []
  const now = Date.now()
  for (let i = 0; i < 50; i++) {
    const outletId = OUTLET_IDS[i % 4]
    const source = r.pick(SOURCES)
    const type: OrderType = source === 'Swiggy' || source === 'Zomato' ? 'Delivery' : r.chance(0.2) ? 'Takeaway' : 'Dine-in'
    const created = now - (i * 23 + r.int(5, 20)) * 60000
    const items = makeItems(r, r.int(2, 5))
    const w = r.pick(WAITERS[outletId])
    const cust = r.chance(0.6) ? r.pick(CUSTOMERS) : undefined
    const o: Order = {
      id: 'ord_h' + i, no: 'ORD-' + orderSeq++, billNo: 'B' + billSeq++, outletId, type, source, status: i === 13 || i === 37 ? 'Cancelled' : 'Settled',
      tableLabel: type === 'Dine-in' ? ['G2', 'H4', 'FC3', 'A1', 'F2', 'T1', 'D2', 'OD3'][i % 8] : undefined,
      waiterId: type === 'Dine-in' ? w.id : undefined, waiterName: type === 'Dine-in' ? w.name : undefined,
      customerId: cust?.id, customerName: cust?.name, customerPhone: cust?.phone, pax: r.int(1, 6),
      items, discount: r.chance(0.2) ? { type: 'pct', value: 10, reason: 'Loyalty' } : { type: 'pct', value: 0 },
      serviceCharge: type === 'Dine-in' ? 5 : 0, deliveryCharge: type === 'Delivery' ? 40 : 0,
      payments: [], createdAt: created, settledAt: created + r.int(25, 70) * 60000,
      cashier: ['Neha Gupta', 'Kavita Joshi', 'Manish Tiwari', 'Harpreet Kaur'][i % 4],
      cancelReason: i === 13 || i === 37 ? 'Customer left before order was served' : undefined,
    }
    if (o.status === 'Settled') {
      const total = computeTotals(o).total
      const mode = source === 'Swiggy' || source === 'Zomato' ? 'Wallet' : r.pick(MODES)
      o.payments = i % 11 === 5 ? [{ mode: 'Cash', amount: Math.round(total / 2), at: o.settledAt! }, { mode: 'UPI', amount: total - Math.round(total / 2), at: o.settledAt! }] : [{ mode, amount: total, at: o.settledAt! }]
    }
    orders.push(o)
  }
  // Running orders on occupied / billing tables
  TABLES.filter((t) => t.status === 'Occupied' || t.status === 'Billing').forEach((t, i) => {
    const w = WAITERS[t.outletId].find((x) => x.id === t.waiterId) ?? WAITERS[t.outletId][0]
    const id = 'ord_r' + i
    const items = makeItems(r, r.int(2, 4)).map((it) => ({ ...it, kotNo: 'K' + (300 + i) }))
    orders.push({
      id, no: 'ORD-' + orderSeq++, outletId: t.outletId, type: 'Dine-in', source: i % 3 === 0 ? 'Waiter App' : 'POS',
      status: t.status === 'Billing' ? 'Billed' : 'Running', billNo: t.status === 'Billing' ? 'B' + billSeq++ : undefined,
      tableId: t.id, tableLabel: t.label, waiterId: w.id, waiterName: w.name, pax: Math.min(t.capacity, 2 + (i % 3)),
      items, discount: { type: 'pct', value: 0 }, serviceCharge: 5, payments: [], createdAt: t.since ?? now,
    })
    t.orderId = id
  })
  return orders
}

export function seedKots(orders: Order[]): Kot[] {
  const statuses: Kot['status'][] = ['New', 'Preparing', 'Preparing', 'Ready', 'New', 'Served', 'Preparing', 'Ready']
  return orders.filter((o) => o.status === 'Running' || o.status === 'Billed').map((o, i) => ({
    id: 'kot_s' + i, no: 'K' + (300 + i), orderId: o.id, orderNo: o.no, outletId: o.outletId, tableLabel: o.tableLabel ?? '-', type: o.type,
    source: o.source, waiterName: o.waiterName ?? '-', createdAt: Date.now() - (3 + i * 4) * 60000, updatedAt: Date.now() - i * 60000,
    status: o.status === 'Billed' ? 'Served' : statuses[i % statuses.length], station: 'Main Kitchen', priority: i === 2,
    items: o.items.map((it) => ({ name: it.name, qty: it.qty, variant: it.variant, veg: it.veg, note: i % 4 === 1 ? 'Less spicy' : undefined })),
  }))
}

// ---------------- Attendance (current month up to today) ----------------
export function seedAttendance(): Attendance[] {
  const out: Attendance[] = []
  const today = new Date()
  const y = today.getFullYear(), m = today.getMonth()
  // include previous month fully too so calendars/payroll have data on early days of the month
  const start = new Date(y, m - 1, 1)
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const date = isoDate(d)
    const isToday = date === isoDate(today)
    EMPLOYEES.forEach((e, ei) => {
      const r = seeded(Number(date.replace(/-/g, '')) + ei * 131)
      let status: AttStatus
      if ((d.getDay() + ei) % 7 === 2) status = 'Weekly Off'
      else {
        const x = r.next()
        status = x < 0.78 ? 'Present' : x < 0.88 ? 'Late' : x < 0.92 ? 'Half Day' : x < 0.96 ? 'Leave' : 'Absent'
      }
      if (e.status === 'On Leave' && isToday) status = 'Leave'
      // keep a few "not checked in yet" today for the demo (Rohit Kumar e5 checks in via mobile)
      if (isToday && (e.id === 'e5' || ei % 9 === 4)) return
      const shiftStart = e.shift === 'Morning' ? 8 : e.shift === 'Evening' ? 14 : e.shift === 'Night' ? 20 : 10
      const inMin = status === 'Late' ? r.int(16, 55) : r.int(-10, 9)
      const ci = status === 'Present' || status === 'Late' || status === 'Half Day' ? fmtHM(shiftStart * 60 + inMin) : undefined
      const work = status === 'Half Day' ? 4.5 : r.range(8.5, 10.5)
      const co = ci && !isToday ? fmtHM(shiftStart * 60 + inMin + Math.round(work * 60)) : undefined
      out.push({
        id: `att_${e.id}_${date}`, employeeId: e.id, date, status, checkIn: ci, checkOut: co,
        method: ci ? (['Mobile', 'Network', 'Biometric', 'Manual'] as const)[ei % 4] : undefined,
        ot: co && work > 9.5 ? Math.round((work - 9) * 10) / 10 : 0,
      })
    })
  }
  return out
}
function fmtHM(min: number) {
  const mm = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`
}

export const seedApprovals = (): Approval[] => [
  { id: 'ap1', at: Date.now() - 18 * 60000, type: 'Discount', title: '20% discount on Bill B4131 (Table G3)', by: 'Neha Gupta', outletId: 'o1', amount: 412, status: 'Pending' },
  { id: 'ap2', at: Date.now() - 45 * 60000, type: 'Stock Transfer', title: 'TRF-0416 · Highway → Main Branch (Fish, Chicken)', by: 'Amit Verma', outletId: 'o1', status: 'Pending', ref: 'st5' },
  { id: 'ap3', at: Date.now() - 90 * 60000, type: 'Purchase Order', title: 'PO/25-26/1183 · Spice Route Traders', by: 'Priya Sharma', outletId: 'o4', amount: 18640, status: 'Pending' },
  { id: 'ap4', at: Date.now() - 3 * 36e5, type: 'Leave', title: 'Ritu Saxena · 3 days casual leave', by: 'Ritu Saxena', outletId: 'o2', status: 'Pending' },
  { id: 'ap5', at: Date.now() - 5 * 36e5, type: 'Attendance Correction', title: 'Arjun Nair · missed check-out on 29 Sep', by: 'Arjun Nair', outletId: 'o2', status: 'Pending' },
  { id: 'ap6', at: Date.now() - 6 * 36e5, type: 'Resettlement', title: 'Bill B4108 · Cash → UPI', by: 'Kavita Joshi', outletId: 'o2', amount: 1260, status: 'Pending' },
]

export const seedNotifications = (): AppNotification[] => [
  { id: 'n1', at: Date.now() - 4 * 60000, title: 'Low stock: Coriander Leaves', body: 'Main Branch has 0.8 kg left (min 2 kg).', read: false, type: 'stock', link: '/inventory' },
  { id: 'n2', at: Date.now() - 11 * 60000, title: 'New QR order · Table T2', body: 'City Center received a QR order worth ₹1,240.', read: false, type: 'order', link: '/orders' },
  { id: 'n3', at: Date.now() - 45 * 60000, title: 'Transfer awaiting approval', body: 'TRF-0416 Highway → Main Branch needs approval.', read: false, type: 'approval', link: '/inventory/transfers' },
  { id: 'n4', at: Date.now() - 2 * 36e5, title: '3 late arrivals today', body: 'Mall Outlet & Highway Outlet staff checked in late.', read: true, type: 'attendance', link: '/attendance' },
  { id: 'n5', at: Date.now() - 5 * 36e5, title: 'Day-end report ready', body: 'Yesterday’s consolidated Z-report is available.', read: true, type: 'system', link: '/reports' },
]

export const seedActivity = (): Activity[] => [
  { id: 'a1', at: Date.now() - 2 * 60000, user: 'Neha Gupta', text: 'Settled bill B4148 · ₹1,862 via UPI', module: 'settlement', outletId: 'o1', type: 'success' },
  { id: 'a2', at: Date.now() - 6 * 60000, user: 'Rohit Kumar', text: 'Placed order from Waiter App for table G1', module: 'pos', outletId: 'o1' },
  { id: 'a3', at: Date.now() - 14 * 60000, user: 'Vikram Singh', text: 'Marked KOT K304 as Ready', module: 'kot', outletId: 'o1' },
  { id: 'a4', at: Date.now() - 28 * 60000, user: 'Priya Sharma', text: 'Created stock transfer TRF-0416', module: 'transfer', outletId: 'o4' },
  { id: 'a5', at: Date.now() - 52 * 60000, user: 'Kavita Joshi', text: 'Requested resettlement for B4108', module: 'settlement', outletId: 'o2', type: 'warning' },
  { id: 'a6', at: Date.now() - 80 * 60000, user: 'Anjali Verma', text: 'Approved leave for Ritu Saxena', module: 'attendance', outletId: 'o2' },
  { id: 'a7', at: Date.now() - 2 * 36e5, user: 'Abhishek Singh', text: 'Updated permissions for role Cashier', module: 'users', type: 'info' },
  { id: 'a8', at: Date.now() - 3 * 36e5, user: 'Pooja Arora', text: 'Disabled item Kulfi Falooda (out of stock)', module: 'menu', outletId: 'o3', type: 'warning' },
]
