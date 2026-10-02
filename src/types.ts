export type ID = string

export type OutletStatus = 'Open' | 'Closed' | 'Maintenance'
export interface Outlet {
  id: ID; code: string; name: string; short: string; city: string; address: string
  phone: string; email: string; manager: string; hours: string; status: OutletStatus
  gstin: string; fssai: string; seats: number; factor: number; color: string; openedOn: string
}

export interface MenuCategory { id: ID; name: string; icon: string; color: string }
export interface Variant { name: string; price: number }
export interface Modifier { name: string; price: number }
export interface MenuItem {
  id: ID; code: string; short: string; name: string; categoryId: ID; price: number; veg: boolean
  emoji: string; gst: number; available: boolean; variants?: Variant[]; modifiers?: Modifier[]
  outlets: ID[]; bestseller?: boolean; spicy?: boolean; description?: string
  station: 'Kitchen' | 'Tandoor' | 'Chinese' | 'Bar' | 'Desserts'
}

export type TableStatus = 'Available' | 'Occupied' | 'Reserved' | 'Billing' | 'Cleaning'
export interface Table {
  id: ID; outletId: ID; label: string; floor: string; capacity: number; status: TableStatus
  waiterId?: ID; orderId?: ID; since?: number; reservedFor?: string; reservedAt?: string
  shape: 'round' | 'square' | 'rect'; qrEnabled: boolean
}

export type Department = 'Service' | 'Kitchen' | 'Billing' | 'Management' | 'Stores' | 'Housekeeping' | 'HR & Admin' | 'Accounts'
export interface SalaryConfig { basic: number; hra: number; allowance: number; incentive: number; otRate: number; pf: number; esi: number; advance: number; loan: number }
export interface Employee {
  id: ID; code: string; name: string; designation: string; department: Department; outletId: ID
  joinDate: string; status: 'Active' | 'On Leave' | 'Inactive'; phone: string; email: string
  shift: 'Morning' | 'Evening' | 'General' | 'Night'; gender: 'M' | 'F'; dob: string; address: string
  salary: SalaryConfig; color: string; bank: string; pan: string
}

export type Action = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'print'
export type ModuleKey =
  | 'dashboard' | 'pos' | 'kot' | 'settlement' | 'tables' | 'menu' | 'inventory' | 'purchase' | 'transfer' | 'recipes'
  | 'reports' | 'customers' | 'employees' | 'attendance' | 'payroll' | 'qr' | 'users' | 'outlets' | 'settings' | 'audit'
export interface Role {
  id: ID; name: string; description: string; scope: 'Organization' | 'Region' | 'Outlet'; color: string
  permissions: Partial<Record<ModuleKey, Action[]>>; system?: boolean
}
export interface User {
  id: ID; name: string; email: string; roleId: ID; outletIds: ID[]; status: 'Active' | 'Inactive'
  lastActive: string; employeeId?: ID; pin: string; phone: string; color: string
}

export type OrderType = 'Dine-in' | 'Takeaway' | 'Delivery'
export type OrderSource = 'POS' | 'Waiter App' | 'QR Order' | 'Swiggy' | 'Zomato' | 'Phone'
export type OrderStatus = 'Draft' | 'Hold' | 'Running' | 'Billed' | 'Settled' | 'Cancelled'
export type PayMode = 'Cash' | 'UPI' | 'Credit Card' | 'Debit Card' | 'Due' | 'Wallet'
export interface OrderItem {
  id: ID; itemId: ID; name: string; price: number; qty: number; veg: boolean; gst: number
  variant?: string; modifiers?: Modifier[]; note?: string; kotNo?: string; cancelled?: boolean
}
export interface Payment { mode: PayMode; amount: number; ref?: string; at: number }
export interface Resettlement { at: number; by: string; reason: string; approvedBy: string; from: Payment[]; to: Payment[] }
export interface Order {
  id: ID; no: string; billNo?: string; outletId: ID; type: OrderType; source: OrderSource; status: OrderStatus
  tableId?: ID; tableLabel?: string; waiterId?: ID; waiterName?: string
  customerId?: ID; customerName?: string; customerPhone?: string
  pax?: number; items: OrderItem[]; discount: { type: 'pct' | 'flat'; value: number; reason?: string }
  serviceCharge: number; deliveryCharge?: number; payments: Payment[]; createdAt: number; settledAt?: number
  cashier?: string; note?: string; resettlements?: Resettlement[]; cancelReason?: string
}
export interface Totals {
  subtotal: number; discount: number; taxable: number; cgst: number; sgst: number
  service: number; delivery: number; roundOff: number; total: number; qty: number
}

export type KotStatus = 'New' | 'Preparing' | 'Ready' | 'Served' | 'Cancelled'
export interface KotItem { name: string; qty: number; note?: string; variant?: string; modifiers?: string[]; veg: boolean; cancelled?: boolean }
export interface Kot {
  id: ID; no: string; orderId: ID; orderNo: string; outletId: ID; tableLabel: string; type: OrderType; source: OrderSource
  waiterName: string; createdAt: number; updatedAt: number; items: KotItem[]; status: KotStatus; station: string; priority?: boolean
}

export interface Material {
  id: ID; code: string; name: string; category: string; unit: string; min: number; cost: number
  stock: Record<ID, number>; expiry?: string; supplierId?: ID
}
export interface RecipeIngredient { materialId: ID; qty: number; unit: string; wastage: number }
export interface Recipe { id: ID; code: string; menuItemId: ID; yield: number; prepTime: number; ingredients: RecipeIngredient[]; method?: string }

export interface Supplier {
  id: ID; code: string; name: string; contact: string; phone: string; email: string; gstin: string
  category: string; city: string; rating: number; outstanding: number; terms: string
}
export type POStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Partially Received' | 'Received' | 'Returned' | 'Cancelled'
export interface PurchaseOrder {
  id: ID; no: string; supplierId: ID; outletId: ID; date: string; expected: string
  items: { materialId: ID; qty: number; rate: number; received?: number }[]
  status: POStatus; createdBy: string; note?: string; grnNo?: string
}
export type TransferStatus = 'Pending Approval' | 'Approved' | 'In Transit' | 'Received' | 'Rejected'
export interface StockTransfer {
  id: ID; no: string; from: ID; to: ID; date: string; items: { materialId: ID; qty: number }[]
  status: TransferStatus; createdBy: string; approvedBy?: string; note?: string; log: { at: number; text: string }[]
}
export interface StockMovement {
  id: ID; at: number; materialId: ID; outletId: ID
  type: 'Purchase' | 'Consumption' | 'Adjustment' | 'Transfer In' | 'Transfer Out' | 'Wastage' | 'Return'
  qty: number; ref: string; by: string
}

export type AttStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Leave' | 'Weekly Off'
export interface Attendance {
  id: ID; employeeId: ID; date: string; status: AttStatus; checkIn?: string; checkOut?: string
  method?: 'Mobile' | 'Network' | 'Manual' | 'Biometric'; remarks?: string; ot?: number
}
export interface PayrollRun { month: string; status: 'Not Started' | 'Draft' | 'Processed' | 'Approved' | 'Paid'; processedAt?: number; approvedBy?: string; paidOn?: string }

export interface Customer {
  id: ID; name: string; phone: string; email: string; visits: number; spend: number; lastVisit: string
  points: number; tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'; notes: string; birthday?: string; favOutlet: ID; tags: string[]
}
export interface Activity { id: ID; at: number; user: string; text: string; module: ModuleKey; outletId?: ID; type?: 'info' | 'success' | 'warning' | 'danger' }
export interface AppNotification { id: ID; at: number; title: string; body: string; read: boolean; type: 'order' | 'stock' | 'approval' | 'attendance' | 'system'; link?: string }
export interface Approval {
  id: ID; at: number; type: 'Discount' | 'Resettlement' | 'Stock Transfer' | 'Purchase Order' | 'Leave' | 'Attendance Correction' | 'Payroll'
  title: string; by: string; outletId: ID; amount?: number; status: 'Pending' | 'Approved' | 'Rejected'; ref?: string
}
