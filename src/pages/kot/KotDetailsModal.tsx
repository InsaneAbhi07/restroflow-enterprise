import { CheckCircle2, ChefHat, HandPlatter, Printer, ReceiptText, XCircle } from 'lucide-react'
import type { Kot } from '@/types'
import { useStore } from '@/store/useStore'
import { Badge, Button, KeyValue, Modal, StatusBadge, Stepper, VegMark } from '@/components/ui'
import { cn, elapsed, fmtDateTime, fmtTime, inr } from '@/lib/format'
import { computeTotals } from '@/lib/billing'
import { SOURCE_TONE, itemStation, useNow } from './kotUtils'

const FLOW = ['New', 'Preparing', 'Ready', 'Served']

export function KotDetailsModal({ kotId, onClose, editable, onAdvance, onPrint, onCancelKot }: {
  kotId: string | null; onClose: () => void; editable: boolean
  onAdvance: (k: Kot) => void; onPrint: (k: Kot) => void; onCancelKot: (k: Kot) => void
}) {
  const kot = useStore((s) => s.kots.find((k) => k.id === kotId))
  const order = useStore((s) => s.orders.find((o) => o.id === kot?.orderId))
  const menu = useStore((s) => s.menu)
  const outlet = useStore((s) => s.outlets.find((o) => o.id === kot?.outletId))
  const now = useNow(1000)
  if (!kot) return null
  const active = kot.status === 'New' || kot.status === 'Preparing'
  const step = kot.status === 'Cancelled' ? -1 : FLOW.indexOf(kot.status)
  const next = kot.status === 'New' ? { label: 'Accept & Start', icon: <ChefHat className="size-3.5" />, v: 'accent' as const }
    : kot.status === 'Preparing' ? { label: 'Mark Ready', icon: <CheckCircle2 className="size-3.5" />, v: 'success' as const }
      : kot.status === 'Ready' ? { label: 'Mark Served', icon: <HandPlatter className="size-3.5" />, v: 'warning' as const } : null

  return (
    <Modal open onClose={onClose} size="md" icon={<ReceiptText />} title={`KOT ${kot.no} · ${kot.type === 'Dine-in' ? 'Table ' + kot.tableLabel : kot.type}`}
      subtitle={`${outlet?.short ?? ''} · ${kot.station}`}
      footer={
        <>
          {editable && kot.status !== 'Served' && kot.status !== 'Cancelled' && (
            <Button variant="ghost" className="mr-auto text-rose-600" icon={<XCircle className="size-3.5" />} onClick={() => onCancelKot(kot)}>Cancel KOT</Button>
          )}
          <Button icon={<Printer className="size-3.5" />} onClick={() => onPrint(kot)}>Print KOT</Button>
          {editable && next && <Button variant={next.v} icon={next.icon} onClick={() => onAdvance(kot)}>{next.label}</Button>}
        </>
      }>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          {step >= 0 ? <Stepper steps={FLOW} current={kot.status === 'Served' ? 4 : step} className="flex-1" /> : <StatusBadge status="Cancelled" />}
          {active && <span className="font-mono text-[18px] font-bold text-slate-900 tabular">{elapsed(kot.createdAt, now)}</span>}
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <KeyValue cols={3} items={[
            ['Order', kot.orderNo],
            ['Type', kot.type],
            ['Source', <Badge key="s" tone={SOURCE_TONE[kot.source]}>{kot.source}</Badge>],
            ['Waiter', kot.waiterName],
            ['Received', fmtDateTime(kot.createdAt)],
            ['Last update', fmtTime(kot.updatedAt)],
            ['Pax', order?.pax ?? '-'],
            ['Priority', kot.priority ? 'Yes' : 'Normal'],
            ['Order value', order ? inr(computeTotals(order).total) : '-'],
          ]} />
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-[12.5px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-left">Station</th><th className="px-3 py-2 text-right">Qty</th></tr>
            </thead>
            <tbody>
              {kot.items.map((it, i) => (
                <tr key={i} className={cn('border-t border-slate-100', it.cancelled && 'opacity-50')}>
                  <td className="px-3 py-2">
                    <div className={cn('flex items-center gap-1.5 font-medium text-slate-800', it.cancelled && 'line-through')}>
                      <VegMark veg={it.veg} />{it.name}{it.variant && <span className="text-slate-500">({it.variant})</span>}
                      {it.cancelled && <Badge tone="red">Cancelled</Badge>}
                    </div>
                    {it.modifiers?.length ? <div className="pl-5 text-[11px] text-slate-500">+ {it.modifiers.join(', ')}</div> : null}
                    {it.note && <div className="ml-5 mt-0.5 inline-block rounded bg-amber-100 px-1.5 text-[11px] font-medium text-amber-900">» {it.note}</div>}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{itemStation(it.name, menu)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular">{it.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {order?.note && <p className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600">Order note: {order.note}</p>}
      </div>
    </Modal>
  )
}
