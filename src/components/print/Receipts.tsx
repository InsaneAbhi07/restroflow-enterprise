import type { Kot, Order } from '@/types'
import { computeTotals, lineTotal } from '@/lib/billing'
import { fmtDate, fmtTime, num2 } from '@/lib/format'
import { ORG } from '@/data/outlets'
import { useStore } from '@/store/useStore'
import { ThermalPaper, TRow, TDash, TCenter, MiniQR } from './Print'

/** Customer bill — 80mm / 58mm thermal layout */
export function ThermalReceipt({ order, width = '80mm', duplicate }: { order: Order; width?: '80mm' | '58mm'; duplicate?: boolean }) {
  const outlet = useStore((s) => s.outlets.find((o) => o.id === order.outletId))
  const settings = useStore((s) => s.settings)
  const t = computeTotals(order)
  const items = order.items.filter((i) => !i.cancelled)
  const gstRate = items[0]?.gst ?? 5
  const paid = order.payments.reduce((s, p) => s + p.amount, 0)
  return (
    <ThermalPaper width={width}>
      <TCenter>
        {settings.printer.showLogo && (
          <div className="mx-auto mb-1 flex size-9 items-center justify-center rounded-md bg-black text-[15px] font-bold text-white">GK</div>
        )}
        <div className="text-[14px] font-bold uppercase tracking-wide">{ORG.name}</div>
        <div className="font-semibold">{outlet?.short}</div>
        <div className="text-[10px] leading-snug">{outlet?.address}</div>
        <div className="text-[10px]">Ph: {outlet?.phone}</div>
        <div className="text-[10px]">GSTIN: {outlet?.gstin}</div>
        <div className="text-[10px]">FSSAI: {outlet?.fssai}</div>
      </TCenter>
      <TDash />
      <TCenter className="font-bold">{duplicate ? 'DUPLICATE BILL' : order.status === 'Settled' ? 'TAX INVOICE' : 'BILL (UNPAID)'}</TCenter>
      <TDash />
      <TRow l={`Bill No: ${order.billNo ?? 'DRAFT'}`} r={fmtDate(order.settledAt ?? Date.now())} />
      <TRow l={`Order: ${order.no}`} r={fmtTime(order.settledAt ?? Date.now())} />
      <TRow l={`${order.type}${order.tableLabel ? ' • Table ' + order.tableLabel : ''}${order.roomNo ? ' • Room ' + order.roomNo : ''}`} r={order.pax ? `Pax: ${order.pax}` : ''} />
      {order.waiterName && <TRow l={`Captain: ${order.waiterName}`} r={order.source !== 'POS' ? order.source : ''} />}
      <TRow l={`Cashier: ${order.cashier ?? '-'}`} />
      {order.customerName && <TRow l={`Cust: ${order.customerName}`} r={order.customerPhone ?? ''} />}
      <TDash />
      <div className="flex font-bold"><span className="flex-1">Item</span><span className="w-8 text-right">Qty</span><span className="w-14 text-right">Rate</span><span className="w-16 text-right">Amt</span></div>
      <TDash />
      {items.map((i) => (
        <div key={i.id} className="mb-0.5">
          <div className="flex">
            <span className="min-w-0 flex-1 pr-1">{i.name}{i.variant ? ` (${i.variant})` : ''}</span>
            <span className="w-8 text-right">{i.qty}</span>
            <span className="w-14 text-right">{num2(i.price)}</span>
            <span className="w-16 text-right">{num2(lineTotal(i))}</span>
          </div>
          {i.modifiers?.map((m) => <div key={m.name} className="pl-2 text-[10px]">+ {m.name}{m.price ? ` @${m.price}` : ''}</div>)}
        </div>
      ))}
      <TDash />
      <TRow l={`Sub Total (${t.qty} items)`} r={num2(t.subtotal)} />
      {t.discount > 0 && <TRow l={`Discount${order.discount.type === 'pct' ? ` (${order.discount.value}%)` : ''}`} r={'-' + num2(t.discount)} />}
      {t.service > 0 && <TRow l={`Service Charge (${order.serviceCharge}%)`} r={num2(t.service)} />}
      <TRow l={`CGST @${gstRate / 2}%`} r={num2(t.cgst)} />
      <TRow l={`SGST @${gstRate / 2}%`} r={num2(t.sgst)} />
      {t.delivery > 0 && <TRow l={order.type === 'Room Service' ? 'Tray Charge' : 'Delivery Charge'} r={num2(t.delivery)} />}
      {Math.abs(t.roundOff) > 0.001 && <TRow l="Round Off" r={(t.roundOff > 0 ? '+' : '') + num2(t.roundOff)} />}
      <TDash />
      <TRow l="GRAND TOTAL" r={'₹ ' + num2(t.total)} bold className="text-[13px]" />
      <TDash />
      {order.payments.length > 0 ? (
        <>
          {order.payments.map((p, i) => <TRow key={i} l={p.mode === 'Room' ? `Charged to ${p.ref?.split(' · ')[0] ?? 'Room'}` : `Paid by ${p.mode}`} r={num2(p.amount)} />)}
          {order.payments.some((p) => p.mode === 'Room') && <TRow l="Guest signature: ____________" r="" />}
          {paid > t.total && <TRow l="Change Returned" r={num2(paid - t.total)} />}
          <TDash />
        </>
      ) : null}
      <TCenter className="text-[10px]">{settings.billFooter}</TCenter>
      <div className="mt-2 flex justify-center"><MiniQR seed={order.billNo ?? order.no} size={58} /></div>
      <TCenter className="mt-1 text-[9px]">Scan to pay / give feedback • Powered by RestroFlow</TCenter>
    </ThermalPaper>
  )
}

/** Kitchen Order Ticket — big readable font */
export function KotTicket({ kot, width = '80mm' }: { kot: Kot; width?: '80mm' | '58mm' }) {
  const outlet = useStore((s) => s.outlets.find((o) => o.id === kot.outletId))
  return (
    <ThermalPaper width={width}>
      <TCenter className="text-[13px] font-bold">KOT • {kot.station}</TCenter>
      <TCenter className="text-[10px]">{outlet?.short}</TCenter>
      <TDash />
      <TRow l={<span className="text-[15px] font-bold">{kot.no}</span>} r={<span className="text-[15px] font-bold">{kot.type === 'Dine-in' ? 'T: ' + kot.tableLabel : kot.type === 'Room Service' ? 'ROOM ' + kot.tableLabel.replace(/^R/, '') : kot.type}</span>} />
      <TRow l={`Order: ${kot.orderNo}`} r={fmtTime(kot.createdAt)} />
      <TRow l={`By: ${kot.waiterName}`} r={kot.source} />
      {kot.priority && <TCenter className="my-1 border border-black font-bold">*** PRIORITY ***</TCenter>}
      <TDash />
      <div className="flex font-bold"><span className="w-8">Qty</span><span className="flex-1">Item</span></div>
      <TDash />
      {kot.items.map((i, idx) => (
        <div key={idx} className={i.cancelled ? 'line-through opacity-60' : ''}>
          <div className="flex text-[13px] font-bold"><span className="w-8">{i.qty}</span><span className="flex-1">{i.name}{i.variant ? ` (${i.variant})` : ''}</span></div>
          {i.modifiers?.length ? <div className="pl-8 text-[11px]">+ {i.modifiers.join(', ')}</div> : null}
          {i.note && <div className="pl-8 text-[11px] italic">» {i.note}</div>}
        </div>
      ))}
      <TDash />
      <TRow l={`Items: ${kot.items.filter((i) => !i.cancelled).reduce((s, i) => s + i.qty, 0)}`} r={fmtDate(kot.createdAt)} />
    </ThermalPaper>
  )
}
