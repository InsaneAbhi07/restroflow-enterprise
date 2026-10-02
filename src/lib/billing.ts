import type { Order, OrderItem, Totals } from '@/types'

export const lineTotal = (i: OrderItem) => (i.price + (i.modifiers?.reduce((s, m) => s + m.price, 0) ?? 0)) * i.qty

/** GST split in CGST/SGST halves, discount applied before tax, service charge on post-discount amount. */
export function computeTotals(o: Pick<Order, 'items' | 'discount' | 'serviceCharge' | 'deliveryCharge'>): Totals {
  const items = o.items.filter((i) => !i.cancelled)
  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0)
  const qty = items.reduce((s, i) => s + i.qty, 0)
  const discount = Math.min(subtotal, o.discount.type === 'pct' ? (subtotal * o.discount.value) / 100 : o.discount.value)
  const ratio = subtotal ? (subtotal - discount) / subtotal : 0
  const tax = items.reduce((s, i) => s + lineTotal(i) * ratio * (i.gst / 100), 0)
  const taxable = subtotal - discount
  const service = (taxable * (o.serviceCharge || 0)) / 100
  const delivery = o.deliveryCharge || 0
  const raw = taxable + tax + service + delivery
  const total = Math.round(raw)
  return {
    subtotal, discount, taxable,
    cgst: tax / 2, sgst: tax / 2,
    service, delivery, roundOff: total - raw, total, qty,
  }
}

export const paidAmount = (o: Order) => o.payments.reduce((s, p) => s + p.amount, 0)
export const orderTotal = (o: Order) => computeTotals(o).total
