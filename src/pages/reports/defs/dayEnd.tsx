import React, { useState } from 'react'
import { Printer, FileText, Lock, ArrowDownRight, ArrowUpRight, Banknote, Receipt, ShoppingBag, Ban, Trophy, Wallet, Clock } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Badge, Button, Card, CardHeader, CHART, tooltipStyle, VegMark } from '@/components/ui'
import { PrintPreviewModal, ThermalPaper, TRow, TDash, TCenter } from '@/components/print/Print'
import { ORG } from '@/data/outlets'
import { useCurrentUser } from '@/store/hooks'
import { toast } from '@/store/toast'
import { seeded, hashStr } from '@/lib/rand'
import { cn, fmtDateTime, fmtTime, inr, num, num2 } from '@/lib/format'
import type { ReportCtx, ReportDef, ReportResult, Row } from '../types'
import { hourShares, salesBase, syntheticBills } from '../gen'
import { A4Footer, A4Header, A4Page } from '../ReportDocument'
import { col, kpi, money, n0, pctOf } from './helpers'

/* ------------------------------------------------------------------ data */
export function zData(ctx: ReportCtx) {
  const b = salesBase(ctx)
  const bills = syntheticBills(ctx)
  const t = b.total
  const r = seeded(hashStr('z' + ctx.dates.join('') + ctx.outletIds.join('')))
  const cash = b.pay.find((p) => p.name === 'Cash')?.value ?? 0
  const opening = 5000 * ctx.outlets.length * ctx.nDays
  const payoutList = [
    { name: 'Vegetables (local mandi)', amt: Math.round(cash * 0.012 * r.range(0.7, 1.3)) },
    { name: 'Milk & dairy top-up', amt: Math.round(cash * 0.008 * r.range(0.7, 1.3)) },
    { name: 'Gas cylinder delivery tip / misc.', amt: Math.round(cash * 0.002 * r.range(0.5, 1.5)) },
    { name: 'Staff tea & snacks', amt: Math.round(cash * 0.003 * r.range(0.7, 1.3)) },
  ]
  const payouts = payoutList.reduce((s, p) => s + p.amt, 0)
  const expected = opening + cash - payouts
  const diff = Math.round(r.range(-180, 60) * Math.sqrt(ctx.outlets.length * ctx.nDays))
  const counted = expected + diff
  const sorted = [...bills].sort((a, c) => a.at - c.at)
  const voids = Math.round(t.cancelledCount * 0.3)
  return {
    b, t, cash, opening, payoutList, payouts, expected, counted, diff,
    firstBill: sorted[0], lastBill: sorted[sorted.length - 1],
    voids, cancelled: t.cancelledCount - voids,
    zNo: 'Z-' + ctx.dates[ctx.dates.length - 1].replace(/-/g, '') + '-' + String(ctx.outletIds.length).padStart(2, '0'),
    top: b.items.slice(0, 10),
    hours: hourShares(ctx.outletIds).map((h) => ({ label: h.label, net: t.net * h.share })),
  }
}
type Z = ReturnType<typeof zData>

/* ------------------------------------------------------------------ thermal Z-report */
export function ThermalZ({ ctx, z, width, user }: { ctx: ReportCtx; z: Z; width: '80mm' | '58mm'; user: string }) {
  const o = ctx.outlets.length === 1 ? ctx.outlets[0] : undefined
  const n = (v: number) => num2(v)
  return (
    <ThermalPaper width={width}>
      <TCenter className="text-[13px] font-bold">{ORG.name.toUpperCase()}</TCenter>
      <TCenter>{o ? o.short + ', ' + o.city : 'CONSOLIDATED – ALL OUTLETS'}</TCenter>
      {o && <TCenter className="text-[10px]">{o.address}</TCenter>}
      <TCenter className="text-[10px]">GSTIN: {o?.gstin ?? ORG.gstin}</TCenter>
      <TDash />
      <TCenter className="text-[12px] font-bold">*** Z-REPORT (DAY END) ***</TCenter>
      <TDash />
      <TRow l="Z No" r={z.zNo} />
      <TRow l="Business Date" r={ctx.rangeLabel} />
      <TRow l="Printed" r={fmtDateTime(Date.now())} />
      <TRow l="Printed By" r={user} />
      <TDash />
      <div className="font-bold">SALES SUMMARY</div>
      <TRow l="Gross Sales" r={n(z.t.gross)} />
      <TRow l="(-) Discount" r={n(z.t.discount)} />
      <TRow l="Net Sales" r={n(z.t.net)} bold />
      <TRow l="(+) CGST @2.5%" r={n(z.t.cgst)} />
      <TRow l="(+) SGST @2.5%" r={n(z.t.sgst)} />
      <TRow l="(+) Service Charge" r={n(z.t.service)} />
      <TRow l="(+) Delivery Charge" r={n(z.t.delivery)} />
      <TRow l="Round Off" r={n(z.t.roundOff)} />
      <TDash />
      <TRow l="TOTAL COLLECTION" r={n(z.t.total)} bold className="text-[12px]" />
      <TDash />
      <div className="font-bold">PAYMENT MODES</div>
      {z.b.pay.map((p) => <TRow key={p.name} l={`${p.name} (${p.count})`} r={n(p.value)} />)}
      <TRow l="Total" r={n(z.b.pay.reduce((s, p) => s + p.value, 0))} bold />
      <TDash />
      <div className="font-bold">ORDER TYPES</div>
      {z.b.types.map((x) => <TRow key={x.name} l={`${x.name} (${x.count})`} r={n(x.amount)} />)}
      <TDash />
      <div className="font-bold">ORDER SOURCES</div>
      {z.b.sources.map((x) => <TRow key={x.name} l={`${x.name} (${x.count})`} r={n(x.amount)} />)}
      <TDash />
      <TRow l="Bills Settled" r={num(z.t.orders)} />
      <TRow l="Covers (Pax)" r={num(z.t.pax)} />
      <TRow l="Avg Bill Value" r={n(z.t.total / (z.t.orders || 1))} />
      <TRow l="First Bill" r={z.firstBill ? `${z.firstBill.billNo} ${fmtTime(z.firstBill.at)}` : '-'} />
      <TRow l="Last Bill" r={z.lastBill ? `${z.lastBill.billNo} ${fmtTime(z.lastBill.at)}` : '-'} />
      <TDash />
      <div className="font-bold">CANCELLATIONS</div>
      <TRow l={`Cancelled Bills (${z.cancelled})`} r={n(z.t.cancelledAmt * 0.7)} />
      <TRow l={`Voided KOT Items (${z.voids})`} r={n(z.t.cancelledAmt * 0.3)} />
      <TRow l={`Complimentary / NC (${z.t.ncCount})`} r={n(z.t.ncAmt)} />
      <TDash />
      <div className="font-bold">CASH DRAWER</div>
      <TRow l="Opening Cash" r={n(z.opening)} />
      <TRow l="(+) Cash Sales" r={n(z.cash)} />
      <TRow l="(-) Payouts / Expenses" r={n(z.payouts)} />
      <TRow l="Expected in Drawer" r={n(z.expected)} bold />
      <TRow l="Counted Cash" r={n(z.counted)} />
      <TRow l={z.diff < 0 ? 'SHORT' : z.diff > 0 ? 'EXCESS' : 'DIFFERENCE'} r={n(z.diff)} bold />
      <TDash />
      <div className="font-bold">TOP 5 ITEMS</div>
      {z.top.slice(0, 5).map((it) => <TRow key={it.id} l={`${it.name} x${it.qty}`} r={n(it.net)} />)}
      <TDash />
      <div className="mt-5 flex justify-between text-[10px]"><span>Cashier Sign</span><span>Manager Sign</span></div>
      <TDash />
      <TCenter className="text-[10px]">*** End of Z-Report ***</TCenter>
      <TCenter className="text-[9px]">Powered by RestroFlow POS</TCenter>
    </ThermalPaper>
  )
}

/* ------------------------------------------------------------------ A4 Z-report */
export function A4Z({ ctx, z, user }: { ctx: ReportCtx; z: Z; user: string }) {
  const Line = ({ l, r, bold, neg }: { l: string; r: number; bold?: boolean; neg?: boolean }) => (
    <div className={cn('flex justify-between border-b border-slate-100 py-[3px]', bold && 'font-bold text-slate-900')}><span>{l}</span><span className="tabular">{neg ? '(' + num2(r) + ')' : num2(r)}</span></div>
  )
  const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-3 break-inside-avoid"><p className="mb-1 border-b border-slate-800 pb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-900">{title}</p>{children}</div>
  )
  return (
    <A4Page>
      <A4Header ctx={ctx} title="Day End Summary (Z-Report)" subtitle={z.zNo} user={user} />
      <div className="grid grid-cols-2 gap-x-8">
        <div>
          <Sec title="Sales Summary">
            <Line l="Gross Sales" r={z.t.gross} /><Line l="Less: Discount" r={z.t.discount} neg /><Line l="Net Sales" r={z.t.net} bold />
            <Line l="CGST @2.5%" r={z.t.cgst} /><Line l="SGST @2.5%" r={z.t.sgst} /><Line l="Service Charge" r={z.t.service} /><Line l="Delivery Charge" r={z.t.delivery} /><Line l="Round Off" r={z.t.roundOff} />
            <Line l="Total Collection" r={z.t.total} bold />
          </Sec>
          <Sec title="Order Types">{z.b.types.map((x) => <Line key={x.name} l={`${x.name} (${x.count})`} r={x.amount} />)}</Sec>
          <Sec title="Order Sources">{z.b.sources.map((x) => <Line key={x.name} l={`${x.name} (${x.count})`} r={x.amount} />)}</Sec>
        </div>
        <div>
          <Sec title="Collection by Payment Mode">{z.b.pay.map((p) => <Line key={p.name} l={`${p.name} (${p.count})`} r={p.value} />)}<Line l="Total" r={z.b.pay.reduce((s, p) => s + p.value, 0)} bold /></Sec>
          <Sec title="Cash Drawer Reconciliation">
            <Line l="Opening Cash" r={z.opening} /><Line l="Add: Cash Sales" r={z.cash} />
            {z.payoutList.map((p) => <Line key={p.name} l={'Less: ' + p.name} r={p.amt} neg />)}
            <Line l="Expected Cash" r={z.expected} bold /><Line l="Counted Cash" r={z.counted} /><Line l={z.diff < 0 ? 'Short' : 'Excess'} r={z.diff} bold />
          </Sec>
          <Sec title="Controls">
            <Line l={`Cancelled Bills (${z.cancelled})`} r={z.t.cancelledAmt * 0.7} /><Line l={`Voided Items (${z.voids})`} r={z.t.cancelledAmt * 0.3} /><Line l={`Complimentary / NC (${z.t.ncCount})`} r={z.t.ncAmt} />
            <div className="flex justify-between py-[3px]"><span>Bill range</span><span>{z.firstBill?.billNo ?? '-'} → {z.lastBill?.billNo ?? '-'}</span></div>
            <div className="flex justify-between py-[3px]"><span>Bills / Covers / ABV</span><span>{num(z.t.orders)} / {num(z.t.pax)} / {inr(z.t.total / (z.t.orders || 1))}</span></div>
          </Sec>
        </div>
      </div>
      <Sec title="Top 10 Items">
        <table className="w-full text-[9.5px]">
          <thead><tr className="text-left text-slate-500"><th>#</th><th>Item</th><th>Category</th><th className="text-right">Qty</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{z.top.map((it, i) => <tr key={it.id} className="border-b border-slate-100"><td>{i + 1}</td><td>{it.name}</td><td>{it.category}</td><td className="text-right">{it.qty}</td><td className="text-right">{num2(it.net)}</td></tr>)}</tbody>
        </table>
      </Sec>
      <A4Footer />
    </A4Page>
  )
}

/* ------------------------------------------------------------------ on-screen layout */
function Ledger({ items }: { items: { l: string; v: number; tone?: 'neg' | 'bold' | 'total'; hint?: string }[] }) {
  return (
    <div className="divide-y divide-slate-100 px-4 py-1">
      {items.map((it) => (
        <div key={it.l} className={cn('flex items-center justify-between py-2 text-[12.5px]', it.tone === 'total' && 'text-[14px]')}>
          <span className={cn('text-slate-600', (it.tone === 'bold' || it.tone === 'total') && 'font-semibold text-slate-900')}>{it.l}{it.hint && <span className="ml-1.5 text-[11px] text-slate-400">{it.hint}</span>}</span>
          <span className={cn('tabular', it.tone === 'neg' ? 'text-rose-600' : 'text-slate-800', (it.tone === 'bold' || it.tone === 'total') && 'font-semibold', it.tone === 'total' && 'text-brand-700')}>{it.tone === 'neg' ? '− ' : ''}{inr(Math.abs(it.v), true)}</span>
        </div>
      ))}
    </div>
  )
}

function BarList({ items, total, money = true }: { items: { name: string; value: number; count?: number; color: string }[]; total: number; money?: boolean }) {
  return (
    <div className="space-y-2.5 px-4 py-3">
      {items.map((p) => (
        <div key={p.name}>
          <div className="mb-1 flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-2 text-slate-600"><span className="size-2 rounded-full" style={{ background: p.color }} />{p.name}{p.count !== undefined && <span className="text-slate-400">· {num(p.count)}</span>}</span>
            <span className="font-medium text-slate-800 tabular">{money ? inr(p.value) : num(p.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${pctOf(p.value, total)}%`, background: p.color }} /></div>
        </div>
      ))}
    </div>
  )
}

export function DayEndView({ ctx }: { ctx: ReportCtx; result: ReportResult }) {
  const z = React.useMemo(() => zData(ctx), [ctx])
  const user = useCurrentUser()
  const [thermal, setThermal] = useState(false)
  const [a4, setA4] = useState(false)
  const { t, b } = z
  const hero = [
    { l: 'Gross Sales', v: t.gross, icon: <Receipt className="size-3.5" />, c: 'text-slate-900' },
    { l: 'Discounts', v: -t.discount, icon: <ArrowDownRight className="size-3.5" />, c: 'text-rose-600' },
    { l: 'Net Sales', v: t.net, icon: <ArrowUpRight className="size-3.5" />, c: 'text-slate-900' },
    { l: 'Taxes (GST)', v: t.cgst + t.sgst, icon: <FileText className="size-3.5" />, c: 'text-slate-900' },
    { l: 'Total Collection', v: t.total, icon: <Wallet className="size-3.5" />, c: 'text-brand-700' },
  ]
  return (
    <div className="space-y-4">
      {/* action strip */}
      <Card className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-navy-900 to-navy-800 px-4 py-3 text-white">
        <div className="mr-auto min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-white/60">Z-Report · {z.zNo}</p>
          <p className="text-[14px] font-semibold">{ctx.outlets.length === 1 ? ctx.outlets[0].name : 'Consolidated – ' + ctx.outlets.length + ' outlets'} · {ctx.rangeLabel}</p>
        </div>
        <Button size="sm" variant="accent" icon={<Printer className="size-3.5" />} onClick={() => setThermal(true)}>Print thermal Z-report</Button>
        <Button size="sm" className="border-white/20 bg-white/10 text-white hover:bg-white/20" icon={<FileText className="size-3.5" />} onClick={() => setA4(true)}>A4 version</Button>
        <Button size="sm" className="border-white/20 bg-white/10 text-white hover:bg-white/20" icon={<Lock className="size-3.5" />}
          onClick={() => toast.success('Day closed', `${z.zNo} locked · Business date rolled over. Simulated.`)}>Close day</Button>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {hero.map((h) => (
          <Card key={h.l} className="p-3.5">
            <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-500">{h.icon}{h.l}</p>
            <p className={cn('mt-1 text-[20px] font-semibold tracking-tight tabular', h.c)}>{h.v < 0 ? '− ' : ''}{inr(Math.abs(h.v))}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Sales Summary" icon={<Receipt className="size-3.5" />} subtitle={`${num(t.orders)} bills · ${num(t.pax)} covers`} />
          <Ledger items={[
            { l: 'Gross Sales', v: t.gross }, { l: 'Discounts', v: t.discount, tone: 'neg', hint: pctOf(t.discount, t.gross).toFixed(1) + '%' }, { l: 'Net Sales', v: t.net, tone: 'bold' },
            { l: 'CGST', v: t.cgst, hint: '2.5%' }, { l: 'SGST', v: t.sgst, hint: '2.5%' }, { l: 'Service Charge', v: t.service, hint: ctx.serviceChargePct + '% dine-in' },
            { l: 'Delivery Charges', v: t.delivery }, { l: 'Round Off', v: t.roundOff }, { l: 'Total Collection', v: t.total, tone: 'total' },
          ]} />
        </Card>
        <Card>
          <CardHeader title="Collection by Payment Mode" icon={<Wallet className="size-3.5" />} subtitle="Reconciled with total collection" />
          <BarList items={b.pay} total={t.total} />
          <div className="mx-4 mb-3 flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] font-semibold"><span>Total</span><span className="tabular">{inr(b.pay.reduce((s, p) => s + p.value, 0))}</span></div>
        </Card>
        <Card>
          <CardHeader title="Cash Drawer Reconciliation" icon={<Banknote className="size-3.5" />}
            actions={<Badge tone={Math.abs(z.diff) < 50 ? 'green' : z.diff < 0 ? 'red' : 'amber'} dot>{Math.abs(z.diff) < 50 ? 'Tallied' : z.diff < 0 ? 'Short' : 'Excess'}</Badge>} />
          <Ledger items={[
            { l: 'Opening Cash', v: z.opening }, { l: 'Cash Sales', v: z.cash },
            ...z.payoutList.map((p) => ({ l: p.name, v: p.amt, tone: 'neg' as const })),
            { l: 'Expected in Drawer', v: z.expected, tone: 'bold' }, { l: 'Counted Cash', v: z.counted },
          ]} />
          <div className={cn('mx-4 mb-3 flex justify-between rounded-lg px-3 py-2 text-[12.5px] font-semibold', z.diff < 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700')}>
            <span>Difference</span><span className="tabular">{z.diff < 0 ? '− ' : '+ '}{inr(Math.abs(z.diff))}</span>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Orders by Type" icon={<ShoppingBag className="size-3.5" />} />
          <BarList items={b.types.map((x) => ({ ...x, value: x.amount }))} total={t.net} />
        </Card>
        <Card>
          <CardHeader title="Orders by Source" icon={<ShoppingBag className="size-3.5" />} />
          <BarList items={b.sources.map((x) => ({ ...x, value: x.amount }))} total={t.net} />
        </Card>
        <Card>
          <CardHeader title="Controls & Bill Range" icon={<Ban className="size-3.5" />} />
          <div className="grid grid-cols-2 gap-2 p-4">
            {[
              ['Cancelled Bills', z.cancelled, t.cancelledAmt * 0.7, 'text-rose-600'], ['Voided KOT Items', z.voids, t.cancelledAmt * 0.3, 'text-rose-600'],
              ['Complimentary / NC', t.ncCount, t.ncAmt, 'text-pink-600'], ['Avg Bill Value', t.orders, t.total / (t.orders || 1), 'text-slate-900'],
            ].map(([l, c, v, cls]) => (
              <div key={String(l)} className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                <p className="text-[11px] text-slate-500">{l}</p>
                <p className={cn('text-[15px] font-semibold tabular', String(cls))}>{inr(Number(v))}</p>
                <p className="text-[10.5px] text-slate-400">{l === 'Avg Bill Value' ? 'across ' + num(Number(c)) + ' bills' : num(Number(c)) + ' entries'}</p>
              </div>
            ))}
          </div>
          <div className="mx-4 mb-4 space-y-1.5 rounded-lg border border-dashed border-slate-200 p-3 text-[12px]">
            <div className="flex justify-between"><span className="text-slate-500">First bill</span><span className="font-medium">{z.firstBill ? `${z.firstBill.billNo} · ${fmtDateTime(z.firstBill.at)}` : '-'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Last bill</span><span className="font-medium">{z.lastBill ? `${z.lastBill.billNo} · ${fmtDateTime(z.lastBill.at)}` : '-'}</span></div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Top Selling Items" icon={<Trophy className="size-3.5" />} />
          <table className="w-full text-[12.5px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] uppercase tracking-wide text-slate-500"><th className="px-4 py-2">#</th><th className="px-2 py-2">Item</th><th className="px-2 py-2">Category</th><th className="px-2 py-2 text-right">Qty</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
            <tbody>
              {z.top.map((it, i) => (
                <tr key={it.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-2 py-2"><span className="inline-flex items-center gap-1.5"><VegMark veg={it.veg} />{it.name}</span></td>
                  <td className="px-2 py-2 text-slate-500">{it.category}</td>
                  <td className="px-2 py-2 text-right tabular">{num(it.qty)}</td>
                  <td className="px-4 py-2 text-right font-medium tabular">{inr(it.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Hourly Net Sales" icon={<Clock className="size-3.5" />} />
          <div className="h-[300px] p-3">
            <ResponsiveContainer>
              <BarChart data={z.hours}>
                <XAxis dataKey="label" tick={CHART.axis} tickLine={false} axisLine={false} interval={1} />
                <Tooltip {...tooltipStyle} formatter={(v) => inr(Number(v))} cursor={{ fill: 'rgba(148,163,184,.08)' }} />
                <Bar dataKey="net" name="Net Sales" fill={CHART.teal} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <PrintPreviewModal open={thermal} onClose={() => setThermal(false)} paper="thermal" title="Z-Report · Thermal" subtitle={`${z.zNo} · ${ctx.rangeLabel}`}>
        {(w) => <ThermalZ ctx={ctx} z={z} width={w} user={user.name} />}
      </PrintPreviewModal>
      <PrintPreviewModal open={a4} onClose={() => setA4(false)} paper="a4" title="Z-Report · A4" subtitle={`${z.zNo} · ${ctx.rangeLabel}`}>
        <A4Z ctx={ctx} z={z} user={user.name} />
      </PrintPreviewModal>
    </div>
  )
}

function DayEndPrint({ ctx }: { ctx: ReportCtx; result: ReportResult }) {
  const z = React.useMemo(() => zData(ctx), [ctx])
  const user = useCurrentUser()
  return <A4Z ctx={ctx} z={z} user={user.name} />
}

export const DAY_END: ReportDef = {
  id: 'day-end', group: 'Sales', title: 'Day End Summary (Z-Report)', icon: 'FileClock', defaultRange: 'today', tags: ['popular', 'z-report'],
  description: 'Complete day close: sales, taxes, collections by mode, order mix, cancellations, cash drawer reconciliation & bill range.',
  Custom: DayEndView,
  PrintDoc: DayEndPrint,
  build: (ctx) => {
    const z = zData(ctx)
    const { t, b } = z
    const L = (id: string, section: string, line: string, amount: number, count?: number): Row => ({ id, section, line, count, amount })
    const rows: Row[] = [
      L('g', 'Sales', 'Gross Sales', t.gross, t.orders), L('d', 'Sales', 'Discount', -t.discount), L('n', 'Sales', 'Net Sales', t.net),
      L('c', 'Tax', 'CGST @2.5%', t.cgst), L('s', 'Tax', 'SGST @2.5%', t.sgst), L('sc', 'Charges', 'Service Charge', t.service), L('dc', 'Charges', 'Delivery Charge', t.delivery),
      L('ro', 'Charges', 'Round Off', t.roundOff), L('tc', 'Collection', 'Total Collection', t.total, t.orders),
      ...b.pay.map((p) => L('p' + p.name, 'Payment Mode', p.name, p.value, p.count)),
      ...b.types.map((x) => L('t' + x.name, 'Order Type', x.name, x.amount, x.count)),
      ...b.sources.map((x) => L('o' + x.name, 'Order Source', x.name, x.amount, x.count)),
      L('cx', 'Controls', 'Cancelled Bills', t.cancelledAmt * 0.7, z.cancelled), L('vd', 'Controls', 'Voided Items', t.cancelledAmt * 0.3, z.voids), L('nc', 'Controls', 'Complimentary / NC', t.ncAmt, t.ncCount),
      L('oc', 'Cash Drawer', 'Opening Cash', z.opening), L('cs', 'Cash Drawer', 'Cash Sales', z.cash), L('po', 'Cash Drawer', 'Payouts', -z.payouts),
      L('ex', 'Cash Drawer', 'Expected Cash', z.expected), L('ct', 'Cash Drawer', 'Counted Cash', z.counted), L('df', 'Cash Drawer', 'Difference', z.diff),
    ]
    return {
      kpis: [kpi('Net Sales', money(t.net), undefined, 'teal'), kpi('Total Collection', money(t.total)), kpi('Bills', n0(t.orders)), kpi('Cash Difference', money(z.diff), undefined, z.diff < 0 ? 'red' : 'green')],
      columns: [col('section', 'Section'), col('line', 'Particulars'), col('count', 'Count', 'num'), col('amount', 'Amount', 'inr2')],
      rows,
    }
  },
}
