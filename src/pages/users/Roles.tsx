import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ChevronDown, Copy, Eye, Lock, Plus, RotateCcw, Save, ShieldCheck, ShieldOff, Users as UsersIcon } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Checkbox, DynIcon, Field, Input, Modal, PageHeader, Progress, Select, Textarea } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { usePermission } from '@/store/hooks'
import { toast } from '@/store/toast'
import { cn, uid } from '@/lib/format'
import { ACTIONS, MODULES } from '@/data/people'
import type { Action, ModuleKey, Role } from '@/types'
import { ACTION_LABEL, MODULE_GROUPS, SCOPE_TONE, TOTAL_PERMS, clonePerms, countPerms, navFor, permsEqual, type Perms } from './shared'

export default function Roles() {
  const roles = useStore((s) => s.roles)
  const users = useStore((s) => s.users)
  const setRolePermissions = useStore((s) => s.setRolePermissions)
  const setUser = useStore((s) => s.setUser)
  const { can } = usePermission()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [selId, setSelId] = useState(params.get('role') ?? 'r_cashier')
  const role = roles.find((r) => r.id === selId) ?? roles[0]
  const [draft, setDraft] = useState<Perms>(() => clonePerms(role.permissions))
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null)

  useEffect(() => { setDraft(clonePerms(role.permissions)) }, [role.id]) // eslint-disable-line
  useEffect(() => { const r = params.get('role'); if (r && r !== selId && roles.some((x) => x.id === r)) setSelId(r) }, [params]) // eslint-disable-line
  const locked = role.id === 'r_owner'
  const editable = can('users', 'edit') && !locked
  const dirty = !permsEqual(draft, role.permissions)

  const pick = (id: string) => {
    if (id === role.id) return
    if (dirty) return setPendingSwitch(id)
    setSelId(id); setParams({ role: id }, { replace: true })
  }

  /* -------- matrix helpers -------- */
  const has = (m: ModuleKey, a: Action) => !!draft[m]?.includes(a)
  const setCell = (m: ModuleKey, a: Action, v: boolean) => setDraft((d) => {
    const cur = new Set(d[m] ?? [])
    if (v) { cur.add(a); if (a !== 'view') cur.add('view') } else { cur.delete(a); if (a === 'view') cur.clear() }
    return { ...d, [m]: ACTIONS.filter((x) => cur.has(x)) }
  })
  const setMany = (mods: ModuleKey[], acts: Action[], v: boolean) => setDraft((d) => {
    const n = { ...d }
    mods.forEach((m) => {
      const cur = new Set(n[m] ?? [])
      acts.forEach((a) => (v ? cur.add(a) : cur.delete(a)))
      if (v && cur.size) cur.add('view')
      if (!v && acts.includes('view')) cur.clear()
      n[m] = ACTIONS.filter((x) => cur.has(x))
    })
    return n
  })
  const stateOf = (mods: ModuleKey[], acts: Action[]) => {
    const total = mods.length * acts.length
    const on = mods.reduce((s, m) => s + acts.filter((a) => has(m, a)).length, 0)
    return { checked: on === total && total > 0, indeterminate: on > 0 && on < total }
  }
  const allKeys = MODULES.map((m) => m.key)

  const save = () => {
    const clean = Object.fromEntries(Object.entries(draft).filter(([, v]) => v && v.length)) as Perms
    setRolePermissions(role.id, clean)
    toast.success('Permissions saved', `${role.name} · changes apply immediately to ${users.filter((u) => u.roleId === role.id).length} users`)
  }
  const previewUser = users.find((u) => u.roleId === role.id && u.status === 'Active')
  const preview = () => {
    if (!previewUser) return toast.warning('No active user with this role', 'Assign the role to a user first')
    if (dirty) save()
    setUser(previewUser.id); nav('/')
    toast.info(`Previewing as ${previewUser.name}`, `${role.name} interface · use the user switcher to return`)
  }

  const sidebar = navFor(draft)
  const accessible = MODULES.filter((m) => draft[m.key]?.includes('view'))
  const restricted = MODULES.filter((m) => !draft[m.key]?.includes('view'))

  return (
    <div className="pb-14">
      <PageHeader title="Roles & Permissions" subtitle="Define what each role can see and do — changes reflect instantly in the sidebar, POS and mobile app"
        breadcrumbs={[{ label: 'Administration' }, { label: 'Users', to: '/users' }, { label: 'Roles & Permissions' }]}
        actions={<>
          <Button icon={<UsersIcon className="size-3.5" />} onClick={() => nav('/users')}>Users</Button>
          {can('users', 'create') && <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={() => setCreateOpen(true)}>Create custom role</Button>}
        </>} />

      <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_280px]">
        {/* ---------------- Role list ---------------- */}
        <Card className="h-fit overflow-hidden">
          <CardHeader title="Roles" subtitle={`${roles.length} roles`} icon={<ShieldCheck className="size-3.5" />} />
          <div className="max-h-[70vh] overflow-y-auto p-1.5">
            {roles.map((r) => {
              const n = users.filter((u) => u.roleId === r.id).length
              return (
                <button key={r.id} onClick={() => pick(r.id)}
                  className={cn('mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition', r.id === role.id ? 'bg-navy-50 ring-1 ring-navy-100' : 'hover:bg-slate-50')}>
                  <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: r.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 truncate text-[12.5px] font-medium text-slate-800">{r.name}{r.id === 'r_owner' && <Lock className="size-3 text-slate-400" />}</span>
                    <span className="mt-0.5 flex items-center gap-1.5"><Badge tone={SCOPE_TONE[r.scope]} className="!px-1 !py-0 !text-[10px]">{r.scope}</Badge>{!r.system && <Badge tone="violet" className="!px-1 !py-0 !text-[10px]">Custom</Badge>}</span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-500"><UsersIcon className="size-3" />{n}</span>
                </button>
              )
            })}
          </div>
          {can('users', 'create') && (
            <div className="border-t border-slate-100 p-2">
              <Button block variant="ghost" size="sm" icon={<Plus className="size-3.5" />} onClick={() => setCreateOpen(true)}>Create custom role</Button>
            </div>
          )}
        </Card>

        {/* ---------------- Matrix ---------------- */}
        <Card className="min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: role.color }} />
                <h3 className="text-[14px] font-semibold text-slate-900">{role.name}</h3>
                <Badge tone={SCOPE_TONE[role.scope]}>{role.scope} scope</Badge>
              </div>
              <p className="mt-0.5 text-[12px] text-slate-500">{role.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" disabled={!editable} onClick={() => setMany(allKeys, ACTIONS, true)}>Select all</Button>
              <Button size="sm" disabled={!editable} onClick={() => setMany(allKeys, ACTIONS, false)}>Clear all</Button>
              <Button size="sm" disabled={!editable || !dirty} icon={<RotateCcw className="size-3" />} onClick={() => setDraft(clonePerms(role.permissions))}>Reset</Button>
              <Button size="sm" variant="primary" disabled={!editable || !dirty} icon={<Save className="size-3" />} onClick={save}>Save changes</Button>
            </div>
          </div>
          {locked && (
            <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-[12px] text-amber-800">
              <Lock className="size-3.5" />The Organization Owner role always has full access and cannot be modified.
            </div>
          )}
          {!locked && !can('users', 'edit') && (
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[12px] text-slate-600">
              <Eye className="size-3.5" />Read-only — your role does not allow editing permissions.
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[12.5px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Module</th>
                  {ACTIONS.map((a) => {
                    const st = stateOf(allKeys, [a])
                    return (
                      <th key={a} className="px-1 py-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{ACTION_LABEL[a]}</span>
                          <Checkbox checked={st.checked} indeterminate={st.indeterminate} disabled={!editable} onChange={(v) => setMany(allKeys, [a], v)} />
                        </div>
                      </th>
                    )
                  })}
                  <th className="px-2 py-2 text-center text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">All</th>
                </tr>
              </thead>
              <tbody>
                {MODULE_GROUPS.map((g) => {
                  const keys = g.modules.map((m) => m.key)
                  const gs = stateOf(keys, ACTIONS)
                  const isClosed = closed[g.group]
                  const on = keys.filter((k) => draft[k]?.includes('view')).length
                  return (
                    <Fragment key={g.group}>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <td colSpan={ACTIONS.length + 1} className="px-3 py-1.5">
                          <button onClick={() => setClosed((c) => ({ ...c, [g.group]: !c[g.group] }))} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-700">
                            <ChevronDown className={cn('size-3.5 transition', isClosed && '-rotate-90')} />{g.group}
                            <span className="font-normal text-slate-400">· {on}/{keys.length} modules</span>
                          </button>
                        </td>
                        <td className="text-center"><Checkbox checked={gs.checked} indeterminate={gs.indeterminate} disabled={!editable} onChange={(v) => setMany(keys, ACTIONS, v)} /></td>
                      </tr>
                      {!isClosed && g.modules.map((m) => {
                        const rs = stateOf([m.key], ACTIONS)
                        const changed = [...(draft[m.key] ?? [])].sort().join() !== [...(role.permissions[m.key] ?? [])].sort().join()
                        return (
                          <tr key={m.key} className={cn('border-b border-slate-100 hover:bg-slate-50/50', changed && 'bg-amber-50/50')}>
                            <td className="px-3 py-2 pl-8">
                              <span className={cn('font-medium', has(m.key, 'view') ? 'text-slate-800' : 'text-slate-400')}>{m.label}</span>
                              {changed && <span className="ml-1.5 text-[10.5px] font-medium text-amber-600">modified</span>}
                            </td>
                            {ACTIONS.map((a) => (
                              <td key={a} className="text-center"><Checkbox checked={has(m.key, a)} disabled={!editable} onChange={(v) => setCell(m.key, a, v)} /></td>
                            ))}
                            <td className="text-center"><Checkbox checked={rs.checked} indeterminate={rs.indeterminate} disabled={!editable} onChange={(v) => setMany([m.key], ACTIONS, v)} /></td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ---------------- Access summary ---------------- */}
        <div className="space-y-4 lg:col-span-2 xl:col-span-1">
          <Card>
            <CardHeader title="Access summary" subtitle="Live preview of this role" />
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-[11px] text-slate-500">Modules</p><p className="text-[17px] font-semibold text-slate-900">{accessible.length}<span className="text-[12px] font-normal text-slate-400">/{MODULES.length}</span></p></div>
                <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-[11px] text-slate-500">Permissions</p><p className="text-[17px] font-semibold text-slate-900">{countPerms(draft)}<span className="text-[12px] font-normal text-slate-400">/{TOTAL_PERMS}</span></p></div>
              </div>
              <Progress className="mt-3" value={(countPerms(draft) / TOTAL_PERMS) * 100} />
              <Button block className="mt-3" variant="accent" icon={<Eye className="size-3.5" />} onClick={preview}>
                {previewUser ? `Preview as ${previewUser.name.split(' ')[0]}` : 'Preview as user'}
              </Button>
            </div>
          </Card>
          <Card>
            <CardHeader title="Sidebar preview" subtitle="What users with this role will see" />
            <div className="m-3 rounded-xl bg-navy-900 p-2 text-navy-100">
              {sidebar.length === 0 && <p className="p-3 text-center text-[12px] text-navy-300">No modules accessible</p>}
              {sidebar.map((g) => (
                <div key={g.label} className="mb-1.5">
                  <p className="px-2 pb-0.5 pt-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-navy-300/70">{g.label}</p>
                  {g.items.map((i) => (
                    <div key={i.to} className="flex h-6.5 items-center gap-2 rounded-md px-2 py-1 text-[11.5px] text-navy-100/90">
                      <DynIcon name={i.icon} className="size-3.5 text-navy-300" />{i.label}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Card>
          {restricted.length > 0 && (
            <Card>
              <CardHeader title="Restricted modules" subtitle={`${restricted.length} hidden from this role`} icon={<ShieldOff className="size-3.5" />} />
              <div className="flex flex-wrap gap-1.5 p-3">
                {restricted.map((m) => <Badge key={m.key} tone="gray">{m.label}</Badge>)}
              </div>
            </Card>
          )}
        </div>
      </div>

      {dirty && editable && (
        <div className="fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-xl bg-navy-900 py-2 pl-4 pr-2 text-white shadow-pop animate-slide-up">
          <AlertTriangle className="size-4 text-amber-300" />
          <span className="text-[12.5px]">Unsaved changes to <b>{role.name}</b></span>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setDraft(clonePerms(role.permissions))}>Discard</Button>
          <Button size="sm" variant="accent" icon={<Save className="size-3" />} onClick={save}>Save changes</Button>
        </div>
      )}

      <CreateRoleModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => { setSelId(id); setParams({ role: id }, { replace: true }) }} />

      <Modal open={!!pendingSwitch} onClose={() => setPendingSwitch(null)} size="sm" title="Unsaved changes" icon={<AlertTriangle />}
        footer={<>
          <Button onClick={() => setPendingSwitch(null)}>Stay</Button>
          <Button variant="danger" onClick={() => { const id = pendingSwitch!; setPendingSwitch(null); setDraft(clonePerms(role.permissions)); setSelId(id); setParams({ role: id }, { replace: true }) }}>Discard & switch</Button>
          <Button variant="primary" onClick={() => { save(); const id = pendingSwitch!; setPendingSwitch(null); setSelId(id); setParams({ role: id }, { replace: true }) }}>Save & switch</Button>
        </>}>
        <p className="text-[13px] text-slate-600">You have unsaved permission changes for <b>{role.name}</b>.</p>
      </Modal>
    </div>
  )
}

const ROLE_COLORS = ['#4f46e5', '#0891b2', '#db2777', '#65a30d', '#b45309', '#7c3aed', '#14a891', '#dc2626']

function CreateRoleModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const roles = useStore((s) => s.roles)
  const upsertRole = useStore((s) => s.upsertRole)
  const log = useStore((s) => s.log)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [scope, setScope] = useState<Role['scope']>('Outlet')
  const [copy, setCopy] = useState('r_cashier')
  const [color, setColor] = useState(ROLE_COLORS[0])
  useEffect(() => { if (open) { setName(''); setDesc(''); setScope('Outlet'); setCopy('r_cashier') } }, [open])
  const src = useMemo(() => roles.find((r) => r.id === copy), [roles, copy])

  const create = () => {
    if (!name.trim()) return toast.error('Role name is required')
    const r: Role = { id: uid('r'), name: name.trim(), description: desc || 'Custom role', scope, color, permissions: src ? clonePerms(src.permissions) : { dashboard: ['view'] } }
    upsertRole(r)
    log(`Created custom role ${r.name}${src ? ' (copied from ' + src.name + ')' : ''}`, 'users', 'success')
    toast.success('Role created', r.name)
    onCreated(r.id)
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Create custom role" subtitle="Start from scratch or copy an existing role's permissions" icon={<Plus />}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={create}>Create role</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Role name" required className="sm:col-span-2"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Night Shift Lead" autoFocus /></Field>
        <Field label="Description" className="sm:col-span-2"><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What this role is for" /></Field>
        <Field label="Scope">
          <Select value={scope} onChange={(e) => setScope(e.target.value as Role['scope'])}><option>Organization</option><option>Region</option><option>Outlet</option></Select>
        </Field>
        <Field label="Copy permissions from" hint={src ? `${countPerms(src.permissions)} permissions will be copied` : 'Starts with dashboard view only'}>
          <Select value={copy} onChange={(e) => setCopy(e.target.value)}>
            <option value="">— Blank role —</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </Field>
        <Field label="Colour" className="sm:col-span-2">
          <div className="flex gap-2">
            {ROLE_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={cn('size-7 rounded-lg transition', color === c && 'ring-2 ring-offset-2')} style={{ background: c, ['--tw-ring-color' as string]: c }} />
            ))}
          </div>
        </Field>
      </div>
      {src && <p className="mt-3 flex items-center gap-1.5 text-[12px] text-slate-500"><Copy className="size-3.5" />Copying from <b className="text-slate-700">{src.name}</b>. You can fine-tune the matrix after creating.</p>}
    </Modal>
  )
}
