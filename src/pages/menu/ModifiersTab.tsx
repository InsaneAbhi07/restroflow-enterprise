import { useMemo } from 'react'
import { Layers, SlidersHorizontal } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Badge, Card, CardHeader, StatCard } from '@/components/ui'
import { inr } from '@/lib/format'

export function ModifiersTab() {
  const menu = useStore((s) => s.menu)

  const modifiers = useMemo(() => {
    const m = new Map<string, { name: string; prices: Set<number>; items: string[] }>()
    menu.forEach((it) => it.modifiers?.forEach((md) => {
      const e = m.get(md.name) ?? { name: md.name, prices: new Set<number>(), items: [] }
      e.prices.add(md.price); e.items.push(it.name); m.set(md.name, e)
    }))
    return Array.from(m.values()).sort((a, b) => b.items.length - a.items.length)
  }, [menu])

  const variantSets = useMemo(() => {
    const m = new Map<string, { key: string; items: { name: string; emoji: string; prices: string }[] }>()
    menu.forEach((it) => {
      if (!it.variants?.length) return
      const key = it.variants.map((v) => v.name).join(' / ')
      const e = m.get(key) ?? { key, items: [] }
      e.items.push({ name: it.name, emoji: it.emoji, prices: it.variants.map((v) => inr(v.price)).join(' / ') })
      m.set(key, e)
    })
    return Array.from(m.values()).sort((a, b) => b.items.length - a.items.length)
  }, [menu])

  const withVariants = menu.filter((m) => m.variants?.length).length
  const withMods = menu.filter((m) => m.modifiers?.length).length
  const freeMods = modifiers.filter((m) => [...m.prices].every((p) => p === 0)).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Items with variants" value={withVariants} sub={`of ${menu.length} items`} icon={<Layers />} tone="violet" />
        <StatCard label="Variant groups" value={variantSets.length} sub="distinct option sets" icon={<Layers />} tone="blue" />
        <StatCard label="Unique modifiers" value={modifiers.length} sub={`${withMods} items use add-ons`} icon={<SlidersHorizontal />} tone="teal" />
        <StatCard label="Free modifiers" value={freeMods} sub="instructions (₹0)" icon={<SlidersHorizontal />} tone="gray" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Variant groups" subtitle="Portion / size options in use" icon={<Layers className="size-3.5" />} />
          <div className="divide-y divide-slate-100">
            {variantSets.map((v) => (
              <div key={v.key} className="px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">{v.key.split(' / ').map((n) => <Badge key={n} tone="violet">{n}</Badge>)}</div>
                  <span className="text-[11px] text-slate-500">{v.items.length} items</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {v.items.map((i) => (
                    <span key={i.name} className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-[11.5px] text-slate-700 ring-1 ring-slate-200">
                      {i.emoji} {i.name} <span className="text-slate-400">{i.prices}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Modifiers & add-ons" subtitle="Grouped by name across all items" icon={<SlidersHorizontal className="size-3.5" />} />
          <div className="max-h-[560px] overflow-y-auto">
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2 text-left">Modifier</th><th className="px-3 py-2 text-right">Price</th><th className="px-4 py-2 text-left">Used by</th></tr>
              </thead>
              <tbody>
                {modifiers.map((m) => {
                  const prices = [...m.prices]
                  return (
                    <tr key={m.name} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-2 font-medium text-slate-800">{m.name}</td>
                      <td className="px-3 py-2 text-right tabular">{prices.every((p) => p === 0) ? <Badge tone="gray">Free</Badge> : prices.map((p) => inr(p)).join(', ')}</td>
                      <td className="px-4 py-2 text-slate-500"><span className="font-semibold text-slate-700">{m.items.length}</span> · <span className="text-[11.5px]">{m.items.slice(0, 4).join(', ')}{m.items.length > 4 ? ` +${m.items.length - 4}` : ''}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
