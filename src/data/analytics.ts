/**
 * Deterministic historical analytics used by dashboards & reports.
 * Live orders from the store are layered on top by hooks in `@/store/selectors`.
 */
import { seeded } from '@/lib/rand'
import { isoDate } from '@/lib/format'
import { OUTLETS } from './outlets'
import { CATEGORIES, MENU } from './menu'

const BASE_DAILY = 168000 // ₹ for factor 1.0
const AOV = 742

export function dailySeries(outletIds: string[], days = 30) {
  const out: { date: string; label: string; sales: number; orders: number; expenses: number }[] = []
  for (let d = days - 1; d >= 0; d--) {
    const dt = new Date(Date.now() - d * 864e5)
    const dow = dt.getDay()
    const weekend = dow === 0 || dow === 6 ? 1.32 : dow === 5 ? 1.15 : 1
    let sales = 0
    let orders = 0
    for (const id of outletIds) {
      const o = OUTLETS.find((x) => x.id === id)!
      const r = seeded(Number(isoDate(dt).replace(/-/g, '')) + id.charCodeAt(1) * 977)
      const s = BASE_DAILY * o.factor * weekend * r.range(0.84, 1.16) * (d === 0 ? 0.62 : 1)
      sales += s
      orders += Math.round(s / (AOV * r.range(0.92, 1.08)))
    }
    out.push({ date: isoDate(dt), label: dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), sales: Math.round(sales), orders, expenses: Math.round(sales * 0.58) })
  }
  return out
}

export function hourlySeries(outletIds: string[]) {
  const shape = [0, 0, 0, 0, 0, 0, 0, 0.6, 1.2, 1.6, 2, 3.6, 7.8, 9.6, 8.2, 4.4, 3.2, 3.8, 5.2, 8.4, 10.2, 9.4, 6.4, 2.6]
  const sum = shape.reduce((a, b) => a + b, 0)
  const factor = outletIds.reduce((s, id) => s + (OUTLETS.find((o) => o.id === id)?.factor ?? 0), 0)
  const r = seeded(outletIds.join('').length * 31)
  return shape.map((v, h) => {
    const sales = Math.round((BASE_DAILY * factor * v) / sum * r.range(0.9, 1.1))
    return { hour: h, label: (h % 12 || 12) + (h < 12 ? 'am' : 'pm'), sales, orders: Math.round(sales / AOV) }
  }).filter((x) => x.hour >= 7)
}

export function weeklySeries(outletIds: string[]) {
  const d = dailySeries(outletIds, 7 * 8)
  const weeks = []
  for (let i = 0; i < 8; i++) {
    const chunk = d.slice(i * 7, i * 7 + 7)
    weeks.push({ label: 'W' + (i + 1) + ' · ' + chunk[0].label, sales: chunk.reduce((s, x) => s + x.sales, 0), orders: chunk.reduce((s, x) => s + x.orders, 0) })
  }
  return weeks
}

export function monthlySeries(outletIds: string[]) {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    const season = [1.08, 1.0, 0.94, 0.86, 0.82, 0.88, 0.92, 0.95, 1.0, 1.1, 1.18, 1.24][dt.getMonth()]
    let sales = 0
    for (const id of outletIds) {
      const o = OUTLETS.find((x) => x.id === id)!
      const r = seeded(dt.getMonth() * 13 + dt.getFullYear() + id.charCodeAt(1))
      const opened = new Date(o.openedOn) <= dt ? 1 : 0
      sales += BASE_DAILY * 30 * o.factor * season * r.range(0.93, 1.07) * opened * (i === 11 ? now.getDate() / 30 : 1)
    }
    return { label: dt.toLocaleDateString('en-IN', { month: 'short' }), sales: Math.round(sales), expenses: Math.round(sales * 0.6), profit: Math.round(sales * 0.4 - sales * 0.12) }
  })
}

export function paymentSplit(total: number) {
  return [
    { name: 'UPI', value: Math.round(total * 0.46), color: '#14a891' },
    { name: 'Cash', value: Math.round(total * 0.22), color: '#1d3f70' },
    { name: 'Card', value: Math.round(total * 0.17), color: '#7c3aed' },
    { name: 'Online (Swiggy/Zomato)', value: Math.round(total * 0.15), color: '#ea580c' },
  ]
}

export function categorySplit(total: number) {
  const w = [0.16, 0.04, 0.27, 0.12, 0.08, 0.07, 0.11, 0.07, 0.04, 0.04]
  return CATEGORIES.map((c, i) => ({ name: c.name, value: Math.round(total * w[i]), color: c.color }))
}

export function topItems(outletIds: string[], n = 10) {
  const r = seeded(outletIds.join('').length * 7 + outletIds[0].charCodeAt(1))
  const factor = outletIds.reduce((s, id) => s + (OUTLETS.find((o) => o.id === id)?.factor ?? 0), 0)
  return MENU.filter((m) => m.outlets.some((o) => outletIds.includes(o)))
    .map((m) => {
      const qty = Math.round((m.bestseller ? r.range(60, 120) : r.range(8, 55)) * factor)
      return { id: m.id, name: m.name, veg: m.veg, emoji: m.emoji, category: CATEGORIES.find((c) => c.id === m.categoryId)!.name, qty, revenue: qty * m.price }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, n)
}

export function expenseBreakdown(total: number) {
  return [
    { name: 'Raw Material', value: Math.round(total * 0.33) },
    { name: 'Salaries', value: Math.round(total * 0.14) },
    { name: 'Rent', value: Math.round(total * 0.06) },
    { name: 'Utilities', value: Math.round(total * 0.03) },
    { name: 'Marketing', value: Math.round(total * 0.015) },
    { name: 'Aggregator Commission', value: Math.round(total * 0.025) },
    { name: 'Maintenance', value: Math.round(total * 0.01) },
  ]
}

export function sourceSplit(total: number) {
  return [
    { name: 'POS Counter', value: Math.round(total * 0.41), color: '#1d3f70' },
    { name: 'Waiter App', value: Math.round(total * 0.27), color: '#14a891' },
    { name: 'QR Order', value: Math.round(total * 0.12), color: '#7c3aed' },
    { name: 'Swiggy', value: Math.round(total * 0.11), color: '#ea580c' },
    { name: 'Zomato', value: Math.round(total * 0.09), color: '#dc2626' },
  ]
}
