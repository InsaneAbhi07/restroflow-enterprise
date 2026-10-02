import { ORG } from '@/data/outlets'
import { useStore } from '@/store/useStore'
import { fmtDate, monthLabel, num2 } from '@/lib/format'
import type { PayrollRun } from '@/types'
import { inrWords, type PayRow } from './calc'

/** Professional A4 salary slip (printable) */
export function SalarySlip({ row, month, run }: { row: PayRow; month: string; run: PayrollRun }) {
  const outlet = useStore((s) => s.outlets.find((o) => o.id === row.emp.outletId))
  const e = row.emp
  const a = row.att
  const earnings: [string, number][] = [
    ['Basic Salary', row.basic], ['House Rent Allowance', row.hra], ['Other Allowances', row.allowance], ['Incentives', row.incentive], [`Overtime (${a.otHours} hrs)`, row.overtime],
  ]
  const deductions: [string, number][] = [
    ['Provident Fund (PF)', row.pf], ['ESI', row.esi], ['Loan EMI', row.loan], ['Salary Advance', row.advance], ['Professional Tax', 0],
  ]
  const totalDed = row.deductions + row.advance
  const paid = run.status === 'Paid'
  return (
    <div className="w-[760px] max-w-full bg-white p-9 text-[12px] leading-relaxed text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-[#0f2a4a] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-lg bg-[#0f2a4a] text-[17px] font-bold text-white">GK</div>
          <div>
            <div className="text-[17px] font-bold text-[#0f2a4a]">{ORG.legal}</div>
            <div className="text-[11px] text-slate-500">{ORG.hq}</div>
            <div className="text-[11px] text-slate-500">GSTIN {ORG.gstin} · CIN {ORG.cin}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[15px] font-semibold uppercase tracking-wide text-[#0f2a4a]">Salary Slip</div>
          <div className="text-[12px] text-slate-600">Pay period: <b>{monthLabel(month)}</b></div>
          <div className="mt-1 inline-block rounded px-2 py-0.5 text-[10.5px] font-semibold uppercase" style={{ background: paid ? '#dcfce7' : '#fef3c7', color: paid ? '#166534' : '#92400e' }}>
            {paid ? 'Paid' : run.status === 'Not Started' ? 'Provisional' : run.status}
          </div>
        </div>
      </div>

      {/* Employee details */}
      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1.5 rounded-lg border border-slate-200 p-3.5">
        {([
          ['Employee name', e.name], ['Employee code', e.code],
          ['Designation', e.designation], ['Department', e.department],
          ['Outlet', outlet?.short ?? '-'], ['Date of joining', fmtDate(e.joinDate)],
          ['PAN', e.pan], ['Bank account', e.bank],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 border-b border-dashed border-slate-100 pb-1"><span className="text-slate-500">{k}</span><span className="font-medium text-slate-800">{v}</span></div>
        ))}
      </div>

      {/* Attendance */}
      <div className="mt-4">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Attendance summary</div>
        <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-slate-200 text-center">
          {([['Days in month', a.dim], ['Present', a.present + a.late], ['Half day', a.half], ['Paid leave', a.leave], ['Weekly off', a.off], ['Absent (LOP)', a.absent], ['Payable days', a.payable]] as [string, number][]).map(([k, v], i) => (
            <div key={k} className={'px-1 py-2 ' + (i ? 'border-l border-slate-200 ' : '') + (i === 6 ? 'bg-[#f0f5fb]' : '')}>
              <div className="text-[10px] text-slate-500">{k}</div>
              <div className="text-[14px] font-semibold text-slate-900">{v}</div>
            </div>
          ))}
        </div>
        {a.projected > 0 && <p className="mt-1 text-[10px] text-slate-400">* {a.projected} day(s) without attendance records are treated as payable (projected).</p>}
      </div>

      {/* Earnings & deductions */}
      <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200">
        {[{ title: 'Earnings', rows: earnings, total: row.gross, label: 'Gross earnings' }, { title: 'Deductions', rows: deductions, total: totalDed, label: 'Total deductions' }].map((c, ci) => (
          <div key={c.title} className={ci ? 'border-l border-slate-200' : ''}>
            <div className="flex justify-between bg-[#0f2a4a] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white"><span>{c.title}</span><span>Amount (₹)</span></div>
            {c.rows.map(([k, v]) => <div key={k} className="flex justify-between border-b border-slate-100 px-3 py-1.5"><span>{k}</span><span className="tabular-nums">{num2(v)}</span></div>)}
            <div className="flex justify-between bg-slate-50 px-3 py-2 font-semibold"><span>{c.label}</span><span className="tabular-nums">{num2(c.total)}</span></div>
          </div>
        ))}
      </div>

      {/* Net */}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-[#f0f5fb] px-4 py-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Net salary payable</div>
          <div className="text-[11.5px] italic text-slate-600">{inrWords(row.net)}</div>
        </div>
        <div className="text-[22px] font-bold text-[#0f2a4a]">₹ {num2(row.net)}</div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-[11px]">
        <div><span className="text-slate-500">Payment mode</span><div className="font-medium">Bank transfer (NEFT)</div></div>
        <div><span className="text-slate-500">Credited to</span><div className="font-medium">{e.bank}</div></div>
        <div><span className="text-slate-500">Payment status</span><div className="font-medium">{paid ? `Paid on ${fmtDate(run.paidOn ?? Date.now())}` : 'Pending disbursal'}</div></div>
      </div>

      {/* Signatures */}
      <div className="mt-12 flex items-end justify-between text-[11px] text-slate-500">
        <div className="w-48 border-t border-slate-300 pt-1 text-center">Employee signature</div>
        <div className="w-48 border-t border-slate-300 pt-1 text-center">{run.approvedBy ? `Approved · ${run.approvedBy}` : 'HR Manager'}</div>
        <div className="w-48 border-t border-slate-300 pt-1 text-center">Authorised signatory</div>
      </div>
      <p className="mt-6 border-t border-slate-100 pt-2 text-center text-[10px] text-slate-400">This is a computer-generated salary slip and does not require a physical signature · {ORG.email} · {ORG.phone}</p>
    </div>
  )
}
