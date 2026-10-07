import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, Clock, Download, IndianRupee, Plus, Receipt, ShoppingBag, TrendingUp } from 'lucide-react'
import { Badge, Button, Card, DataTable, FilterBar, PageHeader, SearchInput, Select, StatCard, StatusBadge, Tabs, type Column } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { isToday, usePermission, useScope, useScopedOrders } from '@/store/hooks'
import { toast } from '@/store/toast'
import { computeTotals } from '@/lib/billing'
import { fmtDateShort, fmtTime, inr, inrShort } from '@/lib/format'
import type { Order, OrderSource, PayMode } from '@/types'
import { PAY_TONE, SOURCE_TONE } from '@/pages/pos/posUtils'
import { OrderDrawer } from './OrderDrawer'

type Tab = 'running' | 'settled' | 'online' | 'cancelled' | 'all'
const RUNNING = ['Running', 'Billed', 'Hold', 'Draft']
const ONLINE: OrderSource[] = ['Swiggy', 'Zomato', 'QR Order']
const SOURCES: OrderSource[] = ['POS', 'Waiter App', 'QR Order', 'Swiggy', 'Zomato', 'Phone']
const MODES: PayMode[] = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Wallet', 'Due', 'Room']

type Row = Order & { total: number; qty: number }

export default function Orders() {
  const nav = useNavigate()
  const { can } = usePermission()
  const { isAll } = useScope()
  const outlets = useStore((s) => s.outlets)
  const scoped = useScopedOrders()
  const [tab, setTab] = useState<Tab>('running')
  const [q, setQ] = useState('')
  const [source, setSource] = useState('')
  const [mode, setMode] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const rows: Row[] = useMemo(() => scoped.filter((o) => o.status !== 'Draft' || o.items.length > 0).map((o) => { const t = computeTotals(o); return { ...o, total: t.total, qty: t.qty } }), [scoped])

  const stats = useMemo(() => {
    const settled = rows.filter((o) => o.status === 'Settled' && isToday(o.settledAt))
    const sales = settled.reduce((s, o) => s + o.total, 0)
    const running = rows.filter((o) => RUNNING.includes(o.status))
    const cancelled = rows.filter((o) => o.status === 'Cancelled' && isToday(o.createdAt))
    return { bills: settled.length, sales, running: running.length, runningValue: running.reduce((s, o) => s + o.total, 0), cancelled: cancelled.length, cancelledValue: cancelled.reduce((s, o) => s + o.total, 0), avg: settled.length ? sales / settled.length : 0 }
  }, [rows])

  const inTab = (o: Row, t: Tab) =>
    t === 'all' ? true : t === 'running' ? RUNNING.includes(o.status) : t === 'settled' ? o.status === 'Settled' : t === 'online' ? ONLINE.includes(o.source) : o.status === 'Cancelled'

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows
      .filter((o) => inTab(o, tab))
      .filter((o) => !source || o.source === source)
      .filter((o) => !mode || o.payments.some((p) => p.mode === mode))
      .filter((o) => !s || [o.no, o.billNo, o.customerName, o.customerPhone, o.tableLabel, o.waiterName].some((v) => v?.toLowerCase().includes(s)))
      .sort((a, b) => (b.settledAt ?? b.createdAt) - (a.settledAt ?? a.createdAt))
  }, [rows, tab, source, mode, q])

  const count = (t: Tab) => rows.filter((o) => inTab(o, t)).length
  const outletName = (id: string) => outlets.find((o) => o.id === id)?.short ?? id

  const columns: Column<Row>[] = [
    { key: 'billNo', header: 'Bill / Order', sortValue: (o) => o.billNo ?? o.no, render: (o) => (
      <div><p className="font-semibold text-slate-800">{o.billNo ?? <span className="text-slate-400">—</span>}</p><p className="font-mono text-[11px] text-slate-400">{o.no}</p></div>
    ) },
    { key: 'time', header: 'Time', sortValue: (o) => o.settledAt ?? o.createdAt, render: (o) => <div><p>{fmtTime(o.settledAt ?? o.createdAt)}</p><p className="text-[11px] text-slate-400">{fmtDateShort(o.createdAt)}</p></div> },
    ...(isAll ? [{ key: 'outlet', header: 'Outlet', sortValue: (o: Row) => outletName(o.outletId), render: (o: Row) => <Badge tone="gray">{outletName(o.outletId)}</Badge> }] : []),
    { key: 'type', header: 'Type' },
    { key: 'source', header: 'Source', render: (o) => <Badge tone={SOURCE_TONE[o.source]}>{o.source}</Badge> },
    { key: 'tableLabel', header: 'Table', render: (o) => o.tableLabel ? <span className="font-semibold">{o.tableLabel}</span> : <span className="text-slate-300">—</span> },
    { key: 'customerName', header: 'Customer', render: (o) => o.customerName ? <div><p className="truncate">{o.customerName}</p>{o.customerPhone && <p className="text-[11px] text-slate-400">{o.customerPhone}</p>}</div> : <span className="text-slate-400">Walk-in</span> },
    { key: 'qty', header: 'Items', align: 'right' },
    { key: 'total', header: 'Amount', align: 'right', render: (o) => <span className="font-semibold text-slate-900">{inr(o.total)}</span> },
    { key: 'pay', header: 'Payment', sortable: false, render: (o) => o.payments.length ? <div className="flex flex-wrap gap-1">{o.payments.map((p, i) => <Badge key={i} tone={PAY_TONE[p.mode]}>{p.mode}</Badge>)}</div> : <span className="text-slate-300">—</span> },
    { key: 'status', header: 'Status', render: (o) => <span className="flex items-center gap-1"><StatusBadge status={o.status} />{o.resettlements?.length ? <Badge tone="amber">R</Badge> : null}</span> },
  ]

  return (
    <div>
      <PageHeader title="Orders & Bills" subtitle="Every bill across POS, Waiter App, QR ordering and aggregators — live" breadcrumbs={[{ label: 'Operations' }, { label: 'Orders & Bills' }]}
        actions={<>
          <Button icon={<Download className="size-3.5" />} onClick={() => toast.success('Export started', `${filtered.length} bills → Excel (simulated)`)} disabled={!can('pos', 'export') && !can('reports', 'export')}>Export</Button>
          {can('pos', 'create') && <Button variant="primary" icon={<Plus className="size-3.5" />} kbd="Ctrl+B" onClick={() => nav('/pos?new=1')}>New bill</Button>}
        </>} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Today's bills" value={stats.bills} icon={<Receipt />} tone="navy" sub="settled today" onClick={() => setTab('settled')} />
        <StatCard label="Sales today" value={inrShort(stats.sales)} icon={<IndianRupee />} tone="teal" delta={8.4} sub="vs yesterday" />
        <StatCard label="Running orders" value={stats.running} icon={<Clock />} tone="blue" sub={`${inr(stats.runningValue)} open`} onClick={() => setTab('running')} />
        <StatCard label="Cancelled" value={stats.cancelled} icon={<Ban />} tone="red" sub={stats.cancelledValue ? inr(stats.cancelledValue) + ' value' : 'today'} onClick={() => setTab('cancelled')} />
        <StatCard label="Avg bill value" value={inr(stats.avg)} icon={<TrendingUp />} tone="violet" delta={3.1} sub="per settled bill" />
      </div>

      <Card>
        <Tabs className="px-2" value={tab} onChange={setTab} items={[
          { value: 'running', label: 'Running', count: count('running'), icon: <Clock className="size-3.5" /> },
          { value: 'settled', label: 'Settled', count: count('settled') },
          { value: 'online', label: 'Online (Swiggy / Zomato / QR)', count: count('online'), icon: <ShoppingBag className="size-3.5" /> },
          { value: 'cancelled', label: 'Cancelled', count: count('cancelled') },
          { value: 'all', label: 'All', count: rows.length },
        ]} />
        <FilterBar>
          <SearchInput className="w-full sm:w-72" placeholder="Bill no, order, customer, phone, table…" value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} />
          <Select className="w-40" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All sources</option>
            {SOURCES.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Select className="w-40" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="">All payment modes</option>
            {MODES.map((s) => <option key={s}>{s}</option>)}
          </Select>
          {(q || source || mode) && <Button variant="ghost" size="sm" onClick={() => { setQ(''); setSource(''); setMode('') }}>Clear</Button>}
          <span className="ml-auto text-[12px] text-slate-500">{filtered.length} orders · <b className="text-slate-800">{inr(filtered.reduce((s, o) => s + (o.status === 'Cancelled' ? 0 : o.total), 0))}</b></span>
        </FilterBar>
        <DataTable columns={columns} rows={filtered} onRowClick={(o) => setOpenId(o.id)} pageSize={12}
          rowClassName={(o) => (o.status === 'Cancelled' ? 'opacity-60' : undefined)} />
      </Card>

      <OrderDrawer orderId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
