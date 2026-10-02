import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, ArrowRight, Plus, Clock, Truck, PackageCheck, CheckCircle2, XCircle, Printer, Send, Boxes, ChevronRight, IndianRupee } from 'lucide-react'
import type { StockTransfer, TransferStatus } from '@/types'
import { useStore } from '@/store/useStore'
import { useScope, usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { PageHeader, Card, StatCard, Button, DataTable, FilterBar, SearchInput, StatusBadge, Drawer, Badge, ConfirmDialog, type Column } from '@/components/ui'
import { PrintPreviewModal, ThermalPaper, TRow, TDash, TCenter, MiniQR } from '@/components/print/Print'
import { ORG } from '@/data/outlets'
import { cn, fmtDate, fmtDateTime, inr, inrShort } from '@/lib/format'
import { InvNav, OutletChip, fmtQty } from './shared'
import { TransferWizard } from './TransferWizard'

const PIPE: TransferStatus[] = ['Pending Approval', 'Approved', 'In Transit', 'Received', 'Rejected']
const PIPE_ICON: Record<TransferStatus, typeof Clock> = { 'Pending Approval': Clock, Approved: CheckCircle2, 'In Transit': Truck, Received: PackageCheck, Rejected: XCircle }

export default function Transfers() {
  const { outletIds } = useScope()
  const { can } = usePermission()
  const transfers = useStore((s) => s.transfers)
  const materials = useStore((s) => s.materials)
  const matById = useMemo(() => Object.fromEntries(materials.map((m) => [m.id, m])), [materials])
  const [filter, setFilter] = useState<TransferStatus | 'All'>('All')
  const [q, setQ] = useState('')
  const [wizard, setWizard] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [print, setPrint] = useState<StockTransfer | null>(null)

  const value = (t: StockTransfer) => t.items.reduce((s, i) => s + i.qty * (matById[i.materialId]?.cost ?? 0), 0)
  const scoped = useMemo(() => transfers.filter((t) => outletIds.includes(t.from) || outletIds.includes(t.to)), [transfers, outletIds])
  const rows = scoped.filter((t) => (filter === 'All' || t.status === filter) && (!q || t.no.toLowerCase().includes(q.toLowerCase()) || t.items.some((i) => matById[i.materialId]?.name.toLowerCase().includes(q.toLowerCase()))))
  const open = transfers.find((t) => t.id === openId) ?? null
  const count = (s: TransferStatus) => scoped.filter((t) => t.status === s).length

  const cols: Column<StockTransfer>[] = [
    { key: 'no', header: 'Transfer', render: (t) => <div><p className="font-mono text-[12px] font-medium text-navy-700">{t.no}</p><p className="text-[11px] text-slate-400">{fmtDate(t.date)}</p></div> },
    { key: 'route', header: 'Source → Destination', sortValue: (t) => t.from, render: (t) => <div className="flex items-center gap-1.5"><OutletChip id={t.from} /><ArrowRight className="size-3 text-slate-400" /><OutletChip id={t.to} /></div> },
    { key: 'items', header: 'Items', sortValue: (t) => t.items.length, render: (t) => <span className="text-slate-600">{t.items.slice(0, 2).map((i) => matById[i.materialId]?.name).join(', ')}{t.items.length > 2 && ` +${t.items.length - 2}`}</span> },
    { key: 'value', header: 'Value', align: 'right', sortValue: value, render: (t) => <span className="font-medium">{inr(value(t))}</span> },
    { key: 'createdBy', header: 'Requested by' },
    { key: 'status', header: 'Status', render: (t) => <Pipeline status={t.status} /> },
  ]

  return (
    <div>
      <InvNav />
      <PageHeader title="Stock Transfer" subtitle="Inter-outlet transfers with approval, dispatch and receipt tracking" breadcrumbs={[{ label: 'Inventory', to: '/inventory' }, { label: 'Stock Transfer' }]}
        actions={can('transfer', 'create') && <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setWizard(true)}>New transfer</Button>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending approval" value={count('Pending Approval')} icon={<Clock />} tone="amber" onClick={() => setFilter('Pending Approval')} sub="needs approver" />
        <StatCard label="In transit" value={count('In Transit')} icon={<Truck />} tone="blue" onClick={() => setFilter('In Transit')} sub="awaiting receipt" />
        <StatCard label="Received" value={count('Received')} icon={<PackageCheck />} tone="green" onClick={() => setFilter('Received')} sub="completed" />
        <StatCard label="Transfer value" value={inrShort(scoped.filter((t) => t.status !== 'Rejected').reduce((s, t) => s + value(t), 0))} icon={<IndianRupee />} sub={`${scoped.length} transfers`} />
      </div>

      <Card className="mt-3 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => setFilter('All')} className={cn('rounded-lg border px-3 py-1.5 text-[12px] font-medium', filter === 'All' ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>All · {scoped.length}</button>
          {PIPE.map((s, i) => {
            const Icon = PIPE_ICON[s]
            return (
              <div key={s} className="flex items-center gap-1.5">
                {i > 0 && i < 4 && <ChevronRight className="size-3.5 text-slate-300" />}
                {i === 4 && <span className="mx-1 h-5 w-px bg-slate-200" />}
                <button onClick={() => setFilter(s)} className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition',
                  filter === s ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>
                  <Icon className="size-3.5" />{s}<span className="rounded-full bg-slate-100 px-1.5 text-[10.5px] text-slate-600">{count(s)}</span>
                </button>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="mt-3 overflow-hidden">
        <FilterBar>
          <SearchInput className="w-60" placeholder="Search transfer no. or material…" value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} />
          <span className="ml-auto text-[11.5px] text-slate-400">{rows.length} transfers</span>
        </FilterBar>
        <DataTable columns={cols} rows={rows} onRowClick={(t) => setOpenId(t.id)} />
      </Card>

      <TransferWizard open={wizard} onClose={() => setWizard(false)} onView={(t) => setOpenId(t.id)} />
      <TransferDrawer transfer={open} onClose={() => setOpenId(null)} onPrint={setPrint} />
      <PrintPreviewModal open={!!print} onClose={() => setPrint(null)} title="Transfer challan" subtitle={print?.no}>
        {(w) => print && <Challan t={print} width={w} />}
      </PrintPreviewModal>
    </div>
  )
}

function Pipeline({ status }: { status: TransferStatus }) {
  if (status === 'Rejected') return <StatusBadge status="Rejected" />
  const idx = PIPE.indexOf(status)
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">{[0, 1, 2, 3].map((i) => <span key={i} className={cn('h-1.5 w-3 rounded-full', i <= idx ? (idx === 3 ? 'bg-emerald-500' : 'bg-brand-500') : 'bg-slate-200')} />)}</div>
      <StatusBadge status={status} />
    </div>
  )
}

/* ------------------------------------------------------------------ Drawer */
function TransferDrawer({ transfer, onClose, onPrint }: { transfer: StockTransfer | null; onClose: () => void; onPrint: (t: StockTransfer) => void }) {
  const { can } = usePermission()
  const navigate = useNavigate()
  const materials = useStore((s) => s.materials)
  const setTransferStatus = useStore((s) => s.setTransferStatus)
  const [confirm, setConfirm] = useState<TransferStatus | null>(null)
  const [snapshot, setSnapshot] = useState<Record<string, Record<string, number>>>({})
  if (!transfer) return null
  const t = transfer
  const mat = (id: string) => materials.find((m) => m.id === id)
  const short = t.items.filter((i) => (mat(i.materialId)?.stock[t.from] ?? 0) < i.qty)
  const doStatus = (s: TransferStatus) => {
    if (s === 'In Transit' && short.length) return toast.error('Insufficient stock at source', short.map((i) => mat(i.materialId)?.name).join(', '))
    if (s === 'Received') setSnapshot((p) => ({ ...p, [t.id]: Object.fromEntries(t.items.map((i) => [i.materialId, mat(i.materialId)?.stock[t.to] ?? 0])) }))
    setTransferStatus(t.id, s)
    const msgs: Record<TransferStatus, string> = {
      'Pending Approval': '', Approved: 'Transfer approved — ready to dispatch', Rejected: 'Transfer rejected',
      'In Transit': 'Dispatched — stock deducted at source', Received: 'Received — destination inventory updated',
    }
    if (s === 'Rejected') toast.warning(msgs[s], t.no)
    else toast.success(msgs[s], t.no)
  }
  const snap = snapshot[t.id]
  const received = t.status === 'Received'
  const steps: { s: TransferStatus; label: string }[] = [
    { s: 'Pending Approval', label: 'Requested' }, { s: 'Approved', label: 'Approved' }, { s: 'In Transit', label: 'Dispatched' }, { s: 'Received', label: 'Received' },
  ]
  const idx = PIPE.indexOf(t.status)
  const canApprove = can('transfer', 'approve')
  const canMove = can('transfer', 'create') || canApprove
  const value = t.items.reduce((s, i) => s + i.qty * (mat(i.materialId)?.cost ?? 0), 0)

  return (
    <Drawer open onClose={onClose} width={600} title={`Transfer ${t.no}`} subtitle={`${fmtDate(t.date)} · requested by ${t.createdBy}`}
      icon={<span className="flex size-9 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><ArrowLeftRight className="size-4" /></span>}
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button className="mr-auto" icon={<Printer className="size-3.5" />} onClick={() => onPrint(t)}>Print challan</Button>
          {t.status === 'Pending Approval' && (canApprove ? <>
            <Button variant="danger" icon={<XCircle className="size-3.5" />} onClick={() => setConfirm('Rejected')}>Reject</Button>
            <Button variant="success" icon={<CheckCircle2 className="size-3.5" />} onClick={() => doStatus('Approved')}>Approve</Button>
          </> : <Badge tone="amber">Awaiting approver</Badge>)}
          {t.status === 'Approved' && canMove && <Button variant="primary" icon={<Send className="size-3.5" />} onClick={() => doStatus('In Transit')}>Dispatch</Button>}
          {t.status === 'In Transit' && canMove && <Button variant="accent" icon={<PackageCheck className="size-3.5" />} onClick={() => setConfirm('Received')}>Mark received</Button>}
          {received && <Button variant="outline" icon={<Boxes className="size-3.5" />} onClick={() => { onClose(); navigate('/inventory?outlet=' + t.to) }}>Review destination inventory</Button>}
        </div>
      }>
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 p-3">
        <div className="flex-1"><p className="text-[11px] text-slate-500">From</p><OutletChip id={t.from} full /></div>
        <ArrowRight className="size-4 text-slate-400" />
        <div className="flex-1"><p className="text-[11px] text-slate-500">To</p><OutletChip id={t.to} full /></div>
        <div className="text-right"><p className="text-[11px] text-slate-500">Value</p><p className="font-semibold">{inr(value)}</p></div>
      </div>

      {t.status !== 'Rejected' ? (
        <div className="mb-4 flex items-center">
          {steps.map((st, i) => (
            <div key={st.s} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <span className={cn('flex size-7 items-center justify-center rounded-full text-[11px] font-semibold', i <= idx ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-400', i === idx && 'ring-4 ring-brand-100')}>
                  {i < idx || (i === idx && i === 3) ? <CheckCircle2 className="size-3.5" /> : i + 1}
                </span>
                <span className={cn('text-[11px] font-medium', i <= idx ? 'text-slate-800' : 'text-slate-400')}>{st.label}</span>
              </div>
              {i < 3 && <div className={cn('mx-1 mb-4 h-0.5 flex-1 rounded', i < idx ? 'bg-brand-400' : 'bg-slate-200')} />}
            </div>
          ))}
        </div>
      ) : <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">This transfer was rejected. No stock was moved.</div>}

      <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">{received ? 'Destination inventory — before / after receipt' : 'Items'}</p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-[12.5px]">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
            <tr><th className="px-2 py-1.5 text-left">Material</th><th className="px-2 py-1.5 text-right">Qty</th>
              {received ? <><th className="px-2 py-1.5 text-right">Before</th><th className="px-2 py-1.5 text-right">After</th></> : <><th className="px-2 py-1.5 text-right">At source</th><th className="px-2 py-1.5 text-right">At destination</th></>}
            </tr>
          </thead>
          <tbody>
            {t.items.map((i) => {
              const m = mat(i.materialId)
              const src = m?.stock[t.from] ?? 0
              const dst = m?.stock[t.to] ?? 0
              const before = snap?.[i.materialId] ?? Math.max(0, dst - i.qty)
              return (
                <tr key={i.materialId} className="border-t border-slate-100">
                  <td className="px-2 py-1.5"><p className="font-medium text-slate-800">{m?.name}</p><p className="text-[11px] text-slate-400">{m?.code} · {inr(m?.cost ?? 0)}/{m?.unit}</p></td>
                  <td className="px-2 py-1.5 text-right font-semibold tabular">{fmtQty(i.qty)} {m?.unit}</td>
                  {received ? <>
                    <td className="px-2 py-1.5 text-right tabular text-slate-500">{fmtQty(before)}</td>
                    <td className="px-2 py-1.5 text-right tabular"><b className="text-emerald-600">{fmtQty(dst)}</b> <span className="text-[11px] text-emerald-600">(+{fmtQty(dst - before)})</span></td>
                  </> : <>
                    <td className={cn('px-2 py-1.5 text-right tabular', src < i.qty && t.status !== 'In Transit' ? 'font-semibold text-rose-600' : 'text-slate-600')}>{fmtQty(src)}</td>
                    <td className="px-2 py-1.5 text-right tabular text-slate-600">{fmtQty(dst)} <span className="text-[11px] text-slate-400">→ {fmtQty(dst + i.qty)}</span></td>
                  </>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {short.length > 0 && t.status === 'Approved' && <p className="mt-2 text-[11.5px] text-rose-600">Insufficient stock at source for {short.length} item(s) — dispatch is blocked.</p>}
      {received && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">Stock posted to destination as “Transfer In”. Use “Review destination inventory” to verify on the stock register.</p>}
      {t.note && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600"><b>Note:</b> {t.note}</p>}

      <p className="mb-2 mt-4 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">Activity log</p>
      <ol className="relative border-l border-slate-200 pl-4">
        {[...t.log].reverse().map((l, i) => (
          <li key={i} className="relative pb-3">
            <span className={cn('absolute -left-[21px] top-1 size-2.5 rounded-full ring-4 ring-white', i === 0 ? 'bg-brand-500' : 'bg-slate-300')} />
            <p className="text-[12.5px] text-slate-800">{l.text}</p>
            <p className="text-[11px] text-slate-400">{fmtDateTime(l.at)}</p>
          </li>
        ))}
      </ol>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => confirm && doStatus(confirm)}
        tone={confirm === 'Rejected' ? 'danger' : 'accent'} confirmLabel={confirm === 'Rejected' ? 'Reject transfer' : 'Confirm receipt'}
        title={confirm === 'Rejected' ? `Reject ${t.no}?` : `Receive ${t.no}?`}
        body={confirm === 'Rejected' ? 'The requester will be notified. No stock will move.' : `All ${t.items.length} item(s) will be added to destination stock.`} />
    </Drawer>
  )
}

/* ------------------------------------------------------------------ Challan */
function Challan({ t, width }: { t: StockTransfer; width: '80mm' | '58mm' }) {
  const outlets = useStore((s) => s.outlets)
  const materials = useStore((s) => s.materials)
  const from = outlets.find((o) => o.id === t.from)
  const to = outlets.find((o) => o.id === t.to)
  const total = t.items.reduce((s, i) => s + i.qty * (materials.find((m) => m.id === i.materialId)?.cost ?? 0), 0)
  return (
    <ThermalPaper width={width}>
      <TCenter className="font-bold">{ORG.name.toUpperCase()}</TCenter>
      <TCenter>STOCK TRANSFER CHALLAN</TCenter>
      <TDash />
      <TRow l="Challan No" r={t.no} />
      <TRow l="Date" r={fmtDate(t.date)} />
      <TRow l="Status" r={t.status} />
      <TDash />
      <div>FROM: {from?.name}</div>
      <div className="text-[10px]">{from?.address}</div>
      <div className="mt-1">TO: {to?.name}</div>
      <div className="text-[10px]">{to?.address}</div>
      <TDash />
      <TRow l="Item" r="Qty" bold />
      {t.items.map((i) => {
        const m = materials.find((x) => x.id === i.materialId)
        return <TRow key={i.materialId} l={m?.name} r={`${fmtQty(i.qty)} ${m?.unit}`} />
      })}
      <TDash />
      <TRow l="Total items" r={t.items.length} />
      <TRow l="Value (at cost)" r={inr(total)} bold />
      <TDash />
      <TRow l="Requested" r={t.createdBy} />
      {t.approvedBy && <TRow l="Approved" r={t.approvedBy} />}
      <div className="mt-5 flex justify-between text-[10px]"><span>Dispatched by</span><span>Received by</span></div>
      <div className="mt-3 flex justify-center"><MiniQR seed={t.no} size={70} /></div>
      <TCenter className="mt-1 text-[10px]">Not a tax invoice · internal movement</TCenter>
    </ThermalPaper>
  )
}
