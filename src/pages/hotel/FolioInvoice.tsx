import { ORG } from '@/data/outlets'
import { useStore } from '@/store/useStore'
import { fmtDate, fmtDateTime, num2 } from '@/lib/format'
import { inrWords } from '@/pages/payroll/calc'
import { useHotel } from './hotelStore'
import { chargeTax, folioTotals, nightsBetween, type ChargeKind, type Reservation } from './hotelModel'

const SAC: Record<ChargeKind, string> = { Room: '996311', 'F&B': '996331', Service: '999799', Allowance: '996311' }

/** A4 guest folio / tax invoice. Shows "Proforma" until the guest has checked out. */
export function FolioInvoice({ res }: { res: Reservation }) {
  const { config, rooms, types, plans } = useHotel()
  const outlet = useStore((s) => s.outlets.find((o) => o.id === config.outletId))
  const room = rooms.find((r) => r.id === res.roomId)
  const type = types.find((t) => t.id === res.typeId)
  const plan = plans.find((p) => p.id === res.planId)
  const ft = folioTotals(res)
  const final = res.status === 'Checked Out'
  const charges = [...res.charges].sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at)
  const slabs = Array.from(new Set(charges.map((c) => c.gst))).sort((a, b) => a - b).map((g) => {
    const taxable = charges.filter((c) => c.gst === g).reduce((s, c) => s + c.amount, 0)
    return { g, taxable, tax: (taxable * g) / 100 }
  }).filter((s) => s.taxable !== 0)
  const navy = '#0f2a4a'

  return (
    <div className="w-[760px] max-w-full bg-white p-9 text-[11.5px] leading-relaxed text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="flex items-start justify-between border-b-2 pb-4" style={{ borderColor: navy }}>
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-lg text-[17px] font-bold text-white" style={{ background: navy }}>GR</div>
          <div>
            <div className="text-[17px] font-bold" style={{ color: navy }}>{config.name}</div>
            <div className="text-[10.5px] text-slate-500">A unit of {ORG.legal}</div>
            <div className="text-[10.5px] text-slate-500">{outlet?.address ?? ORG.hq}</div>
            <div className="text-[10.5px] text-slate-500">GSTIN {outlet?.gstin ?? ORG.gstin} · {outlet?.phone} · {ORG.website}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[15px] font-semibold uppercase tracking-wide" style={{ color: navy }}>{final ? 'Tax Invoice' : 'Guest Folio (Proforma)'}</div>
          <div>{final ? <>Invoice <b>{res.invoiceNo}</b></> : <>Folio <b>{res.no}</b></>}</div>
          <div className="text-slate-500">{fmtDate(res.checkedOutAt ?? Date.now())}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Billed to</div>
          <div className="font-semibold text-slate-900">{res.guest.company ?? res.guest.name}</div>
          {res.guest.company && <div>Guest: {res.guest.name}</div>}
          <div className="text-slate-500">{res.guest.address || '—'}</div>
          <div className="text-slate-500">{res.guest.phone} · {res.guest.email}</div>
          {res.guest.gstin && <div>GSTIN: <b>{res.guest.gstin}</b></div>}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg border border-slate-200 p-3">
          {([
            ['Room', `${room?.no ?? '—'} · ${type?.code ?? ''}`], ['Reservation', res.no],
            ['Arrival', res.checkedInAt ? fmtDateTime(res.checkedInAt) : fmtDate(res.arrival)], ['Departure', res.checkedOutAt ? fmtDateTime(res.checkedOutAt) : fmtDate(res.departure)],
            ['Nights', String(nightsBetween(res.arrival, res.departure))], ['Pax', `${res.adults} adult${res.adults > 1 ? 's' : ''}${res.children ? `, ${res.children} child` : ''}`],
            ['Plan', plan ? `${plan.code} – ${plan.name}` : '—'], ['Source', res.source + (res.otaRef ? ` (${res.otaRef})` : '')],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} className="min-w-0"><div className="text-[10px] text-slate-400">{k}</div><div className="truncate font-medium">{v}</div></div>
          ))}
        </div>
      </div>

      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-white" style={{ background: navy }}>
            <th className="px-2 py-1.5">Date</th><th className="px-2 py-1.5">Description</th><th className="px-2 py-1.5">SAC</th>
            <th className="px-2 py-1.5 text-right">Amount</th><th className="px-2 py-1.5 text-right">GST</th><th className="px-2 py-1.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {charges.map((c) => (
            <tr key={c.id} className="border-b border-slate-100">
              <td className="whitespace-nowrap px-2 py-1">{fmtDate(c.date)}</td>
              <td className="px-2 py-1">{c.desc}</td>
              <td className="px-2 py-1 text-slate-500">{SAC[c.kind]}</td>
              <td className="px-2 py-1 text-right tabular">{num2(c.amount)}</td>
              <td className="px-2 py-1 text-right tabular text-slate-500">{c.gst}%</td>
              <td className="px-2 py-1 text-right font-medium tabular">{num2(c.amount + chargeTax(c))}</td>
            </tr>
          ))}
          {charges.length === 0 && <tr><td colSpan={6} className="px-2 py-4 text-center text-slate-400">No charges posted yet</td></tr>}
        </tbody>
      </table>

      <div className="mt-4 grid grid-cols-2 gap-6">
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tax summary</div>
          <table className="w-full text-[10.5px]">
            <thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-1 text-left font-medium">Slab</th><th className="text-right font-medium">Taxable</th><th className="text-right font-medium">CGST</th><th className="text-right font-medium">SGST</th></tr></thead>
            <tbody>{slabs.map((s) => <tr key={s.g} className="border-b border-slate-100"><td className="py-1">{s.g}%</td><td className="text-right tabular">{num2(s.taxable)}</td><td className="text-right tabular">{num2(s.tax / 2)}</td><td className="text-right tabular">{num2(s.tax / 2)}</td></tr>)}</tbody>
          </table>
          <div className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Payments</div>
          {res.payments.length === 0 ? <div className="text-slate-400">—</div> : res.payments.map((p) => (
            <div key={p.id} className="flex justify-between"><span>{fmtDate(p.at)} · {p.kind} · {p.mode}{p.ref ? ` (${p.ref})` : ''}</span><span className="tabular">{p.kind === 'Refund' ? '−' : ''}{num2(p.amount)}</span></div>
          ))}
        </div>
        <div className="space-y-1">
          <Row k="Room charges" v={ft.room} /><Row k="Food & beverage" v={ft.fnb} /><Row k="Other services" v={ft.service} />
          {ft.allowance !== 0 && <Row k="Allowances" v={ft.allowance} />}
          <div className="flex justify-between border-t border-slate-200 pt-1"><span>Taxable value</span><span className="tabular">{num2(ft.charges)}</span></div>
          <div className="flex justify-between"><span>CGST + SGST</span><span className="tabular">{num2(ft.tax)}</span></div>
          <div className="flex justify-between border-t-2 pt-1 text-[14px] font-bold" style={{ borderColor: navy, color: navy }}><span>Invoice total</span><span className="tabular">₹ {num2(ft.total)}</span></div>
          <div className="flex justify-between"><span>Less: paid</span><span className="tabular">{num2(ft.paid)}</span></div>
          <div className="flex justify-between font-semibold"><span>Balance</span><span className="tabular">₹ {num2(ft.balance)}</span></div>
          <div className="pt-1 text-[10.5px] italic text-slate-500">{inrWords(ft.total)}</div>
        </div>
      </div>

      <div className="mt-10 flex items-end justify-between text-[10.5px] text-slate-500">
        <div className="max-w-[60%]">Accommodation GST {config.gstLow}% up to ₹{config.gstThreshold.toLocaleString('en-IN')}/night, {config.gstHigh}% above. Check-out {config.checkOutTime}. This is a computer-generated document.</div>
        <div className="text-center"><div className="mb-1 h-8 w-40 border-b border-slate-300" />Guest signature</div>
      </div>
    </div>
  )
}

const Row = ({ k, v }: { k: string; v: number }) => <div className="flex justify-between"><span>{k} <span className="text-slate-400">(incl. GST)</span></span><span className="tabular">{num2(v)}</span></div>
