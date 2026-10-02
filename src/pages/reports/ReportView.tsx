import { useEffect, useMemo, useState } from 'react'
import { BarChart3, ChevronDown, Download, FileSpreadsheet, FileText, FileType2, Info, LayoutPanelTop, Printer, Radio, Star, Table2 } from 'lucide-react'
import {
  Badge, Button, Card, CardHeader, DataTable, Dropdown, DynIcon, Input, MenuItemBtn, SearchInput, Segmented, Select, type Column,
} from '@/components/ui'
import { PrintPreviewModal } from '@/components/print/Print'
import { useCurrentUser, usePermission, useScope } from '@/store/hooks'
import { useStore } from '@/store/useStore'
import { toast } from '@/store/toast'
import { useShortcut } from '@/lib/shortcuts'
import { cn, todayISO, isoDate } from '@/lib/format'
import type { RangePreset, ReportDef, Row } from './types'
import { PRESETS } from './range'
import { useReportCtx } from './useReportCtx'
import { useReportUI } from './reportStore'
import { ChartView } from './charts'
import { fmtCell } from './gen'
import { computeTotals } from './totals'
import { downloadCsv } from './exportCsv'
import { ReportDocument } from './ReportDocument'
import { STATUS_TONES } from './defs/helpers'

type View = 'table' | 'chart' | 'both'

const KPI_TONE: Record<string, string> = {
  teal: 'border-l-brand-500', navy: 'border-l-navy-700', green: 'border-l-emerald-500', red: 'border-l-rose-500', amber: 'border-l-amber-500',
  orange: 'border-l-orange-500', violet: 'border-l-violet-500', pink: 'border-l-pink-500', blue: 'border-l-sky-500', gray: 'border-l-slate-300',
}

export function ReportView({ def }: { def: ReportDef }) {
  const scope = useScope()
  const user = useCurrentUser()
  const { can } = usePermission()
  const allOutlets = useStore((s) => s.outlets)
  const fav = useReportUI((s) => s.favourites.includes(def.id))
  const toggleFav = useReportUI((s) => s.toggleFav)
  const touch = useReportUI((s) => s.touch)

  const [preset, setPreset] = useState<RangePreset>(def.defaultRange ?? 'last7')
  const [from, setFrom] = useState(isoDate(new Date(Date.now() - 6 * 864e5)))
  const [to, setTo] = useState(todayISO())
  const [outlet, setOutlet] = useState<string>(scope.selected)
  const [filter, setFilter] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>(def.Custom ? 'chart' : def.defaultView ?? 'both')
  const [printOpen, setPrintOpen] = useState(false)

  useEffect(() => { touch(def.id) }, [def.id, touch])
  useShortcut('print', () => can('reports', 'print') && setPrintOpen(true), !printOpen)

  const ctx = useReportCtx({ preset, from, to, outlet, filter })
  const result = useMemo(() => def.build(ctx), [def, ctx])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return result.rows
    return result.rows.filter((r) => result.columns.some((c) => fmtCell(r[c.key], c.fmt).toLowerCase().includes(q)))
  }, [result, search])
  const totals = useMemo(() => computeTotals(result.columns, rows), [result.columns, rows])

  const columns: Column<Row>[] = useMemo(() => result.columns.map((c) => ({
    key: c.key, header: c.header, align: c.align, width: c.width,
    sortValue: (r: Row) => { const v = r[c.key]; return typeof v === 'number' ? v : String(v ?? '') },
    render: c.render ?? (c.badge ? (r: Row) => <Badge tone={STATUS_TONES[String(r[c.key])] ?? 'gray'}>{String(r[c.key])}</Badge> : (r: Row) => fmtCell(r[c.key], c.fmt)),
    className: c.align === 'right' ? 'whitespace-nowrap' : undefined,
  })), [result.columns])

  const outletLabel = ctx.outlets.length === 1 ? ctx.outlets[0].name : 'All Outlets'
  const exportCsv = () => {
    if (!rows.length) return toast.warning('Nothing to export', 'The report has no rows for these filters.')
    downloadCsv(`${def.id}_${ctx.dates[0]}_${ctx.dates[ctx.dates.length - 1]}.csv`, { title: def.title, outlet: outletLabel, period: ctx.rangeLabel }, result.columns, rows)
    toast.success('CSV downloaded', `${rows.length} rows · ${def.title}`)
  }
  const exportOther = (kind: 'Excel' | 'PDF') => toast.info(`${kind} export queued`, `${def.title} (${rows.length} rows) — simulated in this demo. Use CSV for a real file.`)

  const charts = result.charts ?? []
  const showTable = !def.Custom ? view !== 'chart' : view === 'table'
  const showCharts = !def.Custom && view !== 'table' && charts.length > 0
  const Custom = def.Custom
  const PrintDoc = def.PrintDoc

  return (
    <div className="min-w-0 space-y-3">
      {/* title */}
      <Card className="p-4">
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><DynIcon name={def.icon} className="size-4.5" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[16px] font-semibold tracking-tight text-slate-900">{def.title}</h2>
              <Badge tone="gray">{def.group}</Badge>
              {def.snapshot && <Badge tone="green" dot>Live snapshot</Badge>}
              <button onClick={() => toggleFav(def.id)} title={fav ? 'Remove from favourites' : 'Add to favourites'} className="rounded p-0.5 hover:bg-slate-100">
                <Star className={cn('size-4', fav ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
              </button>
            </div>
            <p className="mt-0.5 text-[12.5px] text-slate-500">{def.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Dropdown width={210} trigger={<Button icon={<Download className="size-3.5" />} iconRight={<ChevronDown className="size-3.5 opacity-60" />} disabled={!can('reports', 'export')}>Export</Button>}>
              <MenuItemBtn icon={<FileSpreadsheet className="text-emerald-600" />} onClick={() => exportOther('Excel')}>Excel (.xlsx)</MenuItemBtn>
              <MenuItemBtn icon={<FileType2 className="text-sky-600" />} onClick={exportCsv}>CSV (.csv)</MenuItemBtn>
              <MenuItemBtn icon={<FileText className="text-rose-600" />} onClick={() => exportOther('PDF')}>PDF (.pdf)</MenuItemBtn>
            </Dropdown>
            <Button variant="primary" icon={<Printer className="size-3.5" />} kbd="F8" disabled={!can('reports', 'print')} onClick={() => setPrintOpen(true)}>Print preview</Button>
          </div>
        </div>

        {/* filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <div className={cn('flex flex-wrap items-center gap-2', def.snapshot && 'pointer-events-none opacity-50')} title={def.snapshot ? 'Snapshot report — shows current position' : undefined}>
            <Segmented size="sm" value={preset} onChange={setPreset} items={PRESETS} />
            {preset === 'custom' && (
              <div className="flex items-center gap-1.5">
                <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-7 w-[132px] text-[12px]" />
                <span className="text-[11px] text-slate-400">to</span>
                <Input type="date" value={to} min={from} max={todayISO()} onChange={(e) => setTo(e.target.value)} className="h-7 w-[132px] text-[12px]" />
              </div>
            )}
          </div>
          {scope.canSwitch ? (
            <Select value={outlet} onChange={(e) => setOutlet(e.target.value)} className="w-44">
              <option value="all">All Outlets</option>
              {allOutlets.filter((o) => scope.allowed.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{o.short}</option>)}
            </Select>
          ) : (
            <Badge tone="navy">{outletLabel}</Badge>
          )}
          {def.filters?.map((f) => (
            <Select key={f.key} value={filter[f.key] ?? ''} onChange={(e) => setFilter((s) => ({ ...s, [f.key]: e.target.value }))} className="w-44">
              <option value="">{f.key === 'emp' ? 'First employee' : `All · ${f.label}`}</option>
              {f.options(ctx).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          ))}
          <SearchInput placeholder="Search rows…" value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} className="w-48" />
          <div className="ml-auto">
            {Custom ? (
              <Segmented size="sm" value={view} onChange={setView} items={[{ value: 'chart', label: 'Summary', icon: <LayoutPanelTop className="size-3" /> }, { value: 'table', label: 'Table', icon: <Table2 className="size-3" /> }]} />
            ) : (
              <Segmented size="sm" value={view} onChange={setView} items={[{ value: 'table', label: 'Table', icon: <Table2 className="size-3" /> }, { value: 'chart', label: 'Chart', icon: <BarChart3 className="size-3" /> }, { value: 'both', label: 'Both' }]} />
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-slate-400">
          <span className="inline-flex items-center gap-1"><Radio className="size-3 text-brand-500" />{def.snapshot ? 'As of now' : ctx.rangeLabel}</span>
          <span>·</span><span>{outletLabel}{ctx.outlets.length > 1 ? ` (${ctx.outlets.length})` : ''}</span>
          <span>·</span><span>{rows.length} rows</span>
        </div>
      </Card>

      {/* KPI chips */}
      {result.kpis.length > 0 && !(Custom && view === 'chart') && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
          {result.kpis.map((k) => (
            <div key={k.label} className={cn('min-w-0 rounded-xl border border-l-[3px] border-slate-200/80 bg-white px-3 py-2.5 shadow-card', KPI_TONE[k.tone ?? 'gray'])}>
              <p className="truncate text-[11px] font-medium text-slate-500">{k.label}</p>
              <p className="truncate text-[16px] font-semibold tracking-tight text-slate-900 tabular">{k.value}</p>
              {k.sub && <p className="truncate text-[10.5px] text-slate-400">{k.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {result.note && (
        <div className="flex items-start gap-2 rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2 text-[12px] text-sky-800"><Info className="mt-0.5 size-3.5 shrink-0" />{result.note}</div>
      )}

      {Custom && view === 'chart' && <Custom ctx={ctx} result={result} />}

      {showCharts && (
        <div className={cn('grid gap-3', charts.length > 1 && 'xl:grid-cols-5')}>
          {charts.map((c, i) => {
            const narrow = charts.length > 1 && (c.kind === 'pie' || c.kind === 'donut')
            return (
              <Card key={i} className={cn('min-w-0', charts.length > 1 && (narrow ? 'xl:col-span-2' : i === 0 && (charts[1]?.kind === 'pie' || charts[1]?.kind === 'donut') ? 'xl:col-span-3' : 'xl:col-span-5'))}>
                {c.title && <CardHeader title={c.title} />}
                <div className="p-3"><ChartView spec={c} /></div>
              </Card>
            )
          })}
        </div>
      )}

      {showTable && (
        <Card className="min-w-0 overflow-hidden">
          <DataTable dense columns={columns} rows={rows} pageSize={15}
            footer={totals && rows.length > 0 ? (
              <tr className="border-t-2 border-slate-200 bg-slate-50 text-[12.5px] font-semibold text-slate-900">
                {result.columns.map((c, i) => <td key={c.key} className={cn('whitespace-nowrap px-3 py-2', c.align === 'right' && 'text-right tabular')}>{i === 0 ? 'Total' : totals[c.key] ?? ''}</td>)}
              </tr>
            ) : undefined} />
        </Card>
      )}

      <PrintPreviewModal open={printOpen} onClose={() => setPrintOpen(false)} paper="a4" title={`Print · ${def.title}`} subtitle={`${outletLabel} · ${ctx.rangeLabel}`}>
        {PrintDoc ? <PrintDoc ctx={ctx} result={result} /> : <ReportDocument ctx={ctx} title={def.title} result={{ ...result, rows }} user={user.name} />}
      </PrintPreviewModal>
    </div>
  )
}
