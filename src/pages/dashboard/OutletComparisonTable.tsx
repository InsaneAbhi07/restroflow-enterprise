import { Store, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardHeader, DataTable, Progress, StatusBadge, type Column } from '@/components/ui'
import { cn, inr, inrShort } from '@/lib/format'
import { delta, type DashMetrics, type OutletRow } from './dashShared'

export function OutletComparisonTable({ m, onOpen }: { m: DashMetrics; onOpen: (id: string) => void }) {
  const max = Math.max(1, ...m.rows.map((r) => r.revenue))
  const cols: Column<OutletRow>[] = [
    {
      key: 'name', header: 'Outlet', sortValue: (r) => r.outlet.short,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.outlet.color }} />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800">{r.outlet.short}</p>
            <p className="text-[10.5px] text-slate-400">{r.outlet.code} · {r.outlet.manager}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'revenue', header: 'Revenue', align: 'right', sortValue: (r) => r.revenue, width: 190,
      render: (r) => {
        const d = delta(r.revenue, r.prevRevenue)
        return (
          <div className="flex items-center justify-end gap-2">
            <Progress value={(r.revenue / max) * 100} className="hidden w-16 md:block" tone="teal" />
            <div>
              <p className="font-semibold text-slate-900">{inr(r.revenue)}</p>
              <p className={cn('flex items-center justify-end gap-0.5 text-[10.5px]', d >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                {d >= 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}{Math.abs(d).toFixed(1)}%
              </p>
            </div>
          </div>
        )
      },
    },
    { key: 'orders', header: 'Orders', align: 'right', sortValue: (r) => r.orders, render: (r) => r.orders.toLocaleString('en-IN') },
    { key: 'aov', header: 'Avg bill', align: 'right', sortValue: (r) => r.aov, render: (r) => inr(r.aov) },
    { key: 'expenses', header: 'Expenses', align: 'right', sortValue: (r) => r.expenses, render: (r) => <span className="text-slate-600">{inrShort(r.expenses)}</span> },
    { key: 'profit', header: 'Est. profit', align: 'right', sortValue: (r) => r.revenue - r.expenses, render: (r) => <span className="font-medium text-emerald-700">{inrShort(r.revenue - r.expenses)}</span> },
    { key: 'emp', header: 'Employees', align: 'right', sortValue: (r) => r.present, render: (r) => <span>{r.present}<span className="text-slate-400">/{r.employees}</span></span> },
    { key: 'status', header: 'Status', sortValue: (r) => r.outlet.status, render: (r) => <StatusBadge status={r.outlet.status} /> },
    {
      key: 'running', header: 'Running tables', align: 'right', sortValue: (r) => r.running,
      render: (r) => <span className={cn('inline-flex min-w-7 justify-center rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold', r.running ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-500')}>{r.running}</span>,
    },
  ]
  const tot = {
    revenue: m.revenue, orders: m.orders, expenses: m.expenses, emp: m.headcount, present: m.present, running: m.rows.reduce((s, r) => s + r.running, 0),
  }
  return (
    <Card>
      <CardHeader title="Outlet comparison" subtitle="Selected period · click a row for outlet details" icon={<Store className="size-3.5" />} />
      <DataTable
        columns={cols}
        rows={m.rows}
        onRowClick={(r) => onOpen(r.id)}
        pageSize={0}
        footer={m.rows.length > 1 ? (
          <tr className="border-t border-slate-200 bg-slate-50/80 text-[12.5px] font-semibold text-slate-800">
            <td className="px-3 py-2">Total · {m.rows.length} outlets</td>
            <td className="px-3 py-2 text-right tabular">{inr(tot.revenue)}</td>
            <td className="px-3 py-2 text-right tabular">{tot.orders.toLocaleString('en-IN')}</td>
            <td className="px-3 py-2 text-right tabular">{inr(m.aov)}</td>
            <td className="px-3 py-2 text-right tabular">{inrShort(tot.expenses)}</td>
            <td className="px-3 py-2 text-right tabular text-emerald-700">{inrShort(m.profit)}</td>
            <td className="px-3 py-2 text-right tabular">{tot.present}/{tot.emp}</td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-right tabular">{tot.running}</td>
          </tr>
        ) : undefined}
      />
    </Card>
  )
}
