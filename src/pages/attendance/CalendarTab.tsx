import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Employee } from '@/types'
import { Avatar, Button, Card, CardHeader, Select, StatusBadge } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { cn, fmtDate, isoDate, monthLabel } from '@/lib/format'
import { ATT_COLOR, ATT_STATUSES, AttLegend, MonthCalendar, fmtHours, hm12, shiftMonth, summarize, workedHours } from './attUtils'

export function CalendarTab({ emps }: { emps: Employee[] }) {
  const attendance = useStore((s) => s.attendance)
  const [ym, setYm] = useState(isoDate().slice(0, 7))
  const [empId, setEmpId] = useState('all')
  const [picked, setPicked] = useState<string | undefined>()
  const emp = emps.find((e) => e.id === empId)
  const ids = useMemo(() => new Set(emps.map((e) => e.id)), [emps])
  const monthRecs = useMemo(() => attendance.filter((a) => a.date.startsWith(ym) && (emp ? a.employeeId === emp.id : ids.has(a.employeeId))), [attendance, ym, emp, ids])
  const sum = summarize(monthRecs)
  const curYm = isoDate().slice(0, 7)

  const heat = (d: string) => {
    const recs = monthRecs.filter((a) => a.date === d)
    const s = summarize(recs)
    return recs.length ? s.pct : null
  }
  const dayRecs = picked ? monthRecs.filter((a) => a.date === picked) : []

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader title={emp ? `${emp.name} · ${monthLabel(ym)}` : `Team presence heatmap · ${monthLabel(ym)}`}
          subtitle={emp ? `${emp.code} · ${emp.designation}` : 'Each day shows % of scheduled staff present (late & half day weighted)'}
          actions={<>
            <Select value={empId} onChange={(e) => { setEmpId(e.target.value); setPicked(undefined) }} className="w-52">
              <option value="all">All employees (heatmap)</option>
              {emps.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.code}</option>)}
            </Select>
            <Button size="sm" variant="outline" icon={<ChevronLeft className="size-3.5" />} onClick={() => setYm(shiftMonth(ym, -1))} />
            <Button size="sm" variant="outline" icon={<ChevronRight className="size-3.5" />} disabled={ym >= curYm} onClick={() => setYm(shiftMonth(ym, 1))} />
          </>} />
        <div className="p-4">
          {emp
            ? <MonthCalendar ym={ym} statusOf={(d) => monthRecs.find((a) => a.date === d)?.status} onPick={setPicked} selected={picked} />
            : <MonthCalendar ym={ym} heat={heat} onPick={setPicked} selected={picked} />}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            {emp ? <AttLegend /> : (
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>0%</span><span className="h-2.5 w-40 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(20,168,145,.15), rgba(20,168,145,1))' }} /><span>100%</span>
              </div>
            )}
            <span className="text-[11.5px] text-slate-400">Click a day for details</span>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Month summary" subtitle={emp ? 'Days by status' : `${emps.length} employees · employee-days`} />
          <div className="space-y-2 p-4">
            {ATT_STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-2 text-[12.5px]">
                <span className={cn('size-3 rounded-sm', ATT_COLOR[s].bg)} />
                <span className="flex-1 text-slate-600">{s}</span>
                <span className="font-semibold text-slate-800 tabular">{sum[s]}</span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[13px]">
              <span className="text-slate-500">Attendance rate</span><span className="font-semibold text-brand-700">{sum.pct.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-[13px]"><span className="text-slate-500">Overtime</span><span className="font-semibold">{sum.ot.toFixed(1)} h</span></div>
          </div>
        </Card>
        {picked && (
          <Card className="animate-slide-up">
            <CardHeader title={fmtDate(picked)} subtitle={emp ? 'Day record' : `${dayRecs.length} records`} />
            <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {dayRecs.length === 0 && <p className="p-4 text-[12.5px] text-slate-500">No attendance recorded.</p>}
              {dayRecs.map((a) => {
                const e = emps.find((x) => x.id === a.employeeId)!
                return (
                  <div key={a.id} className="flex items-center gap-2.5 px-4 py-2">
                    <Avatar name={e.name} color={e.color} size={24} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-slate-800">{e.name}</p>
                      <p className="text-[11px] text-slate-500">{a.checkIn ? `${hm12(a.checkIn)} – ${hm12(a.checkOut)} · ${fmtHours(workedHours(a))}` : a.remarks ?? '—'}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
