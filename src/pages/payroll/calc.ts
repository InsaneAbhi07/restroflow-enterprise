import type { AttStatus, Attendance, Employee, PayrollRun } from '@/types'
import type { Settings } from '@/store/useStore'
import { isoDate } from '@/lib/format'

export const ATT_WEIGHT: Record<AttStatus, number> = { Present: 1, Late: 1, 'Half Day': 0.5, Leave: 1, 'Weekly Off': 1, Absent: 0 }

export const daysInMonth = (ym: string) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate() }
export const currentMonth = () => isoDate().slice(0, 7)
export function monthOptions(n = 6) {
  const d = new Date()
  return Array.from({ length: n }, (_, i) => isoDate(new Date(d.getFullYear(), d.getMonth() - i, 15)).slice(0, 7))
}
export const prevMonth = (ym: string, back = 1) => { const [y, m] = ym.split('-').map(Number); return isoDate(new Date(y, m - 1 - back, 15)).slice(0, 7) }

export interface AttSummary { present: number; late: number; half: number; leave: number; off: number; absent: number; projected: number; recorded: number; payable: number; otHours: number; dim: number }

/** Attendance summary for an employee in a month. Days without a record count as payable (projected / assumed present). */
export function attendanceSummary(emp: Employee, month: string, att: Attendance[]): AttSummary {
  const dim = daysInMonth(month)
  const recs = new Map<string, Attendance>()
  att.forEach((a) => { if (a.employeeId === emp.id && a.date.startsWith(month)) recs.set(a.date, a) })
  const s: AttSummary = { present: 0, late: 0, half: 0, leave: 0, off: 0, absent: 0, projected: 0, recorded: 0, payable: 0, otHours: 0, dim }
  for (let d = 1; d <= dim; d++) {
    const date = `${month}-${String(d).padStart(2, '0')}`
    const r = recs.get(date)
    if (!r) { s.projected++; s.payable += 1; continue }
    s.recorded++
    s.payable += ATT_WEIGHT[r.status]
    s.otHours += r.ot ?? 0
    if (r.status === 'Present') s.present++
    else if (r.status === 'Late') s.late++
    else if (r.status === 'Half Day') s.half++
    else if (r.status === 'Leave') s.leave++
    else if (r.status === 'Weekly Off') s.off++
    else s.absent++
  }
  s.otHours = Math.round(s.otHours * 10) / 10
  return s
}

export interface PayRow {
  id: string; emp: Employee; att: AttSummary; basic: number; hra: number; allowance: number; incentive: number; allowances: number
  overtime: number; gross: number; pf: number; esi: number; loan: number; deductions: number; advance: number; net: number; status: string
}

export const rowStatus = (run: PayrollRun['status']) => (run === 'Not Started' ? 'Pending' : run)

export function computeRow(emp: Employee, month: string, att: Attendance[], settings: Settings, runStatus: PayrollRun['status']): PayRow {
  const a = attendanceSummary(emp, month, att)
  const f = a.payable / a.dim
  const s = emp.salary
  const basic = Math.round(s.basic * f)
  const hra = Math.round(s.hra * f)
  const allowance = Math.round(s.allowance * f)
  const incentive = Math.round(s.incentive * f)
  const allowances = hra + allowance + incentive
  const overtime = Math.round(a.otHours * s.otRate * (settings.payroll.otMultiplier / 1.5))
  const gross = basic + allowances + overtime
  const pf = settings.payroll.pfEnabled ? Math.round(s.pf * f) : 0
  const esi = settings.payroll.esiEnabled ? Math.round(s.esi * f) : 0
  const loan = s.loan
  const deductions = pf + esi + loan
  const advance = s.advance
  const net = Math.max(0, gross - deductions - advance)
  return { id: emp.id, emp, att: a, basic, hra, allowance, incentive, allowances, overtime, gross, pf, esi, loan, deductions, advance, net, status: rowStatus(runStatus) }
}

/** Effective run for a month: stored run, or historical months default to Paid */
export function runFor(runs: PayrollRun[], month: string): PayrollRun {
  const r = runs.find((x) => x.month === month)
  if (r) return r
  if (month < currentMonth()) return { month, status: 'Paid', processedAt: new Date(month + '-28').getTime(), approvedBy: 'Karan Mehta', paidOn: month + '-28' }
  return { month, status: 'Not Started' }
}

/* ---------------- INR amount in words (Indian numbering) ---------------- */
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
const two = (n: number) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''))
const three = (n: number) => {
  const h = Math.floor(n / 100), r = n % 100
  return [h ? ONES[h] + ' Hundred' : '', r ? two(r) : ''].filter(Boolean).join(' ')
}
export function inrWords(amount: number) {
  let n = Math.round(Math.abs(amount))
  if (n === 0) return 'Rupees Zero Only'
  const parts: string[] = []
  const crore = Math.floor(n / 1e7); n %= 1e7
  const lakh = Math.floor(n / 1e5); n %= 1e5
  const thousand = Math.floor(n / 1e3); n %= 1e3
  if (crore) parts.push(three(crore) + ' Crore')
  if (lakh) parts.push(two(lakh) + ' Lakh')
  if (thousand) parts.push(two(thousand) + ' Thousand')
  if (n) parts.push(three(n))
  return 'Rupees ' + parts.join(' ') + ' Only'
}

/** Deterministic pseudo-history of net pay for the last n months */
export function salaryHistory(row: PayRow, month: string, n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const m = prevMonth(month, n - i)
    let h = 0
    for (const c of row.emp.id + m) h = (h * 31 + c.charCodeAt(0)) >>> 0
    const factor = 0.94 + ((h % 1000) / 1000) * 0.06
    const ot = (h % 7) * row.emp.salary.otRate
    const full = row.emp.salary.basic + row.emp.salary.hra + row.emp.salary.allowance + row.emp.salary.incentive
    const net = Math.round(full * factor + ot - row.emp.salary.pf - row.emp.salary.esi - row.emp.salary.loan)
    return { month: m, net, payable: Math.round(daysInMonth(m) * factor * 2) / 2 }
  })
}
