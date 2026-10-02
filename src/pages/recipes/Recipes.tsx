import { useMemo, useState } from 'react'
import { ChefHat, Plus, Percent, TrendingUp, BookOpen, AlertCircle, Pencil, Download } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts'
import type { MenuItem, Recipe } from '@/types'
import { useStore } from '@/store/useStore'
import { usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { PageHeader, Card, CardHeader, StatCard, Button, DataTable, FilterBar, SearchInput, Select, Tabs, Badge, VegMark, IconButton, CHART, tooltipStyle, type Column } from '@/components/ui'
import { cn, inr } from '@/lib/format'
import { InvNav } from '@/pages/inventory/shared'
import { foodCostText, recipeCost } from './recipeUtils'
import { RecipeBuilder } from './RecipeBuilder'
import { RecipeDrawer } from './RecipeDrawer'

type Row = { id: string; r: Recipe; item?: MenuItem; cost: number; price: number; fc: number; margin: number }
type Band = 'All' | 'good' | 'watch' | 'high'

export default function Recipes() {
  const { can } = usePermission()
  const recipes = useStore((s) => s.recipes)
  const menu = useStore((s) => s.menu)
  const categories = useStore((s) => s.categories)
  const materials = useStore((s) => s.materials)
  const matById = useMemo(() => Object.fromEntries(materials.map((m) => [m.id, m])), [materials])
  const [tab, setTab] = useState<'recipes' | 'missing'>('recipes')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const [band, setBand] = useState<Band>('All')
  const [openId, setOpenId] = useState<string | null>(null)
  const [builder, setBuilder] = useState<{ open: boolean; recipe?: Recipe | null; menuItemId?: string }>({ open: false })

  const all: Row[] = useMemo(() => recipes.map((r) => {
    const item = menu.find((m) => m.id === r.menuItemId)
    const cost = recipeCost(r, matById)
    const price = item?.price ?? 0
    const fc = price ? (cost / price) * 100 : 0
    return { id: r.id, r, item, cost, price, fc, margin: price - cost }
  }), [recipes, menu, matById])
  const rows = all.filter((x) => (cat === 'All' || x.item?.categoryId === cat) &&
    (band === 'All' || (band === 'good' ? x.fc <= 30 : band === 'watch' ? x.fc > 30 && x.fc <= 38 : x.fc > 38)) &&
    (!q || x.item?.name.toLowerCase().includes(q.toLowerCase()) || x.r.code.toLowerCase().includes(q.toLowerCase())))
  const missing = menu.filter((m) => !recipes.some((r) => r.menuItemId === m.id) && (cat === 'All' || m.categoryId === cat) && (!q || m.name.toLowerCase().includes(q.toLowerCase())))
  const missingCount = menu.filter((m) => !recipes.some((r) => r.menuItemId === m.id)).length
  const avgFc = all.length ? all.reduce((s, x) => s + x.fc, 0) / all.length : 0
  const best = [...all].sort((a, b) => b.margin - a.margin)[0]
  const chart = [...all].sort((a, b) => b.fc - a.fc).slice(0, 12).map((x) => ({ name: x.item?.short ?? x.item?.name ?? x.r.code, fc: Math.round(x.fc * 10) / 10 }))
  const open = recipes.find((r) => r.id === openId) ?? null
  const catName = (id?: string) => categories.find((c) => c.id === id)?.name ?? '—'

  const cols: Column<Row>[] = [
    { key: 'item', header: 'Food item', sortValue: (x) => x.item?.name ?? '', render: (x) => (
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-slate-50 text-lg">{x.item?.emoji}</span>
        <div><p className="flex items-center gap-1.5 font-medium text-slate-800">{x.item && <VegMark veg={x.item.veg} />}{x.item?.name ?? 'Unknown item'}</p><p className="text-[11px] text-slate-400">{catName(x.item?.categoryId)}</p></div>
      </div>
    ) },
    { key: 'code', header: 'Recipe code', sortValue: (x) => x.r.code, render: (x) => <span className="font-mono text-[12px] text-navy-700">{x.r.code}</span> },
    { key: 'ings', header: 'Ingredients', align: 'right', sortValue: (x) => x.r.ingredients.length, render: (x) => x.r.ingredients.length },
    { key: 'cost', header: 'Recipe cost', align: 'right', render: (x) => <span className="font-medium">{inr(x.cost, true)}</span> },
    { key: 'price', header: 'Selling price', align: 'right', render: (x) => inr(x.price) },
    { key: 'fc', header: 'Food cost %', align: 'right', render: (x) => (
      <div className="ml-auto flex w-28 items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', x.fc <= 30 ? 'bg-emerald-500' : x.fc <= 38 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${Math.min(100, x.fc * 2)}%` }} /></div>
        <span className={cn('w-11 text-right font-semibold tabular', foodCostText(x.fc))}>{x.fc.toFixed(1)}%</span>
      </div>
    ) },
    { key: 'margin', header: 'Profit margin', align: 'right', render: (x) => <div><p className="font-medium text-emerald-700">{inr(x.margin, true)}</p><p className="text-[11px] text-slate-400">{x.price ? (100 - x.fc).toFixed(1) : 0}%</p></div> },
    { key: 'act', header: '', sortable: false, render: (x) => can('recipes', 'edit') && <IconButton tooltip="Edit recipe" onClick={(e) => { e.stopPropagation(); setBuilder({ open: true, recipe: x.r }) }}><Pencil className="size-3.5" /></IconButton> },
  ]
  const missCols: Column<MenuItem>[] = [
    { key: 'name', header: 'Menu item', render: (m) => <div className="flex items-center gap-2.5"><span className="text-lg">{m.emoji}</span><VegMark veg={m.veg} /><span className="font-medium text-slate-800">{m.name}</span></div> },
    { key: 'code', header: 'Code', render: (m) => <span className="font-mono text-[12px]">{m.code}</span> },
    { key: 'cat', header: 'Category', sortValue: (m) => catName(m.categoryId), render: (m) => <Badge>{catName(m.categoryId)}</Badge> },
    { key: 'station', header: 'Station' },
    { key: 'price', header: 'Price', align: 'right', render: (m) => inr(m.price) },
    { key: 'act', header: '', sortable: false, align: 'right', render: (m) => can('recipes', 'create') ? <Button size="xs" variant="outline" icon={<Plus className="size-3" />} onClick={() => setBuilder({ open: true, menuItemId: m.id })}>Create recipe</Button> : <Badge tone="amber">No BOM</Badge> },
  ]

  return (
    <div>
      <InvNav />
      <PageHeader title="Recipes / BOM" subtitle="Recipe costing, food cost control and recipe-based inventory consumption" breadcrumbs={[{ label: 'Inventory', to: '/inventory' }, { label: 'Recipes' }]}
        actions={<>
          <Button icon={<Download className="size-3.5" />} onClick={() => toast.success('Recipe costing exported', `${all.length} recipes · Excel (simulated)`)}>Export</Button>
          {can('recipes', 'create') && <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setBuilder({ open: true })} disabled={missingCount === 0}>New recipe</Button>}
        </>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Avg. food cost" value={`${avgFc.toFixed(1)}%`} icon={<Percent />} tone={avgFc <= 30 ? 'green' : avgFc <= 38 ? 'amber' : 'red'} sub="target ≤ 30%" />
        <StatCard label="Highest margin item" value={best ? inr(best.margin) : '—'} icon={<TrendingUp />} tone="teal" sub={best ? `${best.item?.emoji ?? ''} ${best.item?.name}` : ''} />
        <StatCard label="Recipes" value={all.length} icon={<BookOpen />} sub={`${all.reduce((s, x) => s + x.r.ingredients.length, 0)} ingredient lines`} />
        <StatCard label="Items without recipe" value={missingCount} icon={<AlertCircle />} tone="amber" sub="no auto-deduction" onClick={() => setTab('missing')} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_360px]">
        <Card className="min-w-0 overflow-hidden">
          <Tabs className="px-3" value={tab} onChange={setTab} items={[
            { value: 'recipes', label: 'Recipe directory', icon: <ChefHat className="size-3.5" />, count: all.length },
            { value: 'missing', label: 'Items without recipe', icon: <AlertCircle className="size-3.5" />, count: missingCount },
          ]} />
          <FilterBar>
            <SearchInput className="w-56" placeholder="Search item or recipe code…" value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} />
            <Select className="w-44" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="All">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            {tab === 'recipes' && (
              <div className="flex gap-1">
                {([['All', 'All'], ['good', '≤ 30%'], ['watch', '30–38%'], ['high', '> 38%']] as [Band, string][]).map(([b, l]) => (
                  <button key={b} onClick={() => setBand(b)} className={cn('rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium transition', band === b ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                    {b !== 'All' && <span className={cn('mr-1 inline-block size-1.5 rounded-full', b === 'good' ? 'bg-emerald-500' : b === 'watch' ? 'bg-amber-500' : 'bg-rose-500')} />}{l}
                  </button>
                ))}
              </div>
            )}
          </FilterBar>
          {tab === 'recipes'
            ? <DataTable columns={cols} rows={rows} onRowClick={(x) => setOpenId(x.r.id)} />
            : <DataTable columns={missCols} rows={missing} />}
        </Card>
        <Card>
          <CardHeader title="Food cost % by item" subtitle="Highest 12 · target line at 30%" icon={<Percent className="size-3.5" />} />
          <div className="h-[380px] p-2">
            <ResponsiveContainer>
              <BarChart data={chart} layout="vertical" margin={{ left: 4, right: 16 }}>
                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" tick={CHART.axis} unit="%" />
                <YAxis type="category" dataKey="name" tick={CHART.axis} width={100} />
                <Tooltip {...tooltipStyle} formatter={(v) => `${v}%`} />
                <ReferenceLine x={30} stroke={CHART.teal} strokeDasharray="4 3" />
                <Bar dataKey="fc" name="Food cost" radius={[0, 4, 4, 0]} barSize={14}>
                  {chart.map((c, i) => <Cell key={i} fill={c.fc <= 30 ? '#10b981' : c.fc <= 38 ? '#f59e0b' : '#f43f5e'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <RecipeDrawer recipe={open} onClose={() => setOpenId(null)} onEdit={(r) => setBuilder({ open: true, recipe: r })} />
      <RecipeBuilder open={builder.open} recipe={builder.recipe} menuItemId={builder.menuItemId} onClose={() => setBuilder({ open: false })} onSaved={(r) => setOpenId(r.id)} />
    </div>
  )
}
