import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { PrintPreviewModal } from '@/components/print/Print'
import { KotTicket, ThermalReceipt } from '@/components/print/Receipts'
import { useStore } from '@/store/useStore'
import { usePermission, useRole, useWorkingOutlet } from '@/store/hooks'
import { toast } from '@/store/toast'
import { hasOpenOverlay, isTypingTarget, useShortcut } from '@/lib/shortcuts'
import type { MenuItem, PayMode } from '@/types'
import { SettlementModal, type SettleMethod } from '@/pages/settlement/SettlementModal'
import { MenuPanel, type MenuPanelHandle } from './MenuPanel'
import { CartPanel } from './CartPanel'
import { RunningStrip } from './RunningOrders'
import { CancelLineModal, CustomizeModal, DiscountModal, TablePickerModal } from './PosDialogs'
import { usePosOrder } from './usePosOrder'
import { usePosUI } from './posStore'
import { makeLine } from './posUtils'

type PrintJob = { kind: 'bill'; orderId: string } | { kind: 'kot'; kotId: string } | null

export default function POS() {
  const { can } = usePermission()
  const role = useRole()
  const readOnly = !can('pos', 'create')
  const ctl = usePosOrder()
  const working = useWorkingOutlet()
  const settings = useStore((s) => s.settings)
  const quickPay = usePosUI((s) => s.quickPay)
  const menuRef = useRef<MenuPanelHandle>(null)
  const [params, setParams] = useSearchParams()

  const [tableOpen, setTableOpen] = useState(false)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [cancelLine, setCancelLine] = useState<{ id: string; name: string } | null>(null)
  const [customize, setCustomize] = useState<{ item: MenuItem; qty: number } | null>(null)
  const [settle, setSettle] = useState<{ id: string; method: SettleMethod } | null>(null)
  const [print, setPrint] = useState<PrintJob>(null)
  const [customerSignal, setCustomerSignal] = useState(0)

  const printOrder = useStore((s) => (print?.kind === 'bill' ? s.orders.find((o) => o.id === print.orderId) : undefined))
  const printKot = useStore((s) => (print?.kind === 'kot' ? s.kots.find((k) => k.id === print.kotId) : undefined))

  /* ---------- deep links: ?new=1 (Ctrl+B) and ?order=<id> (from Orders) ---------- */
  useEffect(() => {
    const id = params.get('order')
    if (params.get('new')) {
      ctl.reset()
      setParams({}, { replace: true })
      setTimeout(() => menuRef.current?.focus(), 50)
    } else if (id) {
      const o = useStore.getState().orders.find((x) => x.id === id)
      if (o && o.status !== 'Settled' && o.status !== 'Cancelled') { ctl.load(id); toast.info(`Opened ${o.no}`, o.tableLabel ? `Table ${o.tableLabel}` : o.type) }
      else if (o) toast.warning(`${o.no} is ${o.status.toLowerCase()}`, 'Settled / cancelled bills cannot be edited in POS')
      setParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  /* ---------- switching outlet in the top bar starts a fresh cart ---------- */
  const prevOutlet = useRef(working)
  useEffect(() => {
    if (prevOutlet.current !== working) {
      prevOutlet.current = working
      if (ctl.order && ctl.order.outletId !== working) { ctl.reset(); toast.info('Outlet switched', 'Started a new cart for this outlet') }
    }
  }, [working, ctl])

  useEffect(() => { if (!readOnly) setTimeout(() => menuRef.current?.focus(), 80) }, [readOnly])

  const cartQty = useMemo(() => ctl.view.items.filter((i) => !i.cancelled).reduce<Record<string, number>>((a, i) => ({ ...a, [i.itemId]: (a[i.itemId] ?? 0) + i.qty }), {}), [ctl.view.items])

  /* ---------- adding items ---------- */
  const guard = () => { if (readOnly) { toast.error('View-only access', `${role.name} cannot create bills`); return false } return true }
  const onTile = (m: MenuItem, qty: number) => {
    if (!guard()) return
    if (!m.available) return void toast.error(`${m.name} is sold out`)
    if (m.variants?.length || m.modifiers?.length) setCustomize({ item: m, qty })
    else ctl.addLine(makeLine(m, qty))
  }
  const onQuick = (m: MenuItem, qty: number) => {
    if (!guard()) return
    if (!m.available) return void toast.error(`${m.name} is sold out`, 'Marked unavailable in menu')
    ctl.addLine(makeLine(m, qty))
  }

  /* ---------- actions ---------- */
  const needTable = () => {
    if (ctl.type === 'Dine-in' && settings.pos.requireTable && !ctl.view.tableLabel && ctl.hasItems()) {
      toast.warning('Select a table first', 'Dine-in orders need a table (Settings › POS)')
      setTableOpen(true)
      return true
    }
    return false
  }
  const afterKotReset = () => { if (ctl.type === 'Dine-in') ctl.reset() }
  const onKot = () => { if (!guard() || needTable()) return; const k = ctl.kot(); if (k) afterKotReset() }
  const onKotPrint = () => { if (!guard() || needTable()) return; const k = ctl.kot(); if (k) { setPrint({ kind: 'kot', kotId: k.id }); afterKotReset() } }
  const onSaveBill = () => { if (!guard() || needTable()) return; const id = ctl.bill(); if (id) { setPrint({ kind: 'bill', orderId: id }); ctl.reset() } }
  const openSettle = (method: SettleMethod) => {
    if (!guard()) return
    if (!ctl.hasItems()) return void toast.info('Add items before settling')
    if (needTable()) return
    const o = ctl.ensure()
    if (ctl.pending().length) useStore.getState().sendKot(o.id)
    setSettle({ id: o.id, method })
  }
  const onSettle = () => openSettle(quickPay === 'Part' ? 'Split' : quickPay === 'UPI' ? 'UPI' : quickPay === 'Card' ? 'Credit Card' : 'Cash')
  const onQuickSettle = () => {
    if (!guard() || needTable()) return
    if (quickPay === 'Part') return openSettle('Split')
    if (quickPay === 'Due' && !ctl.view.customerName) { toast.warning('Select a customer for Due payment', 'Due bills are tracked against the customer account'); setCustomerSignal((n) => n + 1); return }
    const mode: PayMode = quickPay === 'Card' ? 'Credit Card' : quickPay
    const id = ctl.settleQuick(mode)
    if (id) { setPrint({ kind: 'bill', orderId: id }); ctl.reset() }
  }
  const onSave = () => { if (guard()) ctl.save() }
  const onHold = () => { if (guard()) ctl.hold() }
  const onPreview = () => {
    if (!ctl.order || !ctl.hasItems()) return void toast.info('Nothing to preview', 'Add items to the cart first')
    setPrint({ kind: 'bill', orderId: ctl.order.id })
  }

  const modalOpen = tableOpen || discountOpen || !!cancelLine || !!customize || !!settle || !!print
  useShortcut('focusSearch', () => menuRef.current?.focus(), !modalOpen)
  useShortcut('settle', onSettle, !modalOpen)
  useShortcut('kot', onKot, !modalOpen)
  useShortcut('save', onSave, !modalOpen)
  useShortcut('print', onPreview, !modalOpen)

  /* ---------- '+' / '-' adjust last item, typing anywhere jumps to search ---------- */
  const ctlRef = useRef(ctl)
  ctlRef.current = ctl
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || hasOpenOverlay() || e.ctrlKey || e.metaKey || e.altKey || readOnly) return
      if (e.key === '+' || e.key === '=') { e.preventDefault(); ctlRef.current.changeLastQty(1) }
      else if (e.key === '-') { e.preventDefault(); ctlRef.current.changeLastQty(-1) }
      else if (/^[a-zA-Z0-9]$/.test(e.key)) { e.preventDefault(); menuRef.current?.focus(e.key) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [readOnly])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {readOnly && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-[12px] text-amber-800">
          <Lock className="size-3.5" /> <b>View-only:</b> the <b>{role.name}</b> role cannot create or modify bills. Switch to a Cashier / Manager in the user menu to bill.
        </div>
      )}
      <RunningStrip outletId={ctl.outletId} activeId={ctl.order?.id ?? null} readOnly={readOnly}
        onLoad={(id) => { ctl.load(id); setTimeout(() => menuRef.current?.focus(), 30) }}
        onNew={() => { ctl.reset(); setTimeout(() => menuRef.current?.focus(), 30) }} />
      <div className="flex min-h-0 flex-1">
        <MenuPanel ref={menuRef} outletId={ctl.outletId} cartQty={cartQty} disabled={readOnly} onTile={onTile} onQuick={onQuick} />
        <CartPanel ctl={ctl} readOnly={readOnly} customerSignal={customerSignal}
          actions={{ onTable: () => setTableOpen(true), onDiscount: () => setDiscountOpen(true), onCancelLine: (id, name) => setCancelLine({ id, name }), onSave, onHold, onKot, onKotPrint, onSaveBill, onSettle, onQuickSettle }} />
      </div>

      <CustomizeModal item={customize?.item ?? null} onClose={() => setCustomize(null)}
        onConfirm={(variant, mods, qty, note) => {
          if (customize) ctl.addLine(makeLine(customize.item, qty * customize.qty, variant, mods, note))
          setCustomize(null)
          setTimeout(() => menuRef.current?.focus(), 30)
        }} />
      <TablePickerModal open={tableOpen} onClose={() => setTableOpen(false)} outletId={ctl.outletId} currentTableId={ctl.view.tableId}
        onPick={(t) => { ctl.pickTable(t); setTableOpen(false) }} />
      <DiscountModal open={discountOpen} onClose={() => setDiscountOpen(false)} current={ctl.view.discount} subtotal={ctl.totals.subtotal}
        onApply={(d) => {
          ctl.patch({ discount: d })
          if (d.value) toast.success('Discount applied', `${d.type === 'pct' ? d.value + '%' : '₹' + d.value}${d.reason ? ' · ' + d.reason : ''}`)
        }} />
      <CancelLineModal name={cancelLine?.name ?? null} onClose={() => setCancelLine(null)} onConfirm={(reason) => cancelLine && ctl.cancelLine(cancelLine.id, reason)} />
      <SettlementModal orderId={settle?.id ?? null} open={!!settle} initialMethod={settle?.method}
        onClose={() => { setSettle(null); setTimeout(() => menuRef.current?.focus(), 30) }}
        onSettled={() => ctl.reset()} />
      <PrintPreviewModal open={!!print} onClose={() => { setPrint(null); setTimeout(() => menuRef.current?.focus(), 30) }}
        title={print?.kind === 'kot' ? 'KOT print preview' : 'Bill print preview'}
        subtitle={print?.kind === 'kot' ? `${printKot?.no} · ${settings.printer.printerName}` : `${printOrder?.billNo ?? printOrder?.no ?? ''} · ${settings.printer.printerName}`}>
        {(w) => (print?.kind === 'kot' ? (printKot ? <KotTicket kot={printKot} width={w} /> : null) : printOrder ? <ThermalReceipt order={printOrder} width={w} /> : null)}
      </PrintPreviewModal>
    </div>
  )
}
