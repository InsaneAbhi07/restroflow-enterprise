import { memo } from 'react'
import { CheckCircle2, ChefHat, Clock, Eye, Flag, HandPlatter, MoreVertical, Printer, User, X, XCircle } from 'lucide-react'
import type { Kot, MenuItem } from '@/types'
import { Badge, Button, Dropdown, MenuItemBtn, VegMark } from '@/components/ui'
import { cn, elapsed, fmtTime } from '@/lib/format'
import { SOURCE_TONE, itemStation, timerTone, type StationFilter } from './kotUtils'

export interface KotCardProps {
  kot: Kot
  now: number
  menu: MenuItem[]
  station: StationFilter
  editable: boolean
  fresh?: boolean
  compact?: boolean
  onAdvance: (k: Kot) => void
  onCancelItem: (k: Kot, index: number) => void
  onCancelKot: (k: Kot) => void
  onView: (k: Kot) => void
  onPrint: (k: Kot) => void
}

const ACTION: Partial<Record<Kot['status'], { label: string; variant: 'accent' | 'warning' | 'success'; icon: React.ReactNode }>> = {
  New: { label: 'Accept & Start', variant: 'accent', icon: <ChefHat className="size-3.5" /> },
  Preparing: { label: 'Mark Ready', variant: 'success', icon: <CheckCircle2 className="size-3.5" /> },
  Ready: { label: 'Mark Served', variant: 'warning', icon: <HandPlatter className="size-3.5" /> },
}

function KotCardImpl({ kot, now, menu, station, editable, fresh, compact, onAdvance, onCancelItem, onCancelKot, onView, onPrint }: KotCardProps) {
  const active = kot.status === 'New' || kot.status === 'Preparing'
  const mins = Math.floor((now - kot.createdAt) / 60000)
  const tone = timerTone(mins)
  const late = active && mins >= 20
  const action = ACTION[kot.status]
  const liveItems = kot.items.filter((i) => !i.cancelled)
  const qty = liveItems.reduce((s, i) => s + i.qty, 0)

  if (compact) {
    return (
      <button onClick={() => onView(kot)} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left transition hover:border-slate-300">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-bold text-slate-900">{kot.type === 'Dine-in' ? kot.tableLabel : kot.type === 'Room Service' ? `Room ${kot.tableLabel.replace(/^R/, '')}` : kot.type}</span>
          <span className="text-[10.5px] text-slate-400">{fmtTime(kot.updatedAt)}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate-500">
          <span>{kot.no} · {qty} items</span>
          <Badge tone={SOURCE_TONE[kot.source]} className="text-[10px]">{kot.source}</Badge>
        </div>
      </button>
    )
  }

  return (
    <div
      className={cn(
        'animate-pop overflow-hidden rounded-xl border-2 bg-white shadow-card transition',
        active ? tone.border : 'border-slate-200',
        fresh && 'ring-4 ring-brand-300/60',
      )}
      style={late ? { animation: 'kds-pulse 1.4s ease-in-out infinite' } : undefined}
    >
      {/* header */}
      <div className={cn('flex items-start justify-between gap-2 px-3 py-2', active ? tone.bg : 'bg-slate-50')}>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[22px] font-extrabold leading-none tracking-tight text-slate-900">{kot.type === 'Dine-in' || kot.type === 'Room Service' ? kot.tableLabel : kot.type === 'Delivery' ? 'DLV' : 'TKW'}</span>
            {kot.priority && <Badge tone="red" className="text-[10px]"><Flag className="size-2.5" />Priority</Badge>}
            {fresh && <Badge tone="teal" className="text-[10px]">NEW</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">{kot.no}</span>·<span>{kot.orderNo}</span>·<span>{kot.type}</span>
          </div>
        </div>
        <div className="text-right">
          {active ? (
            <div className={cn('flex items-center gap-1 font-mono text-[17px] font-bold tabular', tone.text)}>
              <Clock className="size-3.5" />{elapsed(kot.createdAt, now)}
            </div>
          ) : (
            <div className="text-[11px] font-medium text-slate-500">{kot.status} {fmtTime(kot.updatedAt)}</div>
          )}
          <div className="text-[10.5px] text-slate-400">Recv {fmtTime(kot.createdAt)}</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-y border-slate-100 px-3 py-1.5 text-[11px]">
        <Badge tone={SOURCE_TONE[kot.source]}>{kot.source}</Badge>
        <span className="flex min-w-0 items-center gap-1 truncate text-slate-500"><User className="size-3" />{kot.waiterName}</span>
      </div>

      {/* items */}
      <ul className="divide-y divide-slate-100 px-3">
        {kot.items.map((it, idx) => {
          const dim = station !== 'All' && itemStation(it.name, menu) !== station
          return (
            <li key={idx} className={cn('group flex items-start gap-2 py-1.5', dim && 'opacity-35', it.cancelled && 'opacity-50')}>
              <span className={cn('mt-px min-w-[26px] rounded bg-navy-900 px-1 text-center text-[12px] font-bold text-white', it.cancelled && 'bg-slate-400')}>{it.qty}×</span>
              <div className="min-w-0 flex-1">
                <div className={cn('flex items-center gap-1.5 text-[13px] font-semibold text-slate-800', it.cancelled && 'line-through')}>
                  <VegMark veg={it.veg} />
                  <span className="truncate">{it.name}</span>
                  {it.variant && <span className="shrink-0 rounded bg-slate-100 px-1 text-[10.5px] font-medium text-slate-600">{it.variant}</span>}
                </div>
                {it.modifiers?.length ? <div className="text-[11px] text-slate-500">+ {it.modifiers.join(', ')}</div> : null}
                {it.note && <div className="mt-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">» {it.note}</div>}
                {it.cancelled && <div className="text-[10.5px] font-semibold uppercase text-rose-600">Cancelled</div>}
              </div>
              {editable && active && !it.cancelled && (
                <button title="Cancel item" onClick={() => onCancelItem(kot, idx)} className="rounded p-0.5 text-slate-300 opacity-60 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100">
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {/* footer */}
      <div className="flex items-center gap-1.5 border-t border-slate-100 bg-slate-50/60 px-2 py-2">
        {editable && action ? (
          <Button size="sm" variant={action.variant} icon={action.icon} className="flex-1" onClick={() => onAdvance(kot)}>{action.label}</Button>
        ) : (
          <span className="flex-1 pl-1 text-[11px] text-slate-400">{qty} items{!editable && action ? ' · read-only' : ''}</span>
        )}
        <Button size="sm" variant="ghost" icon={<Eye className="size-3.5" />} onClick={() => onView(kot)} title="View details" />
        <Dropdown width={180} trigger={<Button size="sm" variant="ghost" icon={<MoreVertical className="size-3.5" />} />}>
          <MenuItemBtn icon={<Eye />} onClick={() => onView(kot)}>View details</MenuItemBtn>
          <MenuItemBtn icon={<Printer />} onClick={() => onPrint(kot)}>Print KOT</MenuItemBtn>
          {editable && kot.status !== 'Served' && kot.status !== 'Cancelled' && <MenuItemBtn icon={<XCircle />} danger onClick={() => onCancelKot(kot)}>Cancel KOT</MenuItemBtn>}
        </Dropdown>
      </div>
    </div>
  )
}

export const KotCard = memo(KotCardImpl)
