import { CHART } from '@/components/ui'
import { monthLabel } from '@/lib/format'
import type { Attendance, AttStatus, Employee } from '@/types'
import type { ReportCtx, ReportDef, Row } from '../types'
import { dateInRange } from '../range'
import { outletShort } from '../gen'
import { badgeCell, col, departmentFilter, kpi, money, n0, outletCol, pctOf } from './helpers'

const STATUSES: AttStatus[] = ['Present', 'Late', 'Half Day', 'Leave', 'Absent', 'Weekly Off']
const ST_COLOR: Record<AttStatus, string> = { Present: CHART.teal, Late: CHART.amber, 'Half Day': CHART.orange, Leave: CHART.violet, Absent: CHART.red, 'Weekly Off': CHART.slate }
const SHIFT_START: Record<Employee['shift'], number> = { Morning: 8, Evening: 14, Night: 20, General: 10 }

const staff = (ctx: ReportCtx) => ctx.employees.filter((e) => ctx.outletIds.includes(e.outletId) && (!ctx.filter.dept || e.department === ctx.filter.dept))
const attIn = (ctx: ReportCtx, ids: Set<string>) => ctx.attendance.filter((a) => ids.has(a.employeeId) && dateInRange(a.date, ctx.dates))
const hm = (s?: string) => (s ? Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5)) : 0)
const hours = (a: Attendance) => (a.checkIn && a.checkOut ? (((hm(a.checkOut) - hm(a.checkIn)) % 1440) + 1440) % 1440 / 60 : 0)
const lateBy = (a: Attendance, e: Employee) => (a.checkIn ? Math.max(0, hm(a.checkIn) - SHIFT_START[e.shift] * 60) : 0)

/** monthly payroll for the month containing the range end */
export function payroll(ctx: ReportCtx) {
  const end = ctx.dates[ctx.dates.length - 1]
  const ym = end.slice(0, 7)
  const [y, m] = ym.split('-').map(Number)
  const dim = new Date(y, m, 0).getDate()
  return {
    ym, dim,
    rows: staff(ctx).map((e) => {
      const recs = ctx.attendance.filter((a) => a.employeeId === e.id && a.date.startsWith(ym))
      const absent = recs.filter((a) => a.status === 'Absent').length
      const half = recs.filter((a) => a.status === 'Half Day').length
      const payable = dim - absent - half * 0.5
      const s = e.salary
      const f = payable / dim
      const basic = s.basic * f, hra = s.hra * f, allowance = s.allowance * f
      const otHrs = recs.reduce((x, a) => x + (a.ot ?? 0), 0)
      const ot = otHrs * s.otRate
      const gross = basic + hra + allowance + s.incentive + ot
      const pf = s.pf, esi = s.esi ? Math.round(gross * 0.0075) : 0, pt = gross > 15000 ? 200 : 0
      const ded = pf + esi + pt + s.advance + s.loan
      return { e, payable, absent, half, basic, hra, allowance, incentive: s.incentive, otHrs, ot, gross, pf, esi, pt, advance: s.advance, loan: s.loan, ded, net: gross - ded, employerPf: Math.round(Math.min(s.basic, 15000) * 0.13) }
    }),
  }
}

export const HRMS_REPORTS: ReportDef[] = [
  {
    id: 'daily-attendance', group: 'HRMS', title: 'Daily Attendance', icon: 'CalendarCheck', defaultRange: 'today', filters: [departmentFilter], tags: ['popular'],
    description: 'Status, check-in/out, hours and capture method for every employee on the selected day (range end).',
    build: (ctx) => {
      const day = ctx.dates[ctx.dates.length - 1]
      const rows: Row[] = staff(ctx).map((e) => {
        const a = ctx.attendance.find((x) => x.employeeId === e.id && x.date === day)
        return { id: e.id, code: e.code, name: e.name, department: e.department, outlet: outletShort(ctx, e.outletId), shift: e.shift, status: a?.status ?? 'Not marked', in: a?.checkIn ?? '-', out: a?.checkOut ?? '-', hours: a ? hours(a) : 0, late: a ? lateBy(a, e) : 0, method: a?.method ?? '-' }
      })
      const cnt = (s: string) => rows.filter((r) => r.status === s).length
      return {
        kpis: [kpi('Headcount', n0(rows.length)), kpi('Present', n0(cnt('Present') + cnt('Late')), pctOf(cnt('Present') + cnt('Late'), rows.length).toFixed(0) + '%', 'green'), kpi('Late', n0(cnt('Late')), undefined, 'amber'), kpi('Absent', n0(cnt('Absent')), undefined, 'red'), kpi('On Leave / Off', n0(cnt('Leave') + cnt('Weekly Off'))), kpi('Not Marked', n0(cnt('Not marked')), 'Yet to check in', 'gray')],
        columns: [col('code', 'Emp Code'), col('name', 'Employee'), col('department', 'Department'), ...outletCol(ctx), col('shift', 'Shift'), col('status', 'Status', 'text', undefined, { render: badgeCell('status') }), col('in', 'Check-in'), col('out', 'Check-out'), col('hours', 'Hours', 'dec', 'sum'), col('late', 'Late (min)', 'num'), col('method', 'Method')],
        rows,
        note: ctx.nDays > 1 ? `Showing ${day} (end of selected range).` : undefined,
        charts: [{ kind: 'donut', title: 'Status split', data: [...STATUSES, 'Not marked' as const].map((s) => ({ name: s, value: cnt(s), color: s === 'Not marked' ? '#cbd5e1' : ST_COLOR[s as AttStatus] })) }],
      }
    },
  },
  {
    id: 'monthly-attendance', group: 'HRMS', title: 'Monthly Attendance', icon: 'CalendarDays', defaultRange: 'thisMonth', filters: [departmentFilter],
    description: 'Muster roll summary — present, late, half-day, leave, absent, week-off and payable days per employee.',
    build: (ctx) => {
      const emps = staff(ctx)
      const att = attIn(ctx, new Set(emps.map((e) => e.id)))
      const rows: Row[] = emps.map((e) => {
        const recs = att.filter((a) => a.employeeId === e.id)
        const c = (s: AttStatus) => recs.filter((a) => a.status === s).length
        return { id: e.id, code: e.code, name: e.name, department: e.department, outlet: outletShort(ctx, e.outletId), present: c('Present'), late: c('Late'), half: c('Half Day'), leave: c('Leave'), absent: c('Absent'), off: c('Weekly Off'), payable: c('Present') + c('Late') + c('Leave') + c('Weekly Off') + c('Half Day') * 0.5, pct: pctOf(c('Present') + c('Late') + c('Half Day') * 0.5, recs.length - c('Weekly Off')) }
      })
      const trend = ctx.dates.map((d) => { const o: Record<string, unknown> = { label: d.slice(8) }; STATUSES.forEach((s) => (o[s] = att.filter((a) => a.date === d && a.status === s).length)); return o })
      return {
        kpis: [kpi('Employees', n0(rows.length)), kpi('Avg Attendance', (rows.reduce((s, r) => s + Number(r.pct), 0) / (rows.length || 1)).toFixed(1) + '%', undefined, 'teal'), kpi('Late Marks', n0(rows.reduce((s, r) => s + Number(r.late), 0)), undefined, 'amber'), kpi('Absent Days', n0(rows.reduce((s, r) => s + Number(r.absent), 0)), undefined, 'red'), kpi('Leaves', n0(rows.reduce((s, r) => s + Number(r.leave), 0)), undefined, 'violet')],
        columns: [col('code', 'Emp Code'), col('name', 'Employee'), col('department', 'Department'), ...outletCol(ctx), col('present', 'P', 'num', 'sum'), col('late', 'Late', 'num', 'sum'), col('half', 'HD', 'num', 'sum'), col('leave', 'Leave', 'num', 'sum'), col('absent', 'A', 'num', 'sum'), col('off', 'WO', 'num', 'sum'), col('payable', 'Payable Days', 'dec', 'sum'), col('pct', 'Attendance %', 'pct', 'avg')],
        rows,
        charts: [{ kind: 'stacked', title: 'Daily status trend', x: 'label', data: trend, series: STATUSES.map((s) => ({ key: s, name: s, color: ST_COLOR[s] })) }],
      }
    },
  },
  {
    id: 'employee-attendance', group: 'HRMS', title: 'Employee-wise Attendance', icon: 'UserRound', defaultRange: 'thisMonth',
    description: 'Day-by-day attendance log of a single employee with hours, late minutes and overtime.',
    filters: [{ key: 'emp', label: 'Employee', options: (ctx) => ctx.employees.filter((e) => ctx.outletIds.includes(e.outletId)).map((e) => ({ value: e.id, label: `${e.name} (${e.code})` })) }],
    build: (ctx) => {
      const pool = ctx.employees.filter((e) => ctx.outletIds.includes(e.outletId))
      const e = pool.find((x) => x.id === ctx.filter.emp) ?? pool[0]
      if (!e) return { kpis: [], columns: [], rows: [] }
      const recs = attIn(ctx, new Set([e.id]))
      const rows: Row[] = [...ctx.dates].reverse().map((d) => {
        const a = recs.find((x) => x.date === d)
        return { id: d, date: d, day: new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' }), status: a?.status ?? 'Not marked', in: a?.checkIn ?? '-', out: a?.checkOut ?? '-', hours: a ? hours(a) : 0, late: a ? lateBy(a, e) : 0, ot: a?.ot ?? 0, method: a?.method ?? '-' }
      })
      const c = (s: string) => rows.filter((r) => r.status === s).length
      return {
        kpis: [kpi('Employee', e.name, `${e.designation} · ${e.code}`, 'navy'), kpi('Present', n0(c('Present') + c('Late')), undefined, 'green'), kpi('Late', n0(c('Late')), undefined, 'amber'), kpi('Absent', n0(c('Absent')), undefined, 'red'), kpi('Hours Worked', rows.reduce((s, r) => s + Number(r.hours), 0).toFixed(1)), kpi('OT Hours', rows.reduce((s, r) => s + Number(r.ot), 0).toFixed(1))],
        columns: [col('date', 'Date', 'date'), col('day', 'Day'), col('status', 'Status', 'text', undefined, { render: badgeCell('status') }), col('in', 'Check-in'), col('out', 'Check-out'), col('hours', 'Hours', 'dec', 'sum'), col('late', 'Late (min)', 'num', 'sum'), col('ot', 'OT Hrs', 'dec', 'sum'), col('method', 'Method')],
        rows,
        charts: [{ kind: 'bar', title: 'Hours worked per day', x: 'label', data: [...rows].reverse().map((r) => ({ label: String(r.date).slice(8), hours: r.hours, ot: r.ot })), series: [{ key: 'hours', name: 'Hours', color: CHART.teal, stack: 'h' }, { key: 'ot', name: 'OT', color: CHART.orange, stack: 'h' }] }],
      }
    },
  },
  {
    id: 'late-arrival', group: 'HRMS', title: 'Late Arrival Report', icon: 'AlarmClock', defaultRange: 'thisMonth', filters: [departmentFilter],
    description: 'Every late check-in beyond grace time with shift start, actual time and minutes late.',
    build: (ctx) => {
      const emps = staff(ctx)
      const map = new Map(emps.map((e) => [e.id, e]))
      const rows: Row[] = attIn(ctx, new Set(map.keys())).filter((a) => a.status === 'Late').map((a) => {
        const e = map.get(a.employeeId)!
        return { id: a.id, date: a.date, name: e.name, department: e.department, outlet: outletShort(ctx, e.outletId), shift: e.shift, start: `${String(SHIFT_START[e.shift]).padStart(2, '0')}:00`, in: a.checkIn ?? '-', late: lateBy(a, e), method: a.method ?? '-' }
      }).sort((a, c) => (String(a.date) < String(c.date) ? 1 : -1))
      const byEmp = emps.map((e) => ({ name: e.name, count: rows.filter((r) => r.name === e.name).length })).filter((x) => x.count).sort((a, b) => b.count - a.count).slice(0, 12)
      return {
        kpis: [kpi('Late Marks', n0(rows.length), undefined, 'amber'), kpi('Avg Late By', (rows.reduce((s, r) => s + Number(r.late), 0) / (rows.length || 1)).toFixed(0) + ' min'), kpi('Most Late', byEmp[0]?.name ?? '-', byEmp[0] ? byEmp[0].count + ' times' : '', 'red'), kpi('Employees Late', n0(byEmp.length))],
        columns: [col('date', 'Date', 'date'), col('name', 'Employee'), col('department', 'Department'), ...outletCol(ctx), col('shift', 'Shift'), col('start', 'Shift Start'), col('in', 'Checked In'), col('late', 'Late By (min)', 'num', 'avg'), col('method', 'Method')],
        rows,
        charts: [{ kind: 'hbar', title: 'Late marks by employee', x: 'name', data: byEmp, series: [{ key: 'count', name: 'Late marks', color: CHART.amber }] }],
      }
    },
  },
  {
    id: 'overtime', group: 'HRMS', title: 'Overtime Report', icon: 'Timer', defaultRange: 'thisMonth', filters: [departmentFilter],
    description: 'Overtime hours and payable OT amount per employee at configured OT rate.',
    build: (ctx) => {
      const emps = staff(ctx)
      const att = attIn(ctx, new Set(emps.map((e) => e.id)))
      const rows: Row[] = emps.map((e) => {
        const recs = att.filter((a) => a.employeeId === e.id && (a.ot ?? 0) > 0)
        const hrs = recs.reduce((s, a) => s + (a.ot ?? 0), 0)
        return { id: e.id, code: e.code, name: e.name, department: e.department, outlet: outletShort(ctx, e.outletId), days: recs.length, hrs, rate: e.salary.otRate, amount: hrs * e.salary.otRate }
      }).filter((r) => Number(r.hrs) > 0).sort((a, c) => Number(c.hrs) - Number(a.hrs))
      const depts = [...new Set(rows.map((r) => String(r.department)))]
      return {
        kpis: [kpi('OT Hours', rows.reduce((s, r) => s + Number(r.hrs), 0).toFixed(1), undefined, 'orange'), kpi('OT Payable', money(rows.reduce((s, r) => s + Number(r.amount), 0)), undefined, 'teal'), kpi('Employees with OT', n0(rows.length)), kpi('Top OT', rows[0] ? String(rows[0].name) : '-', rows[0] ? Number(rows[0].hrs).toFixed(1) + ' hrs' : '')],
        columns: [col('code', 'Emp Code'), col('name', 'Employee'), col('department', 'Department'), ...outletCol(ctx), col('days', 'OT Days', 'num', 'sum'), col('hrs', 'OT Hours', 'dec', 'sum'), col('rate', 'Rate / Hr', 'inr'), col('amount', 'OT Amount', 'inr', 'sum')],
        rows,
        charts: [{ kind: 'pie', title: 'OT hours by department', data: depts.map((d, i) => ({ name: d, value: Math.round(rows.filter((r) => r.department === d).reduce((s, r) => s + Number(r.hrs), 0) * 10) / 10, color: CHART.series[i] })) }],
      }
    },
  },
  {
    id: 'payroll-summary', group: 'HRMS', title: 'Payroll Summary', icon: 'Landmark', defaultRange: 'thisMonth', filters: [departmentFilter], tags: ['popular'],
    description: 'Department-wise headcount, gross earnings, statutory deductions (PF/ESI/PT) and net payable.',
    build: (ctx) => {
      const p = payroll(ctx)
      const run = ctx.payrollRuns.find((r) => r.month === p.ym)
      const depts = [...new Set(p.rows.map((r) => r.e.department))]
      const rows: Row[] = depts.map((d) => {
        const rs = p.rows.filter((r) => r.e.department === d)
        const s = (k: keyof (typeof rs)[number]) => rs.reduce((a, r) => a + Number(r[k]), 0)
        return { id: d, department: d, headcount: rs.length, gross: s('gross'), ot: s('ot'), pf: s('pf'), esi: s('esi'), pt: s('pt'), recoveries: s('advance') + s('loan'), net: s('net'), employerPf: s('employerPf'), ctc: s('gross') + s('employerPf') }
      }).sort((a, c) => Number(c.gross) - Number(a.gross))
      const t = (k: string) => rows.reduce((a, r) => a + Number(r[k]), 0)
      return {
        kpis: [kpi('Payroll Month', monthLabel(p.ym), run ? `Status: ${run.status}` : 'Not processed', 'navy'), kpi('Gross Salary', money(t('gross')), undefined, 'teal'), kpi('Deductions', money(t('pf') + t('esi') + t('pt') + t('recoveries')), undefined, 'red'), kpi('Net Payable', money(t('net')), `${n0(t('headcount'))} employees`, 'green'), kpi('Employer CTC', money(t('ctc')))],
        columns: [col('department', 'Department'), col('headcount', 'Headcount', 'num', 'sum'), col('gross', 'Gross', 'inr', 'sum'), col('ot', 'OT', 'inr', 'sum'), col('pf', 'PF (Emp)', 'inr', 'sum'), col('esi', 'ESI', 'inr', 'sum'), col('pt', 'Prof. Tax', 'inr', 'sum'), col('recoveries', 'Advance / Loan', 'inr', 'sum'), col('net', 'Net Pay', 'inr', 'sum'), col('employerPf', 'Employer PF', 'inr', 'sum'), col('ctc', 'CTC', 'inr', 'sum')],
        rows,
        charts: [{ kind: 'stacked', title: 'Net pay vs deductions by department', x: 'department', money: true, data: rows.map((r) => ({ department: r.department, net: r.net, ded: Number(r.gross) - Number(r.net) })), series: [{ key: 'net', name: 'Net Pay', color: CHART.teal }, { key: 'ded', name: 'Deductions', color: CHART.red }] }],
      }
    },
  },
  {
    id: 'salary-register', group: 'HRMS', title: 'Salary Register', icon: 'BookUser', defaultRange: 'thisMonth', filters: [departmentFilter],
    description: 'Statutory salary register — earnings, deductions and net pay per employee for the month.',
    build: (ctx) => {
      const p = payroll(ctx)
      const rows: Row[] = p.rows.map((r) => ({ id: r.e.id, code: r.e.code, name: r.e.name, designation: r.e.designation, outlet: outletShort(ctx, r.e.outletId), days: r.payable, basic: r.basic, hra: r.hra, allowance: r.allowance, incentive: r.incentive, ot: r.ot, gross: r.gross, pf: r.pf, esi: r.esi, pt: r.pt, advance: r.advance + r.loan, ded: r.ded, net: r.net, bank: r.e.bank }))
      return {
        kpis: [kpi('Month', monthLabel(p.ym), `${p.dim} days`, 'navy'), kpi('Employees', n0(rows.length)), kpi('Gross', money(rows.reduce((s, r) => s + Number(r.gross), 0)), undefined, 'teal'), kpi('Net Pay', money(rows.reduce((s, r) => s + Number(r.net), 0)), undefined, 'green')],
        columns: [col('code', 'Code'), col('name', 'Employee'), col('designation', 'Designation'), ...outletCol(ctx), col('days', 'Paid Days', 'dec'), col('basic', 'Basic', 'inr', 'sum'), col('hra', 'HRA', 'inr', 'sum'), col('allowance', 'Allow.', 'inr', 'sum'), col('incentive', 'Incentive', 'inr', 'sum'), col('ot', 'OT', 'inr', 'sum'), col('gross', 'Gross', 'inr', 'sum'), col('pf', 'PF', 'inr', 'sum'), col('esi', 'ESI', 'inr', 'sum'), col('pt', 'PT', 'inr', 'sum'), col('advance', 'Adv/Loan', 'inr', 'sum'), col('ded', 'Total Ded.', 'inr', 'sum'), col('net', 'Net Pay', 'inr', 'sum'), col('bank', 'Bank A/c')],
        rows,
      }
    },
  },
]
