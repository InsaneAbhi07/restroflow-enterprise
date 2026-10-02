import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Calculator, CheckCircle2, FileText, Loader2, Save, Settings2 } from 'lucide-react'
import { Avatar, Badge, Button, CHART, Checkbox, Drawer, Field, Input, Modal, Stepper, tooltipStyle } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { toast } from '@/store/toast'
import { inr, inrShort, monthLabel } from '@/lib/format'
import type { Employee, SalaryConfig } from '@/types'
import { computeRow, salaryHistory, type PayRow } from './calc'

/* ---------------------------------------------------------------- Salary configuration drawer */
const FIELDS: { k: keyof SalaryConfig; label: string; group: 'Earnings' | 'Deductions'; hint?: string }[] = [
  { k: 'basic', label: 'Basic salary', group: 'Earnings' },
  { k: 'hra', label: 'HRA', group: 'Earnings', hint: 'Typically 40% of basic' },
  { k: 'allowance', label: 'Other allowances', group: 'Earnings' },
  { k: 'incentive', label: 'Incentives', group: 'Earnings' },
  { k: 'otRate', label: 'OT rate (₹ / hour)', group: 'Earnings' },
  { k: 'pf', label: 'PF (employee 12%)', group: 'Deductions' },
  { k: 'esi', label: 'ESI (0.75%)', group: 'Deductions' },
  { k: 'advance', label: 'Salary advance', group: 'Deductions' },
  { k: 'loan', label: 'Loan EMI', group: 'Deductions' },
]

export function SalaryDrawer({ row, month, onClose, canEdit, onSlip }: { row: PayRow | null; month: string; onClose: () => void; canEdit: boolean; onSlip: (r: PayRow) => void }) {
  const upsertEmployee = useStore((s) => s.upsertEmployee)
  const log = useStore((s) => s.log)
  const [cfg, setCfg] = useState<SalaryConfig | null>(null)
  useEffect(() => { setCfg(row ? { ...row.emp.salary } : null) }, [row])
  const history = useMemo(() => (row ? salaryHistory(row, month) : []), [row, month])
  if (!row || !cfg) return null
  const e = row.emp
  const gross = cfg.basic + cfg.hra + cfg.allowance + cfg.incentive
  const ded = cfg.pf + cfg.esi + cfg.advance + cfg.loan
  const save = () => {
    const next: Employee = { ...e, salary: cfg }
    upsertEmployee(next)
    log(`Updated salary structure for ${e.name}`, 'payroll', 'info', e.outletId)
    toast.success('Salary configuration saved', `${e.name} · CTC ${inr(gross * 12)}/yr`)
    onClose()
  }
  return (
    <Drawer open={!!row} onClose={onClose} width={520} title={e.name} subtitle={`${e.code} · ${e.designation} · ${e.department}`} icon={<Avatar name={e.name} color={e.color} size={36} />}
      footer={<><Button icon={<FileText className="size-3.5" />} onClick={() => onSlip(row)}>Salary slip</Button>{canEdit && <Button variant="primary" icon={<Save className="size-3.5" />} onClick={save}>Save configuration</Button>}</>}>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-[11px] text-slate-500">Monthly gross</p><p className="text-[15px] font-semibold text-slate-900">{inr(gross)}</p></div>
        <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-[11px] text-slate-500">Deductions</p><p className="text-[15px] font-semibold text-rose-600">{inr(ded)}</p></div>
        <div className="rounded-lg bg-brand-50 p-2.5"><p className="text-[11px] text-brand-700">Net (full month)</p><p className="text-[15px] font-semibold text-brand-700">{inr(gross - ded)}</p></div>
      </div>
      {(['Earnings', 'Deductions'] as const).map((g) => (
        <div key={g} className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{g}</p>
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.filter((f) => f.group === g).map((f) => (
              <Field key={f.k} label={f.label} hint={f.hint}>
                <Input type="number" disabled={!canEdit} value={cfg[f.k]} icon={<span className="text-[12px]">₹</span>} onChange={(ev) => setCfg({ ...cfg, [f.k]: Math.max(0, Number(ev.target.value) || 0) })} />
              </Field>
            ))}
          </div>
        </div>
      ))}
      <div className="mt-5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Salary history · last 6 months</p>
        <div className="h-36 rounded-lg border border-slate-200 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history.map((h) => ({ m: monthLabel(h.month).slice(0, 3), net: h.net }))}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="m" tick={CHART.axis} axisLine={false} tickLine={false} />
              <YAxis tick={CHART.axis} axisLine={false} tickLine={false} tickFormatter={(v) => inrShort(v)} width={48} />
              <Tooltip {...tooltipStyle} formatter={(v) => inr(Number(v))} />
              <Bar dataKey="net" name="Net pay" fill={CHART.teal} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <table className="mt-2 w-full text-[12px]">
          <thead><tr className="text-left text-[10.5px] uppercase tracking-wide text-slate-400"><th className="py-1">Month</th><th className="text-right">Payable days</th><th className="text-right">Net pay</th><th className="text-right">Status</th></tr></thead>
          <tbody>
            {[...history].reverse().map((h) => (
              <tr key={h.month} className="border-t border-slate-100"><td className="py-1.5">{monthLabel(h.month)}</td><td className="text-right">{h.payable}</td><td className="text-right font-medium">{inr(h.net)}</td><td className="text-right"><Badge tone="green">Paid</Badge></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </Drawer>
  )
}

/* ---------------------------------------------------------------- Process payroll wizard */
export function ProcessWizard({ open, onClose, month, outletIds }: { open: boolean; onClose: () => void; month: string; outletIds: string[] }) {
  const outlets = useStore((s) => s.outlets)
  const employees = useStore((s) => s.employees)
  const attendance = useStore((s) => s.attendance)
  const settings = useStore((s) => s.settings)
  const setPayrollRun = useStore((s) => s.setPayrollRun)
  const log = useStore((s) => s.log)
  const notify = useStore((s) => s.notify)
  const [step, setStep] = useState(0)
  const [sel, setSel] = useState<string[]>(outletIds)
  const [calc, setCalc] = useState<'idle' | 'running' | 'done'>('idle')
  useEffect(() => { if (open) { setStep(0); setSel(outletIds); setCalc('idle') } }, [open]) // eslint-disable-line

  const rows = useMemo(() => employees.filter((e) => e.status !== 'Inactive' && sel.includes(e.outletId)).map((e) => computeRow(e, month, attendance, settings, 'Draft')), [employees, sel, month, attendance, settings])
  const totals = rows.reduce((t, r) => ({ gross: t.gross + r.gross, ded: t.ded + r.deductions + r.advance, net: t.net + r.net, ot: t.ot + r.overtime }), { gross: 0, ded: 0, net: 0, ot: 0 })

  useEffect(() => {
    if (step === 2 && calc === 'idle') { setCalc('running'); const t = setTimeout(() => setCalc('done'), 1100); return () => clearTimeout(t) }
  }, [step, calc])

  const finish = (status: 'Draft' | 'Processed') => {
    setPayrollRun(month, { status, processedAt: Date.now() })
    log(`Payroll ${status === 'Draft' ? 'saved as draft' : 'processed'} for ${monthLabel(month)} · ${rows.length} employees · ${inr(totals.net)}`, 'payroll', 'success')
    if (status === 'Processed') notify({ title: 'Payroll awaiting approval', body: `${monthLabel(month)} · ${inr(totals.net)} net payout`, type: 'approval', link: '/payroll' })
    toast.success(status === 'Draft' ? 'Payroll saved as draft' : 'Payroll processed', `${monthLabel(month)} · awaiting ${status === 'Draft' ? 'processing' : 'accountant approval'}`)
    onClose()
  }

  const steps = ['Month & outlets', 'Review attendance', 'Calculate', 'Confirm']
  return (
    <Modal open={open} onClose={onClose} size="xl" icon={<Calculator />} title="Process payroll" subtitle={monthLabel(month)}
      footer={<>
        {step > 0 && <Button className="mr-auto" onClick={() => setStep(step - 1)}>Back</Button>}
        <Button onClick={onClose}>Cancel</Button>
        {step < 3 && <Button variant="primary" disabled={!sel.length || (step === 2 && calc !== 'done')} onClick={() => setStep(step + 1)}>Continue</Button>}
        {step === 3 && <><Button onClick={() => finish('Draft')}>Save as draft</Button><Button variant="accent" icon={<CheckCircle2 className="size-3.5" />} onClick={() => finish('Processed')}>Process payroll</Button></>}
      </>}>
      <Stepper steps={steps} current={step} className="mb-5" />
      {step === 0 && (
        <div>
          <p className="mb-2 text-[12.5px] text-slate-600">Payroll month: <b>{monthLabel(month)}</b>. Select the outlets to include:</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {outlets.filter((o) => outletIds.includes(o.id)).map((o) => {
              const n = employees.filter((e) => e.outletId === o.id && e.status !== 'Inactive').length
              const on = sel.includes(o.id)
              return (
                <div key={o.id} onClick={() => setSel(on ? sel.filter((x) => x !== o.id) : [...sel, o.id])} className={'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ' + (on ? 'border-brand-300 bg-brand-50/50' : 'border-slate-200 hover:bg-slate-50')}>
                  <Checkbox checked={on} onChange={() => setSel(on ? sel.filter((x) => x !== o.id) : [...sel, o.id])} />
                  <span className="size-2.5 rounded-full" style={{ background: o.color }} />
                  <span className="flex-1"><span className="block text-[13px] font-medium text-slate-800">{o.short}</span><span className="text-[11.5px] text-slate-500">{o.city} · {n} employees</span></span>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[11.5px] text-slate-500">PF {settings.payroll.pfEnabled ? 'enabled' : 'disabled'} · ESI {settings.payroll.esiEnabled ? 'enabled' : 'disabled'} · OT multiplier {settings.payroll.otMultiplier}× · Pay day {settings.payroll.payDay} of next month</p>
        </div>
      )}
      {step === 1 && (
        <div className="max-h-[50vh] overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-slate-50 text-[10.5px] uppercase tracking-wide text-slate-500">
              <tr>{['Employee', 'Present', 'Late', 'Half day', 'Leave', 'Week off', 'Absent', 'Projected', 'OT hrs', 'Payable'].map((h, i) => <th key={h} className={'px-2.5 py-2 font-semibold ' + (i ? 'text-right' : 'text-left')}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-2.5 py-1.5"><span className="font-medium text-slate-800">{r.emp.name}</span> <span className="text-slate-400">· {outlets.find((o) => o.id === r.emp.outletId)?.short}</span></td>
                  <td className="px-2.5 text-right">{r.att.present}</td><td className="px-2.5 text-right text-amber-600">{r.att.late}</td><td className="px-2.5 text-right">{r.att.half}</td>
                  <td className="px-2.5 text-right">{r.att.leave}</td><td className="px-2.5 text-right text-slate-400">{r.att.off}</td><td className="px-2.5 text-right text-rose-600">{r.att.absent}</td>
                  <td className="px-2.5 text-right text-slate-400">{r.att.projected}</td><td className="px-2.5 text-right">{r.att.otHours}</td>
                  <td className="px-2.5 text-right font-semibold text-slate-900">{r.att.payable}/{r.att.dim}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {step === 2 && (
        calc !== 'done' ? (
          <div className="flex flex-col items-center py-12 text-slate-500">
            <Loader2 className="size-7 animate-spin text-brand-500" />
            <p className="mt-3 text-[13px]">Calculating earnings, overtime, PF/ESI and deductions for {rows.length} employees…</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {([['Gross earnings', totals.gross], ['Overtime', totals.ot], ['Deductions & advances', totals.ded], ['Net payout', totals.net]] as [string, number][]).map(([k, v], i) => (
                <div key={k} className={'rounded-xl border p-3 ' + (i === 3 ? 'border-brand-200 bg-brand-50' : 'border-slate-200')}><p className="text-[11px] text-slate-500">{k}</p><p className="text-[17px] font-semibold text-slate-900">{inr(v)}</p></div>
              ))}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-emerald-700"><CheckCircle2 className="size-3.5" />Calculation complete — no errors. Earnings pro-rated by payable days.</p>
          </div>
        )
      )}
      {step === 3 && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 p-4 text-[13px]">
            <div className="flex justify-between py-1"><span className="text-slate-500">Month</span><b>{monthLabel(month)}</b></div>
            <div className="flex justify-between py-1"><span className="text-slate-500">Outlets</span><b>{outlets.filter((o) => sel.includes(o.id)).map((o) => o.short).join(', ')}</b></div>
            <div className="flex justify-between py-1"><span className="text-slate-500">Employees</span><b>{rows.length}</b></div>
            <div className="flex justify-between py-1"><span className="text-slate-500">Gross</span><b>{inr(totals.gross)}</b></div>
            <div className="flex justify-between border-t border-slate-100 py-1 pt-2"><span className="text-slate-500">Net payout</span><b className="text-[15px] text-brand-700">{inr(totals.net)}</b></div>
          </div>
          <p className="flex items-center gap-1.5 text-[12px] text-slate-500"><Settings2 className="size-3.5" />After processing, the Accountant must approve before salaries can be marked as paid.</p>
        </div>
      )}
    </Modal>
  )
}
