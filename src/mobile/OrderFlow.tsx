import { useMemo, useState } from 'react'
import { ChefHat, ChevronRight, Flame, MessageSquarePlus, Plus, Search, Send, ShoppingBag, Star, Trash2, X } from 'lucide-react'
import type { MenuItem, Modifier, OrderItem } from '@/types'
import { useStore } from '@/store/useStore'
import { computeTotals, lineTotal } from '@/lib/billing'
import { cn, inr, uid } from '@/lib/format'
import { VegMark } from '@/components/ui'
import { useMe, useMobile } from './ctx'
import { AnimatedCheck, BottomSheet, Chip, MButton, MHeader, QtyStepper } from './ui'

const QUICK_NOTES = ['Less spicy', 'No onion', 'Extra hot', 'No garlic', 'Jain', 'Serve first']

const sameLine = (a: OrderItem, b: Pick<OrderItem, 'itemId' | 'variant' | 'modifiers' | 'note'>) =>
  a.itemId === b.itemId && a.variant === b.variant && (a.note ?? '') === (b.note ?? '') &&
  (a.modifiers ?? []).map((x) => x.name).join('|') === (b.modifiers ?? []).map((x) => x.name).join('|')

function addLine(cart: OrderItem[], line: OrderItem) {
  const ex = cart.find((c) => sameLine(c, line))
  return ex ? cart.map((c) => (c === ex ? { ...c, qty: c.qty + line.qty } : c)) : [...cart, line]
}

/* ------------------------------------------------------------------ Menu (item picker) */
export function MenuScreen({ tableId, pax, orderId }: { tableId: string; pax: number; orderId?: string }) {
  const m = useMobile()
  const { emp } = useMe()
  const menu = useStore((s) => s.menu)
  const categories = useStore((s) => s.categories)
  const table = useStore((s) => s.tables.find((t) => t.id === tableId))
  const order = useStore((s) => (orderId ? s.orders.find((o) => o.id === orderId) : undefined))
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [vegOnly, setVegOnly] = useState(false)

  const items = useMemo(() => menu.filter((it) => emp && it.outlets.includes(emp.outletId)
    && (cat === 'all' || (cat === 'best' ? it.bestseller : it.categoryId === cat))
    && (!vegOnly || it.veg)
    && (!q || it.name.toLowerCase().includes(q.toLowerCase()) || it.short.toLowerCase() === q.toLowerCase() || it.code === q)), [menu, emp, cat, q, vegOnly])

  const qtyOf = (id: string) => m.cart.filter((c) => c.itemId === id).reduce((s, c) => s + c.qty, 0)
  const cartQty = m.cart.reduce((s, c) => s + c.qty, 0)
  const cartValue = m.cart.reduce((s, c) => s + lineTotal(c), 0)

  const quickAdd = (it: MenuItem) => {
    if (!it.available) return m.snack(`${it.name} is out of stock`, 'error')
    if (it.variants?.length || it.modifiers?.length) return m.sheet(<CustomizeSheet item={it} />)
    m.setCart((c) => addLine(c, { id: uid('oi'), itemId: it.id, name: it.name, price: it.price, qty: 1, veg: it.veg, gst: it.gst }))
  }
  const dec = (it: MenuItem) => m.setCart((c) => {
    const idx = c.map((x) => x.itemId).lastIndexOf(it.id)
    if (idx < 0) return c
    const line = c[idx]
    return line.qty > 1 ? c.map((x, i) => (i === idx ? { ...x, qty: x.qty - 1 } : x)) : c.filter((_, i) => i !== idx)
  })

  const back = () => {
    if (!m.cart.length) return m.pop()
    m.sheet(
      <BottomSheet title="Discard this order?" onClose={() => m.sheet(null)}
        footer={<div className="flex gap-2"><MButton variant="outline" className="flex-1" onClick={() => m.sheet(null)}>Keep editing</MButton><MButton variant="danger" className="flex-1" onClick={() => { m.setCart(() => []); m.sheet(null); m.pop() }}>Discard</MButton></div>}>
        <p className="text-[13.5px] text-slate-600">{cartQty} item{cartQty > 1 ? 's' : ''} in the cart haven't been sent to the kitchen yet.</p>
      </BottomSheet>,
    )
  }

  return (
    <div className="flex h-full flex-col">
      <MHeader onBack={back} title={<span>Table {table?.label} <span className="text-[13px] font-medium text-slate-400">· {pax} pax</span></span>}
        subtitle={order ? `Adding to ${order.no} · ${order.items.length} items sent` : 'New dine-in order'}
        right={<button onClick={() => setVegOnly((v) => !v)} className={cn('flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-semibold', vegOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500')}><VegMark veg />Veg</button>} />
      <div className="space-y-2.5 border-b border-slate-200/70 bg-white px-4 pb-3 pt-2.5">
        <div className="flex h-11 items-center gap-2 rounded-2xl bg-slate-100 px-3.5">
          <Search className="size-4.5 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes or code…" className="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-slate-400" />
          {q && <button onClick={() => setQ('')}><X className="size-4 text-slate-400" /></button>}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
          <Chip active={cat === 'all'} onClick={() => setCat('all')}>All</Chip>
          <Chip active={cat === 'best'} onClick={() => setCat('best')}><Star className="size-3.5" />Bestsellers</Chip>
          {categories.map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</Chip>)}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-28 no-scrollbar">
        {items.length === 0 && <p className="px-6 py-16 text-center text-[13px] text-slate-500">No dishes match “{q}”.</p>}
        <div className="divide-y divide-slate-100 bg-white">
          {items.map((it) => {
            const qty = qtyOf(it.id)
            const custom = !!(it.variants?.length || it.modifiers?.length)
            return (
              <div key={it.id} onClick={() => it.available && (custom ? m.sheet(<CustomizeSheet item={it} />) : quickAdd(it))}
                className={cn('flex items-center gap-3 px-4 py-3 active:bg-slate-50', !it.available && 'opacity-45')}>
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-[30px]">{it.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <VegMark veg={it.veg} />
                    {it.bestseller && <span className="rounded bg-amber-100 px-1 text-[9.5px] font-bold text-amber-700">BESTSELLER</span>}
                    {it.spicy && <Flame className="size-3.5 text-rose-500" />}
                  </div>
                  <p className="mt-0.5 truncate text-[14.5px] font-semibold text-slate-900">{it.name}</p>
                  <p className="text-[13px] font-semibold text-slate-600">
                    {inr(it.variants?.[0]?.price ?? it.price)}{it.variants?.length ? <span className="font-normal text-slate-400"> onwards</span> : null}
                    {custom && <span className="ml-1.5 text-[11px] font-medium text-brand-600">Customisable</span>}
                  </p>
                </div>
                {!it.available ? <span className="text-[11px] font-semibold text-rose-500">Sold out</span>
                  : qty > 0 && !custom ? <QtyStepper size="sm" qty={qty} onChange={(n) => (n > qty ? quickAdd(it) : dec(it))} />
                  : (
                    <button onClick={(e) => { e.stopPropagation(); quickAdd(it) }}
                      className="relative flex h-9 items-center gap-1 rounded-full border-2 border-brand-500 bg-white px-3.5 text-[13px] font-bold text-brand-600 active:scale-95">
                      <Plus className="size-4" strokeWidth={3} />ADD
                      {qty > 0 && <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-brand-500 text-[10px] text-white">{qty}</span>}
                    </button>
                  )}
              </div>
            )
          })}
        </div>
      </div>

      {cartQty > 0 && (
        <div className="absolute inset-x-3 bottom-5 z-10 animate-slide-up">
          <button onClick={() => m.push({ kind: 'cart', tableId, pax, orderId })}
            className="flex h-14 w-full items-center gap-3 rounded-2xl bg-brand-500 px-4 text-white shadow-xl shadow-brand-600/30 active:scale-[.98]">
            <span className="flex size-9 items-center justify-center rounded-xl bg-white/20"><ShoppingBag className="size-5" /></span>
            <span className="flex-1 text-left">
              <span className="block text-[11.5px] font-medium opacity-90">{cartQty} item{cartQty > 1 ? 's' : ''} added</span>
              <span className="block text-[16px] font-bold tabular">{inr(cartValue)}</span>
            </span>
            <span className="flex items-center gap-0.5 text-[14px] font-bold">View cart<ChevronRight className="size-5" /></span>
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ Customisation sheet */
function CustomizeSheet({ item, edit }: { item: MenuItem; edit?: OrderItem }) {
  const m = useMobile()
  const [variant, setVariant] = useState(edit?.variant ?? item.variants?.[item.variants.length - 1]?.name)
  const [mods, setMods] = useState<Modifier[]>(edit?.modifiers ?? [])
  const [note, setNote] = useState(edit?.note ?? '')
  const [qty, setQty] = useState(edit?.qty ?? 1)
  const base = item.variants?.find((v) => v.name === variant)?.price ?? item.price
  const each = base + mods.reduce((s, x) => s + x.price, 0)
  const toggleMod = (md: Modifier) => setMods((ms) => (ms.some((x) => x.name === md.name) ? ms.filter((x) => x.name !== md.name) : [...ms, md]))
  const toggleNote = (n: string) => {
    const parts = note.split(',').map((x) => x.trim()).filter(Boolean)
    setNote((parts.includes(n) ? parts.filter((x) => x !== n) : [...parts, n]).join(', '))
  }

  const save = () => {
    const line: OrderItem = { id: edit?.id ?? uid('oi'), itemId: item.id, name: item.name, price: base, qty, veg: item.veg, gst: item.gst, variant, modifiers: mods.length ? mods : undefined, note: note.trim() || undefined }
    m.setCart((c) => (edit ? c.map((x) => (x.id === edit.id ? line : x)) : addLine(c, line)))
    m.sheet(null)
    m.snack(`${qty} × ${item.name} ${edit ? 'updated' : 'added'}`)
  }

  return (
    <BottomSheet onClose={() => m.sheet(null)}
      title={<div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-[26px]">{item.emoji}</span><div className="min-w-0"><div className="flex items-center gap-1.5"><VegMark veg={item.veg} /><span className="truncate">{item.name}</span></div><p className="truncate text-[12px] font-normal text-slate-500">{item.description}</p></div></div>}
      footer={
        <div className="flex items-center gap-3">
          <QtyStepper qty={qty} onChange={(n) => setQty(Math.max(1, n))} />
          <MButton variant="accent" className="flex-1" onClick={save}>{edit ? 'Update' : 'Add'} · {inr(each * qty)}</MButton>
        </div>
      }>
      {item.variants?.length ? (
        <div className="mt-2">
          <p className="mb-2 text-[13px] font-bold text-slate-800">Choose portion <span className="font-normal text-rose-500">· required</span></p>
          <div className="space-y-2">
            {item.variants.map((v) => (
              <button key={v.name} onClick={() => setVariant(v.name)} className={cn('flex h-12 w-full items-center gap-3 rounded-2xl border-2 px-4 text-[14px] transition', variant === v.name ? 'border-brand-500 bg-brand-50' : 'border-slate-200')}>
                <span className={cn('flex size-5 items-center justify-center rounded-full border-2', variant === v.name ? 'border-brand-500' : 'border-slate-300')}>{variant === v.name && <span className="size-2.5 rounded-full bg-brand-500" />}</span>
                <span className="flex-1 text-left font-semibold">{v.name}</span>
                <span className="font-semibold tabular">{inr(v.price)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {item.modifiers?.length ? (
        <div className="mt-4">
          <p className="mb-2 text-[13px] font-bold text-slate-800">Add-ons <span className="font-normal text-slate-400">· optional</span></p>
          <div className="space-y-2">
            {item.modifiers.map((md) => {
              const on = mods.some((x) => x.name === md.name)
              return (
                <button key={md.name} onClick={() => toggleMod(md)} className={cn('flex h-12 w-full items-center gap-3 rounded-2xl border-2 px-4 text-[14px] transition', on ? 'border-brand-500 bg-brand-50' : 'border-slate-200')}>
                  <span className={cn('flex size-5 items-center justify-center rounded-md border-2 text-[12px] font-bold text-white', on ? 'border-brand-500 bg-brand-500' : 'border-slate-300')}>{on && '✓'}</span>
                  <span className="flex-1 text-left font-medium">{md.name}</span>
                  <span className="text-slate-500 tabular">{md.price ? '+' + inr(md.price) : 'Free'}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
      <div className="mt-4">
        <p className="mb-2 text-[13px] font-bold text-slate-800">Special instructions</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_NOTES.map((n) => {
            const on = note.split(',').map((x) => x.trim()).includes(n)
            return <button key={n} onClick={() => toggleNote(n)} className={cn('h-8 rounded-full px-3 text-[12.5px] font-semibold transition', on ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600')}>{n}</button>
          })}
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Serve with extra onion rings"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[14px] outline-none focus:border-brand-400 focus:bg-white" />
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ Cart review */
export function CartScreen({ tableId, pax, orderId }: { tableId: string; pax: number; orderId?: string }) {
  const m = useMobile()
  const { emp } = useMe()
  const menu = useStore((s) => s.menu)
  const table = useStore((s) => s.tables.find((t) => t.id === tableId))
  const order = useStore((s) => (orderId ? s.orders.find((o) => o.id === orderId) : undefined))
  const serviceCharge = useStore((s) => s.settings.serviceCharge)
  const { createOrder, updateOrder, sendKot, notify, log } = useStore.getState()
  const [sending, setSending] = useState(false)
  const [noteFor, setNoteFor] = useState<string | null>(null)

  const existing = order?.items.filter((i) => !i.cancelled) ?? []
  const totals = computeTotals({ items: [...existing, ...m.cart], discount: order?.discount ?? { type: 'pct', value: 0 }, serviceCharge: order?.serviceCharge ?? serviceCharge })
  const kotValue = m.cart.reduce((s, c) => s + lineTotal(c), 0)

  const setQty = (id: string, q: number) => m.setCart((c) => (q <= 0 ? c.filter((x) => x.id !== id) : c.map((x) => (x.id === id ? { ...x, qty: q } : x))))

  const send = () => {
    if (!emp || !table || !m.cart.length) return
    setSending(true)
    setTimeout(() => {
      let oid = orderId
      const items = m.cart.map((c) => ({ ...c, id: uid('oi') }))
      if (order) {
        updateOrder(order.id, { items: [...order.items, ...items] })
      } else {
        const o = createOrder({ outletId: emp.outletId, type: 'Dine-in', source: 'Waiter App', tableId, tableLabel: table.label, waiterId: emp.id, waiterName: emp.name, pax, items, status: 'Running' })
        oid = o.id
      }
      const kot = sendKot(oid!)
      const count = items.reduce((s, i) => s + i.qty, 0)
      notify({ title: `New KOT ${kot?.no ?? ''} · Table ${table.label}`, body: `${emp.name} sent ${count} item${count > 1 ? 's' : ''} from the Waiter App`, type: 'order', link: '/kot' })
      log(`${emp.name} ${order ? 'added items to' : 'placed order from Waiter App for'} table ${table.label} (${kot?.no})`, 'pos', 'success', emp.outletId)
      m.setCart(() => [])
      m.reset({ kind: 'success', orderId: oid!, kotNo: kot?.no ?? '-', count })
    }, 700)
  }

  return (
    <div className="flex h-full flex-col">
      <MHeader onBack={m.pop} title="Review order" subtitle={`Table ${table?.label} · ${pax} guests${order ? ' · ' + order.no : ''}`}
        right={m.cart.length > 0 && <button onClick={() => m.setCart(() => [])} className="flex size-9 items-center justify-center rounded-full text-rose-500 active:bg-rose-50"><Trash2 className="size-4.5" /></button>} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-32 pt-3 no-scrollbar">
        <p className="mb-2 px-1 text-[12px] font-bold uppercase tracking-wide text-slate-500">New items · this KOT</p>
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
          {m.cart.length === 0 && <p className="p-6 text-center text-[13px] text-slate-500">Cart is empty</p>}
          {m.cart.map((c) => {
            const item = menu.find((x) => x.id === c.itemId)
            return (
              <div key={c.id} className="px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <VegMark veg={c.veg} className="mt-1" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold text-slate-900">{c.name}</p>
                    {(c.variant || c.modifiers?.length) && <p className="text-[12px] text-slate-500">{[c.variant, ...(c.modifiers?.map((x) => x.name) ?? [])].filter(Boolean).join(' · ')}</p>}
                    <p className="mt-0.5 text-[13px] font-semibold text-slate-700 tabular">{inr(lineTotal(c))}</p>
                  </div>
                  <QtyStepper size="sm" qty={c.qty} onChange={(q) => setQty(c.id, q)} />
                </div>
                {noteFor === c.id ? (
                  <div className="mt-2 flex gap-2">
                    <input autoFocus defaultValue={c.note} placeholder="Note for kitchen" onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur())}
                      onBlur={(e) => { const v = e.target.value.trim(); m.setCart((cs) => cs.map((x) => (x.id === c.id ? { ...x, note: v || undefined } : x))); setNoteFor(null) }}
                      className="h-10 flex-1 rounded-xl border border-brand-300 bg-brand-50/40 px-3 text-[13.5px] outline-none" />
                  </div>
                ) : (
                  <div className="mt-1.5 flex items-center gap-3 pl-6">
                    <button onClick={() => setNoteFor(c.id)} className="flex items-center gap-1 text-[12px] font-semibold text-brand-600">
                      <MessageSquarePlus className="size-3.5" />{c.note ? <span className="italic text-amber-700">“{c.note}”</span> : 'Add note'}
                    </button>
                    {item && (item.variants?.length || item.modifiers?.length) ? <button onClick={() => m.sheet(<CustomizeSheet item={item} edit={c} />)} className="text-[12px] font-semibold text-slate-500">Customise</button> : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <button onClick={m.pop} className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 text-[13.5px] font-semibold text-slate-600 active:bg-slate-100"><Plus className="size-4" />Add more items</button>

        {existing.length > 0 && (
          <>
            <p className="mb-2 mt-5 px-1 text-[12px] font-bold uppercase tracking-wide text-slate-500">Already sent to kitchen</p>
            <div className="divide-y divide-slate-100 rounded-2xl bg-white px-4 ring-1 ring-slate-200/70">
              {existing.map((i) => (
                <div key={i.id} className="flex items-center gap-2 py-2.5 text-[13px] text-slate-600">
                  <VegMark veg={i.veg} /><span className="font-semibold">{i.qty}×</span><span className="min-w-0 flex-1 truncate">{i.name}</span><span className="text-[11px] text-slate-400">{i.kotNo}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-5 space-y-1.5 rounded-2xl bg-white p-4 text-[13.5px] ring-1 ring-slate-200/70">
          <Row label="Subtotal" value={inr(totals.subtotal, true)} />
          {totals.discount > 0 && <Row label="Discount" value={'−' + inr(totals.discount, true)} />}
          <Row label="CGST" value={inr(totals.cgst, true)} />
          <Row label="SGST" value={inr(totals.sgst, true)} />
          {totals.service > 0 && <Row label={`Service charge (${order?.serviceCharge ?? serviceCharge}%)`} value={inr(totals.service, true)} />}
          <Row label="Round off" value={inr(totals.roundOff, true)} />
          <div className="!mt-2.5 flex items-center justify-between border-t border-dashed border-slate-200 pt-2.5 text-[16px] font-bold text-slate-900"><span>Bill total</span><span className="tabular">{inr(totals.total)}</span></div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white px-4 pb-6 pt-3">
        <MButton variant="accent" className="h-14 w-full text-[16px]" disabled={!m.cart.length || sending} onClick={send}>
          {sending ? <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send className="size-5" />}
          {sending ? 'Sending to kitchen…' : `Send to kitchen · ${inr(kotValue)}`}
        </MButton>
      </div>
    </div>
  )
}
const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between text-slate-600"><span>{label}</span><span className="tabular">{value}</span></div>
)

/* ------------------------------------------------------------------ Success */
export function SuccessScreen({ orderId, kotNo, count }: { orderId: string; kotNo: string; count: number }) {
  const m = useMobile()
  const order = useStore((s) => s.orders.find((o) => o.id === orderId))
  return (
    <div className="flex h-full flex-col items-center justify-center bg-white px-8 text-center">
      <AnimatedCheck />
      <p className="mt-6 text-[22px] font-bold text-slate-900 animate-slide-up">Sent to kitchen!</p>
      <p className="mt-1 text-[14px] text-slate-500">{count} item{count > 1 ? 's' : ''} for Table {order?.tableLabel}</p>
      <div className="mt-6 w-full rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
        <div className="flex items-center justify-between text-[13px]"><span className="text-slate-500">KOT number</span><span className="text-[18px] font-extrabold tracking-wide text-navy-900">{kotNo}</span></div>
        <div className="mt-2 flex items-center justify-between text-[13px]"><span className="text-slate-500">Order</span><span className="font-semibold">{order?.no}</span></div>
        <div className="mt-2 flex items-center justify-between text-[13px]"><span className="text-slate-500">Bill so far</span><span className="font-semibold tabular">{order ? inr(computeTotals(order).total) : '-'}</span></div>
        <p className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2 text-[12px] font-semibold text-emerald-700"><ChefHat className="size-4" />Live on kitchen display & POS</p>
      </div>
      <div className="mt-8 flex w-full flex-col gap-2.5">
        <MButton variant="primary" className="w-full" onClick={() => m.reset({ kind: 'order', orderId })}>Track order</MButton>
        <MButton variant="outline" className="w-full" onClick={() => m.setTab('tables')}>New order</MButton>
      </div>
    </div>
  )
}
