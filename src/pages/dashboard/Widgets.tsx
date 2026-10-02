import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity as ActivityIcon, AlertTriangle, Check, ClipboardCheck, PackageX, ReceiptText, Store, UserCheck, X } from 'lucide-react'
import { Badge, Button, Card, CardHeader, EmptyState, Progress, StatusBadge, type Tone } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { usePermission, useScope, useScopedOrders } from '@/store/hooks'
import { toast } from '@/store/toast'
import { computeTotals } from '@/lib/billing'
import { cn, fmtTime, inr, inrShort, timeAgo } from '@/lib/format'
import type { Activity, Approval } from '@/types'
import { APPROVAL_MODULE, SourceBadge, useTodayAttendance, type DashMetrics } from './dashShared'

const outletShort = (id?: string) => useStore.getState().outlets.find((o) => o.id === id)?.short ?? ''

/* ------------------------------------------------------------------ Recent orders (live) */
export function RecentOrdersCard({ limit = 8, className }: { limit?: number; className?: string }) {
  const orders = useScopedOrders()
  const outlets = useStore((s) => s.outlets)
  const { isAll } = useScope()
  const nav = useNavigate()
  const rows = useMemo(() => [...orders].filter((o) => o.status !== 'Draft').sort((a, b) => (b.settledAt ?? b.createdAt) - (a.settledAt ?? a.createdAt)).slice(0, limit), [orders, limit])
  return (
    <Card className={cn('flex min-w-0 flex-col', className)}>
      <CardHeader title="Recent orders" subtitle="Live feed from POS, Waiter App & QR" icon={<ReceiptText className="size-3.5" />}
        actions={<Button size="xs" variant="ghost" onClick={() => nav('/orders')}>View all</Button>} />
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[10.5px] uppercase tracking-wide text-slate-400">
              <th className="px-4 py-2 font-semibold">Order</th>
              {isAll && <th className="px-2 py-2 font-semibold">Outlet</th>}
              <th className="px-2 py-2 font-semibold">Table / Type</th>
              <th className="px-2 py-2 font-semibold">Source</th>
              <th className="px-2 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const outlet = outlets.find((x) => x.id === o.outletId)
              return (
                <tr key={o.id} onClick={() => nav('/orders')} className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                  <td className="px-4 py-2">
                    <p className="font-medium text-slate-800">{o.billNo ?? o.no}</p>
                    <p className="text-[10.5px] text-slate-400">{fmtTime(o.settledAt ?? o.createdAt)} · {o.items.length} items</p>
                  </td>
                  {isAll && <td className="px-2 py-2"><span className="flex items-center gap-1.5 whitespace-nowrap text-slate-600"><span className="size-1.5 rounded-full" style={{ background: outlet?.color }} />{outlet?.short}</span></td>}
                  <td className="whitespace-nowrap px-2 py-2 text-slate-600">{o.tableLabel ? `Table ${o.tableLabel}` : o.type}</td>
                  <td className="px-2 py-2"><SourceBadge source={o.source} /></td>
                  <td className="px-2 py-2"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-900 tabular">{inr(computeTotals(o).total)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!rows.length && <EmptyState title="No orders yet" body="New orders from POS, Waiter App and QR will appear here." />}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ Pending approvals */
const APPROVAL_TONE: Record<Approval['type'], Tone> = {
  Discount: 'amber', Resettlement: 'orange', 'Stock Transfer': 'blue', 'Purchase Order': 'violet', Leave: 'pink', 'Attendance Correction': 'teal', Payroll: 'green',
}
export function ApprovalsCard({ className, limit = 6 }: { className?: string; limit?: number }) {
  const approvals = useStore((s) => s.approvals)
  const decide = useStore((s) => s.decideApproval)
  const { outletIds, isAll } = useScope()
  const { can } = usePermission()
  const pending = approvals.filter((a) => a.status === 'Pending' && outletIds.includes(a.outletId)).sort((a, b) => b.at - a.at)
  const act = (a: Approval, status: 'Approved' | 'Rejected') => {
    decide(a.id, status)
    toast[status === 'Approved' ? 'success' : 'warning'](`${a.type} ${status.toLowerCase()}`, a.title)
  }
  return (
    <Card className={cn('flex min-w-0 flex-col', className)}>
      <CardHeader title="Pending approvals" subtitle={`${pending.length} awaiting your action`} icon={<ClipboardCheck className="size-3.5" />}
        actions={pending.length > 0 && <Badge tone="amber" dot>{pending.length}</Badge>} />
      <div className="flex-1 divide-y divide-slate-100 overflow-y-auto" style={{ maxHeight: 360 }}>
        {pending.slice(0, limit).map((a) => {
          const allowed = can(APPROVAL_MODULE[a.type], 'approve')
          return (
            <div key={a.id} className="px-4 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <Badge tone={APPROVAL_TONE[a.type]}>{a.type}</Badge>
                    {isAll && <span className="text-[10.5px] text-slate-400">{outletShort(a.outletId)}</span>}
                  </div>
                  <p className="truncate text-[12.5px] font-medium text-slate-800" title={a.title}>{a.title}</p>
                  <p className="text-[10.5px] text-slate-400">by {a.by} · {timeAgo(a.at)}{a.amount ? ` · ${inr(a.amount)}` : ''}</p>
                </div>
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <Button size="xs" variant="success" icon={<Check className="size-3" />} disabled={!allowed} onClick={() => act(a, 'Approved')}>Approve</Button>
                <Button size="xs" variant="outline" icon={<X className="size-3" />} disabled={!allowed} onClick={() => act(a, 'Rejected')}>Reject</Button>
                {!allowed && <span className="self-center text-[10.5px] text-slate-400">No approval rights</span>}
              </div>
            </div>
          )
        })}
        {!pending.length && <EmptyState icon={<Check />} title="All caught up" body="No approvals pending for the selected outlets." />}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ Low stock alerts */
export function LowStockCard({ m, className, limit = 6 }: { m: Pick<DashMetrics, 'lowStock' | 'isAll'>; className?: string; limit?: number }) {
  const nav = useNavigate()
  return (
    <Card className={cn('flex min-w-0 flex-col', className)}>
      <CardHeader title="Low-stock alerts" subtitle={`${m.lowStock.length} items below minimum`} icon={<PackageX className="size-3.5" />}
        actions={<Button size="xs" variant="ghost" onClick={() => nav('/inventory')}>Inventory</Button>} />
      <div className="divide-y divide-slate-100">
        {m.lowStock.slice(0, limit).map(({ material, outletId, qty, out }) => (
          <div key={material.id + outletId} className="flex items-center gap-3 px-4 py-2">
            <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg', out ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600')}><AlertTriangle className="size-3.5" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-slate-800">{material.name}</p>
              <p className="text-[10.5px] text-slate-400">{m.isAll ? outletShort(outletId) + ' · ' : ''}min {material.min} {material.unit}</p>
            </div>
            <div className="w-20 text-right">
              <p className={cn('text-[12px] font-semibold tabular', out ? 'text-rose-600' : 'text-amber-600')}>{qty} {material.unit}</p>
              <Progress value={(qty / material.min) * 100} tone={out ? 'red' : 'amber'} className="mt-1 h-1" />
            </div>
          </div>
        ))}
        {!m.lowStock.length && <EmptyState title="Stock levels healthy" body="No materials below minimum level." />}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ Attendance overview */
export function AttendanceCard({ className }: { className?: string }) {
  const a = useTodayAttendance()
  const nav = useNavigate()
  const bars: { label: string; value: number; tone: Tone }[] = [
    { label: 'Present', value: a.present, tone: 'green' },
    { label: 'Late', value: a.late, tone: 'amber' },
    { label: 'On leave', value: a.leave, tone: 'violet' },
    { label: 'Absent', value: a.absent, tone: 'red' },
    { label: 'Not checked in', value: a.notIn, tone: 'gray' },
    { label: 'Weekly off', value: a.off, tone: 'blue' },
  ]
  const onDuty = a.present + a.late
  return (
    <Card className={cn('flex min-w-0 flex-col', className)}>
      <CardHeader title="Attendance today" subtitle={`${onDuty} of ${a.total} staff on duty`} icon={<UserCheck className="size-3.5" />}
        actions={<Button size="xs" variant="ghost" onClick={() => nav('/attendance')}>Details</Button>} />
      <div className="p-4">
        <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
          {bars.map((b) => b.value > 0 && <div key={b.label} className={cn('h-full', { green: 'bg-emerald-500', amber: 'bg-amber-500', violet: 'bg-violet-500', red: 'bg-rose-500', gray: 'bg-slate-300', blue: 'bg-sky-400' }[b.tone as string])} style={{ width: `${(b.value / (a.total || 1)) * 100}%` }} title={`${b.label}: ${b.value}`} />)}
        </div>
        <div className="space-y-2">
          {bars.map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-[12px]">
              <span className="w-24 text-slate-600">{b.label}</span>
              <Progress value={(b.value / (a.total || 1)) * 100} tone={b.tone} className="flex-1" />
              <span className="w-6 text-right font-semibold text-slate-800 tabular">{b.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ Activity timeline */
const ACT_DOT: Record<NonNullable<Activity['type']>, string> = { info: 'bg-sky-500', success: 'bg-emerald-500', warning: 'bg-amber-500', danger: 'bg-rose-500' }
export function ActivityCard({ className, limit = 8 }: { className?: string; limit?: number }) {
  const activity = useStore((s) => s.activity)
  const { outletIds, isAll } = useScope()
  const nav = useNavigate()
  const rows = activity.filter((a) => !a.outletId || outletIds.includes(a.outletId)).slice(0, limit)
  return (
    <Card className={cn('flex min-w-0 flex-col', className)}>
      <CardHeader title="Recent activity" subtitle="Across modules" icon={<ActivityIcon className="size-3.5" />}
        actions={<Button size="xs" variant="ghost" onClick={() => nav('/audit')}>Audit log</Button>} />
      <ol className="relative px-4 py-3">
        {rows.map((a, i) => (
          <li key={a.id} className="relative flex gap-3 pb-3 last:pb-0">
            {i < rows.length - 1 && <span className="absolute left-[4px] top-3 h-full w-px bg-slate-200" />}
            <span className={cn('relative mt-1.5 size-2.5 shrink-0 rounded-full ring-2 ring-white', ACT_DOT[a.type ?? 'info'])} />
            <div className="min-w-0">
              <p className="text-[12.5px] leading-snug text-slate-700">{a.text}</p>
              <p className="text-[10.5px] text-slate-400">{a.user} · {timeAgo(a.at)}{isAll && a.outletId ? ` · ${outletShort(a.outletId)}` : ''}</p>
            </div>
          </li>
        ))}
        {!rows.length && <EmptyState title="No activity yet" />}
      </ol>
    </Card>
  )
}

/* ------------------------------------------------------------------ Outlet status list */
export function OutletStatusCard({ m, className, onOpen }: { m: DashMetrics; className?: string; onOpen?: (id: string) => void }) {
  const kots = useStore((s) => s.kots)
  return (
    <Card className={cn('flex min-w-0 flex-col', className)}>
      <CardHeader title="Outlet status" subtitle="Live operations" icon={<Store className="size-3.5" />} />
      <div className="divide-y divide-slate-100">
        {m.rows.map((r) => {
          const pendingKots = kots.filter((k) => k.outletId === r.id && (k.status === 'New' || k.status === 'Preparing')).length
          return (
            <button key={r.id} onClick={() => onOpen?.(r.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50/70">
              <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white" style={{ background: r.outlet.color }}>
                {r.outlet.code.split('-')[1]}
                {r.outlet.status === 'Open' && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-slate-800">{r.outlet.short}</p>
                <p className="text-[10.5px] text-slate-400">{r.running} tables running · {pendingKots} KOTs in kitchen · {r.present} staff</p>
              </div>
              <div className="text-right">
                <StatusBadge status={r.outlet.status} />
                <p className="mt-0.5 text-[11px] font-semibold text-slate-700 tabular">{inrShort(r.revenue)}</p>
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
