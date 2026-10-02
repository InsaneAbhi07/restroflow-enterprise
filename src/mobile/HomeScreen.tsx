import { useMemo } from 'react'
import { Bell, CalendarCheck2, ChefHat, Clock, FileText, LayoutGrid, LogIn, LogOut, MapPin, Plus, Store, Utensils } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { isToday } from '@/store/hooks'
import { cn, isoDate, timeAgo } from '@/lib/format'
import { Avatar } from '@/components/ui'
import { SHIFT_LABEL, fmtHours, hm12, workedHours } from '@/pages/attendance/attUtils'
import { liveStatus, useMe, useMobile, useMyOrders } from './ctx'
import { MCard, SectionTitle } from './ui'

export function HomeScreen() {
  const { emp, outlet, role } = useMe()
  const m = useMobile()
  const tables = useStore((s) => s.tables)
  const kots = useStore((s) => s.kots)
  const attendance = useStore((s) => s.attendance)
  const notifications = useStore((s) => s.notifications)
  const checkIn = useStore((s) => s.checkIn)
  const checkOut = useStore((s) => s.checkOut)
  const myOrders = useMyOrders()
  const outletId = emp?.outletId
  const alerts = useMemo(() => {
    const ready = kots
      .filter((k) => k.outletId === outletId && k.status === 'Ready')
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 4)
      .map((k) => ({ id: k.id, icon: ChefHat, tone: 'bg-emerald-100 text-emerald-700', title: `KOT ${k.no} ready for ${k.tableLabel}`, body: `${k.items.length} item${k.items.length > 1 ? 's' : ''} · pick up from kitchen`, at: k.updatedAt, orderId: k.orderId as string | undefined }))
    const general = notifications.filter((n) => n.type === 'order' || n.type === 'attendance').slice(0, 3)
      .map((n) => ({ id: n.id, icon: Bell, tone: 'bg-sky-100 text-sky-700', title: n.title, body: n.body, at: n.at, orderId: undefined as string | undefined }))
    return [...ready, ...general].slice(0, 5)
  }, [kots, notifications, outletId])
  if (!emp) return null

  const today = attendance.find((a) => a.employeeId === emp.id && a.date === isoDate())
  const checkedIn = !!today?.checkIn
  const checkedOut = !!today?.checkOut
  const myTables = tables.filter((t) => t.outletId === emp.outletId && t.waiterId === emp.id && (t.status === 'Occupied' || t.status === 'Billing'))
  const pending = myOrders.filter((o) => o.status === 'Running' || o.status === 'Billed')
  const completed = myOrders.filter((o) => o.status === 'Settled' && isToday(o.settledAt))
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const doAttendance = () => {
    if (!checkedIn) { checkIn(emp.id, 'Mobile'); m.snack('Checked in · Mobile GPS (simulated)') }
    else if (!checkedOut) { checkOut(emp.id); m.snack('Checked out. Have a great evening!') }
    else m.setTab('attendance')
  }

  const actions = [
    { label: 'New order', icon: Plus, tone: 'bg-brand-500 text-white', on: () => m.setTab('tables') },
    { label: 'My tables', icon: LayoutGrid, tone: 'bg-navy-900 text-white', on: () => m.setTab('tables') },
    { label: checkedIn && !checkedOut ? 'Check out' : 'Check in', icon: checkedIn && !checkedOut ? LogOut : LogIn, tone: 'bg-amber-500 text-white', on: doAttendance },
    { label: 'Salary slip', icon: FileText, tone: 'bg-violet-600 text-white', on: () => m.push({ kind: 'salary' }) },
  ]

  return (
    <div>
      <div className="bg-gradient-to-b from-navy-900 to-navy-800 px-5 pb-16 pt-3 text-white">
        <div className="flex items-center gap-3">
          <Avatar name={emp.name} color={emp.color} size={46} className="ring-2 ring-white/30" />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] text-navy-200">{greet},</p>
            <p className="truncate text-[19px] font-bold leading-tight">{emp.name.split(' ')[0]} 👋</p>
          </div>
          <button onClick={() => m.setTab('orders')} className="relative flex size-10 items-center justify-center rounded-full bg-white/10 active:bg-white/20">
            <Bell className="size-5" />
            {alerts.length > 0 && <span className="absolute right-2 top-2 size-2.5 rounded-full bg-rose-500 ring-2 ring-navy-900" />}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1"><Store className="size-3.5" />{outlet?.short}</span>
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1"><Clock className="size-3.5" />{emp.shift} · {SHIFT_LABEL[emp.shift]}</span>
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">{role?.name ?? emp.designation}</span>
        </div>
      </div>

      <div className="-mt-11 px-4">
        <MCard className="shadow-lg shadow-slate-900/5">
          <div className="flex items-center gap-3">
            <span className={cn('flex size-12 items-center justify-center rounded-2xl', checkedIn ? (checkedOut ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-600') : 'bg-amber-100 text-amber-600')}>
              <CalendarCheck2 className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-slate-500">Today's attendance</p>
              <p className="text-[15px] font-bold text-slate-900">
                {checkedIn ? (checkedOut ? 'Shift completed' : `Checked in · ${hm12(today?.checkIn)}`) : today?.status === 'Leave' || today?.status === 'Weekly Off' ? today.status : 'Not checked in'}
              </p>
              <p className="text-[12px] text-slate-500">
                {checkedIn ? `${today?.status} · worked ${fmtHours(workedHours(today))}` : <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{outlet?.short} · GPS ready (simulated)</span>}
              </p>
            </div>
          </div>
          {!checkedOut && (
            <button onClick={doAttendance} className={cn('mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-white transition active:scale-[.98]', checkedIn ? 'bg-rose-600' : 'bg-brand-500 shadow-lg shadow-brand-500/25')}>
              {checkedIn ? <LogOut className="size-5" /> : <LogIn className="size-5" />}{checkedIn ? 'Check out' : 'Check in now'}
            </button>
          )}
        </MCard>

        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {[
            { label: 'Assigned tables', value: myTables.length, on: () => m.setTab('tables'), tone: 'text-navy-900' },
            { label: 'Pending orders', value: pending.length, on: () => m.setTab('orders'), tone: 'text-amber-600' },
            { label: 'Completed today', value: completed.length, on: () => m.setTab('orders'), tone: 'text-emerald-600' },
          ].map((s) => (
            <button key={s.label} onClick={s.on} className="rounded-2xl border border-slate-200/70 bg-white p-3 text-left shadow-sm active:scale-95">
              <p className={cn('text-[24px] font-bold leading-none tabular', s.tone)}>{s.value}</p>
              <p className="mt-1.5 text-[11px] font-medium leading-tight text-slate-500">{s.label}</p>
            </button>
          ))}
        </div>

        <SectionTitle>Quick actions</SectionTitle>
        <div className="grid grid-cols-4 gap-2">
          {actions.map((a) => (
            <button key={a.label} onClick={a.on} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200/70 active:scale-95">
              <span className={cn('flex size-11 items-center justify-center rounded-2xl', a.tone)}><a.icon className="size-5" /></span>
              <span className="text-center text-[11px] font-semibold leading-tight text-slate-700">{a.label}</span>
            </button>
          ))}
        </div>

        {pending.length > 0 && (
          <>
            <SectionTitle action={<button onClick={() => m.setTab('orders')} className="text-[12px] font-semibold text-brand-600">See all</button>}>Running orders</SectionTitle>
            <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 no-scrollbar">
              {pending.slice(0, 6).map((o) => {
                const st = liveStatus(o, kots)
                return (
                  <button key={o.id} onClick={() => m.push({ kind: 'order', orderId: o.id })} className="w-36 shrink-0 rounded-2xl border border-slate-200/70 bg-white p-3 text-left shadow-sm active:scale-95">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[15px] font-bold"><Utensils className="size-3.5 text-slate-400" />{o.tableLabel}</span>
                      <span className={cn('size-2 rounded-full', st === 'Ready' ? 'bg-emerald-500' : st === 'Preparing' ? 'bg-amber-500' : st === 'New' ? 'bg-sky-500' : 'bg-slate-400')} />
                    </div>
                    <p className="mt-1 text-[11.5px] text-slate-500">{o.items.length} items · {timeAgo(o.createdAt)}</p>
                    <p className="mt-1 text-[12px] font-semibold text-slate-700">{o.status === 'Billed' ? 'Bill requested' : st}</p>
                  </button>
                )
              })}
            </div>
          </>
        )}

        <SectionTitle>Notifications</SectionTitle>
        <MCard className="divide-y divide-slate-100 p-0">
          {alerts.length === 0 && <p className="p-4 text-center text-[13px] text-slate-500">You're all caught up 🎉</p>}
          {alerts.map((a) => (
            <button key={a.id} onClick={() => a.orderId && m.push({ kind: 'order', orderId: a.orderId })} className="flex w-full items-start gap-3 px-4 py-3 text-left active:bg-slate-50">
              <span className={cn('mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl', a.tone)}><a.icon className="size-4.5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-slate-900">{a.title}</p>
                <p className="truncate text-[12px] text-slate-500">{a.body}</p>
              </div>
              <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(a.at)}</span>
            </button>
          ))}
        </MCard>
        <div className="h-4" />
      </div>
    </div>
  )
}
