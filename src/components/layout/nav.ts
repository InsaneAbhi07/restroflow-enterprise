import type { ModuleKey } from '@/types'

export interface NavItem { label: string; to: string; icon: string; module: ModuleKey; kbd?: string; badge?: 'kot' | 'approvals' }
export interface NavGroup { label: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/', icon: 'LayoutDashboard', module: 'dashboard' }],
  },
  {
    label: 'Sales & Billing',
    items: [
      { label: 'POS Billing', to: '/pos', icon: 'MonitorSmartphone', module: 'pos', kbd: 'Ctrl+B' },
      { label: 'Orders & Bills', to: '/orders', icon: 'ReceiptText', module: 'pos' },
      { label: 'Kitchen Display', to: '/kot', icon: 'ChefHat', module: 'kot', badge: 'kot' },
      { label: 'Tables', to: '/tables', icon: 'LayoutGrid', module: 'tables' },
      { label: 'Settlement', to: '/settlement', icon: 'Wallet', module: 'settlement' },
      { label: 'QR Ordering', to: '/qr', icon: 'QrCode', module: 'qr' },
      { label: 'Customers', to: '/customers', icon: 'Contact', module: 'customers' },
    ],
  },
  {
    label: 'Hotel',
    items: [
      { label: 'Front Desk', to: '/hotel', icon: 'ConciergeBell', module: 'hotel' },
      { label: 'Reservations', to: '/hotel/reservations', icon: 'CalendarRange', module: 'hotel' },
      { label: 'Rooms & Tariff', to: '/hotel/setup', icon: 'BedDouble', module: 'hotel' },
    ],
  },
  {
    label: 'Menu & Inventory',
    items: [
      { label: 'Menu', to: '/menu', icon: 'BookOpen', module: 'menu' },
      { label: 'Inventory', to: '/inventory', icon: 'Boxes', module: 'inventory' },
      { label: 'Purchases', to: '/inventory/purchases', icon: 'ShoppingCart', module: 'purchase' },
      { label: 'Suppliers', to: '/inventory/suppliers', icon: 'Truck', module: 'purchase' },
      { label: 'Stock Transfer', to: '/inventory/transfers', icon: 'ArrowLeftRight', module: 'transfer' },
      { label: 'Recipes / BOM', to: '/recipes', icon: 'FlaskConical', module: 'recipes' },
    ],
  },
  {
    label: 'People & HR',
    items: [
      { label: 'Employees', to: '/employees', icon: 'Users', module: 'employees' },
      { label: 'Attendance', to: '/attendance', icon: 'CalendarCheck', module: 'attendance' },
      { label: 'Payroll', to: '/payroll', icon: 'BadgeIndianRupee', module: 'payroll' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Reports', to: '/reports', icon: 'BarChart3', module: 'reports' },
      { label: 'Audit Logs', to: '/audit', icon: 'ScrollText', module: 'audit' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Outlets', to: '/outlets', icon: 'Store', module: 'outlets' },
      { label: 'Users', to: '/users', icon: 'UserCog', module: 'users' },
      { label: 'Roles & Permissions', to: '/users/roles', icon: 'ShieldCheck', module: 'users' },
      { label: 'Settings', to: '/settings', icon: 'Settings', module: 'settings' },
    ],
  },
]

export const ALL_NAV = NAV.flatMap((g) => g.items)

/** Map a pathname to the module guarding it (longest prefix wins) */
export function moduleForPath(path: string): ModuleKey | null {
  const hit = [...ALL_NAV].sort((a, b) => b.to.length - a.to.length).find((n) => (n.to === '/' ? path === '/' : path === n.to || path.startsWith(n.to + '/')))
  return hit?.module ?? null
}
