import { useEffect, useMemo, useRef, useState } from 'react'
import { ChefHat, ChevronLeft, ChevronRight, Maximize2, Minimize2, Timer, Volume2, VolumeX } from 'lucide-react'
import type { Kot, KotStatus, OrderSource } from '@/types'
import { useStore } from '@/store/useStore'
import { usePermission, useScope, useWorkingOutlet } from '@/store/hooks'
import { toast } from '@/store/toast'
import { Badge, Button, ConfirmDialog, EmptyState, Segmented, Select } from '@/components/ui'
import { PrintPreviewModal } from '@/components/print/Print'
import { KotTicket } from '@/components/print/Receipts'
import { cn } from '@/lib/format'
import { KotCard } from './KotCard'
import { KotDetailsModal } from './KotDetailsModal'
import { KOT_STATUSES, STATIONS, STATUS_STYLE, kotStations, useNow, type StationFilter } from './kotUtils'

const SOURCES: ('All' | OrderSource)[] = ['All', 'POS', 'Waiter App', 'QR Order', 'Swiggy', 'Zomato']
const NEXT: Partial<Record<KotStatus, KotStatus>> = { New: 'Preparing', Preparing: 'Ready', Ready: 'Served' }
const RECENT_LIMIT = 10

export default function Kitchen() {
  const kots = useStore((s) => s.kots)
  const menu = useStore((s) => s.menu)
  const outlets = useStore((s) => s.outlets)
  const updateKotStatus = useStore((s) => s.updateKotStatus)
  const cancelKotItem = useStore((s) => s.cancelKotItem)
  const log = useStore((s) => s.log)
  const { can } = usePermission()
  const editable = can('kot', 'edit')
  const { isAll, canSwitch, allowed } = useScope()
  const working = useWorkingOutlet()
  const [outletId, setOutletId] = useState(working)
  useEffect(() => setOutletId(working), [working])

  const [station, setStation] = useState<StationFilter>('All')
  const [source, setSource] = useState<'All' | OrderSource>('All')
  const [sound, setSound] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ Served: false, Cancelled: true })
  const [view, setView] = useState<Kot | null>(null)
  const [print, setPrint] = useState<Kot | null>(null)
  const [cancelItem, setCancelItem] = useState<{ kot: Kot; index: number } | null>(null)
  const [cancelKot, setCancelKot] = useState<Kot | null>(null)
  const [fs, setFs] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const now = useNow(1000)

  const outletKots = useMemo(() => kots.filter((k) => k.outletId === outletId), [kots, outletId])
  const filtered = useMemo(
    () => outletKots.filter((k) => (source === 'All' || k.source === source) && (station === 'All' || kotStations(k, menu).includes(station))),
    [outletKots, source, station, menu],
  )
  const byStatus = useMemo(() => {
    const m: Record<KotStatus, Kot[]> = { New: [], Preparing: [], Ready: [], Served: [], Cancelled: [] }
    filtered.forEach((k) => m[k.status].push(k))
    m.New.sort((a, b) => Number(!!b.priority) - Number(!!a.priority) || a.createdAt - b.createdAt)
    m.Preparing.sort((a, b) => Number(!!b.priority) - Number(!!a.priority) || a.createdAt - b.createdAt)
    m.Ready.sort((a, b) => a.updatedAt - b.updatedAt)
    m.Served = m.Served.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, RECENT_LIMIT)
    m.Cancelled = m.Cancelled.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, RECENT_LIMIT)
    return m
  }, [filtered])
  const counts = useMemo(() => {
    const c: Record<KotStatus, number> = { New: 0, Preparing: 0, Ready: 0, Served: 0, Cancelled: 0 }
    filtered.forEach((k) => c[k.status]++)
    return c
  }, [filtered])

  const avgPrep = useMemo(() => {
    const done = outletKots.filter((k) => k.status === 'Ready' || k.status === 'Served')
    if (!done.length) return 0
    return Math.round(done.reduce((s, k) => s + Math.max(0, k.updatedAt - k.createdAt), 0) / done.length / 60000)
  }, [outletKots])
  const delayed = filtered.filter((k) => (k.status === 'New' || k.status === 'Preparing') && now - k.createdAt > 20 * 60000).length

  // new KOT arrival detection (store-driven: POS / waiter app / QR)
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!seen.current) { seen.current = new Set(outletKots.map((k) => k.id)); return }
    const fresh = outletKots.filter((k) => !seen.current!.has(k.id))
    fresh.forEach((k) => {
      seen.current!.add(k.id)
      if (sound) toast.info(`🔔 New KOT ${k.no}`, `${k.type === 'Dine-in' ? 'Table ' + k.tableLabel : k.type} · ${k.source} · ${k.items.length} items`)
    })
  }, [outletKots, sound])

  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])
  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else rootRef.current?.requestFullscreen?.().catch(() => toast.warning('Full screen not available'))
  }

  const advance = (k: Kot) => {
    const next = NEXT[k.status]
    if (!next) return
    updateKotStatus(k.id, next)
    log(`KOT ${k.no} marked ${next}`, 'kot', next === 'Ready' ? 'success' : 'info', k.outletId)
    if (next === 'Ready') toast.success(`KOT ${k.no} is ready`, `Table ${k.tableLabel} · waiter notified`)
    else if (next === 'Preparing') toast.info(`KOT ${k.no} accepted`, 'Cooking started')
    else toast.success(`KOT ${k.no} served`)
  }

  const outletName = outlets.find((o) => o.id === outletId)?.short ?? ''
  const clock = new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })

  return (
    <div ref={rootRef} className="flex h-full flex-col gap-3 bg-slate-100 p-4">
      <style>{`@keyframes kds-pulse{0%,100%{box-shadow:0 0 0 0 rgba(225,29,72,.0)}50%{box-shadow:0 0 0 4px rgba(225,29,72,.28)}}`}</style>

      {/* top bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-card">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-navy-900 text-white"><ChefHat className="size-4" /></span>
          <div>
            <h1 className="text-[15px] font-semibold leading-tight text-slate-900">Kitchen Display</h1>
            <p className="text-[11.5px] text-slate-500">{outletName} · live KOT board</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {KOT_STATUSES.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-[11.5px] ring-1 ring-slate-200">
              <span className={cn('size-2 rounded-full', STATUS_STYLE[s].dot)} />
              <span className="text-slate-500">{s}</span>
              <span className="font-semibold text-slate-900 tabular">{counts[s]}</span>
            </span>
          ))}
          {delayed > 0 && <Badge tone="red" dot>{delayed} delayed</Badge>}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-[11.5px] ring-1 ring-slate-200" title="Average prep time (Ready / Served KOTs)">
            <Timer className="size-3.5 text-brand-600" /><span className="text-slate-500">Avg prep</span><span className="font-semibold text-slate-900">{avgPrep}m</span>
          </div>
          <span className="rounded-lg bg-navy-900 px-2.5 py-1 font-mono text-[13px] font-semibold text-white tabular">{clock}</span>
          <Button size="sm" variant="ghost" icon={sound ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
            onClick={() => { setSound(!sound); toast.info(sound ? 'Sound alerts muted' : 'Sound alerts on') }}>{sound ? 'Sound on' : 'Muted'}</Button>
          <Button size="sm" icon={fs ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />} onClick={toggleFs}>{fs ? 'Exit' : 'Full screen'}</Button>
        </div>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        {canSwitch && isAll && (
          <Select className="w-48" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
            {allowed.map((id) => <option key={id} value={id}>{outlets.find((o) => o.id === id)?.short}</option>)}
          </Select>
        )}
        <Segmented size="sm" value={station} onChange={setStation} items={STATIONS.map((s) => ({ value: s, label: s }))} />
        <Select className="w-40" value={source} onChange={(e) => setSource(e.target.value as 'All' | OrderSource)}>
          {SOURCES.map((s) => <option key={s} value={s}>{s === 'All' ? 'All sources' : s}</option>)}
        </Select>
        {!editable && <Badge tone="amber">Read-only — no KOT edit permission</Badge>}
        <span className="ml-auto text-[11px] text-slate-400">Timer: <span className="text-emerald-600">●</span> &lt;10m <span className="text-amber-600">●</span> 10–20m <span className="text-rose-600">●</span> &gt;20m</span>
      </div>

      {/* board */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-1">
        {KOT_STATUSES.map((s) => {
          const list = byStatus[s]
          const isHistory = s === 'Served' || s === 'Cancelled'
          const isCollapsed = isHistory && collapsed[s]
          if (isCollapsed) {
            return (
              <button key={s} onClick={() => setCollapsed({ ...collapsed, [s]: false })}
                className="flex w-11 shrink-0 flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-slate-500 hover:bg-slate-50">
                <ChevronLeft className="size-4" />
                <span className={cn('size-2 rounded-full', STATUS_STYLE[s].dot)} />
                <span className="text-[12px] font-semibold [writing-mode:vertical-rl]">{s} · {counts[s]}</span>
              </button>
            )
          }
          return (
            <div key={s} className={cn('flex min-h-0 shrink-0 flex-col rounded-xl border border-slate-200/80 bg-slate-50/80', isHistory ? 'w-56' : 'min-w-[290px] flex-1')}>
              <div className="flex items-center justify-between border-b border-slate-200/80 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={cn('size-2.5 rounded-full', STATUS_STYLE[s].dot)} />
                  <span className={cn('text-[13px] font-semibold', STATUS_STYLE[s].head)}>{s}</span>
                  <span className="rounded-full bg-white px-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">{counts[s]}</span>
                </div>
                {isHistory && (
                  <button onClick={() => setCollapsed({ ...collapsed, [s]: true })} className="rounded p-0.5 text-slate-400 hover:bg-slate-200" title="Collapse">
                    <ChevronRight className="size-4" />
                  </button>
                )}
              </div>
              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5">
                {list.length === 0 ? (
                  <EmptyState className="py-8" icon={<ChefHat />} title={`No ${s.toLowerCase()} KOTs`} body={s === 'New' ? 'New tickets from POS, waiter app and QR appear here automatically.' : undefined} />
                ) : (
                  list.map((k) => (
                    <KotCard key={k.id} kot={k} now={now} menu={menu} station={station} editable={editable} compact={isHistory}
                      fresh={k.status === 'New' && now - k.createdAt < 45000}
                      onAdvance={advance} onCancelItem={(kot, index) => setCancelItem({ kot, index })} onCancelKot={setCancelKot}
                      onView={setView} onPrint={setPrint} />
                  ))
                )}
                {isHistory && counts[s] >= RECENT_LIMIT && <p className="text-center text-[10.5px] text-slate-400">Showing last {RECENT_LIMIT}</p>}
              </div>
            </div>
          )
        })}
      </div>

      <KotDetailsModal kotId={view?.id ?? null} onClose={() => setView(null)} editable={editable} onAdvance={advance}
        onPrint={(k) => { setView(null); setPrint(k) }} onCancelKot={(k) => setCancelKot(k)} />

      <PrintPreviewModal open={!!print} onClose={() => setPrint(null)} title={`Print KOT ${print?.no ?? ''}`} subtitle={print ? `${print.station} · ${print.tableLabel}` : undefined}>
        {(w) => (print ? <KotTicket kot={print} width={w} /> : null)}
      </PrintPreviewModal>

      <ConfirmDialog open={!!cancelItem} onClose={() => setCancelItem(null)} tone="danger" confirmLabel="Cancel item"
        title="Cancel this item?"
        body={cancelItem ? <>Remove <b>{cancelItem.kot.items[cancelItem.index]?.qty}× {cancelItem.kot.items[cancelItem.index]?.name}</b> from {cancelItem.kot.no}. The waiter will be notified.</> : null}
        onConfirm={() => {
          if (!cancelItem) return
          const it = cancelItem.kot.items[cancelItem.index]
          cancelKotItem(cancelItem.kot.id, cancelItem.index)
          log(`Cancelled ${it.qty}× ${it.name} on KOT ${cancelItem.kot.no}`, 'kot', 'warning', cancelItem.kot.outletId)
          toast.warning('Item cancelled', `${it.name} · ${cancelItem.kot.no}`)
        }} />

      <ConfirmDialog open={!!cancelKot} onClose={() => setCancelKot(null)} tone="danger" confirmLabel="Cancel KOT"
        title={`Cancel KOT ${cancelKot?.no ?? ''}?`} body="All items on this ticket will stop being prepared. This is recorded in the audit log."
        onConfirm={() => {
          if (!cancelKot) return
          updateKotStatus(cancelKot.id, 'Cancelled')
          log(`KOT ${cancelKot.no} cancelled from kitchen display`, 'kot', 'danger', cancelKot.outletId)
          toast.error(`KOT ${cancelKot.no} cancelled`)
          setView(null)
        }} />
    </div>
  )
}
