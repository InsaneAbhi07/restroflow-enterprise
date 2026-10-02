import React from 'react'
import { Save } from 'lucide-react'
import { Button, Card, CardHeader } from '@/components/ui'
import { cn } from '@/lib/format'
import { toast } from '@/store/toast'
import { useStore } from '@/store/useStore'

export interface SectionProps { ro: boolean }

/** A settings form card with a Save footer */
export function SettingsCard({ title, subtitle, icon, children, onSave, ro, actions, className, saveLabel = 'Save changes' }: {
  title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode; onSave?: () => void; ro?: boolean; actions?: React.ReactNode; className?: string; saveLabel?: string
}) {
  const log = useStore((s) => s.log)
  const save = () => {
    onSave?.()
    log(`Updated settings · ${title}`, 'settings', 'info')
    toast.success('Settings saved', title)
  }
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader title={title} subtitle={subtitle} icon={icon} actions={actions} />
      <div className="px-4 py-2">{children}</div>
      {!ro && (
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
          <Button size="sm" variant="primary" icon={<Save className="size-3" />} onClick={save}>{saveLabel}</Button>
        </div>
      )}
    </Card>
  )
}

/** Label/description on the left, control on the right */
export function Row({ label, desc, children, className }: { label: React.ReactNode; desc?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0', className)}>
      <div className="min-w-0 max-w-md">
        <p className="text-[13px] font-medium text-slate-800">{label}</p>
        {desc && <p className="text-[11.5px] text-slate-500">{desc}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}

/** Hook: bind a nested settings group to the store */
export function useSettingsGroup<K extends 'printer' | 'pos' | 'attendance' | 'payroll' | 'qr' | 'notifications'>(key: K) {
  const value = useStore((s) => s.settings[key])
  const update = useStore((s) => s.updateSettings)
  const set = (patch: Partial<typeof value>) => update({ [key]: { ...value, ...patch } } as never)
  return [value, set] as const
}
