import type { Action, Employee, ModuleKey, Role, User } from '@/types'

const PALETTE = ['#1d3f70', '#14a891', '#7c3aed', '#ea580c', '#db2777', '#0891b2', '#65a30d', '#b45309', '#4f46e5', '#dc2626']

type ERow = [name: string, designation: string, dept: Employee['department'], outlet: string, basic: number, shift: Employee['shift'], g: 'M' | 'F', join: string]
const EROWS: ERow[] = [
  ['Abhishek Singh', 'Managing Director', 'Management', 'o1', 150000, 'General', 'M', '2019-04-01'],
  ['Rahul Sharma', 'Regional Manager', 'Management', 'o1', 85000, 'General', 'M', '2019-06-15'],
  ['Amit Verma', 'Outlet Manager', 'Management', 'o1', 55000, 'General', 'M', '2019-08-20'],
  ['Neha Gupta', 'Senior Cashier', 'Billing', 'o1', 24000, 'Morning', 'F', '2021-01-10'],
  ['Rohit Kumar', 'Captain / Waiter', 'Service', 'o1', 18000, 'Evening', 'M', '2022-03-05'],
  ['Vikram Singh', 'Head Chef', 'Kitchen', 'o1', 62000, 'Morning', 'M', '2019-05-02'],
  ['Priya Sharma', 'Inventory Manager', 'Stores', 'o1', 38000, 'General', 'F', '2020-09-14'],
  ['Anjali Verma', 'HR Manager', 'HR & Admin', 'o1', 45000, 'General', 'F', '2020-02-03'],
  ['Karan Mehta', 'Accountant', 'Accounts', 'o1', 40000, 'General', 'M', '2021-07-19'],
  ['Suresh Yadav', 'Steward', 'Service', 'o1', 16000, 'Morning', 'M', '2023-04-11'],
  ['Deepak Rawat', 'Tandoor Chef', 'Kitchen', 'o1', 28000, 'Evening', 'M', '2022-06-01'],
  ['Sanjay Malhotra', 'Outlet Manager', 'Management', 'o2', 52000, 'General', 'M', '2020-10-20'],
  ['Kavita Joshi', 'Cashier', 'Billing', 'o2', 21000, 'Evening', 'F', '2022-01-17'],
  ['Arjun Nair', 'Waiter', 'Service', 'o2', 17000, 'Morning', 'M', '2023-02-08'],
  ['Mohammed Irfan', 'Sous Chef', 'Kitchen', 'o2', 36000, 'Morning', 'M', '2021-03-22'],
  ['Ritu Saxena', 'Waiter', 'Service', 'o2', 16500, 'Evening', 'F', '2024-05-13'],
  ['Pooja Arora', 'Outlet Manager', 'Management', 'o3', 50000, 'General', 'F', '2022-02-01'],
  ['Manish Tiwari', 'Cashier', 'Billing', 'o3', 20000, 'Morning', 'M', '2022-08-29'],
  ['Sneha Kapoor', 'Waiter', 'Service', 'o3', 16000, 'Evening', 'F', '2023-11-06'],
  ['Ramesh Pal', 'Chinese Chef', 'Kitchen', 'o3', 30000, 'Evening', 'M', '2022-03-15'],
  ['Gurpreet Singh', 'Outlet Manager', 'Management', 'o4', 52000, 'General', 'M', '2023-06-20'],
  ['Harpreet Kaur', 'Cashier', 'Billing', 'o4', 20500, 'Night', 'F', '2023-07-09'],
  ['Ajay Chauhan', 'Waiter', 'Service', 'o4', 16000, 'Night', 'M', '2023-07-09'],
  ['Balwinder Singh', 'Head Cook', 'Kitchen', 'o4', 34000, 'Morning', 'M', '2023-07-09'],
  ['Lakshmi Devi', 'Housekeeping Lead', 'Housekeeping', 'o4', 15000, 'Morning', 'F', '2024-01-15'],
]

export const EMPLOYEES: Employee[] = EROWS.map(([name, designation, department, outletId, basic, shift, gender, joinDate], i) => {
  const first = name.split(' ')[0].toLowerCase()
  return {
    id: 'e' + (i + 1),
    code: 'GK' + String(1001 + i),
    name, designation, department, outletId, joinDate, shift, gender,
    status: i === 15 ? 'On Leave' : 'Active',
    phone: '+91 9' + String(810000000 + i * 7919 * 13).slice(0, 9),
    email: `${first}.${name.split(' ')[1].toLowerCase()}@grandkitchen.in`,
    dob: `19${88 + (i % 11)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i * 3) % 27 + 1).padStart(2, '0')}`,
    address: ['Sector 18, Noida', 'Laxmi Nagar, Delhi', 'DLF Phase 3, Gurugram', 'Model Town, Sonipat', 'Indirapuram, Ghaziabad'][i % 5],
    color: PALETTE[i % PALETTE.length],
    bank: ['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Bank'][i % 5] + ' ••' + String(4000 + i * 37).slice(-4),
    pan: 'ABCPK' + String(1000 + i * 17).slice(-4) + 'F',
    salary: {
      basic,
      hra: Math.round(basic * 0.4),
      allowance: Math.round(basic * 0.12),
      incentive: department === 'Service' || department === 'Billing' ? 1500 : 0,
      otRate: Math.round(basic / 26 / 8 * 1.5),
      pf: Math.round(Math.min(basic, 15000) * 0.12),
      esi: basic <= 21000 ? Math.round(basic * 0.0075) : 0,
      advance: [4, 9, 13, 22].includes(i) ? 2000 : 0,
      loan: [5, 14].includes(i) ? 3000 : 0,
    },
  }
})
export const employeeById = (id?: string) => EMPLOYEES.find((e) => e.id === id)

// ---------- Roles & permissions ----------
export const MODULES: { key: ModuleKey; label: string; group: string }[] = [
  { key: 'dashboard', label: 'Dashboard', group: 'General' },
  { key: 'pos', label: 'POS Billing', group: 'Sales & Billing' },
  { key: 'kot', label: 'KOT / Kitchen Display', group: 'Sales & Billing' },
  { key: 'settlement', label: 'Settlement & Resettlement', group: 'Sales & Billing' },
  { key: 'tables', label: 'Table Management', group: 'Sales & Billing' },
  { key: 'qr', label: 'QR Ordering', group: 'Sales & Billing' },
  { key: 'customers', label: 'Customers / CRM', group: 'Sales & Billing' },
  { key: 'menu', label: 'Menu Management', group: 'Menu & Inventory' },
  { key: 'inventory', label: 'Inventory & Stock', group: 'Menu & Inventory' },
  { key: 'purchase', label: 'Purchase & Suppliers', group: 'Menu & Inventory' },
  { key: 'transfer', label: 'Stock Transfer', group: 'Menu & Inventory' },
  { key: 'recipes', label: 'Recipe / BOM', group: 'Menu & Inventory' },
  { key: 'employees', label: 'Employees', group: 'People & HR' },
  { key: 'attendance', label: 'Attendance', group: 'People & HR' },
  { key: 'payroll', label: 'Payroll', group: 'People & HR' },
  { key: 'reports', label: 'Reports & Analytics', group: 'Insights' },
  { key: 'hotel', label: 'Hotel / Front Office', group: 'Hotel' },
  { key: 'audit', label: 'Audit Logs', group: 'Insights' },
  { key: 'users', label: 'User Management', group: 'Administration' },
  { key: 'outlets', label: 'Outlet Management', group: 'Administration' },
  { key: 'settings', label: 'Settings', group: 'Administration' },
]
export const ACTIONS: Action[] = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'print']

const FULL: Action[] = [...ACTIONS]
const VIEW: Action[] = ['view']
const VE: Action[] = ['view', 'export', 'print']
const VCE: Action[] = ['view', 'create', 'edit', 'print']
const all = (a: Action[]) => Object.fromEntries(MODULES.map((m) => [m.key, a])) as Record<ModuleKey, Action[]>

export const ROLES: Role[] = [
  { id: 'r_owner', name: 'Organization Owner', description: 'Full access to every outlet, module and setting.', scope: 'Organization', color: '#0f2a4a', system: true, permissions: all(FULL) },
  {
    id: 'r_regional', name: 'Regional Manager', description: 'Oversees a group of outlets. Approves transfers, purchases and resettlements.', scope: 'Region', color: '#264f8a', system: true,
    permissions: { ...all(['view', 'create', 'edit', 'approve', 'export', 'print']), users: VIEW, settings: VIEW, outlets: ['view', 'edit'], audit: VE },
  },
  {
    id: 'r_outlet', name: 'Outlet Manager', description: 'Runs a single outlet: sales, staff, stock and approvals.', scope: 'Outlet', color: '#14a891', system: true,
    permissions: {
      dashboard: VIEW, pos: FULL, kot: FULL, settlement: FULL, tables: FULL, qr: ['view', 'edit'], customers: FULL, menu: ['view', 'edit'],
      inventory: ['view', 'create', 'edit', 'approve', 'export', 'print'], purchase: ['view', 'create', 'edit', 'approve', 'print'], transfer: ['view', 'create', 'approve', 'print'],
      recipes: VIEW, employees: ['view', 'edit'], attendance: ['view', 'create', 'edit', 'approve', 'export'], payroll: VIEW, reports: VE, audit: VIEW, hotel: FULL,
    },
  },
  {
    id: 'r_cashier', name: 'Cashier', description: 'Billing counter: create bills, generate KOTs and settle payments.', scope: 'Outlet', color: '#7c3aed', system: true,
    permissions: { dashboard: VIEW, pos: ['view', 'create', 'edit', 'print'], kot: ['view', 'create', 'print'], settlement: ['view', 'create', 'print'], tables: ['view', 'edit'], customers: ['view', 'create'], menu: VIEW, reports: VIEW, hotel: VIEW },
  },
  {
    id: 'r_waiter', name: 'Waiter', description: 'Takes orders on the staff app and manages assigned tables.', scope: 'Outlet', color: '#ea580c', system: true,
    permissions: { dashboard: VIEW, pos: ['view', 'create'], kot: ['view', 'create'], tables: ['view', 'edit'], menu: VIEW, attendance: VIEW },
  },
  {
    id: 'r_kitchen', name: 'Kitchen Manager', description: 'Kitchen display, recipes and ingredient requests.', scope: 'Outlet', color: '#dc2626', system: true,
    permissions: { dashboard: VIEW, kot: ['view', 'edit', 'print'], menu: ['view', 'edit'], recipes: VCE, inventory: VIEW, transfer: ['view', 'create'] },
  },
  {
    id: 'r_inventory', name: 'Inventory Manager', description: 'Stock, purchases, suppliers, transfers and recipes.', scope: 'Region', color: '#0891b2', system: true,
    permissions: { dashboard: VIEW, inventory: FULL, purchase: FULL, transfer: FULL, recipes: FULL, menu: VIEW, reports: VE },
  },
  {
    id: 'r_hr', name: 'HR Manager', description: 'Employees, attendance, shifts and payroll processing.', scope: 'Organization', color: '#db2777', system: true,
    permissions: { dashboard: VIEW, employees: FULL, attendance: FULL, payroll: ['view', 'create', 'edit', 'export', 'print'], reports: VE },
  },
  {
    id: 'r_accounts', name: 'Accountant', description: 'Read access to sales and purchases, payroll approval and financial reports.', scope: 'Organization', color: '#65a30d', system: true,
    permissions: { dashboard: VIEW, settlement: VE, purchase: VE, inventory: VE, payroll: ['view', 'approve', 'export', 'print'], reports: VE, customers: VIEW, audit: VE, hotel: VE },
  },
  {
    id: 'r_custom', name: 'Shift Supervisor', description: 'Custom role — POS, tables and attendance for a shift lead.', scope: 'Outlet', color: '#4f46e5',
    permissions: { dashboard: VIEW, pos: VCE, kot: VCE, tables: FULL, attendance: ['view', 'create'], reports: VIEW },
  },
  {
    id: 'r_frontdesk', name: 'Front Desk Agent', description: 'Hotel front office: reservations, check-in / check-out, guest folios and room status.', scope: 'Outlet', color: '#0e7490', system: true,
    permissions: { dashboard: VIEW, hotel: ['view', 'create', 'edit', 'print'], customers: ['view', 'create'], pos: VIEW, attendance: VIEW },
  },
]

export const USERS: User[] = [
  { id: 'u1', name: 'Abhishek Singh', email: 'abhishek@grandkitchen.in', roleId: 'r_owner', outletIds: ['o1', 'o2', 'o3', 'o4'], status: 'Active', lastActive: 'Online', employeeId: 'e1', pin: '1111', phone: '+91 98100 11111', color: '#0f2a4a' },
  { id: 'u2', name: 'Rahul Sharma', email: 'rahul@grandkitchen.in', roleId: 'r_regional', outletIds: ['o1', 'o2', 'o3'], status: 'Active', lastActive: '12 min ago', employeeId: 'e2', pin: '2222', phone: '+91 98100 22222', color: '#264f8a' },
  { id: 'u3', name: 'Amit Verma', email: 'amit@grandkitchen.in', roleId: 'r_outlet', outletIds: ['o1'], status: 'Active', lastActive: '3 min ago', employeeId: 'e3', pin: '3333', phone: '+91 98100 33333', color: '#14a891' },
  { id: 'u4', name: 'Neha Gupta', email: 'neha@grandkitchen.in', roleId: 'r_cashier', outletIds: ['o1'], status: 'Active', lastActive: 'Online', employeeId: 'e4', pin: '4444', phone: '+91 98100 44444', color: '#7c3aed' },
  { id: 'u5', name: 'Rohit Kumar', email: 'rohit@grandkitchen.in', roleId: 'r_waiter', outletIds: ['o1'], status: 'Active', lastActive: 'Online', employeeId: 'e5', pin: '5555', phone: '+91 98100 55555', color: '#ea580c' },
  { id: 'u6', name: 'Vikram Singh', email: 'vikram@grandkitchen.in', roleId: 'r_kitchen', outletIds: ['o1'], status: 'Active', lastActive: '1 min ago', employeeId: 'e6', pin: '6666', phone: '+91 98100 66666', color: '#dc2626' },
  { id: 'u7', name: 'Priya Sharma', email: 'priya@grandkitchen.in', roleId: 'r_inventory', outletIds: ['o1', 'o2', 'o3', 'o4'], status: 'Active', lastActive: '25 min ago', employeeId: 'e7', pin: '7777', phone: '+91 98100 77777', color: '#0891b2' },
  { id: 'u8', name: 'Anjali Verma', email: 'anjali@grandkitchen.in', roleId: 'r_hr', outletIds: ['o1', 'o2', 'o3', 'o4'], status: 'Active', lastActive: '1 hr ago', employeeId: 'e8', pin: '8888', phone: '+91 98100 88888', color: '#db2777' },
  { id: 'u9', name: 'Karan Mehta', email: 'karan@grandkitchen.in', roleId: 'r_accounts', outletIds: ['o1', 'o2', 'o3', 'o4'], status: 'Active', lastActive: 'Yesterday', employeeId: 'e9', pin: '9999', phone: '+91 98100 99999', color: '#65a30d' },
  { id: 'u10', name: 'Sanjay Malhotra', email: 'sanjay@grandkitchen.in', roleId: 'r_outlet', outletIds: ['o2'], status: 'Active', lastActive: '40 min ago', employeeId: 'e12', pin: '1212', phone: '+91 98100 12121', color: '#14a891' },
  { id: 'u11', name: 'Kavita Joshi', email: 'kavita@grandkitchen.in', roleId: 'r_cashier', outletIds: ['o2'], status: 'Active', lastActive: '2 hr ago', employeeId: 'e13', pin: '1313', phone: '+91 98100 13131', color: '#7c3aed' },
  { id: 'u12', name: 'Pooja Arora', email: 'pooja@grandkitchen.in', roleId: 'r_outlet', outletIds: ['o3'], status: 'Active', lastActive: '5 min ago', employeeId: 'e17', pin: '1717', phone: '+91 98100 17171', color: '#14a891' },
  { id: 'u13', name: 'Gurpreet Singh', email: 'gurpreet@grandkitchen.in', roleId: 'r_outlet', outletIds: ['o4'], status: 'Active', lastActive: '18 min ago', employeeId: 'e21', pin: '2121', phone: '+91 98100 21212', color: '#14a891' },
  { id: 'u14', name: 'Arjun Nair', email: 'arjun@grandkitchen.in', roleId: 'r_waiter', outletIds: ['o2'], status: 'Active', lastActive: 'Online', employeeId: 'e14', pin: '1414', phone: '+91 98100 14141', color: '#ea580c' },
  { id: 'u16', name: 'Meera Kapoor', email: 'meera@grandkitchen.in', roleId: 'r_frontdesk', outletIds: ['o1'], status: 'Active', lastActive: 'Online', pin: '1616', phone: '+91 98100 16161', color: '#0e7490' },
  { id: 'u15', name: 'Manish Tiwari', email: 'manish@grandkitchen.in', roleId: 'r_custom', outletIds: ['o3'], status: 'Inactive', lastActive: '12 days ago', employeeId: 'e18', pin: '1818', phone: '+91 98100 18181', color: '#4f46e5' },
]

/** The 10 accounts shown in the demo user switcher */
export const DEMO_USER_IDS = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9', 'u16']
