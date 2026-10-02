import { ChevronLeft, NotebookPen, Plus, Users } from 'lucide-react'
import type { MenuCategory, Totals } from '@/types'
import { VegMark } from '@/components/ui'
import { cn, inr } from '@/lib/format'
import { FoodArt, QtyStepper } from './bits'
import { unitPrice, type CartLine } from './qrSession'

export function CartScreen({ lines, categories, totals, serviceCharge, tableLabel, embedded, note, setNote, pax, setPax, onQty, onBack, onPlace, placing, appending }: {
  lines: CartLine[]; categories: MenuCategory[]; totals: Totals; serviceCharge: number; tableLabel: string; embedded?: boolean
  note: string; setNote: (v: string) => void; pax: number; setPax: (v: number) => void
  onQty: (key: string, qty: number) => void; onBack: () => void; onPlace: () => void; placing: boolean; appending: boolean
}) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex items-center gap-2 bg-white px-4 pb-3 shadow-[0_4px_16px_-10px_rgba(15,42,74,.35)]', embedded ? 'pt-11' : 'pt-3')}>
        <button onClick={onBack} className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-700"><ChevronLeft className="size-5" /></button>
        <div>
          <div className="text-[16px] font-bold text-navy-900">Your cart</div>
          <div className="text-[11.5px] font-medium text-brand-600">Table {tableLabel} · {totals.qty} items</div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-32 pt-4">
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
          {lines.map((l) => (
            <div key={l.key} className="flex gap-3 border-b border-dashed border-slate-200 px-4 py-3.5 last:border-0">
              <FoodArt emoji={l.item.emoji} color={categories.find((c) => c.id === l.item.categoryId)?.color} className="size-14 shrink-0 rounded-xl" size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[14px] font-semibold text-slate-900"><VegMark veg={l.item.veg} /><span className="truncate">{l.item.name}</span></div>
                {(l.variant || l.modifiers.length > 0) && (
                  <div className="mt-0.5 text-[11.5px] text-slate-500">{[l.variant?.name, ...l.modifiers.map((m) => m.name)].filter(Boolean).join(' · ')}</div>
                )}
                {l.note && <div className="mt-0.5 text-[11.5px] italic text-amber-700">“{l.note}”</div>}
                <div className="mt-1.5 flex items-center justify-between">
                  <QtyStepper value={l.qty} onChange={(v) => onQty(l.key, v)} size="sm" />
                  <span className="text-[14px] font-bold text-slate-900">{inr(unitPrice(l) * l.qty)}</span>
                </div>
              </div>
            </div>
          ))}
          <button onClick={onBack} className="flex w-full items-center gap-2 px-4 py-3 text-[13.5px] font-semibold text-brand-600"><Plus className="size-4" />Add more items</button>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <label className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-800"><NotebookPen className="size-4 text-slate-400" />Note for the kitchen</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Allergies, spice level, serve starters first…"
            className="mt-2 w-full resize-none rounded-2xl bg-slate-50 px-3.5 py-2.5 text-[13.5px] outline-none ring-1 ring-slate-200 focus:ring-brand-300" />
          <div className="mt-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-800"><Users className="size-4 text-slate-400" />Guests at table</span>
            <QtyStepper value={pax} onChange={(v) => setPax(Math.max(1, Math.min(20, v)))} size="sm" />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <h4 className="mb-2 text-[14px] font-bold text-slate-900">Bill summary</h4>
          <div className="space-y-1.5 text-[13px] text-slate-600">
            <div className="flex justify-between"><span>Item total</span><span>{inr(totals.subtotal, true)}</span></div>
            <div className="flex justify-between"><span>CGST</span><span>{inr(totals.cgst, true)}</span></div>
            <div className="flex justify-between"><span>SGST</span><span>{inr(totals.sgst, true)}</span></div>
            {totals.service > 0 && <div className="flex justify-between"><span>Service charge ({serviceCharge}%)</span><span>{inr(totals.service, true)}</span></div>}
            {Math.abs(totals.roundOff) > 0.001 && <div className="flex justify-between text-slate-400"><span>Round off</span><span>{totals.roundOff > 0 ? '+' : ''}{totals.roundOff.toFixed(2)}</span></div>}
            <div className="mt-2 flex justify-between border-t border-dashed border-slate-200 pt-2.5 text-[16px] font-extrabold text-navy-900"><span>To pay</span><span>{inr(totals.total)}</span></div>
          </div>
        </div>
        <p className="px-2 text-center text-[11px] text-slate-400">Pay at the table after your meal · UPI, cards & cash accepted</p>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-slate-100 bg-white/95 px-4 pb-4 pt-3 backdrop-blur">
        <button onClick={onPlace} disabled={placing || !lines.length}
          className="flex h-14 w-full items-center justify-between rounded-2xl bg-navy-900 px-5 text-white shadow-xl shadow-navy-900/25 active:scale-[.99] disabled:opacity-60">
          <span className="text-left"><span className="block text-[16px] font-extrabold">{inr(totals.total)}</span><span className="block text-[10.5px] uppercase tracking-wide text-white/60">Total incl. taxes</span></span>
          <span className="text-[15px] font-bold">{placing ? 'Sending to kitchen…' : appending ? 'Add to my order →' : 'Place order →'}</span>
        </button>
      </div>
    </div>
  )
}
