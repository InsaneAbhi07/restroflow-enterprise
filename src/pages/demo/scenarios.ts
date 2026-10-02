import type { NavigateFunction } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { useUI } from '@/components/layout/uiStore'
import { toast } from '@/store/toast'
import { simulateCheckIn, simulateSettlement, simulateTableOrder, simulateTransfer } from '@/lib/simulate'

export interface Ctx { nav: NavigateFunction }
export interface Step { title: string; hint: string; go: (c: Ctx) => void; sim?: { label: string; run: (c: Ctx) => void } }
export interface Scenario { id: string; title: string; desc: string; icon: string; color: string; persona: string; steps: Step[] }

const S = () => useStore.getState()
const ui = () => useUI.getState()
const closeMobile = () => ui().setMobilePreview(false)
const as = (userId: string, outlet?: string) => { S().setUser(userId); if (outlet) S().setOutlet(outlet) }
const openMobile = (userId = 'u5') => { S().setMobileUser(userId); ui().setMobilePreview(true) }

export const SCENARIOS: Scenario[] = [
  {
    id: 'owner', title: 'Owner & multiple outlets', icon: 'Building2', color: '#1d3f70', persona: 'Abhishek Singh · Owner',
    desc: 'Consolidated view of all outlets, outlet switching and performance comparison.',
    steps: [
      { title: 'Open organization dashboard', hint: 'Signed in as the owner with All Outlets selected.', go: ({ nav }) => { closeMobile(); as('u1', 'all'); nav('/') } },
      { title: 'Show consolidated sales', hint: 'KPIs and charts aggregate all 4 outlets in real time.', go: ({ nav }) => { S().setOutlet('all'); nav('/') } },
      { title: 'Switch between outlets', hint: 'Use the outlet switcher in the top bar — now showing City Center.', go: ({ nav }) => { S().setOutlet('o2'); nav('/'); toast.info('Switched to City Center', 'Every screen now filters to this outlet') } },
      { title: 'Compare outlet performance', hint: 'Side-by-side revenue, orders and ticket size per outlet.', go: ({ nav }) => { S().setOutlet('all'); nav('/outlets') } },
      { title: 'Open outlet details', hint: 'Click an outlet card to open its detail view.', go: ({ nav }) => { nav('/outlets'); toast.info('Click any outlet card', 'Opens the outlet detail drawer') } },
    ],
  },
  {
    id: 'order', title: 'Restaurant order flow', icon: 'UtensilsCrossed', color: '#ea580c', persona: 'Waiter → Cashier → Kitchen',
    desc: 'Waiter app order flows into POS and KOT, then settlement and a printed receipt.',
    steps: [
      { title: 'Open waiter mobile app', hint: 'Log in as Rohit Kumar (PIN 5555).', go: () => { as('u1', 'o1'); openMobile('u5') } },
      { title: 'Select table', hint: 'Tap Tables and choose any free (green) table.', go: () => openMobile('u5') },
      { title: 'Add food items', hint: 'Add dishes, pick variants and add notes.', go: () => openMobile('u5') },
      { title: 'Submit order', hint: 'Tap "Send to kitchen" — the order syncs instantly.', go: () => openMobile('u5'), sim: { label: 'Simulate order', run: () => simulateTableOrder('o1', 'Waiter App') } },
      { title: 'Switch to POS', hint: 'The cashier sees the running table order in POS.', go: ({ nav }) => { closeMobile(); S().setOutlet('o1'); nav('/pos') } },
      { title: 'View incoming order', hint: 'Waiter App orders are tagged with their source.', go: ({ nav }) => { closeMobile(); nav('/orders') } },
      { title: 'Generate KOT', hint: 'The kitchen display shows the new ticket with timers.', go: ({ nav }) => { closeMobile(); nav('/kot') } },
      { title: 'Settle bill', hint: 'Open the table in POS and press F4 to settle.', go: ({ nav }) => { closeMobile(); nav('/pos') }, sim: { label: 'Simulate settle', run: () => simulateSettlement('o1') } },
      { title: 'Preview receipt', hint: 'Open the settled bill and press F8 for the thermal receipt.', go: ({ nav }) => { closeMobile(); nav('/orders') } },
    ],
  },
  {
    id: 'roles', title: 'Role permissions', icon: 'ShieldCheck', color: '#7c3aed', persona: 'Owner edits Cashier role',
    desc: 'Change what the Cashier can access and watch their interface update immediately.',
    steps: [
      { title: 'Open user management', hint: 'Directory of all users, roles and outlets.', go: ({ nav }) => { closeMobile(); as('u1', 'all'); nav('/users') } },
      { title: 'Select cashier', hint: 'Filtered to the Cashier role — Neha Gupta.', go: ({ nav }) => { as('u1'); nav('/users?role=r_cashier') } },
      { title: 'Open permission editor', hint: 'Module × action permission matrix for the Cashier.', go: ({ nav }) => { as('u1'); nav('/users/roles?role=r_cashier') } },
      {
        title: 'Toggle a permission', hint: 'Tick or untick e.g. Inventory → View, then Save.', go: ({ nav }) => { as('u1'); nav('/users/roles?role=r_cashier') },
        sim: {
          label: 'Toggle Inventory', run: () => {
            const r = S().roles.find((x) => x.id === 'r_cashier')
            if (!r) return
            const has = !!r.permissions.inventory?.includes('view')
            const perms = { ...r.permissions }
            if (has) delete perms.inventory; else perms.inventory = ['view']
            S().setRolePermissions('r_cashier', perms)
            toast.success(has ? 'Inventory access removed from Cashier' : 'Inventory (view) granted to Cashier', 'Saved — applies instantly')
          },
        },
      },
      { title: 'Switch to cashier', hint: 'Now signed in as Neha Gupta (Cashier, Main Branch).', go: ({ nav }) => { as('u4'); nav('/'); toast.info('Signed in as Neha Gupta', 'Cashier · Main Branch') } },
      { title: 'Show the changed interface', hint: 'The sidebar only shows modules the role can view.', go: ({ nav }) => { as('u4'); nav('/') } },
      { title: 'Demonstrate restricted access', hint: 'Opening a restricted module shows Access Denied.', go: ({ nav }) => { as('u4'); nav('/payroll') } },
    ],
  },
  {
    id: 'hr', title: 'Attendance & payroll', icon: 'CalendarCheck', color: '#db2777', persona: 'Employee → HR Manager',
    desc: 'Mobile check-in feeds attendance, which drives payroll and salary slips.',
    steps: [
      { title: 'Open employee mobile preview', hint: 'Log in as Rohit Kumar (PIN 5555) → Attendance tab.', go: () => { as('u1', 'o1'); openMobile('u5') } },
      { title: 'Check in', hint: 'Tap Check in — verified by GPS / outlet Wi-Fi.', go: () => openMobile('u5'), sim: { label: 'Simulate check-in', run: () => simulateCheckIn('o1') } },
      { title: 'Switch to HR dashboard', hint: 'Now signed in as Anjali Verma (HR Manager).', go: ({ nav }) => { closeMobile(); as('u8', 'all'); nav('/'); toast.info('Signed in as Anjali Verma', 'HR Manager · all outlets') } },
      { title: 'View attendance', hint: 'The new check-in appears in today\'s register.', go: ({ nav }) => { closeMobile(); as('u8'); nav('/attendance') } },
      { title: 'Open payroll', hint: 'Payable days come straight from attendance.', go: ({ nav }) => { closeMobile(); as('u8'); nav('/payroll') } },
      { title: 'Preview salary slip', hint: 'Click the slip icon on any row for the A4 slip.', go: ({ nav }) => { as('u8'); nav('/payroll') } },
    ],
  },
  {
    id: 'stock', title: 'Inventory & stock', icon: 'Boxes', color: '#0891b2', persona: 'Owner / Inventory Manager',
    desc: 'Stock levels across outlets, an inter-outlet transfer and stock movement reports.',
    steps: [
      { title: 'Open inventory', hint: 'Raw material stock across all outlets.', go: ({ nav }) => { closeMobile(); as('u1', 'all'); nav('/inventory') } },
      { title: 'View stock levels', hint: 'Low-stock items are highlighted against minimum levels.', go: ({ nav }) => { nav('/inventory') } },
      { title: 'Create a simulated stock transfer', hint: 'Paneer & butter dispatched Main Branch → Mall Outlet.', go: ({ nav }) => { simulateTransfer(); nav('/inventory/transfers') } },
      { title: 'Review destination inventory', hint: 'Mall Outlet selected — mark the transfer Received to update stock.', go: ({ nav }) => { S().setOutlet('o3'); nav('/inventory') } },
      { title: 'Open stock reports', hint: 'Every movement is traceable in the stock movement report.', go: ({ nav }) => { S().setOutlet('all'); nav('/reports/stock-movement') } },
    ],
  },
]
