import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Store, Sparkles, BarChart3, Smartphone } from 'lucide-react'
import { Avatar, Button, Field, Input, Checkbox } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { DEMO_USER_IDS } from '@/data/people'
import { ORG } from '@/data/outlets'
import { toast } from '@/store/toast'
import { cn } from '@/lib/format'

/** Mock sign-in screen. Any password works — accounts come from the demo user list. */
export default function Login() {
  const users = useStore((s) => s.users)
  const roles = useStore((s) => s.roles)
  const loggedIn = useStore((s) => s.loggedIn)
  const login = useStore((s) => s.login)
  const nav = useNavigate()
  const demo = DEMO_USER_IDS.map((id) => users.find((u) => u.id === id)!).filter(Boolean)
  const [email, setEmail] = useState(demo[0]?.email ?? '')
  const [password, setPassword] = useState('demo@123')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (loggedIn !== false) return <Navigate to="/" replace />

  const signIn = (userEmail = email) => {
    const u = users.find((x) => x.email.toLowerCase() === userEmail.trim().toLowerCase())
    if (!u) return setError('No account found for this email. Pick a demo account below.')
    if (u.status !== 'Active') return setError('This account is deactivated. Contact your organization owner.')
    if (!password) return setError('Enter your password')
    setError('')
    setLoading(true)
    setTimeout(() => {
      login(u.id)
      toast.success(`Welcome back, ${u.name.split(' ')[0]}`, roles.find((r) => r.id === u.roleId)?.name)
      nav('/', { replace: true })
    }, 450)
  }

  return (
    <div className="flex min-h-full bg-white">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-navy-900 p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-brand-500/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} className="size-10" alt="" />
          <div className="leading-tight">
            <div className="text-[17px] font-semibold">RestroFlow</div>
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-brand-300">Enterprise</div>
          </div>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Run every outlet of {ORG.name} from one screen.</h1>
          <p className="mt-3 text-[14px] text-navy-200">Billing, kitchen, inventory, staff and reports — synced across all your restaurants in real time.</p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              [Store, '4 outlets', 'Consolidated view'],
              [BarChart3, '41 reports', 'Sales to payroll'],
              [Smartphone, 'Staff app', 'Orders & attendance'],
              [ShieldCheck, '10 roles', 'Granular permissions'],
            ].map(([Icon, t, s]) => {
              const I = Icon as typeof Store
              return (
                <div key={t as string} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <I className="size-4 text-brand-300" />
                  <p className="mt-2 text-[13px] font-semibold">{t as string}</p>
                  <p className="text-[11.5px] text-navy-300">{s as string}</p>
                </div>
              )
            })}
          </div>
        </div>
        <p className="relative text-[11.5px] text-navy-300">© {new Date().getFullYear()} {ORG.legal}</p>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[420px]">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} className="size-9" alt="" />
            <span className="text-[16px] font-semibold text-navy-900">RestroFlow Enterprise</span>
          </div>
          <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1 text-[13px] text-slate-500">Use your work email to access your outlets.</p>

          <form className="mt-6 space-y-3.5" onSubmit={(e) => { e.preventDefault(); signIn() }}>
            <Field label="Work email">
              <Input icon={<Mail />} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@grandkitchen.in" autoFocus />
            </Field>
            <Field label="Password">
              <div className="relative">
                <Input icon={<Lock />} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </Field>
            <div className="flex items-center justify-between">
              <Checkbox checked onChange={() => {}} label="Keep me signed in" />
              <button type="button" onClick={() => toast.info('Password reset is simulated in this demo')} className="text-[12.5px] font-medium text-brand-600 hover:underline">Forgot password?</button>
            </div>
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">{error}</p>}
            <Button type="submit" variant="primary" size="lg" block loading={loading} iconRight={<ArrowRight className="size-4" />}>Sign in</Button>
          </form>

          <div className="mt-7">
            <div className="mb-2.5 flex items-center gap-2 text-[11.5px] font-medium text-slate-500">
              <Sparkles className="size-3.5 text-amber-500" /> Demo accounts — click to sign in
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {demo.map((u) => {
                const r = roles.find((x) => x.id === u.roleId)
                return (
                  <button key={u.id} onClick={() => { setEmail(u.email); signIn(u.email) }}
                    className={cn('flex items-center gap-2.5 rounded-lg border border-slate-200 px-2.5 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50/40', email === u.email && 'border-brand-300 bg-brand-50/40')}>
                    <Avatar name={u.name} color={u.color} size={26} />
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-medium text-slate-800">{u.name}</span>
                      <span className="block truncate text-[11px]" style={{ color: r?.color }}>{r?.name}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mt-4 text-center text-[11px] text-slate-400">Prototype — any password works. No real authentication.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
