import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, AlertTriangle, Info, XCircle, X, ShieldOff, ArrowLeft, Search, ReceiptText, UtensilsCrossed, LayoutGrid, Users, Boxes, CornerDownLeft,
  RotateCcw, ShoppingBag, QrCode, Smartphone, Wallet, UserCheck, ArrowLeftRight, BadgeIndianRupee, Sparkles, Maximize2, Minimize2, ExternalLink,
} from 'lucide-react'
import { Modal, Button, Kbd, DynIcon, Avatar, Badge } from '@/components/ui'
import { useToastStore } from '@/store/toast'
import { useStore } from '@/store/useStore'
import { usePermission, useRole, useWorkingOutlet } from '@/store/hooks'
import { ALL_NAV } from './nav'
import { useUI } from './uiStore'
import { cn } from '@/lib/format'
import { simulateCheckIn, simulatePayroll, simulateSampleOrder, simulateSettlement, simulateTableOrder, simulateTransfer } from '@/lib/simulate'
import { toast } from '@/store/toast'
import StaffApp from '@/mobile/StaffApp'
import { useHotel } from '@/pages/hotel/hotelStore'

/* ------------------------------------------------------------------ Toaster */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  const ICON = { success: <CheckCircle2 className="size-4 text-emerald-500" />, error: <XCircle className="size-4 text-rose-500" />, warning: <AlertTriangle className="size-4 text-amber-500" />, info: <Info className="size-4 text-sky-500" /> }
  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[340px] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-pop animate-slide-up">
          <span className="mt-0.5">{ICON[t.type]}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-slate-900">{t.title}</p>
            {t.body && <p className="text-[12px] text-slate-500">{t.body}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="text-slate-300 hover:text-slate-600"><X className="size-3.5" /></button>
        </div>
      ))}
    </div>,
    document.body,
  )
}

/* ------------------------------------------------------------------ Access denied */
export function AccessDenied({ module }: { module?: string }) {
  const role = useRole()
  const nav = useNavigate()
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500"><ShieldOff className="size-7" /></div>
        <h2 className="text-[18px] font-semibold text-slate-900">Access restricted</h2>
        <p className="mt-1.5 text-[13px] text-slate-500">
          Your role <b style={{ color: role.color }}>{role.name}</b> does not have <b>View</b> permission for <b>{module ?? 'this module'}</b>.
          Ask your organization owner to update your role in <i>Roles & Permissions</i>.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button icon={<ArrowLeft className="size-3.5" />} onClick={() => nav(-1)}>Go back</Button>
          <Button variant="primary" onClick={() => nav('/')}>Open my dashboard</Button>
        </div>
        <p className="mt-6 text-[11px] text-slate-400">Demo: client-side route guard simulation — not production security.</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Global search (Ctrl+K) */
export function GlobalSearch() {
  const open = useUI((s) => s.search)
  const setOpen = useUI((s) => s.setSearch)
  const nav = useNavigate()
  const { can } = usePermission()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const menu = useStore((s) => s.menu)
  const orders = useStore((s) => s.orders)
  const employees = useStore((s) => s.employees)
  const tables = useStore((s) => s.tables)
  const outlets = useStore((s) => s.outlets)
  const materials = useStore((s) => s.materials)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) { setQ(''); setIdx(0); setTimeout(() => inputRef.current?.focus(), 20) } }, [open])

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    const pages = ALL_NAV.filter((n) => can(n.module)).map((n) => ({ group: 'Pages', label: n.label, sub: n.to, icon: <DynIcon name={n.icon} className="size-4" />, to: n.to }))
    if (!s) return pages.slice(0, 8)
    const r = [
      ...pages.filter((p) => p.label.toLowerCase().includes(s)),
      ...orders.filter((o) => o.no.toLowerCase().includes(s) || o.billNo?.toLowerCase().includes(s) || o.customerName?.toLowerCase().includes(s)).slice(0, 5)
        .map((o) => ({ group: 'Orders & Bills', label: `${o.billNo ?? o.no} · ${o.customerName ?? o.type}`, sub: `${o.status} • ${outlets.find((x) => x.id === o.outletId)?.short}`, icon: <ReceiptText className="size-4" />, to: '/orders' })),
      ...menu.filter((m) => m.name.toLowerCase().includes(s) || m.short.toLowerCase() === s || m.code === s).slice(0, 5)
        .map((m) => ({ group: 'Menu Items', label: m.name, sub: `#${m.code} • ${m.short} • ₹${m.price}`, icon: <UtensilsCrossed className="size-4" />, to: '/menu' })),
      ...tables.filter((t) => t.label.toLowerCase() === s || ('table ' + t.label.toLowerCase()).includes(s)).slice(0, 4)
        .map((t) => ({ group: 'Tables', label: `Table ${t.label}`, sub: `${t.status} • ${outlets.find((x) => x.id === t.outletId)?.short}`, icon: <LayoutGrid className="size-4" />, to: '/tables' })),
      ...employees.filter((e) => e.name.toLowerCase().includes(s) || e.code.toLowerCase().includes(s)).slice(0, 4)
        .map((e) => ({ group: 'Employees', label: e.name, sub: `${e.code} • ${e.designation}`, icon: <Users className="size-4" />, to: '/employees' })),
      ...materials.filter((m) => m.name.toLowerCase().includes(s)).slice(0, 4)
        .map((m) => ({ group: 'Inventory', label: m.name, sub: `${m.code} • ${m.category}`, icon: <Boxes className="size-4" />, to: '/inventory' })),
    ]
    return r.slice(0, 14)
  }, [q, can, orders, menu, tables, employees, materials, outlets])

  const go = (i: number) => { const r = results[i]; if (r) { nav(r.to); setOpen(false) } }

  return (
    <Modal open={open} onClose={() => setOpen(false)} size="md" hideClose bodyClassName="p-0" className="sm:mt-[10vh] sm:self-start">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4">
        <Search className="size-4 text-slate-400" />
        <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setIdx(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(results.length - 1, i + 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)) }
            if (e.key === 'Enter') go(idx)
          }}
          placeholder="Search pages, bills, menu items, tables, employees…" className="h-12 flex-1 bg-transparent text-[14px] outline-none placeholder:text-slate-400" />
        <Kbd>Esc</Kbd>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-2">
        {results.length === 0 && <p className="px-3 py-8 text-center text-[13px] text-slate-400">No results for “{q}”</p>}
        {results.map((r, i) => (
          <React.Fragment key={i}>
            {(i === 0 || results[i - 1].group !== r.group) && <div className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{r.group}</div>}
            <button onMouseEnter={() => setIdx(i)} onClick={() => go(i)}
              className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left', idx === i ? 'bg-brand-50 text-navy-900' : 'text-slate-700')}>
              <span className={cn('flex size-7 items-center justify-center rounded-md', idx === i ? 'bg-white text-brand-600 shadow-sm' : 'bg-slate-100 text-slate-500')}>{r.icon}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{r.label}</span><span className="block truncate text-[11px] text-slate-400">{r.sub}</span></span>
              {idx === i && <CornerDownLeft className="size-3.5 text-slate-400" />}
            </button>
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
        <span className="flex items-center gap-1"><Kbd>Enter</Kbd> open</span>
        <span className="flex items-center gap-1"><Kbd>Esc</Kbd> close</span>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ Shortcut help (F1) */
export const SHORTCUTS: [string[], string, string][] = [
  [['Ctrl', 'K'], 'Global search', 'General'],
  [['F1'], 'Keyboard shortcut reference', 'General'],
  [['Esc'], 'Close modal / go back one step', 'General'],
  [['Alt', '←'], 'Previous page', 'General'],
  [['Alt', '→'], 'Next page', 'General'],
  [['Enter'], 'Continue guided workflow / primary action', 'General'],
  [['Ctrl', 'B'], 'New bill (open POS)', 'Billing'],
  [['F2'], 'Focus POS item search', 'Billing'],
  [['Ctrl', 'S'], 'Save draft / hold order', 'Billing'],
  [['F4'], 'Open settlement', 'Billing'],
  [['F8'], 'Print preview / print', 'Billing'],
  [['F9'], 'Generate KOT', 'Billing'],
  [['2*PBM'], 'In POS search: add 2 × Paneer Butter Masala by short code', 'Fast billing'],
  [['113'], 'In POS search: add item by numeric code', 'Fast billing'],
  [['+', '−'], 'Increase / decrease qty of last cart item', 'Fast billing'],
]
export function ShortcutHelp() {
  const open = useUI((s) => s.help)
  const setOpen = useUI((s) => s.setHelp)
  const groups = [...new Set(SHORTCUTS.map((s) => s[2]))]
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts" subtitle="Designed for fast counter billing — keep hands on the keyboard" size="lg">
      <div className="grid gap-6 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g}>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g}</h4>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {SHORTCUTS.filter((s) => s[2] === g).map(([keys, desc]) => (
                <div key={desc} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-[12.5px] text-slate-700">{desc}</span>
                  <span className="flex shrink-0 gap-1">{keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ Demo control panel (owner only) */
export function DemoPanel() {
  const open = useUI((s) => s.demoPanel)
  const setOpen = useUI((s) => s.setDemoPanel)
  const setScenarios = useUI((s) => s.setScenarios)
  const outletId = useWorkingOutlet()
  const outlet = useStore((s) => s.outlets.find((o) => o.id === outletId))
  const reset = useStore((s) => s.resetDemo)
  const [confirm, setConfirm] = useState(false)
  const actions: { icon: React.ReactNode; label: string; desc: string; run: () => void }[] = [
    { icon: <ShoppingBag />, label: 'Generate sample order', desc: 'Takeaway order with KOT', run: () => simulateSampleOrder(outletId) },
    { icon: <QrCode />, label: 'Simulate QR order', desc: 'Guest orders from a table QR', run: () => simulateTableOrder(outletId, 'QR Order') },
    { icon: <Smartphone />, label: 'Simulate waiter order', desc: 'Order arrives from Waiter App', run: () => simulateTableOrder(outletId, 'Waiter App') },
    { icon: <Wallet />, label: 'Simulate bill settlement', desc: 'Settles oldest open bill via UPI', run: () => simulateSettlement(outletId) },
    { icon: <UserCheck />, label: 'Simulate employee check-in', desc: 'Network-based auto attendance', run: () => simulateCheckIn(outletId) },
    { icon: <ArrowLeftRight />, label: 'Simulate stock transfer', desc: 'Main Branch → Mall Outlet', run: () => simulateTransfer() },
    { icon: <BadgeIndianRupee />, label: 'Simulate payroll processing', desc: 'Process current month', run: () => simulatePayroll() },
  ]
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Demo control panel" subtitle={`Simulations run on ${outlet?.short}. All data is mock & stays in this browser.`} icon={<Sparkles />} size="md"
      footer={<><Button variant="ghost" icon={<RotateCcw className="size-3.5" />} className="mr-auto text-rose-600" onClick={() => setConfirm(true)}>Reset demo data</Button><Button onClick={() => { setOpen(false); setScenarios(true) }}>Open demo scenarios</Button></>}>
      <div className="grid gap-2 sm:grid-cols-2">
        {actions.map((a) => (
          <button key={a.label} onClick={a.run} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700 [&>svg]:size-4">{a.icon}</span>
            <span><span className="block text-[13px] font-medium text-slate-800">{a.label}</span><span className="block text-[11.5px] text-slate-500">{a.desc}</span></span>
          </button>
        ))}
      </div>
      {confirm && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12.5px] text-rose-800">
          Reset all orders, stock, attendance and settings to the original sample data?
          <div className="flex shrink-0 gap-2">
            <Button size="sm" onClick={() => setConfirm(false)}>No</Button>
            <Button size="sm" variant="danger" onClick={() => { reset(); useHotel.getState().reset(); setConfirm(false); toast.success('Demo data reset') }}>Reset</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------------ Phone frame + mobile preview */
export function PhoneFrame({ children, className, scale = 1 }: { children: React.ReactNode; className?: string; scale?: number }) {
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: 390 * scale, height: 800 * scale }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${scale})`, width: 390, height: 800 }}>
        <div className="relative h-full w-full rounded-[52px] bg-[#0b1220] p-[11px] shadow-[0_30px_60px_-20px_rgba(15,42,74,.55),inset_0_0_0_2px_#2a3446]">
          <div className="absolute left-1/2 top-[18px] z-20 h-[26px] w-[96px] -translate-x-1/2 rounded-full bg-black" />
          <div className="relative h-full w-full overflow-hidden rounded-[42px] bg-white">
            {/* transform creates a containing block so position:fixed children stay inside the phone */}
            <div className="h-full w-full" style={{ transform: 'translateZ(0)' }}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MobilePreviewModal() {
  const open = useUI((s) => s.mobilePreview)
  const setOpen = useUI((s) => s.setMobilePreview)
  const orders = useStore((s) => s.orders)
  const outlets = useStore((s) => s.outlets)
  const waiterOrders = orders.filter((o) => o.source === 'Waiter App').slice(0, 6)
  if (!open) return null
  return (
    <Modal open={open} onClose={() => setOpen(false)} size="xl" title="Staff Mobile App — live preview" subtitle="Same shared data as the web dashboard. Orders placed here appear instantly in POS, KOT & dashboards."
      icon={<Smartphone />} bodyClassName="bg-slate-100/70"
      footer={<><Button icon={<ExternalLink className="size-3.5" />} onClick={() => window.open(import.meta.env.BASE_URL + 'mobile', '_blank')}>Open in new tab</Button><Button variant="primary" icon={<Maximize2 className="size-3.5" />} onClick={() => { setOpen(false); window.location.assign(import.meta.env.BASE_URL + 'mobile') }}>View full screen</Button></>}>
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        <PhoneFrame scale={0.92}><StaffApp embedded /></PhoneFrame>
        <div className="w-full max-w-sm space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="text-[13px] font-semibold text-slate-900">Try it</h4>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[12.5px] text-slate-600">
              <li>Log in as <b>Rohit Kumar</b> (PIN 5555)</li>
              <li>Tap <b>Tables</b> → choose a free table</li>
              <li>Add items, variants & notes → <b>Send to kitchen</b></li>
              <li>Watch the order appear below and in the KOT screen</li>
              <li>Check in from <b>Attendance</b> tab</li>
            </ol>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <h4 className="text-[13px] font-semibold text-slate-900">Live: Waiter App orders on web</h4>
              <span className="flex items-center gap-1 text-[11px] text-emerald-600"><span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />Synced</span>
            </div>
            <div className="divide-y divide-slate-100">
              {waiterOrders.map((o) => (
                <div key={o.id} className="flex items-center gap-2.5 px-4 py-2">
                  <Avatar name={o.waiterName ?? 'W'} size={24} color="#ea580c" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-slate-800">{o.no} · Table {o.tableLabel}</p>
                    <p className="truncate text-[11px] text-slate-500">{o.waiterName} • {outlets.find((x) => x.id === o.outletId)?.short} • {o.items.length} items</p>
                  </div>
                  <Badge tone={o.status === 'Settled' ? 'green' : 'blue'}>{o.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ Presentation mode pill */
export function PresentationBar() {
  const presentation = useStore((s) => s.presentation)
  const setPresentation = useStore((s) => s.setPresentation)
  const setScenarios = useUI((s) => s.setScenarios)
  const setMobile = useUI((s) => s.setMobilePreview)
  if (!presentation) return null
  return (
    <div className="fixed bottom-4 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-1 rounded-full bg-navy-900/95 p-1 pl-4 text-white shadow-pop backdrop-blur animate-slide-up">
      <span className="mr-2 flex items-center gap-1.5 text-[12px] font-medium"><span className="size-2 animate-pulse rounded-full bg-rose-400" />Presentation mode</span>
      <button onClick={() => setScenarios(true)} className="rounded-full px-3 py-1.5 text-[12px] hover:bg-white/10">Scenarios</button>
      <button onClick={() => setMobile(true)} className="rounded-full px-3 py-1.5 text-[12px] hover:bg-white/10">Mobile app</button>
      <button onClick={() => { setPresentation(false); document.fullscreenElement && document.exitFullscreen?.() }} className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[12px] hover:bg-white/20"><Minimize2 className="size-3.5" />Exit</button>
    </div>
  )
}
