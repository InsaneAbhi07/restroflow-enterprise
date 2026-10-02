import type { GroupKey, ReportDef } from './types'
import { DAY_END } from './defs/dayEnd'
import { SALES_REPORTS } from './defs/sales'
import { INVENTORY_REPORTS } from './defs/inventory'
import { OPERATIONAL_REPORTS } from './defs/operational'
import { HRMS_REPORTS } from './defs/hrms'

export const REPORTS: ReportDef[] = [DAY_END, ...SALES_REPORTS, ...INVENTORY_REPORTS, ...OPERATIONAL_REPORTS, ...HRMS_REPORTS]
export const reportById = (id?: string) => REPORTS.find((r) => r.id === id)

export const GROUPS: { key: GroupKey; label: string; icon: string; tone: string }[] = [
  { key: 'Sales', label: 'Sales Reports', icon: 'TrendingUp', tone: 'text-brand-600 bg-brand-50' },
  { key: 'Inventory', label: 'Inventory Reports', icon: 'Package', tone: 'text-violet-600 bg-violet-50' },
  { key: 'Operational', label: 'Operational Reports', icon: 'Gauge', tone: 'text-orange-600 bg-orange-50' },
  { key: 'HRMS', label: 'HRMS Reports', icon: 'Users', tone: 'text-sky-600 bg-sky-50' },
]
