import type { PurchaseOrder } from '@/types'
import { useStore } from '@/store/useStore'
import { ORG } from '@/data/outlets'
import { fmtDate, num2 } from '@/lib/format'
import { GST_RATE, poSubtotal } from './shared'

const words = (n: number): string => {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const two = (x: number) => (x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : ''))
  const three = (x: number) => (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + two(x % 100) : '') : two(x))
  if (n === 0) return 'Zero'
  const cr = Math.floor(n / 1e7), lk = Math.floor((n % 1e7) / 1e5), th = Math.floor((n % 1e5) / 1e3), rest = n % 1e3
  return [cr && three(cr) + ' Crore', lk && two(lk) + ' Lakh', th && two(th) + ' Thousand', rest && three(rest)].filter(Boolean).join(' ')
}

/** Professional A4 purchase order / goods receipt note */
export function PODocument({ po, kind }: { po: PurchaseOrder; kind: 'PO' | 'GRN' }) {
  const supplier = useStore((s) => s.suppliers.find((x) => x.id === po.supplierId))
  const outlet = useStore((s) => s.outlets.find((x) => x.id === po.outletId))
  const materials = useStore((s) => s.materials)
  const grn = kind === 'GRN'
  const lines = po.items.map((it) => ({ ...it, m: materials.find((m) => m.id === it.materialId), q: grn ? it.received ?? 0 : it.qty }))
  const sub = grn ? lines.reduce((s, l) => s + l.q * l.rate, 0) : poSubtotal(po)
  const gst = sub * GST_RATE
  const total = Math.round(sub + gst)
  const th = 'border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold'
  const td = 'border border-slate-300 px-2 py-1.5'
  return (
    <div className="w-[680px] bg-white p-8 text-[11px] leading-relaxed text-slate-900" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
        <div>
          <p className="text-[18px] font-bold tracking-tight">{ORG.name}</p>
          <p className="text-[10.5px] text-slate-600">{ORG.legal}</p>
          <p className="text-[10.5px] text-slate-600">{ORG.hq}</p>
          <p className="text-[10.5px] text-slate-600">GSTIN {ORG.gstin} · CIN {ORG.cin}</p>
        </div>
        <div className="text-right">
          <p className="text-[16px] font-bold uppercase tracking-wide">{grn ? 'Goods Receipt Note' : 'Purchase Order'}</p>
          <p className="mt-1 font-mono text-[11px]">{grn ? po.grnNo ?? 'GRN/—' : po.no}</p>
          <p className="text-[10.5px] text-slate-600">Date: {fmtDate(grn ? po.expected : po.date)}</p>
          {grn && <p className="text-[10.5px] text-slate-600">Against PO: {po.no}</p>}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-4">
        <div className="rounded border border-slate-300 p-2.5">
          <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">{grn ? 'Received from' : 'Vendor'}</p>
          <p className="font-semibold">{supplier?.name}</p>
          <p>{supplier?.city}</p>
          <p>Attn: {supplier?.contact} · {supplier?.phone}</p>
          <p>GSTIN: {supplier?.gstin}</p>
        </div>
        <div className="rounded border border-slate-300 p-2.5">
          <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">{grn ? 'Received at' : 'Ship to'}</p>
          <p className="font-semibold">{outlet?.name}</p>
          <p>{outlet?.address}</p>
          <p>GSTIN: {outlet?.gstin}</p>
          <p>{grn ? 'Status' : 'Expected by'}: <b>{grn ? po.status : fmtDate(po.expected)}</b> · Terms: {supplier?.terms}</p>
        </div>
      </div>

      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr><th className={th}>#</th><th className={th}>Item description</th><th className={th}>HSN</th><th className={th + ' text-right'}>{grn ? 'Ordered' : 'Qty'}</th>{grn && <th className={th + ' text-right'}>Received</th>}<th className={th}>Unit</th><th className={th + ' text-right'}>Rate</th><th className={th + ' text-right'}>Amount</th></tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td className={td}>{i + 1}</td>
              <td className={td}><b>{l.m?.name}</b><span className="ml-1 text-slate-500">({l.m?.code})</span></td>
              <td className={td}>{['0402', '0406', '0207', '0713', '1006', '1101', '0910', '1507'][i % 8]}</td>
              <td className={td + ' text-right'}>{l.qty}</td>
              {grn && <td className={td + ' text-right'}>{l.q}</td>}
              <td className={td}>{l.m?.unit}</td>
              <td className={td + ' text-right'}>{num2(l.rate)}</td>
              <td className={td + ' text-right'}>{num2(l.q * l.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex justify-between gap-6">
        <div className="flex-1 text-[10.5px]">
          <p><b>Amount in words:</b> Rupees {words(total)} Only</p>
          {po.note && <p className="mt-1"><b>Notes:</b> {po.note}</p>}
          <p className="mt-2 font-semibold">Terms & conditions</p>
          <ol className="list-decimal pl-4 text-slate-600">
            <li>Goods must conform to FSSAI standards and agreed specifications.</li>
            <li>Perishables to be delivered in temperature-controlled vehicles.</li>
            <li>Invoice must quote this {grn ? 'GRN' : 'PO'} number. Payment as per agreed terms.</li>
          </ol>
        </div>
        <table className="w-56 border-collapse self-start">
          <tbody>
            <tr><td className={td}>Taxable value</td><td className={td + ' text-right'}>{num2(sub)}</td></tr>
            <tr><td className={td}>CGST @ 2.5%</td><td className={td + ' text-right'}>{num2(gst / 2)}</td></tr>
            <tr><td className={td}>SGST @ 2.5%</td><td className={td + ' text-right'}>{num2(gst / 2)}</td></tr>
            <tr><td className={td}>Round off</td><td className={td + ' text-right'}>{num2(total - sub - gst)}</td></tr>
            <tr className="bg-slate-100 font-bold"><td className={td}>Grand total (₹)</td><td className={td + ' text-right'}>{num2(total)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="mt-12 grid grid-cols-3 gap-6 text-center text-[10.5px]">
        {(grn ? ['Received by (Stores)', 'Quality checked', 'Authorised signatory'] : ['Prepared by: ' + po.createdBy, 'Checked by', 'Authorised signatory']).map((s) => (
          <div key={s}><div className="mb-1 h-8 border-b border-slate-400" />{s}</div>
        ))}
      </div>
      <p className="mt-6 text-center text-[9.5px] text-slate-400">This is a computer generated document · {ORG.website} · {ORG.email}</p>
    </div>
  )
}
