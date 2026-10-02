import type React from 'react'
import type {
  Attendance, Customer, Employee, Kot, Material, MenuCategory, MenuItem, Order, Outlet, PayrollRun, PurchaseOrder, Recipe,
  StockMovement, StockTransfer, Supplier, Table,
} from '@/types'
import type { Tone } from '@/components/ui'

export type GroupKey = 'Sales' | 'Inventory' | 'Operational' | 'HRMS'
export type RangePreset = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'custom'

export type Cell = string | number | boolean | undefined | null
export type Row = { id: string } & Record<string, Cell>

export type Fmt = 'inr' | 'inr2' | 'num' | 'dec' | 'pct' | 'text' | 'date' | 'time' | 'datetime' | 'min'

export interface RCol {
  key: string
  header: string
  fmt?: Fmt
  align?: 'left' | 'right' | 'center'
  /** footer aggregate computed over (filtered) rows */
  total?: 'sum' | 'avg' | 'count'
  /** optional rich cell renderer for the on-screen table */
  render?: (r: Row) => React.ReactNode
  width?: number | string
  /** badge tone for status-like text columns */
  badge?: boolean
}

export interface Kpi { label: string; value: string; sub?: string; tone?: Tone }

export interface Series { key: string; name: string; color?: string; type?: 'bar' | 'line' | 'area'; axis?: 'left' | 'right'; stack?: string }
export type ChartSpec =
  | CartesianSpec
  | { kind: 'pie' | 'donut'; title?: string; data: { name: string; value: number; color?: string }[]; money?: boolean; height?: number }
  | { kind: 'custom'; title?: string; node: React.ReactNode }

export interface ReportResult {
  kpis: Kpi[]
  columns: RCol[]
  rows: Row[]
  charts?: ChartSpec[]
  note?: string
}

export interface FilterDef { key: string; label: string; options: (ctx: ReportCtx) => { value: string; label: string }[] }

export interface ReportCtx {
  from: Date
  to: Date
  /** ISO dates inside range (clamped to today) */
  dates: string[]
  nDays: number
  rangeLabel: string
  preset: RangePreset
  outletIds: string[]
  outlets: Outlet[]
  allOutlets: Outlet[]
  isAll: boolean
  filter: Record<string, string>
  orders: Order[]
  kots: Kot[]
  materials: Material[]
  movements: StockMovement[]
  purchaseOrders: PurchaseOrder[]
  transfers: StockTransfer[]
  suppliers: Supplier[]
  recipes: Recipe[]
  attendance: Attendance[]
  employees: Employee[]
  customers: Customer[]
  menu: MenuItem[]
  categories: MenuCategory[]
  tables: Table[]
  payrollRuns: PayrollRun[]
  serviceChargePct: number
}

export interface ReportDef {
  id: string
  group: GroupKey
  title: string
  description: string
  icon: string // lucide name
  defaultRange?: RangePreset
  /** report ignores the date range (shows a snapshot) */
  snapshot?: boolean
  filters?: FilterDef[]
  defaultView?: 'table' | 'chart' | 'both'
  build: (ctx: ReportCtx) => ReportResult
  /** replaces default table/chart body (e.g. Day End) */
  Custom?: React.ComponentType<{ ctx: ReportCtx; result: ReportResult }>
  /** replaces the generic A4 print document */
  PrintDoc?: React.ComponentType<{ ctx: ReportCtx; result: ReportResult }>
  tags?: string[]
}

export interface CartesianSpec { kind: 'bar' | 'line' | 'area' | 'composed' | 'stacked' | 'hbar'; title?: string; data: object[]; x: string; series: Series[]; money?: boolean; height?: number }
