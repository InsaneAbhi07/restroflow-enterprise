import { useMemo, useState } from 'react'
import { ChefHat, Plus, Trash2 } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { Recipe, RecipeIngredient } from '@/types'
import { useStore } from '@/store/useStore'
import { toast } from '@/store/toast'
import { Modal, Button, Field, Input, Select, Textarea, VegMark, Legend, CHART, tooltipStyle, Badge } from '@/components/ui'
import { cn, inr, uid } from '@/lib/format'
import { effQty, foodCostText, foodCostTone } from './recipeUtils'

export function RecipeBuilder(props: { open: boolean; recipe?: Recipe | null; menuItemId?: string; onClose: () => void; onSaved?: (r: Recipe) => void }) {
  if (!props.open) return null
  return <Builder {...props} />
}
type Row = RecipeIngredient & { key: string }

function Builder({ recipe, menuItemId, onClose, onSaved }: { recipe?: Recipe | null; menuItemId?: string; onClose: () => void; onSaved?: (r: Recipe) => void }) {
  const menu = useStore((s) => s.menu)
  const recipes = useStore((s) => s.recipes)
  const materials = useStore((s) => s.materials)
  const upsertRecipe = useStore((s) => s.upsertRecipe)
  const log = useStore((s) => s.log)
  const matById = useMemo(() => Object.fromEntries(materials.map((m) => [m.id, m])), [materials])
  const available = menu.filter((m) => m.id === recipe?.menuItemId || !recipes.some((r) => r.menuItemId === m.id))
  const [itemId, setItemId] = useState(recipe?.menuItemId ?? menuItemId ?? available[0]?.id ?? '')
  const [code, setCode] = useState(recipe?.code ?? 'BOM' + (301 + recipes.length))
  const [yieldN, setYieldN] = useState(recipe?.yield ?? 1)
  const [prep, setPrep] = useState(recipe?.prepTime ?? 15)
  const [method, setMethod] = useState(recipe?.method ?? '')
  const [rows, setRows] = useState<Row[]>(() => (recipe?.ingredients ?? []).map((i) => ({ ...i, key: uid('i') })))
  const item = menu.find((m) => m.id === itemId)

  const upd = (key: string, patch: Partial<Row>) => setRows((p) => p.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const add = () => {
    const m = materials.find((x) => !rows.some((r) => r.materialId === x.id)) ?? materials[0]
    setRows((p) => [...p, { key: uid('i'), materialId: m.id, qty: 0.1, unit: m.unit, wastage: 2 }])
  }
  const costs = rows.map((r) => effQty(r) * (matById[r.materialId]?.cost ?? 0))
  const total = costs.reduce((s, c) => s + c, 0)
  const price = item?.price ?? 0
  const fc = price ? (total / price) * 100 : 0
  const pie = rows.map((r, i) => ({ name: matById[r.materialId]?.name ?? '', value: Math.round(costs[i] * 100) / 100 })).filter((p) => p.value > 0).sort((a, b) => b.value - a.value)
  const pieTop = pie.length > 6 ? [...pie.slice(0, 5), { name: 'Others', value: pie.slice(5).reduce((s, p) => s + p.value, 0) }] : pie

  const save = () => {
    if (!itemId) return toast.error('Select a menu item')
    const ings = rows.filter((r) => r.qty > 0)
    if (!ings.length) return toast.error('Add at least one ingredient')
    const r: Recipe = { id: recipe?.id ?? uid('rc'), code, menuItemId: itemId, yield: yieldN, prepTime: prep, method: method || undefined, ingredients: ings.map(({ key: _k, ...i }) => i) }
    upsertRecipe(r)
    log(`${recipe ? 'Updated' : 'Created'} recipe ${code} for ${item?.name} · food cost ${fc.toFixed(1)}%`, 'recipes', 'info')
    toast.success(recipe ? 'Recipe updated' : 'Recipe created', `${item?.name} · cost ${inr(total, true)} (${fc.toFixed(1)}%)`)
    onSaved?.(r)
    onClose()
  }

  return (
    <Modal open onClose={onClose} size="full" className="!max-w-6xl" title={recipe ? 'Edit recipe' : 'Recipe builder'} subtitle="Bill of materials · live costing" icon={<ChefHat />}
      footer={<><div className="mr-auto text-[12.5px] text-slate-500">{rows.length} ingredients · Cost <b className="text-slate-900">{inr(total, true)}</b> · Food cost <b className={foodCostText(fc)}>{fc.toFixed(1)}%</b></div><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save recipe</Button></>}>
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Menu item" required className="col-span-2">
              <Select value={itemId} onChange={(e) => setItemId(e.target.value)} disabled={!!recipe}>
                {available.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.name} — {inr(m.price)}</option>)}
              </Select>
            </Field>
            <Field label="Recipe code"><Input value={code} onChange={(e) => setCode(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Yield"><Input type="number" min={1} value={yieldN} onChange={(e) => setYieldN(Number(e.target.value) || 1)} /></Field>
              <Field label="Prep (min)"><Input type="number" min={0} value={prep} onChange={(e) => setPrep(Number(e.target.value))} /></Field>
            </div>
          </div>
          {item && <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-500"><span className="text-lg">{item.emoji}</span><VegMark veg={item.veg} /><b className="text-slate-800">{item.name}</b><Badge>{item.station}</Badge><span>Selling price {inr(item.price)}</span></div>}

          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-[12.5px]">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr><th className="px-2 py-2 text-left">Ingredient</th><th className="w-24 px-2 py-2 text-right">Qty</th><th className="w-16 px-2 py-2 text-left">Unit</th><th className="w-24 px-2 py-2 text-right">Wastage %</th><th className="px-2 py-2 text-right">Rate</th><th className="px-2 py-2 text-right">Cost</th><th className="w-8" /></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const m = matById[r.materialId]
                  return (
                    <tr key={r.key} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">
                        <Select value={r.materialId} onChange={(e) => upd(r.key, { materialId: e.target.value, unit: matById[e.target.value]?.unit ?? r.unit })}>
                          {materials.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                        </Select>
                      </td>
                      <td className="px-2 py-1.5"><Input type="number" min={0} step="0.005" className="text-right" value={r.qty || ''} onChange={(e) => upd(r.key, { qty: Number(e.target.value) })} /></td>
                      <td className="px-2 py-1.5 text-slate-500">{m?.unit ?? r.unit}</td>
                      <td className="px-2 py-1.5"><Input type="number" min={0} max={50} className="text-right" value={r.wastage} onChange={(e) => upd(r.key, { wastage: Number(e.target.value) })} /></td>
                      <td className="px-2 py-1.5 text-right tabular text-slate-500">{inr(m?.cost ?? 0)}/{m?.unit}</td>
                      <td className="px-2 py-1.5 text-right font-medium tabular">{inr(costs[i], true)}</td>
                      <td className="px-1"><button onClick={() => setRows((p) => p.filter((x) => x.key !== r.key))} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="size-3.5" /></button></td>
                    </tr>
                  )
                })}
                {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">No ingredients yet — click “Add ingredient”.</td></tr>}
              </tbody>
              {rows.length > 0 && <tfoot><tr className="border-t border-slate-200 bg-slate-50 font-semibold"><td colSpan={5} className="px-2 py-1.5 text-right">Total recipe cost (per {yieldN} portion{yieldN > 1 ? 's' : ''})</td><td className="px-2 py-1.5 text-right tabular">{inr(total, true)}</td><td /></tr></tfoot>}
            </table>
          </div>
          <Button size="sm" className="mt-2" icon={<Plus className="size-3.5" />} onClick={add}>Add ingredient</Button>
          <Field label="Method / SOP" className="mt-3"><Textarea rows={3} value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Preparation steps, plating instructions…" /></Field>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">Costing summary</p>
            <div className="mt-2 space-y-1.5 text-[12.5px]">
              <div className="flex justify-between"><span className="text-slate-500">Recipe cost</span><b className="tabular">{inr(total, true)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Selling price</span><b className="tabular">{inr(price)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Gross margin</span><b className="tabular text-emerald-600">{inr(price - total, true)}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Margin %</span><b className="tabular">{price ? (100 - fc).toFixed(1) : 0}%</b></div>
            </div>
            <div className={cn('mt-3 rounded-lg px-3 py-2 text-center', fc <= 30 ? 'bg-emerald-50' : fc <= 38 ? 'bg-amber-50' : 'bg-rose-50')}>
              <p className="text-[11px] text-slate-500">Food cost</p>
              <p className={cn('text-[22px] font-semibold tabular', foodCostText(fc))}>{fc.toFixed(1)}%</p>
              <Badge tone={foodCostTone(fc)}>{fc <= 30 ? 'Healthy' : fc <= 38 ? 'Watch' : 'Too high'}</Badge>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">Cost share</p>
            {pieTop.length ? <>
              <div className="h-40">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieTop} dataKey="value" nameKey="name" innerRadius={38} outerRadius={64} paddingAngle={2} stroke="none">
                      {pieTop.map((_, i) => <Cell key={i} fill={CHART.series[i % CHART.series.length]} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v) => inr(Number(v), true)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <Legend items={pieTop.map((p, i) => ({ name: p.name, color: CHART.series[i % CHART.series.length], value: total ? `${((p.value / total) * 100).toFixed(0)}%` : '' }))} />
            </> : <p className="py-6 text-center text-[12px] text-slate-400">Add ingredients to see cost split</p>}
          </div>
        </div>
      </div>
    </Modal>
  )
}
