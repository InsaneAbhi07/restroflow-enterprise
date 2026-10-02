import { useMemo, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Employee } from '@/types'
import { Button, Card, CardHeader, CHART, Segmented, tooltipStyle } from '@/components/ui'
import { PrintPreviewModal } from '@/components/print/Print'
import { useStore } from '@/store/useStore'
import { usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { fmtDate, fmtDateShort, isoDate, monthLabel } from '@/lib/format'
import { ORG } from '@/data/outlets'
import { ATT_COLOR, hm12, lateMinutes, monthDates, summarize } from './attUtils'

type R = 'daily' | 'monthly' | 'late' | 'absent' | 'ot' | 'employee'
interface Report { title: string; desc: string; chart: React.ReactNode; cols: string[]; rows: (string | number)[][] }

const axis = { tick: CHART.axis, axisLine: false, tickLine: false } as const

export function ReportsTab({ emps }: { emps: Employee[] }) {
  const attendance = useStore((s) => s.attendance)
  const outlets = useStore((s) => s.outlets)
  const { can } = usePermission()
  const [r, setR] = useState<R>('daily')
  const [print, setPrint] = useState(false)
  const today = isoDate()
  const ym = today.slice(0, 7)
  const ids = useMemo(() => new Set(emps.map((e) => e.id)), [emps])
  const recs = useMemo(() => attendance.filter((a) => a.date.startsWith(ym) && a.date <= today && ids.has(a.employeeId)), [attendance, ym, today, ids])
  const empOf = (id: string) => emps.find((e) => e.id === id)!

  const report: Report = useMemo(() => {
    if (r === 'daily') {
      const data = monthDates(ym).filter((d) => d <= today).map((d) => {
        const s = summarize(recs.filter((a) => a.date === d))
        return { d: fmtDateShort(d), date: d, Present: s.Present, Late: s.Late, 'Half Day': s['Half Day'], Absent: s.Absent, Leave: s.Leave, pct: s.pct }
      })
      return {
        title: 'Daily attendance', desc: `Day-wise headcount for ${monthLabel(ym)}`,
        chart: (
          <BarChart data={data}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="d" {...axis} interval="preserveStartEnd" />
            <YAxis {...axis} width={28} />
            <Tooltip {...tooltipStyle} />
            {(['Present', 'Late', 'Half Day', 'Absent', 'Leave'] as const).map((k, i, arr) => <Bar key={k} dataKey={k} stackId="a" fill={ATT_COLOR[k].hex} radius={i === arr.length - 1 ? [3, 3, 0, 0] : 0} />)}
          </BarChart>
        ),
        cols: ['Date', 'Present', 'Late', 'Half day', 'Absent', 'Leave', 'Attendance %'],
        rows: [...data].reverse().map((x) => [fmtDate(x.date), x.Present, x.Late, x['Half Day'], x.Absent, x.Leave, x.pct.toFixed(1) + '%']),
      }
    }
    if (r === 'monthly') {
      const outIds = [...new Set(emps.map((e) => e.outletId))]
      const data = outIds.map((o) => {
        const s = summarize(recs.filter((a) => empOf(a.employeeId).outletId === o))
        return { name: outlets.find((x) => x.id === o)?.short ?? o, ...s, staff: emps.filter((e) => e.outletId === o).length }
      })
      return {
        title: 'Monthly attendance', desc: `Outlet-wise attendance rate · ${monthLabel(ym)}`,
        chart: (
          <BarChart data={data}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="name" {...axis} />
            <YAxis {...axis} width={34} domain={[0, 100]} unit="%" />
            <Tooltip {...tooltipStyle} formatter={(v) => Number(v).toFixed(1) + '%'} />
            <Bar dataKey="pct" name="Attendance %" radius={[4, 4, 0, 0]} maxBarSize={56}>{data.map((_, i) => <Cell key={i} fill={CHART.series[i % 10]} />)}</Bar>
          </BarChart>
        ),
        cols: ['Outlet', 'Staff', 'Present', 'Late', 'Half day', 'Absent', 'Leave', 'Attendance %'],
        rows: data.map((x) => [x.name, x.staff, x.Present, x.Late, x['Half Day'], x.Absent, x.Leave, x.pct.toFixed(1) + '%']),
      }
    }
    if (r === 'late') {
      const lates = recs.filter((a) => a.status === 'Late').sort((a, b) => b.date.localeCompare(a.date))
      const byEmp = emps.map((e) => ({ name: e.name.split(' ')[0], n: lates.filter((a) => a.employeeId === e.id).length })).filter((x) => x.n).sort((a, b) => b.n - a.n).slice(0, 10)
      return {
        title: 'Late arrivals', desc: `${lates.length} late check-ins this month`,
        chart: (
          <BarChart data={byEmp} layout="vertical">
            <CartesianGrid stroke={CHART.grid} horizontal={false} />
            <XAxis type="number" {...axis} allowDecimals={false} />
            <YAxis type="category" dataKey="name" {...axis} width={70} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="n" name="Late days" fill={CHART.amber} radius={[0, 4, 4, 0]} maxBarSize={16} />
          </BarChart>
        ),
        cols: ['Date', 'Employee', 'Code', 'Shift', 'Check-in', 'Minutes late'],
        rows: lates.slice(0, 40).map((a) => { const e = empOf(a.employeeId); return [fmtDate(a.date), e.name, e.code, e.shift, hm12(a.checkIn), lateMinutes(a, e)] }),
      }
    }
    if (r === 'absent') {
      const depts = [...new Set(emps.map((e) => e.department))]
      const data = depts.map((d) => {
        const rs = recs.filter((a) => empOf(a.employeeId).department === d)
        return { name: d, Absent: rs.filter((a) => a.status === 'Absent').length, Leave: rs.filter((a) => a.status === 'Leave').length }
      })
      const rows = emps.map((e) => {
        const s = summarize(recs.filter((a) => a.employeeId === e.id))
        return { e, s }
      }).filter((x) => x.s.Absent + x.s.Leave > 0).sort((a, b) => b.s.Absent - a.s.Absent)
      return {
        title: 'Absenteeism', desc: 'Unplanned absence vs approved leave by department',
        chart: (
          <BarChart data={data}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="name" {...axis} />
            <YAxis {...axis} width={28} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="Absent" stackId="a" fill={ATT_COLOR.Absent.hex} />
            <Bar dataKey="Leave" stackId="a" fill={ATT_COLOR.Leave.hex} radius={[4, 4, 0, 0]} />
          </BarChart>
        ),
        cols: ['Employee', 'Code', 'Department', 'Absent days', 'Leave days', 'Absenteeism %'],
        rows: rows.map(({ e, s }) => [e.name, e.code, e.department, s.Absent, s.Leave, s.working ? ((s.Absent / s.working) * 100).toFixed(1) + '%' : '0%']),
      }
    }
    if (r === 'ot') {
      const data = emps.map((e) => {
        const rs = recs.filter((a) => a.employeeId === e.id)
        const ot = rs.reduce((s, a) => s + (a.ot ?? 0), 0)
        return { e, name: e.name.split(' ')[0], ot: Math.round(ot * 10) / 10, days: rs.filter((a) => (a.ot ?? 0) > 0).length, pay: Math.round(ot * e.salary.otRate) }
      }).filter((x) => x.ot > 0).sort((a, b) => b.ot - a.ot)
      return {
        title: 'Overtime', desc: `${data.reduce((s, x) => s + x.ot, 0).toFixed(1)} OT hours · est. payout ₹${data.reduce((s, x) => s + x.pay, 0).toLocaleString('en-IN')}`,
        chart: (
          <BarChart data={data.slice(0, 12)}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="name" {...axis} />
            <YAxis {...axis} width={28} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="ot" name="OT hours" fill={CHART.teal} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        ),
        cols: ['Employee', 'Code', 'Department', 'OT days', 'OT hours', 'OT rate', 'Est. payout'],
        rows: data.map((x) => [x.e.name, x.e.code, x.e.department, x.days, x.ot, '₹' + x.e.salary.otRate + '/h', '₹' + x.pay.toLocaleString('en-IN')]),
      }
    }
    const data = emps.map((e) => ({ e, name: e.name.split(' ')[0], ...summarize(recs.filter((a) => a.employeeId === e.id)) })).sort((a, b) => b.pct - a.pct)
    return {
      title: 'Employee-wise summary', desc: `Attendance % per employee · ${monthLabel(ym)}`,
      chart: (
        <BarChart data={data}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="name" {...axis} interval={0} angle={-35} textAnchor="end" height={50} />
          <YAxis {...axis} width={34} domain={[0, 100]} unit="%" />
          <Tooltip {...tooltipStyle} formatter={(v) => Number(v).toFixed(1) + '%'} />
          <Bar dataKey="pct" name="Attendance %" radius={[3, 3, 0, 0]}>{data.map((x, i) => <Cell key={i} fill={x.pct >= 90 ? CHART.teal : x.pct >= 75 ? CHART.amber : CHART.red} />)}</Bar>
        </BarChart>
      ),
      cols: ['Employee', 'Code', 'P', 'Late', 'HD', 'A', 'Leave', 'WO', 'OT h', 'Attendance %'],
      rows: data.map((x) => [x.e.name, x.e.code, x.Present, x.Late, x['Half Day'], x.Absent, x.Leave, x['Weekly Off'], x.ot.toFixed(1), x.pct.toFixed(1) + '%']),
    }
  }, [r, recs, emps, outlets, ym, today]) // eslint-disable-line react-hooks/exhaustive-deps

  const table = (compact?: boolean) => (
    <table className="w-full text-left text-[12px]">
      <thead><tr className="border-b border-slate-200 bg-slate-50">{report.cols.map((c, i) => <th key={c} className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${i > 0 && typeof report.rows[0]?.[i] === 'number' ? 'text-right' : ''}`}>{c}</th>)}</tr></thead>
      <tbody>
        {(compact ? report.rows : report.rows.slice(0, 15)).map((row, i) => (
          <tr key={i} className="border-b border-slate-100 last:border-0">{row.map((c, j) => <td key={j} className={`px-3 py-1.5 text-slate-700 ${typeof c === 'number' ? 'text-right tabular' : ''}`}>{c}</td>)}</tr>
        ))}
        {report.rows.length === 0 && <tr><td colSpan={report.cols.length} className="px-3 py-6 text-center text-slate-500">No data for this period.</td></tr>}
      </tbody>
    </table>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented value={r} onChange={setR} items={[
          { value: 'daily', label: 'Daily' }, { value: 'monthly', label: 'Monthly' }, { value: 'late', label: 'Late arrivals' },
          { value: 'absent', label: 'Absenteeism' }, { value: 'ot', label: 'Overtime' }, { value: 'employee', label: 'Employee-wise' },
        ]} />
        <div className="flex gap-2">
          <Button icon={<Download className="size-3.5" />} disabled={!can('attendance', 'export')} onClick={() => toast.success(`${report.title} exported`, `${report.title.toLowerCase().replace(/\W+/g, '_')}_${ym}.xlsx`)}>Export Excel</Button>
          <Button icon={<Printer className="size-3.5" />} onClick={() => setPrint(true)}>Print</Button>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader title={report.title} subtitle={report.desc} />
          <div className="h-72 p-3"><ResponsiveContainer width="100%" height="100%">{report.chart as React.ReactElement}</ResponsiveContainer></div>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Preview" subtitle={`${report.rows.length} rows${report.rows.length > 15 ? ' · showing first 15' : ''}`} />
          <div className="max-h-72 overflow-auto">{table()}</div>
        </Card>
      </div>
      <PrintPreviewModal open={print} onClose={() => setPrint(false)} paper="a4" title={`${report.title} report`} allowWidthToggle={false}>
        <div className="p-2 text-slate-900">
          <div className="mb-4 flex items-end justify-between border-b-2 border-slate-800 pb-3">
            <div><p className="text-[16px] font-bold">{ORG.name}</p><p className="text-[11px] text-slate-500">{ORG.legal} · {ORG.hq}</p></div>
            <div className="text-right"><p className="text-[14px] font-semibold">{report.title} report</p><p className="text-[11px] text-slate-500">{monthLabel(ym)} · generated {fmtDate(Date.now())}</p></div>
          </div>
          {table(true)}
          <p className="mt-6 text-[10px] text-slate-400">System generated report · RestroFlow Enterprise · Attendance verification in this prototype is simulated.</p>
        </div>
      </PrintPreviewModal>
    </div>
  )
}
