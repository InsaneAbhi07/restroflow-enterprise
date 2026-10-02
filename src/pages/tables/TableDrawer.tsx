import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRightLeft, CalendarClock, CheckCircle2, Combine, ExternalLink, Printer, Sparkles, UserRound, Users, Utensils } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { toast } from '@/store/toast'
import { waitersFor } from '@/data/operations'
import { Badge, Button, Checkbox, Drawer, EmptyState, Field, Input, KeyValue, Modal, Select, StatusBadge, VegMark } from '@/components/ui'
import { PrintPreviewModal } from '@/components/print/Print'
import { ThermalReceipt } from '@/components/print/Receipts'
import { computeTotals, lineTotal } from '@/lib/billing'
import { cn, fmtTime, inr, minutesSince } from '@/lib/format'
import { isBusy, waiterName } from './tableUtils'

export function TableDrawer({ tableId, onClose, editable }: { tableId: string | null; onClose: () => void; editable: boolean }) {
  const navigate = useNavigate()
  const table = useStore((s) => s.tables.find((t) => t.id === tableId))
  const tables = useStore((s) => s.tables)
  const order = useStore((s) => s.orders.find((o) => o.id === table?.orderId))
  const kots = useStore((s) => s.kots)
  const employees = useStore((s) => s.employees)
  const updateTable = useStore((s) => s.updateTable)
  const updateOrder = useStore((s) => s.updateOrder)
  const transferTable = useStore((s) => s.transferTable)
  const mergeTables = useStore((s) => s.mergeTables)
  const log = useStore((s) => s.log)

  const [modal, setModal] = useState<null | 'transfer' | 'merge' | 'reserve' | 'print'>(null)
  const [target, setTarget] = useState('')
  const [mergeIds, setMergeIds] = useState<string[]>([])
  const [res, setRes] = useState({ name: '', pax: '2', time: '20:30' })

  if (!table) return null
  const busy = isBusy(table.status)
  const totals = order ? computeTotals(order) : null
  const waiters = waitersFor(table.outletId)
  const wName = waiterName(table, employees)
  const freeTables = tables.filter((t) => t.outletId === table.outletId && t.id !== table.id && t.status === 'Available')
  const occupiedOthers = tables.filter((t) => t.outletId === table.outletId && t.id !== table.id && isBusy(t.status) && t.orderId)
  const orderKots = order ? kots.filter((k) => k.orderId === order.id) : []

  const openPos = () => {
    onClose()
    navigate(table.orderId ? `/pos?order=${table.orderId}` : `/pos?table=${table.id}`)
  }
  const assignWaiter = (id: string) => {
    const w = waiters.find((x) => x.id === id)
    updateTable(table.id, { waiterId: id || undefined })
    if (order && w) updateOrder(order.id, { waiterId: w.id, waiterName: w.name })
    log(`Assigned ${w?.name ?? 'no waiter'} to table ${table.label}`, 'tables', 'info', table.outletId)
    toast.success('Waiter assigned', `${w?.name ?? 'Unassigned'} → ${table.label}`)
  }
  const setAvailable = (msg: string) => {
    updateTable(table.id, { status: 'Available', reservedFor: undefined, reservedAt: undefined, waiterId: undefined, since: undefined, orderId: undefined })
    log(`Table ${table.label}: ${msg}`, 'tables', 'success', table.outletId)
    toast.success(`${table.label} is now available`, msg)
  }

  return (
    <>
      <Drawer open onClose={onClose} width={460}
        icon={<span className={cn('flex size-10 items-center justify-center rounded-xl text-[14px] font-bold text-white', busy ? 'bg-sky-600' : 'bg-navy-900')}>{table.label}</span>}
        title={`Table ${table.label}`} subtitle={`${table.floor} · ${table.capacity} seats · ${table.shape}`}
        footer={
          <>
            {busy && <Button icon={<Printer className="size-3.5" />} onClick={() => setModal('print')} disabled={!order}>Print bill</Button>}
            <Button variant="primary" icon={<ExternalLink className="size-3.5" />} onClick={openPos}>{table.orderId ? 'Open order in POS' : 'New order in POS'}</Button>
          </>
        }>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-3">
            <KeyValue cols={2} items={[
              ['Status', <StatusBadge key="s" status={table.status} />],
              ['Capacity', `${table.capacity} pax`],
              ['Waiter', wName ?? '—'],
              ['Seated for', table.since && busy ? `${minutesSince(table.since)} min (since ${fmtTime(table.since)})` : '—'],
              ['QR ordering', table.qrEnabled ? 'Enabled' : 'Disabled'],
              ['Order', order ? `${order.no}${order.billNo ? ' · ' + order.billNo : ''}` : '—'],
            ]} />
            {table.status === 'Reserved' && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-[12px] text-violet-800">
                <CalendarClock className="size-4" />Reserved for <b>{table.reservedFor ?? 'Guest'}</b> at <b>{table.reservedAt ?? '—'}</b>
              </div>
            )}
          </div>

          {editable && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Actions</p>
              <Field label="Assign waiter">
                <Select value={table.waiterId ?? ''} onChange={(e) => assignWaiter(e.target.value)}>
                  <option value="">— Unassigned —</option>
                  {waiters.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                {busy && <Button icon={<ArrowRightLeft className="size-3.5" />} onClick={() => { setTarget(freeTables[0]?.id ?? ''); setModal('transfer') }}>Transfer table</Button>}
                {busy && <Button icon={<Combine className="size-3.5" />} onClick={() => { setMergeIds([]); setModal('merge') }}>Merge tables</Button>}
                {table.status === 'Available' && <Button icon={<CalendarClock className="size-3.5" />} onClick={() => setModal('reserve')}>Reserve table</Button>}
                {table.status === 'Available' && (
                  <Button icon={<Users className="size-3.5" />} onClick={() => { updateTable(table.id, { status: 'Occupied', since: Date.now() }); toast.success(`Guests seated at ${table.label}`) }}>Seat guests</Button>
                )}
                {table.status === 'Reserved' && <Button icon={<Users className="size-3.5" />} onClick={() => { updateTable(table.id, { status: 'Occupied', since: Date.now() }); toast.success(`${table.reservedFor ?? 'Guests'} seated at ${table.label}`) }}>Guests arrived</Button>}
                {table.status === 'Reserved' && <Button icon={<CheckCircle2 className="size-3.5" />} onClick={() => setAvailable('Reservation released')}>Mark available</Button>}
                {table.status === 'Cleaning' && <Button variant="success" icon={<Sparkles className="size-3.5" />} onClick={() => setAvailable('Cleaning done')}>Mark cleaning done</Button>}
                {table.status === 'Occupied' && !table.orderId && <Button icon={<CheckCircle2 className="size-3.5" />} onClick={() => setAvailable('Released without order')}>Mark available</Button>}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Running order</p>
              {orderKots.length > 0 && <span className="text-[11px] text-slate-500">{orderKots.length} KOT{orderKots.length > 1 ? 's' : ''} · {orderKots.map((k) => k.status).join(', ')}</span>}
            </div>
            {order && totals ? (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <ul className="divide-y divide-slate-100">
                  {order.items.map((i) => (
                    <li key={i.id} className={cn('flex items-start gap-2 px-3 py-2 text-[12.5px]', i.cancelled && 'opacity-50 line-through')}>
                      <VegMark veg={i.veg} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-800">{i.name}{i.variant && <span className="text-slate-500"> ({i.variant})</span>}</div>
                        {i.modifiers?.length ? <div className="text-[11px] text-slate-500">+ {i.modifiers.map((m) => m.name).join(', ')}</div> : null}
                        {i.note && <div className="text-[11px] text-amber-700">» {i.note}</div>}
                      </div>
                      <span className="text-slate-500 tabular">×{i.qty}</span>
                      <span className="w-16 text-right font-medium tabular">{inr(lineTotal(i))}</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-1 border-t border-slate-200 bg-slate-50/70 px-3 py-2 text-[12px]">
                  <div className="flex justify-between text-slate-500"><span>Subtotal ({totals.qty} items)</span><span className="tabular">{inr(totals.subtotal, true)}</span></div>
                  <div className="flex justify-between text-slate-500"><span>GST</span><span className="tabular">{inr(totals.cgst + totals.sgst, true)}</span></div>
                  {totals.service > 0 && <div className="flex justify-between text-slate-500"><span>Service charge</span><span className="tabular">{inr(totals.service, true)}</span></div>}
                  <div className="flex justify-between text-[14px] font-semibold text-slate-900"><span>Total</span><span className="tabular">{inr(totals.total)}</span></div>
                </div>
              </div>
            ) : (
              <EmptyState className="rounded-xl border border-dashed border-slate-200 py-6" icon={<Utensils />} title="No running order" body="Open POS to start an order for this table." />
            )}
          </div>
          {!editable && <Badge tone="amber">View only — you don't have permission to modify tables</Badge>}
        </div>
      </Drawer>

      <Modal open={modal === 'transfer'} onClose={() => setModal(null)} size="sm" icon={<ArrowRightLeft />} title={`Transfer ${table.label}`} subtitle="Move the running order to a free table"
        footer={<><Button onClick={() => setModal(null)}>Cancel</Button><Button variant="primary" disabled={!target} onClick={() => {
          const to = tables.find((t) => t.id === target)
          transferTable(table.id, target); toast.success('Table transferred', `${table.label} → ${to?.label}`); setModal(null); onClose()
        }}>Transfer</Button></>}>
        {freeTables.length ? (
          <div className="grid grid-cols-4 gap-2">
            {freeTables.map((t) => (
              <button key={t.id} onClick={() => setTarget(t.id)} className={cn('rounded-lg border px-2 py-2 text-center transition', target === t.id ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200' : 'border-slate-200 hover:border-slate-300')}>
                <div className="text-[13px] font-bold text-slate-800">{t.label}</div>
                <div className="text-[10.5px] text-slate-500">{t.capacity} seats</div>
              </button>
            ))}
          </div>
        ) : <EmptyState title="No free tables" body="All tables on this outlet are busy." />}
      </Modal>

      <Modal open={modal === 'merge'} onClose={() => setModal(null)} size="sm" icon={<Combine />} title={`Merge into ${table.label}`} subtitle="Selected tables' items move to this table's order"
        footer={<><Button onClick={() => setModal(null)}>Cancel</Button><Button variant="primary" disabled={!mergeIds.length} onClick={() => {
          mergeTables(table.id, mergeIds); toast.success('Tables merged', `${mergeIds.length} table(s) merged into ${table.label}`); setModal(null)
        }}>Merge {mergeIds.length || ''}</Button></>}>
        {occupiedOthers.length ? (
          <div className="space-y-1.5">
            {occupiedOthers.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <Checkbox checked={mergeIds.includes(t.id)} onChange={(v) => setMergeIds(v ? [...mergeIds, t.id] : mergeIds.filter((x) => x !== t.id))}
                  label={<span><b>{t.label}</b> <span className="text-slate-500">· {t.floor}</span></span>} />
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        ) : <EmptyState title="Nothing to merge" body="No other occupied tables on this outlet." />}
      </Modal>

      <Modal open={modal === 'reserve'} onClose={() => setModal(null)} size="sm" icon={<CalendarClock />} title={`Reserve ${table.label}`}
        footer={<><Button onClick={() => setModal(null)}>Cancel</Button><Button variant="primary" disabled={!res.name.trim()} onClick={() => {
          const [hh, mm] = res.time.split(':').map(Number)
          const at = new Date(2000, 0, 1, hh, mm).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()
          updateTable(table.id, { status: 'Reserved', reservedFor: `${res.name.trim()} (${res.pax} pax)`, reservedAt: at })
          log(`Table ${table.label} reserved for ${res.name} at ${at}`, 'tables', 'info', table.outletId)
          toast.success('Table reserved', `${table.label} · ${res.name} · ${at}`); setModal(null)
        }}>Reserve</Button></>}>
        <div className="space-y-3">
          <Field label="Guest name" required><Input autoFocus icon={<UserRound />} value={res.name} onChange={(e) => setRes({ ...res, name: e.target.value })} placeholder="e.g. Mr. Sharma" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pax"><Input type="number" min={1} max={20} value={res.pax} onChange={(e) => setRes({ ...res, pax: e.target.value })} /></Field>
            <Field label="Time"><Input type="time" value={res.time} onChange={(e) => setRes({ ...res, time: e.target.value })} /></Field>
          </div>
        </div>
      </Modal>

      {order && (
        <PrintPreviewModal open={modal === 'print'} onClose={() => setModal(null)} title={`Bill · Table ${table.label}`} subtitle={order.no}>
          {(w) => <ThermalReceipt order={order} width={w} />}
        </PrintPreviewModal>
      )}
    </>
  )
}
