import { seeded, hashStr } from '@/lib/rand'
import { todayISO } from '@/lib/format'
import { CHART } from '@/components/ui'
import type { Material } from '@/types'
import type { ReportCtx, ReportDef, Row } from '../types'
import { inRange, dateInRange } from '../range'
import { outletShort, salesBase } from '../gen'
import { badgeCell, col, kpi, materialCategoryFilter, money, n0, outletCol, pctOf, short } from './helpers'

const stockOf = (m: Material, ctx: ReportCtx) => ctx.outletIds.reduce((s, o) => s + (m.stock[o] ?? 0), 0)
const minOf = (m: Material, ctx: ReportCtx) => m.min * ctx.outletIds.length
const byMcat = (ctx: ReportCtx) => ctx.materials.filter((m) => !ctx.filter.mcat || m.category === ctx.filter.mcat)
const factorSum = (ctx: ReportCtx) => ctx.outlets.reduce((s, o) => s + o.factor, 0)
const dailyUse = (m: Material, ctx: ReportCtx) => m.min * 0.32 * factorSum(ctx)
const PERISHABLE = ['Dairy', 'Vegetables', 'Meat & Poultry', 'Seafood']
const stockStatus = (q: number, min: number) => (q <= 0 ? 'Out of Stock' : q < min ? 'Low Stock' : 'In Stock')
const mcatColors = (cats: string[]) => Object.fromEntries(cats.map((c, i) => [c, CHART.series[i % CHART.series.length]]))

function recipeCost(ctx: ReportCtx, recipeId: string) {
  const rc = ctx.recipes.find((r) => r.id === recipeId)!
  return rc.ingredients.reduce((s, ing) => {
    const m = ctx.materials.find((x) => x.id === ing.materialId)
    return s + (m ? ing.qty * (1 + ing.wastage / 100) * m.cost : 0)
  }, 0)
}

export const INVENTORY_REPORTS: ReportDef[] = [
  {
    id: 'current-stock', group: 'Inventory', title: 'Current Stock', icon: 'Boxes', snapshot: true, filters: [materialCategoryFilter], tags: ['popular'],
    description: 'Live closing stock of every raw material against re-order level, per outlet scope.',
    build: (ctx) => {
      const mats = byMcat(ctx)
      const rows: Row[] = mats.map((m) => {
        const q = stockOf(m, ctx), min = minOf(m, ctx)
        return { id: m.id, code: m.code, name: m.name, category: m.category, unit: m.unit, stock: q, min, days: q / (dailyUse(m, ctx) || 1), value: q * m.cost, status: stockStatus(q, min) }
      })
      const low = rows.filter((r) => r.status === 'Low Stock').length, out = rows.filter((r) => r.status === 'Out of Stock').length
      const cats = [...new Set(mats.map((m) => m.category))]
      return {
        kpis: [kpi('SKUs', n0(rows.length)), kpi('Stock Value', money(rows.reduce((s, r) => s + Number(r.value), 0)), undefined, 'teal'), kpi('Low Stock', n0(low), 'Below re-order level', 'amber'), kpi('Out of Stock', n0(out), undefined, 'red')],
        columns: [col('code', 'Code'), col('name', 'Material'), col('category', 'Category'), col('unit', 'UOM'), col('stock', 'Closing Stock', 'dec'), col('min', 'Re-order Level', 'dec'), col('days', 'Days Cover', 'dec'), col('value', 'Value', 'inr', 'sum'), col('status', 'Status', 'text', undefined, { render: badgeCell('status') })],
        rows,
        charts: [{ kind: 'stacked', title: 'Stock health by category', x: 'cat', data: cats.map((c) => ({ cat: c, ok: rows.filter((r) => r.category === c && r.status === 'In Stock').length, low: rows.filter((r) => r.category === c && r.status === 'Low Stock').length, out: rows.filter((r) => r.category === c && r.status === 'Out of Stock').length })), series: [{ key: 'ok', name: 'In Stock', color: CHART.teal }, { key: 'low', name: 'Low', color: CHART.amber }, { key: 'out', name: 'Out', color: CHART.red }] }],
      }
    },
  },
  {
    id: 'stock-valuation', group: 'Inventory', title: 'Stock Valuation', icon: 'IndianRupee', snapshot: true, filters: [materialCategoryFilter],
    description: 'Inventory value at weighted average cost, by material and category.',
    build: (ctx) => {
      const mats = byMcat(ctx)
      const rows: Row[] = mats.map((m) => {
        const q = stockOf(m, ctx)
        const r = seeded(hashStr(m.id + 'wac'))
        const last = m.cost * r.range(0.96, 1.08)
        return { id: m.id, code: m.code, name: m.name, category: m.category, unit: m.unit, stock: q, wac: m.cost, last, value: q * m.cost, valueLast: q * last }
      }).sort((a, c) => Number(c.value) - Number(a.value))
      const tot = rows.reduce((s, r) => s + Number(r.value), 0)
      rows.forEach((r) => (r.share = pctOf(Number(r.value), tot)))
      const cats = [...new Set(mats.map((m) => m.category))]
      const cc = mcatColors(cats)
      const byCat = cats.map((c) => ({ name: c, value: rows.filter((r) => r.category === c).reduce((s, r) => s + Number(r.value), 0), color: cc[c] })).sort((a, b) => b.value - a.value)
      return {
        kpis: [kpi('Inventory Value (WAC)', money(tot), undefined, 'teal'), kpi('At Last Purchase Price', money(rows.reduce((s, r) => s + Number(r.valueLast), 0))), kpi('Top Category', byCat[0]?.name ?? '-', byCat[0] ? short(byCat[0].value) : ''), kpi('SKUs Valued', n0(rows.length))],
        columns: [col('code', 'Code'), col('name', 'Material'), col('category', 'Category'), col('unit', 'UOM'), col('stock', 'Qty', 'dec'), col('wac', 'WAC Rate', 'inr2'), col('last', 'Last Rate', 'inr2'), col('value', 'Value (WAC)', 'inr', 'sum'), col('valueLast', 'Value (Last)', 'inr', 'sum'), col('share', 'Share', 'pct', 'sum')],
        rows,
        charts: [{ kind: 'donut', title: 'Value by category', money: true, data: byCat }, { kind: 'hbar', title: 'Top 12 materials by value', x: 'name', money: true, data: rows.slice(0, 12), series: [{ key: 'value', name: 'Value', color: CHART.navy }] }],
      }
    },
  },
  {
    id: 'stock-movement', group: 'Inventory', title: 'Stock Movement', icon: 'ArrowLeftRight', defaultRange: 'last7', filters: [materialCategoryFilter],
    description: 'Opening, purchases, transfers, consumption, wastage and closing per material for the period.',
    build: (ctx) => {
      const mv = ctx.movements.filter((m) => ctx.outletIds.includes(m.outletId) && inRange(m.at, ctx.from, ctx.to))
      const rows: Row[] = byMcat(ctx).map((m) => {
        const r = seeded(hashStr(m.id + ctx.dates[0] + ctx.nDays + ctx.outletIds.join('')))
        const real = (t: string) => Math.abs(mv.filter((x) => x.materialId === m.id && x.type === t).reduce((s, x) => s + x.qty, 0))
        const cons = dailyUse(m, ctx) * ctx.nDays * r.range(0.85, 1.15) + real('Consumption')
        const wast = cons * (PERISHABLE.includes(m.category) ? r.range(0.02, 0.06) : r.range(0, 0.015)) + real('Wastage')
        const purchase = (cons + wast) * r.range(0.9, 1.15) + real('Purchase')
        const tin = (ctx.outlets.length === 1 && r.chance(0.25) ? cons * 0.08 : 0) + real('Transfer In')
        const tout = (ctx.outlets.length === 1 && r.chance(0.15) ? cons * 0.05 : 0) + real('Transfer Out')
        const adj = mv.filter((x) => x.materialId === m.id && x.type === 'Adjustment').reduce((s, x) => s + x.qty, 0)
        const closing = stockOf(m, ctx)
        const opening = Math.max(0, closing - purchase - tin + cons + wast + tout - adj)
        return { id: m.id, name: m.name, category: m.category, unit: m.unit, opening, purchase, tin, cons, wast, tout, adj, closing, value: closing * m.cost }
      })
      const sum = (k: string) => rows.reduce((s, r) => s + Number(r[k]) * (ctx.materials.find((m) => m.id === r.id)?.cost ?? 0), 0)
      return {
        kpis: [kpi('Purchases (value)', money(sum('purchase')), undefined, 'teal'), kpi('Consumption (value)', money(sum('cons')), undefined, 'navy'), kpi('Wastage (value)', money(sum('wast')), undefined, 'red'), kpi('Closing Value', money(sum('closing'))), kpi('Movements Logged', n0(mv.length), 'System transactions')],
        columns: [col('name', 'Material'), col('category', 'Category'), col('unit', 'UOM'), col('opening', 'Opening', 'dec'), col('purchase', 'Purchase', 'dec'), col('tin', 'Transfer In', 'dec'), col('cons', 'Consumption', 'dec'), col('wast', 'Wastage', 'dec'), col('tout', 'Transfer Out', 'dec'), col('adj', 'Adjust', 'dec'), col('closing', 'Closing', 'dec'), col('value', 'Closing Value', 'inr', 'sum')],
        rows,
        charts: [{ kind: 'bar', title: 'Inward vs outward (value) — top 12', x: 'name', money: true, data: rows.map((r) => { const c = ctx.materials.find((m) => m.id === r.id)!.cost; return { name: r.name, inward: (Number(r.purchase) + Number(r.tin)) * c, outward: (Number(r.cons) + Number(r.wast) + Number(r.tout)) * c } }).sort((a, b) => b.outward - a.outward).slice(0, 12), series: [{ key: 'inward', name: 'Inward', color: CHART.teal }, { key: 'outward', name: 'Outward', color: CHART.orange }] }],
      }
    },
  },
  {
    id: 'purchase', group: 'Inventory', title: 'Purchase Report', icon: 'ShoppingCart', defaultRange: 'thisMonth', tags: ['popular'],
    description: 'Purchase orders and GRNs with supplier, value, GST and receipt status.',
    filters: [{ key: 'status', label: 'Status', options: () => ['Draft', 'Pending Approval', 'Approved', 'Partially Received', 'Received', 'Returned', 'Cancelled'].map((s) => ({ value: s, label: s })) }],
    build: (ctx) => {
      const pos = ctx.purchaseOrders.filter((p) => ctx.outletIds.includes(p.outletId) && dateInRange(p.date, ctx.dates) && (!ctx.filter.status || p.status === ctx.filter.status))
      const rows: Row[] = pos.map((p) => {
        const val = p.items.reduce((s, i) => s + i.qty * i.rate, 0)
        const rec = p.items.reduce((s, i) => s + (i.received ?? 0) * i.rate, 0)
        return { id: p.id, no: p.no, date: p.date, supplier: ctx.suppliers.find((s) => s.id === p.supplierId)?.name ?? '-', outlet: outletShort(ctx, p.outletId), items: p.items.length, value: val, gst: val * 0.05, total: val * 1.05, received: rec * 1.05, grn: p.grnNo ?? '-', status: p.status, by: p.createdBy }
      }).sort((a, c) => (String(a.date) < String(c.date) ? 1 : -1))
      const bySup = new Map<string, number>()
      rows.forEach((r) => bySup.set(String(r.supplier), (bySup.get(String(r.supplier)) ?? 0) + Number(r.total)))
      return {
        kpis: [kpi('Purchase Orders', n0(rows.length)), kpi('PO Value (incl. GST)', money(rows.reduce((s, r) => s + Number(r.total), 0)), undefined, 'teal'), kpi('Received Value', money(rows.reduce((s, r) => s + Number(r.received), 0)), undefined, 'green'), kpi('Pending Approval', n0(rows.filter((r) => r.status === 'Pending Approval').length), undefined, 'amber')],
        columns: [col('no', 'PO No'), col('date', 'Date', 'date'), col('supplier', 'Supplier'), ...outletCol(ctx), col('items', 'Lines', 'num'), col('value', 'Value', 'inr', 'sum'), col('gst', 'GST', 'inr', 'sum'), col('total', 'Total', 'inr', 'sum'), col('received', 'Received', 'inr', 'sum'), col('grn', 'GRN'), col('status', 'Status', 'text', undefined, { render: badgeCell('status') }), col('by', 'Raised By')],
        rows,
        charts: [{ kind: 'hbar', title: 'Purchase value by supplier', x: 'name', money: true, data: [...bySup.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value), series: [{ key: 'value', name: 'Value', color: CHART.navy }] }],
      }
    },
  },
  {
    id: 'supplier', group: 'Inventory', title: 'Supplier Report', icon: 'Truck',
    defaultRange: 'thisMonth',
    description: 'Supplier-wise purchases, outstanding payables, payment terms and vendor rating.',
    build: (ctx) => {
      const rows: Row[] = ctx.suppliers.map((s) => {
        const pos = ctx.purchaseOrders.filter((p) => p.supplierId === s.id && ctx.outletIds.includes(p.outletId) && dateInRange(p.date, ctx.dates))
        const r = seeded(hashStr(s.id + ctx.dates[0] + ctx.nDays))
        const synth = s.outstanding * 0.6 * (ctx.nDays / 30) * r.range(0.8, 1.2) * (ctx.outlets.length / 4)
        const poVal = pos.reduce((a, p) => a + p.items.reduce((x, i) => x + i.qty * i.rate, 0), 0) * 1.05
        const purchases = poVal + synth
        return { id: s.id, code: s.code, name: s.name, category: s.category, city: s.city, pos: pos.length + Math.round(synth / 9000), purchases, paid: Math.max(0, purchases - s.outstanding * 0.5), outstanding: s.outstanding, terms: s.terms, rating: s.rating, last: pos[pos.length - 1]?.date ?? '' }
      }).sort((a, c) => Number(c.purchases) - Number(a.purchases))
      return {
        kpis: [kpi('Active Suppliers', n0(rows.length)), kpi('Purchases', money(rows.reduce((s, r) => s + Number(r.purchases), 0)), undefined, 'teal'), kpi('Outstanding Payables', money(rows.reduce((s, r) => s + Number(r.outstanding), 0)), undefined, 'red'), kpi('Avg Rating', (rows.reduce((s, r) => s + Number(r.rating), 0) / rows.length).toFixed(2) + ' ★', undefined, 'amber')],
        columns: [col('code', 'Code'), col('name', 'Supplier'), col('category', 'Category'), col('city', 'City'), col('pos', 'POs', 'num', 'sum'), col('purchases', 'Purchases', 'inr', 'sum'), col('paid', 'Paid', 'inr', 'sum'), col('outstanding', 'Outstanding', 'inr', 'sum'), col('terms', 'Terms'), col('rating', 'Rating', 'dec'), col('last', 'Last PO', 'date')],
        rows,
        charts: [{ kind: 'bar', title: 'Purchases vs outstanding', x: 'code', money: true, data: rows, series: [{ key: 'purchases', name: 'Purchases', color: CHART.navy }, { key: 'outstanding', name: 'Outstanding', color: CHART.red }] }],
      }
    },
  },
  {
    id: 'wastage', group: 'Inventory', title: 'Wastage Report', icon: 'Trash2', defaultRange: 'last7', filters: [materialCategoryFilter],
    description: 'Spoilage, expiry, preparation and over-production wastage with value and responsibility.',
    build: (ctx) => {
      const REASONS = ['Spoilage', 'Expired', 'Preparation Loss', 'Over-production', 'Spillage / Breakage', 'Returned by Guest']
      const perish = byMcat(ctx).filter((m) => PERISHABLE.includes(m.category) || ctx.filter.mcat)
      const rows: Row[] = []
      ctx.movements.filter((m) => m.type === 'Wastage' && ctx.outletIds.includes(m.outletId) && inRange(m.at, ctx.from, ctx.to)).forEach((m) => {
        const mat = ctx.materials.find((x) => x.id === m.materialId)
        if (!mat || (ctx.filter.mcat && mat.category !== ctx.filter.mcat)) return
        rows.push({ id: m.id, date: m.at, outlet: outletShort(ctx, m.outletId), name: mat.name, category: mat.category, qty: Math.abs(m.qty), unit: mat.unit, value: Math.abs(m.qty) * mat.cost, reason: 'Logged – ' + m.ref, by: m.by })
      })
      if (perish.length) ctx.dates.forEach((d) => ctx.outlets.forEach((o) => {
        const r = seeded(hashStr('w' + d + o.id))
        const n = r.int(1, 3)
        for (let i = 0; i < n; i++) {
          const m = r.pick(perish)
          const qty = Math.round(m.min * r.range(0.03, 0.12) * o.factor * 10) / 10 || 0.1
          rows.push({ id: `w${d}${o.id}${i}`, date: new Date(d + 'T00:00:00').getTime() + r.int(10, 23) * 36e5, outlet: o.short, name: m.name, category: m.category, qty, unit: m.unit, value: qty * m.cost, reason: r.pick(REASONS), by: r.pick(['Vikram Singh', 'Mohammed Irfan', 'Ramesh Pal', 'Balwinder Singh', 'Priya Sharma']) })
        }
      }))
      rows.sort((a, c) => Number(c.date) - Number(a.date))
      const tot = rows.reduce((s, r) => s + Number(r.value), 0)
      const b = salesBase(ctx)
      return {
        kpis: [kpi('Wastage Entries', n0(rows.length)), kpi('Wastage Value', money(tot), undefined, 'red'), kpi('% of Net Sales', pctOf(tot, b.total.net).toFixed(2) + '%', 'Target < 1.5%', pctOf(tot, b.total.net) < 1.5 ? 'green' : 'amber'), kpi('Top Reason', REASONS.map((x) => [x, rows.filter((r) => r.reason === x).reduce((s, r) => s + Number(r.value), 0)] as const).sort((a, c) => c[1] - a[1])[0][0])],
        columns: [col('date', 'Date & Time', 'datetime'), ...outletCol(ctx), col('name', 'Material'), col('category', 'Category'), col('qty', 'Qty', 'dec'), col('unit', 'UOM'), col('value', 'Value', 'inr', 'sum'), col('reason', 'Reason'), col('by', 'Recorded By')],
        rows,
        charts: [{ kind: 'pie', title: 'Wastage by reason', money: true, data: REASONS.map((x, i) => ({ name: x, value: rows.filter((r) => r.reason === x).reduce((s, r) => s + Number(r.value), 0), color: CHART.series[i] })) }],
      }
    },
  },
  {
    id: 'expiry', group: 'Inventory', title: 'Expiry Report', icon: 'CalendarX', snapshot: true,
    description: 'Batches expired or expiring soon with quantity and value at risk — FEFO action list.',
    filters: [{ key: 'window', label: 'Window', options: () => [{ value: '3', label: 'Within 3 days' }, { value: '7', label: 'Within 7 days' }, { value: '30', label: 'Within 30 days' }] }],
    build: (ctx) => {
      const today = new Date(todayISO() + 'T00:00:00').getTime()
      const win = Number(ctx.filter.window || 9999)
      const rows: Row[] = []
      ctx.materials.filter((m) => m.expiry).forEach((m) => ctx.outletIds.forEach((o) => {
        const q = m.stock[o] ?? 0
        if (q <= 0) return
        const left = Math.round((new Date(m.expiry! + 'T00:00:00').getTime() - today) / 864e5) - (o.charCodeAt(1) % 2)
        if (left > win) return
        rows.push({ id: m.id + o, name: m.name, category: m.category, outlet: outletShort(ctx, o), batch: 'B' + m.code.slice(2) + '-' + o.toUpperCase(), qty: q, unit: m.unit, expiry: m.expiry, left, value: q * m.cost, status: left < 0 ? 'Expired' : left <= 3 ? 'Expiring' : 'OK' })
      }))
      rows.sort((a, c) => Number(a.left) - Number(c.left))
      const risk = rows.filter((r) => r.status !== 'OK')
      return {
        kpis: [kpi('Tracked Batches', n0(rows.length)), kpi('Expiring ≤ 3 days', n0(rows.filter((r) => r.status === 'Expiring').length), undefined, 'orange'), kpi('Expired', n0(rows.filter((r) => r.status === 'Expired').length), undefined, 'red'), kpi('Value at Risk', money(risk.reduce((s, r) => s + Number(r.value), 0)), undefined, 'red')],
        columns: [col('name', 'Material'), col('category', 'Category'), ...outletCol(ctx), col('batch', 'Batch'), col('qty', 'Qty', 'dec'), col('unit', 'UOM'), col('expiry', 'Expiry', 'date'), col('left', 'Days Left', 'num'), col('value', 'Value', 'inr', 'sum'), col('status', 'Status', 'text', undefined, { render: badgeCell('status') })],
        rows,
        charts: [{ kind: 'bar', title: 'Batches by days to expiry', x: 'bucket', data: [['Expired', -999, -1], ['0–3 d', 0, 3], ['4–7 d', 4, 7], ['8–15 d', 8, 15], ['16–30 d', 16, 30], ['30+ d', 31, 9999]].map(([b, lo, hi]) => ({ bucket: b, count: rows.filter((r) => Number(r.left) >= Number(lo) && Number(r.left) <= Number(hi)).length })), series: [{ key: 'count', name: 'Batches', color: CHART.orange }] }],
      }
    },
  },
  {
    id: 'consumption', group: 'Inventory', title: 'Consumption Report (Recipe)', icon: 'ChefHat', defaultRange: 'last7',
    description: 'Theoretical raw material consumption derived from item sales × recipe (BOM) incl. standard wastage.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const map = new Map<string, { qty: number; items: Set<string> }>()
      ctx.recipes.forEach((rc) => {
        const sold = b.items.find((i) => i.id === rc.menuItemId)?.qty ?? 0
        rc.ingredients.forEach((ing) => {
          const e = map.get(ing.materialId) ?? { qty: 0, items: new Set<string>() }
          e.qty += sold * ing.qty * (1 + ing.wastage / 100)
          e.items.add(ctx.menu.find((m) => m.id === rc.menuItemId)?.name ?? '')
          map.set(ing.materialId, e)
        })
      })
      const rows: Row[] = [...map.entries()].map(([id, e]) => {
        const m = ctx.materials.find((x) => x.id === id)!
        const r = seeded(hashStr(id + ctx.dates[0] + ctx.nDays))
        const actual = e.qty * r.range(1.0, 1.09)
        return { id, name: m.name, category: m.category, unit: m.unit, usedIn: e.items.size, theoretical: e.qty, actual, variance: actual - e.qty, variancePct: pctOf(actual - e.qty, e.qty), cost: e.qty * m.cost, actualCost: actual * m.cost }
      }).sort((a, c) => Number(c.cost) - Number(a.cost))
      const th = rows.reduce((s, r) => s + Number(r.cost), 0), ac = rows.reduce((s, r) => s + Number(r.actualCost), 0)
      return {
        kpis: [kpi('Materials Consumed', n0(rows.length)), kpi('Theoretical Cost', money(th), undefined, 'navy'), kpi('Actual Cost', money(ac), undefined, 'teal'), kpi('Variance', money(ac - th), pctOf(ac - th, th).toFixed(1) + '%', 'amber')],
        columns: [col('name', 'Material'), col('category', 'Category'), col('unit', 'UOM'), col('usedIn', 'Used In (items)', 'num'), col('theoretical', 'Theoretical Qty', 'dec'), col('actual', 'Actual Qty', 'dec'), col('variance', 'Variance Qty', 'dec'), col('variancePct', 'Var %', 'pct'), col('cost', 'Theoretical Cost', 'inr', 'sum'), col('actualCost', 'Actual Cost', 'inr', 'sum')],
        rows,
        note: 'Based on configured recipes (BOM). Items without recipes are excluded.',
        charts: [{ kind: 'hbar', title: 'Theoretical vs actual cost', x: 'name', money: true, data: rows.slice(0, 12), series: [{ key: 'cost', name: 'Theoretical', color: CHART.navy }, { key: 'actualCost', name: 'Actual', color: CHART.orange }] }],
      }
    },
  },
  {
    id: 'transfers', group: 'Inventory', title: 'Inter-outlet Stock Transfer', icon: 'Repeat', defaultRange: 'thisMonth',
    description: 'Stock indents and transfers between outlets / central kitchen with value and approval trail.',
    build: (ctx) => {
      const tr = ctx.transfers.filter((t) => (ctx.outletIds.includes(t.from) || ctx.outletIds.includes(t.to)) && dateInRange(t.date, ctx.dates))
      const rows: Row[] = tr.map((t) => {
        const val = t.items.reduce((s, i) => s + i.qty * (ctx.materials.find((m) => m.id === i.materialId)?.cost ?? 0), 0)
        return { id: t.id, no: t.no, date: t.date, from: outletShort(ctx, t.from), to: outletShort(ctx, t.to), items: t.items.map((i) => ctx.materials.find((m) => m.id === i.materialId)?.name).join(', '), qty: t.items.reduce((s, i) => s + i.qty, 0), value: val, by: t.createdBy, approver: t.approvedBy ?? '-', status: t.status }
      }).sort((a, c) => (String(a.date) < String(c.date) ? 1 : -1))
      const flows = new Map<string, number>()
      rows.forEach((r) => flows.set(`${r.from} → ${r.to}`, (flows.get(`${r.from} → ${r.to}`) ?? 0) + Number(r.value)))
      return {
        kpis: [kpi('Transfers', n0(rows.length)), kpi('Transfer Value', money(rows.reduce((s, r) => s + Number(r.value), 0)), undefined, 'teal'), kpi('In Transit', n0(rows.filter((r) => r.status === 'In Transit').length), undefined, 'blue'), kpi('Pending Approval', n0(rows.filter((r) => r.status === 'Pending Approval').length), undefined, 'amber')],
        columns: [col('no', 'Transfer No'), col('date', 'Date', 'date'), col('from', 'From'), col('to', 'To'), col('items', 'Items'), col('qty', 'Qty', 'dec', 'sum'), col('value', 'Value', 'inr', 'sum'), col('by', 'Created By'), col('approver', 'Approved By'), col('status', 'Status', 'text', undefined, { render: badgeCell('status') })],
        rows,
        charts: [{ kind: 'hbar', title: 'Value by route', x: 'route', money: true, data: [...flows.entries()].map(([route, value]) => ({ route, value })), series: [{ key: 'value', name: 'Value', color: CHART.violet }] }],
      }
    },
  },
  {
    id: 'food-cost', group: 'Inventory', title: 'Food Cost / Variance', icon: 'Scale', defaultRange: 'thisMonth', tags: ['popular'],
    description: 'Recipe cost vs selling price per dish, theoretical vs actual food cost % and variance.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const rows: Row[] = ctx.recipes.map((rc) => {
        const m = ctx.menu.find((x) => x.id === rc.menuItemId)
        const cost = recipeCost(ctx, rc.id)
        const sold = b.items.find((i) => i.id === rc.menuItemId)
        const r = seeded(hashStr(rc.id + ctx.dates[0]))
        const qty = sold?.qty ?? 0
        const sales = sold?.net ?? 0
        const theo = cost * qty
        const actual = theo * r.range(1.01, 1.1)
        return { id: rc.id, name: m?.name ?? rc.code, veg: m?.veg, price: m?.price ?? 0, cost, fcPct: pctOf(cost, m?.price ?? 1), qty, sales, theo, actual, variance: actual - theo, actualPct: pctOf(actual, sales) }
      }).sort((a, c) => Number(c.sales) - Number(a.sales))
      const sales = rows.reduce((s, r) => s + Number(r.sales), 0), theo = rows.reduce((s, r) => s + Number(r.theo), 0), act = rows.reduce((s, r) => s + Number(r.actual), 0)
      return {
        kpis: [kpi('Recipe Items Sales', money(sales)), kpi('Theoretical Food Cost', pctOf(theo, sales).toFixed(1) + '%', money(theo), 'navy'), kpi('Actual Food Cost', pctOf(act, sales).toFixed(1) + '%', money(act), pctOf(act, sales) > 34 ? 'red' : 'teal'), kpi('Variance', money(act - theo), 'Leakage / over-portioning', 'amber')],
        columns: [col('name', 'Dish'), col('price', 'Menu Price', 'inr'), col('cost', 'Recipe Cost', 'inr2'), col('fcPct', 'Std FC %', 'pct'), col('qty', 'Qty Sold', 'num', 'sum'), col('sales', 'Sales', 'inr', 'sum'), col('theo', 'Theoretical Cost', 'inr', 'sum'), col('actual', 'Actual Cost', 'inr', 'sum'), col('variance', 'Variance', 'inr', 'sum'), col('actualPct', 'Actual FC %', 'pct')],
        rows,
        charts: [{ kind: 'composed', title: 'Food cost % by dish', x: 'name', data: rows, series: [{ key: 'fcPct', name: 'Std FC %', color: CHART.navy }, { key: 'actualPct', name: 'Actual FC %', type: 'line', color: CHART.red }] }],
      }
    },
  },
]
