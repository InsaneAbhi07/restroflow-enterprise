import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarCheck2, CheckCircle2, ClipboardList, Home, Info, LayoutGrid, UserRound, XCircle } from 'lucide-react'
import type { OrderItem } from '@/types'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/format'
import { MobileCtx, useMe, type MobileApi, type StackScreen, type Tab } from './ctx'
import { MOBILE_CSS, StatusBar } from './ui'
import { Login } from './Login'
import { HomeScreen } from './HomeScreen'
import { TablesScreen } from './TablesScreen'
import { MenuScreen, CartScreen, SuccessScreen } from './OrderFlow'
import { OrdersScreen, OrderDetailScreen } from './OrdersScreen'
import { AttendanceScreen } from './AttendanceScreen'
import { ProfileScreen, SalarySlipScreen } from './ProfileScreen'

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'tables', label: 'Tables', icon: LayoutGrid },
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck2 },
  { id: 'profile', label: 'Profile', icon: UserRound },
]

export default function StaffApp({ embedded }: { embedded?: boolean }) {
  const mobileUserId = useStore((s) => s.mobileUserId)
  const { user, emp } = useMe()
  const [tab, setTabState] = useState<Tab>('home')
  const [stack, setStack] = useState<StackScreen[]>([])
  const [cart, setCartState] = useState<OrderItem[]>([])
  const [sheetNode, setSheetNode] = useState<React.ReactNode | null>(null)
  const [snackState, setSnackState] = useState<{ id: number; text: string; tone: 'success' | 'error' | 'info' } | null>(null)
  const snackTimer = useRef<number>(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // reset navigation when user changes (login / logout)
  useEffect(() => { setTabState('home'); setStack([]); setCartState([]); setSheetNode(null) }, [mobileUserId])

  const snack = useCallback((text: string, tone: 'success' | 'error' | 'info' = 'success') => {
    window.clearTimeout(snackTimer.current)
    setSnackState({ id: Date.now(), text, tone })
    snackTimer.current = window.setTimeout(() => setSnackState(null), 2600)
  }, [])

  const api: MobileApi = useMemo(() => ({
    tab,
    setTab: (t) => { setTabState(t); setStack([]); setSheetNode(null); scrollRef.current?.scrollTo({ top: 0 }) },
    stack,
    push: (s) => { setSheetNode(null); setStack((st) => [...st, s]) },
    pop: () => setStack((st) => st.slice(0, -1)),
    reset: (s) => { setSheetNode(null); setStack(s ? [s] : []) },
    cart,
    setCart: (fn) => setCartState(fn),
    snack,
    sheet: (n) => setSheetNode(n),
  }), [tab, stack, cart, snack])

  const top = stack[stack.length - 1]
  const loggedIn = !!user && !!emp

  return (
    <MobileCtx.Provider value={api}>
      <style>{MOBILE_CSS}</style>
      <div className={cn('relative mx-auto flex h-full w-full flex-col overflow-hidden text-slate-900 antialiased select-none', loggedIn ? 'bg-slate-50' : 'bg-navy-900', !embedded && 'max-w-[430px]')}
        style={{ fontSize: 14 }}>
        <StatusBar dark={!loggedIn} />
        {!loggedIn ? (
          <div className="min-h-0 flex-1"><Login /></div>
        ) : (
          <>
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-24 no-scrollbar">
              <div key={tab} className="animate-fade-in">
                {tab === 'home' && <HomeScreen />}
                {tab === 'tables' && <TablesScreen />}
                {tab === 'orders' && <OrdersScreen />}
                {tab === 'attendance' && <AttendanceScreen />}
                {tab === 'profile' && <ProfileScreen />}
              </div>
            </div>

            {/* bottom navigation */}
            <nav className="absolute inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 px-2 pb-5 pt-1.5 backdrop-blur">
              <div className="flex items-stretch justify-between">
                {TABS.map((t) => {
                  const active = tab === t.id && !top
                  return (
                    <button key={t.id} onClick={() => api.setTab(t.id)} className="flex flex-1 flex-col items-center gap-0.5 py-1">
                      <span className={cn('flex h-8 w-14 items-center justify-center rounded-full transition-all', active ? 'bg-navy-900 text-white' : 'text-slate-400')}>
                        <t.icon className="size-[19px]" strokeWidth={active ? 2.4 : 2} />
                      </span>
                      <span className={cn('text-[10.5px] font-semibold', active ? 'text-navy-900' : 'text-slate-400')}>{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </nav>

            {/* pushed screens */}
            {stack.map((s, i) => (
              <div key={i + s.kind} className={cn('m-push absolute inset-x-0 bottom-0 top-11 z-40 flex flex-col bg-slate-50', i < stack.length - 1 && 'invisible')}>
                {s.kind === 'menu' && <MenuScreen {...s} />}
                {s.kind === 'cart' && <CartScreen {...s} />}
                {s.kind === 'success' && <SuccessScreen {...s} />}
                {s.kind === 'order' && <OrderDetailScreen orderId={s.orderId} />}
                {s.kind === 'salary' && <SalarySlipScreen />}
              </div>
            ))}

            {sheetNode}
          </>
        )}

        {snackState && (
          <div key={snackState.id} className="pointer-events-none absolute inset-x-4 bottom-24 z-[60] flex justify-center animate-slide-up">
            <div className="flex items-center gap-2 rounded-2xl bg-slate-900/95 px-4 py-3 text-[13px] font-medium text-white shadow-2xl">
              {snackState.tone === 'success' ? <CheckCircle2 className="size-4.5 shrink-0 text-emerald-400" /> : snackState.tone === 'error' ? <XCircle className="size-4.5 shrink-0 text-rose-400" /> : <Info className="size-4.5 shrink-0 text-sky-400" />}
              {snackState.text}
            </div>
          </div>
        )}
      </div>
    </MobileCtx.Provider>
  )
}
