import { useEffect, useMemo, useState } from 'react'
import { Clock, CreditCard, History, IndianRupee, RefreshCcw, Wallet, Timer, Receipt, Download } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, FilterBar, PageHeader, SearchInput, Segmented, Select, StatCard, StatusBadge, Tabs, tooltipStyle, type Column } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { isToday, usePermission, useScope, useScopedOrders } from '@/store/hooks'
import { toast } from '@/store/toast'
import { computeTotals } from '@/lib/billing'
import { cn, fmtDateShort, fmtTime, inr, inrShort, minutesSince } from '@/lib/format'
import type { PayMode } from '@/types'
import { PAY_COLOR, PAY_TONE, SOURCE_TONE } from '@/pages/pos/posUtils'
import { SettlementModal } from './SettlementModal'
import { Resettlement } from './Resettlement'

type Tab = 'pending' | 'resettle' | 'history'

export default function Settlement() {
  const [tab, setTab] = useState<Tab>('pending')
  const scoped = useScopedOrders()
  const pending = useMemo(() => scoped.filter((o) => (o.status === 'Billed' || o.status === 'Running') && o.items.some((i) => !i.cancelled)), [scoped])
  const resettleCount = scoped.reduce((s, o) => s + (o.resettlements?.length ?? 0), 0)
  return (
    <div>
      <PageHeader title="Settlement & Resettlement" subtitle="Collect payments, correct payment modes with approval, and audit every rupee"
        breadcrumbs={[{ label: 'Operations' }, { label: 'Settlement' }]} />
      <Tabs className="mb-4" value={tab} onChange={setTab} items={[
        { value: 'pending', label: 'Pending settlement', count: pending.length, icon: <Clock className="size-3.5" /> },
        { value: 'resettle', label: 'Resettlement', count: resettleCount, icon: <RefreshCcw className="size-3.5" /> },
        { value: 'history', label: 'Payment history', icon: <History className="size-3.5" /> },
      ]} />
      {tab === 'pending' && <Pending />}
      {tab === 'resettle' && <Resettlement />}
      {tab === 'history' && <PaymentHistory />}
    </div>
  )
}

/* ------------------------------------------------------------ Pending */
function Pending() {
  const scoped = useScopedOrders()
  const { isAll } = useScope()
  const { can } = usePermission()
  const outlets = useStore((s) => s.outlets)
  const [settleId, setSettleId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'Billed' | 'Running'>('all')
  const [, tick] = useState(0)
  useEffect(() => { const i = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(i) }, [])

  const list = useMemo(() => scoped.filter((o) => (o.status === 'Billed' || o.status === 'Running') && o.items.some((i) => !i.cancelled))
    .map((o) => ({ o, t: computeTotals(o).total })).sort((a, b) => a.o.createdAt - b.o.createdAt), [scoped])
  const shown = list.filter((x) => filter === 'all' || x.o.status === filter)
  const sum = list.reduce((s, x) => s + x.t, 0)
  const billed = list.filter((x) => x.o.status === 'Billed')
  const oldest = list[0] ? minutesSince(list[0].o.createdAt) : 0
  const canSettle = can('settlement', 'create') || can('pos', 'create')

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending bills" value={list.length} icon={<Receipt />} tone="navy" sub="running + billed" />
        <StatCard label="Amount to collect" value={inr(sum)} icon={<IndianRupee />} tone="teal" sub="across open orders" />
        <StatCard label="Bill printed, unpaid" value={billed.length} icon={<Wallet />} tone="violet" sub={inr(billed.reduce((s, x) => s + x.t, 0))} />
        <StatCard label="Oldest open order" value={`${oldest} min`} icon={<Timer />} tone={oldest > 60 ? 'red' : 'amber'} sub={list[0] ? list[0].o.tableLabel ? 'Table ' + list[0].o.tableLabel : list[0].o.type : '—'} />
      </div>
      <Card>
        <CardHeader title="Awaiting settlement" subtitle="Click a bill to collect payment" icon={<Clock className="size-3.5" />}
          actions={<Segmented size="sm" value={filter} onChange={setFilter} items={[{ value: 'all', label: `All ${list.length}` }, { value: 'Billed', label: `Billed ${billed.length}` }, { value: 'Running', label: `Running ${list.length - billed.length}` }]} />} />
        {shown.length === 0 ? <EmptyState icon={<Receipt />} title="All caught up" body="No bills are waiting for settlement in this scope." /> : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {shown.map(({ o, t }) => {
              const mins = minutesSince(o.createdAt)
              return (
                <button key={o.id} disabled={!canSettle} onClick={() => setSettleId(o.id)}
                  className={cn('group rounded-xl border bg-white p-3 text-left transition hover:-translate-y-px hover:border-brand-300 hover:shadow-md disabled:cursor-not-allowed', mins > 60 ? 'border-rose-200' : mins > 40 ? 'border-amber-200' : 'border-slate-200')}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[15px] font-bold text-slate-900">{o.tableLabel ? `Table ${o.tableLabel}` : o.type}</p>
                      <p className="font-mono text-[11px] text-slate-400">{o.billNo ?? o.no}{isAll && ` · ${outlets.find((x) => x.id === o.outletId)?.short}`}</p>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="mt-2 truncate text-[11.5px] text-slate-500">{o.items.filter((i) => !i.cancelled).map((i) => `${i.qty}× ${i.name}`).join(', ')}</p>
                  <div className="mt-3 flex items-end justify-between">
                    <div className="flex flex-col gap-1">
                      <Badge tone={SOURCE_TONE[o.source]}>{o.source}</Badge>
                      <span className={cn('flex items-center gap-1 text-[11px] font-medium', mins > 60 ? 'text-rose-600' : mins > 40 ? 'text-amber-600' : 'text-slate-400')}><Timer className="size-3" />{mins} min{o.waiterName && ` · ${o.waiterName}`}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[18px] font-bold text-navy-900 tabular">{inr(t)}</p>
                      <span className="text-[11px] font-semibold text-brand-600 opacity-0 transition group-hover:opacity-100">Settle →</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Card>
      <SettlementModal orderId={settleId} open={!!settleId} onClose={() => setSettleId(null)} />
    </>
  )
}

/* ------------------------------------------------------------ Payment history */
interface PayRow { id: string; at: number; bill: string; mode: PayMode; amount: number; cashier: string; outletId: string; resettled: boolean; ref?: string }

function PaymentHistory() {
  const scoped = useScopedOrders()
  const { isAll } = useScope()
  const outlets = useStore((s) => s.outlets)
  const [range, setRange] = useState<'today' | 'all'>('all')
  const [q, setQ] = useState('')
  const [mode, setMode] = useState('')

  const all: PayRow[] = useMemo(() => scoped.filter((o) => o.status === 'Settled').flatMap((o) => o.payments.map((p, i) => ({
    id: o.id + '_' + i, at: p.at, bill: o.billNo ?? o.no, mode: p.mode, amount: p.amount, cashier: o.cashier ?? '—', outletId: o.outletId, resettled: !!o.resettlements?.length, ref: p.ref,
  }))).sort((a, b) => b.at - a.at), [scoped])
  const inRange = all.filter((r) => range === 'all' || isToday(r.at))
  const rows = inRange.filter((r) => (!mode || r.mode === mode) && (!q || r.bill.toLowerCase().includes(q.toLowerCase()) || r.cashier.toLowerCase().includes(q.toLowerCase())))
  const byMode = useMemo(() => {
    const m: Partial<Record<PayMode, { amount: number; count: number }>> = {}
    inRange.forEach((r) => { m[r.mode] = { amount: (m[r.mode]?.amount ?? 0) + r.amount, count: (m[r.mode]?.count ?? 0) + 1 } })
    return (Object.entries(m) as [PayMode, { amount: number; count: number }][]).sort((a, b) => b[1].amount - a[1].amount)
  }, [inRange])
  const total = inRange.reduce((s, r) => s + r.amount, 0)
  const outletName = (id: string) => outlets.find((o) => o.id === id)?.short ?? id

  const columns: Column<PayRow>[] = [
    { key: 'at', header: 'Time', render: (r) => <div><p>{fmtTime(r.at)}</p><p className="text-[11px] text-slate-400">{fmtDateShort(r.at)}</p></div> },
    { key: 'bill', header: 'Bill', render: (r) => <span className="font-semibold">{r.bill}{r.resettled && <Badge tone="amber" className="ml-1.5">Resettled</Badge>}</span> },
    { key: 'mode', header: 'Mode', render: (r) => <Badge tone={PAY_TONE[r.mode]}>{r.mode}</Badge> },
    { key: 'ref', header: 'Reference', sortable: false, render: (r) => <span className="font-mono text-[11px] text-slate-400">{r.ref ?? '—'}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <b className="tabular">{inr(r.amount)}</b> },
    { key: 'cashier', header: 'Cashier' },
    ...(isAll ? [{ key: 'outletId', header: 'Outlet', sortValue: (r: PayRow) => outletName(r.outletId), render: (r: PayRow) => <Badge tone="gray">{outletName(r.outletId)}</Badge> }] : []),
  ]

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Card className="min-w-0">
        <FilterBar>
          <Segmented size="sm" value={range} onChange={setRange} items={[{ value: 'today', label: 'Today' }, { value: 'all', label: 'All (2 days)' }]} />
          <SearchInput className="w-56" placeholder="Bill no or cashier…" value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} />
          <Select className="w-40" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="">All modes</option>
            {(['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Wallet', 'Due'] as PayMode[]).map((m) => <option key={m}>{m}</option>)}
          </Select>
          <Button size="sm" className="ml-auto" icon={<Download className="size-3.5" />} onClick={() => toast.success('Payment register exported', `${rows.length} rows (simulated)`)}>Export</Button>
        </FilterBar>
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-3 py-2.5">
          {byMode.map(([m, v]) => (
            <button key={m} onClick={() => setMode(mode === m ? '' : m)}
              className={cn('flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] transition', mode === m ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-200 hover:bg-slate-50')}>
              <span className="size-2 rounded-full" style={{ background: PAY_COLOR[m] }} /><b>{m}</b><span className={mode === m ? 'text-white/70' : 'text-slate-500'}>{inrShort(v.amount)} · {v.count}</span>
            </button>
          ))}
        </div>
        <DataTable columns={columns} rows={rows} pageSize={12} dense />
      </Card>
      <Card>
        <CardHeader title="Payment mode split" subtitle={`${inr(total)} collected · ${inRange.length} payments`} icon={<CreditCard className="size-3.5" />} />
        <div className="relative h-[220px] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={byMode.map(([m, v]) => ({ name: m, value: Math.round(v.amount) }))} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="#fff">
                {byMode.map(([m]) => <Cell key={m} fill={PAY_COLOR[m]} />)}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={(v) => inr(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[11px] text-slate-400">Total</span>
            <span className="text-[17px] font-bold text-slate-900 tabular">{inrShort(total)}</span>
          </div>
        </div>
        <div className="space-y-2 px-4 pb-4">
          {byMode.map(([m, v]) => (
            <div key={m} className="flex items-center gap-2 text-[12px]">
              <span className="size-2.5 rounded-sm" style={{ background: PAY_COLOR[m] }} />
              <span className="flex-1 text-slate-600">{m}</span>
              <span className="text-slate-400 tabular">{total ? ((v.amount / total) * 100).toFixed(1) : 0}%</span>
              <span className="w-20 text-right font-medium tabular">{inr(v.amount)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
