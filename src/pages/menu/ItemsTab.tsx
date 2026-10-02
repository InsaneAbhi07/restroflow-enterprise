import { useMemo, useRef, useState } from 'react'
import { Flame, LayoutGrid, List, Pencil, Plus, Star } from 'lucide-react'
import type { MenuItem } from '@/types'
import { useStore } from '@/store/useStore'
import { usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { useShortcut } from '@/lib/shortcuts'
import { Badge, Button, Card, DataTable, DynIcon, EmptyState, FilterBar, IconButton, SearchInput, Segmented, Select, Toggle, VegMark, type Column } from '@/components/ui'
import { cn, inr } from '@/lib/format'
import { ItemModal } from './ItemModal'

export function ItemsTab() {
  const menu = useStore((s) => s.menu)
  const categories = useStore((s) => s.categories)
  const outlets = useStore((s) => s.outlets)
  const upsert = useStore((s) => s.upsertMenuItem)
  const log = useStore((s) => s.log)
  const { can } = usePermission()
  const canEdit = can('menu', 'edit')
  const canCreate = can('menu', 'create')

  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const [veg, setVeg] = useState<'all' | 'veg' | 'nonveg'>('all')
  const [outlet, setOutlet] = useState('all')
  const [avail, setAvail] = useState<'all' | 'on' | 'off'>('all')
  const [mode, setMode] = useState<'table' | 'grid'>('table')
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [open, setOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  useShortcut('focusSearch', () => searchRef.current?.focus())

  const base = useMemo(() => menu.filter((m) => {
    const s = q.trim().toLowerCase()
    return (!s || m.name.toLowerCase().includes(s) || m.short.toLowerCase().includes(s) || m.code.includes(s))
      && (veg === 'all' || (veg === 'veg') === m.veg)
      && (outlet === 'all' || m.outlets.includes(outlet))
      && (avail === 'all' || (avail === 'on') === m.available)
  }), [menu, q, veg, outlet, avail])
  const rows = base.filter((m) => cat === 'all' || m.categoryId === cat)
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—'

  const toggleAvail = (m: MenuItem, v: boolean) => {
    upsert({ ...m, available: v })
    log(`${m.name} marked ${v ? 'available' : 'out of stock'}`, 'menu', v ? 'success' : 'warning')
    toast[v ? 'success' : 'warning'](`${m.name} ${v ? 'is available' : 'marked out of stock'}`, 'Synced to POS, waiter app & QR menu')
  }
  const edit = (m: MenuItem | null) => { setEditing(m); setOpen(true) }

  const outletChips = (m: MenuItem) => (
    <div className="flex flex-wrap gap-0.5">
      {outlets.map((o) => (
        <span key={o.id} title={o.short} className={cn('rounded px-1 text-[10px] font-semibold', m.outlets.includes(o.id) ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-300 line-through')}>{o.code.replace('GK-', '')}</span>
      ))}
    </div>
  )

  const columns: Column<MenuItem>[] = [
    {
      key: 'name', header: 'Item', render: (m) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[18px]">{m.emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-medium text-slate-900"><VegMark veg={m.veg} /><span className="truncate">{m.name}</span>
              {m.bestseller && <Star className="size-3 fill-amber-400 text-amber-400" />}{m.spicy && <Flame className="size-3 text-rose-500" />}
            </div>
            <div className="text-[11px] text-slate-400">#{m.code} · {m.short}</div>
          </div>
        </div>
      ),
    },
    { key: 'categoryId', header: 'Category', render: (m) => catName(m.categoryId), sortValue: (m) => catName(m.categoryId) },
    { key: 'price', header: 'Price', align: 'right', render: (m) => <span className="font-medium">{inr(m.price)}</span> },
    { key: 'gst', header: 'GST', align: 'right', render: (m) => `${m.gst}%` },
    { key: 'variants', header: 'Variants', align: 'center', render: (m) => m.variants?.length ? <Badge tone="violet">{m.variants.length}</Badge> : <span className="text-slate-300">—</span>, sortValue: (m) => m.variants?.length ?? 0 },
    { key: 'station', header: 'Station' },
    { key: 'outlets', header: 'Outlets', sortable: false, render: outletChips },
    { key: 'available', header: 'Available', align: 'center', render: (m) => <Toggle size="sm" checked={m.available} disabled={!canEdit} onChange={(v) => toggleAvail(m, v)} />, sortValue: (m) => Number(m.available) },
    { key: 'act', header: '', sortable: false, align: 'right', render: (m) => canEdit ? <IconButton tooltip="Edit" onClick={(e) => { e.stopPropagation(); edit(m) }}><Pencil className="size-3.5" /></IconButton> : null },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-[210px_1fr]">
      <Card className="h-fit p-1.5">
        <p className="px-2 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Categories</p>
        {[{ id: 'all', name: 'All items', icon: 'LayoutGrid', color: '#0f2a4a' }, ...categories].map((c) => {
          const count = c.id === 'all' ? base.length : base.filter((m) => m.categoryId === c.id).length
          return (
            <button key={c.id} onClick={() => setCat(c.id)}
              className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition', cat === c.id ? 'bg-navy-50 font-semibold text-navy-900' : 'text-slate-600 hover:bg-slate-50')}>
              <span className="flex size-6 items-center justify-center rounded-md" style={{ background: c.color + '18', color: c.color }}><DynIcon name={c.icon} className="size-3.5" /></span>
              <span className="flex-1 truncate">{c.name}</span>
              <span className="text-[11px] text-slate-400 tabular">{count}</span>
            </button>
          )
        })}
      </Card>

      <Card className="min-w-0">
        <FilterBar>
          <SearchInput ref={searchRef} className="w-56" placeholder="Search name, code…" value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} kbd="F2" />
          <Segmented size="sm" value={veg} onChange={setVeg} items={[{ value: 'all', label: 'All' }, { value: 'veg', label: 'Veg', icon: <VegMark veg /> }, { value: 'nonveg', label: 'Non-veg', icon: <VegMark veg={false} /> }]} />
          <Select className="w-40" value={outlet} onChange={(e) => setOutlet(e.target.value)}>
            <option value="all">All outlets</option>
            {outlets.map((o) => <option key={o.id} value={o.id}>{o.short}</option>)}
          </Select>
          <Select className="w-36" value={avail} onChange={(e) => setAvail(e.target.value as 'all' | 'on' | 'off')}>
            <option value="all">Any status</option><option value="on">Available</option><option value="off">Out of stock</option>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11.5px] text-slate-500">{rows.length} items</span>
            <Segmented size="sm" value={mode} onChange={setMode} items={[{ value: 'table', label: '', icon: <List className="size-3.5" /> }, { value: 'grid', label: '', icon: <LayoutGrid className="size-3.5" /> }]} />
            {canCreate && <Button size="sm" variant="primary" icon={<Plus className="size-3.5" />} onClick={() => edit(null)}>Add item</Button>}
          </div>
        </FilterBar>
        {mode === 'table' ? (
          <DataTable columns={columns} rows={rows} pageSize={14} dense onRowClick={canEdit ? edit : undefined} />
        ) : rows.length === 0 ? (
          <EmptyState title="No items" body="Try changing the filters." />
        ) : (
          <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {rows.map((m) => (
              <div key={m.id} className={cn('group relative overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-md', !m.available && 'opacity-60')}>
                <div className="relative flex h-20 items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 text-[40px]">
                  {m.emoji}
                  <span className="absolute left-2 top-2"><VegMark veg={m.veg} /></span>
                  {m.bestseller && <Badge tone="amber" className="absolute right-2 top-2 text-[10px]">Bestseller</Badge>}
                  {canEdit && <button onClick={() => edit(m)} className="absolute bottom-1.5 right-1.5 rounded-md bg-white/90 p-1 text-slate-500 opacity-0 shadow-sm transition hover:text-slate-900 group-hover:opacity-100"><Pencil className="size-3.5" /></button>}
                </div>
                <div className="p-2.5">
                  <div className="truncate text-[12.5px] font-semibold text-slate-900">{m.name}</div>
                  <div className="text-[11px] text-slate-400">#{m.code} · {catName(m.categoryId)}</div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-slate-900">{inr(m.price)}</span>
                    <Toggle size="sm" checked={m.available} disabled={!canEdit} onChange={(v) => toggleAvail(m, v)} />
                  </div>
                  <div className="mt-1.5">{outletChips(m)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ItemModal open={open} item={editing} onClose={() => setOpen(false)} />
    </div>
  )
}
