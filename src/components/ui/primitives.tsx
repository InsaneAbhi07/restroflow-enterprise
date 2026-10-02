import React, { forwardRef, useEffect, useRef, useState } from 'react'
import * as Icons from 'lucide-react'
import { Search, X, ChevronDown, Check } from 'lucide-react'
import { cn, initials } from '@/lib/format'

/* ------------------------------------------------------------------ Button */
type BtnVariant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning'
type BtnSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant; size?: BtnSize; icon?: React.ReactNode; iconRight?: React.ReactNode; kbd?: string; loading?: boolean; block?: boolean
}
const BTN_V: Record<BtnVariant, string> = {
  primary: 'bg-navy-900 text-white hover:bg-navy-800 shadow-sm',
  accent: 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  warning: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
}
const BTN_S: Record<BtnSize, string> = {
  xs: 'h-6 px-2 text-[11px] gap-1 rounded-md',
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  md: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  lg: 'h-10 px-4 text-sm gap-2 rounded-lg',
  xl: 'h-12 px-5 text-[15px] gap-2 rounded-xl',
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'outline', size = 'md', icon, iconRight, kbd, loading, block, className, children, ...rest }, ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap transition-all active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1',
        BTN_V[variant], BTN_S[size], block && 'w-full', className,
      )}
      {...rest}
    >
      {loading ? <Icons.Loader2 className="size-3.5 animate-spin" /> : icon}
      {children}
      {iconRight}
      {kbd && <Kbd className={cn('ml-1', ['primary', 'accent', 'danger', 'success', 'warning'].includes(variant) && 'bg-white/15 border-white/20 text-white/90')}>{kbd}</Kbd>}
    </button>
  )
})

export function IconButton({ className, children, tooltip, active, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tooltip?: string; active?: boolean }) {
  return (
    <button title={tooltip} className={cn('inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800', active && 'bg-slate-100 text-slate-900', className)} {...rest}>
      {children}
    </button>
  )
}

export const Kbd = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <kbd className={cn('inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px] font-medium text-slate-500', className)}>{children}</kbd>
)

/* ------------------------------------------------------------------ Card */
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-slate-200/80 bg-white shadow-card', className)} {...rest}>{children}</div>
}
export function CardHeader({ title, subtitle, actions, icon, className }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">{icon}</div>}
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="truncate text-[11.5px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ Badge */
export type Tone = 'gray' | 'green' | 'red' | 'amber' | 'blue' | 'navy' | 'teal' | 'violet' | 'orange' | 'pink'
const TONES: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-600 ring-slate-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  navy: 'bg-navy-50 text-navy-700 ring-navy-200',
  teal: 'bg-brand-50 text-brand-700 ring-brand-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  pink: 'bg-pink-50 text-pink-700 ring-pink-200',
}
export const DOT: Record<Tone, string> = {
  gray: 'bg-slate-400', green: 'bg-emerald-500', red: 'bg-rose-500', amber: 'bg-amber-500', blue: 'bg-sky-500',
  navy: 'bg-navy-600', teal: 'bg-brand-500', violet: 'bg-violet-500', orange: 'bg-orange-500', pink: 'bg-pink-500',
}
export function Badge({ tone = 'gray', children, dot, className }: { tone?: Tone; children: React.ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap', TONES[tone], className)}>
      {dot && <span className={cn('size-1.5 rounded-full', DOT[tone])} />}
      {children}
    </span>
  )
}
const STATUS_TONE: Record<string, Tone> = {
  Active: 'green', Open: 'green', Online: 'green', Settled: 'green', Received: 'green', Approved: 'green', Paid: 'green', Present: 'green', Available: 'green', Ready: 'green', 'In Stock': 'green', Completed: 'green', Served: 'gray',
  Pending: 'amber', 'Pending Approval': 'amber', Draft: 'gray', Hold: 'amber', Late: 'amber', 'Low Stock': 'amber', Billing: 'amber', Preparing: 'amber', Processed: 'blue', 'Half Day': 'orange', Reserved: 'violet', 'Partially Received': 'blue', 'In Transit': 'blue', Running: 'blue', Occupied: 'blue', New: 'blue', Billed: 'violet', 'On Leave': 'violet', Leave: 'violet', Cleaning: 'gray', 'Weekly Off': 'gray', 'Not Started': 'gray',
  Inactive: 'gray', Closed: 'red', Cancelled: 'red', Rejected: 'red', Absent: 'red', 'Out of Stock': 'red', Returned: 'orange', Maintenance: 'orange', Expiring: 'orange',
}
export const statusTone = (s: string): Tone => STATUS_TONE[s] ?? 'gray'
export const StatusBadge = ({ status, className }: { status: string; className?: string }) => <Badge tone={statusTone(status)} dot className={className}>{status}</Badge>

/* ------------------------------------------------------------------ Form controls */
export function Field({ label, hint, error, children, className, required }: { label?: React.ReactNode; hint?: React.ReactNode; error?: string; children: React.ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="mb-1 block text-[11.5px] font-medium text-slate-600">{label}{required && <span className="text-rose-500"> *</span>}</span>}
      {children}
      {error ? <span className="mt-1 block text-[11px] text-rose-600">{error}</span> : hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  )
}
const inputCls = 'h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 placeholder:text-slate-400 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-500'
export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode; suffix?: React.ReactNode }>(function Input({ className, icon, suffix, ...rest }, ref) {
  if (!icon && !suffix) return <input ref={ref} className={cn(inputCls, className)} {...rest} />
  return (
    <div className={cn('relative', className)}>
      {icon && <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 [&>svg]:size-3.5">{icon}</span>}
      <input ref={ref} className={cn(inputCls, icon && 'pl-8', suffix && 'pr-10')} {...rest} />
      {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">{suffix}</span>}
    </div>
  )
})
export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(inputCls, 'h-auto min-h-[64px] py-2', className)} {...rest} />
})
export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('relative', className)}>
      <select className={cn(inputCls, 'appearance-none pr-7')} {...rest}>{children}</select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  )
}
export const SearchInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { onClear?: () => void; kbd?: string }>(function SearchInput({ className, onClear, kbd, value, ...rest }, ref) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
      <input ref={ref} value={value} className={cn(inputCls, 'pl-8 pr-8')} {...rest} />
      {value && onClear ? (
        <button type="button" onClick={onClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="size-3.5" /></button>
      ) : kbd ? <Kbd className="absolute right-2 top-1/2 -translate-y-1/2">{kbd}</Kbd> : null}
    </div>
  )
})
export function Toggle({ checked, onChange, size = 'md', disabled }: { checked: boolean; onChange: (v: boolean) => void; size?: 'sm' | 'md'; disabled?: boolean }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
      className={cn('relative inline-flex shrink-0 items-center rounded-full transition-colors disabled:opacity-50', size === 'sm' ? 'h-4 w-7' : 'h-5 w-9', checked ? 'bg-brand-500' : 'bg-slate-300')}
    >
      <span className={cn('inline-block rounded-full bg-white shadow transition-transform', size === 'sm' ? 'size-3' : 'size-4', checked ? (size === 'sm' ? 'translate-x-3.5' : 'translate-x-[18px]') : 'translate-x-0.5')} />
    </button>
  )
}
export function Checkbox({ checked, onChange, indeterminate, label, disabled, className }: { checked: boolean; onChange: (v: boolean) => void; indeterminate?: boolean; label?: React.ReactNode; disabled?: boolean; className?: string }) {
  return (
    <label className={cn('inline-flex cursor-pointer select-none items-center gap-2', disabled && 'cursor-not-allowed opacity-50', className)} onClick={(e) => e.stopPropagation()}>
      <span
        onClick={() => !disabled && onChange(!checked)}
        className={cn('flex size-4 shrink-0 items-center justify-center rounded border transition', checked || indeterminate ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 bg-white hover:border-brand-400')}
      >
        {checked ? <Check className="size-3" strokeWidth={3} /> : indeterminate ? <span className="h-0.5 w-2 rounded bg-white" /> : null}
      </span>
      {label && <span className="text-[13px] text-slate-700" onClick={() => !disabled && onChange(!checked)}>{label}</span>}
    </label>
  )
}

/* ------------------------------------------------------------------ Tabs / segmented */
export function Tabs<T extends string>({ items, value, onChange, className }: { items: { value: T; label: React.ReactNode; count?: number; icon?: React.ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto border-b border-slate-200 no-scrollbar', className)}>
      {items.map((it) => (
        <button key={it.value} onClick={() => onChange(it.value)}
          className={cn('relative -mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium transition',
            value === it.value ? 'border-brand-500 text-navy-900' : 'border-transparent text-slate-500 hover:text-slate-800')}>
          {it.icon}{it.label}
          {it.count !== undefined && <span className={cn('rounded-full px-1.5 text-[10.5px]', value === it.value ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500')}>{it.count}</span>}
        </button>
      ))}
    </div>
  )
}
export function Segmented<T extends string>({ items, value, onChange, size = 'md', className }: { items: { value: T; label: React.ReactNode; icon?: React.ReactNode }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <div className={cn('inline-flex rounded-lg bg-slate-100 p-0.5', className)}>
      {items.map((it) => (
        <button key={it.value} onClick={() => onChange(it.value)}
          className={cn('flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition',
            size === 'sm' ? 'h-6 px-2 text-[11.5px]' : size === 'lg' ? 'h-9 px-4 text-sm' : 'h-7 px-3 text-[12.5px]',
            value === it.value ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
          {it.icon}{it.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ Misc */
export function Avatar({ name, color = '#1d3f70', size = 28, className }: { name: string; color?: string; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', className)}
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>
      {initials(name)}
    </span>
  )
}
export const VegMark = ({ veg, className }: { veg: boolean; className?: string }) => <span className={cn(veg ? 'veg-mark' : 'nonveg-mark', className)} title={veg ? 'Veg' : 'Non-veg'} />

/** Render a lucide icon by its export name, e.g. <DynIcon name="Flame" /> */
export function DynIcon({ name, className }: { name: string; className?: string }) {
  const C = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ?? Icons.Circle
  return <C className={className} />
}

export function Progress({ value, tone = 'teal', className }: { value: number; tone?: Tone; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div className={cn('h-full rounded-full transition-all', DOT[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function EmptyState({ icon, title, body, action, className }: { icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-10 text-center', className)}>
      <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 [&>svg]:size-5">{icon ?? <Icons.Inbox />}</div>
      <p className="text-[13px] font-semibold text-slate-800">{title}</p>
      {body && <p className="mt-1 max-w-xs text-[12px] text-slate-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Simple dropdown menu */
export function Dropdown({ trigger, children, align = 'right', className, width = 220 }: { trigger: React.ReactNode; children: React.ReactNode | ((close: () => void) => React.ReactNode); align?: 'left' | 'right'; className?: string; width?: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  return (
    <div ref={ref} className={cn('relative', className)}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div className={cn('absolute z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-pop animate-pop', align === 'right' ? 'right-0' : 'left-0')} style={{ width }}>
          {typeof children === 'function' ? children(() => setOpen(false)) : <div onClick={() => setOpen(false)}>{children}</div>}
        </div>
      )}
    </div>
  )
}
export function MenuItemBtn({ icon, children, onClick, danger, kbd }: { icon?: React.ReactNode; children: React.ReactNode; onClick?: () => void; danger?: boolean; kbd?: string }) {
  return (
    <button onClick={onClick} className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition [&>svg]:size-3.5', danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-100')}>
      {icon}<span className="flex-1">{children}</span>{kbd && <Kbd>{kbd}</Kbd>}
    </button>
  )
}

export function Stepper({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex items-center gap-2">
            <span className={cn('flex size-6 items-center justify-center rounded-full text-[11px] font-semibold transition',
              i < current ? 'bg-brand-500 text-white' : i === current ? 'bg-navy-900 text-white ring-4 ring-navy-100' : 'bg-slate-100 text-slate-400')}>
              {i < current ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn('hidden text-[12px] font-medium sm:block', i <= current ? 'text-slate-800' : 'text-slate-400')}>{s}</span>
          </div>
          {i < steps.length - 1 && <div className={cn('mx-2 h-px min-w-4 flex-1', i < current ? 'bg-brand-400' : 'bg-slate-200')} />}
        </React.Fragment>
      ))}
    </div>
  )
}

export function Divider({ className, label }: { className?: string; label?: string }) {
  if (!label) return <div className={cn('h-px bg-slate-100', className)} />
  return (
    <div className={cn('flex items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-slate-400', className)}>
      <div className="h-px flex-1 bg-slate-100" />{label}<div className="h-px flex-1 bg-slate-100" />
    </div>
  )
}

export function KeyValue({ items, cols = 2, className }: { items: [React.ReactNode, React.ReactNode][]; cols?: number; className?: string }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-3', className)} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map(([k, v], i) => (
        <div key={i} className="min-w-0">
          <dt className="text-[11px] text-slate-500">{k}</dt>
          <dd className="truncate text-[13px] font-medium text-slate-800">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
