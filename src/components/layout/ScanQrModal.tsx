import { useEffect, useState } from 'react'
import { Camera, ExternalLink, QrCode, RotateCcw, ScanLine, Zap } from 'lucide-react'
import { Badge, Button, Modal, Select } from '@/components/ui'
import { MiniQR } from '@/components/print/Print'
import { useStore } from '@/store/useStore'
import { useScope, useWorkingOutlet } from '@/store/hooks'
import { toast } from '@/store/toast'
import { cn } from '@/lib/format'
import QrCustomerApp from '@/pages/qr/QrCustomerApp'
import { PhoneFrame } from './Overlays'
import { useUI } from './uiStore'

type Phase = 'camera' | 'scanning' | 'menu'

/** Guest-side demo: point the phone camera at a table QR, scan it and the digital menu opens. */
export function ScanQrModal() {
  const open = useUI((s) => s.qrScan)
  const setOpen = useUI((s) => s.setQrScan)
  const working = useWorkingOutlet()
  const { allowed } = useScope()
  const outlets = useStore((s) => s.outlets)
  const tables = useStore((s) => s.tables)
  const qrOn = useStore((s) => s.settings.qr.enabled)
  const [outletId, setOutletId] = useState(working)
  const [tableId, setTableId] = useState('')
  const [phase, setPhase] = useState<Phase>('camera')

  const list = tables.filter((t) => t.outletId === outletId && t.qrEnabled)
  const table = list.find((t) => t.id === tableId)
  const outlet = outlets.find((o) => o.id === outletId)

  useEffect(() => { if (open) { setOutletId(working); setPhase('camera') } }, [open, working])
  useEffect(() => { if (!list.some((t) => t.id === tableId)) setTableId(list[0]?.id ?? '') }, [outletId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'scanning') return
    const id = setTimeout(() => setPhase('menu'), 1400)
    return () => clearTimeout(id)
  }, [phase])

  if (!open) return null
  const aim = (id: string) => { setTableId(id); setPhase('camera') }
  const scan = () => {
    if (!table) return toast.error('No QR in view', 'Pick a table QR to point the camera at')
    if (!qrOn) return toast.error('QR ordering is switched off', 'Enable it in Settings → QR Ordering')
    setPhase('scanning')
  }
  const url = table ? `${import.meta.env.BASE_URL}qr-order/${outletId}/${table.id}` : ''

  return (
    <Modal open onClose={() => setOpen(false)} size="xl" icon={<ScanLine />} title="Scan QR Menu — guest view"
      subtitle="Simulates a guest scanning the table QR with their phone camera. Orders placed here reach POS & KOT instantly."
      bodyClassName="bg-slate-100/70"
      footer={<>
        {table && <Button icon={<ExternalLink className="size-3.5" />} onClick={() => window.open(url, '_blank')}>Open menu in new tab</Button>}
        <Button variant="primary" onClick={() => setOpen(false)}>Done</Button>
      </>}>
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        <PhoneFrame scale={0.92}>
          {phase === 'menu' && table ? (
            <QrCustomerApp key={table.id} outletId={outletId} tableId={table.id} embedded />
          ) : (
            <div className="relative flex h-full flex-col bg-black text-white">
              <div className="flex items-center justify-between px-6 pb-3 pt-14 text-[13px]">
                <span className="flex items-center gap-1.5 font-semibold"><Camera className="size-4" />Camera</span>
                <Zap className="size-4 text-white/60" />
              </div>
              {/* viewfinder showing the table tent the guest is pointing at */}
              <div className="relative mx-auto mt-10 flex size-[270px] items-center justify-center rounded-3xl bg-gradient-to-b from-[#3b3a36] to-[#24231f]">
                {table ? (
                  <div className={cn('flex flex-col items-center rounded-xl bg-white p-3 text-center shadow-2xl transition', phase === 'scanning' ? 'scale-105' : 'rotate-[-4deg] scale-95')}>
                    <MiniQR seed={`${table.outletId}/${table.id}`} size={120} />
                    <div className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-[#14a891]">Scan to order</div>
                    <div className="text-[15px] font-extrabold text-[#0f2a4a]">Table {table.label}</div>
                  </div>
                ) : <QrCode className="size-16 text-white/20" />}
                {/* corner brackets */}
                {['left-3 top-3 border-l-4 border-t-4 rounded-tl-xl', 'right-3 top-3 border-r-4 border-t-4 rounded-tr-xl', 'bottom-3 left-3 border-b-4 border-l-4 rounded-bl-xl', 'bottom-3 right-3 border-b-4 border-r-4 rounded-br-xl'].map((c) => (
                  <span key={c} className={cn('absolute size-10', phase === 'scanning' ? 'border-emerald-400' : 'border-white/90', c)} />
                ))}
                <span className="absolute inset-x-6 h-0.5 rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,.8)]" style={{ animation: `qr-scan ${phase === 'scanning' ? 0.7 : 2.2}s ease-in-out infinite` }} />
              </div>
              <p className="mt-6 px-8 text-center text-[13px] text-white/80">
                {phase === 'scanning' ? <span className="font-semibold text-emerald-400">QR detected · opening {outlet?.short} menu…</span> : table ? 'Hold steady over the table QR code' : 'Point your camera at a table QR'}
              </p>
              <div className="mt-auto flex justify-center pb-14">
                <button onClick={scan} disabled={phase === 'scanning'} aria-label="Scan"
                  className="flex size-[70px] items-center justify-center rounded-full border-4 border-white/80 transition active:scale-95 disabled:opacity-60">
                  <span className="size-[54px] rounded-full bg-white" />
                </button>
              </div>
            </div>
          )}
        </PhoneFrame>

        <div className="w-full max-w-sm space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="text-[13px] font-semibold text-slate-900">Try it</h4>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[12.5px] text-slate-600">
              <li>Pick the table QR the guest is sitting at</li>
              <li>Tap the <b>shutter</b> button to scan</li>
              <li>Browse the menu, add items and <b>place the order</b></li>
              <li>See it arrive in <b>POS</b>, <b>Kitchen Display</b> and <b>Tables</b></li>
            </ol>
            {!qrOn && <Badge tone="red" className="mt-2">QR ordering is disabled in Settings</Badge>}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
              <h4 className="text-[13px] font-semibold text-slate-900">Table QR codes</h4>
              {allowed.length > 1 && (
                <Select className="w-36" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
                  {allowed.map((id) => <option key={id} value={id}>{outlets.find((o) => o.id === id)?.short}</option>)}
                </Select>
              )}
            </div>
            <div className="grid max-h-[340px] grid-cols-4 gap-2 overflow-y-auto p-3">
              {list.map((t) => (
                <button key={t.id} onClick={() => aim(t.id)}
                  className={cn('flex flex-col items-center rounded-lg border p-1.5 transition', t.id === tableId ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300')}>
                  <MiniQR seed={`${t.outletId}/${t.id}`} size={44} />
                  <span className="mt-1 text-[11px] font-semibold text-slate-700">{t.label}</span>
                  {t.status !== 'Available' && <span className="text-[9.5px] text-slate-400">{t.status}</span>}
                </button>
              ))}
              {list.length === 0 && <p className="col-span-4 py-6 text-center text-[12px] text-slate-400">No QR-enabled tables in this outlet.</p>}
            </div>
          </div>
          {phase === 'menu' && <Button block icon={<RotateCcw className="size-3.5" />} onClick={() => setPhase('camera')}>Scan another QR</Button>}
        </div>
      </div>
    </Modal>
  )
}
