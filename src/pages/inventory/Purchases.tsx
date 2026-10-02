import { useMemo, useState } from 'react'
import { ShoppingCart, Plus, ClipboardList, PackageCheck, Undo2, Printer, CheckCircle2, XCircle, Send, Clock, IndianRupee, Truck, FileText } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PurchaseOrder, POStatus } from '@/types'
import { useStore } from '@/store/useStore'
import { useScope, usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { PageHeader, Card, CardHeader, StatCard, Button, DataTable, FilterBar, SearchInput, StatusBadge, Tabs, Drawer, KeyValue, Badge, CHART, tooltipStyle, type Column } from '@/components/ui'
import { PrintPreviewModal } from '@/components/print/Print'
import { cn, fmtDate, inr, inrShort } from '@/lib/format'
import { InvNav, OutletChip, GST_RATE, fmtQty, poSubtotal, poTotal } from './shared'
import { NewPOModal, GRNModal, ReturnModal } from './PurchaseModals'
import { PODocument } from './PurchaseDocs'

const STATUSES: (POStatus | 'All')[] = ['All', 'Draft', 'Pending Approval', 'Approved', 'Partially Received', 'Received', 'Returned', 'Cancelled']

export default function Purchases() {
  const { outletIds, isAll } = useScope()
  const { can } = usePermission()
  const pos = useStore((s) => s.purchaseOrders)
  const suppliers = useStore((s) => s.suppliers)
  const supById = useMemo(() => Object.fromEntries(suppliers.map((s) => [s.id, s])), [suppliers])

  const [tab, setTab] = useState<'po' | 'grn' | 'ret'>('po')
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('All')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [newPO, setNewPO] = useState(false)
  const [grnPO, setGrnPO] = useState<PurchaseOrder | null>(null)
  const [retPO, setRetPO] = useState<PurchaseOrder | null>(null)
  const [print, setPrint] = useState<{ po: PurchaseOrder; kind: 'PO' | 'GRN' } | null>(null)

  const scoped = useMemo(() => pos.filter((p) => outletIds.includes(p.outletId)), [pos, outletIds])
  const match = (p: PurchaseOrder) => !q || p.no.toLowerCase().includes(q.toLowerCase()) || supById[p.supplierId]?.name.toLowerCase().includes(q.toLowerCase())
  const poRows = scoped.filter((p) => (status === 'All' || p.status === status) && match(p))
  const grnRows = scoped.filter((p) => p.grnNo && match(p))
  const retRows = scoped.filter((p) => p.status === 'Returned' && match(p))
  const open = pos.find((p) => p.id === openId) ?? null

  const pending = scoped.filter((p) => p.status === 'Pending Approval')
  const awaiting = scoped.filter((p) => p.status === 'Approved' || p.status === 'Partially Received')
  const received = scoped.filter((p) => p.status === 'Received')
  const bySupplier = useMemo(() => {
    const map: Record<string, number> = {}
    scoped.filter((p) => p.status !== 'Cancelled').forEach((p) => { map[p.supplierId] = (map[p.supplierId] ?? 0) + poTotal(p) })
    return Object.entries(map).map(([id, value]) => ({ name: supById[id]?.name.split(' ').slice(0, 2).join(' ') ?? id, value: Math.round(value) })).sort((a, b) => b.value - a.value)
  }, [scoped, supById])

  const baseCols: Column<PurchaseOrder>[] = [
    { key: 'no', header: 'PO no.', render: (p) => <span className="font-mono text-[12px] font-medium text-navy-700">{p.no}</span> },
    { key: 'supplier', header: 'Supplier', sortValue: (p) => supById[p.supplierId]?.name ?? '', render: (p) => <div><p className="font-medium text-slate-800">{supById[p.supplierId]?.name}</p><p className="text-[11px] text-slate-400">{supById[p.supplierId]?.category}</p></div> },
    { key: 'outletId', header: 'Outlet', render: (p) => <OutletChip id={p.outletId} /> },
    { key: 'date', header: 'Date', render: (p) => fmtDate(p.date) },
  ]
  const poCols: Column<PurchaseOrder>[] = [
    ...baseCols,
    { key: 'expected', header: 'Expected', render: (p) => fmtDate(p.expected) },
    { key: 'items', header: 'Items', align: 'right', sortValue: (p) => p.items.length, render: (p) => p.items.length },
    { key: 'amt', header: 'Amount', align: 'right', sortValue: poTotal, render: (p) => <span className="font-semibold">{inr(poTotal(p))}</span> },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
  ]
  const grnCols: Column<PurchaseOrder>[] = [
    { key: 'grn', header: 'GRN no.', sortValue: (p) => p.grnNo ?? '', render: (p) => <span className="font-mono text-[12px] font-medium text-emerald-700">{p.grnNo}</span> },
    ...baseCols,
    { key: 'recd', header: 'Received', align: 'right', sortValue: (p) => p.items.reduce((s, i) => s + (i.received ?? 0) * i.rate, 0), render: (p) => inr(p.items.reduce((s, i) => s + (i.received ?? 0) * i.rate, 0) * (1 + GST_RATE)) },
    { key: 'fill', header: 'Fill rate', align: 'right', sortable: false, render: (p) => { const r = p.items.reduce((s, i) => s + (i.received ?? 0), 0) / p.items.reduce((s, i) => s + i.qty, 0); return <span className={r < 1 ? 'text-amber-600' : 'text-emerald-600'}>{Math.round(r * 100)}%</span> } },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'pr', header: '', sortable: false, render: (p) => <Button size="xs" icon={<Printer className="size-3" />} onClick={(e) => { e.stopPropagation(); setPrint({ po: p, kind: 'GRN' }) }}>GRN</Button> },
  ]
  const retCols: Column<PurchaseOrder>[] = [
    ...baseCols,
    { key: 'amt', header: 'PO value', align: 'right', sortValue: poTotal, render: (p) => inr(poTotal(p)) },
    { key: 'note', header: 'Return details', sortable: false, render: (p) => <span className="line-clamp-2 max-w-sm text-[12px] text-slate-600">{p.note ?? 'Returned to supplier'}</span> },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
  ]

  return (
    <div>
      <InvNav />
      <PageHeader title="Purchases" subtitle={`Purchase orders, goods receipts and returns · ${isAll ? 'all outlets in scope' : 'current outlet'}`}
        breadcrumbs={[{ label: 'Inventory', to: '/inventory' }, { label: 'Purchases' }]}
        actions={can('purchase', 'create') && <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setNewPO(true)}>New purchase order</Button>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Purchase value (14d)" value={inrShort(scoped.filter((p) => p.status !== 'Cancelled').reduce((s, p) => s + poTotal(p), 0))} icon={<IndianRupee />} sub={`${scoped.length} POs`} />
        <StatCard label="Pending approval" value={pending.length} icon={<Clock />} tone="amber" sub={inrShort(pending.reduce((s, p) => s + poTotal(p), 0))} onClick={() => { setTab('po'); setStatus('Pending Approval') }} />
        <StatCard label="Awaiting delivery" value={awaiting.length} icon={<Truck />} tone="blue" sub="approved / partial" onClick={() => { setTab('po'); setStatus('Approved') }} />
        <StatCard label="Received" value={received.length} icon={<PackageCheck />} tone="green" sub={inrShort(received.reduce((s, p) => s + poTotal(p), 0))} onClick={() => setTab('grn')} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_340px]">
        <Card className="min-w-0 overflow-hidden">
          <Tabs className="px-3" value={tab} onChange={setTab} items={[
            { value: 'po', label: 'Purchase Orders', icon: <ClipboardList className="size-3.5" />, count: scoped.length },
            { value: 'grn', label: 'GRN / Received', icon: <PackageCheck className="size-3.5" />, count: grnRows.length },
            { value: 'ret', label: 'Returns', icon: <Undo2 className="size-3.5" />, count: retRows.length },
          ]} />
          <FilterBar>
            <SearchInput className="w-56" placeholder="Search PO no. or supplier…" value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} />
            {tab === 'po' && (
              <div className="flex flex-wrap gap-1">
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => setStatus(s)} className={cn('rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium transition', status === s ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                    {s}{s !== 'All' && <span className="ml-1 opacity-60">{scoped.filter((p) => p.status === s).length}</span>}
                  </button>
                ))}
              </div>
            )}
          </FilterBar>
          {tab === 'po' && <DataTable columns={poCols} rows={poRows} onRowClick={(p) => setOpenId(p.id)} />}
          {tab === 'grn' && <DataTable columns={grnCols} rows={grnRows} onRowClick={(p) => setOpenId(p.id)} />}
          {tab === 'ret' && <DataTable columns={retCols} rows={retRows} onRowClick={(p) => setOpenId(p.id)} />}
        </Card>
        <Card>
          <CardHeader title="Purchases by supplier" subtitle="Order value incl. GST" icon={<ShoppingCart className="size-3.5" />} />
          <div className="h-[360px] p-2">
            <ResponsiveContainer>
              <BarChart data={bySupplier} layout="vertical" margin={{ left: 4, right: 12 }}>
                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" tick={CHART.axis} tickFormatter={(v) => inrShort(v)} />
                <YAxis type="category" dataKey="name" tick={CHART.axis} width={110} />
                <Tooltip {...tooltipStyle} formatter={(v) => inr(Number(v))} />
                <Bar dataKey="value" name="Purchases" fill={CHART.navy} radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <PODrawer po={open} onClose={() => setOpenId(null)} onReceive={setGrnPO} onReturn={setRetPO} onPrint={(po, kind) => setPrint({ po, kind })} />
      <NewPOModal open={newPO} onClose={() => setNewPO(false)} onCreated={(po) => setOpenId(po.id)} />
      <GRNModal po={grnPO} onClose={() => setGrnPO(null)} />
      <ReturnModal po={retPO} onClose={() => setRetPO(null)} />
      <PrintPreviewModal open={!!print} onClose={() => setPrint(null)} paper="a4" title={print?.kind === 'GRN' ? 'Goods Receipt Note' : 'Purchase Order'} subtitle={print?.po.no}>
        {print ? <PODocument po={print.po} kind={print.kind} /> : null}
      </PrintPreviewModal>
    </div>
  )
}

/* ------------------------------------------------------------------ PO detail drawer */
function PODrawer({ po, onClose, onReceive, onReturn, onPrint }: {
  po: PurchaseOrder | null; onClose: () => void; onReceive: (p: PurchaseOrder) => void; onReturn: (p: PurchaseOrder) => void; onPrint: (p: PurchaseOrder, k: 'PO' | 'GRN') => void
}) {
  const { can } = usePermission()
  const suppliers = useStore((s) => s.suppliers)
  const materials = useStore((s) => s.materials)
  const upsertPO = useStore((s) => s.upsertPO)
  const log = useStore((s) => s.log)
  if (!po) return null
  const sup = suppliers.find((s) => s.id === po.supplierId)
  const sub = poSubtotal(po)
  const gst = sub * GST_RATE
  const setStatus = (status: POStatus, msg: string) => {
    upsertPO({ ...po, status })
    log(`${msg} purchase order ${po.no}`, 'purchase', status === 'Cancelled' ? 'danger' : 'success', po.outletId)
    toast.success(`PO ${msg.toLowerCase()}`, po.no)
  }
  const order: POStatus[] = ['Draft', 'Pending Approval', 'Approved', 'Partially Received', 'Received']
  const idx = order.indexOf(po.status)
  const timeline = [
    { label: 'PO created', sub: `${fmtDate(po.date)} · ${po.createdBy}`, done: true },
    { label: 'Submitted for approval', sub: po.status === 'Draft' ? 'Pending submission' : fmtDate(po.date), done: idx >= 1 || po.status === 'Returned' },
    { label: 'Approved', sub: idx >= 2 || po.status === 'Returned' ? 'Approved by Regional Manager' : 'Awaiting approver', done: idx >= 2 || po.status === 'Returned' },
    { label: 'Goods received', sub: po.grnNo ? `${po.grnNo}${po.status === 'Partially Received' ? ' (partial)' : ''}` : `Expected ${fmtDate(po.expected)}`, done: idx >= 3 || po.status === 'Returned' },
    ...(po.status === 'Returned' ? [{ label: 'Returned to supplier', sub: po.note ?? '', done: true, bad: true }] : []),
    ...(po.status === 'Cancelled' ? [{ label: 'Cancelled', sub: 'PO rejected / cancelled', done: true, bad: true }] : []),
  ] as { label: string; sub: string; done: boolean; bad?: boolean }[]

  return (
    <Drawer open onClose={onClose} width={600} title={po.no} subtitle={`${sup?.name} · ${fmtDate(po.date)}`}
      icon={<span className="flex size-9 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><FileText className="size-4" /></span>}
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button className="mr-auto" icon={<Printer className="size-3.5" />} onClick={() => onPrint(po, 'PO')}>Print PO</Button>
          {po.grnNo && <Button icon={<Printer className="size-3.5" />} onClick={() => onPrint(po, 'GRN')}>Print GRN</Button>}
          {po.status === 'Draft' && can('purchase', 'create') && <Button variant="primary" icon={<Send className="size-3.5" />} onClick={() => setStatus('Pending Approval', 'Submitted')}>Submit</Button>}
          {po.status === 'Pending Approval' && can('purchase', 'approve') && <>
            <Button variant="danger" icon={<XCircle className="size-3.5" />} onClick={() => setStatus('Cancelled', 'Rejected')}>Reject</Button>
            <Button variant="success" icon={<CheckCircle2 className="size-3.5" />} onClick={() => setStatus('Approved', 'Approved')}>Approve</Button>
          </>}
          {po.status === 'Pending Approval' && !can('purchase', 'approve') && <Badge tone="amber">Awaiting approver</Badge>}
          {(po.status === 'Approved' || po.status === 'Partially Received') && (can('purchase', 'edit') || can('purchase', 'create')) &&
            <Button variant="accent" icon={<PackageCheck className="size-3.5" />} onClick={() => onReceive(po)}>Receive goods</Button>}
          {(po.status === 'Received' || po.status === 'Partially Received') && can('purchase', 'edit') &&
            <Button variant="outline" icon={<Undo2 className="size-3.5" />} onClick={() => onReturn(po)}>Return</Button>}
        </div>
      }>
      <div className="mb-4 flex items-center justify-between"><StatusBadge status={po.status} /><span className="text-[18px] font-semibold tabular text-slate-900">{inr(sub + gst)}</span></div>
      <KeyValue className="mb-4 rounded-xl border border-slate-200 p-3" items={[
        ['Supplier', sup?.name], ['GSTIN', sup?.gstin], ['Deliver to', <OutletChip key="o" id={po.outletId} />], ['Expected', fmtDate(po.expected)],
        ['Payment terms', sup?.terms], ['Raised by', po.createdBy],
      ]} />
      <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">Line items</p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-[12.5px]">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-2 py-1.5 text-left">Material</th><th className="px-2 py-1.5 text-right">Qty</th><th className="px-2 py-1.5 text-right">Recd</th><th className="px-2 py-1.5 text-right">Rate</th><th className="px-2 py-1.5 text-right">Amount</th></tr></thead>
          <tbody>
            {po.items.map((it) => {
              const m = materials.find((x) => x.id === it.materialId)
              return (
                <tr key={it.materialId} className="border-t border-slate-100">
                  <td className="px-2 py-1.5"><p className="font-medium text-slate-800">{m?.name}</p><p className="text-[11px] text-slate-400">{m?.code}</p></td>
                  <td className="px-2 py-1.5 text-right tabular">{fmtQty(it.qty)} {m?.unit}</td>
                  <td className={cn('px-2 py-1.5 text-right tabular', (it.received ?? 0) < it.qty ? 'text-amber-600' : 'text-emerald-600')}>{fmtQty(it.received ?? 0)}</td>
                  <td className="px-2 py-1.5 text-right tabular">{inr(it.rate)}</td>
                  <td className="px-2 py-1.5 text-right font-medium tabular">{inr(it.qty * it.rate)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="text-[12px]">
            <tr className="border-t border-slate-200"><td colSpan={4} className="px-2 py-1 text-right text-slate-500">Subtotal</td><td className="px-2 py-1 text-right tabular">{inr(sub, true)}</td></tr>
            <tr><td colSpan={4} className="px-2 py-1 text-right text-slate-500">GST 5% (CGST + SGST)</td><td className="px-2 py-1 text-right tabular">{inr(gst, true)}</td></tr>
            <tr className="bg-slate-50 font-semibold"><td colSpan={4} className="px-2 py-1.5 text-right">Total</td><td className="px-2 py-1.5 text-right tabular">{inr(sub + gst, true)}</td></tr>
          </tfoot>
        </table>
      </div>
      {po.note && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600"><b>Note:</b> {po.note}</p>}
      <p className="mb-2 mt-4 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">Timeline</p>
      <ol className="space-y-3">
        {timeline.map((t, i) => (
          <li key={i} className="flex gap-3">
            <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full', t.bad ? 'bg-rose-100 text-rose-600' : t.done ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-400')}>
              {t.bad ? <XCircle className="size-3" /> : t.done ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
            </span>
            <div><p className={cn('text-[12.5px] font-medium', t.done ? 'text-slate-800' : 'text-slate-400')}>{t.label}</p><p className="text-[11.5px] text-slate-500">{t.sub}</p></div>
          </li>
        ))}
      </ol>
    </Drawer>
  )
}
