import { useMemo, useState } from 'react'
import { ChefHat, Pencil, PlayCircle, Info, Clock, AlertTriangle } from 'lucide-react'
import type { Recipe } from '@/types'
import { useStore } from '@/store/useStore'
import { useScope, usePermission, useWorkingOutlet } from '@/store/hooks'
import { toast } from '@/store/toast'
import { Drawer, Button, Select, Badge, VegMark } from '@/components/ui'
import { cn, inr } from '@/lib/format'
import { OutletChip, fmtQty } from '@/pages/inventory/shared'
import { effQty, foodCostText, foodCostTone, outletFactor, portionsAt, recipeCost } from './recipeUtils'

export function RecipeDrawer({ recipe, onClose, onEdit }: { recipe: Recipe | null; onClose: () => void; onEdit: (r: Recipe) => void }) {
  const { can } = usePermission()
  const { outletIds, allowed } = useScope()
  const working = useWorkingOutlet()
  const menu = useStore((s) => s.menu)
  const materials = useStore((s) => s.materials)
  const outlets = useStore((s) => s.outlets)
  const adjustStock = useStore((s) => s.adjustStock)
  const log = useStore((s) => s.log)
  const matById = useMemo(() => Object.fromEntries(materials.map((m) => [m.id, m])), [materials])
  const [outlet, setOutlet] = useState(working)
  if (!recipe) return null
  const item = menu.find((m) => m.id === recipe.menuItemId)
  const price = item?.price ?? 0
  const cost = recipeCost(recipe, matById)
  const fc = price ? (cost / price) * 100 : 0
  const { portions, limiting } = portionsAt(recipe, matById, outlet)
  const shortIngs = recipe.ingredients.filter((i) => (matById[i.materialId]?.stock[outlet] ?? 0) < effQty(i))
  const scopeOutlets = outlets.filter((o) => (outletIds.length > 1 ? outletIds : allowed).includes(o.id))

  const simulate = () => {
    if (shortIngs.length) return toast.error('Insufficient stock', `Short: ${shortIngs.map((i) => matById[i.materialId]?.name).join(', ')}`)
    recipe.ingredients.forEach((i) => adjustStock(i.materialId, outlet, -Math.round(effQty(i) * 1000) / 1000, 'Consumption', `SIM ${recipe.code}`))
    log(`Simulated sale of 1 × ${item?.name} — ${recipe.ingredients.length} ingredients deducted`, 'recipes', 'info', outlet)
    toast.success(`1 × ${item?.name} consumed`, `${recipe.ingredients.length} ingredients deducted at ${outlets.find((o) => o.id === outlet)?.short} · ${inr(cost, true)}`)
  }

  return (
    <Drawer open onClose={onClose} width={640} title={<span className="flex items-center gap-2"><span className="text-lg">{item?.emoji}</span>{item?.name}{item && <VegMark veg={item.veg} />}</span>}
      subtitle={`${recipe.code} · yield ${recipe.yield} · prep ${recipe.prepTime} min · ${item?.station}`}
      icon={<span className="flex size-9 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><ChefHat className="size-4" /></span>}
      footer={<>
        {can('recipes', 'edit') && <Button className="mr-auto" icon={<Pencil className="size-3.5" />} onClick={() => onEdit(recipe)}>Edit recipe</Button>}
        <Button variant="accent" icon={<PlayCircle className="size-3.5" />} onClick={simulate}>Simulate sale of 1 portion</Button>
      </>}>
      <div className="mb-4 grid grid-cols-4 gap-2">
        <div className="rounded-lg border border-slate-200 p-2.5"><p className="text-[11px] text-slate-500">Est. cost</p><p className="font-semibold tabular">{inr(cost, true)}</p></div>
        <div className="rounded-lg border border-slate-200 p-2.5"><p className="text-[11px] text-slate-500">Selling price</p><p className="font-semibold tabular">{inr(price)}</p></div>
        <div className="rounded-lg border border-slate-200 p-2.5"><p className="text-[11px] text-slate-500">Gross margin</p><p className="font-semibold tabular text-emerald-600">{inr(price - cost, true)}</p></div>
        <div className="rounded-lg border border-slate-200 p-2.5"><p className="text-[11px] text-slate-500">Food cost</p><p className={cn('font-semibold tabular', foodCostText(fc))}>{fc.toFixed(1)}%</p></div>
      </div>

      <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">Ingredient breakdown</p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-[12.5px]">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-2 py-1.5 text-left">Ingredient</th><th className="px-2 py-1.5 text-right">Qty</th><th className="px-2 py-1.5 text-right">Wastage</th><th className="px-2 py-1.5 text-right">Rate</th><th className="px-2 py-1.5 text-right">Cost</th><th className="px-2 py-1.5 text-right">Share</th></tr></thead>
          <tbody>
            {recipe.ingredients.map((i) => {
              const m = matById[i.materialId]
              const c = effQty(i) * (m?.cost ?? 0)
              return (
                <tr key={i.materialId} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-medium text-slate-800">{m?.name ?? i.materialId}</td>
                  <td className="px-2 py-1.5 text-right tabular">{fmtQty(i.qty)} {i.unit}</td>
                  <td className="px-2 py-1.5 text-right tabular text-slate-500">{i.wastage}%</td>
                  <td className="px-2 py-1.5 text-right tabular text-slate-500">{inr(m?.cost ?? 0)}</td>
                  <td className="px-2 py-1.5 text-right font-medium tabular">{inr(c, true)}</td>
                  <td className="px-2 py-1.5 text-right">
                    <div className="ml-auto flex w-20 items-center gap-1.5"><div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${cost ? (c / cost) * 100 : 0}%` }} /></div><span className="w-7 text-right text-[11px] tabular text-slate-500">{cost ? Math.round((c / cost) * 100) : 0}%</span></div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot><tr className="border-t border-slate-200 bg-slate-50 font-semibold"><td colSpan={4} className="px-2 py-1.5 text-right">Total</td><td className="px-2 py-1.5 text-right tabular">{inr(cost, true)}</td><td /></tr></tfoot>
        </table>
      </div>

      <p className="mb-1.5 mt-4 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">Outlet-specific ingredient cost</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {scopeOutlets.map((o) => {
          const c = recipeCost(recipe, matById, (mid) => outletFactor(o.id, mid))
          const f = price ? (c / price) * 100 : 0
          const diff = cost ? ((c - cost) / cost) * 100 : 0
          return (
            <div key={o.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <OutletChip id={o.id} />
              <div className="text-right">
                <p className="text-[13px] font-semibold tabular">{inr(c, true)} <span className={cn('text-[11px] font-medium', diff > 0 ? 'text-rose-600' : 'text-emerald-600')}>{diff > 0 ? '+' : ''}{diff.toFixed(1)}%</span></p>
                <Badge tone={foodCostTone(f)}>{f.toFixed(1)}% food cost</Badge>
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-1 text-[11px] text-slate-400">Variance reflects local purchase rates and vendor mix at each outlet.</p>

      <div className="mt-4 rounded-xl border border-slate-200 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">Production capacity</p>
          <Select className="w-44" value={outlet} onChange={(e) => setOutlet(e.target.value)}>
            {outlets.filter((o) => allowed.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{o.short}</option>)}
          </Select>
        </div>
        <p className="mt-2 text-[13px] text-slate-700">Can make <span className={cn('text-[20px] font-semibold tabular', portions < 10 ? 'text-rose-600' : 'text-navy-900')}>{portions}</span> portions with current stock at <b>{outlets.find((o) => o.id === outlet)?.short}</b></p>
        {limiting && <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-slate-500"><AlertTriangle className="size-3 text-amber-500" />Limiting ingredient: <b className="text-slate-700">{matById[limiting]?.name}</b> ({fmtQty(matById[limiting]?.stock[outlet] ?? 0)} {matById[limiting]?.unit} in stock)</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {recipe.ingredients.map((i) => {
            const n = Math.floor((matById[i.materialId]?.stock[outlet] ?? 0) / Math.max(effQty(i), 1e-6))
            return <Badge key={i.materialId} tone={n < 10 ? 'red' : n < 40 ? 'amber' : 'gray'}>{matById[i.materialId]?.name}: {n}</Badge>
          })}
        </div>
      </div>

      <div className="mt-3 flex gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[12px] text-sky-800">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>Recipe-based consumption: every bill settled on POS automatically deducts these ingredients from the outlet’s inventory (movement type “Consumption”, ref = bill no.). “Simulate sale” performs the same deduction for one portion at the selected outlet.</span>
      </div>
      {recipe.method && <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600"><p className="mb-0.5 flex items-center gap-1 font-semibold text-slate-700"><Clock className="size-3" />Method</p>{recipe.method}</div>}
    </Drawer>
  )
}
