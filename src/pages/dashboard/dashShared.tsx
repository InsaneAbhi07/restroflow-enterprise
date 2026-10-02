import React, { useMemo } from 'react'
import { Card, CardHeader, Badge, type Tone } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { isToday, useLiveSales, useScope, useScopedOrders } from '@/store/hooks'
import { dailySeries } from '@/data/analytics'
import { OUTLETS } from '@/data/outlets'
import { computeTotals } from '@/lib/billing'
import { cn, isoDate } from '@/lib/format'
import type { Approval, ModuleKey, Order, OrderSource, Outlet } from '@/types'

/* ------------------------------------------------------------------ ranges */
export type Range = 'today' | '7d' | '30d' | 'month'
export const RANGE_ITEMS: { value: Range; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'month', label: 'This Month' },
]
export const rangeDays = (r: Range) => (r === 'today' ? 1 : r === '7d' ? 7 : r === '30d' ? 30 : new Date().getDate())
export const rangeCompareLabel = (r: Range) =>
  r === 'today' ? 'vs same time yesterday' : r === '7d' ? 'vs previous 7 days' : r === '30d' ? 'vs previous 30 days' : 'vs same days last month'

/** analytics.ts only knows the seeded outlets — guard against newly added ones */
export const analyticsIds = (ids: string[]) => ids.filter((id) => OUTLETS.some((o) => o.id === id))

export const delta = (cur: number, prev: number) => (prev ? ((cur - prev) / prev) * 100 : 0)

/* ------------------------------------------------------------------ metrics */
export interface OutletRow {
  id: string
  outlet: Outlet
  revenue: number
  prevRevenue: number
  orders: number
  prevOrders: number
  expenses: number
  prevExpenses: number
  aov: number
  employees: number
  present: number
  running: number
  liveRevenue: number
  liveCount: number
  target: number
}

function periodFor(id: string, days: number) {
  const d = dailySeries([id], days * 2)
  const cur = d.slice(-days)
  const prev = d.slice(0, days)
  const sum = (a: typeof d, k: 'sales' | 'orders' | 'expenses') => a.reduce((s, x) => s + x[k], 0)
  // "today" is a partial day (≈62% in the series) — compare with same time yesterday
  const adj = days === 1 ? 0.62 : 1
  return {
    sales: sum(cur, 'sales'), orders: sum(cur, 'orders'), expenses: sum(cur, 'expenses'),
    pSales: sum(prev, 'sales') * adj, pOrders: Math.round(sum(prev, 'orders') * adj), pExpenses: sum(prev, 'expenses') * adj,
  }
}

const PRESENT = ['Present', 'Late', 'Half Day']

/** Combined historical (analytics) + live (store) metrics for the outlets in scope */
export function useDashMetrics(range: Range) {
  const { outletIds, isAll, single } = useScope()
  const orders = useScopedOrders()
  const live = useLiveSales(orders)
  const outlets = useStore((s) => s.outlets)
  const employees = useStore((s) => s.employees)
  const attendance = useStore((s) => s.attendance)
  const tables = useStore((s) => s.tables)
  const materials = useStore((s) => s.materials)
  const approvals = useStore((s) => s.approvals)

  return useMemo(() => {
    const days = rangeDays(range)
    const today = isoDate()
    const todayAtt = attendance.filter((a) => a.date === today)
    const rows: OutletRow[] = outletIds.map((id) => {
      const outlet = outlets.find((o) => o.id === id)!
      const known = analyticsIds([id]).length > 0
      const p = known ? periodFor(id, days) : { sales: 0, orders: 0, expenses: 0, pSales: 0, pOrders: 0, pExpenses: 0 }
      const ls = live.settled.filter((o) => o.outletId === id)
      const liveRevenue = ls.reduce((s, o) => s + computeTotals(o).total, 0)
      const emps = employees.filter((e) => e.outletId === id && e.status !== 'Inactive')
      const present = todayAtt.filter((a) => PRESENT.includes(a.status) && emps.some((e) => e.id === a.employeeId)).length
      const revenue = p.sales + liveRevenue
      const ordersN = p.orders + ls.length
      return {
        id, outlet, revenue, prevRevenue: p.pSales, orders: ordersN, prevOrders: p.pOrders,
        expenses: p.expenses + liveRevenue * 0.58, prevExpenses: p.pExpenses,
        aov: ordersN ? revenue / ordersN : 0, employees: emps.length, present,
        running: tables.filter((t) => t.outletId === id && (t.status === 'Occupied' || t.status === 'Billing')).length,
        liveRevenue, liveCount: ls.length, target: p.pSales * 1.06 || 1,
      }
    }).filter((r) => r.outlet)

    const sum = (k: keyof OutletRow) => rows.reduce((s, r) => s + (r[k] as number), 0)
    const revenue = sum('revenue'), prevRevenue = sum('prevRevenue')
    const ordersN = sum('orders'), prevOrders = sum('prevOrders')
    const expenses = sum('expenses'), prevExpenses = sum('prevExpenses')
    const profit = revenue - expenses, prevProfit = prevRevenue - prevExpenses
    const aov = ordersN ? revenue / ordersN : 0, prevAov = prevOrders ? prevRevenue / prevOrders : 0

    const lowStock = materials.flatMap((m) =>
      outletIds.filter((o) => (m.stock[o] ?? 0) < m.min).map((o) => ({ material: m, outletId: o, qty: m.stock[o] ?? 0, out: (m.stock[o] ?? 0) <= 0 })),
    ).sort((a, b) => a.qty / a.material.min - b.qty / b.material.min)
    const pendingApprovals = approvals.filter((a) => a.status === 'Pending' && outletIds.includes(a.outletId))
    const scopedEmployees = employees.filter((e) => outletIds.includes(e.outletId) && e.status !== 'Inactive')

    return {
      range, days, rows, isAll, single, outletIds,
      revenue, prevRevenue, orders: ordersN, prevOrders, expenses, prevExpenses, profit, prevProfit, aov, prevAov,
      activeOutlets: rows.filter((r) => r.outlet.status === 'Open').length,
      present: sum('present'), headcount: scopedEmployees.length,
      lowStock, pendingApprovals, live,
    }
  }, [range, outletIds, isAll, single, outlets, employees, attendance, tables, materials, approvals, live])
}
export type DashMetrics = ReturnType<typeof useDashMetrics>

/** Today's attendance breakdown for employees in scope */
export function useTodayAttendance() {
  const { outletIds } = useScope()
  const employees = useStore((s) => s.employees)
  const attendance = useStore((s) => s.attendance)
  return useMemo(() => {
    const today = isoDate()
    const emps = employees.filter((e) => outletIds.includes(e.outletId) && e.status !== 'Inactive')
    const recs = attendance.filter((a) => a.date === today && emps.some((e) => e.id === a.employeeId))
    const count = (s: string[]) => recs.filter((r) => s.includes(r.status)).length
    const present = count(['Present', 'Half Day'])
    const late = count(['Late'])
    const leave = count(['Leave'])
    const off = count(['Weekly Off'])
    const absent = count(['Absent'])
    const notIn = emps.length - recs.length
    return { emps, recs, total: emps.length, present, late, leave, off, absent, notIn }
  }, [employees, attendance, outletIds])
}

/* ------------------------------------------------------------------ approvals */
export const APPROVAL_MODULE: Record<Approval['type'], ModuleKey> = {
  Discount: 'settlement', Resettlement: 'settlement', 'Stock Transfer': 'transfer', 'Purchase Order': 'purchase',
  Leave: 'attendance', 'Attendance Correction': 'attendance', Payroll: 'payroll',
}

/* ------------------------------------------------------------------ badges */
const SOURCE_TONE: Record<OrderSource, Tone> = { POS: 'navy', 'Waiter App': 'teal', 'QR Order': 'violet', Swiggy: 'orange', Zomato: 'red', Phone: 'gray' }
export const SourceBadge = ({ source }: { source: OrderSource }) => <Badge tone={SOURCE_TONE[source]}>{source}</Badge>

/* ------------------------------------------------------------------ layout helpers */
export function ChartCard({ title, subtitle, icon, actions, children, className, bodyClassName }: {
  title: React.ReactNode; subtitle?: React.ReactNode; icon?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string
}) {
  return (
    <Card className={cn('flex min-w-0 flex-col', className)}>
      <CardHeader title={title} subtitle={subtitle} icon={icon} actions={actions} />
      <div className={cn('min-w-0 flex-1 p-4', bodyClassName)}>{children}</div>
    </Card>
  )
}

export function MiniMetric({ label, value, tone = 'slate', sub }: { label: string; value: React.ReactNode; tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'violet'; sub?: React.ReactNode }) {
  const c = { slate: 'text-slate-900', green: 'text-emerald-600', amber: 'text-amber-600', red: 'text-rose-600', blue: 'text-sky-600', violet: 'text-violet-600' }[tone]
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={cn('text-[16px] font-semibold tabular leading-tight', c)}>{value}</p>
      {sub && <p className="text-[10.5px] text-slate-400">{sub}</p>}
    </div>
  )
}

export function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
export const todayLong = () => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/** Client-side CSV download */
export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Orders settled/created today */
export const todaysOrders = (orders: Order[]) => orders.filter((o) => isToday(o.createdAt) || isToday(o.settledAt))
