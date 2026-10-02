import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Boxes, IndianRupee, PackageCheck, AlertTriangle, PackageX, ShoppingCart, Flame, Plus, PackagePlus, SlidersHorizontal, History, Pencil, CalendarClock, Download } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, Cell } from 'recharts'
import type { Material } from '@/types'
import { useStore } from '@/store/useStore'
import { useScope, usePermission, isToday } from '@/store/hooks'
import { toast } from '@/store/toast'
import { PageHeader, Card, CardHeader, StatCard, Button, DataTable, FilterBar, SearchInput, Select, StatusBadge, Tabs, Badge, IconButton, CHART, tooltipStyle, type Column } from '@/components/ui'
import { cn, inr, inrShort, fmtDateShort } from '@/lib/format'
import { InvNav, OutletChip, StockBar, fmtQty, qtyIn, worstStatus, daysTo, stockStatus, hash01, type StockStatus } from './shared'
import { AdjustStockModal, AddStockModal, MaterialModal, MovementDrawer, MovementLog } from './InventoryModals'
import { NewPOModal, type POPrefill } from './PurchaseModals'

type Row = { id: string; m: Material; qty: number; value: number; status: StockStatus }

export default function Inventory() {
  const { outletIds, isAll } = useScope()
  const { can } = usePermission()
  const materials = useStore((s) => s.materials)
  const movements = useStore((s) => s.movements)
  const purchaseOrders = useStore((s) => s.purchaseOrders)
  const outlets = useStore((s) => s.outlets)
  const [params] = useSearchParams()
  const initialOutlet = params.get('outlet')

  const [tab, setTab] = useState<'stock' | 'log'>('stock')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const [outletF, setOutletF] = useState<string>(initialOutlet && outletIds.includes(initialOutlet) ? initialOutlet : 'all')
  const [statusF, setStatusF] = useState<'All' | StockStatus>('All')

  const [adjust, setAdjust] = useState<Material | null>(null)
  const [inward, setInward] = useState<Material | null>(null)
  const [history, setHistory] = useState<Material | null>(null)
  const [matModal, setMatModal] = useState<{ open: boolean; m?: Material | null }>({ open: false })
  const [poPrefill, setPoPrefill] = useState<POPrefill | null>(null)

  const ids = useMemo(() => (outletF !== 'all' && outletIds.includes(outletF) ? [outletF] : outletIds), [outletF, outletIds])
  const multi = ids.length > 1
  const cats = useMemo(() => ['All', ...new Set(materials.map((m) => m.category))], [materials])

  const allRows: Row[] = useMemo(() => materials.map((m) => {
    const qty = qtyIn(m, ids)
    return { id: m.id, m, qty, value: qty * m.cost, status: worstStatus(m, ids) }
  }), [materials, ids])
  const rows = allRows.filter((r) =>
    (cat === 'All' || r.m.category === cat) && (statusF === 'All' || r.status === statusF) &&
    (!q || r.m.name.toLowerCase().includes(q.toLowerCase()) || r.m.code.toLowerCase().includes(q.toLowerCase())))

  /* KPIs */
  const totalValue = allRows.reduce((s, r) => s + r.value, 0)
  const lowPairs = materials.flatMap((m) => ids.filter((id) => stockStatus(m.stock[id] ?? 0, m.min) === 'Low Stock').map((id) => ({ m, id })))
  const outPairs = materials.flatMap((m) => ids.filter((id) => (m.stock[id] ?? 0) <= 0).map((id) => ({ m, id })))
  const available = allRows.filter((r) => r.qty > 0).length
  const pendingPOs = purchaseOrders.filter((p) => ids.includes(p.outletId) && ['Draft', 'Pending Approval', 'Approved', 'Partially Received'].includes(p.status))
  const matById = useMemo(() => Object.fromEntries(materials.map((m) => [m.id, m])), [materials])
  const todayCons = movements.filter((mv) => mv.type === 'Consumption' && ids.includes(mv.outletId) && isToday(mv.at))
    .reduce((s, mv) => s + Math.abs(mv.qty) * (matById[mv.materialId]?.cost ?? 0), 0)
  const expiring = materials.filter((m) => m.expiry && daysTo(m.expiry) <= 3 && qtyIn(m, ids) > 0).sort((a, b) => daysTo(a.expiry) - daysTo(b.expiry))

  /* charts */
  const byCat = useMemo(() => {
    const map: Record<string, number> = {}
    allRows.forEach((r) => { map[r.m.category] = (map[r.m.category] ?? 0) + r.value })
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value)
  }, [allRows])
  const trend = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 864e5)
    const base = totalValue * 0.075 * (0.82 + 0.36 * hash01(ids.join() + d.getDate()))
    const value = i === 6 ? Math.max(todayCons, base * 0.55) : base
    return { day: i === 6 ? 'Today' : fmtDateShort(d), value: Math.round(value), wastage: Math.round(value * (0.025 + 0.03 * hash01('w' + d.getDate()))) }
  }), [totalValue, ids, todayCons])

  const createPO = (m: Material, outletId: string) => {
    if (!can('purchase', 'create')) return toast.error('No permission', 'You cannot raise purchase orders')
    setPoPrefill({ supplierId: m.supplierId, outletId, lines: [{ materialId: m.id, qty: Math.max(1, Math.ceil(m.min * 2 - (m.stock[outletId] ?? 0))) }] })
  }
  const createBulkPO = () => {
    if (!lowPairs.length && !outPairs.length) return
    const first = [...outPairs, ...lowPairs][0]
    const sup = first.m.supplierId
    const outlet = first.id
    const lines = [...outPairs, ...lowPairs].filter((p) => p.id === outlet && p.m.supplierId === sup)
      .map((p) => ({ materialId: p.m.id, qty: Math.max(1, Math.ceil(p.m.min * 2 - (p.m.stock[outlet] ?? 0))) }))
    setPoPrefill({ supplierId: sup, outletId: outlet, lines })
  }

  const canEdit = can('inventory', 'edit')
  const canCreate = can('inventory', 'create')
  const outletList = outlets.filter((o) => ids.includes(o.id))

  const cols: Column<Row>[] = [
    { key: 'name', header: 'Material', sortValue: (r) => r.m.name, render: (r) => (
      <div className="min-w-36"><p className="font-medium text-slate-800">{r.m.name}</p><p className="text-[11px] text-slate-400">{r.m.code}</p></div>
    ) },
    { key: 'cat', header: 'Category', sortValue: (r) => r.m.category, render: (r) => <Badge tone="gray">{r.m.category}</Badge> },
    { key: 'qty', header: 'Available', align: 'right', render: (r) => (
      <div className="ml-auto w-24"><p className="font-semibold text-slate-900 tabular">{fmtQty(r.qty)}</p><StockBar qty={r.qty} min={r.m.min * ids.length} /></div>
    ) },
    { key: 'unit', header: 'Unit', sortable: false, render: (r) => <span className="text-slate-500">{r.m.unit}</span> },
    { key: 'min', header: 'Min', align: 'right', sortValue: (r) => r.m.min, render: (r) => <span className="text-slate-500">{fmtQty(r.m.min)}{multi && <span className="text-[10.5px]">/outlet</span>}</span> },
    { key: 'cost', header: 'Unit cost', align: 'right', sortValue: (r) => r.m.cost, render: (r) => inr(r.m.cost) },
    { key: 'value', header: 'Stock value', align: 'right', render: (r) => <span className="font-medium">{inr(r.value)}</span> },
    { key: 'outlet', header: 'Outlet', sortable: false, render: (r) => multi ? (
      <div className="flex flex-wrap gap-1" title={outletList.map((o) => `${o.short}: ${fmtQty(r.m.stock[o.id] ?? 0)} ${r.m.unit}`).join('\n')}>
        {outletList.map((o) => {
          const st = stockStatus(r.m.stock[o.id] ?? 0, r.m.min)
          return (
            <span key={o.id} className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-medium tabular ring-1 ring-inset',
              st === 'In Stock' ? 'bg-slate-50 text-slate-600 ring-slate-200' : st === 'Low Stock' ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-rose-50 text-rose-700 ring-rose-200')}>
              <span className="size-1.5 rounded-full" style={{ background: o.color }} />{o.code.split('-')[1]} {fmtQty(r.m.stock[o.id] ?? 0)}
            </span>
          )
        })}
      </div>
    ) : <OutletChip id={ids[0]} /> },
    { key: 'status', header: 'Status', sortValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    { key: 'act', header: '', sortable: false, align: 'right', render: (r) => (
      <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
        {canCreate && <IconButton tooltip="Add stock" onClick={() => setInward(r.m)}><PackagePlus className="size-3.5" /></IconButton>}
        {canEdit && <IconButton tooltip="Adjust stock" onClick={() => setAdjust(r.m)}><SlidersHorizontal className="size-3.5" /></IconButton>}
        <IconButton tooltip="Movement history" onClick={() => setHistory(r.m)}><History className="size-3.5" /></IconButton>
        {canEdit && <IconButton tooltip="Edit material" onClick={() => setMatModal({ open: true, m: r.m })}><Pencil className="size-3.5" /></IconButton>}
      </div>
    ) },
  ]

  return (
    <div>
      <InvNav />
      <PageHeader title="Inventory" subtitle={`Raw material stock across ${isAll ? `${outletIds.length} outlets` : outlets.find((o) => o.id === outletIds[0])?.name}`}
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Stock register' }]}
        actions={<>
          <Button icon={<Download className="size-3.5" />} onClick={() => toast.success('Stock register exported', `${rows.length} materials · Excel (simulated)`)}>Export</Button>
          {can('purchase', 'create') && <Button icon={<ShoppingCart className="size-3.5" />} onClick={() => setPoPrefill({})}>New PO</Button>}
          {canCreate && <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setMatModal({ open: true, m: null })}>Add material</Button>}
        </>} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total stock value" value={inrShort(totalValue)} icon={<IndianRupee />} tone="navy" sub={`${ids.length} outlet${ids.length > 1 ? 's' : ''}`} />
        <StatCard label="Available items" value={available} icon={<PackageCheck />} tone="green" sub={`of ${materials.length} materials`} />
        <StatCard label="Low stock items" value={lowPairs.length} icon={<AlertTriangle />} tone="amber" sub="below minimum" onClick={() => { setTab('stock'); setStatusF('Low Stock') }} />
        <StatCard label="Out of stock" value={outPairs.length} icon={<PackageX />} tone="red" sub="needs reorder" onClick={() => { setTab('stock'); setStatusF('Out of Stock') }} />
        <StatCard label="Pending purchases" value={pendingPOs.length} icon={<ShoppingCart />} tone="violet" sub={inrShort(pendingPOs.reduce((s, p) => s + p.items.reduce((a, i) => a + i.qty * i.rate, 0) * 1.05, 0))} />
        <StatCard label="Today's consumption" value={inr(todayCons)} icon={<Flame />} tone="orange" sub="recipe auto-deduct" />
      </div>

      {(lowPairs.length + outPairs.length + expiring.length) > 0 && (
        <Card className="mt-3 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-amber-50/40 px-4 py-2">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-800"><AlertTriangle className="size-3.5" />Stock alerts · {outPairs.length + lowPairs.length} reorder, {expiring.length} expiry</p>
            {can('purchase', 'create') && <Button size="xs" variant="warning" icon={<ShoppingCart className="size-3" />} onClick={createBulkPO}>Auto-create PO for top supplier</Button>}
          </div>
          <div className="flex gap-2 overflow-x-auto p-3 no-scrollbar">
            {expiring.map((m) => {
              const d = daysTo(m.expiry)
              return (
                <div key={'e' + m.id} className="flex w-56 shrink-0 items-center gap-2.5 rounded-lg border border-orange-200 bg-orange-50/50 px-2.5 py-2">
                  <CalendarClock className="size-4 shrink-0 text-orange-600" />
                  <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-medium text-slate-800">{m.name}</p><p className="text-[11px] text-orange-700">{d < 0 ? 'Expired' : d === 0 ? 'Expires today' : `Expires in ${d} day${d > 1 ? 's' : ''}`} · {fmtQty(qtyIn(m, ids))} {m.unit}</p></div>
                  {canEdit && <Button size="xs" onClick={() => setAdjust(m)}>Wastage</Button>}
                </div>
              )
            })}
            {[...outPairs, ...lowPairs].slice(0, 14).map(({ m, id }) => {
              const q2 = m.stock[id] ?? 0
              return (
                <div key={m.id + id} className={cn('flex w-60 shrink-0 items-center gap-2.5 rounded-lg border px-2.5 py-2', q2 <= 0 ? 'border-rose-200 bg-rose-50/40' : 'border-amber-200 bg-amber-50/40')}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-slate-800">{m.name}</p>
                    <p className="flex items-center gap-1 text-[11px] text-slate-500">{multi && <OutletChip id={id} className="!px-1 !py-0 text-[10px]" />}<span className={q2 <= 0 ? 'text-rose-600' : 'text-amber-700'}>{fmtQty(q2)}/{m.min} {m.unit}</span></p>
                  </div>
                  {can('purchase', 'create') && <Button size="xs" variant="outline" onClick={() => createPO(m, id)}>Create PO</Button>}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card className="mt-3 overflow-hidden">
        <Tabs className="px-3" value={tab} onChange={setTab} items={[
          { value: 'stock', label: 'Stock register', icon: <Boxes className="size-3.5" />, count: rows.length },
          { value: 'log', label: 'Movement log', icon: <History className="size-3.5" /> },
        ]} />
        {tab === 'stock' ? (
          <>
            <FilterBar>
              <SearchInput className="w-56" placeholder="Search material or code…" value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} />
              <Select className="w-40" value={cat} onChange={(e) => setCat(e.target.value)}>{cats.map((c) => <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>)}</Select>
              {outletIds.length > 1 && (
                <Select className="w-44" value={outletF} onChange={(e) => setOutletF(e.target.value)}>
                  <option value="all">All outlets in scope</option>
                  {outlets.filter((o) => outletIds.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{o.short}</option>)}
                </Select>
              )}
              <div className="flex gap-1">
                {(['All', 'In Stock', 'Low Stock', 'Out of Stock'] as const).map((s) => (
                  <button key={s} onClick={() => setStatusF(s)} className={cn('rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium transition', statusF === s ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                    {s}{s !== 'All' && <span className="ml-1 opacity-70">{allRows.filter((r) => r.status === s).length}</span>}
                  </button>
                ))}
              </div>
            </FilterBar>
            <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 py-1.5 no-scrollbar">
              {cats.map((c) => (
                <button key={c} onClick={() => setCat(c)} className={cn('whitespace-nowrap rounded-md px-2 py-0.5 text-[11.5px] transition', cat === c ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-500 hover:bg-slate-100')}>{c}</button>
              ))}
            </div>
            <DataTable columns={cols} rows={rows} onRowClick={(r) => setHistory(r.m)} pageSize={12}
              rowClassName={(r) => (r.status === 'Out of Stock' ? 'bg-rose-50/30' : undefined)} />
          </>
        ) : <MovementLog outletIds={ids} onOpen={setHistory} />}
      </Card>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader title="Stock value by category" subtitle={`Total ${inr(totalValue)}`} />
          <div className="h-60 p-3">
            <ResponsiveContainer>
              <BarChart data={byCat} margin={{ left: 0, right: 8, top: 4 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="name" tick={CHART.axis} interval={0} angle={-20} textAnchor="end" height={48} />
                <YAxis tick={CHART.axis} tickFormatter={(v) => inrShort(v)} width={56} />
                <Tooltip {...tooltipStyle} formatter={(v) => inr(Number(v))} />
                <Bar dataKey="value" name="Stock value" radius={[4, 4, 0, 0]}>
                  {byCat.map((_, i) => <Cell key={i} fill={CHART.series[i % CHART.series.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Consumption trend" subtitle="Last 7 days · value consumed vs wastage" />
          <div className="h-60 p-3">
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ left: 0, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="invCons" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART.teal} stopOpacity={0.25} /><stop offset="100%" stopColor={CHART.teal} stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="day" tick={CHART.axis} />
                <YAxis tick={CHART.axis} tickFormatter={(v) => inrShort(v)} width={56} />
                <Tooltip {...tooltipStyle} formatter={(v) => inr(Number(v))} />
                <Area type="monotone" dataKey="value" name="Consumption" stroke={CHART.teal} strokeWidth={2} fill="url(#invCons)" />
                <Area type="monotone" dataKey="wastage" name="Wastage" stroke={CHART.red} strokeWidth={1.5} fill="none" strokeDasharray="4 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <AdjustStockModal material={adjust} onClose={() => setAdjust(null)} outletId={ids.length === 1 ? ids[0] : undefined} />
      <AddStockModal material={inward} onClose={() => setInward(null)} outletId={ids.length === 1 ? ids[0] : undefined} />
      <MaterialModal open={matModal.open} material={matModal.m} onClose={() => setMatModal({ open: false })} />
      <MovementDrawer material={history} onClose={() => setHistory(null)} onAdjust={canEdit ? (m) => setAdjust(m) : undefined} />
      <NewPOModal open={!!poPrefill} prefill={poPrefill ?? undefined} onClose={() => setPoPrefill(null)} />
    </div>
  )
}
