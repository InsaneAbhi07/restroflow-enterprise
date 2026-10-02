import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { useScope } from '@/store/hooks'
import type { RangePreset, ReportCtx } from './types'
import { resolveRange } from './range'

export interface CtxOpts { preset: RangePreset; from?: string; to?: string; outlet: string; filter: Record<string, string> }

export function useReportCtx({ preset, from, to, outlet, filter }: CtxOpts): ReportCtx {
  const scope = useScope()
  const outlets = useStore((s) => s.outlets)
  const orders = useStore((s) => s.orders)
  const kots = useStore((s) => s.kots)
  const materials = useStore((s) => s.materials)
  const movements = useStore((s) => s.movements)
  const purchaseOrders = useStore((s) => s.purchaseOrders)
  const transfers = useStore((s) => s.transfers)
  const suppliers = useStore((s) => s.suppliers)
  const recipes = useStore((s) => s.recipes)
  const attendance = useStore((s) => s.attendance)
  const employees = useStore((s) => s.employees)
  const customers = useStore((s) => s.customers)
  const menu = useStore((s) => s.menu)
  const categories = useStore((s) => s.categories)
  const tables = useStore((s) => s.tables)
  const payrollRuns = useStore((s) => s.payrollRuns)
  const serviceChargePct = useStore((s) => s.settings.serviceCharge)
  const filterKey = JSON.stringify(filter)

  return useMemo(() => {
    const r = resolveRange(preset, from, to)
    const outletIds = outlet === 'all' || !scope.allowed.includes(outlet) ? (outlet === 'all' ? scope.allowed : scope.outletIds) : [outlet]
    return {
      from: r.from, to: r.to, dates: r.dates, nDays: r.dates.length, rangeLabel: r.label, preset,
      outletIds, outlets: outlets.filter((o) => outletIds.includes(o.id)), allOutlets: outlets, isAll: outletIds.length > 1,
      filter: JSON.parse(filterKey) as Record<string, string>,
      orders, kots, materials, movements, purchaseOrders, transfers, suppliers, recipes, attendance, employees, customers, menu, categories, tables, payrollRuns, serviceChargePct,
    }
  }, [preset, from, to, outlet, scope.allowed, scope.outletIds, outlets, filterKey, orders, kots, materials, movements, purchaseOrders, transfers, suppliers, recipes, attendance, employees, customers, menu, categories, tables, payrollRuns, serviceChargePct])
}
