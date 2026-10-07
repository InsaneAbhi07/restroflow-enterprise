import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Action, Activity, Approval, AppNotification, Attendance, Customer, Employee, Kot, KotStatus, Material, MenuCategory, MenuItem,
  ModuleKey, Order, Outlet, Payment, PayrollRun, PurchaseOrder, Recipe, Role, StockMovement, StockTransfer, Supplier, Table, User,
} from '@/types'
import { OUTLETS } from '@/data/outlets'
import { CATEGORIES, MENU } from '@/data/menu'
import { EMPLOYEES, ROLES, USERS } from '@/data/people'
import { MATERIALS, PURCHASE_ORDERS, RECIPES, STOCK_TRANSFERS, SUPPLIERS, seedMovements } from '@/data/inventory'
import { CUSTOMERS, TABLES, seedActivity, seedApprovals, seedAttendance, seedKots, seedNotifications, seedOrders } from '@/data/operations'
import { computeTotals } from '@/lib/billing'
import { isoDate, uid } from '@/lib/format'

export interface Settings {
  serviceCharge: number
  gstMode: 'exclusive' | 'inclusive'
  roundOff: boolean
  billFooter: string
  billHeader: string
  printer: { paper: '80mm' | '58mm'; autoPrintKot: boolean; autoPrintBill: boolean; billCopies: number; kotCopies: number; showLogo: boolean; printerName: string }
  pos: { defaultOrderType: 'Dine-in' | 'Takeaway' | 'Delivery'; compactTiles: boolean; showImages: boolean; askCustomer: boolean; requireTable: boolean; quickPayModes: boolean }
  attendance: { graceMinutes: number; halfDayHours: number; networkSSID: string; allowMobile: boolean; allowNetwork: boolean; geoFence: boolean }
  payroll: { payDay: number; pfEnabled: boolean; esiEnabled: boolean; otMultiplier: number }
  qr: { enabled: boolean; requireApproval: boolean; allowPayAtTable: boolean; theme: string }
  notifications: Record<string, boolean>
}

const defaultSettings = (): Settings => ({
  serviceCharge: 5,
  gstMode: 'exclusive',
  roundOff: true,
  billHeader: 'Thank you for dining with us!',
  billFooter: 'Thank you! Visit again • Follow us @grandkitchen',
  printer: { paper: '80mm', autoPrintKot: true, autoPrintBill: false, billCopies: 1, kotCopies: 1, showLogo: true, printerName: 'EPSON TM-T82 (USB)' },
  pos: { defaultOrderType: 'Dine-in', compactTiles: false, showImages: true, askCustomer: false, requireTable: true, quickPayModes: true },
  attendance: { graceMinutes: 15, halfDayHours: 5, networkSSID: 'GrandKitchen-Staff', allowMobile: true, allowNetwork: true, geoFence: true },
  payroll: { payDay: 1, pfEnabled: true, esiEnabled: true, otMultiplier: 1.5 },
  qr: { enabled: true, requireApproval: false, allowPayAtTable: true, theme: 'navy' },
  notifications: { lowStock: true, newOrder: true, approvals: true, attendance: true, dayEnd: true, sms: false, email: true, whatsapp: true },
})

interface Data {
  currentUserId: string
  selectedOutlet: string // 'all' | outlet id
  sidebarCollapsed: boolean
  presentation: boolean
  mobileUserId: string | null
  loggedIn: boolean
  outlets: Outlet[]
  roles: Role[]
  users: User[]
  categories: MenuCategory[]
  menu: MenuItem[]
  tables: Table[]
  employees: Employee[]
  materials: Material[]
  recipes: Recipe[]
  suppliers: Supplier[]
  purchaseOrders: PurchaseOrder[]
  transfers: StockTransfer[]
  movements: StockMovement[]
  orders: Order[]
  kots: Kot[]
  attendance: Attendance[]
  payrollRuns: PayrollRun[]
  customers: Customer[]
  approvals: Approval[]
  notifications: AppNotification[]
  activity: Activity[]
  settings: Settings
  seq: { bill: number; order: number; kot: number; transfer: number; po: number }
}

interface Actions {
  setUser: (id: string) => void
  setOutlet: (id: string) => void
  toggleSidebar: () => void
  setPresentation: (v: boolean) => void
  setMobileUser: (id: string | null) => void
  login: (userId: string) => void
  logout: () => void
  log: (text: string, module: ModuleKey, type?: Activity['type'], outletId?: string) => void
  notify: (n: Omit<AppNotification, 'id' | 'at' | 'read'>) => void
  markNotificationsRead: () => void

  // orders & billing
  createOrder: (o: Partial<Order> & Pick<Order, 'outletId' | 'type' | 'source' | 'items'>) => Order
  updateOrder: (id: string, patch: Partial<Order>) => void
  sendKot: (orderId: string) => Kot | null
  billOrder: (orderId: string) => void
  settleOrder: (orderId: string, payments: Omit<Payment, 'at'>[]) => void
  cancelOrder: (orderId: string, reason: string) => void
  resettleOrder: (orderId: string, payments: Omit<Payment, 'at'>[], reason: string, approvedBy: string) => void
  updateKotStatus: (kotId: string, status: KotStatus) => void
  cancelKotItem: (kotId: string, index: number) => void

  // tables
  updateTable: (id: string, patch: Partial<Table>) => void
  transferTable: (fromId: string, toId: string) => void
  mergeTables: (targetId: string, sourceIds: string[]) => void

  // menu
  upsertMenuItem: (m: MenuItem) => void
  upsertCategory: (c: MenuCategory) => void

  // inventory
  adjustStock: (materialId: string, outletId: string, delta: number, type: StockMovement['type'], ref: string) => void
  upsertMaterial: (m: Material) => void
  upsertPO: (p: PurchaseOrder) => void
  receivePO: (id: string) => void
  createTransfer: (t: Omit<StockTransfer, 'id' | 'no' | 'log' | 'status' | 'date'>) => StockTransfer
  setTransferStatus: (id: string, status: StockTransfer['status']) => void
  upsertRecipe: (r: Recipe) => void
  upsertSupplier: (s: Supplier) => void

  // people
  upsertEmployee: (e: Employee) => void
  checkIn: (employeeId: string, method: Attendance['method']) => void
  checkOut: (employeeId: string) => void
  upsertAttendance: (a: Attendance) => void
  setPayrollRun: (month: string, patch: Partial<PayrollRun>) => void

  // admin
  upsertUser: (u: User) => void
  upsertRole: (r: Role) => void
  setRolePermissions: (roleId: string, perms: Partial<Record<ModuleKey, Action[]>>) => void
  upsertOutlet: (o: Outlet) => void
  upsertCustomer: (c: Customer) => void
  decideApproval: (id: string, status: 'Approved' | 'Rejected') => void
  updateSettings: (patch: Partial<Settings>) => void
  resetDemo: () => void
}

export type Store = Data & Actions

function seedData(): Data {
  const tables: Table[] = JSON.parse(JSON.stringify(TABLES))
  const orders = seedOrders()
  // seedOrders mutates the module-level TABLES with orderIds; copy them across
  TABLES.forEach((t, i) => (tables[i].orderId = t.orderId))
  const month = isoDate().slice(0, 7)
  const prev = isoDate(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15)).slice(0, 7)
  return {
    currentUserId: 'u1',
    selectedOutlet: 'all',
    sidebarCollapsed: false,
    presentation: false,
    mobileUserId: null,
    loggedIn: true,
    outlets: OUTLETS.map((o) => ({ ...o })),
    roles: JSON.parse(JSON.stringify(ROLES)),
    users: USERS.map((u) => ({ ...u })),
    categories: CATEGORIES.map((c) => ({ ...c })),
    menu: JSON.parse(JSON.stringify(MENU)),
    tables,
    employees: JSON.parse(JSON.stringify(EMPLOYEES)),
    materials: JSON.parse(JSON.stringify(MATERIALS)),
    recipes: JSON.parse(JSON.stringify(RECIPES)),
    suppliers: SUPPLIERS.map((s) => ({ ...s })),
    purchaseOrders: JSON.parse(JSON.stringify(PURCHASE_ORDERS)),
    transfers: JSON.parse(JSON.stringify(STOCK_TRANSFERS)),
    movements: seedMovements(),
    orders,
    kots: seedKots(orders),
    attendance: seedAttendance(),
    payrollRuns: [
      { month: prev, status: 'Paid', processedAt: Date.now() - 30 * 864e5, approvedBy: 'Karan Mehta', paidOn: prev + '-30' },
      { month, status: 'Not Started' },
    ],
    customers: CUSTOMERS.map((c) => ({ ...c })),
    approvals: seedApprovals(),
    notifications: seedNotifications(),
    activity: seedActivity(),
    settings: defaultSettings(),
    seq: { bill: 4200, order: 9000, kot: 400, transfer: 417, po: 1200 },
  }
}

/** KOT station = the shared station of its items, otherwise the main kitchen pass */
const kotStation = (menu: MenuItem[], itemIds: string[]) => {
  const st = new Set(itemIds.map((id) => menu.find((m) => m.id === id)?.station ?? 'Kitchen'))
  if (st.size !== 1) return 'Main Kitchen'
  const one = [...st][0]
  return one === 'Kitchen' ? 'Main Kitchen' : one
}

const userName = (s: Data) => s.users.find((u) => u.id === s.currentUserId)?.name ?? 'System'

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...seedData(),

      setUser: (id) => {
        const u = get().users.find((x) => x.id === id)
        if (!u) return
        const role = get().roles.find((r) => r.id === u.roleId)
        set({ currentUserId: id, selectedOutlet: role?.scope === 'Organization' && u.outletIds.length > 1 ? 'all' : u.outletIds[0] })
      },
      setOutlet: (id) => set({ selectedOutlet: id }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setPresentation: (v) => set({ presentation: v }),
      setMobileUser: (id) => set({ mobileUserId: id }),
      login: (userId) => {
        get().setUser(userId)
        set({ loggedIn: true })
        get().log('Signed in to RestroFlow web', 'users', 'info')
      },
      logout: () => {
        get().log('Signed out of RestroFlow web', 'users', 'info')
        set({ loggedIn: false, presentation: false })
      },
      log: (text, module, type = 'info', outletId) =>
        set((s) => ({ activity: [{ id: uid('act'), at: Date.now(), user: userName(s), text, module, type, outletId }, ...s.activity].slice(0, 80) })),
      notify: (n) => set((s) => ({ notifications: [{ ...n, id: uid('n'), at: Date.now(), read: false }, ...s.notifications].slice(0, 40) })),
      markNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

      // ---------------- Orders ----------------
      createOrder: (o) => {
        const s = get()
        // A table can only hold one running order: new items (e.g. a QR guest) are appended to it
        const existing = o.tableId ? s.orders.find((x) => x.id === s.tables.find((t) => t.id === o.tableId)?.orderId && (x.status === 'Running' || x.status === 'Draft' || x.status === 'Billed')) : undefined
        if (existing) {
          const merged = { ...existing, items: [...existing.items, ...o.items], status: existing.status === 'Draft' ? (o.status ?? 'Running') : existing.status }
          set((st) => ({ orders: st.orders.map((x) => (x.id === existing.id ? merged : x)) }))
          return merged
        }
        const order: Order = {
          id: uid('ord'), no: 'ORD-' + s.seq.order, status: 'Draft', discount: { type: 'pct', value: 0 },
          serviceCharge: o.type === 'Dine-in' ? s.settings.serviceCharge : 0, payments: [], createdAt: Date.now(), ...o,
        }
        set((st) => ({
          orders: [order, ...st.orders],
          seq: { ...st.seq, order: st.seq.order + 1 },
          tables: order.tableId ? st.tables.map((t) => (t.id === order.tableId ? { ...t, status: 'Occupied', orderId: order.id, since: t.since ?? Date.now(), waiterId: order.waiterId ?? t.waiterId } : t)) : st.tables,
        }))
        return order
      },
      updateOrder: (id, patch) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),

      sendKot: (orderId) => {
        const s = get()
        const o = s.orders.find((x) => x.id === orderId)
        if (!o) return null
        const pending = o.items.filter((i) => !i.kotNo && !i.cancelled)
        if (!pending.length) return null
        const no = 'K' + s.seq.kot
        const kot: Kot = {
          id: uid('kot'), no, orderId, orderNo: o.no, outletId: o.outletId, tableLabel: o.tableLabel ?? (o.type === 'Dine-in' ? '-' : o.type),
          type: o.type, source: o.source, waiterName: o.waiterName ?? userName(s), createdAt: Date.now(), updatedAt: Date.now(), status: 'New', station: kotStation(s.menu, pending.map((i) => i.itemId)),
          items: pending.map((i) => ({ name: i.name, qty: i.qty, note: i.note, variant: i.variant, modifiers: i.modifiers?.map((m) => m.name), veg: i.veg })),
        }
        set((st) => ({
          kots: [kot, ...st.kots],
          seq: { ...st.seq, kot: st.seq.kot + 1 },
          orders: st.orders.map((x) => (x.id === orderId ? { ...x, status: x.status === 'Billed' ? 'Billed' : 'Running', items: x.items.map((i) => (!i.kotNo && !i.cancelled ? { ...i, kotNo: no } : i)) } : x)),
        }))
        get().log(`KOT ${no} generated for ${o.tableLabel ? 'table ' + o.tableLabel : o.type} (${o.source})`, 'kot', 'info', o.outletId)
        return kot
      },

      billOrder: (orderId) => {
        const s = get()
        const o = s.orders.find((x) => x.id === orderId)
        if (!o) return
        const billNo = o.billNo ?? 'B' + s.seq.bill
        set((st) => ({
          orders: st.orders.map((x) => (x.id === orderId ? { ...x, billNo, status: 'Billed', cashier: x.cashier ?? userName(st) } : x)),
          seq: o.billNo ? st.seq : { ...st.seq, bill: st.seq.bill + 1 },
          tables: st.tables.map((t) => (t.id === o.tableId ? { ...t, status: 'Billing' } : t)),
        }))
      },

      settleOrder: (orderId, payments) => {
        const s = get()
        const o = s.orders.find((x) => x.id === orderId)
        if (!o) return
        const billNo = o.billNo ?? 'B' + s.seq.bill
        const total = computeTotals(o).total
        const now = Date.now()
        // recipe based inventory deduction
        const deltas: Record<string, number> = {}
        o.items.filter((i) => !i.cancelled).forEach((i) => {
          const r = s.recipes.find((rc) => rc.menuItemId === i.itemId)
          r?.ingredients.forEach((ing) => {
            deltas[ing.materialId] = (deltas[ing.materialId] ?? 0) + ing.qty * (1 + ing.wastage / 100) * i.qty
          })
        })
        const movs: StockMovement[] = Object.entries(deltas).map(([materialId, q]) => ({
          id: uid('mv'), at: now, materialId, outletId: o.outletId, type: 'Consumption', qty: -Math.round(q * 1000) / 1000, ref: billNo, by: 'System (Recipe)',
        }))
        set((st) => ({
          orders: st.orders.map((x) => (x.id === orderId ? { ...x, billNo, status: 'Settled', settledAt: now, cashier: x.cashier ?? userName(st), payments: payments.map((p) => ({ ...p, at: now })) } : x)),
          seq: o.billNo ? st.seq : { ...st.seq, bill: st.seq.bill + 1 },
          tables: st.tables.map((t) => (t.id === o.tableId ? { ...t, status: 'Cleaning', orderId: undefined, since: undefined } : t)),
          kots: st.kots.map((k) => (k.orderId === orderId && k.status !== 'Cancelled' ? { ...k, status: 'Served', updatedAt: now } : k)),
          materials: st.materials.map((m) => (deltas[m.id] ? { ...m, stock: { ...m.stock, [o.outletId]: Math.max(0, Math.round((m.stock[o.outletId] - deltas[m.id]) * 1000) / 1000) } } : m)),
          movements: [...movs, ...st.movements].slice(0, 300),
          customers: o.customerId ? st.customers.map((c) => (c.id === o.customerId ? { ...c, visits: c.visits + 1, spend: c.spend + total, points: c.points + Math.round(total / 100), lastVisit: isoDate() } : c)) : st.customers,
        }))
        get().log(`Settled bill ${billNo} · ₹${total.toLocaleString('en-IN')} via ${payments.map((p) => p.mode).join(' + ')}`, 'settlement', 'success', o.outletId)
      },

      cancelOrder: (orderId, reason) => {
        const o = get().orders.find((x) => x.id === orderId)
        set((st) => ({
          orders: st.orders.map((x) => (x.id === orderId ? { ...x, status: 'Cancelled', cancelReason: reason } : x)),
          tables: st.tables.map((t) => (t.id === o?.tableId ? { ...t, status: 'Available', orderId: undefined, since: undefined, waiterId: undefined } : t)),
          kots: st.kots.map((k) => (k.orderId === orderId && k.status !== 'Served' ? { ...k, status: 'Cancelled', updatedAt: Date.now() } : k)),
        }))
        get().log(`Cancelled order ${o?.no} — ${reason}`, 'pos', 'danger', o?.outletId)
      },

      resettleOrder: (orderId, payments, reason, approvedBy) => {
        const s = get()
        const o = s.orders.find((x) => x.id === orderId)
        if (!o) return
        const now = Date.now()
        const newPays = payments.map((p) => ({ ...p, at: now }))
        set((st) => ({
          orders: st.orders.map((x) => (x.id === orderId ? { ...x, payments: newPays, resettlements: [...(x.resettlements ?? []), { at: now, by: userName(st), reason, approvedBy, from: x.payments, to: newPays }] } : x)),
        }))
        get().log(`Resettled bill ${o.billNo}: ${o.payments.map((p) => p.mode).join('+')} → ${payments.map((p) => p.mode).join('+')} (approved by ${approvedBy})`, 'settlement', 'warning', o.outletId)
      },

      updateKotStatus: (kotId, status) => {
        set((s) => ({ kots: s.kots.map((k) => (k.id === kotId ? { ...k, status, updatedAt: Date.now() } : k)) }))
        const k = get().kots.find((x) => x.id === kotId)
        if (k && status === 'Ready') get().notify({ title: `KOT ${k.no} ready`, body: `Table ${k.tableLabel} · pick up from kitchen`, type: 'order', link: '/kot' })
      },
      cancelKotItem: (kotId, index) =>
        set((s) => ({ kots: s.kots.map((k) => (k.id === kotId ? { ...k, updatedAt: Date.now(), items: k.items.map((it, i) => (i === index ? { ...it, cancelled: true } : it)) } : k)) })),

      // ---------------- Tables ----------------
      updateTable: (id, patch) => set((s) => ({ tables: s.tables.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      transferTable: (fromId, toId) => {
        const s = get()
        const from = s.tables.find((t) => t.id === fromId)
        const to = s.tables.find((t) => t.id === toId)
        if (!from || !to) return
        set((st) => ({
          tables: st.tables.map((t) =>
            t.id === toId ? { ...t, status: from.status, orderId: from.orderId, since: from.since, waiterId: from.waiterId }
              : t.id === fromId ? { ...t, status: 'Cleaning', orderId: undefined, since: undefined, waiterId: undefined } : t),
          orders: st.orders.map((o) => (o.id === from.orderId ? { ...o, tableId: toId, tableLabel: to.label } : o)),
          kots: st.kots.map((k) => (k.orderId === from.orderId ? { ...k, tableLabel: to.label } : k)),
        }))
        get().log(`Transferred table ${from.label} → ${to.label}`, 'tables', 'info', from.outletId)
      },
      mergeTables: (targetId, sourceIds) => {
        const s = get()
        const target = s.tables.find((t) => t.id === targetId)
        if (!target) return
        const srcTables = s.tables.filter((t) => sourceIds.includes(t.id))
        const srcOrders = s.orders.filter((o) => srcTables.some((t) => t.orderId === o.id))
        let targetOrderId = target.orderId
        const movedItems = srcOrders.flatMap((o) => o.items)
        set((st) => {
          let orders = st.orders
          if (targetOrderId) orders = orders.map((o) => (o.id === targetOrderId ? { ...o, items: [...o.items, ...movedItems], tableLabel: [target.label, ...srcTables.map((t) => t.label)].join('+') } : o))
          else if (srcOrders[0]) {
            targetOrderId = srcOrders[0].id
            orders = orders.map((o) => (o.id === targetOrderId ? { ...o, tableId: targetId, items: movedItems, tableLabel: [target.label, ...srcTables.map((t) => t.label)].join('+') } : o))
          }
          orders = orders.filter((o) => !(srcOrders.some((so) => so.id === o.id) && o.id !== targetOrderId))
          return {
            orders,
            tables: st.tables.map((t) =>
              t.id === targetId ? { ...t, status: 'Occupied', orderId: targetOrderId, since: t.since ?? Date.now() }
                : sourceIds.includes(t.id) ? { ...t, status: 'Available', orderId: undefined, since: undefined, waiterId: undefined } : t),
          }
        })
        get().log(`Merged tables ${srcTables.map((t) => t.label).join(', ')} into ${target.label}`, 'tables', 'info', target.outletId)
      },

      // ---------------- Menu ----------------
      upsertMenuItem: (m) => set((s) => ({ menu: s.menu.some((x) => x.id === m.id) ? s.menu.map((x) => (x.id === m.id ? m : x)) : [...s.menu, m] })),
      upsertCategory: (c) => set((s) => ({ categories: s.categories.some((x) => x.id === c.id) ? s.categories.map((x) => (x.id === c.id ? c : x)) : [...s.categories, c] })),

      // ---------------- Inventory ----------------
      adjustStock: (materialId, outletId, delta, type, ref) =>
        set((s) => ({
          materials: s.materials.map((m) => (m.id === materialId ? { ...m, stock: { ...m.stock, [outletId]: Math.max(0, Math.round(((m.stock[outletId] ?? 0) + delta) * 1000) / 1000) } } : m)),
          movements: [{ id: uid('mv'), at: Date.now(), materialId, outletId, type, qty: delta, ref, by: userName(s) }, ...s.movements].slice(0, 300),
        })),
      upsertMaterial: (m) => set((s) => ({ materials: s.materials.some((x) => x.id === m.id) ? s.materials.map((x) => (x.id === m.id ? m : x)) : [...s.materials, m] })),
      upsertPO: (p) => set((s) => ({ purchaseOrders: s.purchaseOrders.some((x) => x.id === p.id) ? s.purchaseOrders.map((x) => (x.id === p.id ? p : x)) : [p, ...s.purchaseOrders], seq: s.purchaseOrders.some((x) => x.id === p.id) ? s.seq : { ...s.seq, po: s.seq.po + 1 } })),
      receivePO: (id) => {
        const po = get().purchaseOrders.find((p) => p.id === id)
        if (!po) return
        const grn = 'GRN/' + Math.floor(900 + Math.random() * 99)
        po.items.forEach((it) => get().adjustStock(it.materialId, po.outletId, it.qty - (it.received ?? 0), 'Purchase', grn))
        set((s) => ({ purchaseOrders: s.purchaseOrders.map((p) => (p.id === id ? { ...p, status: 'Received', grnNo: grn, items: p.items.map((i) => ({ ...i, received: i.qty })) } : p)) }))
        get().log(`Goods received against ${po.no} (${grn})`, 'purchase', 'success', po.outletId)
      },
      createTransfer: (t) => {
        const s = get()
        const tr: StockTransfer = { ...t, id: uid('st'), no: 'TRF-0' + s.seq.transfer, status: 'Pending Approval', date: isoDate(), log: [{ at: Date.now(), text: `Created by ${userName(s)}` }] }
        set((st) => ({ transfers: [tr, ...st.transfers], seq: { ...st.seq, transfer: st.seq.transfer + 1 } }))
        get().log(`Created stock transfer ${tr.no}`, 'transfer', 'info', t.from)
        return tr
      },
      setTransferStatus: (id, status) => {
        const t = get().transfers.find((x) => x.id === id)
        if (!t) return
        if (status === 'In Transit') t.items.forEach((i) => get().adjustStock(i.materialId, t.from, -i.qty, 'Transfer Out', t.no))
        if (status === 'Received') {
          if (t.status !== 'In Transit') t.items.forEach((i) => get().adjustStock(i.materialId, t.from, -i.qty, 'Transfer Out', t.no))
          t.items.forEach((i) => get().adjustStock(i.materialId, t.to, i.qty, 'Transfer In', t.no))
        }
        set((s) => ({
          transfers: s.transfers.map((x) => (x.id === id ? { ...x, status, approvedBy: status === 'Approved' ? userName(s) : x.approvedBy, log: [...x.log, { at: Date.now(), text: `${status} by ${userName(s)}` }] } : x)),
          approvals: s.approvals.map((a) => (a.ref === id && status === 'Approved' ? { ...a, status: 'Approved' } : a)),
        }))
        get().log(`Transfer ${t.no} marked ${status}`, 'transfer', status === 'Rejected' ? 'danger' : 'success', t.from)
      },
      upsertRecipe: (r) => set((s) => ({ recipes: s.recipes.some((x) => x.id === r.id) ? s.recipes.map((x) => (x.id === r.id ? r : x)) : [...s.recipes, r] })),
      upsertSupplier: (sp) => set((s) => ({ suppliers: s.suppliers.some((x) => x.id === sp.id) ? s.suppliers.map((x) => (x.id === sp.id ? sp : x)) : [...s.suppliers, sp] })),

      // ---------------- People ----------------
      upsertEmployee: (e) => set((s) => ({ employees: s.employees.some((x) => x.id === e.id) ? s.employees.map((x) => (x.id === e.id ? e : x)) : [...s.employees, e] })),
      checkIn: (employeeId, method) => {
        const now = new Date()
        const date = isoDate(now)
        const hm = now.toTimeString().slice(0, 5)
        const emp = get().employees.find((e) => e.id === employeeId)
        const shiftStart = emp?.shift === 'Morning' ? 8 : emp?.shift === 'Evening' ? 14 : emp?.shift === 'Night' ? 20 : 10
        const late = now.getHours() * 60 + now.getMinutes() > shiftStart * 60 + get().settings.attendance.graceMinutes && now.getHours() < shiftStart + 6
        const rec: Attendance = { id: `att_${employeeId}_${date}`, employeeId, date, status: late ? 'Late' : 'Present', checkIn: hm, method }
        set((s) => ({ attendance: [...s.attendance.filter((a) => a.id !== rec.id), rec] }))
        get().log(`${emp?.name} checked in via ${method}`, 'attendance', 'success', emp?.outletId)
      },
      checkOut: (employeeId) => {
        const date = isoDate()
        const hm = new Date().toTimeString().slice(0, 5)
        set((s) => ({ attendance: s.attendance.map((a) => (a.employeeId === employeeId && a.date === date ? { ...a, checkOut: hm } : a)) }))
        const emp = get().employees.find((e) => e.id === employeeId)
        get().log(`${emp?.name} checked out`, 'attendance', 'info', emp?.outletId)
      },
      upsertAttendance: (a) => set((s) => ({ attendance: [...s.attendance.filter((x) => x.id !== a.id), a] })),
      setPayrollRun: (month, patch) =>
        set((s) => ({ payrollRuns: s.payrollRuns.some((r) => r.month === month) ? s.payrollRuns.map((r) => (r.month === month ? { ...r, ...patch } : r)) : [...s.payrollRuns, { month, status: 'Not Started', ...patch }] })),

      // ---------------- Admin ----------------
      upsertUser: (u) => set((s) => ({ users: s.users.some((x) => x.id === u.id) ? s.users.map((x) => (x.id === u.id ? u : x)) : [...s.users, u] })),
      upsertRole: (r) => set((s) => ({ roles: s.roles.some((x) => x.id === r.id) ? s.roles.map((x) => (x.id === r.id ? r : x)) : [...s.roles, r] })),
      setRolePermissions: (roleId, perms) => {
        set((s) => ({ roles: s.roles.map((r) => (r.id === roleId ? { ...r, permissions: perms } : r)) }))
        get().log(`Updated permissions for role ${get().roles.find((r) => r.id === roleId)?.name}`, 'users', 'info')
      },
      upsertOutlet: (o) =>
        set((s) => {
          if (s.outlets.some((x) => x.id === o.id)) return { outlets: s.outlets.map((x) => (x.id === o.id ? o : x)) }
          // new outlet becomes selectable for organization-wide users (owner, HR, accounts, …)
          const orgRoles = new Set(s.roles.filter((r) => r.scope === 'Organization').map((r) => r.id))
          return { outlets: [...s.outlets, o], users: s.users.map((u) => (orgRoles.has(u.roleId) ? { ...u, outletIds: [...u.outletIds, o.id] } : u)) }
        }),
      upsertCustomer: (c) => set((s) => ({ customers: s.customers.some((x) => x.id === c.id) ? s.customers.map((x) => (x.id === c.id ? c : x)) : [c, ...s.customers] })),
      decideApproval: (id, status) => {
        set((s) => ({ approvals: s.approvals.map((a) => (a.id === id ? { ...a, status } : a)) }))
        const a = get().approvals.find((x) => x.id === id)
        if (a?.type === 'Stock Transfer' && a.ref && status === 'Approved') get().setTransferStatus(a.ref, 'Approved')
        get().log(`${status} ${a?.type.toLowerCase()} request: ${a?.title}`, 'dashboard', status === 'Approved' ? 'success' : 'danger', a?.outletId)
      },
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetDemo: () => {
        const keep = { currentUserId: get().currentUserId }
        set({ ...seedData(), ...keep })
      },
    }),
    {
      name: 'restroflow-demo-v1',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      // v2 adds the Hotel module: grant its permissions to existing roles and add the Front Desk role / user
      migrate: (persisted, version) => {
        const st = persisted as Data
        if (version < 2 && st?.roles) {
          st.roles = st.roles.map((r) => {
            const seedRole = ROLES.find((x) => x.id === r.id)
            return seedRole?.permissions.hotel && !r.permissions.hotel ? { ...r, permissions: { ...r.permissions, hotel: [...seedRole.permissions.hotel] } } : r
          })
          ROLES.filter((r) => !st.roles.some((x) => x.id === r.id)).forEach((r) => st.roles.push(JSON.parse(JSON.stringify(r))))
          USERS.filter((u) => !st.users.some((x) => x.id === u.id)).forEach((u) => st.users.push({ ...u }))
        }
        return st as Store
      },
    },
  ),
)

// Keep multiple browser tabs (e.g. POS on one screen, waiter app on another) in sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'restroflow-demo-v1') useStore.persist.rehydrate()
  })
}
