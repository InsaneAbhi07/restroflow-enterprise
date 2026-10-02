import { useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Flame, Search, ShoppingBag, Star, X } from 'lucide-react'
import type { MenuCategory, MenuItem } from '@/types'
import { VegMark } from '@/components/ui'
import { cn, inr } from '@/lib/format'
import { FoodArt, QtyStepper } from './bits'

export type VegFilter = 'all' | 'veg' | 'nonveg'

export function MenuScreen({ items, categories, outletName, tableLabel, embedded, veg, setVeg, qtyOf, onAdd, onDec, onBack, cartCount, cartTotal, onViewCart, hasActiveOrder, onTrack }: {
  items: MenuItem[]; categories: MenuCategory[]; outletName: string; tableLabel: string; embedded?: boolean
  veg: VegFilter; setVeg: (v: VegFilter) => void
  qtyOf: (itemId: string) => number; onAdd: (m: MenuItem) => void; onDec: (m: MenuItem) => void
  onBack: () => void; cartCount: number; cartTotal: number; onViewCart: () => void; hasActiveOrder: boolean; onTrack: () => void
}) {
  const [q, setQ] = useState('')
  const [activeCat, setActiveCat] = useState('top')
  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const filtered = useMemo(() => items.filter((m) => {
    const s = q.trim().toLowerCase()
    return (!s || m.name.toLowerCase().includes(s) || (m.description ?? '').toLowerCase().includes(s)) && (veg === 'all' || (veg === 'veg') === m.veg)
  }), [items, q, veg])
  const best = filtered.filter((m) => m.bestseller && m.available)
  const sections = [
    ...(best.length && !q ? [{ id: 'top', name: 'Recommended', color: '#14a891', items: best }] : []),
    ...categories.map((c) => ({ id: c.id, name: c.name, color: c.color, items: filtered.filter((m) => m.categoryId === c.id) })).filter((s) => s.items.length),
  ]
  const colorOf = (m: MenuItem) => categories.find((c) => c.id === m.categoryId)?.color

  const jump = (id: string) => {
    setActiveCat(id)
    const el = sectionRefs.current[id]
    if (el && scrollRef.current) scrollRef.current.scrollTo({ top: el.offsetTop - 4, behavior: 'smooth' })
  }
  const onScroll = () => {
    const top = scrollRef.current?.scrollTop ?? 0
    let cur = sections[0]?.id
    for (const s of sections) { const el = sectionRefs.current[s.id]; if (el && el.offsetTop - 20 <= top) cur = s.id }
    if (cur && cur !== activeCat) setActiveCat(cur)
  }

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className={cn('z-10 bg-white shadow-[0_4px_16px_-10px_rgba(15,42,74,.35)]', embedded ? 'pt-11' : 'pt-3')}>
        <div className="flex items-center gap-2 px-4 pb-2.5">
          <button onClick={onBack} className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-700"><ChevronLeft className="size-5" /></button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold text-navy-900">{outletName}</div>
            <div className="text-[11.5px] font-medium text-brand-600">Table {tableLabel} · Dine-in</div>
          </div>
          {hasActiveOrder && <button onClick={onTrack} className="rounded-full bg-brand-50 px-3 py-1.5 text-[12px] font-semibold text-brand-700 ring-1 ring-brand-200">Track order</button>}
        </div>
        <div className="px-4 pb-2.5">
          <div className="flex h-11 items-center gap-2 rounded-2xl bg-slate-100 px-3.5">
            <Search className="size-4.5 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for dishes" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-slate-400" />
            {q && <button onClick={() => setQ('')}><X className="size-4 text-slate-400" /></button>}
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 pb-2">
          {(['veg', 'nonveg'] as const).map((v) => (
            <button key={v} onClick={() => setVeg(veg === v ? 'all' : v)}
              className={cn('flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold transition', veg === v ? (v === 'veg' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-amber-600 bg-amber-50 text-amber-800') : 'border-slate-200 text-slate-600')}>
              <VegMark veg={v === 'veg'} />{v === 'veg' ? 'Veg' : 'Non-veg'}{veg === v && <X className="size-3" />}
            </button>
          ))}
          <span className="ml-auto text-[11.5px] text-slate-400">{filtered.length} dishes</span>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
          {sections.map((s) => (
            <button key={s.id} onClick={() => jump(s.id)}
              className={cn('whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition', activeCat === s.id ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600')}>
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* list */}
      <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 overflow-y-auto pb-28">
        {sections.length === 0 && <div className="px-6 py-16 text-center text-[14px] text-slate-500">No dishes match “{q}”.</div>}
        {sections.map((s) => (
          <section key={s.id} ref={(el) => { sectionRefs.current[s.id] = el }} className="px-4 pt-5">
            <h3 className="mb-1 flex items-center gap-2 text-[16px] font-extrabold text-navy-900">
              {s.id === 'top' && <Star className="size-4 fill-amber-400 text-amber-400" />}{s.name}
              <span className="text-[12px] font-medium text-slate-400">({s.items.length})</span>
            </h3>
            <div className="divide-y divide-dashed divide-slate-200">
              {s.items.map((m) => {
                const qty = qtyOf(m.id)
                const custom = !!(m.variants?.length || m.modifiers?.length)
                return (
                  <div key={s.id + m.id} className={cn('flex gap-3 py-4', !m.available && 'opacity-55')}>
                    <div className="min-w-0 flex-1" onClick={() => m.available && onAdd(m)}>
                      <div className="flex items-center gap-1.5">
                        <VegMark veg={m.veg} />
                        {m.bestseller && <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-800"><Star className="size-2.5 fill-amber-500 text-amber-500" />Bestseller</span>}
                        {m.spicy && <Flame className="size-3.5 text-rose-500" />}
                      </div>
                      <div className="mt-1 text-[15px] font-bold leading-snug text-slate-900">{m.name}</div>
                      <div className="mt-0.5 text-[14px] font-semibold text-slate-800">{inr(m.variants?.[0]?.price ?? m.price)}{m.variants?.length ? <span className="text-[11.5px] font-normal text-slate-400"> onwards</span> : null}</div>
                      <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-slate-500">{m.description}</p>
                    </div>
                    <div className="relative w-[112px] shrink-0">
                      <FoodArt emoji={m.emoji} color={colorOf(m)} className="h-[104px] w-[112px] rounded-2xl" size={46} />
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                        {!m.available ? (
                          <span className="block whitespace-nowrap rounded-xl bg-white px-3 py-2 text-[12px] font-bold text-slate-400 shadow-md ring-1 ring-slate-200">Sold out</span>
                        ) : qty > 0 ? (
                          <QtyStepper value={qty} onChange={(v) => (v > qty ? onAdd(m) : onDec(m))} size="sm" className="shadow-md" />
                        ) : (
                          <button onClick={() => onAdd(m)} className="flex h-9 w-[92px] items-center justify-center rounded-xl border border-brand-500 bg-white text-[14px] font-extrabold text-brand-600 shadow-md active:scale-95">ADD</button>
                        )}
                      </div>
                      {custom && m.available && <div className="mt-4 text-center text-[10px] text-slate-400">customisable</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
        <p className="px-6 pb-4 pt-8 text-center text-[11px] text-slate-400">Prices exclusive of GST · Service charge applicable on dine-in</p>
      </div>

      {/* floating cart bar */}
      {cartCount > 0 && (
        <button onClick={onViewCart}
          className="absolute inset-x-3 bottom-3 z-20 flex h-14 items-center justify-between rounded-2xl bg-brand-600 px-4 text-white shadow-xl shadow-brand-700/30 animate-slide-up active:scale-[.99]">
          <span className="text-left">
            <span className="block text-[11.5px] font-medium uppercase tracking-wide text-white/80">{cartCount} item{cartCount > 1 ? 's' : ''} added</span>
            <span className="block text-[16px] font-extrabold">{inr(cartTotal)} <span className="text-[11px] font-medium text-white/70">+ taxes</span></span>
          </span>
          <span className="flex items-center gap-1.5 text-[15px] font-bold"><ShoppingBag className="size-4.5" />View cart<ChevronRight className="size-4" /></span>
        </button>
      )}
    </div>
  )
}
