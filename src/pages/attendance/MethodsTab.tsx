import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Info, Loader2, LogIn, LogOut, MapPin, ShieldAlert, Smartphone, Wifi, WifiOff } from 'lucide-react'
import type { AttStatus, Employee } from '@/types'
import { Avatar, Badge, Button, Card, CardHeader, Checkbox, ConfirmDialog, Segmented, Select, StatusBadge } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { usePermission, useScope } from '@/store/hooks'
import { toast } from '@/store/toast'
import { simulateCheckIn } from '@/lib/simulate'
import { cn, fmtDate, isoDate } from '@/lib/format'
import { fmtHours, hm12, shiftStartHM, workedHours } from './attUtils'

export function MethodsTab({ emps }: { emps: Employee[] }) {
  return (
    <div>
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
        <Info className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <div><b>Network detection is simulated in this prototype and is not real attendance verification.</b> In production, check-ins would be validated against device GPS geofences, the authorised outlet Wi-Fi (SSID/BSSID) and biometric terminals.</div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <MobileCard emps={emps} />
        <NetworkCard />
        <ManualCard emps={emps} />
      </div>
    </div>
  )
}

function MobileCard({ emps }: { emps: Employee[] }) {
  const attendance = useStore((s) => s.attendance)
  const checkIn = useStore((s) => s.checkIn)
  const checkOut = useStore((s) => s.checkOut)
  const { can } = usePermission()
  const [id, setId] = useState(emps.find((e) => e.department === 'Service')?.id ?? emps[0]?.id)
  const emp = emps.find((e) => e.id === id)
  const today = attendance.find((a) => a.employeeId === id && a.date === isoDate())
  const history = attendance.filter((a) => a.employeeId === id && a.date < isoDate()).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <Card className="flex flex-col">
      <CardHeader icon={<Smartphone className="size-3.5" />} title="Mobile attendance" subtitle="Staff app check-in with GPS geofence (simulated)" />
      <div className="flex-1 space-y-3 p-4">
        <Select value={id} onChange={(e) => setId(e.target.value)}>
          {emps.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.code}</option>)}
        </Select>
        {emp && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-center gap-2.5">
              <Avatar name={emp.name} color={emp.color} size={34} />
              <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold">{emp.name}</p><p className="text-[11.5px] text-slate-500">{emp.shift} shift · {emp.designation}</p></div>
              {today ? <StatusBadge status={today.status} /> : <Badge>Not marked</Badge>}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-500">
              <div className="rounded-lg bg-white p-2"><p>In</p><p className="text-[13px] font-semibold text-slate-800">{hm12(today?.checkIn)}</p></div>
              <div className="rounded-lg bg-white p-2"><p>Out</p><p className="text-[13px] font-semibold text-slate-800">{hm12(today?.checkOut)}</p></div>
              <div className="rounded-lg bg-white p-2"><p>Worked</p><p className="text-[13px] font-semibold text-slate-800">{fmtHours(workedHours(today))}</p></div>
            </div>
            <p className="mt-2 flex items-center gap-1 text-[11.5px] text-emerald-700"><MapPin className="size-3.5" />Inside outlet geofence · accuracy 12 m (simulated)</p>
            <div className="mt-3 flex gap-2">
              <Button variant="accent" className="flex-1" icon={<LogIn className="size-3.5" />} disabled={!can('attendance', 'create') || !!today?.checkIn}
                onClick={() => { checkIn(emp.id, 'Mobile'); toast.success(`${emp.name} checked in`, 'Mobile GPS (simulated)') }}>Check in</Button>
              <Button variant="outline" className="flex-1" icon={<LogOut className="size-3.5" />} disabled={!can('attendance', 'create') || !today?.checkIn || !!today.checkOut}
                onClick={() => { checkOut(emp.id); toast.success(`${emp.name} checked out`) }}>Check out</Button>
            </div>
          </div>
        )}
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Recent history</p>
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
            {history.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-3 py-1.5 text-[12px]">
                <span className="text-slate-600">{fmtDate(a.date)}</span>
                <span className="tabular text-slate-500">{a.checkIn ? `${hm12(a.checkIn)} – ${hm12(a.checkOut)}` : '—'}</span>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

type NetState = 'idle' | 'scanning' | 'connected' | 'no-permission' | 'offline' | 'wrong-network'
function NetworkCard() {
  const ssid = useStore((s) => s.settings.attendance.networkSSID)
  const allowNetwork = useStore((s) => s.settings.attendance.allowNetwork)
  const grace = useStore((s) => s.settings.attendance.graceMinutes)
  const log = useStore((s) => s.log)
  const { single } = useScope()
  const { can } = usePermission()
  const [cond, setCond] = useState<'normal' | 'permission' | 'offline' | 'wrong'>('normal')
  const [state, setState] = useState<NetState>('idle')
  const [verify, setVerify] = useState(false)

  const scan = () => {
    setState('scanning')
    setTimeout(() => setState(cond === 'normal' ? 'connected' : cond === 'permission' ? 'no-permission' : cond === 'offline' ? 'offline' : 'wrong-network'), 1800)
  }
  useEffect(() => { scan() }, [cond]) // eslint-disable-line react-hooks/exhaustive-deps

  const view = {
    idle: { icon: <Wifi className="size-7" />, tone: 'bg-slate-100 text-slate-500', title: 'Ready to scan', body: 'Tap scan to look for the outlet network' },
    scanning: { icon: <Loader2 className="size-7 animate-spin" />, tone: 'bg-sky-50 text-sky-600', title: 'Scanning network…', body: `Looking for authorised SSID “${ssid}”` },
    connected: { icon: <CheckCircle2 className="size-7" />, tone: 'bg-emerald-50 text-emerald-600', title: `Connected to ${ssid} ✓`, body: 'Authorised outlet network · signal −48 dBm · BSSID verified (simulated)' },
    'no-permission': { icon: <ShieldAlert className="size-7" />, tone: 'bg-amber-50 text-amber-600', title: 'Location permission denied', body: 'Wi-Fi details need location access on Android/iOS. Ask staff to enable it in phone settings.' },
    offline: { icon: <WifiOff className="size-7" />, tone: 'bg-rose-50 text-rose-600', title: 'No connectivity', body: 'Device is offline. Check-ins will be queued and synced when online.' },
    'wrong-network': { icon: <AlertTriangle className="size-7" />, tone: 'bg-orange-50 text-orange-600', title: 'Unrecognised network', body: `Connected to “JioFiber-4G” — not the authorised “${ssid}”.` },
  }[state]

  return (
    <Card className="flex flex-col">
      <CardHeader icon={<Wifi className="size-3.5" />} title="Network-based attendance" subtitle="Auto check-in when staff join outlet Wi-Fi (simulation)"
        actions={<Badge tone={allowNetwork ? 'green' : 'gray'} dot>{allowNetwork ? 'Enabled' : 'Disabled'}</Badge>} />
      <div className="flex-1 space-y-3 p-4">
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[12px]">
          <span className="text-slate-500">Authorised SSID</span><span className="font-mono font-semibold text-navy-800">{ssid}</span>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Simulate device condition</p>
          <Segmented size="sm" className="w-full" value={cond} onChange={setCond} items={[
            { value: 'normal', label: 'Normal' }, { value: 'permission', label: 'No permission' }, { value: 'offline', label: 'Offline' }, { value: 'wrong', label: 'Other Wi-Fi' },
          ]} />
        </div>
        <div className={cn('flex flex-col items-center rounded-xl px-4 py-5 text-center transition', view.tone)}>
          <div className="relative">
            {state === 'scanning' && <span className="absolute inset-0 animate-ping rounded-full bg-sky-300/50" />}
            <span className="relative">{view.icon}</span>
          </div>
          <p className="mt-2 text-[13.5px] font-semibold">{view.title}</p>
          <p className="mt-0.5 text-[11.5px] opacity-80">{view.body}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button icon={<Wifi className="size-3.5" />} onClick={scan} disabled={state === 'scanning'}>Rescan</Button>
          <Button variant="accent" icon={<LogIn className="size-3.5" />} disabled={state !== 'connected' || !can('attendance', 'create')} onClick={() => simulateCheckIn(single)}>Simulate auto check-in</Button>
        </div>
        {state !== 'connected' && state !== 'scanning' && (
          <Button variant="outline" block icon={<ClipboardCheck className="size-3.5" />} onClick={() => setVerify(true)}>Request manual verification</Button>
        )}
        <ul className="space-y-1 text-[11.5px] text-slate-500">
          <li>• Check-in triggers once per shift when device joins {ssid}</li>
          <li>• Late flag applied after {grace} min grace</li>
          <li>• Falls back to manager verification if detection fails</li>
        </ul>
      </div>
      <ConfirmDialog open={verify} onClose={() => setVerify(false)} title="Send for manager verification?" confirmLabel="Send request"
        body="The outlet manager will verify the staff member's presence and approve the attendance manually."
        onConfirm={() => { log('Manual attendance verification requested (network detection failed)', 'attendance', 'warning', single); toast.info('Verification requested', 'Outlet manager notified') }} />
    </Card>
  )
}

function ManualCard({ emps }: { emps: Employee[] }) {
  const attendance = useStore((s) => s.attendance)
  const upsertAttendance = useStore((s) => s.upsertAttendance)
  const log = useStore((s) => s.log)
  const { can } = usePermission()
  const date = isoDate()
  const pending = useMemo(() => emps.filter((e) => !attendance.some((a) => a.employeeId === e.id && a.date === date)), [emps, attendance, date])
  const [sel, setSel] = useState<string[]>([])
  const [status, setStatus] = useState<AttStatus>('Present')
  const all = pending.length > 0 && sel.length === pending.length

  const apply = () => {
    const list = pending.filter((e) => sel.includes(e.id))
    list.forEach((e) => upsertAttendance({ id: `att_${e.id}_${date}`, employeeId: e.id, date, status, method: 'Manual', checkIn: status === 'Present' || status === 'Late' ? shiftStartHM(e.shift) : undefined, remarks: 'Bulk marked by manager' }))
    log(`Bulk marked ${list.length} employees as ${status}`, 'attendance', 'success')
    toast.success(`${list.length} employees marked ${status}`)
    setSel([])
  }

  return (
    <Card className="flex flex-col">
      <CardHeader icon={<ClipboardCheck className="size-3.5" />} title="Manual attendance" subtitle="Bulk mark staff not yet recorded today" actions={<Badge tone="amber">{pending.length} pending</Badge>} />
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center justify-between">
          <Checkbox checked={all} indeterminate={sel.length > 0 && !all} onChange={(v) => setSel(v ? pending.map((e) => e.id) : [])} label={<span className="text-[12px]">Select all</span>} />
          <span className="text-[11.5px] text-slate-500">{sel.length} selected</span>
        </div>
        <div className="max-h-64 flex-1 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100">
          {pending.length === 0 && <p className="p-4 text-center text-[12.5px] text-slate-500">Everyone is marked for today 🎉</p>}
          {pending.map((e) => (
            <div key={e.id} className="flex items-center gap-2.5 px-3 py-2">
              <Checkbox checked={sel.includes(e.id)} onChange={(v) => setSel((s) => (v ? [...s, e.id] : s.filter((x) => x !== e.id)))} />
              <Avatar name={e.name} color={e.color} size={24} />
              <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-medium">{e.name}</p><p className="text-[11px] text-slate-500">{e.code} · {e.shift}</p></div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value as AttStatus)} className="flex-1">
            {(['Present', 'Late', 'Half Day', 'Absent', 'Leave', 'Weekly Off'] as AttStatus[]).map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Button variant="primary" disabled={!sel.length || !can('attendance', 'create')} onClick={apply}>Mark selected</Button>
        </div>
      </div>
    </Card>
  )
}
