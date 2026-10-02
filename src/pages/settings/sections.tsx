import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Building2, Send, Plus, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { Badge, Button, Card, Field, IconButton, Input, Select, Textarea, Toggle } from '@/components/ui'
import { TCenter, TDash, TRow } from '@/components/print/Print'
import { useStore } from '@/store/useStore'
import { toast } from '@/store/toast'
import { ORG } from '@/data/outlets'
import { MODULES } from '@/data/people'
import { cn, uid } from '@/lib/format'
import type { Outlet } from '@/types'
import { Row, SettingsCard, useSettingsGroup, type SectionProps } from './kit'

/* ---------------------------------------------------------------- Organization */
export function OrgSection({ ro }: SectionProps) {
  const [f, setF] = useState({ ...ORG, currency: 'INR (₹)', timezone: 'Asia/Kolkata (IST)', fy: 'April – March' })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
  return (
    <SettingsCard title="Organization profile" subtitle="Legal entity details used on invoices, slips and reports" icon={<Building2 className="size-3.5" />} ro={ro}>
      <div className="grid gap-3 py-2 sm:grid-cols-2">
        <Field label="Brand name"><Input disabled={ro} value={f.name} onChange={set('name')} /></Field>
        <Field label="Legal name"><Input disabled={ro} value={f.legal} onChange={set('legal')} /></Field>
        <Field label="GSTIN"><Input disabled={ro} value={f.gstin} onChange={set('gstin')} /></Field>
        <Field label="PAN"><Input disabled={ro} value={f.pan} onChange={set('pan')} /></Field>
        <Field label="CIN"><Input disabled={ro} value={f.cin} onChange={set('cin')} /></Field>
        <Field label="Website"><Input disabled={ro} value={f.website} onChange={set('website')} /></Field>
        <Field label="Email"><Input disabled={ro} value={f.email} onChange={set('email')} /></Field>
        <Field label="Phone"><Input disabled={ro} value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Registered office" className="sm:col-span-2"><Textarea disabled={ro} value={f.hq} onChange={set('hq')} /></Field>
        <Field label="Currency"><Select disabled value={f.currency}><option>INR (₹)</option></Select></Field>
        <Field label="Time zone"><Select disabled={ro} value={f.timezone} onChange={set('timezone')}><option>Asia/Kolkata (IST)</option></Select></Field>
        <Field label="Financial year"><Select disabled={ro} value={f.fy} onChange={set('fy')}><option>April – March</option><option>January – December</option></Select></Field>
      </div>
    </SettingsCard>
  )
}

/* ---------------------------------------------------------------- Outlets */
export function OutletSection({ ro }: SectionProps) {
  const outlets = useStore((s) => s.outlets)
  const upsert = useStore((s) => s.upsertOutlet)
  const nav = useNavigate()
  const upd = (o: Outlet, patch: Partial<Outlet>) => upsert({ ...o, ...patch })
  return (
    <SettingsCard title="Outlet configuration" subtitle="Operating hours, status and capacity per outlet" ro={ro}
      actions={<Button size="sm" iconRight={<ArrowRight className="size-3" />} onClick={() => nav('/outlets')}>Manage outlets</Button>}>
      <div className="overflow-x-auto py-2">
        <table className="w-full min-w-[620px] text-[12.5px]">
          <thead><tr className="text-left text-[10.5px] uppercase tracking-wide text-slate-400"><th className="py-1.5">Outlet</th><th>Code</th><th>Hours</th><th>Seats</th><th>Status</th></tr></thead>
          <tbody>
            {outlets.map((o) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="py-2"><span className="flex items-center gap-2 font-medium text-slate-800"><span className="size-2 rounded-full" style={{ background: o.color }} />{o.short}<span className="font-normal text-slate-400">{o.city}</span></span></td>
                <td className="text-slate-500">{o.code}</td>
                <td className="pr-2"><Input className="w-40" disabled={ro} value={o.hours} onChange={(e) => upd(o, { hours: e.target.value })} /></td>
                <td className="pr-2"><Input className="w-20" type="number" disabled={ro} value={o.seats} onChange={(e) => upd(o, { seats: Number(e.target.value) || 0 })} /></td>
                <td><Select className="w-36" disabled={ro} value={o.status} onChange={(e) => upd(o, { status: e.target.value as Outlet['status'] })}><option>Open</option><option>Closed</option><option>Maintenance</option></Select></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SettingsCard>
  )
}

/* ---------------------------------------------------------------- Branding */
const SWATCHES = ['#0f2a4a', '#14a891', '#7c3aed', '#b91c1c', '#ea580c', '#0891b2', '#15803d', '#1f2937']
export function BrandingSection({ ro }: SectionProps) {
  const settings = useStore((s) => s.settings)
  const update = useStore((s) => s.updateSettings)
  const [primary, setPrimary] = useState(SWATCHES[0])
  const [accent, setAccent] = useState(SWATCHES[1])
  const [tagline, setTagline] = useState(ORG.tagline)
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <SettingsCard title="Restaurant branding" subtitle="Logo, colours and receipt text" ro={ro}>
        <Row label="Logo" desc="PNG/SVG, square, at least 256×256">
          <div className="flex size-14 items-center justify-center rounded-xl text-[18px] font-bold text-white" style={{ background: primary }}>GK</div>
          <Button size="sm" disabled={ro} icon={<Upload className="size-3" />} onClick={() => toast.info('Logo upload simulated', 'Using the default GK monogram')}>Upload</Button>
        </Row>
        <Row label="Primary colour">
          <div className="flex gap-1.5">{SWATCHES.map((c) => <button key={c} disabled={ro} onClick={() => setPrimary(c)} className={cn('size-6 rounded-md transition', primary === c && 'ring-2 ring-slate-400 ring-offset-2')} style={{ background: c }} />)}</div>
        </Row>
        <Row label="Accent colour">
          <div className="flex gap-1.5">{SWATCHES.map((c) => <button key={c} disabled={ro} onClick={() => setAccent(c)} className={cn('size-6 rounded-md transition', accent === c && 'ring-2 ring-slate-400 ring-offset-2')} style={{ background: c }} />)}</div>
        </Row>
        <Row label="Tagline"><Input className="w-64" disabled={ro} value={tagline} onChange={(e) => setTagline(e.target.value)} /></Row>
        <Row label="Bill header"><Input className="w-64" disabled={ro} value={settings.billHeader} onChange={(e) => update({ billHeader: e.target.value })} /></Row>
        <Row label="Bill footer"><Input className="w-64" disabled={ro} value={settings.billFooter} onChange={(e) => update({ billFooter: e.target.value })} /></Row>
        <Row label="Show logo on receipts"><Toggle disabled={ro} checked={settings.printer.showLogo} onChange={(v) => update({ printer: { ...settings.printer, showLogo: v } })} /></Row>
      </SettingsCard>
      <Card className="h-fit p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Live receipt preview</p>
        <div className="flex justify-center rounded-xl bg-slate-100 py-4">
          <div className="thermal w-[230px] px-3 py-3 shadow">
            <TCenter>
              {settings.printer.showLogo && <div className="mx-auto mb-1 flex size-9 items-center justify-center rounded-md text-[14px] font-bold text-white" style={{ background: primary }}>GK</div>}
              <div className="text-[13px] font-bold uppercase" style={{ color: primary }}>{ORG.name}</div>
              <div className="text-[9.5px]" style={{ color: accent }}>{tagline}</div>
              <div className="mt-1 text-[10px]">{settings.billHeader}</div>
            </TCenter>
            <TDash />
            <TRow l="Paneer Tikka x1" r="320.00" />
            <TRow l="Butter Naan x2" r="120.00" />
            <TRow l="Dal Makhani x1" r="280.00" />
            <TDash />
            <TRow l="GST 5%" r="36.00" />
            <TRow l="TOTAL" r="₹ 756.00" bold />
            <TDash />
            <TCenter className="text-[9.5px]">{settings.billFooter}</TCenter>
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ---------------------------------------------------------------- GST & billing */
export function GstSection({ ro }: SectionProps) {
  const s = useStore((st) => st.settings)
  const update = useStore((st) => st.updateSettings)
  const [slabs, setSlabs] = useState([
    { id: 'g1', name: 'Restaurant service (non-AC / AC)', rate: 5, hsn: '996331' },
    { id: 'g2', name: 'Packaged beverages', rate: 18, hsn: '2202' },
    { id: 'g3', name: 'Outdoor catering', rate: 18, hsn: '996334' },
  ])
  return (
    <SettingsCard title="GST & billing" subtitle="Tax mode, service charge and rounding" ro={ro}>
      <Row label="GST calculation" desc="Exclusive adds tax on top of menu prices">
        <Select className="w-40" disabled={ro} value={s.gstMode} onChange={(e) => update({ gstMode: e.target.value as 'exclusive' | 'inclusive' })}><option value="exclusive">Exclusive</option><option value="inclusive">Inclusive</option></Select>
      </Row>
      <Row label="Service charge" desc="Applied to dine-in orders only"><Input className="w-24" type="number" disabled={ro} value={s.serviceCharge} suffix="%" onChange={(e) => update({ serviceCharge: Math.max(0, Number(e.target.value) || 0) })} /></Row>
      <Row label="Round off bill total" desc="Round to nearest rupee"><Toggle disabled={ro} checked={s.roundOff} onChange={(v) => update({ roundOff: v })} /></Row>
      <Row label="Bill header text"><Input className="w-72" disabled={ro} value={s.billHeader} onChange={(e) => update({ billHeader: e.target.value })} /></Row>
      <Row label="Bill footer text"><Input className="w-72" disabled={ro} value={s.billFooter} onChange={(e) => update({ billFooter: e.target.value })} /></Row>
      <div className="py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[13px] font-medium text-slate-800">Tax slabs</p>
          {!ro && <Button size="xs" icon={<Plus className="size-3" />} onClick={() => setSlabs([...slabs, { id: uid('g'), name: 'New slab', rate: 12, hsn: '' }])}>Add slab</Button>}
        </div>
        <div className="space-y-1.5">
          {slabs.map((g) => (
            <div key={g.id} className="flex items-center gap-2">
              <Input className="flex-1" disabled={ro} value={g.name} onChange={(e) => setSlabs(slabs.map((x) => (x.id === g.id ? { ...x, name: e.target.value } : x)))} />
              <Input className="w-28" disabled={ro} placeholder="HSN/SAC" value={g.hsn} onChange={(e) => setSlabs(slabs.map((x) => (x.id === g.id ? { ...x, hsn: e.target.value } : x)))} />
              <Select className="w-24" disabled={ro} value={g.rate} onChange={(e) => setSlabs(slabs.map((x) => (x.id === g.id ? { ...x, rate: Number(e.target.value) } : x)))}>{[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}</Select>
              {!ro && <IconButton tooltip="Remove" onClick={() => setSlabs(slabs.filter((x) => x.id !== g.id))}><Trash2 className="size-3.5" /></IconButton>}
            </div>
          ))}
        </div>
      </div>
    </SettingsCard>
  )
}

/* ---------------------------------------------------------------- POS */
export function PosSection({ ro }: SectionProps) {
  const [p, setP] = useSettingsGroup('pos')
  return (
    <SettingsCard title="POS configuration" subtitle="Billing screen behaviour" ro={ro}>
      <Row label="Default order type"><Select className="w-36" disabled={ro} value={p.defaultOrderType} onChange={(e) => setP({ defaultOrderType: e.target.value as typeof p.defaultOrderType })}><option>Dine-in</option><option>Takeaway</option><option>Delivery</option></Select></Row>
      <Row label="Compact item tiles" desc="Fit more items on smaller screens"><Toggle disabled={ro} checked={p.compactTiles} onChange={(v) => setP({ compactTiles: v })} /></Row>
      <Row label="Show item images / emoji"><Toggle disabled={ro} checked={p.showImages} onChange={(v) => setP({ showImages: v })} /></Row>
      <Row label="Ask customer details" desc="Prompt for name & phone before billing"><Toggle disabled={ro} checked={p.askCustomer} onChange={(v) => setP({ askCustomer: v })} /></Row>
      <Row label="Require table for dine-in"><Toggle disabled={ro} checked={p.requireTable} onChange={(v) => setP({ requireTable: v })} /></Row>
      <Row label="Quick payment buttons" desc="One-tap Cash / UPI / Card settle"><Toggle disabled={ro} checked={p.quickPayModes} onChange={(v) => setP({ quickPayModes: v })} /></Row>
    </SettingsCard>
  )
}

/* ---------------------------------------------------------------- Tables */
export function TablesSection({ ro }: SectionProps) {
  const tables = useStore((s) => s.tables)
  const outlets = useStore((s) => s.outlets)
  const nav = useNavigate()
  const [f, setF] = useState({ autoClean: 5, defaultCap: 4, allowMerge: true, reservationHold: 15 })
  return (
    <SettingsCard title="Table management" subtitle="Floors, capacity and turn-over rules" ro={ro}
      actions={<Button size="sm" iconRight={<ArrowRight className="size-3" />} onClick={() => nav('/tables')}>Open floor plan</Button>}>
      <div className="grid gap-2 py-3 sm:grid-cols-2 lg:grid-cols-4">
        {outlets.map((o) => {
          const t = tables.filter((x) => x.outletId === o.id)
          const floors = Array.from(new Set(t.map((x) => x.floor)))
          return (
            <div key={o.id} className="rounded-lg border border-slate-200 p-3">
              <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-slate-800"><span className="size-2 rounded-full" style={{ background: o.color }} />{o.short}</p>
              <p className="mt-1 text-[18px] font-semibold text-slate-900">{t.length}<span className="text-[11.5px] font-normal text-slate-500"> tables · {t.reduce((s, x) => s + x.capacity, 0)} seats</span></p>
              <p className="truncate text-[11px] text-slate-500">{floors.join(', ')}</p>
            </div>
          )
        })}
      </div>
      <Row label="Auto mark available after cleaning" desc="Minutes after settlement"><Input className="w-24" type="number" disabled={ro} value={f.autoClean} suffix="min" onChange={(e) => setF({ ...f, autoClean: Number(e.target.value) })} /></Row>
      <Row label="Default table capacity"><Input className="w-24" type="number" disabled={ro} value={f.defaultCap} onChange={(e) => setF({ ...f, defaultCap: Number(e.target.value) })} /></Row>
      <Row label="Hold reservation for"><Input className="w-24" type="number" disabled={ro} value={f.reservationHold} suffix="min" onChange={(e) => setF({ ...f, reservationHold: Number(e.target.value) })} /></Row>
      <Row label="Allow table merge & transfer"><Toggle disabled={ro} checked={f.allowMerge} onChange={(v) => setF({ ...f, allowMerge: v })} /></Row>
    </SettingsCard>
  )
}

/* ---------------------------------------------------------------- Shifts */
interface Shift { id: string; name: string; start: string; end: string; brk: number; color: string }
export function ShiftsSection({ ro }: SectionProps) {
  const employees = useStore((s) => s.employees)
  const [shifts, setShifts] = useState<Shift[]>([
    { id: 's1', name: 'Morning', start: '08:00', end: '16:00', brk: 30, color: '#f59e0b' },
    { id: 's2', name: 'Evening', start: '14:00', end: '22:00', brk: 30, color: '#7c3aed' },
    { id: 's3', name: 'Night', start: '20:00', end: '04:00', brk: 45, color: '#1d3f70' },
    { id: 's4', name: 'General', start: '10:00', end: '19:00', brk: 60, color: '#14a891' },
  ])
  const upd = (id: string, patch: Partial<Shift>) => setShifts(shifts.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const hours = (s: Shift) => { const [a, b] = [s.start, s.end].map((t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))); return (((b - a + 1440) % 1440) - s.brk) / 60 }
  return (
    <SettingsCard title="Staff shifts" subtitle="Shift timings used for attendance & late marking" ro={ro}
      actions={!ro && <Button size="sm" icon={<Plus className="size-3" />} onClick={() => setShifts([...shifts, { id: uid('s'), name: 'Split', start: '11:00', end: '15:00', brk: 0, color: '#db2777' }])}>Add shift</Button>}>
      <div className="overflow-x-auto py-2">
        <table className="w-full min-w-[600px] text-[12.5px]">
          <thead><tr className="text-left text-[10.5px] uppercase tracking-wide text-slate-400"><th className="py-1.5">Shift</th><th>Start</th><th>End</th><th>Break</th><th>Net hours</th><th>Staff</th><th /></tr></thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="py-2 pr-2"><div className="flex items-center gap-2"><span className="h-6 w-1 rounded" style={{ background: s.color }} /><Input className="w-32" disabled={ro} value={s.name} onChange={(e) => upd(s.id, { name: e.target.value })} /></div></td>
                <td className="pr-2"><Input type="time" className="w-28" disabled={ro} value={s.start} onChange={(e) => upd(s.id, { start: e.target.value })} /></td>
                <td className="pr-2"><Input type="time" className="w-28" disabled={ro} value={s.end} onChange={(e) => upd(s.id, { end: e.target.value })} /></td>
                <td className="pr-2"><Input type="number" className="w-24" disabled={ro} value={s.brk} suffix="min" onChange={(e) => upd(s.id, { brk: Number(e.target.value) })} /></td>
                <td className="font-medium">{hours(s).toFixed(1)} h</td>
                <td><Badge tone="gray">{employees.filter((e) => e.shift === s.name).length}</Badge></td>
                <td className="text-right">{!ro && <IconButton tooltip="Remove" onClick={() => setShifts(shifts.filter((x) => x.id !== s.id))}><Trash2 className="size-3.5" /></IconButton>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SettingsCard>
  )
}

/* ---------------------------------------------------------------- Attendance */
export function AttendanceSection({ ro }: SectionProps) {
  const [a, setA] = useSettingsGroup('attendance')
  return (
    <SettingsCard title="Attendance policies" subtitle="Check-in methods, grace time and half-day rules" ro={ro}>
      <Row label="Grace period" desc="Check-ins after shift start + grace are marked Late"><Input className="w-24" type="number" disabled={ro} value={a.graceMinutes} suffix="min" onChange={(e) => setA({ graceMinutes: Number(e.target.value) || 0 })} /></Row>
      <Row label="Half-day threshold" desc="Working hours below this count as half day"><Input className="w-24" type="number" disabled={ro} value={a.halfDayHours} suffix="hrs" onChange={(e) => setA({ halfDayHours: Number(e.target.value) || 0 })} /></Row>
      <Row label="Mobile app check-in" desc="Selfie + GPS check-in from Staff App"><Toggle disabled={ro} checked={a.allowMobile} onChange={(v) => setA({ allowMobile: v })} /></Row>
      <Row label="Network-based auto check-in" desc="Mark present when device joins outlet Wi-Fi"><Toggle disabled={ro} checked={a.allowNetwork} onChange={(v) => setA({ allowNetwork: v })} /></Row>
      <Row label="Staff Wi-Fi SSID"><Input className="w-56" disabled={ro || !a.allowNetwork} value={a.networkSSID} onChange={(e) => setA({ networkSSID: e.target.value })} /></Row>
      <Row label="Geo-fence (200 m)" desc="Block mobile check-ins outside the outlet radius"><Toggle disabled={ro} checked={a.geoFence} onChange={(v) => setA({ geoFence: v })} /></Row>
    </SettingsCard>
  )
}

/* ---------------------------------------------------------------- Payroll */
export function PayrollSection({ ro }: SectionProps) {
  const [p, setP] = useSettingsGroup('payroll')
  return (
    <SettingsCard title="Payroll configuration" subtitle="Statutory deductions and overtime" ro={ro}>
      <Row label="Salary pay day" desc="Day of the following month"><Select className="w-24" disabled={ro} value={p.payDay} onChange={(e) => setP({ payDay: Number(e.target.value) })}>{[1, 5, 7, 10, 15].map((d) => <option key={d} value={d}>{d}</option>)}</Select></Row>
      <Row label="Provident Fund (PF)" desc="12% of basic, capped at ₹15,000 wage"><Toggle disabled={ro} checked={p.pfEnabled} onChange={(v) => setP({ pfEnabled: v })} /></Row>
      <Row label="ESI" desc="0.75% employee share for wages ≤ ₹21,000"><Toggle disabled={ro} checked={p.esiEnabled} onChange={(v) => setP({ esiEnabled: v })} /></Row>
      <Row label="Overtime multiplier" desc="Applied on hourly rate"><Select className="w-24" disabled={ro} value={p.otMultiplier} onChange={(e) => setP({ otMultiplier: Number(e.target.value) })}>{[1, 1.25, 1.5, 2].map((m) => <option key={m} value={m}>{m}×</option>)}</Select></Row>
    </SettingsCard>
  )
}

/* ---------------------------------------------------------------- QR */
export function QrSection({ ro }: SectionProps) {
  const [q, setQ] = useSettingsGroup('qr')
  const nav = useNavigate()
  return (
    <SettingsCard title="QR ordering" subtitle="Contactless table ordering" ro={ro} actions={<Button size="sm" iconRight={<ArrowRight className="size-3" />} onClick={() => nav('/qr')}>QR codes</Button>}>
      <Row label="Enable QR ordering"><Toggle disabled={ro} checked={q.enabled} onChange={(v) => setQ({ enabled: v })} /></Row>
      <Row label="Require staff approval" desc="Orders wait for captain confirmation before KOT"><Toggle disabled={ro || !q.enabled} checked={q.requireApproval} onChange={(v) => setQ({ requireApproval: v })} /></Row>
      <Row label="Allow pay at table" desc="UPI payment from the guest's phone"><Toggle disabled={ro || !q.enabled} checked={q.allowPayAtTable} onChange={(v) => setQ({ allowPayAtTable: v })} /></Row>
      <Row label="Menu theme"><Select className="w-32" disabled={ro} value={q.theme} onChange={(e) => setQ({ theme: e.target.value })}><option value="navy">Navy</option><option value="teal">Teal</option><option value="dark">Dark</option></Select></Row>
    </SettingsCard>
  )
}

/* ---------------------------------------------------------------- Links: roles / permissions */
export function RolesLinkSection() {
  const roles = useStore((s) => s.roles)
  const users = useStore((s) => s.users)
  const nav = useNavigate()
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div><h3 className="text-[13px] font-semibold text-slate-900">User roles</h3><p className="text-[12px] text-slate-500">{roles.length} roles · {users.length} users</p></div>
        <Button variant="primary" iconRight={<ArrowRight className="size-3.5" />} onClick={() => nav('/users')}>Manage users</Button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {roles.map((r) => (
          <button key={r.id} onClick={() => nav('/users/roles?role=' + r.id)} className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50">
            <span className="h-6 w-1 rounded" style={{ background: r.color }} />
            <span className="flex-1 text-[12.5px] font-medium text-slate-800">{r.name}</span>
            <span className="text-[11px] text-slate-500">{users.filter((u) => u.roleId === r.id).length} users</span>
          </button>
        ))}
      </div>
    </Card>
  )
}
export function PermissionsLinkSection() {
  const nav = useNavigate()
  const roles = useStore((s) => s.roles)
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700"><ShieldCheck className="size-5" /></span>
        <div className="flex-1">
          <h3 className="text-[13px] font-semibold text-slate-900">Permission management</h3>
          <p className="text-[12px] text-slate-500">Granular View / Create / Edit / Delete / Approve / Export / Print rights across {MODULES.length} modules for every role.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{roles.slice(0, 6).map((r) => <Badge key={r.id} tone="gray">{r.name}</Badge>)}</div>
        </div>
        <Button variant="primary" iconRight={<ArrowRight className="size-3.5" />} onClick={() => nav('/users/roles')}>Open permission editor</Button>
      </div>
    </Card>
  )
}

/* ---------------------------------------------------------------- Notifications */
const NOTI: [string, string, string][] = [
  ['newOrder', 'New orders', 'Waiter app, QR and aggregator orders'],
  ['lowStock', 'Low stock alerts', 'When a material falls below minimum level'],
  ['approvals', 'Approval requests', 'Discounts, resettlements, transfers, POs'],
  ['attendance', 'Attendance exceptions', 'Late check-ins and absentees'],
  ['dayEnd', 'Day-end summary', 'Consolidated sales report at closing'],
]
const CHANNELS: [string, string][] = [['email', 'Email'], ['sms', 'SMS'], ['whatsapp', 'WhatsApp']]
export function NotificationsSection({ ro }: SectionProps) {
  const [n, setN] = useSettingsGroup('notifications')
  return (
    <SettingsCard title="Notifications" subtitle="What gets notified and where" ro={ro}>
      {NOTI.map(([k, l, d]) => <Row key={k} label={l} desc={d}><Toggle disabled={ro} checked={!!n[k]} onChange={(v) => setN({ [k]: v })} /></Row>)}
      <div className="py-3">
        <p className="mb-2 text-[13px] font-medium text-slate-800">Delivery channels</p>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map(([k, l]) => (
            <button key={k} disabled={ro} onClick={() => setN({ [k]: !n[k] })} className={cn('rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition', n[k] ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}>{l}</button>
          ))}
          <Button size="sm" variant="ghost" icon={<Send className="size-3" />} onClick={() => toast.success('Test notification sent', 'Check your enabled channels (simulated)')}>Send test</Button>
        </div>
      </div>
    </SettingsCard>
  )
}
