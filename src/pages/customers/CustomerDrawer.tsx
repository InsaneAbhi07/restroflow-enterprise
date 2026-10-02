import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Cake, Gift, Mail, MessageCircle, Minus, Pencil, Phone, Plus, ReceiptText, Save, Store } from 'lucide-react'
import { Avatar, Badge, Button, CHART, Divider, Drawer, Progress, StatusBadge, Textarea, tooltipStyle } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { computeTotals } from '@/lib/billing'
import { seeded, hashStr } from '@/lib/rand'
import { fmtDate, inr, timeAgo } from '@/lib/format'
import { colorFor, daysToBirthday, fmtBirthday, fmtPhone, TIER_EMOJI, TIER_TONE, tierProgress } from './customerUtils'
import { PointsModal } from './CustomerModals'

export function CustomerDrawer({ customerId, onClose, onEdit }: { customerId: string | null; onClose: () => void; onEdit: (id: string) => void }) {
  const customer = useStore((s) => s.customers.find((c) => c.id === customerId))
  const orders = useStore((s) => s.orders)
  const outlets = useStore((s) => s.outlets)
  const menu = useStore((s) => s.menu)
  const upsert = useStore((s) => s.upsertCustomer)
  const { can } = usePermission()
  const nav = useNavigate()
  const [notes, setNotes] = useState('')
  const [points, setPoints] = useState<'add' | 'redeem' | null>(null)

  useEffect(() => { setNotes(customer?.notes ?? '') }, [customer?.id, customer?.notes])

  const history = useMemo(() => {
    if (!customer) return []
    const real = orders.filter((o) => o.customerId === customer.id && o.status !== 'Draft').map((o) => ({
      id: o.id, no: o.billNo ?? o.no, at: o.settledAt ?? o.createdAt, outletId: o.outletId, items: o.items.filter((i) => !i.cancelled).map((i) => `${i.qty}× ${i.name}`), total: computeTotals(o).total, status: o.status as string, mode: o.payments.map((p) => p.mode).join(' + ') || '—',
    }))
    // a few synthetic past visits for richer history
    const r = seeded(hashStr(customer.id))
    const n = Math.min(5, Math.max(1, customer.visits - real.length))
    const synth = Array.from({ length: customer.visits > real.length ? n : 0 }, (_, i) => {
      const its = Array.from({ length: r.int(2, 4) }, () => r.pick(menu))
      return {
        id: `syn_${customer.id}_${i}`, no: 'B' + (3900 - i * 37 - r.int(0, 20)), at: Date.now() - (i + 1) * r.int(6, 18) * 864e5,
        outletId: r.chance(0.7) ? customer.favOutlet : r.pick(outlets).id,
        items: its.map((m) => `${r.int(1, 2)}× ${m.name}`), total: Math.round(its.reduce((s, m) => s + m.price, 0) * 1.1), status: 'Settled', mode: r.pick(['UPI', 'Cash', 'Credit Card', 'UPI']),
      }
    })
    return [...real, ...synth].sort((a, b) => b.at - a.at)
  }, [customer, orders, menu, outlets])

  const monthly = useMemo(() => {
    if (!customer) return []
    const r = seeded(hashStr(customer.id) + 7)
    const now = new Date()
    const perMonth = Math.max(0.2, customer.visits / 10)
    return Array.from({ length: 6 }, (_, i) => {
      const dt = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      return { label: dt.toLocaleDateString('en-IN', { month: 'short' }), visits: Math.max(0, Math.round(perMonth * r.range(0.3, 1.7))) }
    })
  }, [customer])

  if (!customer) return null
  const tp = tierProgress(customer)
  const fav = outlets.find((o) => o.id === customer.favOutlet)
  const avg = customer.visits ? customer.spend / customer.visits : 0
  const bd = daysToBirthday(customer.birthday)
  const freq = customer.visits > 1 ? Math.max(2, Math.round(365 / Math.min(customer.visits, 120) )) : null
  const canEdit = can('customers', 'edit')

  const saveNotes = () => {
    upsert({ ...customer, notes })
    toast.success('Notes saved', customer.name)
  }

  return (
    <>
      <Drawer open={!!customerId} onClose={onClose} width={560}
        icon={<Avatar name={customer.name} color={colorFor(customer.id)} size={40} />}
        title={customer.name}
        subtitle={`${fmtPhone(customer.phone)} · customer since ${fmtDate(Date.now() - customer.visits * 9 * 864e5 - 30 * 864e5)}`}
        footer={<>
          <Button icon={<MessageCircle className="size-3.5" />} onClick={() => toast.success('WhatsApp offer sent', `“Flat 15% off on your next visit” sent to ${fmtPhone(customer.phone)} (simulated)`)}>Send offer</Button>
          {canEdit && <Button icon={<Pencil className="size-3.5" />} onClick={() => onEdit(customer.id)}>Edit</Button>}
          {can('pos', 'create') && <Button variant="primary" icon={<ReceiptText className="size-3.5" />} onClick={() => { onClose(); nav('/pos?new=1') }}>New bill</Button>}
        </>}>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={TIER_TONE[customer.tier]}>{TIER_EMOJI[customer.tier]} {customer.tier} member</Badge>
            {customer.tags.map((t) => <Badge key={t} tone={t === 'High Value' ? 'teal' : t === 'Regular' ? 'navy' : 'gray'}>{t}</Badge>)}
            {bd <= 7 && <Badge tone="pink"><Cake className="size-3" />{bd === 0 ? 'Birthday today!' : `Birthday in ${bd} days`}</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[['Visits', customer.visits.toString()], ['Total spend', inr(customer.spend)], ['Avg per visit', inr(avg)], ['Last visit', timeAgo(new Date(customer.lastVisit).getTime() + 12 * 36e5).replace('just now', 'today')]].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                <p className="text-[11px] text-slate-500">{l}</p>
                <p className="truncate text-[14px] font-semibold text-slate-900 tabular">{v}</p>
              </div>
            ))}
          </div>

          {/* tier + points */}
          <div className="rounded-xl border border-slate-200 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] text-slate-500">Loyalty balance</p>
                <p className="text-[20px] font-semibold leading-tight text-slate-900 tabular">{customer.points.toLocaleString('en-IN')} <span className="text-[12px] font-normal text-slate-400">pts ≈ {inr(customer.points)}</span></p>
              </div>
              {canEdit && (
                <div className="flex gap-1.5">
                  <Button size="sm" variant="success" icon={<Plus className="size-3.5" />} onClick={() => setPoints('add')}>Add</Button>
                  <Button size="sm" icon={<Minus className="size-3.5" />} disabled={!customer.points} onClick={() => setPoints('redeem')}>Redeem</Button>
                </div>
              )}
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[11.5px]">
                <span className="text-slate-600">{TIER_EMOJI[customer.tier]} {customer.tier}</span>
                <span className="text-slate-500">{tp.next ? <>{inr(tp.remaining)} more to {TIER_EMOJI[tp.next]} <b>{tp.next}</b></> : 'Highest tier reached'}</span>
              </div>
              <Progress value={tp.pct} tone={customer.tier === 'Platinum' ? 'violet' : customer.tier === 'Gold' ? 'amber' : 'teal'} className="h-2" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 text-[12.5px]">
              <p className="flex items-center gap-2 text-slate-700"><Phone className="size-3.5 text-slate-400" />{fmtPhone(customer.phone)}</p>
              <p className="flex items-center gap-2 truncate text-slate-700"><Mail className="size-3.5 text-slate-400" />{customer.email || '—'}</p>
              <p className="flex items-center gap-2 text-slate-700"><Cake className="size-3.5 text-slate-400" />{fmtBirthday(customer.birthday)}</p>
              <p className="flex items-center gap-2 text-slate-700"><Store className="size-3.5 text-slate-400" />Favourite: <span className="flex items-center gap-1 font-medium"><span className="size-2 rounded-full" style={{ background: fav?.color }} />{fav?.short ?? '—'}</span></p>
              <p className="flex items-center gap-2 text-slate-700"><Gift className="size-3.5 text-slate-400" />{freq ? `Visits about every ${freq} days` : 'First-time guest'}</p>
            </div>
            <div>
              <p className="mb-1 text-[11px] text-slate-500">Visit frequency · last 6 months</p>
              <div className="h-[96px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" tick={CHART.axis} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} formatter={(v) => [String(v), 'Visits']} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="visits" fill={colorFor(customer.id)} radius={[4, 4, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div>
            <Divider label="Notes & preferences" className="mb-2" />
            <Textarea rows={3} value={notes} disabled={!canEdit} onChange={(e) => setNotes(e.target.value)} placeholder="Allergies, seating preference, favourite dishes…" />
            {canEdit && notes !== customer.notes && (
              <div className="mt-1.5 flex justify-end gap-1.5">
                <Button size="xs" variant="ghost" onClick={() => setNotes(customer.notes)}>Discard</Button>
                <Button size="xs" variant="primary" icon={<Save className="size-3" />} onClick={saveNotes}>Save notes</Button>
              </div>
            )}
          </div>

          <div>
            <Divider label={`Recent orders (${history.length})`} className="mb-2" />
            <div className="space-y-1.5">
              {history.slice(0, 8).map((h) => {
                const o = outlets.find((x) => x.id === h.outletId)
                return (
                  <div key={h.id} className="rounded-lg border border-slate-100 px-3 py-2">
                    <div className="flex items-center justify-between gap-2 text-[12.5px]">
                      <span className="font-medium text-slate-800">{h.no} <span className="font-normal text-slate-400">· {fmtDate(h.at)}</span></span>
                      <span className="font-semibold text-slate-900 tabular">{inr(h.total)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span className="truncate">{h.items.join(', ')}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="flex items-center gap-1"><span className="size-1.5 rounded-full" style={{ background: o?.color }} />{o?.short}</span>
                        · {h.mode} {h.status !== 'Settled' && <StatusBadge status={h.status} />}
                      </span>
                    </div>
                  </div>
                )
              })}
              {!history.length && <p className="py-4 text-center text-[12px] text-slate-400">No orders yet.</p>}
            </div>
          </div>
        </div>
      </Drawer>
      <PointsModal customer={points ? customer : null} mode={points ?? 'add'} onClose={() => setPoints(null)} />
    </>
  )
}
