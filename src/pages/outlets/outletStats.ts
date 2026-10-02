import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { isToday } from '@/store/hooks'
import { dailySeries } from '@/data/analytics'
import { OUTLETS } from '@/data/outlets'
import { computeTotals } from '@/lib/billing'
import { isoDate } from '@/lib/format'
import type { Outlet } from '@/types'

export interface OutletStat {
  id: string
  todaySales: number
  todayOrders: number
  yesterdaySales: number
  week: { label: string; sales: number; orders: number }[]
  weekSales: number
  employees: number
  present: number
  running: number
  tables: number
  liveRevenue: number
}

/** Today's numbers (historical baseline + live settled orders) for each outlet */
export function useOutletStats(outlets: Outlet[]) {
  const orders = useStore((s) => s.orders)
  const employees = useStore((s) => s.employees)
  const tables = useStore((s) => s.tables)
  const attendance = useStore((s) => s.attendance)
  return useMemo(() => {
    const today = isoDate()
    const map: Record<string, OutletStat> = {}
    outlets.forEach((o) => {
      const known = OUTLETS.some((x) => x.id === o.id)
      const series = known ? dailySeries([o.id], 7) : Array.from({ length: 7 }, (_, i) => ({ label: new Date(Date.now() - (6 - i) * 864e5).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), sales: 0, orders: 0, expenses: 0, date: '' }))
      const live = orders.filter((x) => x.outletId === o.id && x.status === 'Settled' && isToday(x.settledAt))
      const liveRevenue = live.reduce((s, x) => s + computeTotals(x).total, 0)
      const week = series.map((d, i) => ({ label: d.label, sales: d.sales + (i === series.length - 1 ? liveRevenue : 0), orders: d.orders + (i === series.length - 1 ? live.length : 0) }))
      const emps = employees.filter((e) => e.outletId === o.id && e.status !== 'Inactive')
      const t = tables.filter((x) => x.outletId === o.id)
      map[o.id] = {
        id: o.id,
        todaySales: week[6].sales,
        todayOrders: week[6].orders,
        yesterdaySales: week[5].sales * 0.62,
        week,
        weekSales: week.reduce((s, d) => s + d.sales, 0),
        employees: emps.length,
        present: attendance.filter((a) => a.date === today && ['Present', 'Late', 'Half Day'].includes(a.status) && emps.some((e) => e.id === a.employeeId)).length,
        running: t.filter((x) => x.status === 'Occupied' || x.status === 'Billing').length,
        tables: t.length,
        liveRevenue,
      }
    })
    return map
  }, [outlets, orders, employees, tables, attendance])
}
