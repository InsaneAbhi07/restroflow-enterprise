import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronRight, Clock, MapPin, QrCode, ShieldCheck, UtensilsCrossed } from 'lucide-react'
import type { Kot, MenuItem, Order, OrderItem } from '@/types'
import { useStore } from '@/store/useStore'
import { toast } from '@/store/toast'
import { ORG } from '@/data/outlets'
import { Toggle } from '@/components/ui'
import { computeTotals } from '@/lib/billing'
import { cn, inr, uid } from '@/lib/format'
import { GkLogo } from './customer/bits'
import { MenuScreen, type VegFilter } from './customer/MenuScreen'
import { ItemSheet } from './customer/ItemSheet'
import { CartScreen } from './customer/CartScreen'
import { TrackScreen } from './customer/TrackScreen'
import { lineKey, unitPrice, useQrSession, type CartLine } from './customer/qrSession'

type Screen = 'welcome' | 'menu' | 'cart' | 'track'
const EMPTY: string[] = []

export default function QrCustomerApp(props: { outletId?: string; tableId?: string; embedded?: boolean }) {
  const params = useParams()
  const outletId = props.outletId ?? params.outletId ?? ''
  const tableId = props.tableId ?? params.tableId ?? ''
  const embedded = !!props.embedded

  const outlet = useStore((s) => s.outlets.find((o) => o.id === outletId))
  const table = useStore((s) => s.tables.find((t) => t.id === tableId))
  const menu = useStore((s) => s.menu)
  const categories = useStore((s) => s.categories)
  const allOrders = useStore((s) => s.orders)
  const allKots = useStore((s) => s.kots)
  const settings = useStore((s) => s.settings)
  const sessionKey = `${outletId}:${tableId}`
  const sessionIds = useQrSession((s) => s.sessions[sessionKey]?.orderIds ?? EMPTY)
  const addSessionOrder = useQrSession((s) => s.addOrder)

  const [screen, setScreen] = useState<Screen>('welcome')
  const [veg, setVeg] = useState<VegFilter>('all')
  const [cart, setCart] = useState<CartLine[]>([])
  const [sheet, setSheet] = useState<MenuItem | null>(null)
  const [note, setNote] = useState('')
  const [pax, setPax] = useState(2)
  const [placing, setPlacing] = useState(false)

  const items = useMemo(() => menu.filter((m) => m.outlets.includes(outletId)), [menu, outletId])
  const myOrders: Order[] = useMemo(() => sessionIds.map((id) => allOrders.find((o) => o.id === id)).filter((o): o is Order => !!o), [sessionIds, allOrders])
  const activeOrders = myOrders.filter((o) => o.status === 'Running' || o.status === 'Billed' || (o.status === 'Settled' && o.settledAt && Date.now() - o.settledAt < 30 * 60000))
  const myKots: Kot[] = useMemo(() => allKots.filter((k) => activeOrders.some((o) => o.id === k.orderId)), [allKots, activeOrders])
  const appendTo = activeOrders.find((o) => o.status === 'Running' && table?.orderId === o.id)

  const cartCount = cart.reduce((s, l) => s + l.qty, 0)
  const cartSub = cart.reduce((s, l) => s + unitPrice(l) * l.qty, 0)
  const orderItems = (): OrderItem[] => cart.map((l) => ({
    id: uid('oi'), itemId: l.item.id, name: l.item.name, price: l.variant?.price ?? l.item.price, qty: l.qty, veg: l.item.veg, gst: l.item.gst,
    variant: l.variant?.name, modifiers: l.modifiers.length ? l.modifiers : undefined, note: l.note || undefined,
  }))
  const totals = computeTotals({ items: orderItems(), discount: { type: 'pct', value: 0 }, serviceCharge: settings.serviceCharge })

  // ----- cart ops
  const addLine = (item: MenuItem, opts: { variant?: CartLine['variant']; modifiers: CartLine['modifiers']; note: string; qty: number }) => {
    const key = lineKey(item.id, opts.variant, opts.modifiers, opts.note)
    setCart((c) => c.some((l) => l.key === key) ? c.map((l) => (l.key === key ? { ...l, qty: l.qty + opts.qty } : l)) : [...c, { key, item, ...opts }])
  }
  const quickAdd = (m: MenuItem) => {
    if (m.variants?.length || m.modifiers?.length) setSheet(m)
    else addLine(m, { modifiers: [], note: '', qty: 1 })
  }
  const dec = (m: MenuItem) => {
    setCart((c) => {
      const idx = c.map((l) => l.item.id).lastIndexOf(m.id)
      if (idx < 0) return c
      return c.map((l, i) => (i === idx ? { ...l, qty: l.qty - 1 } : l)).filter((l) => l.qty > 0)
    })
  }
  const setQty = (key: string, qty: number) => {
    setCart((c) => c.map((l) => (l.key === key ? { ...l, qty: Math.min(20, qty) } : l)).filter((l) => l.qty > 0))
    if (qty <= 0 && cart.length === 1) setScreen('menu')
  }
  const qtyOf = (id: string) => cart.filter((l) => l.item.id === id).reduce((s, l) => s + l.qty, 0)

  // ----- place order
  const place = () => {
    if (!table || !cart.length) return
    setPlacing(true)
    setTimeout(() => {
      const st = useStore.getState()
      const newItems = orderItems()
      let orderId: string
      const existing = appendTo ? st.orders.find((o) => o.id === appendTo.id && o.status === 'Running') : undefined
      if (existing) {
        st.updateOrder(existing.id, { items: [...existing.items, ...newItems], note: [existing.note, note].filter(Boolean).join(' · ') || undefined })
        orderId = existing.id
      } else {
        const o = st.createOrder({
          outletId, type: 'Dine-in', source: 'QR Order', tableId, tableLabel: table.label, items: newItems,
          waiterName: 'QR Guest', status: 'Running', pax, note: note || undefined,
        })
        orderId = o.id
      }
      const kot = st.sendKot(orderId)
      addSessionOrder(sessionKey, orderId)
      const amount = computeTotals({ items: newItems, discount: { type: 'pct', value: 0 }, serviceCharge: settings.serviceCharge }).total
      st.notify({ title: `New QR order · Table ${table.label}`, body: `${cartCount} items · ${inr(amount)} · ${outlet?.short ?? ''}`, type: 'order', link: '/kot' })
      st.log(`QR order placed from table ${table.label} (${cartCount} items, ${inr(amount)})`, 'qr', 'success', outletId)
      toast.success('Order sent to kitchen', `${kot?.no ?? ''} · Table ${table.label}`)
      setCart([]); setNote(''); setPlacing(false); setScreen('track')
    }, 650)
  }

  const callWaiter = () => {
    if (!table) return
    useStore.getState().notify({ title: `Waiter called · Table ${table.label}`, body: `Guest at ${outlet?.short ?? ''} needs assistance`, type: 'order', link: '/tables' })
    useStore.getState().log(`QR guest at table ${table.label} called a waiter`, 'qr', 'info', outletId)
    toast.success('Waiter is on the way', 'We have notified your server')
  }
  const requestBill = () => {
    if (!table) return
    useStore.getState().notify({ title: `Bill requested · Table ${table.label}`, body: `Guest requested the bill via QR · ${outlet?.short ?? ''}`, type: 'order', link: '/tables' })
    useStore.getState().log(`QR guest at table ${table.label} requested the bill`, 'qr', 'info', outletId)
    toast.success('Bill requested', 'Your server will bring the bill shortly')
  }

  // ----- unavailable states
  const unavailable = !outlet || !table ? 'This QR code is not valid. Please ask the staff for help.'
    : !settings.qr.enabled ? 'QR ordering is paused right now. Please call your server to place an order.'
      : !table.qrEnabled ? `QR ordering is disabled for table ${table.label}. Please ask your server.` : null

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#faf8f4] text-slate-800" style={{ fontSize: 14 }}>
      {unavailable ? (
        <div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-navy-900 to-navy-950 px-8 text-center text-white">
          <GkLogo className="mb-5 size-16 text-[24px]" />
          <QrCode className="mb-3 size-10 text-white/40" />
          <h2 className="text-[18px] font-bold">{outlet ? outlet.short : ORG.name}</h2>
          <p className="mt-2 text-[14px] text-white/70">{unavailable}</p>
        </div>
      ) : screen === 'welcome' ? (
        <div className="flex h-full flex-col overflow-y-auto">
          <div className={cn('relative overflow-hidden bg-navy-900 px-6 pb-10 text-white', embedded ? 'pt-16' : 'pt-10')}>
            <div className="absolute -right-16 -top-16 size-56 rounded-full bg-brand-500/20 blur-2xl" />
            <div className="absolute -bottom-20 -left-10 size-56 rounded-full bg-orange-400/15 blur-2xl" />
            <div className="relative">
              <GkLogo className="size-16 text-[24px]" />
              <p className="mt-5 text-[13px] font-medium text-brand-300">Welcome to</p>
              <h1 className="text-[26px] font-extrabold leading-tight">{ORG.name}</h1>
              <p className="text-[14px] text-white/70">{outlet!.short} · {ORG.tagline}</p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 ring-1 ring-white/15 backdrop-blur">
                <UtensilsCrossed className="size-4 text-brand-300" />
                <span className="text-[13px] text-white/70">You're at</span>
                <span className="text-[18px] font-extrabold">Table {table!.label}</span>
              </div>
            </div>
          </div>
          <div className="-mt-5 flex-1 rounded-t-[28px] bg-[#faf8f4] px-5 pt-6">
            <div className="space-y-2.5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center gap-3 text-[13px] text-slate-600"><Clock className="size-4 text-brand-600" />Open today · {outlet!.hours}</div>
              <div className="flex items-start gap-3 text-[13px] text-slate-600"><MapPin className="mt-0.5 size-4 text-brand-600" />{outlet!.address}</div>
              <div className="flex items-center gap-3 text-[13px] text-slate-600"><ShieldCheck className="size-4 text-brand-600" />Order from your phone — no app, no login</div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-3xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center gap-3">
                <span className="veg-mark" />
                <div><div className="text-[14px] font-bold text-slate-900">Pure veg mode</div><div className="text-[12px] text-slate-500">Show only vegetarian dishes</div></div>
              </div>
              <Toggle checked={veg === 'veg'} onChange={(v) => setVeg(v ? 'veg' : 'all')} />
            </div>
            {activeOrders.length > 0 && (
              <button onClick={() => setScreen('track')} className="mt-3 flex w-full items-center justify-between rounded-3xl bg-brand-50 px-4 py-3.5 text-left ring-1 ring-brand-200">
                <div><div className="text-[14px] font-bold text-brand-800">You have an active order</div><div className="text-[12px] text-brand-700">Tap to track live status</div></div>
                <ChevronRight className="size-5 text-brand-700" />
              </button>
            )}
            <button onClick={() => setScreen('menu')}
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 text-[16px] font-bold text-white shadow-xl shadow-brand-500/30 active:scale-[.99]">
              View menu<ChevronRight className="size-5" />
            </button>
            <p className="pb-6 pt-5 text-center text-[11px] text-slate-400">Powered by RestroFlow · Secure table ordering</p>
          </div>
        </div>
      ) : screen === 'menu' ? (
        <MenuScreen items={items} categories={categories} outletName={outlet!.short} tableLabel={table!.label} embedded={embedded}
          veg={veg} setVeg={setVeg} qtyOf={qtyOf} onAdd={quickAdd} onDec={dec} onBack={() => setScreen('welcome')}
          cartCount={cartCount} cartTotal={cartSub} onViewCart={() => setScreen('cart')}
          hasActiveOrder={activeOrders.length > 0} onTrack={() => setScreen('track')} />
      ) : screen === 'cart' ? (
        <CartScreen lines={cart} categories={categories} totals={totals} serviceCharge={settings.serviceCharge} tableLabel={table!.label} embedded={embedded}
          note={note} setNote={setNote} pax={pax} setPax={setPax} onQty={setQty} onBack={() => setScreen('menu')} onPlace={place} placing={placing} appending={!!appendTo} />
      ) : (
        <TrackScreen orders={activeOrders.length ? activeOrders : myOrders.slice(-1)} kots={myKots} tableLabel={table!.label} embedded={embedded}
          onBack={() => setScreen('menu')} onOrderMore={() => setScreen('menu')} onCallWaiter={callWaiter} onRequestBill={requestBill} />
      )}

      {sheet && (
        <ItemSheet item={sheet} color={categories.find((c) => c.id === sheet.categoryId)?.color} onClose={() => setSheet(null)}
          onAdd={(o) => { addLine(sheet, o); setSheet(null); toast.success(`${sheet.name} added`) }} />
      )}
    </div>
  )
}
