import { useEffect, useState } from 'react'
import { BedDouble, IdCard, KeyRound, LogIn, MessageCircle, ScanLine, ShieldAlert, Sun } from 'lucide-react'
import { Badge, Button, Field, Input, Modal, Select, Stepper, Toggle } from '@/components/ui'
import { toast } from '@/store/toast'
import { cn, fmtDateShort, inr } from '@/lib/format'
import { useHotel } from './hotelStore'
import { addDays, folioTotals, nightsBetween, roomFree, stayEstimate, today, type FolioPayMode, type GuestInfo, type IdType } from './hotelModel'
import { ID_TYPES, PAY_MODES, SectionTitle } from './hotelUi'

const STEPS = ['Guest & ID', 'Room', 'Deposit & keys']

export function CheckInModal({ resId, onClose, onDone }: { resId: string; onClose: () => void; onDone?: () => void }) {
  const { reservations, rooms, types, plans, config, checkIn } = useHotel()
  const r = reservations.find((x) => x.id === resId)
  const [step, setStep] = useState(0)
  const [guest, setGuest] = useState<GuestInfo | null>(null)
  const [roomId, setRoomId] = useState('')
  const [upgrades, setUpgrades] = useState(false)
  const [deposit, setDeposit] = useState(0)
  const [mode, setMode] = useState<FolioPayMode>('Card')
  const nowHHMM = new Date().toTimeString().slice(0, 5)
  const [early, setEarly] = useState(nowHHMM < config.checkInTime && nowHHMM > '06:00')
  const [keys, setKeys] = useState(true)
  const [whatsapp, setWhatsapp] = useState(true)

  useEffect(() => {
    if (!r) return
    setGuest({ ...r.guest })
    const t = today()
    const pre = r.roomId && rooms.find((x) => x.id === r.roomId)
    setRoomId(pre && pre.hk === 'Clean' && roomFree(pre.id, t, r.departure > t ? r.departure : addDays(t, 1), reservations, r.id) ? pre.id : '')
    const paid = folioTotals(r).paid
    const dep = r.departure > t ? r.departure : addDays(t, 1)
    const oneNight = stayEstimate({ ...r, arrival: t, departure: dep }, config).total / Math.max(1, nightsBetween(t, dep))
    setDeposit(paid > 0 || r.source === 'Corporate' ? 0 : Math.round(oneNight / 100) * 100)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resId])

  if (!r || !guest) return null
  const t = today()
  const departure = r.departure > t ? r.departure : addDays(t, 1)
  const bookedType = types.find((x) => x.id === r.typeId)!
  const foreign = guest.nationality.trim().toLowerCase() !== 'indian'
  const g = <K extends keyof GuestInfo>(k: K, v: GuestInfo[K]) => setGuest((x) => (x ? { ...x, [k]: v } : x))

  const candidateTypes = types.filter((x) => x.id === r.typeId || (upgrades && x.baseRate > bookedType.baseRate))
  const roomOptions = rooms
    .filter((x) => candidateTypes.some((ct) => ct.id === x.typeId) && x.hk !== 'Out of Order' && roomFree(x.id, t, departure, reservations, r.id))
  const room = rooms.find((x) => x.id === roomId)
  const est = stayEstimate({ ...r, arrival: t, departure }, config)
  const paid = folioTotals(r).paid

  const stepErrors = [
    [!guest.name.trim() && 'Guest name', !guest.idNo.trim() && 'ID number', !guest.address.trim() && 'Address', foreign && guest.idType !== 'Passport' && 'Foreign nationals must present a passport', foreign && !guest.visaNo?.trim() && 'Visa number'].filter(Boolean) as string[],
    [!roomId && 'Select a room'].filter(Boolean) as string[],
    [],
  ]
  const errs = stepErrors[step]

  const scanId = () => {
    const fake = guest.idType === 'Passport' ? `P${Math.floor(1e6 + Math.random() * 9e6)}` : guest.idType === 'Aadhaar' ? `XXXX XXXX ${Math.floor(1000 + Math.random() * 9000)}` : `ID-${Math.floor(1e8 + Math.random() * 9e8)}`
    setGuest((x) => (x ? { ...x, idNo: x.idNo || fake, address: x.address || 'Address as per ID' } : x))
    toast.success('ID scanned', `${guest.idType} captured · image attached to guest profile`)
  }

  const confirm = () => {
    checkIn(r.id, { roomId, guest, deposit: deposit > 0 ? { mode, amount: deposit } : undefined, earlyCheckIn: early })
    toast.success(`${guest.name} checked in`, `Room ${room?.no}${keys ? ' · 2 key cards encoded' : ''}${whatsapp ? ' · WhatsApp welcome sent' : ''}`)
    if (foreign) toast.info('Form C reminder', 'Submit Form C on the FRRO portal within 24 hours')
    onDone?.()
    onClose()
  }

  return (
    <Modal open onClose={onClose} size="lg" icon={<LogIn />} title={`Check-in · ${r.guest.name}`}
      subtitle={`${r.no} · ${bookedType.name} · ${fmtDateShort(t)} → ${fmtDateShort(departure)} · ${est.nights} night${est.nights === 1 ? '' : 's'} · ${r.adults}A${r.children ? '+' + r.children + 'C' : ''}`}
      footer={<>
        {errs.length > 0 && <span className="mr-auto truncate text-[12px] text-rose-600">Required: {errs.join(', ')}</span>}
        {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
        {step < 2 ? <Button variant="primary" disabled={errs.length > 0} onClick={() => setStep(step + 1)}>Next</Button>
          : <Button variant="success" icon={<KeyRound className="size-3.5" />} onClick={confirm}>Complete check-in</Button>}
      </>}>
      <Stepper steps={STEPS} current={step} className="mb-5" />

      {step === 0 && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Guest name" required><Input value={guest.name} onChange={(e) => g('name', e.target.value)} /></Field>
            <Field label="Mobile"><Input value={guest.phone} onChange={(e) => g('phone', e.target.value)} /></Field>
            <Field label="Email"><Input value={guest.email} onChange={(e) => g('email', e.target.value)} /></Field>
            <Field label="Nationality"><Input value={guest.nationality} onChange={(e) => g('nationality', e.target.value)} /></Field>
            <Field label="Address" required className="sm:col-span-2"><Input value={guest.address} onChange={(e) => g('address', e.target.value)} placeholder="As per ID proof" /></Field>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <SectionTitle><span className="inline-flex items-center gap-1.5"><IdCard className="size-3.5" />Identity proof (KYC)</span></SectionTitle>
              <Button size="sm" icon={<ScanLine className="size-3.5" />} onClick={scanId}>Scan ID</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="ID type"><Select value={guest.idType} onChange={(e) => g('idType', e.target.value as IdType)}>{ID_TYPES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
              <Field label="ID number" required><Input value={guest.idNo} onChange={(e) => g('idNo', e.target.value)} /></Field>
              {foreign && <Field label="Visa number" required><Input value={guest.visaNo ?? ''} onChange={(e) => g('visaNo', e.target.value)} /></Field>}
            </div>
            {foreign && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />Foreign national: passport + visa are mandatory and a Form C must be filed with FRRO within 24 hours of arrival.
              </p>
            )}
          </div>
          {(guest.company || guest.gstin) && (
            <p className="text-[12px] text-slate-500">Bill-to company: <b className="text-slate-700">{guest.company}</b>{guest.gstin && <> · GSTIN {guest.gstin}</>}</p>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] text-slate-600">Only clean rooms free until {fmtDateShort(departure)} can be assigned.</p>
            <label className="flex items-center gap-2 text-[12.5px] text-slate-600"><Toggle size="sm" checked={upgrades} onChange={setUpgrades} />Show upgrades</label>
          </div>
          {candidateTypes.map((ct) => {
            const list = roomOptions.filter((x) => x.typeId === ct.id)
            return (
              <div key={ct.id}>
                <div className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-slate-600">
                  <span className="size-2 rounded-full" style={{ background: ct.color }} />{ct.name}
                  {ct.id !== r.typeId && <Badge tone="violet">Free upgrade · rate stays {inr(r.roomRate)}</Badge>}
                </div>
                {list.length === 0 ? <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-[12px] text-slate-400">No free rooms of this type.</p> : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {list.map((x) => {
                      const dirty = x.hk === 'Dirty'
                      return (
                        <button key={x.id} disabled={dirty} onClick={() => setRoomId(x.id)} title={dirty ? 'Housekeeping pending' : `${x.view} view`}
                          className={cn('rounded-xl border p-2 text-left transition disabled:cursor-not-allowed', roomId === x.id ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : dirty ? 'border-amber-200 bg-amber-50/60 opacity-60' : 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-400')}>
                          <div className="text-[15px] font-bold text-slate-900">{x.no}</div>
                          <div className="text-[10.5px] text-slate-500">{dirty ? 'Dirty' : `${x.view}${x.smoking ? ' · smoking' : ''}`}</div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-[12.5px]">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-900"><BedDouble className="size-4 text-slate-400" />Room {room?.no} · {types.find((x) => x.id === room?.typeId)?.name}</div>
            <Line k="Plan" v={plans.find((p) => p.id === r.planId)?.name ?? '—'} />
            <Line k="Room rate / night" v={inr(r.roomRate)} />
            {r.mealRate > 0 && <Line k="Meal plan / night" v={inr(r.mealRate)} />}
            <Line k={`Estimated stay (${est.nights}N, incl. GST)`} v={inr(est.total)} />
            <Line k="Already paid / prepaid" v={inr(paid)} />
            <div className="flex justify-between border-t border-slate-200 pt-2 text-[13.5px] font-semibold text-slate-900"><span>Expected balance</span><span className="tabular">{inr(Math.max(0, est.total - paid - deposit))}</span></div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Security deposit" hint={r.source === 'Corporate' ? 'Corporate – bill to company' : 'Card pre-auth or cash'}><Input type="number" min={0} value={deposit || ''} onChange={(e) => setDeposit(Math.max(0, Number(e.target.value) || 0))} placeholder="₹0" /></Field>
              <Field label="Mode"><Select value={mode} onChange={(e) => setMode(e.target.value as FolioPayMode)}>{PAY_MODES.filter((m) => m !== 'Bill to Company').map((m) => <option key={m}>{m}</option>)}</Select></Field>
            </div>
            <Opt icon={<Sun />} label={`Early check-in fee (${inr(config.earlyCheckInFee)})`} sub={`Standard check-in is ${config.checkInTime}`} checked={early} onChange={setEarly} />
            <Opt icon={<KeyRound />} label="Encode 2 key cards" sub="Door lock interface (simulated)" checked={keys} onChange={setKeys} />
            <Opt icon={<MessageCircle />} label="WhatsApp welcome" sub="Wi-Fi details + in-room dining link" checked={whatsapp} onChange={setWhatsapp} />
          </div>
        </div>
      )}
    </Modal>
  )
}

const Line = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between text-slate-600"><span>{k}</span><span className="font-medium text-slate-800 tabular">{v}</span></div>
const Opt = ({ icon, label, sub, checked, onChange }: { icon: React.ReactNode; label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
    <span className="text-slate-400 [&>svg]:size-4">{icon}</span>
    <div className="min-w-0 flex-1"><p className="text-[12.5px] font-medium text-slate-800">{label}</p><p className="text-[11px] text-slate-500">{sub}</p></div>
    <Toggle size="sm" checked={checked} onChange={onChange} />
  </div>
)
