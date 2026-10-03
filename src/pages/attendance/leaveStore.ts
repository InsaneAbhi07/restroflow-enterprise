import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useStore } from '@/store/useStore'
import { isoDate, uid } from '@/lib/format'
import type { Tone } from '@/components/ui'

export interface LeaveType {
  id: string
  code: string
  name: string
  tone: Tone
  /** days credited per year (0 = earned on the go, e.g. comp-off) */
  annual: number
  paid: boolean
  carryForward: boolean
  maxCarry: number
  halfDay: boolean
  /** supporting document needed when leave is longer than N days (0 = never) */
  docAfterDays: number
  /** apply at least N days in advance (0 = same day allowed) */
  noticeDays: number
  /** max consecutive days per request (0 = no limit) */
  maxConsecutive: number
  gender: 'All' | 'F' | 'M'
  encashable: boolean
  active: boolean
  description: string
}

export type LeaveSession = 'Full Day' | 'First Half' | 'Second Half'
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
export interface LeaveRequest {
  id: string
  employeeId: string
  typeId: string
  from: string
  to: string
  session: LeaveSession
  days: number
  reason: string
  contact?: string
  docName?: string
  status: LeaveStatus
  appliedAt: number
  decidedBy?: string
  decidedAt?: number
  remark?: string
  source: 'Web' | 'Staff App'
}

const SEED_TYPES: LeaveType[] = [
  { id: 'lt_cl', code: 'CL', name: 'Casual Leave', tone: 'teal', annual: 12, paid: true, carryForward: false, maxCarry: 0, halfDay: true, docAfterDays: 0, noticeDays: 1, maxConsecutive: 3, gender: 'All', encashable: false, active: true, description: 'Personal work, short planned absences.' },
  { id: 'lt_sl', code: 'SL', name: 'Sick Leave', tone: 'red', annual: 10, paid: true, carryForward: true, maxCarry: 20, halfDay: true, docAfterDays: 2, noticeDays: 0, maxConsecutive: 0, gender: 'All', encashable: false, active: true, description: 'Illness or medical appointments. Medical certificate after 2 days.' },
  { id: 'lt_el', code: 'EL', name: 'Earned / Privilege Leave', tone: 'blue', annual: 18, paid: true, carryForward: true, maxCarry: 45, halfDay: false, docAfterDays: 0, noticeDays: 7, maxConsecutive: 15, gender: 'All', encashable: true, active: true, description: 'Vacation leave accrued monthly (1.5 days / month). Encashable at exit.' },
  { id: 'lt_co', code: 'CO', name: 'Compensatory Off', tone: 'amber', annual: 0, paid: true, carryForward: false, maxCarry: 0, halfDay: true, docAfterDays: 0, noticeDays: 1, maxConsecutive: 2, gender: 'All', encashable: false, active: true, description: 'Credited for working on a weekly off or festival. Use within 60 days.' },
  { id: 'lt_ml', code: 'ML', name: 'Maternity Leave', tone: 'pink', annual: 182, paid: true, carryForward: false, maxCarry: 0, halfDay: false, docAfterDays: 1, noticeDays: 30, maxConsecutive: 0, gender: 'F', encashable: false, active: true, description: '26 weeks as per Maternity Benefit Act.' },
  { id: 'lt_pl', code: 'PT', name: 'Paternity Leave', tone: 'violet', annual: 5, paid: true, carryForward: false, maxCarry: 0, halfDay: false, docAfterDays: 0, noticeDays: 7, maxConsecutive: 5, gender: 'M', encashable: false, active: true, description: 'Within 3 months of child birth.' },
  { id: 'lt_lwp', code: 'LWP', name: 'Leave Without Pay', tone: 'gray', annual: 0, paid: false, carryForward: false, maxCarry: 0, halfDay: true, docAfterDays: 0, noticeDays: 0, maxConsecutive: 0, gender: 'All', encashable: false, active: true, description: 'Unpaid leave when balance is exhausted. Deducted in payroll.' },
]

const d = (offset: number) => isoDate(new Date(Date.now() + offset * 864e5))
const SEED_REQUESTS: LeaveRequest[] = [
  { id: 'lr1', employeeId: 'e16', typeId: 'lt_cl', from: d(3), to: d(5), session: 'Full Day', days: 3, reason: 'Sister’s wedding in Jaipur', contact: '+91 98110 33221', status: 'Pending', appliedAt: Date.now() - 3 * 36e5, source: 'Staff App' },
  { id: 'lr2', employeeId: 'e11', typeId: 'lt_sl', from: d(-1), to: d(-1), session: 'Full Day', days: 1, reason: 'Fever and body ache', status: 'Pending', appliedAt: Date.now() - 26 * 36e5, source: 'Staff App' },
  { id: 'lr3', employeeId: 'e7', typeId: 'lt_el', from: d(12), to: d(18), session: 'Full Day', days: 7, reason: 'Family vacation – Kerala', contact: '+91 98100 77777', status: 'Pending', appliedAt: Date.now() - 50 * 36e5, source: 'Web' },
  { id: 'lr4', employeeId: 'e19', typeId: 'lt_cl', from: d(1), to: d(1), session: 'Second Half', days: 0.5, reason: 'Bank work', status: 'Pending', appliedAt: Date.now() - 5 * 36e5, source: 'Staff App' },
  { id: 'lr5', employeeId: 'e4', typeId: 'lt_cl', from: d(-9), to: d(-8), session: 'Full Day', days: 2, reason: 'Personal work', status: 'Approved', appliedAt: Date.now() - 14 * 864e5, decidedBy: 'Amit Verma', decidedAt: Date.now() - 13 * 864e5, source: 'Web' },
  { id: 'lr6', employeeId: 'e13', typeId: 'lt_sl', from: d(-6), to: d(-4), session: 'Full Day', days: 3, reason: 'Viral infection', docName: 'medical_certificate.pdf', status: 'Approved', appliedAt: Date.now() - 6 * 864e5, decidedBy: 'Sanjay Malhotra', decidedAt: Date.now() - 6 * 864e5, source: 'Staff App' },
  { id: 'lr7', employeeId: 'e22', typeId: 'lt_el', from: d(-20), to: d(-16), session: 'Full Day', days: 5, reason: 'Native place visit', status: 'Approved', appliedAt: Date.now() - 35 * 864e5, decidedBy: 'Gurpreet Singh', decidedAt: Date.now() - 33 * 864e5, source: 'Web' },
  { id: 'lr8', employeeId: 'e14', typeId: 'lt_cl', from: d(-3), to: d(-3), session: 'Full Day', days: 1, reason: 'Exam', status: 'Rejected', appliedAt: Date.now() - 4 * 864e5, decidedBy: 'Sanjay Malhotra', decidedAt: Date.now() - 4 * 864e5, remark: 'Weekend rush – please swap shift instead', source: 'Staff App' },
  { id: 'lr9', employeeId: 'e5', typeId: 'lt_co', from: d(-12), to: d(-12), session: 'Full Day', days: 1, reason: 'Comp-off for Dussehra duty', status: 'Approved', appliedAt: Date.now() - 15 * 864e5, decidedBy: 'Amit Verma', decidedAt: Date.now() - 15 * 864e5, source: 'Staff App' },
  { id: 'lr10', employeeId: 'e20', typeId: 'lt_lwp', from: d(-25), to: d(-24), session: 'Full Day', days: 2, reason: 'Extended family emergency', status: 'Approved', appliedAt: Date.now() - 26 * 864e5, decidedBy: 'Pooja Arora', decidedAt: Date.now() - 26 * 864e5, source: 'Web' },
  { id: 'lr11', employeeId: 'e9', typeId: 'lt_cl', from: d(-30), to: d(-30), session: 'First Half', days: 0.5, reason: 'Doctor appointment', status: 'Cancelled', appliedAt: Date.now() - 32 * 864e5, source: 'Web' },
]
/** opening balances carried from last year (EL / SL) */
const SEED_OPENING: Record<string, Record<string, number>> = {
  e3: { lt_el: 12, lt_sl: 6 }, e4: { lt_el: 6 }, e5: { lt_el: 4, lt_co: 2 }, e6: { lt_el: 20, lt_sl: 9 }, e7: { lt_el: 9 },
  e8: { lt_el: 14 }, e12: { lt_el: 10 }, e13: { lt_el: 3 }, e17: { lt_el: 7 }, e21: { lt_el: 5 }, e23: { lt_co: 1 }, e11: { lt_co: 1 },
}

/** inclusive list of ISO dates between from and to */
export function dateRange(from: string, to: string) {
  const out: string[] = []
  const end = new Date(to + 'T00:00:00')
  for (let x = new Date(from + 'T00:00:00'); x <= end; x.setDate(x.getDate() + 1)) out.push(isoDate(x))
  return out
}
export const leaveDays = (from: string, to: string, session: LeaveSession) =>
  !from || !to || to < from ? 0 : session !== 'Full Day' ? 0.5 : dateRange(from, to).length

interface LeaveState {
  types: LeaveType[]
  requests: LeaveRequest[]
  opening: Record<string, Record<string, number>>
  upsertType: (t: LeaveType) => void
  apply: (r: Omit<LeaveRequest, 'id' | 'status' | 'appliedAt'>) => LeaveRequest
  decide: (id: string, status: 'Approved' | 'Rejected', remark?: string) => void
  cancel: (id: string) => void
  reset: () => void
}

const currentUser = () => {
  const s = useStore.getState()
  return s.users.find((u) => u.id === s.currentUserId)?.name ?? 'Manager'
}

/** Approved leave → attendance register (so calendar & payroll pick it up) */
function writeAttendance(r: LeaveRequest, type: LeaveType | undefined) {
  const s = useStore.getState()
  dateRange(r.from, r.to).forEach((date) => {
    const id = `att_${r.employeeId}_${date}`
    const prev = s.attendance.find((a) => a.id === id)
    if (prev && prev.status === 'Weekly Off') return
    s.upsertAttendance({
      ...(prev ?? {}),
      id, employeeId: r.employeeId, date,
      status: r.session !== 'Full Day' ? 'Half Day' : type?.paid === false ? 'Absent' : 'Leave',
      method: 'Manual',
      remarks: `${type?.code ?? 'Leave'}${type?.paid === false ? ' (unpaid)' : ''} · ${r.reason}`,
    })
  })
}
function clearAttendance(r: LeaveRequest) {
  const s = useStore.getState()
  dateRange(r.from, r.to).forEach((date) => {
    const a = s.attendance.find((x) => x.id === `att_${r.employeeId}_${date}`)
    if (a && a.method === 'Manual' && a.remarks?.includes(r.reason) && !a.checkIn) {
      useStore.setState((st) => ({ attendance: st.attendance.filter((x) => x.id !== a.id) }))
    }
  })
}

export const useLeave = create<LeaveState>()(
  persist(
    (set, get) => ({
      types: SEED_TYPES,
      requests: SEED_REQUESTS,
      opening: SEED_OPENING,
      upsertType: (t) => set((s) => ({ types: s.types.some((x) => x.id === t.id) ? s.types.map((x) => (x.id === t.id ? t : x)) : [...s.types, t] })),
      apply: (r) => {
        const req: LeaveRequest = { ...r, id: uid('lr'), status: 'Pending', appliedAt: Date.now() }
        set((s) => ({ requests: [req, ...s.requests] }))
        const st = useStore.getState()
        const emp = st.employees.find((e) => e.id === r.employeeId)
        const type = get().types.find((t) => t.id === r.typeId)
        // surface in dashboard approvals & notifications
        useStore.setState((x) => ({
          approvals: [{ id: 'ap_' + req.id, at: Date.now(), type: 'Leave', title: `${emp?.name} · ${req.days} day${req.days === 1 ? '' : 's'} ${type?.name.toLowerCase()}`, by: emp?.name ?? '-', outletId: emp?.outletId ?? 'o1', status: 'Pending', ref: req.id }, ...x.approvals],
        }))
        st.notify({ title: 'New leave request', body: `${emp?.name} applied for ${req.days} day(s) ${type?.code}`, type: 'approval', link: '/attendance' })
        st.log(`${emp?.name} applied for ${req.days} day(s) ${type?.name}`, 'attendance', 'info', emp?.outletId)
        return req
      },
      decide: (id, status, remark) => {
        const r = get().requests.find((x) => x.id === id)
        if (!r || r.status !== 'Pending') return
        const updated: LeaveRequest = { ...r, status, remark, decidedBy: currentUser(), decidedAt: Date.now() }
        set((s) => ({ requests: s.requests.map((x) => (x.id === id ? updated : x)) }))
        if (status === 'Approved') writeAttendance(updated, get().types.find((t) => t.id === r.typeId))
        const st = useStore.getState()
        useStore.setState((x) => ({ approvals: x.approvals.map((a) => (a.ref === id ? { ...a, status } : a)) }))
        const emp = st.employees.find((e) => e.id === r.employeeId)
        st.log(`${status} leave for ${emp?.name} (${r.from}${r.to !== r.from ? ' → ' + r.to : ''})`, 'attendance', status === 'Approved' ? 'success' : 'danger', emp?.outletId)
      },
      cancel: (id) => {
        const r = get().requests.find((x) => x.id === id)
        if (!r) return
        if (r.status === 'Approved') clearAttendance(r)
        set((s) => ({ requests: s.requests.map((x) => (x.id === id ? { ...x, status: 'Cancelled' } : x)) }))
        useStore.setState((x) => ({ approvals: x.approvals.map((a) => (a.ref === id && a.status === 'Pending' ? { ...a, status: 'Rejected' } : a)) }))
      },
      reset: () => set({ types: SEED_TYPES, requests: SEED_REQUESTS, opening: SEED_OPENING }),
    }),
    { name: 'restroflow-leave-v1' },
  ),
)

// Approving/rejecting a leave from the dashboard "Pending approvals" widget keeps the leave request in sync
useStore.subscribe((s, prev) => {
  if (s.approvals === prev.approvals) return
  for (const a of s.approvals) {
    if (a.type !== 'Leave' || !a.ref || a.status === 'Pending') continue
    const was = prev.approvals.find((p) => p.id === a.id)
    const req = useLeave.getState().requests.find((r) => r.id === a.ref)
    if (was?.status === 'Pending' && req?.status === 'Pending') useLeave.getState().decide(req.id, a.status as 'Approved' | 'Rejected')
  }
  // demo reset wipes approvals back to seed → reset leave data too
  if (s.approvals.length && prev.approvals.length && s.approvals[0].id === 'ap1' && prev.approvals[0].id !== 'ap1') useLeave.getState().reset()
})

/** Balance for one employee & type in the current year */
export function balanceOf(employeeId: string, type: LeaveType, requests: LeaveRequest[], opening: LeaveState['opening']) {
  const year = isoDate().slice(0, 4)
  const mine = requests.filter((r) => r.employeeId === employeeId && r.typeId === type.id && r.from.startsWith(year))
  const used = mine.filter((r) => r.status === 'Approved').reduce((s, r) => s + r.days, 0)
  const pending = mine.filter((r) => r.status === 'Pending').reduce((s, r) => s + r.days, 0)
  const carried = type.carryForward || type.id === 'lt_co' ? opening[employeeId]?.[type.id] ?? 0 : 0
  const quota = type.annual + carried
  const unlimited = !type.paid
  return { quota, carried, used, pending, available: unlimited ? Infinity : Math.max(0, quota - used - pending), unlimited }
}
