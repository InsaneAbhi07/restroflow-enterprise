import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Clock, FileClock, Flame, History, Printer, Star } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, CardHeader, CHART, DynIcon, StatCard, tooltipStyle } from '@/components/ui'
import { useScope } from '@/store/hooks'
import { inr, inrShort, num } from '@/lib/format'
import { GROUPS, REPORTS, reportById } from './registry'
import { useReportUI } from './reportStore'
import { useReportCtx } from './useReportCtx'
import { salesBase } from './gen'
import { zData } from './defs/dayEnd'
import type { ReportDef } from './types'

function Tile({ r, meta }: { r: ReportDef; meta?: string }) {
  const fav = useReportUI((s) => s.favourites.includes(r.id))
  const toggleFav = useReportUI((s) => s.toggleFav)
  const g = GROUPS.find((x) => x.key === r.group)!
  return (
    <Link to={`/reports/${r.id}`} className="group relative flex min-w-0 flex-col rounded-xl border border-slate-200/80 bg-white p-3 shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className={`flex size-8 items-center justify-center rounded-lg ${g.tone}`}><DynIcon name={r.icon} className="size-4" /></span>
        <button onClick={(e) => { e.preventDefault(); toggleFav(r.id) }} className="rounded p-0.5 hover:bg-slate-100" title="Favourite">
          <Star className={fav ? 'size-3.5 fill-amber-400 text-amber-400' : 'size-3.5 text-slate-300'} />
        </button>
      </div>
      <p className="mt-2 truncate text-[13px] font-semibold text-slate-900">{r.title}</p>
      <p className="line-clamp-2 text-[11.5px] leading-snug text-slate-500">{r.description}</p>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>{r.group}{meta ? ' · ' + meta : ''}</span>
        <ArrowRight className="size-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
    </Link>
  )
}

export function ReportsHome() {
  const navigate = useNavigate()
  const scope = useScope()
  const favs = useReportUI((s) => s.favourites)
  const usage = useReportUI((s) => s.usage)
  const recent = useReportUI((s) => s.recent)
  const today = useReportCtx({ preset: 'today', outlet: scope.selected, filter: {} })
  const week = useReportCtx({ preset: 'last7', outlet: scope.selected, filter: {} })
  const z = useMemo(() => zData(today), [today])
  const wk = useMemo(() => salesBase(week), [week])
  const t = z.t
  const mostUsed = useMemo(() => REPORTS.filter((r) => usage[r.id]).sort((a, b) => (usage[b.id] ?? 0) - (usage[a.id] ?? 0)).slice(0, 8), [usage])
  const favReports = REPORTS.filter((r) => favs.includes(r.id))
  const recentReports = recent.map((id) => reportById(id)).filter(Boolean) as ReportDef[]

  return (
    <div className="min-w-0 space-y-4">
      {/* Day end highlight */}
      <Card className="overflow-hidden">
        <div className="grid lg:grid-cols-[1.1fr_1fr]">
          <div className="bg-gradient-to-br from-navy-900 via-navy-900 to-navy-800 p-5 text-white">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-brand-300"><FileClock className="size-3.5" />Day End Summary · Z-Report</div>
            <p className="mt-1 text-[13px] text-white/70">{today.outlets.length === 1 ? today.outlets[0].name : `Consolidated · ${today.outlets.length} outlets`} · {today.rangeLabel}</p>
            <p className="mt-3 text-[30px] font-semibold leading-none tracking-tight tabular">{inr(t.total)}</p>
            <p className="mt-1 text-[12px] text-white/60">Total collection so far · {num(t.orders)} bills · ABV {inr(t.total / (t.orders || 1))}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="accent" icon={<FileClock className="size-3.5" />} onClick={() => navigate('/reports/day-end')}>Open Day End</Button>
              <Button className="border-white/20 bg-white/10 text-white hover:bg-white/20" icon={<Printer className="size-3.5" />} onClick={() => navigate('/reports/day-end')}>Print Z-report</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-100">
            {[
              ['Net Sales', inr(t.net), `Gross ${inrShort(t.gross)}`],
              ['GST (CGST+SGST)', inr(t.cgst + t.sgst), '5% on taxable'],
              ['Cash in Drawer', inr(z.expected), z.diff === 0 ? 'Tallied' : `${z.diff < 0 ? 'Short' : 'Excess'} ${inr(Math.abs(z.diff))}`],
              ['Discounts', inr(t.discount), `${((t.discount / (t.gross || 1)) * 100).toFixed(1)}% of gross`],
              ['Cancelled / Void', num(t.cancelledCount), inr(t.cancelledAmt)],
              ['Top Item', z.top[0]?.name ?? '-', z.top[0] ? `${num(z.top[0].qty)} sold` : ''],
            ].map(([l, v, s]) => (
              <div key={l} className="min-w-0 bg-white px-4 py-3">
                <p className="text-[11px] text-slate-500">{l}</p>
                <p className="truncate text-[16px] font-semibold text-slate-900 tabular">{v}</p>
                <p className="truncate text-[10.5px] text-slate-400">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* quick KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Net Sales · 7 days" value={inrShort(wk.total.net)} tone="teal" icon={<DynIcon name="TrendingUp" />} sub={`${num(wk.total.orders)} orders`} />
        <StatCard label="Avg Daily Sales" value={inrShort(wk.total.net / 7)} tone="navy" icon={<DynIcon name="CalendarDays" />} sub="Last 7 days" />
        <StatCard label="GST Liability · 7 days" value={inrShort(wk.total.cgst + wk.total.sgst)} tone="violet" icon={<DynIcon name="Landmark" />} sub="CGST + SGST" />
        <StatCard label="Online Share" value={((wk.sources.filter((s) => s.type === 'Delivery').reduce((a, s) => a + s.amount, 0) / (wk.total.net || 1)) * 100).toFixed(1) + '%'} tone="orange" icon={<DynIcon name="Bike" />} sub="Swiggy · Zomato · Phone" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Net sales · last 7 days" icon={<Flame className="size-3.5" />} actions={<Link to="/reports/daily-sales" className="text-[12px] font-medium text-brand-600 hover:underline">Daily Sales →</Link>} />
          <div className="h-[220px] p-3">
            <ResponsiveContainer>
              <AreaChart data={wk.byDate}>
                <defs><linearGradient id="rh-net" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART.teal} stopOpacity={0.3} /><stop offset="100%" stopColor={CHART.teal} stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" tick={CHART.axis} tickLine={false} axisLine={false} />
                <YAxis tick={CHART.axis} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => inrShort(Number(v))} />
                <Tooltip {...tooltipStyle} formatter={(v) => inr(Number(v))} />
                <Area type="monotone" dataKey="net" name="Net Sales" stroke={CHART.teal} strokeWidth={2} fill="url(#rh-net)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Report library" subtitle={`${REPORTS.length} reports across ${GROUPS.length} groups`} />
          <div className="divide-y divide-slate-100">
            {GROUPS.map((g) => {
              const list = REPORTS.filter((r) => r.group === g.key)
              return (
                <Link key={g.key} to={`/reports/${list[0].id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                  <span className={`flex size-8 items-center justify-center rounded-lg ${g.tone}`}><DynIcon name={g.icon} className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-slate-800">{g.label}</p>
                    <p className="truncate text-[11px] text-slate-400">{list.slice(0, 3).map((r) => r.title).join(' · ')}…</p>
                  </div>
                  <Badge tone="gray">{list.length}</Badge>
                </Link>
              )
            })}
          </div>
        </Card>
      </div>

      {favReports.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-500"><Star className="size-3.5 fill-amber-400 text-amber-400" />Favourites</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{favReports.map((r) => <Tile key={r.id} r={r} />)}</div>
        </section>
      )}
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-500"><Clock className="size-3.5" />Most used</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{mostUsed.map((r) => <Tile key={r.id} r={r} meta={`${usage[r.id]} views`} />)}</div>
      </section>
      {recentReports.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-500"><History className="size-3.5" />Recently viewed</h3>
          <div className="flex flex-wrap gap-2">
            {recentReports.map((r) => (
              <Link key={r.id} to={`/reports/${r.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] text-slate-700 hover:border-brand-200 hover:text-navy-900">
                <DynIcon name={r.icon} className="size-3.5 text-slate-400" />{r.title}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
