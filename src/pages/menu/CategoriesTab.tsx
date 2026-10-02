import { useState } from 'react'
import { FolderTree, Pencil, Plus } from 'lucide-react'
import type { MenuCategory } from '@/types'
import { useStore } from '@/store/useStore'
import { usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { Button, Card, DynIcon, Field, Input, Modal } from '@/components/ui'
import { cn, inr, uid } from '@/lib/format'

const ICONS = ['Flame', 'Soup', 'CookingPot', 'Utensils', 'Leaf', 'Wheat', 'Salad', 'CupSoda', 'IceCreamCone', 'Package', 'Pizza', 'Sandwich', 'Coffee', 'Beer', 'Wine', 'Cake', 'Cookie', 'Drumstick', 'Fish', 'Egg', 'Apple', 'Carrot', 'Croissant', 'Popcorn']
const COLORS = ['#ea580c', '#ca8a04', '#dc2626', '#e11d48', '#16a34a', '#b45309', '#0d9488', '#2563eb', '#db2777', '#7c3aed', '#0891b2', '#475569']

export function CategoriesTab() {
  const categories = useStore((s) => s.categories)
  const menu = useStore((s) => s.menu)
  const upsert = useStore((s) => s.upsertCategory)
  const log = useStore((s) => s.log)
  const { can } = usePermission()
  const [draft, setDraft] = useState<MenuCategory | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [err, setErr] = useState('')
  const max = Math.max(1, ...categories.map((c) => menu.filter((m) => m.categoryId === c.id).length))

  const openEdit = (c: MenuCategory | null) => {
    setIsNew(!c); setErr('')
    setDraft(c ? { ...c } : { id: uid('c'), name: '', icon: 'Utensils', color: COLORS[categories.length % COLORS.length] })
  }
  const save = () => {
    if (!draft) return
    if (!draft.name.trim()) { setErr('Category name is required'); return }
    if (categories.some((c) => c.id !== draft.id && c.name.toLowerCase() === draft.name.trim().toLowerCase())) { setErr('Category already exists'); return }
    upsert({ ...draft, name: draft.name.trim() })
    log(`${isNew ? 'Created' : 'Updated'} menu category ${draft.name}`, 'menu', 'success')
    toast.success(isNew ? 'Category created' : 'Category updated', draft.name)
    setDraft(null)
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12.5px] text-slate-500">{categories.length} categories · drives POS tabs, waiter app and QR menu sections</p>
        {can('menu', 'create') && <Button size="sm" variant="primary" icon={<Plus className="size-3.5" />} onClick={() => openEdit(null)}>Add category</Button>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((c) => {
          const items = menu.filter((m) => m.categoryId === c.id)
          const avail = items.filter((m) => m.available).length
          const avg = items.length ? items.reduce((s, m) => s + m.price, 0) / items.length : 0
          return (
            <Card key={c.id} className="group p-3.5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl" style={{ background: c.color + '1a', color: c.color }}><DynIcon name={c.icon} className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-slate-900">{c.name}</div>
                  <div className="text-[11.5px] text-slate-500">{items.length} items · {avail} available</div>
                </div>
                {can('menu', 'edit') && <button onClick={() => openEdit(c)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="size-3.5" /></button>}
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(items.length / max) * 100}%`, background: c.color }} /></div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>Avg price {inr(avg)}</span>
                <span className="flex -space-x-1">{items.slice(0, 5).map((m) => <span key={m.id} className="flex size-5 items-center justify-center rounded-full bg-white text-[11px] ring-1 ring-slate-200">{m.emoji}</span>)}</span>
              </div>
            </Card>
          )
        })}
      </div>

      <Modal open={!!draft} onClose={() => setDraft(null)} size="sm" icon={<FolderTree />} title={isNew ? 'Add category' : 'Edit category'}
        footer={<><Button onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
        {draft && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span className="flex size-11 items-center justify-center rounded-xl" style={{ background: draft.color + '1a', color: draft.color }}><DynIcon name={draft.icon} className="size-5" /></span>
              <span className="text-[14px] font-semibold text-slate-900">{draft.name || 'Category name'}</span>
            </div>
            <Field label="Name" required error={err}><Input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Tandoor Specials" /></Field>
            <div>
              <p className="mb-1 text-[11.5px] font-medium text-slate-600">Icon</p>
              <div className="grid grid-cols-8 gap-1">
                {ICONS.map((i) => (
                  <button key={i} onClick={() => setDraft({ ...draft, icon: i })} title={i}
                    className={cn('flex size-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100', draft.icon === i && 'bg-brand-100 text-brand-700 ring-1 ring-brand-400')}><DynIcon name={i} className="size-4" /></button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[11.5px] font-medium text-slate-600">Colour</p>
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map((col) => (
                  <button key={col} onClick={() => setDraft({ ...draft, color: col })} className={cn('size-7 rounded-full ring-offset-2 transition', draft.color === col && 'ring-2 ring-slate-800')} style={{ background: col }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
