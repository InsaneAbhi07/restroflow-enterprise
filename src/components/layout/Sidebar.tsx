import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronsLeft, Smartphone, Presentation } from 'lucide-react'
import { NAV } from './nav'
import { DynIcon } from '@/components/ui'
import { cn } from '@/lib/format'
import { useStore } from '@/store/useStore'
import { usePermission, useScope } from '@/store/hooks'
import { useUI } from './uiStore'

export function Sidebar() {
  const userCollapsed = useStore((s) => s.sidebarCollapsed)
  const width = useWindowWidth()
  const { pathname } = useLocation()
  const denseScreen = pathname.startsWith('/pos') || pathname.startsWith('/kot')
  // auto-collapse on tablets, and on the full-bleed POS/KOT screens below large desktops
  const collapsed = userCollapsed || width < 1280 || (denseScreen && width < 1600)
  const toggle = useStore((s) => s.toggleSidebar)
  const { can, role } = usePermission()
  const { outletIds } = useScope()
  const kots = useStore((s) => s.kots)
  const approvals = useStore((s) => s.approvals)
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const openMobile = useUI((s) => s.setMobilePreview)
  const setScenarios = useUI((s) => s.setScenarios)

  const badge = (b?: string) => {
    if (b === 'kot') return kots.filter((k) => outletIds.includes(k.outletId) && (k.status === 'New' || k.status === 'Preparing')).length
    if (b === 'approvals') return approvals.filter((a) => a.status === 'Pending').length
    return 0
  }

  return (
    <aside className={cn('flex h-full shrink-0 flex-col border-r border-navy-950 bg-navy-900 text-navy-100 transition-[width] duration-200', collapsed ? 'w-[60px]' : 'w-[232px]')}>
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-white/5 px-3.5">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} className="size-8 shrink-0" alt="" />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[14px] font-semibold text-white">RestroFlow</div>
            <div className="truncate text-[10.5px] font-medium uppercase tracking-[0.12em] text-brand-300">Enterprise</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 no-scrollbar">
        {NAV.map((g) => {
          const items = g.items.filter((i) => can(i.module))
          if (!items.length) return null
          const isClosed = closed[g.label]
          return (
            <div key={g.label} className="mb-2">
              {!collapsed ? (
                <button onClick={() => setClosed((c) => ({ ...c, [g.label]: !c[g.label] }))}
                  className="flex w-full items-center justify-between px-2 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-navy-300/70 hover:text-navy-200">
                  {g.label}
                  <ChevronDown className={cn('size-3 transition', isClosed && '-rotate-90')} />
                </button>
              ) : <div className="mx-3 my-2 h-px bg-white/5" />}
              {!isClosed && items.map((it) => {
                const count = badge(it.badge)
                return (
                  <NavLink key={it.to} to={it.to} end={it.to === '/' || it.to === '/inventory' || it.to === '/users'} title={collapsed ? it.label : undefined}
                    className={({ isActive }) => cn('group relative mb-0.5 flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition',
                      isActive ? 'bg-white/10 text-white' : 'text-navy-200/80 hover:bg-white/5 hover:text-white')}>
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute -left-2 top-1.5 h-5 w-1 rounded-r bg-brand-400" />}
                        <DynIcon name={it.icon} className={cn('size-4 shrink-0', isActive ? 'text-brand-300' : 'text-navy-300 group-hover:text-navy-100')} />
                        {!collapsed && <span className="flex-1 truncate">{it.label}</span>}
                        {count > 0 && (
                          <span className={cn('flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold text-white', collapsed && 'absolute right-1 top-0.5')}>{count}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div className="space-y-1 border-t border-white/5 p-2">
        <button onClick={() => openMobile(true)} title="Staff Mobile App"
          className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-navy-200/80 hover:bg-white/5 hover:text-white">
          <Smartphone className="size-4 shrink-0 text-brand-300" />{!collapsed && 'Staff Mobile App'}
        </button>
        {role.id === 'r_owner' && (
          <button onClick={() => setScenarios(true)} title="Demo Scenarios"
            className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-navy-200/80 hover:bg-white/5 hover:text-white">
            <Presentation className="size-4 shrink-0 text-amber-300" />{!collapsed && 'Demo Scenarios'}
          </button>
        )}
        <button onClick={toggle} className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[12px] text-navy-300 hover:bg-white/5 hover:text-white">
          <ChevronsLeft className={cn('size-4 shrink-0 transition', collapsed && 'rotate-180')} />{!collapsed && 'Collapse'}
        </button>
      </div>
    </aside>
  )
}

function useWindowWidth() {
  const [w, setW] = useState(() => window.innerWidth)
  useEffect(() => {
    const on = () => setW(window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return w
}
