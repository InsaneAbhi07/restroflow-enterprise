import { useEffect, useMemo, useState } from 'react'
import { Eye, ExternalLink, IndianRupee, Printer, QrCode, ScanLine, ShoppingBag, Smartphone, TableProperties } from 'lucide-react'
import type { Outlet, Table } from '@/types'
import { useStore } from '@/store/useStore'
import { isToday, usePermission, useScope, useWorkingOutlet } from '@/store/hooks'
import { toast } from '@/store/toast'
import { ORG } from '@/data/outlets'
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Select, StatCard, StatusBadge, Toggle } from '@/components/ui'
import { MiniQR, PrintPreviewModal } from '@/components/print/Print'
import { PhoneFrame } from '@/components/layout/Overlays'
import { computeTotals } from '@/lib/billing'
import { cn, inr, timeAgo } from '@/lib/format'
import QrCustomerApp from './QrCustomerApp'

/** Printable table tent card */
function QrTableCard({ table, outlet, compact }: { table: Table; outlet?: Outlet; compact?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center rounded-2xl border border-slate-200 bg-white text-center', compact ? 'p-3' : 'p-5')} style={{ breakInside: 'avoid' }}>
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-[#0f2a4a] text-[11px] font-extrabold text-white">GK</span>
        <div className="text-left leading-tight">
          <div className="text-[12px] font-bold text-slate-900">{ORG.name}</div>
          <div className="text-[10px] text-slate-500">{outlet?.short}</div>
        </div>
      </div>
      <div className={cn('my-3 rounded-xl border-4 border-[#0f2a4a] bg-white p-1.5', !table.qrEnabled && 'opacity-30')}>
        <MiniQR seed={`${table.outletId}/${table.id}`} size={compact ? 110 : 140} />
      </div>
      <div className="text-[10.5px] font-semibold uppercase tracking-widest text-[#14a891]">Scan to order</div>
      <div className="text-[22px] font-extrabold text-[#0f2a4a]">Table {table.label}</div>
      <div className="mt-1 text-[9.5px] text-slate-400">No app needed · Pay at table · Powered by RestroFlow</div>
    </div>
  )
}

export default function QrAdmin() {
  const outlets = useStore((s) => s.outlets)
  const tables = useStore((s) => s.tables)
  const orders = useStore((s) => s.orders)
  const settings = useStore((s) => s.settings)
  const updateTable = useStore((s) => s.updateTable)
  const updateSettings = useStore((s) => s.updateSettings)
  const log = useStore((s) => s.log)
  const { can } = usePermission()
  const canEdit = can('qr', 'edit')
  const { outletIds } = useScope()
  const working = useWorkingOutlet()
  const [outletId, setOutletId] = useState(working)
  useEffect(() => setOutletId(working), [working])
  const outlet = outlets.find((o) => o.id === outletId)
  const outletTables = useMemo(() => tables.filter((t) => t.outletId === outletId), [tables, outletId])
  const [selected, setSelected] = useState<string>('')
  useEffect(() => {
    if (!outletTables.some((t) => t.id === selected)) setSelected(outletTables.find((t) => t.qrEnabled)?.id ?? outletTables[0]?.id ?? '')
  }, [outletTables, selected])
  const [printAll, setPrintAll] = useState(false)
  const [printOne, setPrintOne] = useState<Table | null>(null)

  const qrOrders = orders.filter((o) => o.outletId === outletId && o.source === 'QR Order')
  const today = qrOrders.filter((o) => isToday(o.createdAt) && o.status !== 'Cancelled')
  const todayValue = today.reduce((s, o) => s + computeTotals(o).total, 0)
  const enabled = outletTables.filter((t) => t.qrEnabled).length
  const liveTables = new Set(qrOrders.filter((o) => o.status === 'Running' || o.status === 'Billed').map((o) => o.tableId)).size
  const selTable = outletTables.find((t) => t.id === selected)

  const toggleTable = (t: Table, v: boolean) => {
    updateTable(t.id, { qrEnabled: v })
    log(`QR ordering ${v ? 'enabled' : 'disabled'} for table ${t.label}`, 'qr', 'info', t.outletId)
    toast.success(`QR ${v ? 'enabled' : 'disabled'} · ${t.label}`)
  }
  const setAll = (v: boolean) => {
    outletTables.forEach((t) => updateTable(t.id, { qrEnabled: v }))
    toast.success(`QR ${v ? 'enabled' : 'disabled'} for all ${outletTables.length} tables`, outlet?.short)
  }
  const openCustomer = (t: Table) => window.open(`${import.meta.env.BASE_URL}qr-order/${t.outletId}/${t.id}`, '_blank')

  return (
    <div>
      <PageHeader title="QR Ordering" subtitle="Contactless table ordering — orders flow straight into POS & kitchen"
        breadcrumbs={[{ label: 'Operations' }, { label: 'QR Ordering' }]}
        actions={
          <>
            <Select className="w-44" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
              {outletIds.map((id) => <option key={id} value={id}>{outlets.find((o) => o.id === id)?.short}</option>)}
            </Select>
            <Button icon={<Printer className="size-3.5" />} onClick={() => setPrintAll(true)} disabled={!can('qr', 'print') && !canEdit}>Download / Print QR</Button>
            {selTable && <Button variant="primary" icon={<ExternalLink className="size-3.5" />} onClick={() => openCustomer(selTable)}>Open customer view</Button>}
          </>
        } />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="QR orders today" value={today.length} icon={<ShoppingBag />} tone="teal" sub={`${qrOrders.length} all-time on this outlet`} />
        <StatCard label="Avg QR order value" value={inr(today.length ? todayValue / today.length : 0)} icon={<IndianRupee />} tone="green" sub={`${inr(todayValue)} today`} />
        <StatCard label="QR-enabled tables" value={`${enabled} / ${outletTables.length}`} icon={<TableProperties />} tone="navy" sub="tables with active codes" />
        <StatCard label="Live QR sessions" value={liveTables} icon={<ScanLine />} tone="violet" sub="tables ordering now" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-4 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={cn('flex size-9 items-center justify-center rounded-xl', settings.qr.enabled ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-400')}><QrCode className="size-4.5" /></span>
                <div>
                  <div className="text-[13px] font-semibold text-slate-900">QR ordering {settings.qr.enabled ? 'is live' : 'is paused'}</div>
                  <div className="text-[11.5px] text-slate-500">Applies to all outlets · guests see a “paused” screen when off</div>
                </div>
                <Toggle checked={settings.qr.enabled} disabled={!canEdit} onChange={(v) => {
                  updateSettings({ qr: { ...settings.qr, enabled: v } }); log(`QR ordering ${v ? 'enabled' : 'paused'} globally`, 'qr', v ? 'success' : 'warning')
                  toast[v ? 'success' : 'warning'](v ? 'QR ordering enabled' : 'QR ordering paused')
                }} />
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-4 text-[12.5px] text-slate-600">
                <label className="flex items-center gap-2">Require staff approval<Toggle size="sm" disabled={!canEdit} checked={settings.qr.requireApproval} onChange={(v) => { updateSettings({ qr: { ...settings.qr, requireApproval: v } }); toast.info(v ? 'QR orders need staff approval' : 'QR orders go straight to kitchen') }} /></label>
                <label className="flex items-center gap-2">Pay at table<Toggle size="sm" disabled={!canEdit} checked={settings.qr.allowPayAtTable} onChange={(v) => { updateSettings({ qr: { ...settings.qr, allowPayAtTable: v } }); toast.info(v ? 'Pay-at-table enabled' : 'Pay-at-table disabled') }} /></label>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Table QR codes" subtitle={`${outlet?.name ?? ''} · click a card to preview`} icon={<QrCode className="size-3.5" />}
              actions={canEdit && <><Button size="xs" onClick={() => setAll(true)}>Enable all</Button><Button size="xs" variant="ghost" onClick={() => setAll(false)}>Disable all</Button></>} />
            {outletTables.length === 0 ? <EmptyState title="No tables" /> : (
              <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 2xl:grid-cols-3">
                {outletTables.map((t) => (
                  <div key={t.id} onClick={() => setSelected(t.id)}
                    className={cn('flex cursor-pointer gap-3 rounded-xl border p-3 transition', selected === t.id ? 'border-brand-400 bg-brand-50/40 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300')}>
                    <div className={cn('shrink-0 rounded-lg border border-slate-200 bg-white p-1', !t.qrEnabled && 'opacity-30 grayscale')}><MiniQR seed={`${t.outletId}/${t.id}`} size={76} /></div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[15px] font-bold text-slate-900">{t.label}</span>
                        <Toggle size="sm" checked={t.qrEnabled} disabled={!canEdit} onChange={(v) => toggleTable(t, v)} />
                      </div>
                      <div className="text-[11.5px] text-slate-500">{t.floor} · {t.capacity} seats</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <StatusBadge status={t.status} />
                        {t.qrEnabled ? <Badge tone="teal">QR live</Badge> : <Badge tone="gray">QR off</Badge>}
                      </div>
                      <div className="mt-auto flex gap-1 pt-2">
                        <Button size="xs" variant="ghost" icon={<Eye className="size-3" />} onClick={(e) => { e.stopPropagation(); setSelected(t.id) }}>Preview</Button>
                        <Button size="xs" variant="ghost" icon={<Printer className="size-3" />} onClick={(e) => { e.stopPropagation(); setPrintOne(t) }}>Print</Button>
                        <Button size="xs" variant="ghost" icon={<ExternalLink className="size-3" />} onClick={(e) => { e.stopPropagation(); openCustomer(t) }}>Open</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent QR orders" subtitle="Placed by guests from their phones" icon={<Smartphone className="size-3.5" />} />
            {qrOrders.length === 0 ? <EmptyState title="No QR orders yet" body="Open the customer view and place an order to see it here, in POS and on the kitchen display." /> : (
              <div className="divide-y divide-slate-100">
                {qrOrders.slice(0, 8).map((o) => (
                  <div key={o.id} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-[12px] font-bold text-brand-700">{o.tableLabel}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800">{o.no} · {o.items.filter((i) => !i.cancelled).reduce((s, i) => s + i.qty, 0)} items</div>
                      <div className="truncate text-[11.5px] text-slate-500">{o.items.map((i) => i.name).join(', ')}</div>
                    </div>
                    <StatusBadge status={o.status} />
                    <span className="w-16 text-right font-semibold tabular">{inr(computeTotals(o).total)}</span>
                    <span className="w-14 text-right text-[11px] text-slate-400">{timeAgo(o.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="xl:sticky xl:top-0 xl:self-start">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-[13px] font-semibold text-slate-900">Live guest preview</div>
                <div className="text-[11.5px] text-slate-500">{selTable ? `Table ${selTable.label} · real orders` : 'Select a table'}</div>
              </div>
              {selTable && <Button size="xs" icon={<ExternalLink className="size-3" />} onClick={() => openCustomer(selTable)}>New tab</Button>}
            </div>
            <div className="flex justify-center">
              <PhoneFrame scale={0.8}>
                {selTable ? <QrCustomerApp key={selTable.id} outletId={outletId} tableId={selTable.id} embedded /> : <div className="flex h-full items-center justify-center text-slate-400">No table</div>}
              </PhoneFrame>
            </div>
          </Card>
        </div>
      </div>

      <PrintPreviewModal open={printAll} onClose={() => setPrintAll(false)} paper="a4" title="Print table QR codes" subtitle={`${outlet?.short} · ${outletTables.length} tables`}>
        <div className="a4-sheet bg-white p-6" style={{ width: '190mm' }}>
          <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
            <div><div className="text-[15px] font-bold text-slate-900">{ORG.name} — {outlet?.short}</div><div className="text-[11px] text-slate-500">Table QR codes · cut along the borders</div></div>
            <QrCode className="size-6 text-slate-400" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {outletTables.map((t) => <QrTableCard key={t.id} table={t} outlet={outlet} compact />)}
          </div>
        </div>
      </PrintPreviewModal>

      <PrintPreviewModal open={!!printOne} onClose={() => setPrintOne(null)} paper="a4" title={`QR card · Table ${printOne?.label ?? ''}`}>
        {printOne ? <div className="bg-white p-8" style={{ width: '120mm' }}><QrTableCard table={printOne} outlet={outlet} /></div> : null}
      </PrintPreviewModal>
    </div>
  )
}
