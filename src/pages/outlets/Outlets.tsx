import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { Armchair, Clock, Download, IndianRupee, MapPin, Pencil, Plus, ReceiptText, Store, TrendingDown, TrendingUp, UserRound, Users } from 'lucide-react'
import {
  Button, Card, CardHeader, DataTable, FilterBar, IconButton, PageHeader, Progress, SearchInput, Segmented, StatCard, type Column,
} from '@/components/ui'
import { useStore } from '@/store/useStore'
import { usePermission, useScope } from '@/store/hooks'
import { toast } from '@/store/toast'
import { OUTLETS } from '@/data/outlets'
import { cn, inr, inrShort } from '@/lib/format'
import type { Outlet } from '@/types'
import { useOutletStats, type OutletStat } from './outletStats'
import { OutletDetailDrawer, OutletStatusMenu } from './OutletDetailDrawer'
import { OutletFormModal } from './OutletFormModal'

type Row = Outlet & { st: OutletStat }

export default function Outlets() {
  const allOutlets = useStore((s) => s.outlets)
  const { outletIds, isAll } = useScope()
  const { can } = usePermission()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | Outlet['status']>('all')
  const [detail, setDetail] = useState<string | null>(null)
  const [form, setForm] = useState<{ open: boolean; id?: string | null }>({ open: false })

  useEffect(() => {
    if (params.get('new') === '1') {
      if (can('outlets', 'create')) setForm({ open: true, id: null })
      else toast.error('Permission denied', 'Your role cannot create outlets')
      params.delete('new')
      setParams(params, { replace: true })
    }
  }, [params]) // eslint-disable-line react-hooks/exhaustive-deps

  // Outlets in scope, plus newly-created outlets when viewing "All"
  const scoped = useMemo(
    () => allOutlets.filter((o) => outletIds.includes(o.id) || (isAll && !OUTLETS.some((x) => x.id === o.id))),
    [allOutlets, outletIds, isAll],
  )
  const stats = useOutletStats(scoped)
  const rows: Row[] = useMemo(() => scoped.map((o) => ({ ...o, st: stats[o.id] })).filter((o) => o.st), [scoped, stats])
  const filtered = rows.filter((r) => (status === 'all' || r.status === status) && (!q || `${r.name} ${r.code} ${r.city} ${r.manager}`.toLowerCase().includes(q.toLowerCase())))

  const totals = {
    sales: rows.reduce((s, r) => s + r.st.todaySales, 0),
    prev: rows.reduce((s, r) => s + r.st.yesterdaySales, 0),
    seats: rows.reduce((s, r) => s + r.seats, 0),
    staff: rows.reduce((s, r) => s + r.st.employees, 0),
    present: rows.reduce((s, r) => s + r.st.present, 0),
    open: rows.filter((r) => r.status === 'Open').length,
  }
  const maxSales = Math.max(1, ...rows.map((r) => r.st.weekSales))

  const exportCsv = () => {
    const lines = [['Code', 'Outlet', 'City', 'Manager', 'Status', 'Seats', 'Today Sales', 'Today Orders', '7-day Sales', 'Employees'], ...filtered.map((r) => [r.code, r.name, r.city, r.manager, r.status, r.seats, Math.round(r.st.todaySales), r.st.todayOrders, Math.round(r.st.weekSales), r.st.employees])]
    const csv = lines.map((l) => l.map((c) => `"${c}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'outlets.csv'
    a.click()
    toast.success('Exported outlets.csv', `${filtered.length} outlets`)
  }

  const columns: Column<Row>[] = [
    {
      key: 'name', header: 'Outlet', sortValue: (r) => r.short,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
          <div className="min-w-0">
            <p className="font-medium text-slate-800">{r.short}</p>
            <p className="text-[10.5px] text-slate-400">{r.code} · {r.city}</p>
          </div>
        </div>
      ),
    },
    { key: 'manager', header: 'Manager' },
    { key: 'status', header: 'Status', render: (r) => <OutletStatusMenu outletId={r.id} size="xs" />, sortValue: (r) => r.status },
    { key: 'sales', header: 'Today', align: 'right', sortValue: (r) => r.st.todaySales, render: (r) => <span className="font-semibold text-slate-900">{inr(r.st.todaySales)}</span> },
    { key: 'orders', header: 'Orders', align: 'right', sortValue: (r) => r.st.todayOrders, render: (r) => r.st.todayOrders },
    { key: 'aov', header: 'Avg bill', align: 'right', sortValue: (r) => r.st.todaySales / (r.st.todayOrders || 1), render: (r) => inr(r.st.todaySales / (r.st.todayOrders || 1)) },
    {
      key: 'week', header: '7-day sales', sortValue: (r) => r.st.weekSales, width: 180,
      render: (r) => (
        <div className="flex items-center gap-2">
          <Progress value={(r.st.weekSales / maxSales) * 100} className="w-20" tone="navy" />
          <span className="tabular text-slate-600">{inrShort(r.st.weekSales)}</span>
        </div>
      ),
    },
    { key: 'tables', header: 'Running', align: 'right', sortValue: (r) => r.st.running, render: (r) => `${r.st.running}/${r.st.tables}` },
    { key: 'staff', header: 'Staff in', align: 'right', sortValue: (r) => r.st.present, render: (r) => `${r.st.present}/${r.st.employees}` },
    { key: 'seats', header: 'Seats', align: 'right' },
    {
      key: 'act', header: '', sortable: false, align: 'right',
      render: (r) => can('outlets', 'edit') ? <IconButton tooltip="Edit" onClick={(e) => { e.stopPropagation(); setForm({ open: true, id: r.id }) }}><Pencil className="size-3.5" /></IconButton> : null,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Outlet Management"
        subtitle="Branches, operating status, compliance and performance"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Outlets' }]}
        actions={
          <>
            <Button icon={<Download className="size-3.5" />} onClick={exportCsv}>Export</Button>
            {can('outlets', 'create') && <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setForm({ open: true, id: null })}>Add outlet</Button>}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Outlets" value={rows.length} icon={<Store />} sub={`${totals.open} open now`} />
        <StatCard label="Today’s sales (all)" value={inrShort(totals.sales)} icon={<IndianRupee />} tone="teal" delta={totals.prev ? ((totals.sales - totals.prev) / totals.prev) * 100 : 0} sub="vs same time yesterday" />
        <StatCard label="Total seats" value={totals.seats} icon={<Armchair />} tone="violet" sub={`${rows.reduce((s, r) => s + r.st.tables, 0)} tables`} />
        <StatCard label="Staff on duty" value={`${totals.present}/${totals.staff}`} icon={<Users />} tone="orange" sub="checked in today" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput className="w-64" placeholder="Search outlet, code, city, manager…" value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} />
        <Segmented size="sm" value={status} onChange={setStatus} items={[{ value: 'all', label: 'All' }, { value: 'Open', label: 'Open' }, { value: 'Closed', label: 'Closed' }, { value: 'Maintenance', label: 'Maintenance' }]} />
        <span className="ml-auto text-[12px] text-slate-500">{filtered.length} of {rows.length} outlets</span>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {filtered.map((r) => <OutletCard key={r.id} r={r} onOpen={() => setDetail(r.id)} onEdit={can('outlets', 'edit') ? () => setForm({ open: true, id: r.id }) : undefined} />)}
        {can('outlets', 'create') && (
          <button onClick={() => setForm({ open: true, id: null })} className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 transition hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-600">
            <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100"><Plus className="size-5" /></span>
            <span className="text-[13px] font-medium">Add new outlet</span>
            <span className="text-[11px]">Set up a branch in under a minute</span>
          </button>
        )}
      </div>

      <Card>
        <CardHeader title="Outlet comparison" subtitle="Today’s performance across branches · click a row for details" icon={<ReceiptText className="size-3.5" />} />
        <FilterBar className="text-[11.5px] text-slate-500">Sorted by any column · live settled orders included in today’s numbers</FilterBar>
        <DataTable columns={columns} rows={filtered} onRowClick={(r) => setDetail(r.id)} pageSize={0} />
      </Card>

      <OutletDetailDrawer outletId={detail} onClose={() => setDetail(null)} onEdit={(id) => { setDetail(null); setForm({ open: true, id }) }} />
      <OutletFormModal open={form.open} editId={form.id} onClose={() => setForm({ open: false })} />
    </div>
  )
}

function OutletCard({ r, onOpen, onEdit }: { r: Row; onOpen: () => void; onEdit?: () => void }) {
  const d = r.st.yesterdaySales ? ((r.st.todaySales - r.st.yesterdaySales) / r.st.yesterdaySales) * 100 : 0
  return (
    <Card className="group relative cursor-pointer overflow-hidden transition hover:border-slate-300 hover:shadow-md" onClick={onOpen}>
      <div className="h-1" style={{ background: r.color }} />
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white" style={{ background: r.color }}>{r.code.split('-')[1] ?? r.code.slice(0, 2)}</span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-slate-900">{r.short}</p>
              <p className="flex items-center gap-1 text-[11px] text-slate-400"><MapPin className="size-3" />{r.city} · {r.code}</p>
            </div>
          </div>
          <OutletStatusMenu outletId={r.id} size="xs" />
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-[11px] text-slate-500">Today’s sales</p>
            <p className="text-[18px] font-semibold leading-tight text-slate-900 tabular">{inr(r.st.todaySales)}</p>
            <p className={cn('mt-0.5 flex items-center gap-0.5 text-[11px] font-medium', d >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
              {d >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}{Math.abs(d).toFixed(1)}% <span className="font-normal text-slate-400">vs yesterday</span>
            </p>
          </div>
          <div className="h-12 w-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={r.st.week} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`spark_${r.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={r.color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={r.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="sales" stroke={r.color} strokeWidth={1.75} fill={`url(#spark_${r.id})`} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg bg-slate-50 py-1.5"><p className="text-[13px] font-semibold text-slate-800 tabular">{r.st.todayOrders}</p><p className="text-[10px] text-slate-400">Orders</p></div>
          <div className="rounded-lg bg-slate-50 py-1.5"><p className="text-[13px] font-semibold text-slate-800 tabular">{r.st.employees}</p><p className="text-[10px] text-slate-400">Employees</p></div>
          <div className="rounded-lg bg-slate-50 py-1.5"><p className="text-[13px] font-semibold text-slate-800 tabular">{r.seats}</p><p className="text-[10px] text-slate-400">Seats</p></div>
        </div>

        <div className="mt-3 space-y-1 border-t border-slate-100 pt-2.5 text-[11.5px] text-slate-500">
          <p className="flex items-center gap-1.5"><UserRound className="size-3 text-slate-400" />{r.manager}</p>
          <p className="flex items-center gap-1.5"><Clock className="size-3 text-slate-400" />{r.hours}</p>
        </div>
        {onEdit && (
          <button onClick={(e) => { e.stopPropagation(); onEdit() }} className="absolute bottom-3 right-3 rounded-md p-1 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100" title="Edit outlet">
            <Pencil className="size-3.5" />
          </button>
        )}
      </div>
    </Card>
  )
}
