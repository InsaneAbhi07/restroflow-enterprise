import type { Material, Recipe, RecipeIngredient } from '@/types'
import type { Tone } from '@/components/ui'

export const effQty = (i: Pick<RecipeIngredient, 'qty' | 'wastage'>) => i.qty * (1 + (i.wastage || 0) / 100)
export const ingCost = (i: RecipeIngredient, m?: Material, factor = 1) => effQty(i) * (m?.cost ?? 0) * factor
export const recipeCost = (r: Pick<Recipe, 'ingredients'>, mat: Record<string, Material>, factor: (materialId: string) => number = () => 1) =>
  r.ingredients.reduce((s, i) => s + ingCost(i, mat[i.materialId], factor(i.materialId)), 0)

export const foodCostTone = (pct: number): Tone => (pct <= 30 ? 'green' : pct <= 38 ? 'amber' : 'red')
export const foodCostText = (pct: number) => (pct <= 30 ? 'text-emerald-600' : pct <= 38 ? 'text-amber-600' : 'text-rose-600')

/** deterministic per-outlet cost variance in ±3–8% */
export const outletFactor = (outletId: string, materialId: string) => {
  let h = 2166136261
  for (const c of outletId + ':' + materialId) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0
  const mag = 0.03 + ((h % 1000) / 1000) * 0.05
  const sign = (h >> 11) & 1 ? 1 : -1
  return 1 + sign * mag
}

/** portions that can be made with current stock at an outlet + limiting ingredient */
export const portionsAt = (r: Pick<Recipe, 'ingredients'>, mat: Record<string, Material>, outletId: string) => {
  let min = Infinity
  let limiting: string | undefined
  r.ingredients.forEach((i) => {
    const need = effQty(i)
    if (need <= 0) return
    const n = Math.floor((mat[i.materialId]?.stock[outletId] ?? 0) / need)
    if (n < min) { min = n; limiting = i.materialId }
  })
  return { portions: min === Infinity ? 0 : min, limiting }
}
