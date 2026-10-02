import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/layout/Overlays'
import Dashboard from '@/pages/dashboard/Dashboard'
import Outlets from '@/pages/outlets/Outlets'
import Customers from '@/pages/customers/Customers'
import POS from '@/pages/pos/POS'
import Orders from '@/pages/orders/Orders'
import Settlement from '@/pages/settlement/Settlement'
import Kitchen from '@/pages/kot/Kitchen'
import Tables from '@/pages/tables/Tables'
import Menu from '@/pages/menu/Menu'
import QrAdmin from '@/pages/qr/QrAdmin'
import QrCustomerApp from '@/pages/qr/QrCustomerApp'
import Inventory from '@/pages/inventory/Inventory'
import Purchases from '@/pages/inventory/Purchases'
import Suppliers from '@/pages/inventory/Suppliers'
import Transfers from '@/pages/inventory/Transfers'
import Recipes from '@/pages/recipes/Recipes'
import Employees from '@/pages/employees/Employees'
import Attendance from '@/pages/attendance/Attendance'
import Payroll from '@/pages/payroll/Payroll'
import Reports from '@/pages/reports/Reports'
import Audit from '@/pages/audit/Audit'
import Users from '@/pages/users/Users'
import Roles from '@/pages/users/Roles'
import Settings from '@/pages/settings/Settings'
import StaffApp from '@/mobile/StaffApp'
import Login from '@/pages/auth/Login'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Routes>
        <Route path="/login" element={<><Login /><Toaster /></>} />
        {/* Standalone mobile-first experiences */}
        <Route path="/mobile" element={<div className="h-full bg-slate-900 sm:flex sm:items-center sm:justify-center"><div className="h-full w-full sm:h-[860px] sm:max-h-full sm:w-[400px] sm:overflow-hidden sm:rounded-[36px] sm:shadow-2xl"><StaffApp /></div><Toaster /></div>} />
        <Route path="/qr-order/:outletId/:tableId" element={<div className="h-full bg-slate-900 sm:flex sm:items-center sm:justify-center"><div className="h-full w-full sm:h-[860px] sm:max-h-full sm:w-[400px] sm:overflow-hidden sm:rounded-[36px] sm:shadow-2xl"><QrCustomerApp /></div><Toaster /></div>} />

        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<POS />} />
          <Route path="orders" element={<Orders />} />
          <Route path="settlement" element={<Settlement />} />
          <Route path="kot" element={<Kitchen />} />
          <Route path="tables" element={<Tables />} />
          <Route path="qr" element={<QrAdmin />} />
          <Route path="customers" element={<Customers />} />
          <Route path="menu" element={<Menu />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory/purchases" element={<Purchases />} />
          <Route path="inventory/suppliers" element={<Suppliers />} />
          <Route path="inventory/transfers" element={<Transfers />} />
          <Route path="recipes" element={<Recipes />} />
          <Route path="employees" element={<Employees />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:reportId" element={<Reports />} />
          <Route path="audit" element={<Audit />} />
          <Route path="outlets" element={<Outlets />} />
          <Route path="users" element={<Users />} />
          <Route path="users/roles" element={<Roles />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
