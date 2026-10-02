import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Download, Eye, LogIn, Pencil, ShieldCheck, UserCog, UserPlus } from 'lucide-react'
import {
  Avatar, Badge, Button, Card, DataTable, Dropdown, FilterBar, IconButton, MenuItemBtn, PageHeader, SearchInput, Select, StatusBadge, Toggle, type Column,
} from '@/components/ui'
import { useStore } from '@/store/useStore'
import { usePermission, useCurrentUser } from '@/store/hooks'
import { toast } from '@/store/toast'
import { cn } from '@/lib/format'
import type { User } from '@/types'
import { RoleBadge } from './shared'
import { AccessDrawer, UserFormModal } from './UserDialogs'
import { MoreHorizontal } from 'lucide-react'

export default function Users() {
  const users = useStore((s) => s.users)
  const roles = useStore((s) => s.roles)
  const outlets = useStore((s) => s.outlets)
  const upsertUser = useStore((s) => s.upsertUser)
  const setUser = useStore((s) => s.setUser)
  const log = useStore((s) => s.log)
  const me = useCurrentUser()
  const { can } = usePermission()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [params] = useSearchParams()
  const [role, setRole] = useState(params.get('role') ?? 'all')
  useEffect(() => { const r = params.get('role'); if (r) setRole(r) }, [params])
  const [outlet, setOutlet] = useState('all')
  const [status, setStatus] = useState('all')
  const [edit, setEdit] = useState<User | null | undefined>(undefined)
  const [access, setAccess] = useState<User | null>(null)

  const rows = useMemo(() => users.filter((u) =>
    (role === 'all' || u.roleId === role) && (outlet === 'all' || u.outletIds.includes(outlet)) && (status === 'all' || u.status === status) &&
    (!q || (u.name + u.email + u.phone).toLowerCase().includes(q.toLowerCase())),
  ), [users, role, outlet, status, q])

  const roleOf = (u: User) => roles.find((r) => r.id === u.roleId)
  const canEdit = can('users', 'edit')

  const toggleStatus = (u: User, v: boolean) => {
    if (u.id === me.id) return toast.error('You cannot deactivate your own account')
    upsertUser({ ...u, status: v ? 'Active' : 'Inactive' })
    log(`${v ? 'Activated' : 'Deactivated'} user ${u.name}`, 'users', v ? 'success' : 'warning')
    toast.success(v ? 'User activated' : 'User deactivated', u.name)
  }
  const signInAs = (u: User) => {
    if (u.status !== 'Active') return toast.error('User is inactive', 'Activate the account first')
    setUser(u.id); nav('/'); toast.info(`Signed in as ${u.name}`, `${roleOf(u)?.name} view (demo)`)
  }

  const columns: Column<User>[] = [
    {
      key: 'name', header: 'User', sortValue: (u) => u.name,
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={u.name} color={u.color} size={30} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-medium text-slate-900">{u.name}{u.id === me.id && <Badge tone="teal">You</Badge>}</p>
            <p className="truncate text-[11.5px] text-slate-500">{u.phone}</p>
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Email', render: (u) => <span className="text-slate-600">{u.email}</span> },
    { key: 'role', header: 'Role', sortValue: (u) => roleOf(u)?.name ?? '', render: (u) => <RoleBadge role={roleOf(u)} /> },
    {
      key: 'outlets', header: 'Outlets', sortValue: (u) => u.outletIds.length,
      render: (u) => u.outletIds.length === outlets.length ? <Badge tone="navy">All outlets</Badge> : (
        <div className="flex flex-wrap gap-1">
          {u.outletIds.map((id) => { const o = outlets.find((x) => x.id === id); return <span key={id} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"><span className="size-1.5 rounded-full" style={{ background: o?.color }} />{o?.short}</span> })}
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (u) => <div className="flex items-center gap-2"><Toggle size="sm" checked={u.status === 'Active'} disabled={!canEdit} onChange={(v) => toggleStatus(u, v)} /><StatusBadge status={u.status} /></div> },
    { key: 'lastActive', header: 'Last active', render: (u) => <span className={cn('text-[12px]', u.lastActive === 'Online' ? 'font-medium text-emerald-600' : 'text-slate-500')}>{u.lastActive === 'Online' && <span className="mr-1 inline-block size-1.5 rounded-full bg-emerald-500" />}{u.lastActive}</span> },
    {
      key: 'actions', header: '', sortable: false, align: 'right',
      render: (u) => (
        <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          <IconButton tooltip="Access summary" onClick={() => setAccess(u)}><Eye className="size-3.5" /></IconButton>
          {canEdit && <IconButton tooltip="Edit user" onClick={() => setEdit(u)}><Pencil className="size-3.5" /></IconButton>}
          <Dropdown width={210} trigger={<IconButton tooltip="More"><MoreHorizontal className="size-3.5" /></IconButton>}>
            <MenuItemBtn icon={<LogIn />} onClick={() => signInAs(u)}>Sign in as user (demo)</MenuItemBtn>
            <MenuItemBtn icon={<ShieldCheck />} onClick={() => nav('/users/roles?role=' + u.roleId)}>Open role permissions</MenuItemBtn>
            <MenuItemBtn icon={<UserCog />} onClick={() => toast.success('Password reset link sent', u.email + ' (simulated)')}>Send password reset</MenuItemBtn>
          </Dropdown>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Users" subtitle="Manage logins, roles and outlet access across the organization" breadcrumbs={[{ label: 'Administration' }, { label: 'Users' }]}
        actions={<>
          <Button icon={<ShieldCheck className="size-3.5" />} onClick={() => nav('/users/roles')}>Roles & permissions</Button>
          <Button icon={<Download className="size-3.5" />} onClick={() => toast.success('User list exported', `${rows.length} users · users.xlsx (simulated)`)}>Export</Button>
          {can('users', 'create') && <Button variant="primary" icon={<UserPlus className="size-3.5" />} onClick={() => setEdit(null)}>Create user</Button>}
        </>} />

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {roles.map((r) => {
          const n = users.filter((u) => u.roleId === r.id).length
          const active = role === r.id
          return (
            <button key={r.id} onClick={() => setRole(active ? 'all' : r.id)}
              className={cn('flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 text-left shadow-card transition', active ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200/80 hover:border-slate-300')}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold" style={{ background: r.color + '18', color: r.color }}>{n}</span>
              <span className="min-w-0"><span className="block truncate text-[12.5px] font-medium text-slate-800">{r.name}</span><span className="block text-[11px] text-slate-500">{r.scope}</span></span>
            </button>
          )
        })}
      </div>

      <Card>
        <FilterBar>
          <SearchInput className="w-full sm:w-64" placeholder="Search name, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} />
          <Select className="w-44" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">All roles</option>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
          <Select className="w-40" value={outlet} onChange={(e) => setOutlet(e.target.value)}>
            <option value="all">All outlets</option>{outlets.map((o) => <option key={o.id} value={o.id}>{o.short}</option>)}
          </Select>
          <Select className="w-32" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Any status</option><option>Active</option><option>Inactive</option>
          </Select>
          <span className="ml-auto text-[12px] text-slate-500">{rows.length} of {users.length} users</span>
        </FilterBar>
        <DataTable columns={columns} rows={rows} onRowClick={setAccess} />
      </Card>

      <UserFormModal open={edit !== undefined} onClose={() => setEdit(undefined)} user={edit} />
      <AccessDrawer user={access} onClose={() => setAccess(null)} />
    </div>
  )
}
