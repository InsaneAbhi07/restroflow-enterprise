import { useEffect, useState } from 'react'
import { BedDouble, Building2, Pencil, Plus, Receipt, Save, Settings2, Utensils } from 'lucide-react'
import { Badge, Button, Card, CardHeader, DataTable, Field, Input, Modal, PageHeader, Select, Tabs, Textarea, Toggle, type Column } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { cn, inr, uid } from '@/lib/format'
import { useHotel } from './hotelStore'
import { mealRateFor, roomGst, roomState, type HkStatus, type HotelConfig, type RatePlan, type Room, type RoomType } from './hotelModel'
import { RS_STYLE } from './hotelUi'

type TabKey = 'types' | 'rooms' | 'tariff' | 'policies'
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function RoomSetup() {
  const { types, rooms, plans, reservations, config } = useHotel()
  const { can } = usePermission()
  const editable = can('hotel', 'edit')
  const [tab, setTab] = useState<TabKey>('types')
  const [editType, setEditType] = useState<RoomType | null>(null)
  const [editRoom, setEditRoom] = useState<Room | null>(null)
  const [editPlan, setEditPlan] = useState<RatePlan | null>(null)

  const roomCols: Column<Room>[] = [
    { key: 'no', header: 'Room', render: (r) => <span className="font-semibold text-slate-900">{r.no}</span>, sortValue: (r) => +r.no },
    { key: 'floor', header: 'Floor' },
    { key: 'type', header: 'Type', render: (r) => { const t = types.find((x) => x.id === r.typeId); return <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: t?.color }} />{t?.name}</span> }, sortValue: (r) => r.typeId },
    { key: 'view', header: 'View' },
    { key: 'smoking', header: 'Smoking', render: (r) => (r.smoking ? 'Yes' : 'No') },
    { key: 'hk', header: 'Housekeeping', render: (r) => <Badge tone={r.hk === 'Clean' ? 'green' : r.hk === 'Dirty' ? 'amber' : 'gray'} dot>{r.hk}</Badge> },
    { key: 'state', header: 'Status', render: (r) => { const s = roomState(r, reservations).state; return <span className={cn('inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', RS_STYLE[s].chip)}>{s}</span> } },
    { key: 'note', header: 'Note', sortable: false, render: (r) => <span className="text-[11.5px] text-slate-500">{r.note ?? ''}</span> },
    { key: 'act', header: '', sortable: false, align: 'right', render: (r) => editable && <Button size="xs" variant="ghost" icon={<Pencil className="size-3" />} onClick={(e) => { e.stopPropagation(); setEditRoom(r) }}>Edit</Button> },
  ]

  return (
    <div className="page-enter">
      <PageHeader title="Rooms & Tariff" icon={<BedDouble />} subtitle={`${config.name} · ${types.length} room types · ${rooms.length} rooms · ${plans.filter((p) => p.active).length} rate plans`}
        breadcrumbs={[{ label: 'Hotel' }, { label: 'Rooms & Tariff' }]}
        actions={editable && (
          tab === 'types' ? <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setEditType(blankType())}>Add room type</Button>
            : tab === 'rooms' ? <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setEditRoom({ id: '', no: '', floor: '', typeId: types[0]?.id ?? '', view: 'City', hk: 'Clean', smoking: false })}>Add room</Button>
              : tab === 'tariff' ? <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setEditPlan({ id: '', code: '', name: '', meals: '', addonPerAdult: 0, active: true, description: '' })}>Add rate plan</Button> : null
        )} />

      <Tabs value={tab} onChange={setTab} className="mb-4" items={[
        { value: 'types', label: 'Room types', icon: <BedDouble className="size-3.5" />, count: types.length },
        { value: 'rooms', label: 'Rooms', icon: <Building2 className="size-3.5" />, count: rooms.length },
        { value: 'tariff', label: 'Rate plans & tariff', icon: <Receipt className="size-3.5" /> },
        { value: 'policies', label: 'Policies & tax', icon: <Settings2 className="size-3.5" /> },
      ]} />

      {tab === 'types' && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {types.map((t) => {
            const list = rooms.filter((r) => r.typeId === t.id)
            return (
              <Card key={t.id} className="overflow-hidden">
                <div className="h-1.5" style={{ background: t.color }} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div><div className="text-[11px] font-bold text-slate-400">{t.code}</div><div className="text-[15px] font-semibold text-slate-900">{t.name}</div></div>
                    {editable && <Button size="xs" variant="ghost" icon={<Pencil className="size-3" />} onClick={() => setEditType(t)}>Edit</Button>}
                  </div>
                  <p className="mt-1 text-[12px] text-slate-500">{t.description}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
                    <Mini k="Rack rate" v={inr(t.baseRate)} /><Mini k="Occupancy" v={`${t.maxAdults}A + ${t.maxChildren}C`} /><Mini k="Rooms" v={`${list.length}`} />
                    <Mini k="Extra adult" v={inr(t.extraAdult)} /><Mini k="Extra child" v={inr(t.extraChild)} /><Mini k="Size" v={`${t.sizeSqft} ft²`} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">{t.amenities.map((a) => <Badge key={a}>{a}</Badge>)}</div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11.5px] text-slate-500">
                    <span>{t.bed} bed · rooms {list.map((r) => r.no).join(', ') || '—'}</span>
                    <Badge tone={roomGst(t.baseRate, config) > config.gstLow ? 'amber' : 'green'}>GST {roomGst(t.baseRate, config)}%</Badge>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'rooms' && <Card><DataTable columns={roomCols} rows={rooms} pageSize={20} onRowClick={editable ? setEditRoom : undefined} /></Card>}

      {tab === 'tariff' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Rate plans" subtitle="Meal plans offered on every room type" icon={<Utensils className="size-3.5" />} />
            <div className="divide-y divide-slate-100">
              {plans.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
                  <span className="w-12 rounded-md bg-navy-50 py-0.5 text-center text-[11px] font-bold text-navy-700">{p.code}</span>
                  <div className="min-w-0 flex-1"><div className="font-medium text-slate-900">{p.name} <span className="font-normal text-slate-500">· {p.meals}</span></div><div className="truncate text-[11.5px] text-slate-500">{p.description}</div></div>
                  <span className="w-36 text-right tabular text-slate-700">{p.addonPerAdult ? `+${inr(p.addonPerAdult)} / adult / night` : 'Room only'}</span>
                  <Badge tone={p.active ? 'green' : 'gray'}>{p.active ? 'Active' : 'Inactive'}</Badge>
                  {editable && <Button size="xs" variant="ghost" icon={<Pencil className="size-3" />} onClick={() => setEditPlan(p)}>Edit</Button>}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Tariff matrix" subtitle={`Per night for 2 adults, before GST · weekend (${config.weekendNights.map((d) => WEEKDAYS[d]).join(', ')} nights) +${config.weekendUplift}% on room`} icon={<Receipt className="size-3.5" />} />
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 text-left font-semibold">Room type</th>
                  {plans.filter((p) => p.active).map((p) => <th key={p.id} className="px-4 py-2 text-right font-semibold">{p.code}</th>)}
                  <th className="px-4 py-2 text-right font-semibold">Room GST</th>
                </tr></thead>
                <tbody>
                  {types.map((t) => {
                    const weekendRoom = Math.round(t.baseRate * (1 + config.weekendUplift / 100))
                    return (
                      <tr key={t.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2"><span className="flex items-center gap-1.5 font-medium text-slate-800"><span className="size-2 rounded-full" style={{ background: t.color }} />{t.name}</span></td>
                        {plans.filter((p) => p.active).map((p) => {
                          const meal = mealRateFor(p, 2, 0)
                          return <td key={p.id} className="px-4 py-2 text-right tabular"><div className="font-medium text-slate-900">{inr(t.baseRate + meal)}</div><div className="text-[11px] text-slate-400">wknd {inr(weekendRoom + meal)}</div></td>
                        })}
                        <td className="px-4 py-2 text-right"><Badge tone={roomGst(t.baseRate, config) > config.gstLow ? 'amber' : 'green'}>{roomGst(t.baseRate, config)}%{roomGst(weekendRoom, config) !== roomGst(t.baseRate, config) ? ` / ${roomGst(weekendRoom, config)}% wknd` : ''}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'policies' && <PoliciesForm editable={editable} />}

      {editType && <TypeModal value={editType} onClose={() => setEditType(null)} />}
      {editRoom && <RoomModal value={editRoom} onClose={() => setEditRoom(null)} />}
      {editPlan && <PlanModal value={editPlan} onClose={() => setEditPlan(null)} />}
    </div>
  )
}

const Mini = ({ k, v }: { k: string; v: string }) => <div className="rounded-lg bg-slate-50 px-2 py-1.5"><div className="text-[10.5px] text-slate-500">{k}</div><div className="font-semibold tabular text-slate-800">{v}</div></div>
const blankType = (): RoomType => ({ id: '', code: '', name: '', baseRate: 4000, maxAdults: 2, maxChildren: 1, extraAdult: 1000, extraChild: 500, bed: 'Queen', sizeSqft: 250, amenities: ['Wi-Fi', 'LED TV'], color: '#0891b2', description: '' })
const n = (v: string) => Math.max(0, Number(v) || 0)

/* ------------------------------------------------------------------ modals */
function TypeModal({ value, onClose }: { value: RoomType; onClose: () => void }) {
  const upsert = useHotel((s) => s.upsertType)
  const [t, setT] = useState(value)
  const [amen, setAmen] = useState(value.amenities.join(', '))
  const set = <K extends keyof RoomType>(k: K, v: RoomType[K]) => setT((x) => ({ ...x, [k]: v }))
  const save = () => {
    if (!t.code.trim() || !t.name.trim() || t.baseRate <= 0) return toast.error('Code, name and rack rate are required')
    upsert({ ...t, id: t.id || uid('rt'), code: t.code.trim().toUpperCase(), amenities: amen.split(',').map((a) => a.trim()).filter(Boolean) })
    toast.success(value.id ? 'Room type updated' : 'Room type added', t.name)
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="lg" icon={<BedDouble />} title={value.id ? `Edit ${value.name}` : 'New room type'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Code" required><Input value={t.code} maxLength={4} onChange={(e) => set('code', e.target.value)} /></Field>
        <Field label="Name" required className="sm:col-span-2"><Input value={t.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Colour"><Input type="color" value={t.color} onChange={(e) => set('color', e.target.value)} className="p-0.5" /></Field>
        <Field label="Rack rate / night" required><Input type="number" value={t.baseRate} onChange={(e) => set('baseRate', n(e.target.value))} suffix="₹" /></Field>
        <Field label="Extra adult"><Input type="number" value={t.extraAdult} onChange={(e) => set('extraAdult', n(e.target.value))} suffix="₹" /></Field>
        <Field label="Extra child"><Input type="number" value={t.extraChild} onChange={(e) => set('extraChild', n(e.target.value))} suffix="₹" /></Field>
        <Field label="Size (sq ft)"><Input type="number" value={t.sizeSqft} onChange={(e) => set('sizeSqft', n(e.target.value))} /></Field>
        <Field label="Max adults"><Input type="number" min={1} value={t.maxAdults} onChange={(e) => set('maxAdults', Math.max(1, n(e.target.value)))} /></Field>
        <Field label="Max children"><Input type="number" value={t.maxChildren} onChange={(e) => set('maxChildren', n(e.target.value))} /></Field>
        <Field label="Bed" className="sm:col-span-2"><Input value={t.bed} onChange={(e) => set('bed', e.target.value)} /></Field>
        <Field label="Amenities" hint="Comma separated" className="sm:col-span-4"><Input value={amen} onChange={(e) => setAmen(e.target.value)} /></Field>
        <Field label="Description" className="sm:col-span-4"><Textarea rows={2} value={t.description} onChange={(e) => set('description', e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

function RoomModal({ value, onClose }: { value: Room; onClose: () => void }) {
  const { types, rooms, upsertRoom } = useHotel()
  const [r, setR] = useState(value)
  const set = <K extends keyof Room>(k: K, v: Room[K]) => setR((x) => ({ ...x, [k]: v }))
  const save = () => {
    const no = r.no.trim()
    if (!no) return toast.error('Room number is required')
    if (rooms.some((x) => x.no === no && x.id !== value.id)) return toast.error(`Room ${no} already exists`)
    upsertRoom({ ...r, no, id: r.id || 'rm_' + no, floor: r.floor.trim() || `Floor ${no[0]}` })
    toast.success(value.id ? 'Room updated' : 'Room added', no)
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="md" icon={<Building2 />} title={value.id ? `Room ${value.no}` : 'Add room'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Room number" required><Input value={r.no} disabled={!!value.id} onChange={(e) => set('no', e.target.value)} /></Field>
        <Field label="Floor" hint="Defaults from room number"><Input value={r.floor} onChange={(e) => set('floor', e.target.value)} placeholder="Floor 1" /></Field>
        <Field label="Room type"><Select value={r.typeId} onChange={(e) => set('typeId', e.target.value)}>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
        <Field label="View"><Input value={r.view} onChange={(e) => set('view', e.target.value)} /></Field>
        <Field label="Housekeeping"><Select value={r.hk} onChange={(e) => set('hk', e.target.value as HkStatus)}>{(['Clean', 'Dirty', 'Out of Order'] as const).map((h) => <option key={h}>{h}</option>)}</Select></Field>
        <Field label="Smoking room"><div className="flex h-8 items-center"><Toggle checked={r.smoking} onChange={(v) => set('smoking', v)} /></div></Field>
        <Field label="Note" className="sm:col-span-2"><Input value={r.note ?? ''} onChange={(e) => set('note', e.target.value || undefined)} placeholder="Connecting to 105, accessible room…" /></Field>
      </div>
    </Modal>
  )
}

function PlanModal({ value, onClose }: { value: RatePlan; onClose: () => void }) {
  const upsert = useHotel((s) => s.upsertPlan)
  const [p, setP] = useState(value)
  const set = <K extends keyof RatePlan>(k: K, v: RatePlan[K]) => setP((x) => ({ ...x, [k]: v }))
  const save = () => {
    if (!p.code.trim() || !p.name.trim()) return toast.error('Code and name are required')
    upsert({ ...p, id: p.id || uid('rp'), code: p.code.trim().toUpperCase() })
    toast.success(value.id ? 'Rate plan updated' : 'Rate plan added', p.name)
    onClose()
  }
  return (
    <Modal open onClose={onClose} size="md" icon={<Utensils />} title={value.id ? `Edit ${value.code}` : 'New rate plan'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Code" required><Input value={p.code} maxLength={5} onChange={(e) => set('code', e.target.value)} placeholder="CP" /></Field>
        <Field label="Name" required><Input value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="Bed & Breakfast" /></Field>
        <Field label="Meals included"><Input value={p.meals} onChange={(e) => set('meals', e.target.value)} placeholder="Breakfast" /></Field>
        <Field label="Add-on per adult / night" hint="Children charged at 50%"><Input type="number" value={p.addonPerAdult} onChange={(e) => set('addonPerAdult', n(e.target.value))} suffix="₹" /></Field>
        <Field label="Description" className="sm:col-span-2"><Textarea rows={2} value={p.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-[12.5px] text-slate-700"><Toggle checked={p.active} onChange={(v) => set('active', v)} />Active – offered on new bookings</label>
      </div>
    </Modal>
  )
}

function PoliciesForm({ editable }: { editable: boolean }) {
  const { config, updateConfig } = useHotel()
  const outlets = useStore((s) => s.outlets)
  const [c, setC] = useState<HotelConfig>(config)
  useEffect(() => setC(config), [config])
  const set = <K extends keyof HotelConfig>(k: K, v: HotelConfig[K]) => setC((x) => ({ ...x, [k]: v }))
  const save = () => { updateConfig(c); toast.success('Hotel policies saved') }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Property & timings" icon={<Building2 className="size-3.5" />} />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Property name" className="sm:col-span-2"><Input value={c.name} disabled={!editable} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Linked restaurant outlet" hint="Room-charge & meal-plan postings come from here" className="sm:col-span-2">
            <Select value={c.outletId} disabled={!editable} onChange={(e) => set('outletId', e.target.value)}>{outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select>
          </Field>
          <Field label="Standard check-in"><Input type="time" value={c.checkInTime} disabled={!editable} onChange={(e) => set('checkInTime', e.target.value)} /></Field>
          <Field label="Standard check-out"><Input type="time" value={c.checkOutTime} disabled={!editable} onChange={(e) => set('checkOutTime', e.target.value)} /></Field>
          <Field label="Early check-in fee"><Input type="number" value={c.earlyCheckInFee} disabled={!editable} onChange={(e) => set('earlyCheckInFee', n(e.target.value))} suffix="₹" /></Field>
          <Field label="Late check-out fee"><Input type="number" value={c.lateCheckOutFee} disabled={!editable} onChange={(e) => set('lateCheckOutFee', n(e.target.value))} suffix="₹" /></Field>
          <Field label="Invoice prefix" className="sm:col-span-2"><Input value={c.invoicePrefix} disabled={!editable} onChange={(e) => set('invoicePrefix', e.target.value)} /></Field>
        </div>
      </Card>
      <Card>
        <CardHeader title="Pricing & GST" icon={<Receipt className="size-3.5" />} />
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Weekend uplift on room rate"><Input type="number" value={c.weekendUplift} disabled={!editable} onChange={(e) => set('weekendUplift', n(e.target.value))} suffix="%" /></Field>
          <Field label="Weekend nights">
            <div className="flex h-8 items-center gap-1">
              {WEEKDAYS.map((d, i) => (
                <button key={d} disabled={!editable} onClick={() => set('weekendNights', c.weekendNights.includes(i) ? c.weekendNights.filter((x) => x !== i) : [...c.weekendNights, i].sort())}
                  className={cn('h-7 flex-1 rounded-md text-[11px] font-medium ring-1 ring-inset transition', c.weekendNights.includes(i) ? 'bg-navy-900 text-white ring-navy-900' : 'bg-white text-slate-500 ring-slate-200')}>{d[0]}</button>
              ))}
            </div>
          </Field>
          <Field label="Room GST threshold / night" hint="Declared tariff per unit per day"><Input type="number" value={c.gstThreshold} disabled={!editable} onChange={(e) => set('gstThreshold', n(e.target.value))} suffix="₹" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="GST up to"><Input type="number" value={c.gstLow} disabled={!editable} onChange={(e) => set('gstLow', n(e.target.value))} suffix="%" /></Field>
            <Field label="GST above"><Input type="number" value={c.gstHigh} disabled={!editable} onChange={(e) => set('gstHigh', n(e.target.value))} suffix="%" /></Field>
          </div>
          <Field label="F&B / meal plan GST"><Input type="number" value={c.fnbGst} disabled={!editable} onChange={(e) => set('fnbGst', n(e.target.value))} suffix="%" /></Field>
          <Field label="Other services GST"><Input type="number" value={c.serviceGst} disabled={!editable} onChange={(e) => set('serviceGst', n(e.target.value))} suffix="%" /></Field>
          <p className="text-[11.5px] text-slate-500 sm:col-span-2">Defaults follow the current Indian GST rates for hotel accommodation. Please confirm the rates and the restaurant “specified premises” rule with your tax advisor.</p>
        </div>
      </Card>
      {editable && <div className="flex justify-end lg:col-span-2"><Button variant="primary" icon={<Save className="size-3.5" />} onClick={save}>Save policies</Button></div>}
    </div>
  )
}
