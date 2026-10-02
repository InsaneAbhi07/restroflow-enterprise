import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BellRing, ChefHat, Clock, CookingPot, Flame, Hourglass, IndianRupee, Keyboard, LayoutGrid, ReceiptText, ShoppingBag, Smartphone, Timer,
  UtensilsCrossed, Wallet, CheckCheck, Play,
} from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, Kbd, PageHeader, Progress, StatCard, StatusBadge, VegMark } from '@/components/ui'
import { useUI } from '@/components/layout/uiStore'
import { useStore } from '@/store/useStore'
import { isToday, useCurrentUser, usePermission, useScope, useScopedOrders } from '@/store/hooks'
import { toast } from '@/store/toast'
import { computeTotals } from '@/lib/billing'
import { cn, elapsed, inr, inrShort, minutesSince } from '@/lib/format'
import type { Kot, PayMode } from '@/types'
import { greeting, SourceBadge, todayLong, useDashMetrics } from './dashShared'
import { TopItemsCard } from './OwnerCharts'
import { LowStockCard, RecentOrdersCard } from './Widgets'

function useTick(ms = 1000) {
  const [, set] = useState(0)
  useEffect(() => {
    const t = setInterval(() => set((x) => x + 1), ms)
    return () => clearInterval(t)
  }, [ms])
}

const outletName = (id?: string) => useStore.getState().outlets.find((o) => o.id === id)?.short ?? ''

/* ================================================================== Cashier */
const SHORTCUTS: [string, string][] = [
  ['Ctrl+B', 'New bill'], ['F2', 'Search item'], ['F9', 'Generate KOT'], ['F4', 'Settle bill'],
  ['F8', 'Print bill'], ['Ctrl+S', 'Save / hold'], ['Ctrl+K', 'Global search'], ['F1', 'All shortcuts'],
]
export function CashierDashboard() {
  useTick(30000)
  const user = useCurrentUser()
  const orders = useScopedOrders()
  const { single, outletIds } = useScope()
  const tables = useStore((s) => s.tables)
  const nav = useNavigate()
  const ui = useUI()

  const d = useMemo(() => {
    const settled = orders.filter((o) => o.status === 'Settled' && isToday(o.settledAt))
    const mine = settled.filter((o) => o.cashier === user.name)
    const sum = (a: typeof orders) => a.reduce((s, o) => s + computeTotals(o).total, 0)
    const pending = orders.filter((o) => o.status === 'Billed')
    const running = orders.filter((o) => o.status === 'Running' || o.status === 'Hold')
    const modes: Partial<Record<PayMode, number>> = {}
    mine.forEach((o) => o.payments.forEach((p) => (modes[p.mode] = (modes[p.mode] ?? 0) + p.amount)))
    return { settled, mine, mineTotal: sum(mine), allTotal: sum(settled), pending, pendingTotal: sum(pending), running, modes }
  }, [orders, user.name])
  const runningTables = tables.filter((t) => outletIds.includes(t.outletId) && (t.status === 'Occupied' || t.status === 'Billing'))
  const modeTotal = Object.values(d.modes).reduce((s, v) => s + (v ?? 0), 0) || 1

  return (
    <div className="space-y-4">
      <PageHeader className="mb-0" title={`${greeting()}, ${user.name.split(' ')[0]}`} subtitle={`${todayLong()} · Billing counter · ${outletName(single ?? outletIds[0])}`}
        actions={<>
          <Button onClick={() => nav('/settlement')} icon={<Wallet className="size-3.5" />}>Settlement</Button>
          <Button variant="accent" size="lg" icon={<ReceiptText className="size-4" />} kbd="Ctrl+B" onClick={() => nav('/pos?new=1')}>New Bill</Button>
        </>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Today’s bills (outlet)" value={d.settled.length} icon={<ReceiptText />} sub={inrShort(d.allTotal) + ' collected'} onClick={() => nav('/orders')} />
        <StatCard label="My sales today" value={inr(d.mineTotal)} icon={<IndianRupee />} tone="teal" sub={`${d.mine.length} bills settled by you`} />
        <StatCard label="Running tables" value={runningTables.length} icon={<LayoutGrid />} tone="blue" sub={`${d.running.length} open orders`} onClick={() => nav('/tables')} />
        <StatCard label="Awaiting settlement" value={d.pending.length} icon={<Hourglass />} tone="amber" sub={inr(d.pendingTotal)} onClick={() => nav('/settlement')} />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader title="Running tables" subtitle="Tap a table to open its bill in POS" icon={<LayoutGrid className="size-3.5" />} actions={<Button size="xs" variant="ghost" onClick={() => nav('/tables')}>Floor plan</Button>} />
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4">
            {runningTables.map((t) => {
              const o = orders.find((x) => x.id === t.orderId)
              return (
                <button key={t.id} onClick={() => nav('/pos')} className={cn('rounded-xl border p-2.5 text-left transition hover:shadow-md', t.status === 'Billing' ? 'border-amber-200 bg-amber-50/60' : 'border-sky-200 bg-sky-50/50')}>
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-bold text-slate-900">{t.label}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="mt-1 text-[13px] font-semibold text-slate-800 tabular">{o ? inr(computeTotals(o).total) : '—'}</p>
                  <p className="flex items-center gap-1 text-[10.5px] text-slate-500"><Clock className="size-3" />{t.since ? `${minutesSince(t.since)} min` : '-'} · {o?.items.length ?? 0} items · {o?.waiterName ?? ''}</p>
                </button>
              )
            })}
            {!runningTables.length && <EmptyState className="col-span-full" title="No running tables" body="All tables are free right now." />}
          </div>
        </Card>
        <div className="space-y-4 xl:col-span-4">
          <Card>
            <CardHeader title="Keyboard shortcuts" subtitle="Bill faster without the mouse" icon={<Keyboard className="size-3.5" />} actions={<Button size="xs" variant="ghost" onClick={() => ui.setHelp(true)}>All</Button>} />
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 p-4">
              {SHORTCUTS.map(([k, l]) => (
                <div key={k} className="flex items-center gap-2 text-[12px] text-slate-600"><Kbd className="min-w-[44px]">{k}</Kbd>{l}</div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="My collections by mode" subtitle="Today" icon={<Wallet className="size-3.5" />} />
            <div className="space-y-2 p-4">
              {Object.entries(d.modes).map(([mode, v]) => (
                <div key={mode} className="text-[12px]">
                  <div className="mb-0.5 flex justify-between"><span className="text-slate-600">{mode}</span><span className="font-semibold text-slate-800 tabular">{inr(v ?? 0)}</span></div>
                  <Progress value={((v ?? 0) / modeTotal) * 100} tone={mode === 'Cash' ? 'navy' : mode === 'UPI' ? 'teal' : 'violet'} />
                </div>
              ))}
              {!Object.keys(d.modes).length && <p className="py-3 text-center text-[12px] text-slate-400">No bills settled by you yet today.</p>}
            </div>
          </Card>
        </div>
      </div>
      <RecentOrdersCard limit={8} />
    </div>
  )
}

/* ================================================================== Waiter */
export function WaiterDashboard() {
  useTick(30000)
  const user = useCurrentUser()
  const orders = useScopedOrders()
  const { outletIds } = useScope()
  const tables = useStore((s) => s.tables)
  const kots = useStore((s) => s.kots)
  const updateKot = useStore((s) => s.updateKotStatus)
  const ui = useUI()
  const nav = useNavigate()
  const empId = user.employeeId

  const myTables = tables.filter((t) => outletIds.includes(t.outletId) && t.waiterId === empId && t.waiterId)
  const myOrders = orders.filter((o) => o.waiterId === empId && (isToday(o.createdAt) || o.status === 'Running' || o.status === 'Billed'))
  const myOrderIds = new Set(myOrders.map((o) => o.id))
  const ready = kots.filter((k) => myOrderIds.has(k.orderId) && k.status === 'Ready')
  const inKitchen = kots.filter((k) => myOrderIds.has(k.orderId) && (k.status === 'New' || k.status === 'Preparing'))
  const mySales = myOrders.filter((o) => o.status === 'Settled').reduce((s, o) => s + computeTotals(o).total, 0)
  const freeTables = tables.filter((t) => outletIds.includes(t.outletId) && t.status === 'Available').length

  return (
    <div className="space-y-4">
      <PageHeader className="mb-0" title={`${greeting()}, ${user.name.split(' ')[0]}`} subtitle={`${todayLong()} · Captain / Waiter · ${outletName(outletIds[0])}`}
        actions={<Button variant="accent" size="lg" icon={<Smartphone className="size-4" />} onClick={() => ui.setMobilePreview(true)}>Open Staff Mobile App</Button>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="My tables" value={myTables.length} icon={<LayoutGrid />} tone="blue" sub={`${freeTables} tables free in outlet`} onClick={() => nav('/tables')} />
        <StatCard label="My orders today" value={myOrders.length} icon={<ShoppingBag />} sub={`${inKitchen.length} in kitchen`} />
        <StatCard label="Ready to serve" value={ready.length} icon={<BellRing />} tone={ready.length ? 'amber' : 'green'} sub="pick up from pass" />
        <StatCard label="My sales today" value={inrShort(mySales)} icon={<IndianRupee />} tone="teal" sub="settled bills" />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader title="My assigned tables" subtitle="Live status" icon={<UtensilsCrossed className="size-3.5" />} />
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
            {myTables.map((t) => {
              const o = orders.find((x) => x.id === t.orderId)
              return (
                <div key={t.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between"><span className="text-[16px] font-bold text-slate-900">{t.label}</span><StatusBadge status={t.status} /></div>
                  <p className="mt-1 text-[11px] text-slate-500">{t.floor} · {t.capacity} seats</p>
                  <p className="mt-1.5 text-[13px] font-semibold text-slate-800 tabular">{o ? inr(computeTotals(o).total) : '—'}</p>
                  <p className="text-[10.5px] text-slate-400">{t.since ? `${minutesSince(t.since)} min seated` : ''}{o ? ` · ${o.items.length} items` : ''}</p>
                </div>
              )
            })}
            {!myTables.length && <EmptyState className="col-span-full" icon={<UtensilsCrossed />} title="No tables assigned" body="Take a new order from the Staff App to get started." action={<Button size="sm" variant="primary" onClick={() => ui.setMobilePreview(true)}>Open Staff App</Button>} />}
          </div>
        </Card>
        <Card className="xl:col-span-5">
          <CardHeader title="Ready to serve" subtitle="Kitchen has marked these KOTs ready" icon={<BellRing className="size-3.5" />} actions={ready.length > 0 && <Badge tone="amber" dot>{ready.length}</Badge>} />
          <div className="divide-y divide-slate-100">
            {ready.map((k) => (
              <div key={k.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-[12px] font-bold text-amber-700">{k.tableLabel}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-slate-800">{k.no} · {k.items.length} items</p>
                  <p className="truncate text-[10.5px] text-slate-400">{k.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</p>
                </div>
                <Button size="xs" variant="success" icon={<CheckCheck className="size-3" />} onClick={() => { updateKot(k.id, 'Served'); toast.success(`${k.no} served`, `Table ${k.tableLabel}`) }}>Served</Button>
              </div>
            ))}
            {!ready.length && <EmptyState icon={<CheckCheck />} title="Nothing waiting" body="You’ll see dishes here the moment the kitchen marks them ready." />}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="My orders today" subtitle={`${myOrders.length} orders`} icon={<ReceiptText className="size-3.5" />} />
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead><tr className="border-b border-slate-100 text-left text-[10.5px] uppercase tracking-wide text-slate-400"><th className="px-4 py-2">Order</th><th className="px-2 py-2">Table</th><th className="px-2 py-2">Source</th><th className="px-2 py-2">Items</th><th className="px-2 py-2">Status</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
            <tbody>
              {myOrders.slice(0, 10).map((o) => (
                <tr key={o.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2 font-medium text-slate-800">{o.no}</td>
                  <td className="px-2 py-2">{o.tableLabel ?? o.type}</td>
                  <td className="px-2 py-2"><SourceBadge source={o.source} /></td>
                  <td className="px-2 py-2 text-slate-500">{o.items.length}</td>
                  <td className="px-2 py-2"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-2 text-right font-semibold tabular">{inr(computeTotals(o).total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!myOrders.length && <EmptyState title="No orders yet today" />}
        </div>
      </Card>
    </div>
  )
}

/* ================================================================== Kitchen */
export function KitchenDashboard() {
  useTick(1000)
  const user = useCurrentUser()
  const { outletIds } = useScope()
  const kots = useStore((s) => s.kots)
  const updateKot = useStore((s) => s.updateKotStatus)
  const recipes = useStore((s) => s.recipes)
  const { can } = usePermission()
  const nav = useNavigate()
  const m = useDashMetrics('today')

  const scoped = kots.filter((k) => outletIds.includes(k.outletId))
  const by = (s: Kot['status']) => scoped.filter((k) => k.status === s)
  const queue = [...by('New'), ...by('Preparing')].sort((a, b) => a.createdAt - b.createdAt)
  const done = scoped.filter((k) => (k.status === 'Ready' || k.status === 'Served') && isToday(k.updatedAt))
  const avgPrep = done.length ? done.reduce((s, k) => s + Math.max(4, (k.updatedAt - k.createdAt) / 60000), 0) / done.length : 14
  const delayed = queue.filter((k) => minutesSince(k.createdAt) > 20).length
  const avgRecipe = recipes.length ? recipes.reduce((s, r) => s + r.prepTime, 0) / recipes.length : 15

  const advance = (k: Kot) => {
    const next = k.status === 'New' ? 'Preparing' : 'Ready'
    updateKot(k.id, next)
    toast.success(`${k.no} → ${next}`, `Table ${k.tableLabel}`)
  }

  return (
    <div className="space-y-4">
      <PageHeader className="mb-0" title={`${greeting()}, Chef ${user.name.split(' ')[0]}`} subtitle={`${todayLong()} · Kitchen overview · ${outletName(outletIds[0])}`}
        actions={<Button variant="primary" size="lg" icon={<ChefHat className="size-4" />} onClick={() => nav('/kot')}>Open Kitchen Display</Button>} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="New KOTs" value={by('New').length} icon={<BellRing />} tone="blue" sub="waiting to start" onClick={() => nav('/kot')} />
        <StatCard label="Preparing" value={by('Preparing').length} icon={<CookingPot />} tone="amber" sub="on the line" onClick={() => nav('/kot')} />
        <StatCard label="Ready" value={by('Ready').length} icon={<CheckCheck />} tone="green" sub="awaiting pickup" />
        <StatCard label="Avg prep time" value={`${avgPrep.toFixed(1)} min`} icon={<Timer />} tone="violet" sub={`target ${avgRecipe.toFixed(0)} min`} invertDelta delta={((avgPrep - avgRecipe) / avgRecipe) * 100} />
        <StatCard label="Delayed (>20m)" value={delayed} icon={<Flame />} tone={delayed ? 'red' : 'green'} sub="needs attention" />
        <StatCard label="Low ingredients" value={m.lowStock.length} icon={<Hourglass />} tone="orange" sub="below minimum" onClick={() => nav('/inventory')} />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader title="Live KOT queue" subtitle="Oldest first · timers update live" icon={<ChefHat className="size-3.5" />} actions={<Button size="xs" variant="ghost" onClick={() => nav('/kot')}>Full KDS</Button>} />
          <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {queue.slice(0, 9).map((k) => {
              const mins = minutesSince(k.createdAt)
              return (
                <div key={k.id} className={cn('flex flex-col rounded-xl border p-2.5', mins > 20 ? 'border-rose-200 bg-rose-50/40' : k.status === 'New' ? 'border-sky-200 bg-sky-50/40' : 'border-amber-200 bg-amber-50/40')}>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-slate-900">{k.tableLabel !== '-' ? `T ${k.tableLabel}` : k.type}</span>
                    <span className={cn('font-mono text-[12px] font-semibold', mins > 20 ? 'text-rose-600' : 'text-slate-600')}>{elapsed(k.createdAt)}</span>
                  </div>
                  <p className="text-[10.5px] text-slate-400">{k.no} · {k.waiterName} {k.priority && <Badge tone="red" className="ml-1">Priority</Badge>}</p>
                  <ul className="my-2 flex-1 space-y-0.5">
                    {k.items.slice(0, 4).map((i, idx) => (
                      <li key={idx} className={cn('flex items-center gap-1.5 text-[12px]', i.cancelled && 'text-slate-400 line-through')}><VegMark veg={i.veg} /><b>{i.qty}×</b> <span className="truncate">{i.name}</span></li>
                    ))}
                    {k.items.length > 4 && <li className="text-[10.5px] text-slate-400">+{k.items.length - 4} more</li>}
                  </ul>
                  <Button size="xs" block variant={k.status === 'New' ? 'primary' : 'success'} disabled={!can('kot', 'edit')} icon={k.status === 'New' ? <Play className="size-3" /> : <CheckCheck className="size-3" />} onClick={() => advance(k)}>
                    {k.status === 'New' ? 'Start preparing' : 'Mark ready'}
                  </Button>
                </div>
              )
            })}
            {!queue.length && <EmptyState className="col-span-full" icon={<CheckCheck />} title="Kitchen is clear" body="No pending KOTs right now." />}
          </div>
        </Card>
        <div className="xl:col-span-4 [&>*]:h-full"><LowStockCard m={m} limit={7} /></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TopItemsCard m={m} />
        <Card>
          <CardHeader title="Completed today" subtitle={`${done.length} KOTs ready / served`} icon={<Clock className="size-3.5" />} />
          <div className="max-h-[400px] divide-y divide-slate-100 overflow-y-auto">
            {done.slice(0, 12).map((k) => (
              <div key={k.id} className="flex items-center gap-3 px-4 py-2 text-[12.5px]">
                <span className="w-12 font-semibold text-slate-800">{k.no}</span>
                <span className="flex-1 truncate text-slate-500">{k.tableLabel !== '-' ? `Table ${k.tableLabel}` : k.type} · {k.items.length} items</span>
                <span className="text-[11px] text-slate-400 tabular">{Math.max(4, Math.round((k.updatedAt - k.createdAt) / 60000))} min</span>
                <StatusBadge status={k.status} />
              </div>
            ))}
            {!done.length && <EmptyState title="Nothing completed yet" />}
          </div>
        </Card>
      </div>
    </div>
  )
}
