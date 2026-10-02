import { useNavigate } from 'react-router-dom'
import { Bell, Search, Keyboard, Store, ChevronDown, Check, Sparkles, Menu as MenuIcon, LogOut, UserCircle2, Lock, Maximize2 } from 'lucide-react'
import { Avatar, Badge, Dropdown, Kbd, IconButton } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { useCurrentUser, useRole, useScope } from '@/store/hooks'
import { DEMO_USER_IDS } from '@/data/people'
import { cn, timeAgo } from '@/lib/format'
import { useUI } from './uiStore'
import { toast } from '@/store/toast'

export function OutletSelector() {
  const outlets = useStore((s) => s.outlets)
  const setOutlet = useStore((s) => s.setOutlet)
  const { selected, allowed, canSwitch } = useScope()
  const current = outlets.find((o) => o.id === selected)
  const label = selected === 'all' ? 'All Outlets' : current?.short
  const sub = selected === 'all' ? `${allowed.length} outlets • consolidated` : current?.city + ' • ' + current?.code

  const trigger = (
    <button className={cn('flex h-9 items-center gap-2.5 rounded-lg border border-slate-200 bg-white pl-1.5 pr-2.5 text-left transition hover:border-slate-300', !canSwitch && 'cursor-default')}>
      <span className="flex size-6.5 items-center justify-center rounded-md text-white" style={{ background: current?.color ?? '#0f2a4a' }}><Store className="size-3.5" /></span>
      <span className="leading-tight">
        <span className="block text-[12.5px] font-semibold text-slate-900">{label}</span>
        <span className="block text-[10.5px] text-slate-500">{sub}</span>
      </span>
      {canSwitch ? <ChevronDown className="ml-1 size-3.5 text-slate-400" /> : <Lock className="ml-1 size-3 text-slate-300" />}
    </button>
  )
  if (!canSwitch) return <div title="You are assigned to this outlet only">{trigger}</div>
  return (
    <Dropdown trigger={trigger} align="left" width={300}>
      {(close) => (
        <div>
          <div className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Switch outlet</div>
          {[{ id: 'all', short: 'All Outlets', city: `${allowed.length} outlets`, color: '#0f2a4a', status: 'Open', code: 'ORG' }, ...outlets.filter((o) => allowed.includes(o.id))].map((o) => (
            <button key={o.id} onClick={() => { setOutlet(o.id); close(); toast.info(`Switched to ${o.short}`) }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50">
              <span className="flex size-7 items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ background: o.color }}>{o.id === 'all' ? <Store className="size-3.5" /> : o.code.split('-')[1]}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-slate-800">{o.short}</span>
                <span className="block text-[11px] text-slate-500">{o.city}</span>
              </span>
              {o.id !== 'all' && <span className="size-1.5 rounded-full bg-emerald-500" />}
              {selected === o.id && <Check className="size-4 text-brand-500" />}
            </button>
          ))}
        </div>
      )}
    </Dropdown>
  )
}

export function UserSwitcher() {
  const users = useStore((s) => s.users)
  const roles = useStore((s) => s.roles)
  const setUser = useStore((s) => s.setUser)
  const logout = useStore((s) => s.logout)
  const user = useCurrentUser()
  const role = useRole()
  const nav = useNavigate()
  return (
    <Dropdown width={300} trigger={
      <button className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-slate-100">
        <Avatar name={user.name} color={user.color} size={30} />
        <span className="hidden text-left leading-tight xl:block">
          <span className="block text-[12.5px] font-semibold text-slate-900">{user.name}</span>
          <span className="block text-[10.5px] font-medium" style={{ color: role.color }}>{role.name}</span>
        </span>
        <ChevronDown className="size-3.5 text-slate-400" />
      </button>
    }>
      {(close) => (
        <div>
          <div className="mb-1 flex items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11.5px] text-amber-800">
            <Sparkles className="size-3.5" /> Demo: switch user to preview role-based access
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {DEMO_USER_IDS.map((id) => users.find((u) => u.id === id)!).map((u) => {
              const r = roles.find((x) => x.id === u.roleId)!
              return (
                <button key={u.id} onClick={() => { setUser(u.id); close(); nav('/'); toast.success(`Signed in as ${u.name}`, r.name) }}
                  className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-slate-50', u.id === user.id && 'bg-brand-50/60')}>
                  <Avatar name={u.name} color={u.color} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-slate-800">{u.name}</span>
                    <span className="block truncate text-[11px]" style={{ color: r.color }}>{r.name}</span>
                  </span>
                  {u.id === user.id && <Check className="size-3.5 text-brand-500" />}
                </button>
              )
            })}
          </div>
          <div className="mt-1 border-t border-slate-100 pt-1">
            <button onClick={() => { close(); nav('/employees') }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] text-slate-600 hover:bg-slate-50"><UserCircle2 className="size-3.5" />My profile</button>
            <button onClick={() => { close(); logout(); nav('/login', { replace: true }); toast.info('Signed out', 'Pick any demo account to sign back in') }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] text-slate-600 hover:bg-slate-50"><LogOut className="size-3.5" />Sign out</button>
          </div>
        </div>
      )}
    </Dropdown>
  )
}

function Notifications() {
  const items = useStore((s) => s.notifications)
  const markRead = useStore((s) => s.markNotificationsRead)
  const nav = useNavigate()
  const unread = items.filter((n) => !n.read).length
  const ICON: Record<string, string> = { order: '🧾', stock: '📦', approval: '✅', attendance: '🕘', system: '⚙️' }
  return (
    <Dropdown width={340} trigger={
      <IconButton tooltip="Notifications" className="relative">
        <Bell className="size-4" />
        {unread > 0 && <span className="absolute right-1 top-1 flex size-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">{unread}</span>}
      </IconButton>
    }>
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <span className="text-[13px] font-semibold text-slate-900">Notifications</span>
            <button onClick={markRead} className="text-[11.5px] font-medium text-brand-600 hover:underline">Mark all read</button>
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {items.slice(0, 12).map((n) => (
              <button key={n.id} onClick={() => { close(); n.link && nav(n.link) }} className="flex w-full gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50">
                <span className="mt-0.5 text-[15px]">{ICON[n.type]}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-slate-800">{n.title}{!n.read && <span className="size-1.5 rounded-full bg-brand-500" />}</span>
                  <span className="block text-[11.5px] text-slate-500">{n.body}</span>
                  <span className="block text-[10.5px] text-slate-400">{timeAgo(n.at)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Dropdown>
  )
}

export function Topbar() {
  const setSearch = useUI((s) => s.setSearch)
  const setHelp = useUI((s) => s.setHelp)
  const setDemo = useUI((s) => s.setDemoPanel)
  const toggle = useStore((s) => s.toggleSidebar)
  const setPresentation = useStore((s) => s.setPresentation)
  const role = useRole()
  return (
    <header className="relative z-40 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
      <OutletSelector />
      <button onClick={() => setSearch(true)}
        className="ml-2 hidden h-9 w-full max-w-[380px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12.5px] text-slate-400 transition hover:border-slate-300 hover:bg-white xl:flex">
        <Search className="size-3.5" /> Search orders, items, tables, employees…
        <span className="ml-auto flex gap-0.5"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
      </button>
      <div className="ml-auto flex items-center gap-1">
        <IconButton tooltip="Search (Ctrl+K)" className="xl:hidden" onClick={() => setSearch(true)}><Search className="size-4" /></IconButton>
        {role.id === 'r_owner' && (
          <button onClick={() => setDemo(true)} className="mr-1 hidden items-center gap-1.5 sm:flex">
            <Badge tone="amber" dot className="cursor-pointer py-1 hover:bg-amber-100">Demo Mode</Badge>
          </button>
        )}
        <IconButton tooltip="Presentation mode" onClick={() => { setPresentation(true); document.documentElement.requestFullscreen?.().catch(() => {}) }}><Maximize2 className="size-4" /></IconButton>
        <IconButton tooltip="Keyboard shortcuts (F1)" onClick={() => setHelp(true)}><Keyboard className="size-4" /></IconButton>
        <Notifications />
        <div className="mx-1.5 h-6 w-px bg-slate-200" />
        <UserSwitcher />
      </div>
    </header>
  )
}
