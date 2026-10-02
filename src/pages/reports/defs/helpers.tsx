import { Badge, VegMark, type Tone } from '@/components/ui'
import { inr, inrShort, num } from '@/lib/format'
import type { Fmt, Kpi, RCol, ReportCtx, Row, FilterDef } from '../types'

const LEFT: Fmt[] = ['text', 'date', 'time', 'datetime']
export const col = (key: string, header: string, fmt?: Fmt, total?: RCol['total'], extra?: Partial<RCol>): RCol => ({
  key, header, fmt, total, align: fmt && !LEFT.includes(fmt) ? 'right' : 'left', ...extra,
})
export const kpi = (label: string, value: string, sub?: string, tone?: Tone): Kpi => ({ label, value, sub, tone })
export const money = (n: number) => inr(n)
export const short = (n: number) => inrShort(n)
export const n0 = (n: number) => num(Math.round(n))
export const pctOf = (a: number, b: number) => (b ? (a / b) * 100 : 0)

export const outletCol = (ctx: ReportCtx): RCol[] => (ctx.outlets.length > 1 ? [col('outlet', 'Outlet')] : [])

export const nameWithVeg = (r: Row) => (
  <span className="inline-flex items-center gap-1.5"><VegMark veg={!!r.veg} />{String(r.name)}</span>
)
export const STATUS_TONES: Record<string, Tone> = {
  OK: 'green', 'In Stock': 'green', Healthy: 'green', Low: 'amber', 'Low Stock': 'amber', Expiring: 'orange', Expired: 'red', 'Out of Stock': 'red', Critical: 'red',
  Settled: 'green', Resettled: 'violet', Cancelled: 'red', Void: 'red', Received: 'green', Approved: 'green', Pending: 'amber', 'Pending Approval': 'amber', 'In Transit': 'blue',
  Present: 'green', Late: 'amber', Absent: 'red', 'Half Day': 'orange', Leave: 'violet', 'Weekly Off': 'gray', Draft: 'gray', 'Partially Received': 'blue', Returned: 'orange', Rejected: 'red',
  'Within SLA': 'green', Breached: 'red', Short: 'red', Excess: 'amber', Tallied: 'green', 'Not marked': 'gray',
}
export const badgeCell = (key: string) => (r: Row) => <Badge tone={STATUS_TONES[String(r[key])] ?? 'gray'} dot>{String(r[key] ?? '-')}</Badge>

export const categoryFilter: FilterDef = {
  key: 'category', label: 'Category', options: (ctx) => ctx.categories.map((c) => ({ value: c.id, label: c.name })),
}
export const materialCategoryFilter: FilterDef = {
  key: 'mcat', label: 'Material category', options: (ctx) => [...new Set(ctx.materials.map((m) => m.category))].map((c) => ({ value: c, label: c })),
}
export const departmentFilter: FilterDef = {
  key: 'dept', label: 'Department', options: (ctx) => [...new Set(ctx.employees.map((e) => e.department))].map((d) => ({ value: d, label: d })),
}
