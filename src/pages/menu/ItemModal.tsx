import { useEffect, useState } from 'react'
import { Plus, Trash2, UtensilsCrossed } from 'lucide-react'
import type { MenuItem, Modifier, Variant } from '@/types'
import { useStore } from '@/store/useStore'
import { toast } from '@/store/toast'
import { Button, Checkbox, Field, Input, Modal, Segmented, Select, Textarea, Toggle, VegMark } from '@/components/ui'
import { cn, uid } from '@/lib/format'
import { useShortcut } from '@/lib/shortcuts'

export const FOOD_EMOJIS = ['🍛', '🍲', '🥘', '🍜', '🍝', '🍚', '🍱', '🥗', '🥙', '🌯', '🌮', '🍔', '🍕', '🥪', '🍟', '🍗', '🍖', '🥩', '🐟', '🦐', '🍤', '🥚', '🧀', '🥬', '🌽', '🍅', '🥔', '🍄', '🌶️', '🫘', '🫓', '🥯', '🥟', '🍢', '🍡', '🥣', '🍮', '🍨', '🍦', '🍰', '🧁', '🍫', '🍩', '🟤', '☕', '🍵', '🥤', '🧃', '🥛', '🍹', '🍋', '🥭', '🍉', '🫖']
export const STATIONS: MenuItem['station'][] = ['Kitchen', 'Tandoor', 'Chinese', 'Bar', 'Desserts']

const blank = (categoryId: string, outlets: string[], code: string): MenuItem => ({
  id: uid('m'), code, short: '', name: '', categoryId, price: 0, veg: true, emoji: '🍛', gst: 5, available: true,
  variants: [], modifiers: [], outlets, station: 'Kitchen', description: '', bestseller: false, spicy: false,
})

export function ItemModal({ open, item, onClose }: { open: boolean; item: MenuItem | null; onClose: () => void }) {
  const categories = useStore((s) => s.categories)
  const outlets = useStore((s) => s.outlets)
  const menu = useStore((s) => s.menu)
  const upsert = useStore((s) => s.upsertMenuItem)
  const log = useStore((s) => s.log)
  const nextCode = String(Math.max(100, ...menu.map((m) => Number(m.code) || 0)) + 1)
  const [d, setD] = useState<MenuItem>(() => item ?? blank(categories[0]?.id ?? '', outlets.map((o) => o.id), nextCode))
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setD(item ? JSON.parse(JSON.stringify(item)) : blank(categories[0]?.id ?? '', outlets.map((o) => o.id), nextCode))
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item])

  const set = <K extends keyof MenuItem>(k: K, v: MenuItem[K]) => setD((x) => ({ ...x, [k]: v }))
  const setVariant = (i: number, patch: Partial<Variant>) => set('variants', (d.variants ?? []).map((v, j) => (j === i ? { ...v, ...patch } : v)))
  const setModifier = (i: number, patch: Partial<Modifier>) => set('modifiers', (d.modifiers ?? []).map((v, j) => (j === i ? { ...v, ...patch } : v)))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!d.name.trim()) e.name = 'Item name is required'
    else if (menu.some((m) => m.id !== d.id && m.name.toLowerCase() === d.name.trim().toLowerCase())) e.name = 'An item with this name already exists'
    if (!d.short.trim()) e.short = 'Short code required'
    else if (menu.some((m) => m.id !== d.id && m.short.toLowerCase() === d.short.trim().toLowerCase())) e.short = 'Short code already used'
    if (!/^\d+$/.test(d.code)) e.code = 'Numeric code only'
    else if (menu.some((m) => m.id !== d.id && m.code === d.code)) e.code = 'Code already used'
    if (!(d.price > 0)) e.price = 'Enter a price greater than 0'
    if (!d.categoryId) e.category = 'Choose a category'
    if (!d.outlets.length) e.outlets = 'Select at least one outlet'
    if ((d.variants ?? []).some((v) => !v.name.trim() || !(v.price > 0))) e.variants = 'Every variant needs a name and price'
    if ((d.modifiers ?? []).some((v) => !v.name.trim() || v.price < 0)) e.modifiers = 'Every modifier needs a name'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = () => {
    if (!validate()) { toast.error('Please fix the highlighted fields'); return }
    const clean: MenuItem = {
      ...d, name: d.name.trim(), short: d.short.trim().toUpperCase(),
      variants: d.variants?.length ? d.variants : undefined, modifiers: d.modifiers?.length ? d.modifiers : undefined,
    }
    upsert(clean)
    log(`${item ? 'Updated' : 'Added'} menu item ${clean.name} (₹${clean.price})`, 'menu', 'success')
    toast.success(item ? 'Item updated' : 'Item added', `${clean.emoji} ${clean.name} · synced to all POS & QR menus`)
    onClose()
  }

  useShortcut('save', save, open)

  return (
    <Modal open={open} onClose={onClose} size="lg" icon={<UtensilsCrossed />} title={item ? `Edit ${item.name}` : 'Add menu item'} subtitle="Changes sync instantly to POS, waiter app & QR menu"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" kbd="Ctrl+S" onClick={save}>{item ? 'Save changes' : 'Add item'}</Button></>}>
      <div className="grid gap-5 md:grid-cols-[1fr_220px]">
        <div className="space-y-3">
          <div className="grid grid-cols-6 gap-3">
            <Field label="Item name" required error={errors.name} className="col-span-6 sm:col-span-4"><Input value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Paneer Lababdar" autoFocus /></Field>
            <Field label="Short code" required error={errors.short} className="col-span-3 sm:col-span-1"><Input value={d.short} onChange={(e) => set('short', e.target.value.toUpperCase())} maxLength={5} /></Field>
            <Field label="Code" required error={errors.code} className="col-span-3 sm:col-span-1"><Input value={d.code} onChange={(e) => set('code', e.target.value)} inputMode="numeric" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Category" required error={errors.category} className="col-span-2">
              <Select value={d.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Price (₹)" required error={errors.price}><Input type="number" min={0} value={d.price || ''} onChange={(e) => set('price', Number(e.target.value))} /></Field>
            <Field label="GST">
              <Select value={d.gst} onChange={(e) => set('gst', Number(e.target.value))}>
                {[0, 5, 12, 18].map((g) => <option key={g} value={g}>{g}%</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Food type">
              <Segmented className="w-full" value={d.veg ? 'veg' : 'nonveg'} onChange={(v) => set('veg', v === 'veg')}
                items={[{ value: 'veg', label: 'Veg', icon: <VegMark veg /> }, { value: 'nonveg', label: 'Non-veg', icon: <VegMark veg={false} /> }]} />
            </Field>
            <Field label="Kitchen station">
              <Select value={d.station} onChange={(e) => set('station', e.target.value as MenuItem['station'])}>
                {STATIONS.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Description"><Textarea rows={2} value={d.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Shown on QR menu & waiter app" /></Field>

          {/* variants */}
          <div className="rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-[12px] font-semibold text-slate-700">Variants <span className="font-normal text-slate-400">(e.g. Half / Full)</span></span>
              <Button size="xs" variant="ghost" icon={<Plus className="size-3" />} onClick={() => set('variants', [...(d.variants ?? []), { name: '', price: d.price }])}>Add variant</Button>
            </div>
            <div className="space-y-1.5 p-2">
              {(d.variants ?? []).length === 0 && <p className="px-1 py-1 text-[11.5px] text-slate-400">No variants — base price applies.</p>}
              {(d.variants ?? []).map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input className="flex-1" placeholder="Variant name" value={v.name} onChange={(e) => setVariant(i, { name: e.target.value })} />
                  <Input className="w-28" type="number" placeholder="₹" value={v.price || ''} onChange={(e) => setVariant(i, { price: Number(e.target.value) })} />
                  <button className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => set('variants', (d.variants ?? []).filter((_, j) => j !== i))}><Trash2 className="size-3.5" /></button>
                </div>
              ))}
              {errors.variants && <p className="px-1 text-[11px] text-rose-600">{errors.variants}</p>}
            </div>
          </div>

          {/* modifiers */}
          <div className="rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-[12px] font-semibold text-slate-700">Modifiers / add-ons</span>
              <Button size="xs" variant="ghost" icon={<Plus className="size-3" />} onClick={() => set('modifiers', [...(d.modifiers ?? []), { name: '', price: 0 }])}>Add modifier</Button>
            </div>
            <div className="space-y-1.5 p-2">
              {(d.modifiers ?? []).length === 0 && <p className="px-1 py-1 text-[11.5px] text-slate-400">No modifiers.</p>}
              {(d.modifiers ?? []).map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input className="flex-1" placeholder="e.g. Extra Cheese" value={v.name} onChange={(e) => setModifier(i, { name: e.target.value })} />
                  <Input className="w-28" type="number" placeholder="₹ (0 = free)" value={v.price} onChange={(e) => setModifier(i, { price: Number(e.target.value) })} />
                  <button className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => set('modifiers', (d.modifiers ?? []).filter((_, j) => j !== i))}><Trash2 className="size-3.5" /></button>
                </div>
              ))}
              {errors.modifiers && <p className="px-1 text-[11px] text-rose-600">{errors.modifiers}</p>}
            </div>
          </div>
        </div>

        {/* side */}
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-[11.5px] font-medium text-slate-600">Image / emoji</p>
            <div className="mb-2 flex h-24 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-amber-100 text-[52px]">{d.emoji}</div>
            <div className="grid max-h-36 grid-cols-6 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-1.5">
              {FOOD_EMOJIS.map((e) => (
                <button key={e} onClick={() => set('emoji', e)} className={cn('flex size-7 items-center justify-center rounded-md text-[17px] transition hover:bg-slate-100', d.emoji === e && 'bg-brand-100 ring-1 ring-brand-400')}>{e}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11.5px] font-medium text-slate-600">Available at outlets</p>
            <div className="space-y-1.5 rounded-lg border border-slate-200 p-2">
              {outlets.map((o) => (
                <Checkbox key={o.id} checked={d.outlets.includes(o.id)} label={o.short}
                  onChange={(v) => set('outlets', v ? [...d.outlets, o.id] : d.outlets.filter((x) => x !== o.id))} />
              ))}
            </div>
            {errors.outlets && <p className="mt-1 text-[11px] text-rose-600">{errors.outlets}</p>}
          </div>
          <div className="space-y-2.5 rounded-lg border border-slate-200 p-3">
            {([['available', 'Available for sale'], ['bestseller', 'Bestseller tag'], ['spicy', 'Spicy 🌶️']] as const).map(([k, label]) => (
              <div key={k} className="flex items-center justify-between text-[12.5px] text-slate-700">
                {label}<Toggle size="sm" checked={!!d[k]} onChange={(v) => set(k, v)} />
              </div>
            ))}
            <div className="flex items-center justify-between text-[12.5px] text-slate-700" title="Shown on the hotel in-room QR menu">
              In-room dining 🛏️<Toggle size="sm" checked={d.roomService !== false} onChange={(v) => set('roomService', v)} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
