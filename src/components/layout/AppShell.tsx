import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { AccessDenied, DemoPanel, GlobalSearch, MobilePreviewModal, PresentationBar, ShortcutHelp, Toaster } from './Overlays'
import { useUI } from './uiStore'
import { ALL_NAV, moduleForPath } from './nav'
import { usePermission } from '@/store/hooks'
import { useStore } from '@/store/useStore'
import { emitShortcut, isTypingTarget, popEsc, hasOpenOverlay } from '@/lib/shortcuts'
import { toast } from '@/store/toast'
import { cn } from '@/lib/format'
import DemoScenarios from '@/pages/demo/DemoScenarios'

/** Global keyboard map → named shortcut events */
function useGlobalKeys() {
  const nav = useNavigate()
  const { can } = usePermission()
  const ui = useUI()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = isTypingTarget(e.target)
      const k = e.key
      if (k === 'Escape') {
        if (popEsc()) { e.preventDefault(); return }
        if (typing) (e.target as HTMLElement).blur()
        return
      }
      if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'k') { e.preventDefault(); ui.setSearch(true); return }
      if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'b') {
        e.preventDefault()
        if (!can('pos', 'create')) return void toast.error('No permission to create bills')
        nav('/pos?new=1')
        return
      }
      if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 's') { e.preventDefault(); if (!emitShortcut('save')) toast.info('Nothing to save on this screen'); return }
      if (e.altKey && k === 'ArrowLeft') { e.preventDefault(); nav(-1); return }
      if (e.altKey && k === 'ArrowRight') { e.preventDefault(); nav(1); return }
      if (k === 'F1') { e.preventDefault(); ui.setHelp(true); return }
      if (k === 'F2') { e.preventDefault(); if (!emitShortcut('focusSearch')) { nav('/pos'); setTimeout(() => emitShortcut('focusSearch'), 150) } return }
      if (k === 'F4') { e.preventDefault(); if (!emitShortcut('settle')) toast.info('Open a bill in POS to settle (F4)'); return }
      if (k === 'F8') { e.preventDefault(); if (!emitShortcut('print')) toast.info('Nothing to print on this screen'); return }
      if (k === 'F9') { e.preventDefault(); if (!emitShortcut('kot')) toast.info('Open an order in POS to generate KOT (F9)'); return }
      if (k === 'Enter' && !typing && !e.ctrlKey && !e.altKey) {
        const t = e.target as HTMLElement
        if (t?.tagName === 'BUTTON' || t?.tagName === 'A') return // let the focused control handle it
        if (emitShortcut('enter')) e.preventDefault()
      }
      void hasOpenOverlay
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav, can, ui])
}

export function AppShell() {
  const loggedIn = useStore((s) => s.loggedIn)
  if (loggedIn === false) return <Navigate to="/login" replace />
  return <Shell />
}

function Shell() {
  useGlobalKeys()
  const loc = useLocation()
  const { can } = usePermission()
  const presentation = useStore((s) => s.presentation)
  const mod = moduleForPath(loc.pathname)
  const allowed = !mod || can(mod)
  const label = ALL_NAV.find((n) => n.module === mod)?.label
  const fullBleed = loc.pathname.startsWith('/pos') || loc.pathname.startsWith('/kot')

  return (
    <div className="flex h-full overflow-hidden">
      {!presentation && <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className={cn('min-h-0 flex-1 overflow-y-auto', !fullBleed && 'p-4 lg:p-5')}>
          <div key={loc.pathname} className={cn('page-enter', fullBleed && 'h-full')}>
            {allowed ? <Outlet /> : <AccessDenied module={label} />}
          </div>
        </main>
      </div>
      <GlobalSearch />
      <ShortcutHelp />
      <DemoPanel />
      <MobilePreviewModal />
      <DemoScenarios />
      <PresentationBar />
      <Toaster />
    </div>
  )
}
