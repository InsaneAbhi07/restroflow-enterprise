import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Plus, Search } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useScope, useWorkingOutlet } from '@/store/hooks'
import { PhoneFrame } from '@/components/layout/Overlays'
import { Select, VegMark } from '@/components/ui'
import { cn, inr } from '@/lib/format'
import QrCustomerApp from '@/pages/qr/QrCustomerApp'

/** Compact waiter-app style menu (static preview) */
function WaiterMenuPreview({ outletId }: { outletId: string }) {
  const menu = useStore((s) => s.menu)
  const categories = useStore((s) => s.categories)
  const [cat, setCat] = useState(categories[0]?.id ?? '')
  const [count, setCount] = useState<Record<string, number>>({})
  const items = menu.filter((m) => m.outlets.includes(outletId) && m.categoryId === cat)
  const total = Object.values(count).reduce((s, n) => s + n, 0)
  return (
    <div className="flex h-full flex-col bg-slate-50 pt-10">
      <div className="flex items-center gap-2 bg-navy-900 px-4 py-3 text-white">
        <ChevronLeft className="size-5" />
        <div className="flex-1"><div className="text-[15px] font-semibold">Table G2 · New order</div><div className="text-[11px] text-white/60">Captain: Rohit Kumar</div></div>
        <Search className="size-5" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 no-scrollbar">
        {categories.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={cn('whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium', cat === c.id ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600')}>{c.name}</button>
        ))}
      </div>
      <div className="flex-1 divide-y divide-slate-100 overflow-y-auto bg-white">
        {items.map((m) => (
          <div key={m.id} className={cn('flex items-center gap-3 px-4 py-2.5', !m.available && 'opacity-40')}>
            <span className="flex size-10 items-center justify-center rounded-lg bg-orange-50 text-[22px]">{m.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[13.5px] font-medium text-slate-900"><VegMark veg={m.veg} /><span className="truncate">{m.name}</span></div>
              <div className="text-[12px] text-slate-500">{inr(m.price)}{m.variants?.length ? ` · ${m.variants.length} sizes` : ''}</div>
            </div>
            {m.available ? (
              count[m.id] ? (
                <div className="flex items-center gap-2 rounded-lg bg-brand-500 px-2 py-1 text-[13px] font-semibold text-white">
                  <button onClick={() => setCount({ ...count, [m.id]: count[m.id] - 1 })}>−</button>{count[m.id]}<button onClick={() => setCount({ ...count, [m.id]: count[m.id] + 1 })}>+</button>
                </div>
              ) : (
                <button onClick={() => setCount({ ...count, [m.id]: 1 })} className="flex size-8 items-center justify-center rounded-lg border border-brand-500 text-brand-600"><Plus className="size-4" /></button>
              )
            ) : <span className="text-[11px] font-medium text-rose-500">Out of stock</span>}
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 bg-white p-3">
        <div className="flex h-11 items-center justify-between rounded-xl bg-navy-900 px-4 text-[14px] font-semibold text-white">
          <span>{total} items</span><span>Send to kitchen →</span>
        </div>
      </div>
    </div>
  )
}

export function PreviewTab() {
  const outlets = useStore((s) => s.outlets)
  const tables = useStore((s) => s.tables)
  const { outletIds } = useScope()
  const working = useWorkingOutlet()
  const [outletId, setOutletId] = useState(working)
  useEffect(() => setOutletId(working), [working])
  const table = useMemo(() => tables.find((t) => t.outletId === outletId && t.qrEnabled) ?? tables.find((t) => t.outletId === outletId), [tables, outletId])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="text-[12.5px] text-slate-500">Live previews use the same menu data — toggle availability or edit prices and both update instantly.</p>
        <Select className="ml-auto w-48" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
          {outletIds.map((id) => <option key={id} value={id}>{outlets.find((o) => o.id === id)?.short}</option>)}
        </Select>
      </div>
      <div className="flex flex-wrap items-start justify-center gap-10 rounded-xl border border-slate-200 bg-slate-100/70 p-6">
        <div className="flex flex-col items-center gap-3">
          <span className="text-[12px] font-semibold text-slate-600">Waiter app menu</span>
          <PhoneFrame scale={0.75}><WaiterMenuPreview outletId={outletId} /></PhoneFrame>
        </div>
        <div className="flex flex-col items-center gap-3">
          <span className="text-[12px] font-semibold text-slate-600">Customer QR menu {table ? `· Table ${table.label}` : ''}</span>
          <PhoneFrame scale={0.75}>{table ? <QrCustomerApp key={table.id} outletId={outletId} tableId={table.id} embedded /> : <div className="p-6 text-center text-slate-500">No tables</div>}</PhoneFrame>
        </div>
      </div>
    </div>
  )
}
