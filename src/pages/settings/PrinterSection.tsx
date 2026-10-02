import { useState } from 'react'
import { Printer, RefreshCw, Wifi, Usb } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Select, Toggle } from '@/components/ui'
import { PrintPreviewModal, TCenter, TDash, TRow, ThermalPaper, MiniQR } from '@/components/print/Print'
import { toast } from '@/store/toast'
import { useStore } from '@/store/useStore'
import { ORG } from '@/data/outlets'
import { fmtDateTime } from '@/lib/format'
import { Row, SettingsCard, useSettingsGroup, type SectionProps } from './kit'

interface Device { id: string; name: string; model: string; role: string; conn: 'USB' | 'LAN'; ip?: string; paper: '80mm' | '58mm'; copies: number; auto: boolean; status: 'Online' | 'Offline' | 'Paper low' }
const INITIAL: Device[] = [
  { id: 'p1', name: 'Billing printer', model: 'EPSON TM-T82', role: 'Customer bills & receipts', conn: 'USB', paper: '80mm', copies: 1, auto: false, status: 'Online' },
  { id: 'p2', name: 'Kitchen printer', model: 'TVS RP3160 Gold', role: 'KOT – Main kitchen & tandoor', conn: 'LAN', ip: '192.168.1.41', paper: '80mm', copies: 1, auto: true, status: 'Online' },
  { id: 'p3', name: 'Bar printer', model: 'Rugtek RP58', role: 'BOT – Bar orders', conn: 'LAN', ip: '192.168.1.44', paper: '58mm', copies: 1, auto: true, status: 'Paper low' },
]

export function PrinterSection({ ro }: SectionProps) {
  const [p, setP] = useSettingsGroup('printer')
  const [devices, setDevices] = useState(INITIAL)
  const [test, setTest] = useState<Device | null>(null)
  const outlet = useStore((s) => s.outlets[0])
  const upd = (id: string, patch: Partial<Device>) => setDevices((d) => d.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Printers" subtitle="Simulated devices — test prints open a real print preview" icon={<Printer className="size-3.5" />}
          actions={<Button size="sm" icon={<RefreshCw className="size-3" />} onClick={() => { setDevices((d) => d.map((x) => ({ ...x, status: x.status === 'Offline' ? 'Online' : x.status }))); toast.info('Scan complete', '3 printers found on USB / LAN') }}>Scan</Button>} />
        <div className="divide-y divide-slate-100">
          {devices.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-navy-50 text-navy-700"><Printer className="size-4" /></span>
              <div className="min-w-[180px] flex-1">
                <p className="flex items-center gap-2 text-[13px] font-medium text-slate-800">{d.name}<Badge tone={d.status === 'Online' ? 'green' : d.status === 'Paper low' ? 'amber' : 'red'} dot>{d.status}</Badge></p>
                <p className="flex items-center gap-1 text-[11.5px] text-slate-500">{d.conn === 'USB' ? <Usb className="size-3" /> : <Wifi className="size-3" />}{d.model} · {d.conn}{d.ip ? ' ' + d.ip : ''} · {d.role}</p>
              </div>
              <Select className="w-24" disabled={ro} value={d.paper} onChange={(e) => upd(d.id, { paper: e.target.value as Device['paper'] })}><option value="80mm">80 mm</option><option value="58mm">58 mm</option></Select>
              <Select className="w-24" disabled={ro} value={d.copies} onChange={(e) => upd(d.id, { copies: Number(e.target.value) })}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n} {n > 1 ? 'copies' : 'copy'}</option>)}</Select>
              <label className="flex items-center gap-1.5 text-[12px] text-slate-600"><Toggle size="sm" disabled={ro} checked={d.auto} onChange={(v) => upd(d.id, { auto: v })} />Auto-print</label>
              <Button size="sm" icon={<Printer className="size-3" />} onClick={() => setTest(d)}>Print test page</Button>
            </div>
          ))}
        </div>
      </Card>

      <SettingsCard title="Print behaviour" subtitle="Applies to POS bills and KOTs" ro={ro}>
        <Row label="Default bill printer"><Select className="w-56" disabled={ro} value={p.printerName} onChange={(e) => setP({ printerName: e.target.value })}>
          {['EPSON TM-T82 (USB)', 'TVS RP3160 Gold (LAN)', 'Rugtek RP58 (LAN)'].map((n) => <option key={n}>{n}</option>)}</Select></Row>
        <Row label="Paper width" desc="Receipt roll width used for bills"><Select className="w-28" disabled={ro} value={p.paper} onChange={(e) => setP({ paper: e.target.value as '80mm' | '58mm' })}><option value="80mm">80 mm</option><option value="58mm">58 mm</option></Select></Row>
        <Row label="Auto-print KOT" desc="Print KOT as soon as it is generated"><Toggle disabled={ro} checked={p.autoPrintKot} onChange={(v) => setP({ autoPrintKot: v })} /></Row>
        <Row label="Auto-print bill on settle"><Toggle disabled={ro} checked={p.autoPrintBill} onChange={(v) => setP({ autoPrintBill: v })} /></Row>
        <Row label="Bill copies"><Select className="w-24" disabled={ro} value={p.billCopies} onChange={(e) => setP({ billCopies: Number(e.target.value) })}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Row>
        <Row label="KOT copies"><Select className="w-24" disabled={ro} value={p.kotCopies} onChange={(e) => setP({ kotCopies: Number(e.target.value) })}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Row>
        <Row label="Print logo on bill"><Toggle disabled={ro} checked={p.showLogo} onChange={(v) => setP({ showLogo: v })} /></Row>
      </SettingsCard>

      <PrintPreviewModal open={!!test} onClose={() => setTest(null)} title="Printer test page" subtitle={test ? `${test.name} · ${test.model}` : ''}>
        {(w) => test && (
          <ThermalPaper width={w}>
            <TCenter className="text-[14px] font-bold">*** TEST PAGE ***</TCenter>
            <TCenter>{ORG.name}</TCenter>
            <TCenter className="text-[10px]">{outlet?.short}</TCenter>
            <TDash />
            <TRow l="Printer" r={test.name} />
            <TRow l="Model" r={test.model} />
            <TRow l="Connection" r={test.conn + (test.ip ? ' ' + test.ip : '')} />
            <TRow l="Paper" r={w} />
            <TRow l="Copies" r={String(test.copies)} />
            <TRow l="Date" r={fmtDateTime(Date.now())} />
            <TDash />
            <div>ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
            <div>abcdefghijklmnopqrstuvwxyz</div>
            <div>0123456789 ₹ @ # % & * ( ) - +</div>
            <div className="font-bold">Bold text sample</div>
            <div className="text-[14px] font-bold">LARGE TEXT SAMPLE</div>
            <TDash />
            <TCenter><div className="flex justify-center"><MiniQR seed={test.id} size={60} /></div></TCenter>
            <TCenter className="mt-1 text-[10px]">Printer is configured correctly ✓</TCenter>
          </ThermalPaper>
        )}
      </PrintPreviewModal>
    </div>
  )
}
