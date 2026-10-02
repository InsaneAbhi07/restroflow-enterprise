import type React from 'react'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { LayoutGrid, Rows3, Star, Zap, Hash, Delete, Leaf, CornerDownLeft } from 'lucide-react'
import { DynIcon, Kbd, Segmented, VegMark, Toggle } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { cn, inr } from '@/lib/format'
import type { MenuItem } from '@/types'
import { defaultVariant, parseQuick, searchMenu } from './posUtils'
import { usePosUI, type PosView } from './posStore'

export interface MenuPanelHandle { focus: (initial?: string) => void }

export const MenuPanel = forwardRef<MenuPanelHandle, {
  outletId: string; cartQty: Record<string, number>; disabled?: boolean
  onTile: (m: MenuItem, qty: number) => void; onQuick: (m: MenuItem, qty: number) => void
}>(function MenuPanel({ outletId, cartQty, disabled, onTile, onQuick }, ref) {
  const menu = useStore((s) => s.menu)
  const categories = useStore((s) => s.categories)
  const settings = useStore((s) => s.settings.pos)
  const { view: viewPref, setView, vegOnly, setVegOnly } = usePosUI()
  const view: PosView = viewPref ?? (settings.compactTiles ? 'compact' : 'grid')
  const [cat, setCat] = useState<string>('all')
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const [focused, setFocused] = useState(false)
  const [padOpen, setPadOpen] = useState(false)
  const [nextQty, setNextQty] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => ({
    focus: (initial?: string) => {
      if (initial !== undefined) setQ(initial)
      inputRef.current?.focus()
      if (initial === undefined) inputRef.current?.select()
    },
  }))

  const outletMenu = useMemo(() => menu.filter((m) => m.outlets.includes(outletId) && (!vegOnly || m.veg)), [menu, outletId, vegOnly])
  const parsed = parseQuick(q)
  const matches = useMemo(() => searchMenu(outletMenu, parsed.term, 8), [outletMenu, parsed.term])
  useEffect(() => setHi(0), [q])

  const shown = useMemo(() => {
    if (parsed.term) return searchMenu(outletMenu, parsed.term, 80)
    if (cat === 'all') return outletMenu
    if (cat === 'fav') return outletMenu.filter((m) => m.bestseller)
    return outletMenu.filter((m) => m.categoryId === cat)
  }, [outletMenu, cat, parsed.term])

  const counts = useMemo(() => outletMenu.reduce<Record<string, number>>((a, m) => ({ ...a, [m.categoryId]: (a[m.categoryId] ?? 0) + 1 }), {}), [outletMenu])
  const favCount = outletMenu.filter((m) => m.bestseller).length

  const quickAdd = (m: MenuItem | undefined) => {
    if (!m) return
    onQuick(m, parsed.qty)
    setQ('')
    inputRef.current?.focus()
  }
  const tileClick = (m: MenuItem) => {
    const qty = Math.max(1, parseInt(nextQty) || 1)
    onTile(m, qty)
    setNextQty('')
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(matches.length - 1, h + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); quickAdd(matches[hi]) }
    else if (e.key === 'Escape' && q) { e.preventDefault(); e.stopPropagation(); setQ('') }
  }

  const color = (id: string) => categories.find((c) => c.id === id)?.color ?? '#64748b'

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      {/* ---------------- category rail ---------------- */}
      <aside className="flex w-[168px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
          <CatBtn active={cat === 'all'} onClick={() => setCat('all')} icon={<LayoutGrid className="size-3.5" />} color="#0f2a4a" label="All items" count={outletMenu.length} />
          <CatBtn active={cat === 'fav'} onClick={() => setCat('fav')} icon={<Star className="size-3.5 fill-current" />} color="#d97706" label="Bestsellers" count={favCount} />
          <div className="mx-2 my-1.5 h-px bg-slate-100" />
          {categories.map((c) => (
            <CatBtn key={c.id} active={cat === c.id} onClick={() => setCat(c.id)} icon={<DynIcon name={c.icon} className="size-3.5" />} color={c.color} label={c.name} count={counts[c.id] ?? 0} />
          ))}
        </div>
        <div className="border-t border-slate-100 p-2 text-[10.5px] leading-relaxed text-slate-400">
          <div className="flex justify-between"><span>Search</span><Kbd>F2</Kbd></div>
          <div className="flex justify-between"><span>KOT</span><Kbd>F9</Kbd></div>
          <div className="flex justify-between"><span>Settle</span><Kbd>F4</Kbd></div>
          <div className="flex justify-between"><span>Qty last item</span><Kbd>+ / −</Kbd></div>
        </div>
      </aside>

      {/* ---------------- items ---------------- */}
      <section className="flex min-w-0 flex-1 flex-col bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-3 pt-2.5 pb-1.5">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Zap className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-brand-500" />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} disabled={disabled}
                onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 120)}
                placeholder="Search item, code or short code…  e.g. 113, PBM, 2*PBM"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-14 text-[14px] font-medium text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100" />
              <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                {parsed.qty > 1 && parsed.term && <span className="rounded bg-brand-500 px-1.5 text-[11px] font-bold text-white">×{parsed.qty}</span>}
                <Kbd>F2</Kbd>
              </span>
              {focused && q.trim() && (
                <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop animate-pop">
                  {matches.length === 0 ? (
                    <div className="px-3 py-3 text-[12px] text-slate-500">No item matches “{parsed.term}”</div>
                  ) : matches.map((m, i) => {
                    const v = defaultVariant(m)
                    return (
                      <button key={m.id} onMouseDown={(e) => { e.preventDefault(); quickAdd(m) }} onMouseEnter={() => setHi(i)}
                        className={cn('flex w-full items-center gap-2.5 px-3 py-1.5 text-left', i === hi ? 'bg-brand-50' : 'hover:bg-slate-50', !m.available && 'opacity-50')}>
                        <span className="w-9 font-mono text-[11px] text-slate-400">#{m.code}</span>
                        <span className="w-10 rounded bg-slate-100 px-1 text-center font-mono text-[10.5px] font-semibold text-slate-600">{m.short}</span>
                        <VegMark veg={m.veg} />
                        <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{m.name}{v && <span className="font-normal text-slate-400"> · {v.name}</span>}</span>
                        {!m.available && <span className="text-[10.5px] font-semibold text-rose-500">SOLD OUT</span>}
                        <span className="text-slate-600 tabular">{parsed.qty > 1 && <span className="text-brand-600">{parsed.qty} × </span>}{inr(v?.price ?? m.price)}</span>
                        {i === hi && <CornerDownLeft className="size-3.5 text-brand-500" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <Segmented size="md" value={view} onChange={setView} items={[{ value: 'grid', label: 'Grid', icon: <LayoutGrid className="size-3.5" /> }, { value: 'compact', label: 'Express', icon: <Rows3 className="size-3.5" /> }]} />
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] font-medium text-slate-600" title="Veg only">
              <Leaf className="size-3.5 text-emerald-600" /><span className="hidden xl:inline">Veg</span>
              <Toggle size="sm" checked={vegOnly} onChange={setVegOnly} />
            </label>
            {view === 'compact' && (
              <div className="relative">
                <button onClick={() => setPadOpen((v) => !v)} className={cn('flex h-8 items-center gap-1 rounded-lg border px-2 text-[12px] font-semibold', nextQty ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                  <Hash className="size-3.5" />Qty{nextQty && ` ×${nextQty}`}
                </button>
                {padOpen && <QtyPad value={nextQty} onChange={setNextQty} onClose={() => setPadOpen(false)} />}
              </div>
            )}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Zap className="size-3 text-brand-500" /> Type code / short code • <b className="font-mono text-slate-500">2*PBM</b> or <b className="font-mono text-slate-500">3 113</b> for qty • ↑↓ select • <Kbd>Enter</Kbd> to add
            <span className="ml-auto">{shown.length} items</span>
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {shown.length === 0 && <div className="py-16 text-center text-[13px] text-slate-400">No items found</div>}
          <div className={cn('grid gap-2', view === 'grid' ? 'grid-cols-[repeat(auto-fill,minmax(128px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(150px,1fr))]')}>
            {shown.map((m) => {
              const c = color(m.categoryId)
              const inCart = cartQty[m.id]
              const v = defaultVariant(m)
              if (view === 'compact') return (
                <button key={m.id} disabled={!m.available || disabled} onClick={() => tileClick(m)}
                  className="group relative flex h-[58px] flex-col justify-between rounded-lg border border-slate-200 bg-white py-1.5 pr-2 pl-2.5 text-left transition hover:border-brand-300 hover:shadow-sm active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ borderLeft: `3px solid ${c}` }}>
                  <span className="flex items-start gap-1.5">
                    <VegMark veg={m.veg} className="mt-0.5" />
                    <span className="line-clamp-1 text-[12.5px] font-semibold leading-tight text-slate-800">{m.name}</span>
                  </span>
                  <span className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-400">{m.code}·{m.short}</span>
                    <span className="font-semibold text-slate-700 tabular">{m.available ? inr(v?.price ?? m.price) : <span className="text-rose-500">Sold out</span>}</span>
                  </span>
                  {inCart ? <QtyBadge n={inCart} /> : null}
                </button>
              )
              return (
                <button key={m.id} disabled={!m.available || disabled} onClick={() => tileClick(m)}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition hover:-translate-y-px hover:border-brand-300 hover:shadow-md active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0">
                  {settings.showImages && (
                    <div className="relative flex h-[62px] items-center justify-center text-[30px]" style={{ background: c + '14' }}>
                      <span className={cn('transition group-hover:scale-110', !m.available && 'grayscale')}>{m.emoji}</span>
                      {m.bestseller && <Star className="absolute left-1.5 top-1.5 size-3.5 fill-amber-400 text-amber-400" />}
                      {!m.available && <span className="absolute inset-x-0 bottom-0 bg-rose-600/90 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-white">Sold out</span>}
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-1 p-2">
                    <div className="flex items-start gap-1.5">
                      <VegMark veg={m.veg} className="mt-0.5" />
                      <span className="line-clamp-2 text-[12.5px] font-semibold leading-tight text-slate-800">{m.name}</span>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-[13px] font-bold text-navy-900 tabular">{inr(v?.price ?? m.price)}</span>
                      <span className="rounded bg-slate-100 px-1 font-mono text-[10px] text-slate-500">#{m.code} · {m.short}</span>
                    </div>
                    {(m.variants?.length || m.modifiers?.length) ? <span className="text-[10px] text-brand-600">{m.variants?.length ? m.variants.map((x) => x.name).join(' / ') : 'Customisable'}</span> : null}
                  </div>
                  {inCart ? <QtyBadge n={inCart} /> : null}
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
})

const QtyBadge = ({ n }: { n: number }) => (
  <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-white shadow ring-2 ring-white">{n}</span>
)

function CatBtn({ active, onClick, icon, color, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; color: string; label: string; count: number }) {
  return (
    <button onClick={onClick}
      className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[12.5px] font-medium transition', active ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100')}>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md" style={{ background: active ? 'rgba(255,255,255,.15)' : color + '18', color: active ? '#fff' : color }}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className={cn('text-[10.5px] tabular', active ? 'text-white/70' : 'text-slate-400')}>{count}</span>
    </button>
  )
}

function QtyPad({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.parentElement?.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  const press = (k: string) => onChange((value + k).replace(/^0+/, '').slice(0, 2))
  return (
    <div ref={ref} className="absolute right-0 top-full z-40 mt-1.5 w-[180px] rounded-xl border border-slate-200 bg-white p-2 shadow-pop animate-pop">
      <div className="mb-2 flex h-9 items-center justify-between rounded-lg bg-slate-900 px-3 font-mono text-[18px] font-bold text-white">
        <span className="text-[10px] font-normal text-slate-400">NEXT QTY</span>{value || '1'}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <button key={k} onClick={() => press(k)} className="h-9 rounded-lg bg-slate-100 text-[15px] font-semibold text-slate-800 hover:bg-slate-200 active:scale-95">{k}</button>
        ))}
        <button onClick={() => onChange('')} className="h-9 rounded-lg bg-rose-50 text-[12px] font-semibold text-rose-600 hover:bg-rose-100">C</button>
        <button onClick={() => press('0')} className="h-9 rounded-lg bg-slate-100 text-[15px] font-semibold text-slate-800 hover:bg-slate-200">0</button>
        <button onClick={() => onChange(value.slice(0, -1))} className="flex h-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"><Delete className="size-4" /></button>
      </div>
      <button onClick={onClose} className="mt-1 h-8 w-full rounded-lg bg-brand-500 text-[12px] font-semibold text-white hover:bg-brand-600">Set — then tap an item</button>
    </div>
  )
}
