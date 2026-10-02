import { useMemo, useRef, useState } from 'react'
import { Cake, Download, Gift, IndianRupee, Plus, Repeat, Users } from 'lucide-react'
import { Avatar, Badge, Button, Card, DataTable, FilterBar, PageHeader, SearchInput, Segmented, Select, StatCard, type Column } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { usePermission, useScope } from '@/store/hooks'
import { toast } from '@/store/toast'
import { useShortcut } from '@/lib/shortcuts'
import { fmtDate, inr, inrShort } from '@/lib/format'
import { OUTLETS } from '@/data/outlets'
import type { Customer } from '@/types'
import { colorFor, daysToBirthday, fmtPhone, TIER_EMOJI, TIER_TONE, TIERS } from './customerUtils'
import { CustomerDrawer } from './CustomerDrawer'
import { CustomerFormModal } from './CustomerModals'

export default function Customers() {
  const customers = useStore((s) => s.customers)
  const outlets = useStore((s) => s.outlets)
  const { outletIds, isAll } = useScope()
  const { can } = usePermission()
  const [q, setQ] = useState('')
  const [tier, setTier] = useState<'all' | Customer['tier']>('all')
  const [outlet, setOutlet] = useState('all')
  const [detail, setDetail] = useState<string | null>(null)
  const [form, setForm] = useState<{ open: boolean; id?: string | null }>({ open: false })
  const searchRef = useRef<HTMLInputElement>(null)

  useShortcut('focusSearch', () => searchRef.current?.focus())

  // customers belonging to outlets in scope (by favourite outlet)
  const scoped = useMemo(() => customers.filter((c) => outletIds.includes(c.favOutlet) || !OUTLETS.some((o) => o.id === c.favOutlet) && isAll), [customers, outletIds, isAll])
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return scoped.filter((c) =>
      (tier === 'all' || c.tier === tier) && (outlet === 'all' || c.favOutlet === outlet) &&
      (!s || c.name.toLowerCase().includes(s) || c.phone.includes(s.replace(/\D/g, '') || '§') || c.email.toLowerCase().includes(s)))
  }, [scoped, q, tier, outlet])

  const k = useMemo(() => {
    const n = scoped.length || 1
    const visits = scoped.reduce((s, c) => s + c.visits, 0) || 1
    return {
      total: scoped.length,
      repeat: (scoped.filter((c) => c.visits > 1).length / n) * 100,
      avg: scoped.reduce((s, c) => s + c.spend, 0) / visits,
      points: scoped.reduce((s, c) => s + c.points, 0),
      birthdays: scoped.filter((c) => daysToBirthday(c.birthday) <= 7).length,
      tiers: TIERS.map((t) => ({ t, n: scoped.filter((c) => c.tier === t).length })),
    }
  }, [scoped])

  const exportCsv = () => {
    const lines = [['Name', 'Phone', 'Email', 'Tier', 'Visits', 'Spend', 'Last visit', 'Points', 'Favourite outlet', 'Tags'],
      ...rows.map((c) => [c.name, c.phone, c.email, c.tier, c.visits, c.spend, c.lastVisit, c.points, outlets.find((o) => o.id === c.favOutlet)?.short ?? '', c.tags.join(' | ')])]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([lines.map((l) => l.map((x) => `"${x}"`).join(',')).join('\n')], { type: 'text/csv' }))
    a.download = 'customers.csv'
    a.click()
    toast.success('Exported customers.csv', `${rows.length} customers`)
  }

  const columns: Column<Customer>[] = [
    {
      key: 'name', header: 'Customer',
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={c.name} color={colorFor(c.id)} size={30} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-medium text-slate-800">{c.name}{daysToBirthday(c.birthday) <= 7 && <Cake className="size-3 text-pink-500" />}</p>
            <p className="truncate text-[10.5px] text-slate-400">{c.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (c) => <span className="whitespace-nowrap tabular text-slate-600">{fmtPhone(c.phone)}</span> },
    { key: 'tier', header: 'Tier', sortValue: (c) => TIERS.indexOf(c.tier), render: (c) => <Badge tone={TIER_TONE[c.tier]}>{TIER_EMOJI[c.tier]} {c.tier}</Badge> },
    { key: 'visits', header: 'Visits', align: 'right' },
    { key: 'spend', header: 'Total spend', align: 'right', render: (c) => <span className="font-semibold text-slate-900">{inr(c.spend)}</span> },
    { key: 'lastVisit', header: 'Last visit', render: (c) => <span className="whitespace-nowrap text-slate-600">{fmtDate(c.lastVisit)}</span> },
    { key: 'points', header: 'Points', align: 'right', render: (c) => <span className="tabular">{c.points.toLocaleString('en-IN')}</span> },
    ...(isAll ? [{
      key: 'fav', header: 'Outlet', sortValue: (c: Customer) => c.favOutlet,
      render: (c: Customer) => { const o = outlets.find((x) => x.id === c.favOutlet); return <span className="flex items-center gap-1.5 whitespace-nowrap text-slate-600"><span className="size-1.5 rounded-full" style={{ background: o?.color }} />{o?.short}</span> },
    } as Column<Customer>] : []),
    { key: 'tags', header: 'Tags', sortable: false, render: (c) => <div className="flex flex-wrap gap-1">{c.tags.map((t) => <Badge key={t} tone={t === 'High Value' ? 'teal' : t === 'Regular' ? 'navy' : 'gray'}>{t}</Badge>)}</div> },
  ]

  return (
    <div>
      <PageHeader
        title="Customers & Loyalty"
        subtitle="Guest profiles, visit history and loyalty programme"
        breadcrumbs={[{ label: 'Operations' }, { label: 'Customers' }]}
        actions={<>
          <Button icon={<Download className="size-3.5" />} onClick={exportCsv}>Export</Button>
          {can('customers', 'create') && <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setForm({ open: true, id: null })}>Add customer</Button>}
        </>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total customers" value={k.total.toLocaleString('en-IN')} icon={<Users />} sub={`${k.birthdays} birthdays this week`} />
        <StatCard label="Repeat customers" value={`${k.repeat.toFixed(1)}%`} icon={<Repeat />} tone="teal" sub="visited more than once" />
        <StatCard label="Avg spend per visit" value={inr(k.avg)} icon={<IndianRupee />} tone="violet" sub="across all visits" />
        <StatCard label="Points outstanding" value={k.points.toLocaleString('en-IN')} icon={<Gift />} tone="amber" sub={`≈ ${inrShort(k.points)} liability`} />
      </div>

      <Card>
        <FilterBar>
          <SearchInput ref={searchRef} className="w-64" placeholder="Search name, phone or email…" kbd="F2" value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} />
          <Segmented size="sm" value={tier} onChange={setTier} items={[{ value: 'all', label: 'All tiers' }, ...k.tiers.map(({ t, n }) => ({ value: t, label: `${TIER_EMOJI[t]} ${t} · ${n}` }))]} />
          {isAll && (
            <Select className="w-44" value={outlet} onChange={(e) => setOutlet(e.target.value)}>
              <option value="all">All outlets</option>
              {outlets.filter((o) => outletIds.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{o.short}</option>)}
            </Select>
          )}
          <span className="ml-auto text-[12px] text-slate-500">{rows.length} customers</span>
        </FilterBar>
        <DataTable columns={columns} rows={rows} onRowClick={(c) => setDetail(c.id)} pageSize={12} />
      </Card>

      <CustomerDrawer customerId={detail} onClose={() => setDetail(null)} onEdit={(id) => setForm({ open: true, id })} />
      <CustomerFormModal open={form.open} editId={form.id} onClose={() => setForm({ open: false })} onCreated={(id) => setDetail(id)} />
    </div>
  )
}
