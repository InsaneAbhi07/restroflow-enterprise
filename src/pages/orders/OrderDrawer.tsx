import type React from 'react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, ChefHat, Copy, ExternalLink, Printer, Receipt, CircleDot, RefreshCcw, CheckCircle2, FileText, XCircle, Plus } from 'lucide-react'
import { Badge, Button, ConfirmDialog, Drawer, Field, Input, KeyValue, Select, StatusBadge, VegMark } from '@/components/ui'
import { PrintPreviewModal } from '@/components/print/Print'
import { ThermalReceipt } from '@/components/print/Receipts'
import { useStore } from '@/store/useStore'
import { usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { computeTotals, lineTotal } from '@/lib/billing'
import { cn, fmtDateTime, fmtTime, inr } from '@/lib/format'
import { SettlementModal, BillSummary } from '@/pages/settlement/SettlementModal'
import { PAY_TONE, SOURCE_TONE } from '@/pages/pos/posUtils'

export function OrderDrawer({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const order = useStore((s) => s.orders.find((o) => o.id === orderId))
  const allKots = useStore((s) => s.kots)
  const kots = useMemo(() => allKots.filter((k) => k.orderId === orderId), [allKots, orderId])
  const outlet = useStore((s) => s.outlets.find((o) => o.id === order?.outletId))
  const cancelOrder = useStore((s) => s.cancelOrder)
  const { can } = usePermission()
  const nav = useNavigate()
  const [print, setPrint] = useState<null | 'bill' | 'dup'>(null)
  const [cancel, setCancel] = useState(false)
  const [reason, setReason] = useState('Customer left before order was served')
  const [remarks, setRemarks] = useState('')
  const [settle, setSettle] = useState(false)

  if (!order) return null
  const t = computeTotals(order)
  const open = !['Settled', 'Cancelled'].includes(order.status)
  const items = order.items

  const timeline: { at: number; text: string; icon: React.ReactNode; tone: string }[] = [
    { at: order.createdAt, text: `Order ${order.no} created via ${order.source}${order.waiterName ? ' by ' + order.waiterName : ''}`, icon: <Plus className="size-3" />, tone: 'bg-navy-600' },
    ...kots.map((k) => ({ at: k.createdAt, text: `${k.no} sent to kitchen · ${k.items.length} items · ${k.status}`, icon: <ChefHat className="size-3" />, tone: 'bg-sky-500' })),
    ...(order.billNo && order.status !== 'Draft' ? [{ at: order.settledAt ? order.settledAt - 60000 : order.createdAt + 60000, text: `Bill ${order.billNo} generated${order.cashier ? ' by ' + order.cashier : ''}`, icon: <FileText className="size-3" />, tone: 'bg-violet-500' }] : []),
    ...(order.settledAt ? [{ at: order.settledAt, text: `Settled ${inr(t.total)} via ${order.payments.map((p) => p.mode).join(' + ')}`, icon: <CheckCircle2 className="size-3" />, tone: 'bg-emerald-500' }] : []),
    ...(order.resettlements ?? []).map((r) => ({ at: r.at, text: `Resettled ${r.from.map((p) => p.mode).join('+')} → ${r.to.map((p) => p.mode).join('+')} · approved by ${r.approvedBy}`, icon: <RefreshCcw className="size-3" />, tone: 'bg-amber-500' })),
    ...(order.status === 'Cancelled' ? [{ at: order.settledAt ?? Date.now(), text: `Cancelled — ${order.cancelReason}`, icon: <XCircle className="size-3" />, tone: 'bg-rose-500' }] : []),
  ].sort((a, b) => a.at - b.at)

  return (
    <>
      <Drawer open={!!orderId} onClose={onClose} width={560} icon={<span className="flex size-9 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><Receipt className="size-4" /></span>}
        title={<span className="flex items-center gap-2">{order.billNo ?? order.no}<StatusBadge status={order.status} /></span>}
        subtitle={`${order.no} · ${outlet?.short} · ${fmtDateTime(order.createdAt)}`}
        footer={
          <>
            {open && can('pos', 'delete') && <Button variant="ghost" className="mr-auto text-rose-600 hover:bg-rose-50" icon={<Ban className="size-3.5" />} onClick={() => setCancel(true)}>Cancel order</Button>}
            {open && <Button icon={<ExternalLink className="size-3.5" />} onClick={() => nav(`/pos?order=${order.id}`)} disabled={!can('pos', 'create')}>Open in POS</Button>}
            {order.status === 'Settled' && <Button icon={<Copy className="size-3.5" />} onClick={() => setPrint('dup')}>Duplicate bill</Button>}
            <Button icon={<Printer className="size-3.5" />} onClick={() => setPrint('bill')} disabled={order.status === 'Cancelled'}>Print bill</Button>
            {open && t.qty > 0 && <Button variant="accent" icon={<CheckCircle2 className="size-3.5" />} onClick={() => setSettle(true)} disabled={!can('pos', 'create')}>Settle</Button>}
          </>
        }>
        <div className="mb-4 flex flex-wrap gap-1.5">
          <Badge tone={SOURCE_TONE[order.source]}>{order.source}</Badge>
          <Badge tone="gray">{order.type}</Badge>
          {order.tableLabel && <Badge tone="navy">Table {order.tableLabel}</Badge>}
          {order.resettlements?.length ? <Badge tone="amber">Resettled ×{order.resettlements.length}</Badge> : null}
        </div>
        <KeyValue cols={3} className="mb-4" items={[
          ['Customer', order.customerName ?? 'Walk-in'], ['Mobile', order.customerPhone ?? '—'], ['Pax', order.pax ?? '—'],
          ['Captain', order.waiterName ?? '—'], ['Cashier', order.cashier ?? '—'], ['Settled', order.settledAt ? fmtTime(order.settledAt) : '—'],
        ]} />
        {order.status === 'Cancelled' && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700"><b>Cancelled:</b> {order.cancelReason}</div>}

        <Section title={`Items (${t.qty})`}>
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
            {items.map((i) => (
              <div key={i.id} className={cn('flex items-center gap-2 px-3 py-1.5', i.cancelled && 'opacity-50')}>
                <VegMark veg={i.veg} />
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-[12.5px] font-medium', i.cancelled && 'line-through')}>{i.name}{i.variant && <span className="text-slate-400"> · {i.variant}</span>}</p>
                  {(i.modifiers?.length || i.note) ? <p className="truncate text-[11px] text-slate-400">{i.modifiers?.map((m) => '+' + m.name).join(', ')} {i.note && `» ${i.note}`}</p> : null}
                </div>
                {i.kotNo && <Badge tone="blue">{i.kotNo}</Badge>}
                <span className="w-16 text-right text-slate-500 tabular">{i.qty} × {inr(i.price)}</span>
                <span className="w-16 text-right font-medium tabular">{inr(lineTotal(i))}</span>
              </div>
            ))}
          </div>
          <BillSummary t={t} className="mt-2" serviceRate={order.serviceCharge} discountLabel={order.discount.type === 'pct' && order.discount.value ? order.discount.value + '%' : undefined} />
        </Section>

        <Section title={`KOTs (${kots.length})`}>
          {kots.length === 0 ? <p className="text-[12px] text-slate-400">No KOTs recorded for this order.</p> : (
            <div className="space-y-1.5">
              {kots.map((k) => (
                <div key={k.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-1.5">
                  <ChefHat className="size-3.5 text-slate-400" />
                  <b className="font-mono text-[12px]">{k.no}</b>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-slate-500">{k.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</span>
                  <span className="text-[11px] text-slate-400">{fmtTime(k.createdAt)}</span>
                  <StatusBadge status={k.status} />
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Payments">
          {order.payments.length === 0 ? <p className="text-[12px] text-slate-400">Not paid yet.</p> : (
            <div className="space-y-1.5">
              {order.payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-1.5">
                  <span className="flex items-center gap-2"><Badge tone={PAY_TONE[p.mode]}>{p.mode}</Badge>{p.ref && <span className="font-mono text-[11px] text-slate-400">{p.ref}</span>}</span>
                  <span className="flex items-center gap-3"><span className="text-[11px] text-slate-400">{fmtTime(p.at)}</span><b className="tabular">{inr(p.amount)}</b></span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {order.resettlements?.length ? (
          <Section title="Resettlement history">
            <div className="space-y-1.5">
              {order.resettlements.map((r, i) => (
                <div key={i} className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-[12px]">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    {r.from.map((p) => `${p.mode} ${inr(p.amount)}`).join(' + ')} <span className="text-slate-400">→</span> {r.to.map((p) => `${p.mode} ${inr(p.amount)}`).join(' + ')}
                  </div>
                  <p className="text-slate-500">{r.reason} · by {r.by} · approved by {r.approvedBy} · {fmtDateTime(r.at)}</p>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        <Section title="Timeline">
          <ol className="relative ml-2 border-l border-slate-200">
            {timeline.map((e, i) => (
              <li key={i} className="mb-3 ml-4">
                <span className={cn('absolute -left-[9px] flex size-[18px] items-center justify-center rounded-full text-white ring-4 ring-white', e.tone)}>{e.icon ?? <CircleDot className="size-3" />}</span>
                <p className="text-[12.5px] text-slate-700">{e.text}</p>
                <p className="text-[11px] text-slate-400">{fmtDateTime(e.at)}</p>
              </li>
            ))}
          </ol>
        </Section>
      </Drawer>

      <PrintPreviewModal open={!!print} onClose={() => setPrint(null)} title={print === 'dup' ? 'Duplicate bill' : 'Print bill'} subtitle={order.billNo ?? order.no}>
        {(w) => <ThermalReceipt order={order} width={w} duplicate={print === 'dup'} />}
      </PrintPreviewModal>
      <ConfirmDialog open={cancel} onClose={() => setCancel(false)} tone="danger" confirmLabel="Cancel order" title={`Cancel ${order.no}?`}
        body="Open KOTs will be voided and the table released. This is recorded in the audit log."
        onConfirm={() => { cancelOrder(order.id, remarks ? `${reason} – ${remarks}` : reason); toast.warning(`Order ${order.no} cancelled`, reason) }}>
        <div className="mt-3 space-y-2">
          <Field label="Reason">
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              {['Customer left before order was served', 'Duplicate order', 'Wrong order punched', 'Item unavailable', 'Payment failed', 'Test order'].map((r) => <option key={r}>{r}</option>)}
            </Select>
          </Field>
          <Input placeholder="Remarks (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
      </ConfirmDialog>
      <SettlementModal orderId={settle ? order.id : null} open={settle} onClose={() => setSettle(false)} />
    </>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-5">
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
    {children}
  </div>
)
