import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Armchair, Clock, IndianRupee, LayoutGrid, List, Percent, Plus, Users } from 'lucide-react'
import type { Table, TableStatus } from '@/types'
import { useStore } from '@/store/useStore'
import { isToday, usePermission, useScope, useWorkingOutlet } from '@/store/hooks'
import { Avatar, Button, Card, DataTable, PageHeader, Segmented, Select, StatCard, StatusBadge, Tabs, type Column } from '@/components/ui'
import { computeTotals } from '@/lib/billing'
import { cn, inr, inrShort } from '@/lib/format'
import { useNow } from '@/pages/kot/kotUtils'
import { TableShape } from './TableShape'
import { TableDrawer } from './TableDrawer'
import { TABLE_STATUSES, TS_STYLE, isBusy, waiterName } from './tableUtils'

type Row = Table & { amount: number; waiter?: string; minutes?: number }

export default function Tables() {
  const navigate = useNavigate()
  const tables = useStore((s) => s.tables)
  const orders = useStore((s) => s.orders)
  const outlets = useStore((s) => s.outlets)
  const employees = useStore((s) => s.employees)
  const { can } = usePermission()
  const editable = can('tables', 'edit')
  const { isAll, canSwitch, allowed } = useScope()
  const working = useWorkingOutlet()
  const [outletId, setOutletId] = useState(working)
  useEffect(() => setOutletId(working), [working])
  const [floor, setFloor] = useState('all')
  const [statusFilter, setStatusFilter] = useState<TableStatus | null>(null)
  const [view, setView] = useState<'map' | 'list'>('map')
  const [openId, setOpenId] = useState<string | null>(null)
  const now = useNow(30000)

  const outletTables = useMemo(() => tables.filter((t) => t.outletId === outletId), [tables, outletId])
  const floors = useMemo(() => Array.from(new Set(outletTables.map((t) => t.floor))), [outletTables])
  useEffect(() => { if (floor !== 'all' && !floors.includes(floor)) setFloor('all') }, [floors, floor])

  const rows: Row[] = useMemo(() => outletTables.map((t) => {
    const o = t.orderId ? orders.find((x) => x.id === t.orderId) : undefined
    return {
      ...t,
      amount: o ? computeTotals(o).total : 0,
      waiter: waiterName(t, employees),
      minutes: t.since && isBusy(t.status) ? Math.max(0, Math.floor((now - t.since) / 60000)) : undefined,
    }
  }), [outletTables, orders, employees, now])

  const visible = rows.filter((r) => (floor === 'all' || r.floor === floor) && (!statusFilter || r.status === statusFilter))
  const counts = TABLE_STATUSES.reduce((m, s) => ({ ...m, [s]: rows.filter((r) => r.status === s).length }), {} as Record<TableStatus, number>)
  const busyRows = rows.filter((r) => isBusy(r.status))
  const occupancy = rows.length ? Math.round((busyRows.length / rows.length) * 100) : 0
  const seatsUsed = busyRows.reduce((s, r) => s + (orders.find((o) => o.id === r.orderId)?.pax ?? Math.ceil(r.capacity / 2)), 0)
  const seatsTotal = rows.reduce((s, r) => s + r.capacity, 0)
  const runningValue = busyRows.reduce((s, r) => s + r.amount, 0)
  const turnaround = useMemo(() => {
    const done = orders.filter((o) => o.outletId === outletId && o.type === 'Dine-in' && o.status === 'Settled' && isToday(o.settledAt) && o.settledAt)
    if (!done.length) return 52
    return Math.round(done.reduce((s, o) => s + (o.settledAt! - o.createdAt), 0) / done.length / 60000)
  }, [orders, outletId])

  const columns: Column<Row>[] = [
    { key: 'label', header: 'Table', render: (r) => <span className="font-semibold text-slate-900">{r.label}</span> },
    { key: 'floor', header: 'Floor' },
    { key: 'capacity', header: 'Seats', align: 'right' },
    { key: 'shape', header: 'Shape', render: (r) => <span className="capitalize">{r.shape}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'waiter', header: 'Waiter', render: (r) => r.waiter ? <span className="flex items-center gap-1.5"><Avatar name={r.waiter} size={20} />{r.waiter}</span> : <span className="text-slate-400">—</span>, sortValue: (r) => r.waiter ?? '' },
    { key: 'minutes', header: 'Duration', align: 'right', render: (r) => r.minutes !== undefined ? `${r.minutes} min` : '—', sortValue: (r) => r.minutes ?? -1 },
    { key: 'amount', header: 'Running bill', align: 'right', render: (r) => r.amount ? <span className="font-medium">{inr(r.amount)}</span> : '—' },
    { key: 'res', header: 'Reservation', sortable: false, render: (r) => r.status === 'Reserved' ? <span className="text-[12px] text-violet-700">{r.reservedFor} · {r.reservedAt}</span> : '' },
  ]

  const floorGroups = (floor === 'all' ? floors : [floor]).map((f) => ({ floor: f, items: visible.filter((r) => r.floor === f) })).filter((g) => g.items.length)

  return (
    <div>
      <PageHeader title="Table Management" subtitle={`${outlets.find((o) => o.id === outletId)?.name ?? ''} · live floor status`}
        breadcrumbs={[{ label: 'Operations' }, { label: 'Tables' }]}
        actions={
          <>
            {canSwitch && isAll && (
              <Select className="w-44" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
                {allowed.map((id) => <option key={id} value={id}>{outlets.find((o) => o.id === id)?.short}</option>)}
              </Select>
            )}
            <Segmented value={view} onChange={setView} items={[{ value: 'map', label: 'Floor map', icon: <LayoutGrid className="size-3.5" /> }, { value: 'list', label: 'List', icon: <List className="size-3.5" /> }]} />
            {can('pos', 'create') && <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => navigate('/pos')}>New order</Button>}
          </>
        } />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Occupancy" value={`${occupancy}%`} icon={<Percent />} tone="blue" sub={`${busyRows.length} of ${rows.length} tables`} />
        <StatCard label="Guests seated" value={`${seatsUsed} / ${seatsTotal}`} icon={<Users />} tone="teal" sub="covers vs seats" />
        <StatCard label="Avg turnaround" value={`${turnaround} min`} icon={<Clock />} tone="violet" sub="seat → settle, today" />
        <StatCard label="Running value" value={inrShort(runningValue)} icon={<IndianRupee />} tone="green" sub={`${inr(runningValue)} on open tables`} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 pt-1">
          <Tabs value={floor} onChange={setFloor} className="border-0"
            items={[{ value: 'all', label: 'All floors', count: rows.length }, ...floors.map((f) => ({ value: f, label: f, count: rows.filter((r) => r.floor === f).length }))]} />
          <div className="flex flex-wrap items-center gap-1.5 py-2">
            {TABLE_STATUSES.map((s) => (
              <button key={s} onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                className={cn('inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-medium ring-1 ring-inset transition', TS_STYLE[s].chip, statusFilter && statusFilter !== s && 'opacity-40', statusFilter === s && 'ring-2')}>
                <span className={cn('size-2 rounded-full', TS_STYLE[s].dot)} />{s}<span className="font-bold tabular">{counts[s]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100">
          {view === 'map' ? (
            <div className="space-y-4 p-4">
              {floorGroups.length === 0 && <p className="py-10 text-center text-[12.5px] text-slate-500">No tables match this filter.</p>}
              {floorGroups.map((g) => (
                <div key={g.floor}>
                  <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-slate-600">
                    <Armchair className="size-3.5 text-slate-400" />{g.floor}
                    <span className="font-normal text-slate-400">· {g.items.filter((r) => isBusy(r.status)).length}/{g.items.length} occupied</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-5 rounded-xl border border-slate-200 p-5"
                    style={{ backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)', backgroundSize: '18px 18px', backgroundColor: '#fbfcfd' }}>
                    {g.items.map((r) => (
                      <TableShape key={r.id} table={r} amount={r.amount} waiter={r.waiter} minutes={r.minutes} selected={openId === r.id} onClick={() => setOpenId(r.id)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <DataTable columns={columns} rows={visible} onRowClick={(r) => setOpenId(r.id)} pageSize={15} />
          )}
        </div>
      </Card>

      {openId && <TableDrawer tableId={openId} onClose={() => setOpenId(null)} editable={editable} />}
    </div>
  )
}
