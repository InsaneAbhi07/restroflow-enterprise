import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { Card, DynIcon, PageHeader } from '@/components/ui'
import { usePermission } from '@/store/hooks'
import { useShortcut } from '@/lib/shortcuts'
import { toast } from '@/store/toast'
import { cn } from '@/lib/format'
import { PrinterSection } from './PrinterSection'
import {
  AttendanceSection, BrandingSection, GstSection, NotificationsSection, OrgSection, OutletSection, PayrollSection, PermissionsLinkSection, PosSection,
  QrSection, RolesLinkSection, ShiftsSection, TablesSection,
} from './sections'

const SECTIONS = [
  { id: 'org', label: 'Organization profile', icon: 'Building2', group: 'Business' },
  { id: 'outlets', label: 'Outlet configuration', icon: 'Store', group: 'Business' },
  { id: 'branding', label: 'Restaurant branding', icon: 'Palette', group: 'Business' },
  { id: 'gst', label: 'GST & billing', icon: 'Receipt', group: 'Billing' },
  { id: 'pos', label: 'POS configuration', icon: 'MonitorSmartphone', group: 'Billing' },
  { id: 'printers', label: 'Printer settings', icon: 'Printer', group: 'Billing' },
  { id: 'tables', label: 'Table management', icon: 'LayoutGrid', group: 'Billing' },
  { id: 'qr', label: 'QR ordering', icon: 'QrCode', group: 'Billing' },
  { id: 'shifts', label: 'Staff shifts', icon: 'Clock', group: 'People' },
  { id: 'attendance', label: 'Attendance policies', icon: 'CalendarCheck', group: 'People' },
  { id: 'payroll', label: 'Payroll configuration', icon: 'BadgeIndianRupee', group: 'People' },
  { id: 'roles', label: 'User roles', icon: 'UserCog', group: 'Access' },
  { id: 'permissions', label: 'Permission management', icon: 'ShieldCheck', group: 'Access' },
  { id: 'notifications', label: 'Notifications', icon: 'Bell', group: 'Access' },
] as const
type SectionId = (typeof SECTIONS)[number]['id']

export default function Settings() {
  const { can } = usePermission()
  const ro = !can('settings', 'edit')
  const [params, setParams] = useSearchParams()
  const initial = (SECTIONS.find((s) => s.id === params.get('s'))?.id ?? 'org') as SectionId
  const [sec, setSec] = useState<SectionId>(initial)
  const go = (id: SectionId) => { setSec(id); setParams({ s: id }, { replace: true }) }
  useShortcut('save', () => (ro ? toast.error('Read-only', 'You do not have permission to edit settings') : toast.success('Settings saved')), true)
  const groups = Array.from(new Set(SECTIONS.map((s) => s.group)))

  const body = (() => {
    switch (sec) {
      case 'org': return <OrgSection ro={ro} />
      case 'outlets': return <OutletSection ro={ro} />
      case 'branding': return <BrandingSection ro={ro} />
      case 'gst': return <GstSection ro={ro} />
      case 'pos': return <PosSection ro={ro} />
      case 'printers': return <PrinterSection ro={ro} />
      case 'tables': return <TablesSection ro={ro} />
      case 'qr': return <QrSection ro={ro} />
      case 'shifts': return <ShiftsSection ro={ro} />
      case 'attendance': return <AttendanceSection ro={ro} />
      case 'payroll': return <PayrollSection ro={ro} />
      case 'roles': return <RolesLinkSection />
      case 'permissions': return <PermissionsLinkSection />
      case 'notifications': return <NotificationsSection ro={ro} />
    }
  })()

  return (
    <div>
      <PageHeader title="Settings" subtitle="Organization-wide configuration for billing, printing, people and access" breadcrumbs={[{ label: 'Administration' }, { label: 'Settings' }]} />
      {ro && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
          <Eye className="size-3.5" />Read-only — your role can view settings but not change them.
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <Card className="h-fit p-1.5 md:sticky md:top-0">
          {groups.map((g) => (
            <div key={g} className="mb-1">
              <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{g}</p>
              {SECTIONS.filter((s) => s.group === g).map((s) => (
                <button key={s.id} onClick={() => go(s.id)}
                  className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] font-medium transition', sec === s.id ? 'bg-navy-50 text-navy-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')}>
                  <DynIcon name={s.icon} className={cn('size-3.5', sec === s.id ? 'text-brand-600' : 'text-slate-400')} />{s.label}
                </button>
              ))}
            </div>
          ))}
        </Card>
        <div key={sec} className="min-w-0 animate-fade-in">{body}</div>
      </div>
    </div>
  )
}
