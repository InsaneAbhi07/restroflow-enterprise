import { useState } from 'react'
import { ChefHat, Delete, IdCard, Lock, ShieldCheck } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/format'
import { Avatar } from '@/components/ui'

const DEMO = [
  { userId: 'u5', name: 'Rohit Kumar', role: 'Waiter', pin: '5555' },
  { userId: 'u14', name: 'Arjun Nair', role: 'Waiter', pin: '1414' },
  { userId: 'u3', name: 'Amit Verma', role: 'Manager', pin: '3333' },
  { userId: 'u4', name: 'Neha Gupta', role: 'Cashier', pin: '4444' },
]

export function Login() {
  const users = useStore((s) => s.users)
  const employees = useStore((s) => s.employees)
  const setMobileUser = useStore((s) => s.setMobileUser)
  const log = useStore((s) => s.log)
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(0)
  const [loading, setLoading] = useState(false)

  const fail = (msg: string) => {
    setError(msg)
    setShake((s) => s + 1)
    setPin('')
  }

  const attempt = (c: string, p: string) => {
    const q = c.trim().toLowerCase()
    if (!q) return fail('Enter your Employee ID')
    if (p.length < 4) return fail('Enter your 4-digit PIN')
    const emp = employees.find((e) => e.code.toLowerCase() === q || e.id === q || e.name.toLowerCase() === q)
    const user = users.find((u) => (emp && u.employeeId === emp.id) || u.id === q)
    if (!user) return fail('Employee ID not found')
    if (user.status !== 'Active') return fail('Account inactive — contact your manager')
    if (user.pin !== p) return fail('Incorrect PIN. Please try again.')
    setError('')
    setLoading(true)
    setTimeout(() => {
      setMobileUser(user.id)
      log(`${user.name} signed in to Staff App`, 'attendance', 'info', user.outletIds[0])
    }, 450)
  }

  const press = (k: string) => {
    setError('')
    if (k === 'del') setPin((p) => p.slice(0, -1))
    else if (pin.length < 4) setPin((p) => p + k)
  }

  const demo = (d: (typeof DEMO)[number]) => {
    const u = users.find((x) => x.id === d.userId)
    const e = employees.find((x) => x.id === u?.employeeId)
    const c = e?.code ?? d.userId
    setCode(c)
    setPin(d.pin)
    setError('')
    setTimeout(() => attempt(c, d.pin), 300)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto no-scrollbar">
      <div className="relative bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 px-6 pb-14 pt-6 text-white">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-500 shadow-lg shadow-brand-500/30"><ChefHat className="size-6" /></span>
          <div>
            <p className="text-[18px] font-bold leading-tight">RestroFlow Staff</p>
            <p className="text-[12px] text-navy-200">The Grand Kitchen</p>
          </div>
        </div>
        <p className="mt-6 text-[22px] font-bold leading-tight">Welcome back 👋</p>
        <p className="mt-1 text-[13px] text-navy-200">Sign in with your Employee ID and PIN</p>
      </div>

      <div className="-mt-8 flex-1 rounded-t-[28px] bg-slate-50 px-5 pb-6 pt-5">
        <div key={shake} className={cn(shake > 0 && 'm-shake')}>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-slate-500">Employee ID</span>
            <div className={cn('flex h-12 items-center gap-2 rounded-2xl border bg-white px-4', error && !pin ? 'border-rose-300' : 'border-slate-200')}>
              <IdCard className="size-5 text-slate-400" />
              <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }} placeholder="e.g. GK1005"
                className="h-full w-full bg-transparent text-[16px] font-semibold tracking-wide text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400" />
            </div>
          </label>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-slate-500"><Lock className="size-3.5" />PIN</div>
          <div className="mt-2 flex justify-center gap-4">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn('size-4 rounded-full border-2 transition', i < pin.length ? (error ? 'border-rose-500 bg-rose-500' : 'scale-110 border-navy-900 bg-navy-900') : 'border-slate-300')} />
            ))}
          </div>
          <p className={cn('mt-2 h-4 text-center text-[12px] font-medium text-rose-600')}>{error}</p>
        </div>

        <div className="mx-auto mt-2 grid max-w-[280px] grid-cols-3 gap-x-5 gap-y-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) =>
            k === '' ? <span key={i} /> : (
              <button key={i} onClick={() => press(k)}
                className={cn('mx-auto flex size-[62px] items-center justify-center rounded-full text-[24px] font-semibold transition active:scale-90',
                  k === 'del' ? 'text-slate-500 active:bg-slate-200' : 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 active:bg-slate-100')}>
                {k === 'del' ? <Delete className="size-6" /> : k}
              </button>
            ))}
        </div>

        <button onClick={() => attempt(code, pin)} disabled={loading}
          className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-navy-900 py-3.5 text-[16px] font-semibold text-white shadow-lg shadow-navy-900/25 transition active:scale-[.98] disabled:opacity-70">
          {loading ? <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <ShieldCheck className="size-5" />}
          {loading ? 'Signing in…' : 'Login'}
        </button>

        <p className="mb-2 mt-6 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">Demo logins · tap to sign in</p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO.map((d) => (
            <button key={d.userId} onClick={() => demo(d)} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 text-left transition active:scale-95">
              <Avatar name={d.name} size={32} color={users.find((u) => u.id === d.userId)?.color} />
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold text-slate-800">{d.name}</p>
                <p className="text-[11px] text-slate-500">{d.role} · PIN {d.pin}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
