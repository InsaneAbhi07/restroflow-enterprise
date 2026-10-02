import type { Action, ModuleKey, Role } from '@/types'
import { MODULES, ACTIONS } from '@/data/people'
import { NAV } from '@/components/layout/nav'

export const ACTION_LABEL: Record<Action, string> = {
  view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', approve: 'Approve', export: 'Export', print: 'Print',
}

export const SCOPE_TONE = { Organization: 'navy', Region: 'blue', Outlet: 'teal' } as const

/** Coloured pill for a role, using the role's own colour */
export function RoleBadge({ role, className }: { role?: Role; className?: string }) {
  if (!role) return <span className="text-slate-400">—</span>
  return (
    <span className={'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium ' + (className ?? '')}
      style={{ background: role.color + '14', color: role.color, boxShadow: `inset 0 0 0 1px ${role.color}33` }}>
      <span className="size-1.5 rounded-full" style={{ background: role.color }} />
      {role.name}
    </span>
  )
}

export type Perms = Partial<Record<ModuleKey, Action[]>>

export const clonePerms = (p: Perms): Perms => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, [...(v ?? [])]])) as Perms

export function permsEqual(a: Perms, b: Perms) {
  return MODULES.every((m) => {
    const x = [...(a[m.key] ?? [])].sort().join(',')
    const y = [...(b[m.key] ?? [])].sort().join(',')
    return x === y
  })
}

export const countPerms = (p: Perms) => MODULES.reduce((s, m) => s + (p[m.key]?.length ?? 0), 0)
export const TOTAL_PERMS = MODULES.length * ACTIONS.length

/** NAV filtered by a permission set (what the sidebar would show) */
export function navFor(p: Perms) {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => p[i.module]?.includes('view')) })).filter((g) => g.items.length)
}

export const MODULE_GROUPS = Array.from(new Set(MODULES.map((m) => m.group))).map((g) => ({ group: g, modules: MODULES.filter((m) => m.group === g) }))
