import { seeded, hashStr } from '@/lib/rand'
import { isoDate } from '@/lib/format'
import { CHART } from '@/components/ui'
import type { ReportDef, Row } from '../types'
import { AOV, dayOutlet, hourShares, outletShort, salesBase, syntheticBills, PAY_SHARE, GST_RATE } from '../gen'
import { categoryFilter, col, kpi, money, n0, nameWithVeg, outletCol, pctOf, short, badgeCell } from './helpers'

const taxOf = (a: { cgst: number; sgst: number }) => a.cgst + a.sgst

export const SALES_REPORTS: ReportDef[] = [
  /* ----------------------------------------------------------- Daily sales */
  {
    id: 'daily-sales', group: 'Sales', title: 'Daily Sales', icon: 'CalendarDays', defaultRange: 'last7', tags: ['popular'],
    description: 'Day-wise gross, discount, net, tax and collections with average bill value.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const rows: Row[] = b.byDate.map((d) => ({
        id: d.date, date: d.date, orders: d.orders, gross: d.gross, discount: d.discount, net: d.net, cgst: d.cgst, sgst: d.sgst, service: d.service, total: d.total, abv: d.orders ? d.total / d.orders : 0,
      })).reverse()
      const best = [...b.byDate].sort((a, c) => c.net - a.net)[0]
      return {
        kpis: [
          kpi('Net Sales', money(b.total.net), `${ctx.nDays} day(s)`, 'teal'),
          kpi('Orders', n0(b.total.orders), `${n0(b.total.orders / ctx.nDays)}/day`),
          kpi('Avg Bill Value', money(b.total.total / (b.total.orders || 1))),
          kpi('Avg Daily Sales', money(b.total.net / ctx.nDays)),
          kpi('Best Day', best ? best.label : '-', best ? short(best.net) : ''),
        ],
        columns: [
          col('date', 'Date', 'date'), col('orders', 'Orders', 'num', 'sum'), col('gross', 'Gross', 'inr', 'sum'), col('discount', 'Discount', 'inr', 'sum'),
          col('net', 'Net Sales', 'inr', 'sum'), col('cgst', 'CGST', 'inr', 'sum'), col('sgst', 'SGST', 'inr', 'sum'), col('service', 'Service Chg', 'inr', 'sum'),
          col('total', 'Collection', 'inr', 'sum'), col('abv', 'Avg Bill', 'inr', 'avg'),
        ],
        rows,
        charts: [{ kind: 'composed', title: 'Net sales vs orders', x: 'label', money: true, data: b.byDate, series: [{ key: 'net', name: 'Net Sales', color: CHART.navy }, { key: 'orders', name: 'Orders', type: 'line', axis: 'right', color: CHART.teal }] }],
      }
    },
  },
  /* ----------------------------------------------------------- Monthly sales */
  {
    id: 'monthly-sales', group: 'Sales', title: 'Monthly Sales', icon: 'CalendarRange', defaultRange: 'thisMonth',
    description: 'Rolling 12-month sales trend ending in the selected period, with month-on-month growth.',
    build: (ctx) => {
      const end = ctx.to
      const months = Array.from({ length: 12 }, (_, i) => new Date(end.getFullYear(), end.getMonth() - 11 + i, 1))
      const today = isoDate()
      let prev = 0
      const rows: Row[] = months.map((m) => {
        let gross = 0, orders = 0, net = 0, tax = 0, total = 0, days = 0
        for (let d = new Date(m); d.getMonth() === m.getMonth(); d.setDate(d.getDate() + 1)) {
          const iso = isoDate(d)
          if (iso > today) break
          days++
          for (const o of ctx.outlets) { const c = dayOutlet(iso, o); gross += c.gross; orders += c.orders; net += c.net; tax += c.cgst + c.sgst; total += c.total }
        }
        const growth = prev ? ((net - prev) / prev) * 100 : 0
        prev = net
        return { id: isoDate(m), month: m.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), label: m.toLocaleDateString('en-IN', { month: 'short' }), days, orders, gross, net, tax, total, perDay: days ? net / days : 0, growth, expenses: net * 0.61, profit: net * 0.27 }
      })
      const sum = rows.reduce((s, r) => s + Number(r.net), 0)
      const last = rows[rows.length - 1], prevM = rows[rows.length - 2]
      return {
        kpis: [
          kpi('12-month Net Sales', short(sum), 'Rolling', 'teal'),
          kpi('This Month', short(Number(last.net)), `${last.days} days`),
          kpi('Last Month', short(Number(prevM.net))),
          kpi('Avg / Month', short(sum / 12)),
          kpi('Est. Profit (27%)', short(sum * 0.27), 'After food, staff & overheads', 'green'),
        ],
        columns: [col('month', 'Month'), col('days', 'Days', 'num'), col('orders', 'Orders', 'num', 'sum'), col('gross', 'Gross', 'inr', 'sum'), col('net', 'Net Sales', 'inr', 'sum'), col('tax', 'GST', 'inr', 'sum'), col('total', 'Collection', 'inr', 'sum'), col('perDay', 'Avg / Day', 'inr', 'avg'), col('growth', 'MoM Growth', 'pct')],
        rows,
        charts: [
          { kind: 'composed', title: 'Monthly trend', x: 'label', money: true, data: rows, series: [{ key: 'net', name: 'Net Sales', color: CHART.navy }, { key: 'expenses', name: 'Expenses', color: CHART.slate }, { key: 'profit', name: 'Profit', type: 'line', color: CHART.teal }] },
        ],
      }
    },
  },
  /* ----------------------------------------------------------- Outlet comparison */
  {
    id: 'outlet-comparison', group: 'Sales', title: 'Outlet Comparison', icon: 'Building2', defaultRange: 'thisMonth', tags: ['popular'],
    description: 'Side-by-side performance of every outlet — sales, orders, ABV, covers and share.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const rows: Row[] = b.byOutlet.map((o) => {
        const out = ctx.outlets.find((x) => x.id === o.outletId)!
        return { id: o.outletId, outlet: o.name, city: out.city, orders: o.orders, covers: o.pax, gross: o.gross, discount: o.discount, net: o.net, tax: taxOf(o), total: o.total, abv: o.orders ? o.total / o.orders : 0, perSeat: o.net / out.seats / ctx.nDays, share: pctOf(o.net, b.total.net) }
      })
      const top = [...rows].sort((a, c) => Number(c.net) - Number(a.net))[0]
      const trend = b.byDate.map((d) => {
        const row: Record<string, unknown> = { label: d.label }
        ctx.outlets.forEach((o) => { row[o.id] = b.cells.filter((c) => c.date === d.date && c.outletId === o.id).reduce((s, c) => s + c.net, 0) })
        return row
      })
      return {
        kpis: [kpi('Outlets', String(rows.length)), kpi('Combined Net Sales', money(b.total.net), undefined, 'teal'), kpi('Top Outlet', top ? String(top.outlet) : '-', top ? short(Number(top.net)) : ''), kpi('Combined Orders', n0(b.total.orders)), kpi('Avg Bill', money(b.total.total / (b.total.orders || 1)))],
        columns: [col('outlet', 'Outlet'), col('city', 'City'), col('orders', 'Orders', 'num', 'sum'), col('covers', 'Covers', 'num', 'sum'), col('gross', 'Gross', 'inr', 'sum'), col('discount', 'Discount', 'inr', 'sum'), col('net', 'Net Sales', 'inr', 'sum'), col('tax', 'GST', 'inr', 'sum'), col('total', 'Collection', 'inr', 'sum'), col('abv', 'ABV', 'inr', 'avg'), col('perSeat', 'Sales/Seat/Day', 'inr', 'avg'), col('share', 'Share', 'pct', 'sum')],
        rows,
        charts: [
          { kind: 'area', title: 'Daily net sales by outlet', x: 'label', money: true, data: trend, series: ctx.outlets.map((o) => ({ key: o.id, name: o.short, color: o.color })) },
          { kind: 'donut', title: 'Sales share', money: true, data: b.byOutlet.map((o) => ({ name: o.name, value: o.net, color: o.color })) },
        ],
      }
    },
  },
  /* ----------------------------------------------------------- Item-wise */
  {
    id: 'item-wise', group: 'Sales', title: 'Item-wise Sales', icon: 'UtensilsCrossed', defaultRange: 'last7', filters: [categoryFilter], tags: ['popular'],
    description: 'Quantity and revenue for every menu item with contribution to total sales.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const items = b.items.filter((i) => !ctx.filter.category || i.categoryId === ctx.filter.category)
      const tot = items.reduce((s, i) => s + i.net, 0)
      const rows: Row[] = items.map((i, idx) => ({ id: i.id, rank: idx + 1, name: i.name, veg: i.veg, category: i.category, qty: i.qty, rate: i.price, net: i.net, avg: i.qty ? i.net / i.qty : 0, share: pctOf(i.net, tot) }))
      return {
        kpis: [kpi('Items Sold', n0(items.reduce((s, i) => s + i.qty, 0)), `${items.length} SKUs`), kpi('Item Revenue', money(tot), undefined, 'teal'), kpi('Top Item', items[0]?.name ?? '-', items[0] ? short(items[0].net) : ''), kpi('Top 10 Contribution', ((items.slice(0, 10).reduce((s, i) => s + i.net, 0) / (tot || 1)) * 100).toFixed(1) + '%')],
        columns: [col('rank', '#', 'num', undefined, { width: 40 }), col('name', 'Item', 'text', undefined, { render: nameWithVeg }), col('category', 'Category'), col('qty', 'Qty', 'num', 'sum'), col('rate', 'Rate', 'inr'), col('avg', 'Avg Realised', 'inr'), col('net', 'Net Amount', 'inr', 'sum'), col('share', 'Contribution', 'pct', 'sum')],
        rows,
        charts: [{ kind: 'hbar', title: 'Top 15 items by revenue', x: 'name', money: true, data: rows.slice(0, 15), series: [{ key: 'net', name: 'Net Amount', color: CHART.teal }] }],
      }
    },
  },
  /* ----------------------------------------------------------- Category-wise */
  {
    id: 'category-wise', group: 'Sales', title: 'Category-wise Sales', icon: 'LayoutGrid', defaultRange: 'last7',
    description: 'Menu category contribution — quantity, revenue and share of sales.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const cats = [...b.categories].sort((a, c) => c.net - a.net)
      const tot = cats.reduce((s, c) => s + c.net, 0)
      const rows: Row[] = cats.map((c) => ({ id: c.id, name: c.name, items: b.items.filter((i) => i.categoryId === c.id).length, qty: c.qty, net: c.net, tax: c.net * GST_RATE, avg: c.qty ? c.net / c.qty : 0, share: pctOf(c.net, tot) }))
      return {
        kpis: [kpi('Categories', String(cats.length)), kpi('Net Sales', money(tot), undefined, 'teal'), kpi('Top Category', cats[0]?.name ?? '-', cats[0] ? pctOf(cats[0].net, tot).toFixed(1) + '% share' : ''), kpi('Items Sold', n0(cats.reduce((s, c) => s + c.qty, 0)))],
        columns: [col('name', 'Category'), col('items', 'Items', 'num'), col('qty', 'Qty Sold', 'num', 'sum'), col('avg', 'Avg Price', 'inr'), col('net', 'Net Sales', 'inr', 'sum'), col('tax', 'GST', 'inr', 'sum'), col('share', 'Share', 'pct', 'sum')],
        rows,
        charts: [
          { kind: 'donut', title: 'Category share', money: true, data: cats.map((c) => ({ name: c.name, value: c.net, color: c.color })) },
          { kind: 'bar', title: 'Quantity sold', x: 'name', data: rows, series: [{ key: 'qty', name: 'Qty', color: CHART.navy }] },
        ],
      }
    },
  },
  /* ----------------------------------------------------------- Payment mode */
  {
    id: 'payment-mode', group: 'Sales', title: 'Payment Mode Report', icon: 'Wallet', defaultRange: 'today', tags: ['popular'],
    description: 'Collections by settlement mode — Cash, UPI, Cards, Aggregator, Wallet & Due — reconciled to total.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const rows: Row[] = b.pay.map((p) => ({ id: p.name, mode: p.name, txns: p.count, amount: p.value, avg: p.count ? p.value / p.count : 0, share: pctOf(p.value, b.total.total) }))
      const daily = b.byDate.map((d) => {
        const row: Record<string, unknown> = { label: d.label }
        PAY_SHARE.forEach((p) => (row[p.name] = d.total * p.share))
        return row
      })
      const cash = b.pay.find((p) => p.name === 'Cash')?.value ?? 0
      const digital = b.total.total - cash - (b.pay.find((p) => p.name === 'Due / Credit')?.value ?? 0)
      return {
        kpis: [kpi('Total Collection', money(b.total.total), 'Matches sales total', 'teal'), kpi('Cash', money(cash), pctOf(cash, b.total.total).toFixed(1) + '%'), kpi('Digital', money(digital), pctOf(digital, b.total.total).toFixed(1) + '%', 'violet'), kpi('Transactions', n0(rows.reduce((s, r) => s + Number(r.txns), 0)))],
        columns: [col('mode', 'Payment Mode'), col('txns', 'Transactions', 'num', 'sum'), col('avg', 'Avg Ticket', 'inr'), col('amount', 'Amount', 'inr', 'sum'), col('share', 'Share', 'pct', 'sum')],
        rows,
        charts: [
          { kind: 'donut', title: 'Mode split', money: true, data: b.pay.map((p) => ({ name: p.name, value: p.value, color: p.color })) },
          { kind: 'stacked', title: 'Daily collection by mode', x: 'label', money: true, data: daily, series: PAY_SHARE.map((p) => ({ key: p.name, name: p.name, color: p.color })) },
        ],
      }
    },
  },
  /* ----------------------------------------------------------- Tax (GST) */
  {
    id: 'tax-gst', group: 'Sales', title: 'Tax (GST) Report', icon: 'Landmark', defaultRange: 'thisMonth', tags: ['popular'],
    description: 'GSTR-1 ready summary: taxable value with 5% GST split into CGST 2.5% and SGST 2.5%, per outlet GSTIN.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const rows: Row[] = []
      ;[...b.cells].sort((a, c) => (a.date < c.date ? 1 : -1)).forEach((c) => {
        const o = ctx.outlets.find((x) => x.id === c.outletId)!
        rows.push({ id: c.date + c.outletId, date: c.date, outlet: o.short, gstin: o.gstin, invoices: c.orders, taxable: c.net, rate: '5%', cgst: c.cgst, sgst: c.sgst, gst: c.cgst + c.sgst, service: c.service, invoice: c.total })
      })
      const daily = b.byDate.map((d) => ({ label: d.label, cgst: d.cgst, sgst: d.sgst }))
      return {
        kpis: [kpi('Taxable Value', money(b.total.net), undefined, 'navy'), kpi('CGST @2.5%', money(b.total.cgst)), kpi('SGST @2.5%', money(b.total.sgst)), kpi('Total GST', money(taxOf(b.total)), 'Liability for the period', 'teal'), kpi('Invoices', n0(b.total.orders))],
        columns: [col('date', 'Date', 'date'), ...outletCol(ctx), col('gstin', 'GSTIN'), col('invoices', 'Invoices', 'num', 'sum'), col('taxable', 'Taxable Value', 'inr2', 'sum'), col('rate', 'Rate', 'text', undefined, { align: 'center' }), col('cgst', 'CGST 2.5%', 'inr2', 'sum'), col('sgst', 'SGST 2.5%', 'inr2', 'sum'), col('gst', 'Total GST', 'inr2', 'sum'), col('service', 'Service Chg', 'inr2', 'sum'), col('invoice', 'Invoice Value', 'inr2', 'sum')],
        rows,
        note: 'Restaurant service under SAC 996331 — 5% GST without ITC. Service charge shown separately (non-taxable, optional for guests).',
        charts: [{ kind: 'stacked', title: 'Daily GST liability', x: 'label', money: true, data: daily, series: [{ key: 'cgst', name: 'CGST', color: CHART.navy }, { key: 'sgst', name: 'SGST', color: CHART.teal }] }],
      }
    },
  },
  /* ----------------------------------------------------------- Discount */
  {
    id: 'discount', group: 'Sales', title: 'Discount Report', icon: 'BadgePercent', defaultRange: 'last7',
    description: 'Discounts given by reason and approver, with % of gross sales and bills affected.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const reasons = [
        { r: 'Loyalty (10%)', s: 0.31, by: 'Auto – CRM' }, { r: 'Happy Hours (15%)', s: 0.22, by: 'Auto – Scheme' }, { r: 'Corporate Tie-up', s: 0.14, by: 'Outlet Manager' },
        { r: 'Manager Discretion', s: 0.12, by: 'Outlet Manager' }, { r: 'Coupon / Promo Code', s: 0.11, by: 'Auto – Coupon' }, { r: 'Staff Meal', s: 0.06, by: 'HR Policy' }, { r: 'Service Recovery', s: 0.04, by: 'Outlet Manager' },
      ]
      const rows: Row[] = reasons.map((x) => {
        const amt = b.total.discount * x.s
        const bills = Math.max(1, Math.round(amt / (AOV * 0.11)))
        return { id: x.r, reason: x.r, approver: x.by, bills, amount: amt, avg: amt / bills, pctGross: pctOf(amt, b.total.gross) }
      })
      return {
        kpis: [kpi('Total Discount', money(b.total.discount), pctOf(b.total.discount, b.total.gross).toFixed(2) + '% of gross', 'amber'), kpi('Bills Discounted', n0(rows.reduce((s, r) => s + Number(r.bills), 0))), kpi('Gross Sales', money(b.total.gross)), kpi('Avg Discount / Bill', money(b.total.discount / (rows.reduce((s, r) => s + Number(r.bills), 0) || 1)))],
        columns: [col('reason', 'Discount Reason'), col('approver', 'Approved By'), col('bills', 'Bills', 'num', 'sum'), col('avg', 'Avg / Bill', 'inr'), col('amount', 'Discount Amount', 'inr', 'sum'), col('pctGross', '% of Gross', 'pct', 'sum')],
        rows,
        charts: [
          { kind: 'pie', title: 'By reason', money: true, data: rows.map((r, i) => ({ name: String(r.reason), value: Number(r.amount), color: CHART.series[i] })) },
          { kind: 'line', title: 'Daily discount', x: 'label', money: true, data: b.byDate, series: [{ key: 'discount', name: 'Discount', color: CHART.amber }] },
        ],
      }
    },
  },
  /* ----------------------------------------------------------- Cancelled / void */
  {
    id: 'cancelled-void', group: 'Sales', title: 'Cancelled Bills / Void', icon: 'Ban', defaultRange: 'last7',
    description: 'Every cancelled bill and voided KOT item with reason, stage, user and approver — fraud control.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const REASONS = ['Customer left before service', 'Wrong item punched', 'Duplicate order', 'Item not available', 'Delay in service', 'Test bill']
      const rows: Row[] = b.liveCancelled.map((o) => ({ id: o.id, bill: o.billNo ?? o.no, at: o.createdAt, outlet: outletShort(ctx, o.outletId), type: o.type, stage: 'After KOT', reason: o.cancelReason ?? '-', by: o.cashier ?? '-', approver: 'Outlet Manager', amount: o.items.reduce((s, i) => s + i.price * i.qty, 0) * 1.05, kind: 'Cancelled' }))
      b.cells.forEach((c) => {
        const r = seeded(hashStr('cx' + c.date + c.outletId))
        for (let i = 0; i < c.cancelledCount; i++) {
          rows.push({
            id: `cx${c.date}${c.outletId}${i}`, bill: 'CX/' + String(r.int(1000, 9999)), at: new Date(c.date + 'T00:00:00').getTime() + r.int(11 * 60, 23 * 60) * 60000, outlet: outletShort(ctx, c.outletId),
            type: r.pick(['Dine-in', 'Dine-in', 'Takeaway', 'Delivery']), stage: r.chance(0.55) ? 'After KOT' : 'Before KOT', reason: r.pick(REASONS),
            by: r.pick(['Neha Gupta', 'Kavita Joshi', 'Manish Tiwari', 'Harpreet Kaur']), approver: r.pick(['Amit Verma', 'Sanjay Malhotra', 'Pooja Arora', 'Gurpreet Singh']),
            amount: (c.cancelledAmt / Math.max(1, c.cancelledCount)) * r.range(0.6, 1.4), kind: r.chance(0.3) ? 'Void' : 'Cancelled',
          })
        }
      })
      rows.sort((a, c) => Number(c.at) - Number(a.at))
      const byReason = REASONS.map((x) => ({ reason: x, count: rows.filter((r) => r.reason === x).length })).filter((x) => x.count)
      const after = rows.filter((r) => r.stage === 'After KOT').length
      return {
        kpis: [kpi('Cancelled / Void', n0(rows.length), pctOf(rows.length, b.total.orders + rows.length).toFixed(2) + '% of bills', 'red'), kpi('Value Lost', money(rows.reduce((s, r) => s + Number(r.amount), 0))), kpi('After KOT', n0(after), 'Food already prepared', 'orange'), kpi('Before KOT', n0(rows.length - after))],
        columns: [col('bill', 'Bill / Ref'), col('at', 'Date & Time', 'datetime'), ...outletCol(ctx), col('type', 'Type'), col('kind', 'Kind', 'text', undefined, { render: badgeCell('kind') }), col('stage', 'Stage'), col('reason', 'Reason'), col('by', 'Cancelled By'), col('approver', 'Approved By'), col('amount', 'Amount', 'inr', 'sum')],
        rows,
        charts: [{ kind: 'hbar', title: 'Cancellations by reason', x: 'reason', data: byReason, series: [{ key: 'count', name: 'Count', color: CHART.red }] }],
      }
    },
  },
  /* ----------------------------------------------------------- Resettlement */
  {
    id: 'resettlement', group: 'Sales', title: 'Resettlement Report', icon: 'RefreshCcw', defaultRange: 'last7',
    description: 'Bills whose payment mode was changed after settlement — original vs revised mode, reason and approver.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const rows: Row[] = []
      ctx.orders.filter((o) => ctx.outletIds.includes(o.outletId)).forEach((o) => o.resettlements?.forEach((rs, i) => {
        if (rs.at < ctx.from.getTime() || rs.at > ctx.to.getTime()) return
        rows.push({ id: o.id + i, bill: o.billNo ?? o.no, at: rs.at, outlet: outletShort(ctx, o.outletId), from: rs.from.map((p) => p.mode).join(' + '), to: rs.to.map((p) => p.mode).join(' + '), amount: rs.to.reduce((s, p) => s + p.amount, 0), reason: rs.reason, by: rs.by, approver: rs.approvedBy })
      }))
      const MODES = ['Cash', 'UPI', 'Credit Card', 'Debit Card']
      const RS = ['Wrong mode selected', 'Customer changed payment', 'Card machine failure', 'UPI pending → cash', 'Split payment correction']
      b.cells.forEach((c) => {
        const r = seeded(hashStr('rs' + c.date + c.outletId))
        const n = Math.round(c.orders * 0.004)
        for (let i = 0; i < n; i++) {
          const f = r.pick(MODES); let t = r.pick(MODES); if (t === f) t = f === 'Cash' ? 'UPI' : 'Cash'
          rows.push({ id: `rs${c.date}${c.outletId}${i}`, bill: 'B' + r.int(3000, 4099), at: new Date(c.date + 'T00:00:00').getTime() + r.int(12 * 60, 23 * 60) * 60000, outlet: outletShort(ctx, c.outletId), from: f, to: t, amount: AOV * r.range(0.5, 2.2), reason: r.pick(RS), by: r.pick(['Neha Gupta', 'Kavita Joshi', 'Manish Tiwari', 'Harpreet Kaur']), approver: r.pick(['Amit Verma', 'Rahul Sharma']) })
        }
      })
      rows.sort((a, c) => Number(c.at) - Number(a.at))
      const flows = new Map<string, number>()
      rows.forEach((r) => flows.set(`${r.from} → ${r.to}`, (flows.get(`${r.from} → ${r.to}`) ?? 0) + 1))
      return {
        kpis: [kpi('Resettled Bills', n0(rows.length), undefined, 'violet'), kpi('Value Resettled', money(rows.reduce((s, r) => s + Number(r.amount), 0))), kpi('% of Bills', pctOf(rows.length, b.total.orders).toFixed(2) + '%'), kpi('Most Common', [...flows.entries()].sort((a, c) => c[1] - a[1])[0]?.[0] ?? '-')],
        columns: [col('bill', 'Bill No'), col('at', 'Resettled At', 'datetime'), ...outletCol(ctx), col('from', 'Original Mode'), col('to', 'Revised Mode'), col('amount', 'Amount', 'inr', 'sum'), col('reason', 'Reason'), col('by', 'Requested By'), col('approver', 'Approved By')],
        rows,
        charts: [{ kind: 'hbar', title: 'Mode change flows', x: 'flow', data: [...flows.entries()].map(([flow, count]) => ({ flow, count })).sort((a, c) => c.count - a.count).slice(0, 10), series: [{ key: 'count', name: 'Bills', color: CHART.violet }] }],
      }
    },
  },
  /* ----------------------------------------------------------- Order type & source */
  {
    id: 'order-type-source', group: 'Sales', title: 'Order Type & Source Report', icon: 'Split', defaultRange: 'last7',
    description: 'Dine-in / Takeaway / Delivery and POS / Waiter App / QR / Swiggy / Zomato / Phone mix.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const rows: Row[] = b.sources.map((s) => ({ id: s.name, source: s.name, type: s.type, orders: s.count, net: s.amount, abv: s.count ? s.amount / s.count : 0, share: pctOf(s.amount, b.total.net) }))
      const daily = b.byDate.map((d) => ({ label: d.label, 'Dine-in': d.net * 0.59, Takeaway: d.net * 0.15, Delivery: d.net * 0.26 }))
      return {
        kpis: b.types.map((t) => kpi(t.name, money(t.amount), `${n0(t.count)} orders · ${pctOf(t.amount, b.total.net).toFixed(1)}%`, t.name === 'Dine-in' ? 'navy' : t.name === 'Takeaway' ? 'teal' : 'orange')).concat([kpi('Online Share', pctOf(b.sources.filter((s) => ['Swiggy', 'Zomato', 'QR Order'].includes(s.name)).reduce((x, s) => x + s.amount, 0), b.total.net).toFixed(1) + '%', 'QR + aggregators', 'violet')]),
        columns: [col('source', 'Source'), col('type', 'Order Type'), col('orders', 'Orders', 'num', 'sum'), col('abv', 'Avg Order', 'inr'), col('net', 'Net Sales', 'inr', 'sum'), col('share', 'Share', 'pct', 'sum')],
        rows,
        charts: [
          { kind: 'stacked', title: 'Order type mix by day', x: 'label', money: true, data: daily, series: b.types.map((t) => ({ key: t.name, name: t.name, color: t.color })) },
          { kind: 'donut', title: 'Source mix', money: true, data: b.sources.map((s) => ({ name: s.name, value: s.amount, color: s.color })) },
        ],
      }
    },
  },
  /* ----------------------------------------------------------- Hourly */
  {
    id: 'hourly-sales', group: 'Sales', title: 'Hourly Sales', icon: 'Clock', defaultRange: 'today',
    description: 'Hour-by-hour orders and sales to plan staffing and kitchen prep.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const hs = hourShares(ctx.outletIds)
      const next = (h: number) => (h % 12 || 12) + (h < 12 || h === 24 ? 'am' : 'pm')
      const rows: Row[] = hs.map((h) => ({ id: String(h.hour), hour: `${h.label} – ${next(h.hour + 1)}`, label: h.label, orders: Math.round(b.total.orders * h.share), net: b.total.net * h.share, abv: (b.total.net * h.share) / Math.max(1, Math.round(b.total.orders * h.share)), share: h.share * 100 }))
      const peak = [...rows].sort((a, c) => Number(c.net) - Number(a.net))[0]
      return {
        kpis: [kpi('Peak Hour', String(peak.hour), short(Number(peak.net)), 'orange'), kpi('Lunch (12–3pm)', money(rows.filter((r) => [12, 13, 14].includes(Number(r.id))).reduce((s, r) => s + Number(r.net), 0))), kpi('Dinner (7–11pm)', money(rows.filter((r) => [19, 20, 21, 22].includes(Number(r.id))).reduce((s, r) => s + Number(r.net), 0))), kpi('Net Sales', money(b.total.net), undefined, 'teal')],
        columns: [col('hour', 'Hour Slot'), col('orders', 'Orders', 'num', 'sum'), col('abv', 'Avg Order', 'inr'), col('net', 'Net Sales', 'inr', 'sum'), col('share', 'Share', 'pct', 'sum')],
        rows,
        charts: [{ kind: 'composed', title: 'Hourly sales curve', x: 'label', money: true, data: rows, series: [{ key: 'net', name: 'Net Sales', type: 'area', color: CHART.teal }, { key: 'orders', name: 'Orders', type: 'line', axis: 'right', color: CHART.navy }] }],
      }
    },
  },
  /* ----------------------------------------------------------- Bill-wise */
  {
    id: 'bill-wise', group: 'Sales', title: 'Bill-wise Report', icon: 'ReceiptText', defaultRange: 'today', tags: ['popular'],
    description: 'Every invoice with type, source, pax, gross, discount, tax, total, payment mode and cashier.',
    filters: [
      { key: 'type', label: 'Order type', options: () => ['Dine-in', 'Takeaway', 'Delivery'].map((v) => ({ value: v, label: v })) },
      { key: 'mode', label: 'Payment', options: () => ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Online (Swiggy)', 'Online (Zomato)', 'Wallet (Paytm)', 'Due / Credit', 'Split'].map((v) => ({ value: v, label: v })) },
    ],
    build: (ctx) => {
      const b = salesBase(ctx)
      const all = syntheticBills(ctx)
      const bills = all.filter((x) => (!ctx.filter.type || x.type === ctx.filter.type) && (!ctx.filter.mode || x.mode === ctx.filter.mode))
      const rows: Row[] = bills.map((x) => ({ id: x.id, bill: x.billNo, at: x.at, outlet: outletShort(ctx, x.outletId), type: x.type, source: x.source, pax: x.pax, items: x.items, gross: x.gross, discount: x.discount, tax: x.tax, service: x.service, total: x.total, mode: x.mode, cashier: x.cashier, customer: x.customer ?? 'Walk-in', status: x.status }))
      const capped = all.length < b.total.orders
      return {
        kpis: [kpi('Bills', n0(b.total.orders), capped ? `Latest ${n0(all.length)} listed` : undefined), kpi('Collection', money(b.total.total), undefined, 'teal'), kpi('Avg Bill', money(b.total.total / (b.total.orders || 1))), kpi('Largest Bill', money(Math.max(0, ...rows.map((r) => Number(r.total)))))],
        columns: [col('bill', 'Bill No'), col('at', 'Date & Time', 'datetime'), ...outletCol(ctx), col('type', 'Type'), col('source', 'Source'), col('pax', 'Pax', 'num'), col('items', 'Qty', 'num', 'sum'), col('gross', 'Gross', 'inr', 'sum'), col('discount', 'Disc', 'inr', 'sum'), col('tax', 'GST', 'inr2', 'sum'), col('service', 'S.C.', 'inr', 'sum'), col('total', 'Total', 'inr', 'sum'), col('mode', 'Mode'), col('cashier', 'Cashier'), col('customer', 'Customer'), col('status', 'Status', 'text', undefined, { render: badgeCell('status') })],
        rows,
        note: capped ? `Large period — showing the latest ${n0(all.length)} of ${n0(b.total.orders)} invoices. Export to Excel for the full register.` : undefined,
      }
    },
  },
  /* ----------------------------------------------------------- Customer-wise */
  {
    id: 'customer-wise', group: 'Sales', title: 'Customer-wise Sales', icon: 'Users', defaultRange: 'thisMonth',
    description: 'Visits, spend and average bill per CRM customer with tier and loyalty points.',
    build: (ctx) => {
      const rows: Row[] = ctx.customers.filter((c) => ctx.isAll || ctx.outletIds.includes(c.favOutlet)).map((c) => {
        const r = seeded(hashStr(c.id + ctx.dates[0] + ctx.nDays))
        const rate = c.visits / 90
        const visits = Math.max(0, Math.round(rate * ctx.nDays * r.range(0.6, 1.4) + (r.chance(Math.min(0.9, rate * ctx.nDays)) ? 1 : 0)))
        const avg = c.spend / Math.max(1, c.visits)
        return { id: c.id, name: c.name, phone: c.phone, tier: c.tier, outlet: outletShort(ctx, c.favOutlet), visits, spend: visits * avg * r.range(0.9, 1.1), avg: visits ? avg : 0, last: c.lastVisit, lifetime: c.spend, points: c.points }
      }).filter((r) => Number(r.visits) > 0).sort((a, c) => Number(c.spend) - Number(a.spend))
      const tot = rows.reduce((s, r) => s + Number(r.spend), 0)
      return {
        kpis: [kpi('Active Customers', n0(rows.length), undefined, 'teal'), kpi('CRM Sales', money(tot)), kpi('Visits', n0(rows.reduce((s, r) => s + Number(r.visits), 0))), kpi('Top Customer', rows[0] ? String(rows[0].name) : '-', rows[0] ? short(Number(rows[0].spend)) : '')],
        columns: [col('name', 'Customer'), col('phone', 'Phone'), col('tier', 'Tier'), ...outletCol(ctx), col('visits', 'Visits', 'num', 'sum'), col('avg', 'Avg Bill', 'inr'), col('spend', 'Spend (Period)', 'inr', 'sum'), col('lifetime', 'Lifetime Spend', 'inr'), col('points', 'Points', 'num'), col('last', 'Last Visit', 'date')],
        rows,
        charts: [{ kind: 'hbar', title: 'Top 10 customers', x: 'name', money: true, data: rows.slice(0, 10), series: [{ key: 'spend', name: 'Spend', color: CHART.violet }] }],
      }
    },
  },
  /* ----------------------------------------------------------- Online aggregator */
  {
    id: 'aggregator', group: 'Sales', title: 'Online Aggregator Report', icon: 'Bike', defaultRange: 'last7',
    description: 'Swiggy & Zomato orders, commission, GST on commission, TCS and expected net payout.',
    filters: [{ key: 'platform', label: 'Platform', options: () => [{ value: 'Swiggy', label: 'Swiggy' }, { value: 'Zomato', label: 'Zomato' }] }],
    build: (ctx) => {
      const b = salesBase(ctx)
      const plats = [{ name: 'Swiggy', share: 0.12, comm: 0.22, color: CHART.orange }, { name: 'Zomato', share: 0.1, comm: 0.2, color: CHART.red }].filter((p) => !ctx.filter.platform || p.name === ctx.filter.platform)
      const rows: Row[] = []
      ;[...b.byDate].reverse().forEach((d) => plats.forEach((p) => {
        const gross = d.net * p.share
        const orders = Math.round(d.orders * p.share * 1.1)
        const pkg = orders * 20
        const comm = gross * p.comm
        const gstComm = comm * 0.18
        const tcs = gross * 0.01
        const gstCollected = gross * GST_RATE
        rows.push({ id: d.date + p.name, date: d.date, platform: p.name, orders, gross, packing: pkg, gstCollected, comm, gstComm, tcs, payout: gross + pkg - comm - gstComm - tcs, commPct: p.comm * 100 })
      }))
      const sum = (k: string) => rows.reduce((s, r) => s + Number(r[k]), 0)
      const daily = b.byDate.map((d) => ({ label: d.label, Swiggy: d.net * 0.12, Zomato: d.net * 0.1 }))
      return {
        kpis: [kpi('Aggregator Sales', money(sum('gross')), `${n0(sum('orders'))} orders`, 'orange'), kpi('Commission', money(sum('comm')), pctOf(sum('comm'), sum('gross')).toFixed(1) + '%', 'red'), kpi('GST on Comm. + TCS', money(sum('gstComm') + sum('tcs'))), kpi('Net Payout', money(sum('payout')), 'Expected settlement', 'green')],
        columns: [col('date', 'Date', 'date'), col('platform', 'Platform'), col('orders', 'Orders', 'num', 'sum'), col('gross', 'Food Value', 'inr', 'sum'), col('packing', 'Packing', 'inr', 'sum'), col('gstCollected', 'GST (by Agg.)', 'inr', 'sum'), col('commPct', 'Comm %', 'pct'), col('comm', 'Commission', 'inr', 'sum'), col('gstComm', 'GST 18% on Comm', 'inr', 'sum'), col('tcs', 'TCS 1%', 'inr', 'sum'), col('payout', 'Net Payout', 'inr', 'sum')],
        rows,
        note: 'Under Sec 9(5) GST on food is collected & remitted by the aggregator; payout excludes it.',
        charts: [{ kind: 'stacked', title: 'Daily aggregator sales', x: 'label', money: true, data: daily, series: [{ key: 'Swiggy', name: 'Swiggy', color: CHART.orange }, { key: 'Zomato', name: 'Zomato', color: CHART.red }] }],
      }
    },
  },
  /* ----------------------------------------------------------- Complimentary / NC */
  {
    id: 'complimentary', group: 'Sales', title: 'Complimentary / NC Report', icon: 'Gift', defaultRange: 'thisMonth',
    description: 'Non-chargeable bills — owner guests, staff meals, food complaints & promotions — at menu value.',
    build: (ctx) => {
      const b = salesBase(ctx)
      const REASONS = ['Owner / Director Guest', 'Staff Meal', 'Food Complaint', 'Promotion / Influencer', 'Birthday Treat', 'Vendor Tasting']
      const rows: Row[] = []
      b.cells.forEach((c) => {
        const r = seeded(hashStr('nc' + c.date + c.outletId))
        for (let i = 0; i < c.ncCount; i++) {
          const items = ctx.menu.filter((m) => m.outlets.includes(c.outletId))
          const picks = Array.from({ length: r.int(1, 3) }, () => r.pick(items))
          rows.push({ id: `nc${c.date}${c.outletId}${i}`, ref: 'NC/' + String(r.int(100, 999)), at: new Date(c.date + 'T00:00:00').getTime() + r.int(12 * 60, 23 * 60) * 60000, outlet: outletShort(ctx, c.outletId), reason: r.pick(REASONS), items: picks.map((p) => p.name).join(', '), qty: picks.length, value: picks.reduce((s, p) => s + p.price, 0), cost: picks.reduce((s, p) => s + p.price, 0) * 0.32, approver: r.pick(['Abhishek Singh', 'Amit Verma', 'Rahul Sharma', 'Pooja Arora']) })
        }
      })
      rows.sort((a, c) => Number(c.at) - Number(a.at))
      const val = rows.reduce((s, r) => s + Number(r.value), 0)
      const byR = REASONS.map((x) => ({ name: x, value: rows.filter((r) => r.reason === x).reduce((s, r) => s + Number(r.value), 0) }))
      return {
        kpis: [kpi('NC Bills', n0(rows.length), undefined, 'pink'), kpi('Menu Value', money(val)), kpi('Food Cost Impact', money(val * 0.32), '≈32% food cost', 'amber'), kpi('% of Gross', pctOf(val, b.total.gross).toFixed(2) + '%')],
        columns: [col('ref', 'NC Ref'), col('at', 'Date & Time', 'datetime'), ...outletCol(ctx), col('reason', 'Reason'), col('items', 'Items'), col('qty', 'Qty', 'num', 'sum'), col('value', 'Menu Value', 'inr', 'sum'), col('cost', 'Est. Cost', 'inr', 'sum'), col('approver', 'Approved By')],
        rows,
        charts: [{ kind: 'pie', title: 'NC by reason', money: true, data: byR.map((x, i) => ({ ...x, color: CHART.series[i] })) }],
      }
    },
  },
]


