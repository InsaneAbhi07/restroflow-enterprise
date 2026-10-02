import React, { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/format'
import { EmptyState, type Tone } from './primitives'

/* ------------------------------------------------------------------ DataTable */
export interface Column<T> {
  key: string
  header: React.ReactNode
  render?: (row: T, index: number) => React.ReactNode
  /** value used for sorting (defaults to row[key]) */
  sortValue?: (row: T) => string | number
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  width?: number | string
  className?: string
}
export function DataTable<T extends { id?: string }>({
  columns, rows, onRowClick, pageSize = 12, empty, className, dense, footer, rowClassName, stickyHeader = true,
}: {
  columns: Column<T>[]; rows: T[]; onRowClick?: (r: T) => void; pageSize?: number; empty?: React.ReactNode; className?: string
  dense?: boolean; footer?: React.ReactNode; rowClassName?: (r: T) => string | undefined; stickyHeader?: boolean
}) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [page, setPage] = useState(0)
  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    const get = (r: T) => (col?.sortValue ? col.sortValue(r) : ((r as Record<string, unknown>)[sort.key] as string | number))
    return [...rows].sort((a, b) => {
      const x = get(a), y = get(b)
      return (x > y ? 1 : x < y ? -1 : 0) * sort.dir
    })
  }, [rows, sort, columns])
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const p = Math.min(page, pages - 1)
  const visible = pageSize ? sorted.slice(p * pageSize, p * pageSize + pageSize) : sorted

  return (
    <div className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12.5px]">
          <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {columns.map((c) => {
                const active = sort?.key === c.key
                return (
                  <th key={c.key} style={{ width: c.width }}
                    className={cn('whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.sortable !== false && 'cursor-pointer select-none hover:text-slate-800')}
                    onClick={() => c.sortable !== false && setSort(active ? (sort!.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 })}>
                    <span className={cn('inline-flex items-center gap-1', c.align === 'right' && 'flex-row-reverse')}>
                      {c.header}
                      {c.sortable !== false && c.header && (active ? (sort!.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-30" />)}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={r.id ?? i} onClick={() => onRowClick?.(r)}
                className={cn('border-b border-slate-100 transition last:border-0', onRowClick && 'cursor-pointer hover:bg-brand-50/40', rowClassName?.(r))}>
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-3 text-slate-700', dense ? 'py-1.5' : 'py-2.5', c.align === 'right' && 'text-right tabular', c.align === 'center' && 'text-center', c.className)}>
                    {c.render ? c.render(r, p * pageSize + i) : String((r as Record<string, unknown>)[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && <tfoot>{footer}</tfoot>}
        </table>
      </div>
      {rows.length === 0 && (empty ?? <EmptyState title="No records found" body="Try changing the filters or search query." />)}
      {pageSize > 0 && rows.length > pageSize && (
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[12px] text-slate-500">
          <span>Showing {p * pageSize + 1}–{Math.min(rows.length, (p + 1) * pageSize)} of {rows.length}</span>
          <div className="flex items-center gap-1">
            <button disabled={p === 0} onClick={() => setPage(p - 1)} className="rounded-md p-1 hover:bg-slate-100 disabled:opacity-30"><ChevronLeft className="size-4" /></button>
            <span className="px-1 font-medium text-slate-700">{p + 1} / {pages}</span>
            <button disabled={p >= pages - 1} onClick={() => setPage(p + 1)} className="rounded-md p-1 hover:bg-slate-100 disabled:opacity-30"><ChevronRight className="size-4" /></button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ StatCard */
const ICON_TONES: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-600', green: 'bg-emerald-50 text-emerald-600', red: 'bg-rose-50 text-rose-600', amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-sky-50 text-sky-600', navy: 'bg-navy-50 text-navy-700', teal: 'bg-brand-50 text-brand-600', violet: 'bg-violet-50 text-violet-600', orange: 'bg-orange-50 text-orange-600', pink: 'bg-pink-50 text-pink-600',
}
export function StatCard({ label, value, delta, icon, tone = 'navy', sub, onClick, className, invertDelta }: {
  label: string; value: React.ReactNode; delta?: number; icon?: React.ReactNode; tone?: Tone; sub?: React.ReactNode; onClick?: () => void; className?: string; invertDelta?: boolean
}) {
  const good = delta === undefined ? true : invertDelta ? delta <= 0 : delta >= 0
  return (
    <div onClick={onClick} className={cn('group rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-card transition', onClick && 'cursor-pointer hover:border-brand-200 hover:shadow-md', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11.5px] font-medium text-slate-500">{label}</p>
        {icon && <span className={cn('flex size-7 items-center justify-center rounded-lg [&>svg]:size-3.5', ICON_TONES[tone])}>{icon}</span>}
      </div>
      <p className="mt-1 text-[20px] font-semibold leading-tight tracking-tight text-slate-900 tabular">{value}</p>
      <div className="mt-1 flex items-center gap-1.5 text-[11px]">
        {delta !== undefined && (
          <span className={cn('inline-flex items-center gap-0.5 font-semibold', good ? 'text-emerald-600' : 'text-rose-600')}>
            {delta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}{Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {sub && <span className="truncate text-slate-400">{sub}</span>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ PageHeader */
export function PageHeader({ title, subtitle, actions, breadcrumbs, icon, className }: {
  title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; breadcrumbs?: { label: string; to?: string }[]; icon?: React.ReactNode; className?: string
}) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {breadcrumbs && (
          <nav className="mb-1 flex items-center gap-1 text-[11.5px] text-slate-400">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="size-3" />}
                {b.to ? <Link to={b.to} className="hover:text-slate-700">{b.label}</Link> : <span className="text-slate-500">{b.label}</span>}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-2.5">
          {icon && <span className="flex size-8 items-center justify-center rounded-lg bg-navy-900 text-white [&>svg]:size-4">{icon}</span>}
          <div>
            <h1 className="text-[18px] font-semibold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="text-[12.5px] text-slate-500">{subtitle}</p>}
          </div>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Filter bar container placed above tables */
export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5', className)}>{children}</div>
}

/* ------------------------------------------------------------------ Charts helpers */
export const CHART = {
  navy: '#1d3f70', teal: '#14a891', violet: '#7c3aed', orange: '#ea580c', pink: '#db2777', sky: '#0891b2', lime: '#65a30d', amber: '#d97706', red: '#dc2626', slate: '#94a3b8',
  series: ['#1d3f70', '#14a891', '#7c3aed', '#ea580c', '#db2777', '#0891b2', '#65a30d', '#d97706', '#dc2626', '#64748b'],
  grid: '#eef2f6',
  axis: { fontSize: 11, fill: '#94a3b8' },
}
export const tooltipStyle = {
  contentStyle: { borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px -8px rgba(15,42,74,.2)', fontSize: 12, padding: '8px 10px' },
  labelStyle: { color: '#0f172a', fontWeight: 600, marginBottom: 4 },
  itemStyle: { padding: 0 },
}

export function Legend({ items, className }: { items: { name: string; color: string; value?: React.ReactNode }[]; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {items.map((it) => (
        <div key={it.name} className="flex items-center gap-2 text-[12px]">
          <span className="size-2.5 shrink-0 rounded-sm" style={{ background: it.color }} />
          <span className="flex-1 truncate text-slate-600">{it.name}</span>
          {it.value !== undefined && <span className="font-medium text-slate-800 tabular">{it.value}</span>}
        </div>
      ))}
    </div>
  )
}
