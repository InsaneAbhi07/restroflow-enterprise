import { useState } from 'react'
import { Check, Flame, Star, X } from 'lucide-react'
import type { MenuItem, Modifier, Variant } from '@/types'
import { VegMark } from '@/components/ui'
import { cn, inr } from '@/lib/format'
import { FoodArt, QtyStepper } from './bits'
import { unitPrice } from './qrSession'

export function ItemSheet({ item, color, onClose, onAdd }: {
  item: MenuItem; color?: string; onClose: () => void
  onAdd: (v: { variant?: Variant; modifiers: Modifier[]; note: string; qty: number }) => void
}) {
  const [variant, setVariant] = useState<Variant | undefined>(item.variants?.[item.variants.length - 1])
  const [mods, setMods] = useState<Modifier[]>([])
  const [note, setNote] = useState('')
  const [qty, setQty] = useState(1)
  const price = unitPrice({ item, variant, modifiers: mods }) * qty

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-navy-950/50 animate-fade-in" onClick={onClose}>
      <div className="flex max-h-[88%] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <FoodArt emoji={item.emoji} color={color} className="h-40" size={84} />
          <button onClick={onClose} className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow"><X className="size-4.5" /></button>
          <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/70" />
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-4">
          <div className="flex items-center gap-2">
            <VegMark veg={item.veg} />
            {item.bestseller && <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-800"><Star className="size-2.5 fill-amber-500 text-amber-500" />BESTSELLER</span>}
            {item.spicy && <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10.5px] font-bold text-rose-600"><Flame className="size-2.5" />SPICY</span>}
          </div>
          <h3 className="mt-1.5 text-[19px] font-bold text-slate-900">{item.name}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{item.description}</p>

          {item.variants?.length ? (
            <section className="mt-5">
              <div className="mb-2 flex items-center justify-between"><h4 className="text-[14px] font-bold text-slate-900">Choose portion</h4><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-500">REQUIRED</span></div>
              <div className="space-y-2">
                {item.variants.map((v) => (
                  <button key={v.name} onClick={() => setVariant(v)} className={cn('flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition', variant?.name === v.name ? 'border-brand-500 bg-brand-50/60' : 'border-slate-200')}>
                    <span className="flex items-center gap-3">
                      <span className={cn('flex size-5 items-center justify-center rounded-full border-2', variant?.name === v.name ? 'border-brand-500' : 'border-slate-300')}>{variant?.name === v.name && <span className="size-2.5 rounded-full bg-brand-500" />}</span>
                      <span className="text-[14px] font-medium text-slate-800">{v.name}</span>
                    </span>
                    <span className="text-[14px] font-semibold text-slate-700">{inr(v.price)}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {item.modifiers?.length ? (
            <section className="mt-5">
              <div className="mb-2 flex items-center justify-between"><h4 className="text-[14px] font-bold text-slate-900">Add-ons & preferences</h4><span className="text-[11px] text-slate-400">Optional</span></div>
              <div className="space-y-2">
                {item.modifiers.map((m) => {
                  const on = mods.some((x) => x.name === m.name)
                  return (
                    <button key={m.name} onClick={() => setMods(on ? mods.filter((x) => x.name !== m.name) : [...mods, m])} className={cn('flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition', on ? 'border-brand-500 bg-brand-50/60' : 'border-slate-200')}>
                      <span className="flex items-center gap-3">
                        <span className={cn('flex size-5 items-center justify-center rounded-md border-2', on ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300')}>{on && <Check className="size-3.5" strokeWidth={3} />}</span>
                        <span className="text-[14px] text-slate-800">{m.name}</span>
                      </span>
                      <span className="text-[13px] font-medium text-slate-500">{m.price ? `+${inr(m.price)}` : 'Free'}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : null}

          <section className="mt-5">
            <h4 className="mb-2 text-[14px] font-bold text-slate-900">Cooking instructions</h4>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={120} placeholder="e.g. Less oil, no onion, make it extra crispy"
              className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-[14px] outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
          </section>
        </div>
        <div className="flex items-center gap-3 border-t border-slate-100 bg-white px-5 py-3.5">
          <QtyStepper value={qty} onChange={(v) => setQty(Math.max(1, Math.min(20, v)))} size="lg" />
          <button onClick={() => onAdd({ variant, modifiers: mods, note, qty })}
            className="flex h-12 flex-1 items-center justify-between rounded-xl bg-brand-500 px-4 text-[15px] font-bold text-white shadow-lg shadow-brand-500/30 active:scale-[.98]">
            <span>Add item</span><span>{inr(price)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
