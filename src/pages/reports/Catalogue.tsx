import { NavLink } from 'react-router-dom'
import { ChevronDown, Home, Star } from 'lucide-react'
import { DynIcon, SearchInput } from '@/components/ui'
import { cn } from '@/lib/format'
import { GROUPS, REPORTS } from './registry'
import { useReportUI } from './reportStore'
import type { ReportDef } from './types'

function Item({ r }: { r: ReportDef }) {
  const fav = useReportUI((s) => s.favourites.includes(r.id))
  const toggleFav = useReportUI((s) => s.toggleFav)
  return (
    <NavLink to={`/reports/${r.id}`}
      className={({ isActive }) => cn('group flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] transition',
        isActive ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
      {({ isActive }) => (
        <>
          <DynIcon name={r.icon} className={cn('size-3.5 shrink-0', isActive ? 'text-brand-300' : 'text-slate-400')} />
          <span className="min-w-0 flex-1 truncate">{r.title}</span>
          <button type="button" title={fav ? 'Remove from favourites' : 'Add to favourites'}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFav(r.id) }}
            className={cn('shrink-0 rounded p-0.5 transition', fav ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
            <Star className={cn('size-3', fav ? 'fill-amber-400 text-amber-400' : isActive ? 'text-white/60' : 'text-slate-300')} />
          </button>
        </>
      )}
    </NavLink>
  )
}

export function Catalogue() {
  const q = useReportUI((s) => s.catalogueSearch)
  const setQ = useReportUI((s) => s.setSearch)
  const collapsed = useReportUI((s) => s.collapsed)
  const toggleGroup = useReportUI((s) => s.toggleGroup)
  const favs = useReportUI((s) => s.favourites)
  const needle = q.trim().toLowerCase()
  const match = (r: ReportDef) => !needle || r.title.toLowerCase().includes(needle) || r.description.toLowerCase().includes(needle) || r.group.toLowerCase().includes(needle)
  const favReports = REPORTS.filter((r) => favs.includes(r.id) && match(r))
  const total = REPORTS.filter(match).length

  return (
    <aside className="flex max-h-[340px] flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-card lg:sticky lg:top-0 lg:max-h-[calc(100vh-7.5rem)]">
      <div className="border-b border-slate-100 p-2.5">
        <SearchInput placeholder={`Search ${REPORTS.length} reports…`} value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        <NavLink end to="/reports" className={({ isActive }) => cn('flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] font-medium transition', isActive ? 'bg-navy-900 text-white' : 'text-slate-700 hover:bg-slate-100')}>
          <Home className="size-3.5" /> Reports Home
        </NavLink>

        {favReports.length > 0 && (
          <div className="pt-1">
            <p className="flex items-center gap-1.5 px-2 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400"><Star className="size-3 fill-amber-400 text-amber-400" />Favourites</p>
            {favReports.map((r) => <Item key={'f' + r.id} r={r} />)}
          </div>
        )}

        {GROUPS.map((g) => {
          const list = REPORTS.filter((r) => r.group === g.key && match(r))
          if (!list.length) return null
          const isCollapsed = !needle && collapsed[g.key]
          return (
            <div key={g.key} className="pt-1">
              <button onClick={() => toggleGroup(g.key)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50">
                <span className={cn('flex size-5 items-center justify-center rounded-md', g.tone)}><DynIcon name={g.icon} className="size-3" /></span>
                <span className="flex-1 text-[11.5px] font-semibold uppercase tracking-wide text-slate-600">{g.label}</span>
                <span className="rounded-full bg-slate-100 px-1.5 text-[10.5px] font-medium text-slate-500">{list.length}</span>
                <ChevronDown className={cn('size-3.5 text-slate-400 transition', isCollapsed && '-rotate-90')} />
              </button>
              {!isCollapsed && <div className="ml-2 border-l border-slate-100 pl-1.5">{list.map((r) => <Item key={r.id} r={r} />)}</div>}
            </div>
          )
        })}
        {total === 0 && <p className="px-2 py-6 text-center text-[12px] text-slate-400">No reports match “{q}”.</p>}
      </nav>
    </aside>
  )
}
