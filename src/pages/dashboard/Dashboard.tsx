import { useRole } from '@/store/hooks'
import OwnerDashboard from './OwnerDashboard'
import OutletManagerDashboard from './OutletManagerDashboard'
import { CashierDashboard, KitchenDashboard, WaiterDashboard } from './OpsDashboards'
import { HRDashboard, InventoryDashboard } from './BackOfficeDashboards'

/** Role-aware dashboard: each role lands on the overview most relevant to their job */
export default function Dashboard() {
  const role = useRole()
  switch (role.id) {
    case 'r_owner':
    case 'r_regional':
      return <OwnerDashboard />
    case 'r_accounts':
      return <OwnerDashboard finance />
    case 'r_outlet':
    case 'r_custom':
      return <OutletManagerDashboard />
    case 'r_cashier':
      return <CashierDashboard />
    case 'r_waiter':
      return <WaiterDashboard />
    case 'r_kitchen':
      return <KitchenDashboard />
    case 'r_inventory':
      return <InventoryDashboard />
    case 'r_hr':
      return <HRDashboard />
    default:
      // custom roles: pick by scope
      return role.scope === 'Outlet' ? <OutletManagerDashboard /> : <OwnerDashboard />
  }
}
