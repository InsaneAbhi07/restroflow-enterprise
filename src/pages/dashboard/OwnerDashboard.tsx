import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, BarChart3, Boxes, Download, IndianRupee, PiggyBank, Plus, ReceiptText, ShieldCheck, ShoppingBag, Smartphone, Sparkles,
  Store, UserCheck, UserCog, Wallet,
} from 'lucide-react'
import { Button, Dropdown, MenuItemBtn, PageHeader, Segmented, StatCard } from '@/components/ui'
import { useUI } from '@/components/layout/uiStore'
import { useCurrentUser, usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { inr, inrShort, isoDate } from '@/lib/format'
import { OutletDetailDrawer } from '@/pages/outlets/OutletDetailDrawer'
import { OutletFormModal } from '@/pages/outlets/OutletFormModal'
import {
  delta, downloadCSV, greeting, rangeCompareLabel, RANGE_ITEMS, todayLong, useDashMetrics, type Range,
} from './dashShared'
import { CategoryCard, ExpenseCard, MonthlyPnLCard, PaymentCard, PerformanceCard, RevenueByOutletCard, TopItemsCard, TrendCard } from './OwnerCharts'
import { ActivityCard, ApprovalsCard, AttendanceCard, LowStockCard, OutletStatusCard, RecentOrdersCard } from './Widgets'
import { OutletComparisonTable } from './OutletComparisonTable'

export default function OwnerDashboard({ finance }: { finance?: boolean }) {
  const [range, setRange] = useState<Range>('today')
  const m = useDashMetrics(range)
  const user = useCurrentUser()
  const ui = useUI()
  const nav = useNavigate()
  const { can } = usePermission()
  const [detail, setDetail] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const cmp = rangeCompareLabel(range)
  const title = m.isAll ? 'All outlets' : m.rows[0]?.outlet.name ?? 'Dashboard'

  const exportCsv = () => {
    downloadCSV(`dashboard_${range}_${isoDate()}.csv`, [
      ['Outlet', 'Revenue', 'Orders', 'Avg bill', 'Expenses', 'Est. profit', 'Employees', 'Present', 'Running tables'],
      ...m.rows.map((r) => [r.outlet.name, Math.round(r.revenue), r.orders, Math.round(r.aov), Math.round(r.expenses), Math.round(r.revenue - r.expenses), r.employees, r.present, r.running]),
      ['TOTAL', Math.round(m.revenue), m.orders, Math.round(m.aov), Math.round(m.expenses), Math.round(m.profit), m.headcount, m.present, m.rows.reduce((s, r) => s + r.running, 0)],
    ])
    toast.success('Dashboard exported', 'Outlet summary downloaded as CSV')
  }

  const quick = [
    { label: 'Add Outlet', icon: <Store />, to: '/outlets?new=1', show: can('outlets', 'create'), tone: 'bg-navy-50 text-navy-700' },
    { label: 'New Bill', icon: <ReceiptText />, to: '/pos?new=1', show: can('pos', 'create'), tone: 'bg-brand-50 text-brand-700' },
    { label: 'View Reports', icon: <BarChart3 />, to: '/reports', show: can('reports'), tone: 'bg-violet-50 text-violet-700' },
    { label: 'Manage Users', icon: <UserCog />, to: '/users', show: can('users'), tone: 'bg-orange-50 text-orange-700' },
    { label: 'Manage Permissions', icon: <ShieldCheck />, to: '/users/roles', show: can('users'), tone: 'bg-pink-50 text-pink-700' },
    { label: 'View Inventory', icon: <Boxes />, to: '/inventory', show: can('inventory'), tone: 'bg-sky-50 text-sky-700' },
  ].filter((q) => q.show)

  const alerts = m.lowStock.length + m.pendingApprovals.length
  const margin = m.revenue ? (m.profit / m.revenue) * 100 : 0

  return (
    <div className="space-y-4">
      <PageHeader
        className="mb-0"
        title={<span>{greeting()}, {user.name.split(' ')[0]} <span className="font-normal text-slate-400">·</span> <span className="font-medium text-slate-600">{title}</span></span>}
        subtitle={<span>{todayLong()} · {finance ? 'Finance overview' : 'Business overview'} · <span className="inline-flex items-center gap-1 text-emerald-600"><span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />Live</span></span>}
        actions={
          <>
            <Segmented value={range} onChange={setRange} items={RANGE_ITEMS} />
            <Button variant="accent" icon={<Smartphone className="size-3.5" />} onClick={() => ui.setMobilePreview(true)}>Mobile App Preview</Button>
            <Button icon={<Sparkles className="size-3.5" />} onClick={() => ui.setScenarios(true)}>Demo Scenarios</Button>
            <Dropdown width={200} trigger={<Button icon={<Download className="size-3.5" />}>Export</Button>}>
              <MenuItemBtn icon={<Download />} onClick={exportCsv}>Outlet summary (CSV)</MenuItemBtn>
              <MenuItemBtn icon={<ReceiptText />} onClick={() => { toast.info('Preparing PDF…', 'Use Ctrl+P in the print dialog to save as PDF'); setTimeout(() => window.print(), 300) }}>Print / Save as PDF</MenuItemBtn>
              <MenuItemBtn icon={<BarChart3 />} onClick={() => nav('/reports')}>Open detailed reports</MenuItemBtn>
            </Dropdown>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 2xl:grid-cols-8">
        <StatCard label="Total Revenue" value={inrShort(m.revenue)} delta={delta(m.revenue, m.prevRevenue)} icon={<IndianRupee />} tone="teal" sub={m.live.revenue ? `+${inrShort(m.live.revenue)} live` : cmp} onClick={() => nav('/reports')} />
        <StatCard label="Total Orders" value={m.orders.toLocaleString('en-IN')} delta={delta(m.orders, m.prevOrders)} icon={<ShoppingBag />} tone="navy" sub={`${m.live.running.length} running now`} onClick={() => nav('/orders')} />
        <StatCard label="Active Outlets" value={`${m.activeOutlets}/${m.rows.length}`} icon={<Store />} tone="violet" sub="open right now" onClick={() => nav('/outlets')} />
        <StatCard label="Active Employees" value={`${m.present}/${m.headcount}`} icon={<UserCheck />} tone="orange" sub="present today" onClick={() => nav('/attendance')} />
        <StatCard label="Total Expenses" value={inrShort(m.expenses)} delta={delta(m.expenses, m.prevExpenses)} invertDelta icon={<Wallet />} tone="red" sub={cmp} />
        <StatCard label="Estimated Profit" value={inrShort(m.profit)} delta={delta(m.profit, m.prevProfit)} icon={<PiggyBank />} tone="green" sub={`${margin.toFixed(1)}% margin`} />
        <StatCard label="Avg Order Value" value={inr(m.aov)} delta={delta(m.aov, m.prevAov)} icon={<ReceiptText />} tone="blue" sub="per bill" />
        <StatCard label="Pending Alerts" value={alerts} icon={<AlertTriangle />} tone="amber" sub={`${m.lowStock.length} stock · ${m.pendingApprovals.length} approvals`} onClick={() => document.getElementById('dash-alerts')?.scrollIntoView({ behavior: 'smooth' })} />
      </div>

      {/* Quick actions */}
      {quick.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-card">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Quick actions</span>
          {quick.map((q) => (
            <button key={q.label} onClick={() => nav(q.to)} className="group flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 text-[12.5px] font-medium text-slate-700 transition hover:border-brand-300 hover:shadow-sm">
              <span className={`flex size-6 items-center justify-center rounded-md [&>svg]:size-3.5 ${q.tone}`}>{q.icon}</span>
              {q.label}
              {q.label === 'Add Outlet' && <Plus className="size-3 text-slate-400 group-hover:text-brand-600" />}
            </button>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 [&>*]:h-full"><TrendCard m={m} /></div>
        <div className="lg:col-span-4 [&>*]:h-full"><RevenueByOutletCard m={m} /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        <div className="md:col-span-2 xl:col-span-6 [&>*]:h-full"><MonthlyPnLCard m={m} /></div>
        <div className="xl:col-span-3 [&>*]:h-full"><PaymentCard m={m} /></div>
        <div className="xl:col-span-3 [&>*]:h-full"><CategoryCard m={m} /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TopItemsCard m={m} />
        <ExpenseCard m={m} />
        <div className="md:col-span-2 xl:col-span-1 [&>*]:h-full"><PerformanceCard m={m} /></div>
      </div>

      <OutletComparisonTable m={m} onOpen={setDetail} />

      <div id="dash-alerts" className="grid scroll-mt-20 gap-4 xl:grid-cols-12">
        <RecentOrdersCard className="xl:col-span-8" />
        <ApprovalsCard className="xl:col-span-4" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <LowStockCard m={m} />
        <AttendanceCard />
        <ActivityCard />
        <OutletStatusCard m={m} onOpen={setDetail} />
      </div>

      <OutletDetailDrawer outletId={detail} onClose={() => setDetail(null)} onEdit={(id) => { setDetail(null); setEditId(id) }} />
      <OutletFormModal open={!!editId} editId={editId} onClose={() => setEditId(null)} />
    </div>
  )
}
