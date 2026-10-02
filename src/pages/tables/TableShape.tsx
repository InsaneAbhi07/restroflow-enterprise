import { Clock, CalendarClock, Sparkles } from 'lucide-react'
import type { Table } from '@/types'
import { cn, inrShort, initials } from '@/lib/format'
import { TS_STYLE } from './tableUtils'

const PAD = 14

function bodySize(t: Table) {
  if (t.shape === 'round') { const d = 72 + Math.max(0, t.capacity - 2) * 8; return { w: d, h: d } }
  if (t.shape === 'rect') return { w: 128 + Math.max(0, t.capacity - 6) * 22, h: 82 }
  const s = 84 + Math.max(0, t.capacity - 4) * 6
  return { w: s, h: s }
}

function chairs(t: Table, w: number, h: number): { x: number; y: number }[] {
  const n = t.capacity
  const cx = PAD + w / 2, cy = PAD + h / 2
  if (t.shape === 'round') {
    const r = w / 2 + 7
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
    })
  }
  const pts: { x: number; y: number }[] = []
  const row = (count: number, y: number) => {
    for (let i = 0; i < count; i++) pts.push({ x: PAD + (w * (i + 1)) / (count + 1), y })
  }
  const col = (count: number, x: number) => {
    for (let i = 0; i < count; i++) pts.push({ x, y: PAD + (h * (i + 1)) / (count + 1) })
  }
  if (t.shape === 'rect') {
    const ends = n >= 6 ? 2 : 0
    const top = Math.ceil((n - ends) / 2)
    row(top, PAD - 7); row(n - ends - top, PAD + h + 7)
    if (ends) { col(1, PAD - 7); col(1, PAD + w + 7) }
    return pts
  }
  // square: distribute round-robin to top, bottom, left, right
  const sides = [0, 0, 0, 0]
  for (let i = 0; i < n; i++) sides[n === 2 ? (i === 0 ? 2 : 3) : i % 4]++
  row(sides[0], PAD - 7); row(sides[1], PAD + h + 7); col(sides[2], PAD - 7); col(sides[3], PAD + w + 7)
  return pts
}

export function TableShape({ table, amount, waiter, minutes, selected, onClick }: {
  table: Table; amount?: number; waiter?: string; minutes?: number; selected?: boolean; onClick?: () => void
}) {
  const { w, h } = bodySize(table)
  const st = TS_STYLE[table.status]
  const busy = table.status === 'Occupied' || table.status === 'Billing'
  return (
    <button onClick={onClick} className="group relative shrink-0 transition hover:-translate-y-0.5" style={{ width: w + PAD * 2, height: h + PAD * 2 }} title={`${table.label} · ${table.status}`}>
      {chairs(table, w, h).map((p, i) => (
        <span key={i} className={cn('absolute size-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow-sm', st.chair)} style={{ left: p.x, top: p.y }} />
      ))}
      <div
        className={cn('absolute flex flex-col items-center justify-center border-2 shadow-sm transition group-hover:shadow-md', st.fill, st.border, st.text,
          table.shape === 'round' ? 'rounded-full' : 'rounded-xl', selected && 'ring-4 ring-brand-300')}
        style={{ left: PAD, top: PAD, width: w, height: h }}
      >
        <span className="text-[15px] font-bold leading-none">{table.label}</span>
        {busy && amount !== undefined && <span className="mt-1 text-[11.5px] font-semibold tabular">{inrShort(amount)}</span>}
        {busy && minutes !== undefined && (
          <span className={cn('mt-0.5 flex items-center gap-0.5 text-[10px] font-medium', minutes > 75 ? 'text-rose-600' : 'opacity-70')}><Clock className="size-2.5" />{minutes}m</span>
        )}
        {table.status === 'Reserved' && <span className="mt-1 flex items-center gap-0.5 text-[10px] font-medium"><CalendarClock className="size-2.5" />{table.reservedAt ?? 'Later'}</span>}
        {table.status === 'Cleaning' && <span className="mt-1 flex items-center gap-0.5 text-[10px]"><Sparkles className="size-2.5" />Cleaning</span>}
        {table.status === 'Available' && <span className="mt-1 text-[10px] opacity-70">{table.capacity} seats</span>}
      </div>
      {waiter && busy && (
        <span className="absolute right-0 top-0 flex size-5 items-center justify-center rounded-full bg-navy-900 text-[8.5px] font-bold text-white ring-2 ring-white" title={waiter}>{initials(waiter)}</span>
      )}
    </button>
  )
}
