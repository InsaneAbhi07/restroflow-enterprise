/** Demo-mode simulations shared by the demo control panel, scenarios and pages */
import { useStore } from '@/store/useStore'
import { toast } from '@/store/toast'
import { computeTotals } from './billing'
import { uid, isoDate, monthLabel } from './format'
import { waitersFor } from '@/data/operations'
import type { OrderItem, OrderSource } from '@/types'

const S = () => useStore.getState()

function randomItems(outletId: string, n = 3): OrderItem[] {
  const menu = S().menu.filter((m) => m.available && m.outlets.includes(outletId))
  const out: OrderItem[] = []
  const used = new Set<string>()
  while (out.length < n && used.size < menu.length) {
    const m = menu[Math.floor(Math.random() * menu.length)]
    if (used.has(m.id)) continue
    used.add(m.id)
    const v = m.variants?.[m.variants.length - 1]
    out.push({ id: uid('oi'), itemId: m.id, name: m.name, price: v?.price ?? m.price, variant: v?.name, qty: 1 + Math.floor(Math.random() * 2), veg: m.veg, gst: m.gst })
  }
  return out
}

/** Places a dine-in order on a free table and generates its KOT */
export function simulateTableOrder(outletId: string, source: OrderSource = 'Waiter App') {
  const table = S().tables.find((t) => t.outletId === outletId && t.status === 'Available')
  if (!table) { toast.warning('No free tables', 'All tables at this outlet are busy'); return null }
  const w = waitersFor(outletId)[0]
  const order = S().createOrder({ outletId, type: 'Dine-in', source, items: randomItems(outletId, 3), tableId: table.id, tableLabel: table.label, waiterId: w?.id, waiterName: source === 'QR Order' ? 'QR Guest' : w?.name, pax: 2, status: 'Running' })
  S().sendKot(order.id)
  S().notify({ title: `New ${source} order · ${table.label}`, body: `${order.items.length} items received at ${S().outlets.find((o) => o.id === outletId)?.short}`, type: 'order', link: '/orders' })
  S().log(`${source} order ${order.no} placed for table ${table.label}`, 'pos', 'info', outletId)
  toast.success(`${source} order received`, `Table ${table.label} · KOT sent to kitchen`)
  return order
}

export function simulateSampleOrder(outletId: string) {
  const order = S().createOrder({ outletId, type: 'Takeaway', source: 'POS', items: randomItems(outletId, 2), status: 'Running', customerName: 'Walk-in' })
  S().sendKot(order.id)
  toast.success('Sample takeaway order created', order.no)
  return order
}

export function simulateSettlement(outletId: string) {
  const o = S().orders.find((x) => x.outletId === outletId && (x.status === 'Running' || x.status === 'Billed'))
  if (!o) { toast.info('No open orders to settle'); return }
  const total = computeTotals(o).total
  S().settleOrder(o.id, [{ mode: 'UPI', amount: total }])
  toast.success(`Bill settled · ₹${total.toLocaleString('en-IN')}`, 'Dashboard sales & inventory updated')
}

export function simulateCheckIn(outletId?: string) {
  const today = isoDate()
  const done = new Set(S().attendance.filter((a) => a.date === today).map((a) => a.employeeId))
  const e = S().employees.find((x) => !done.has(x.id) && x.status === 'Active' && (!outletId || x.outletId === outletId))
  if (!e) { toast.info('Everyone has already checked in'); return }
  S().checkIn(e.id, 'Network')
  toast.success(`${e.name} checked in`, 'Detected on GrandKitchen-Staff Wi-Fi (simulated)')
}

export function simulateTransfer() {
  const tr = S().createTransfer({ from: 'o1', to: 'o3', items: [{ materialId: 'rm1', qty: 5 }, { materialId: 'rm2', qty: 2 }], createdBy: 'Priya Sharma', note: 'Weekend demand – Mall Outlet' })
  S().setTransferStatus(tr.id, 'Approved')
  S().setTransferStatus(tr.id, 'In Transit')
  toast.success(`${tr.no} dispatched`, 'Paneer & Butter moving Main Branch → Mall Outlet')
}

export function simulatePayroll() {
  const month = isoDate().slice(0, 7)
  S().setPayrollRun(month, { status: 'Processed', processedAt: Date.now() })
  S().log(`Payroll processed for ${monthLabel(month)}`, 'payroll', 'success')
  toast.success('Payroll processed', monthLabel(month) + ' · awaiting accountant approval')
}
