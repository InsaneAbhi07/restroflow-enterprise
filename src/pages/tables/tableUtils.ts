import type { Employee, Table, TableStatus } from '@/types'
import { waitersFor } from '@/data/operations'

export const TABLE_STATUSES: TableStatus[] = ['Available', 'Occupied', 'Reserved', 'Billing', 'Cleaning']

export const TS_STYLE: Record<TableStatus, { fill: string; border: string; text: string; chip: string; dot: string; chair: string }> = {
  Available: { fill: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500', chair: 'bg-emerald-300' },
  Occupied: { fill: 'bg-sky-50', border: 'border-sky-400', text: 'text-sky-900', chip: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500', chair: 'bg-sky-400' },
  Reserved: { fill: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-900', chip: 'bg-violet-50 text-violet-700 ring-violet-200', dot: 'bg-violet-500', chair: 'bg-violet-300' },
  Billing: { fill: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-900', chip: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', chair: 'bg-amber-400' },
  Cleaning: { fill: 'bg-slate-100', border: 'border-slate-300 border-dashed', text: 'text-slate-600', chip: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400', chair: 'bg-slate-300' },
}

export function waiterName(t: Pick<Table, 'waiterId' | 'outletId'>, employees: Employee[]) {
  if (!t.waiterId) return undefined
  return waitersFor(t.outletId).find((w) => w.id === t.waiterId)?.name ?? employees.find((e) => e.id === t.waiterId)?.name
}

export const isBusy = (s: TableStatus) => s === 'Occupied' || s === 'Billing'
