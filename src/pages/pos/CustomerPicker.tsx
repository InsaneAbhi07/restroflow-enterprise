import { useEffect, useMemo, useRef, useState } from 'react'
import { Crown, Search, UserPlus, UserRound, X } from 'lucide-react'
import { Badge, Button, Input, type Tone } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { toast } from '@/store/toast'
import { cn, isoDate, uid } from '@/lib/format'
import type { Customer } from '@/types'

export const TIER_TONE: Record<Customer['tier'], Tone> = { Bronze: 'orange', Silver: 'gray', Gold: 'amber', Platinum: 'violet' }

export function CustomerPicker({ customerId, name, phone, outletId, onChange, disabled, openSignal }: {
  customerId?: string; name?: string; phone?: string; outletId: string; disabled?: boolean; openSignal?: number
  onChange: (c: { customerId?: string; customerName?: string; customerPhone?: string }) => void
}) {
  const customers = useStore((s) => s.customers)
  const upsert = useStore((s) => s.upsertCustomer)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [nName, setNName] = useState('')
  const [nPhone, setNPhone] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const sel = customers.find((c) => c.id === customerId)

  useEffect(() => { if (openSignal) setOpen(true) }, [openSignal])
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setAdding(false) } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (t ? customers.filter((c) => c.name.toLowerCase().includes(t) || c.phone.includes(t)) : [...customers].sort((a, b) => b.visits - a.visits)).slice(0, 7)
  }, [customers, q])

  const pick = (c: Customer) => { onChange({ customerId: c.id, customerName: c.name, customerPhone: c.phone }); setOpen(false); setQ('') }
  const create = () => {
    if (!nName.trim() || !/^\d{10}$/.test(nPhone.trim())) return void toast.warning('Enter name and a 10-digit mobile number')
    const c: Customer = { id: uid('cu'), name: nName.trim(), phone: nPhone.trim(), email: '', visits: 0, spend: 0, lastVisit: isoDate(), points: 0, tier: 'Bronze', notes: '', favOutlet: outletId, tags: ['New'] }
    upsert(c)
    pick(c)
    setAdding(false); setNName(''); setNPhone('')
    toast.success('Customer added', `${c.name} enrolled in loyalty (Bronze)`)
  }

  return (
    <div ref={ref} className="relative">
      <button disabled={disabled} onClick={() => setOpen((v) => !v)}
        className={cn('flex h-8 w-full items-center gap-2 rounded-lg border px-2 text-left text-[12.5px] transition disabled:opacity-60', sel || name ? 'border-brand-200 bg-brand-50/50' : 'border-dashed border-slate-300 text-slate-500 hover:border-brand-300 hover:bg-slate-50')}>
        <UserRound className="size-3.5 shrink-0 text-slate-400" />
        {sel ? (
          <>
            <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{sel.name} <span className="font-normal text-slate-400">· {sel.phone}</span></span>
            <Badge tone={TIER_TONE[sel.tier]}><Crown className="size-2.5" />{sel.tier}</Badge>
            <span className="text-[11px] font-medium text-brand-700 tabular">{sel.points} pts</span>
          </>
        ) : name ? (
          <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{name}{phone && <span className="font-normal text-slate-400"> · {phone}</span>}</span>
        ) : <span className="flex-1">Add customer (loyalty, e-bill)</span>}
        {(sel || name) && !disabled && (
          <span role="button" onClick={(e) => { e.stopPropagation(); onChange({ customerId: undefined, customerName: undefined, customerPhone: undefined }) }} className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-rose-500"><X className="size-3" /></span>
        )}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-40 mt-1 rounded-xl border border-slate-200 bg-white p-2 shadow-pop animate-pop">
          {!adding ? (
            <>
              <Input autoFocus icon={<Search />} placeholder="Search name or mobile…" value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && list[0]) pick(list[0]) }} />
              <div className="mt-1.5 max-h-[230px] overflow-y-auto">
                {list.map((c) => (
                  <button key={c.id} onClick={() => pick(c)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50">
                    <span className="flex size-7 items-center justify-center rounded-full bg-navy-50 text-[11px] font-semibold text-navy-700">{c.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-slate-800">{c.name}</span>
                      <span className="block text-[11px] text-slate-400">{c.phone} · {c.visits} visits</span>
                    </span>
                    <span className="text-right">
                      <Badge tone={TIER_TONE[c.tier]}>{c.tier}</Badge>
                      <span className="block text-[10.5px] text-slate-400 tabular">{c.points} pts</span>
                    </span>
                  </button>
                ))}
                {list.length === 0 && <p className="px-2 py-3 text-center text-[12px] text-slate-400">No customer found</p>}
              </div>
              <Button size="sm" block variant="secondary" className="mt-1.5" icon={<UserPlus className="size-3.5" />} onClick={() => { setAdding(true); if (/^\d+$/.test(q)) setNPhone(q); else setNName(q) }}>New customer</Button>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-slate-700">Quick add customer</p>
              <Input autoFocus placeholder="Full name" value={nName} onChange={(e) => setNName(e.target.value)} />
              <Input placeholder="10-digit mobile" value={nPhone} onChange={(e) => setNPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} onKeyDown={(e) => e.key === 'Enter' && create()} />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => setAdding(false)}>Back</Button>
                <Button size="sm" variant="accent" className="flex-1" onClick={create}>Save & select</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
