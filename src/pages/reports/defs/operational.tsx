import { seeded, hashStr } from '@/lib/rand'
import { CHART } from '@/components/ui'
import { inrShort, isoDate } from '@/lib/format'
import type { ReportDef, Row } from '../types'
import { inRange } from '../range'
import { CASHIERS, dayOutlet, hourShares, outletShort, salesBase, SOURCE_SHARE, PAY_SHARE } from '../gen'
import { Heatmap } from '../charts'
import { badgeCell, col, kpi, money, n0, outletCol, pctOf, short } from './helpers'

const STATIONS: { name: string; base: number; sla: number; color: string }[] = [
  { name: 'Kitchen', base: 13.5, sla: 18, color: CHART.navy },
  { name: 'Tandoor', base: 15.5, sla: 20, color: CHART.orange },
  { name: 'Chinese', base: 10.5, sla: 14, color: CHART.red },
  { name: 'Bar', base: 4.2, sla: 6, color: CHART.sky },
  { name: 'Desserts', base: 5.8, sla: 8, color: CHART.pink },
]
const BUCKETS = [[0, 5], [5, 10], [10, 15], [15, 20], [20, 30], [30, 999]] as const
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const OPERATIONAL_REPORTS: ReportDef[] = [
  {
    id: 'kot-performance', group: 'Operational', title: 'KOT Performance', icon: 'ChefHat', defaultRange: 'today', tags: ['popular'],
    description: 'Kitchen ticket volume, average & 90th percentile prep time per station and SLA compliance.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const dist: Record<string, number[]> = {}
      const rows: Row[] = STATIONS.map((s) => {
        const items = b.items.filter((i) => i.station === s.name).reduce((a, i) => a + i.qty, 0)
        const kots = Math.max(0, Math.round(items / 2.1))
        const r = seeded(hashStr(s.name + ctx.dates[0] + ctx.nDays + ctx.outletIds.join('')))
        const samples = Array.from({ length: 300 }, () => Math.max(1, s.base * Math.exp((r.next() + r.next() + r.next() - 1.5) * 0.55)))
        samples.sort((a, c) => a - c)
        const avg = samples.reduce((a, c) => a + c, 0) / samples.length
        const p90 = samples[Math.floor(samples.length * 0.9)]
        const within = (samples.filter((x) => x <= s.sla).length / samples.length) * 100
        dist[s.name] = BUCKETS.map(([lo, hi]) => Math.round((samples.filter((x) => x >= lo && x < hi).length / samples.length) * kots))
        return { id: s.name, station: s.name, kots, items, avg, p90, max: samples[samples.length - 1], sla: s.sla, within, delayed: Math.round(kots * (1 - within / 100)), status: within >= 85 ? 'Within SLA' : 'Breached' }
      })
      const live = ctx.kots.filter((k) => ctx.outletIds.includes(k.outletId) && inRange(k.createdAt, ctx.from, ctx.to))
      const tot = rows.reduce((s, r) => s + Number(r.kots), 0)
      const wAvg = rows.reduce((s, r) => s + Number(r.avg) * Number(r.kots), 0) / (tot || 1)
      return {
        kpis: [kpi('KOTs Printed', n0(tot + live.length), `${live.length} live in system`), kpi('Avg Prep Time', wAvg.toFixed(1) + ' min', undefined, 'teal'), kpi('SLA Compliance', (rows.reduce((s, r) => s + Number(r.within) * Number(r.kots), 0) / (tot || 1)).toFixed(1) + '%', undefined, 'green'), kpi('Delayed KOTs', n0(rows.reduce((s, r) => s + Number(r.delayed), 0)), undefined, 'red'), kpi('Cancelled KOT Items', n0(live.reduce((s, k) => s + k.items.filter((i) => i.cancelled).length, 0) + Math.round(tot * 0.004)))],
        columns: [col('station', 'Station'), col('kots', 'KOTs', 'num', 'sum'), col('items', 'Items', 'num', 'sum'), col('avg', 'Avg Prep', 'min'), col('p90', 'P90 Prep', 'min'), col('max', 'Max', 'min'), col('sla', 'SLA (min)', 'num'), col('within', 'Within SLA', 'pct'), col('delayed', 'Delayed', 'num', 'sum'), col('status', 'Status', 'text', undefined, { render: badgeCell('status') })],
        rows,
        charts: [
          { kind: 'composed', title: 'Avg vs P90 prep time (min)', x: 'station', data: rows, series: [{ key: 'avg', name: 'Avg', color: CHART.teal }, { key: 'p90', name: 'P90', color: CHART.navy }, { key: 'sla', name: 'SLA', type: 'line', color: CHART.red }] },
          { kind: 'stacked', title: 'Prep-time distribution (KOT count)', x: 'bucket', data: BUCKETS.map(([lo, hi], i) => { const o: Record<string, unknown> = { bucket: hi === 999 ? '30+ min' : `${lo}–${hi} min` }; STATIONS.forEach((s) => (o[s.name] = dist[s.name][i])); return o }), series: STATIONS.map((s) => ({ key: s.name, name: s.name, color: s.color })) },
        ],
      }
    },
  },
  {
    id: 'table-utilization', group: 'Operational', title: 'Table Utilization / Turnover', icon: 'Armchair', defaultRange: 'last7',
    description: 'Table turns, covers, dwell time, occupancy % and revenue per seat for every table.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const rows: Row[] = []
      ctx.outlets.forEach((o) => {
        const tables = ctx.tables.filter((t) => t.outletId === o.id)
        const ob = b.byOutlet.find((x) => x.outletId === o.id)!
        // ~38% of dine-in orders are seated table service (rest: counter / food-court / QR self-service)
        const dineOrders = ob.orders * 0.52 * 0.38, dineNet = ob.net * 0.59 * 0.45
        const w = tables.map((t) => t.capacity * seeded(hashStr(t.id)).range(0.7, 1.3))
        const ws = w.reduce((a, c) => a + c, 0) || 1
        tables.forEach((t, i) => {
          const orders = Math.round((dineOrders * w[i]) / ws)
          const dwell = 38 + t.capacity * 7 + seeded(hashStr(t.id + 'd')).range(-6, 8)
          const hours = (orders * dwell) / 60
          const rev = (dineNet * w[i]) / ws
          rows.push({ id: t.id, table: t.label, outlet: o.short, floor: t.floor, capacity: t.capacity, orders, turns: orders / ctx.nDays, covers: Math.round(orders * Math.min(t.capacity, 1.4 + t.capacity * 0.45)), dwell, occupancy: Math.min(98, pctOf(hours, 12 * ctx.nDays)), revenue: rev, perSeat: rev / t.capacity / ctx.nDays })
        })
      })
      const avgTurn = rows.reduce((s, r) => s + Number(r.turns), 0) / (rows.length || 1)
      const floors = [...new Set(rows.map((r) => `${r.outlet} · ${r.floor}`))]
      return {
        kpis: [kpi('Tables', n0(rows.length)), kpi('Avg Turns / Table / Day', avgTurn.toFixed(2), undefined, 'teal'), kpi('Avg Dwell Time', (rows.reduce((s, r) => s + Number(r.dwell), 0) / (rows.length || 1)).toFixed(0) + ' min'), kpi('Avg Occupancy', (rows.reduce((s, r) => s + Number(r.occupancy), 0) / (rows.length || 1)).toFixed(1) + '%'), kpi('Covers', n0(rows.reduce((s, r) => s + Number(r.covers), 0)))],
        columns: [col('table', 'Table'), ...outletCol(ctx), col('floor', 'Floor / Area'), col('capacity', 'Seats', 'num', 'sum'), col('orders', 'Orders', 'num', 'sum'), col('turns', 'Turns / Day', 'dec', 'avg'), col('covers', 'Covers', 'num', 'sum'), col('dwell', 'Avg Dwell', 'min', 'avg'), col('occupancy', 'Occupancy', 'pct', 'avg'), col('revenue', 'Revenue', 'inr', 'sum'), col('perSeat', 'Rev / Seat / Day', 'inr', 'avg')],
        rows,
        charts: [
          { kind: 'bar', title: 'Turns per day by table', x: 'table', data: rows.slice(0, 40), series: [{ key: 'turns', name: 'Turns / Day', color: CHART.teal }] },
          { kind: 'hbar', title: 'Revenue by floor / area', x: 'name', money: true, data: floors.map((f) => ({ name: f, value: rows.filter((r) => `${r.outlet} · ${r.floor}` === f).reduce((s, r) => s + Number(r.revenue), 0) })), series: [{ key: 'value', name: 'Revenue', color: CHART.navy }] },
        ],
      }
    },
  },
  {
    id: 'waiter-performance', group: 'Operational', title: 'Waiter / Captain Performance', icon: 'UserCheck', defaultRange: 'last7',
    description: 'Orders, covers, sales, ABV, upselling and guest rating per waiter / captain.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const rows: Row[] = []
      ctx.outlets.forEach((o) => {
        const staff = ctx.employees.filter((e) => e.outletId === o.id && (e.department === 'Service' || /captain|waiter|steward/i.test(e.designation)))
        const ob = b.byOutlet.find((x) => x.outletId === o.id)!
        const w = staff.map((e) => seeded(hashStr(e.id + 'w')).range(0.7, 1.4) * (e.status === 'On Leave' ? 0.4 : 1))
        const ws = w.reduce((a, c) => a + c, 0) || 1
        staff.forEach((e, i) => {
          const r = seeded(hashStr(e.id + ctx.dates[0] + ctx.nDays))
          const sales = (ob.net * 0.59 * w[i]) / ws
          const orders = Math.round((ob.orders * 0.52 * w[i]) / ws)
          rows.push({ id: e.id, name: e.name, designation: e.designation, outlet: o.short, orders, covers: Math.round(orders * 2.6), sales, abv: orders ? sales / orders : 0, items: Math.round(orders * r.range(3.2, 4.6)), upsell: r.range(6, 19), service: r.range(4, 9), rating: r.range(4.1, 4.9), tips: sales * r.range(0.01, 0.025) })
        })
      })
      rows.sort((a, c) => Number(c.sales) - Number(a.sales))
      return {
        kpis: [kpi('Service Staff', n0(rows.length)), kpi('Top Performer', rows[0] ? String(rows[0].name) : '-', rows[0] ? short(Number(rows[0].sales)) : '', 'teal'), kpi('Avg ABV', money(rows.reduce((s, r) => s + Number(r.abv), 0) / (rows.length || 1))), kpi('Avg Rating', (rows.reduce((s, r) => s + Number(r.rating), 0) / (rows.length || 1)).toFixed(2) + ' ★', undefined, 'amber')],
        columns: [col('name', 'Waiter / Captain'), col('designation', 'Designation'), ...outletCol(ctx), col('orders', 'Orders', 'num', 'sum'), col('covers', 'Covers', 'num', 'sum'), col('items', 'Items', 'num', 'sum'), col('sales', 'Sales', 'inr', 'sum'), col('abv', 'ABV', 'inr', 'avg'), col('upsell', 'Upsell %', 'pct', 'avg'), col('service', 'Avg Order Time', 'min', 'avg'), col('rating', 'Rating', 'dec', 'avg'), col('tips', 'Tips', 'inr', 'sum')],
        rows,
        charts: [{ kind: 'composed', title: 'Sales & ABV', x: 'name', money: true, data: rows, series: [{ key: 'sales', name: 'Sales', color: CHART.navy }, { key: 'abv', name: 'ABV', type: 'line', axis: 'right', color: CHART.teal }] }],
      }
    },
  },
  {
    id: 'order-source-analysis', group: 'Operational', title: 'Order Source Analysis', icon: 'Radar', defaultRange: 'last7',
    description: 'Channel trend over time with growth vs previous period, fulfilment time and cancellation rate.',
    build: (ctx) => {
      const b = salesBase(ctx)
      // previous period of equal length
      let prev = 0
      for (let i = 1; i <= ctx.nDays; i++) {
        const d = new Date(ctx.from.getTime() - i * 864e5)
        const iso = isoDate(d)
        ctx.outlets.forEach((o) => (prev += dayOutlet(iso, o).net))
      }
      const FT: Record<string, number> = { POS: 48, 'Waiter App': 55, 'QR Order': 44, Swiggy: 31, Zomato: 33, Phone: 38 }
      const rows: Row[] = b.sources.map((s) => {
        const r = seeded(hashStr(s.name + ctx.dates[0] + ctx.nDays))
        const growth = (prev ? ((b.total.net - prev) / prev) * 100 : 0) + r.range(-6, 9)
        return { id: s.name, source: s.name, type: s.type, orders: s.count, net: s.amount, aov: s.count ? s.amount / s.count : 0, share: pctOf(s.amount, b.total.net), growth, fulfil: FT[s.name] * r.range(0.9, 1.1), cancel: (s.type === 'Delivery' ? 1.6 : 0.7) * r.range(0.7, 1.3), repeat: r.range(18, 46) }
      })
      const trend = b.byDate.map((d) => { const o: Record<string, unknown> = { label: d.label }; SOURCE_SHARE.forEach((s) => (o[s.name] = d.net * s.amt * seeded(hashStr(d.date + s.name)).range(0.85, 1.15))); return o })
      const growthAll = prev ? ((b.total.net - prev) / prev) * 100 : 0
      return {
        kpis: [kpi('Net Sales', money(b.total.net), undefined, 'teal'), kpi('vs Previous Period', (growthAll >= 0 ? '+' : '') + growthAll.toFixed(1) + '%', short(prev) + ' prev.', growthAll >= 0 ? 'green' : 'red'), kpi('Fastest Channel', [...rows].sort((a, c) => Number(a.fulfil) - Number(c.fulfil))[0].source as string, 'Avg fulfilment'), kpi('Online Share', pctOf(b.sources.filter((s) => s.type === 'Delivery' || s.name === 'QR Order').reduce((x, s) => x + s.amount, 0), b.total.net).toFixed(1) + '%', undefined, 'violet')],
        columns: [col('source', 'Channel'), col('type', 'Type'), col('orders', 'Orders', 'num', 'sum'), col('net', 'Net Sales', 'inr', 'sum'), col('aov', 'AOV', 'inr'), col('share', 'Share', 'pct', 'sum'), col('growth', 'Growth', 'pct'), col('fulfil', 'Avg Fulfilment', 'min'), col('cancel', 'Cancel %', 'pct'), col('repeat', 'Repeat Guests', 'pct')],
        rows,
        charts: [{ kind: 'line', title: 'Daily sales by channel', x: 'label', money: true, data: trend, series: SOURCE_SHARE.map((s) => ({ key: s.name, name: s.name, color: s.color })) }],
      }
    },
  },
  {
    id: 'peak-hour', group: 'Operational', title: 'Peak-hour Analysis', icon: 'Flame', defaultRange: 'thisMonth', defaultView: 'both', tags: ['popular'],
    description: 'Day-of-week × hour heatmap of sales to plan staffing, prep and happy hours.',
    filters: [{ key: 'metric', label: 'Metric', options: () => [{ value: 'orders', label: 'Orders' }, { value: 'sales', label: 'Net Sales' }] }],
    build: (ctx) => {
      const b = salesBase(ctx)
      const hs = hourShares(ctx.outletIds)
      const metric = ctx.filter.metric === 'orders' ? 'orders' : 'sales'
      const dowTot = DOW.map(() => ({ net: 0, orders: 0 }))
      b.byDate.forEach((d) => { const i = (new Date(d.date + 'T00:00:00').getDay() + 6) % 7; dowTot[i].net += d.net; dowTot[i].orders += d.orders })
      const values = DOW.map((_, di) => hs.map((h) => {
        const weekend = di >= 5
        const tilt = h.hour >= 19 ? (weekend ? 1.18 : 0.96) : h.hour >= 12 && h.hour <= 14 ? (weekend ? 0.92 : 1.1) : 1
        const v = (metric === 'orders' ? dowTot[di].orders : dowTot[di].net) * h.share * tilt * seeded(di * 100 + h.hour).range(0.9, 1.1)
        return Math.round(v)
      }))
      const fmt = metric === 'orders' ? (v: number) => String(v) : (v: number) => inrShort(v).replace('₹', '')
      const rows: Row[] = hs.map((h, hi) => {
        const r: Row = { id: String(h.hour), hour: h.label }
        DOW.forEach((d, di) => (r[d] = values[di][hi]))
        r.total = values.reduce((s, row) => s + row[hi], 0)
        return r
      })
      let peak = { d: 0, h: 0, v: 0 }
      values.forEach((row, di) => row.forEach((v, hi) => { if (v > peak.v) peak = { d: di, h: hi, v } }))
      const busiestDay = dowTot.map((x, i) => ({ i, v: x.net })).sort((a, c) => c.v - a.v)[0]
      const f = metric === 'orders' ? 'num' : 'inr'
      return {
        kpis: [kpi('Peak Slot', `${DOW[peak.d]} ${hs[peak.h].label}`, metric === 'orders' ? `${peak.v} orders` : short(peak.v), 'orange'), kpi('Busiest Day', DOW[busiestDay.i], short(busiestDay.v)), kpi('Lunch vs Dinner', `${(hs.filter((h) => h.hour >= 12 && h.hour <= 14).reduce((s, h) => s + h.share, 0) * 100).toFixed(0)}% / ${(hs.filter((h) => h.hour >= 19 && h.hour <= 22).reduce((s, h) => s + h.share, 0) * 100).toFixed(0)}%`), kpi('Days Analysed', n0(ctx.nDays))],
        columns: [col('hour', 'Hour'), ...DOW.map((d) => col(d, d, f, 'sum')), col('total', 'Total', f, 'sum')],
        rows,
        note: ctx.nDays < 7 ? 'Select a range of 7+ days for a complete weekly heatmap.' : undefined,
        charts: [{ kind: 'custom', title: `Heatmap · ${metric === 'orders' ? 'orders' : 'net sales (₹)'} by day × hour`, node: <Heatmap rows={DOW} cols={hs.map((h) => h.label)} values={values} fmt={fmt} color={metric === 'orders' ? '29,63,112' : '20,168,145'} /> }],
      }
    },
  },
  {
    id: 'cashier-shift', group: 'Operational', title: 'Cashier Shift Summary', icon: 'Banknote', defaultRange: 'yesterday',
    description: 'Shift-wise cash, card, UPI collections, payouts and cash drawer tally per cashier.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const rows: Row[] = []
      ;[...b.cells].sort((a, c) => (a.date < c.date ? 1 : -1)).forEach((c) => {
        ;(['Morning', 'Evening'] as const).forEach((shift, si) => {
          const r = seeded(hashStr('sh' + c.date + c.outletId + shift))
          const share = si === 0 ? 0.38 : 0.62
          const total = c.total * share
          const cash = total * PAY_SHARE[2].share, card = total * (PAY_SHARE[3].share + PAY_SHARE[4].share), upi = total * PAY_SHARE[0].share, other = total - cash - card - upi
          const opening = 5000
          const payouts = Math.round(cash * r.range(0.01, 0.03))
          const expected = opening + cash - payouts
          const diff = Math.round(r.chance(0.7) ? 0 : r.range(-250, 120))
          rows.push({ id: c.date + c.outletId + shift, date: c.date, outlet: outletShort(ctx, c.outletId), shift, cashier: (CASHIERS[c.outletId] ?? ['Cashier'])[si] ?? 'Cashier', bills: Math.round(c.orders * share), opening, cash, card, upi, other, total, payouts, expected, counted: expected + diff, diff, status: diff === 0 ? 'Tallied' : diff < 0 ? 'Short' : 'Excess' })
        })
      })
      const short_ = rows.filter((r) => r.status === 'Short')
      return {
        kpis: [kpi('Shifts', n0(rows.length)), kpi('Cash Collected', money(rows.reduce((s, r) => s + Number(r.cash), 0)), undefined, 'teal'), kpi('Shifts Short', n0(short_.length), money(short_.reduce((s, r) => s + Number(r.diff), 0)), 'red'), kpi('Net Difference', money(rows.reduce((s, r) => s + Number(r.diff), 0)))],
        columns: [col('date', 'Date', 'date'), ...outletCol(ctx), col('shift', 'Shift'), col('cashier', 'Cashier'), col('bills', 'Bills', 'num', 'sum'), col('opening', 'Opening', 'inr', 'sum'), col('cash', 'Cash', 'inr', 'sum'), col('card', 'Card', 'inr', 'sum'), col('upi', 'UPI', 'inr', 'sum'), col('other', 'Online/Other', 'inr', 'sum'), col('total', 'Total', 'inr', 'sum'), col('payouts', 'Payouts', 'inr', 'sum'), col('expected', 'Expected Cash', 'inr', 'sum'), col('counted', 'Counted', 'inr', 'sum'), col('diff', 'Diff', 'inr', 'sum'), col('status', 'Status', 'text', undefined, { render: badgeCell('status') })],
        rows,
        charts: [{ kind: 'stacked', title: 'Collection by cashier', x: 'cashier', money: true, data: [...new Set(rows.map((r) => String(r.cashier)))].map((c) => { const rs = rows.filter((r) => r.cashier === c); return { cashier: c, cash: rs.reduce((s, r) => s + Number(r.cash), 0), card: rs.reduce((s, r) => s + Number(r.card), 0), upi: rs.reduce((s, r) => s + Number(r.upi), 0) } }), series: [{ key: 'cash', name: 'Cash', color: CHART.navy }, { key: 'card', name: 'Card', color: CHART.violet }, { key: 'upi', name: 'UPI', color: CHART.teal }] }],
      }
    },
  },
]
