import React, { useEffect, useState } from 'react'
import { ChevronLeft, Minus, Plus, Signal, Wifi, BatteryMedium } from 'lucide-react'
import { cn } from '@/lib/format'

export const MOBILE_CSS = `
@keyframes m-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(10px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
.m-shake { animation: m-shake .45s ease-in-out; }
@keyframes m-draw { from { stroke-dashoffset: 60 } to { stroke-dashoffset: 0 } }
.m-draw { stroke-dasharray: 60; stroke-dashoffset: 60; animation: m-draw .5s .25s ease-out forwards; }
@keyframes m-ring { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.08); opacity: 1 } 100% { transform: scale(1) } }
.m-ring { animation: m-ring .5s cubic-bezier(.16,1,.3,1) forwards; }
@keyframes m-sheet { from { transform: translateY(100%) } to { transform: none } }
.m-sheet { animation: m-sheet .28s cubic-bezier(.16,1,.3,1); }
@keyframes m-push { from { transform: translateX(40px); opacity: .4 } to { transform: none; opacity: 1 } }
.m-push { animation: m-push .25s cubic-bezier(.16,1,.3,1); }
@keyframes m-pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(20,168,145,.45) } 100% { box-shadow: 0 0 0 26px rgba(20,168,145,0) } }
.m-pulse { animation: m-pulse-ring 1.8s infinite; }
@keyframes m-pulse-red { 0% { box-shadow: 0 0 0 0 rgba(225,29,72,.4) } 100% { box-shadow: 0 0 0 26px rgba(225,29,72,0) } }
.m-pulse-red { animation: m-pulse-red 1.8s infinite; }
`

export function useClock(ms = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export function StatusBar({ dark }: { dark?: boolean }) {
  const now = useClock(15000)
  return (
    <div className={cn('relative z-40 flex h-11 shrink-0 items-center justify-between px-7 text-[13px] font-semibold', dark ? 'text-white' : 'text-slate-900')}>
      <span className="tabular">{now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: false })}</span>
      <span className="flex items-center gap-1.5">
        <Signal className="size-3.5" strokeWidth={2.5} />
        <Wifi className="size-3.5" strokeWidth={2.5} />
        <span className="flex items-center gap-0.5 text-[11px]">82<BatteryMedium className="size-4.5" /></span>
      </span>
    </div>
  )
}

/** Sticky screen header with optional back button */
export function MHeader({ title, subtitle, onBack, right, className }: { title: React.ReactNode; subtitle?: React.ReactNode; onBack?: () => void; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200/70 bg-white/95 px-3 py-2.5 backdrop-blur', className)}>
      {onBack && (
        <button onClick={onBack} className="flex size-9 items-center justify-center rounded-full text-slate-700 active:bg-slate-100"><ChevronLeft className="size-5" /></button>
      )}
      <div className={cn('min-w-0 flex-1', !onBack && 'pl-2')}>
        <h1 className="truncate text-[17px] font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="truncate text-[12px] text-slate-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function BottomSheet({ title, onClose, children, footer }: { title?: React.ReactNode; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-slate-900/45 animate-fade-in" onClick={onClose} />
      <div className="m-sheet relative flex max-h-[86%] flex-col rounded-t-[28px] bg-white shadow-2xl">
        <div className="flex justify-center pb-1 pt-2.5"><span className="h-1.5 w-10 rounded-full bg-slate-300" /></div>
        {title && <div className="px-5 pb-2 pt-1 text-[17px] font-bold text-slate-900">{title}</div>}
        <div className="flex-1 overflow-y-auto px-5 pb-4 no-scrollbar">{children}</div>
        {footer && <div className="border-t border-slate-100 px-5 pb-6 pt-3">{footer}</div>}
      </div>
    </div>
  )
}

export function MButton({ className, variant = 'primary', children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'accent' | 'outline' | 'danger' | 'soft' }) {
  const v = {
    primary: 'bg-navy-900 text-white shadow-lg shadow-navy-900/20',
    accent: 'bg-brand-500 text-white shadow-lg shadow-brand-500/25',
    outline: 'border border-slate-200 bg-white text-slate-800',
    danger: 'bg-rose-600 text-white shadow-lg shadow-rose-600/20',
    soft: 'bg-slate-100 text-slate-800',
  }[variant]
  return (
    <button className={cn('flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-semibold transition active:scale-[.97] disabled:opacity-40', v, className)} {...rest}>
      {children}
    </button>
  )
}

export function QtyStepper({ qty, onChange, size = 'md' }: { qty: number; onChange: (q: number) => void; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'size-7' : 'size-9'
  return (
    <div className="flex items-center rounded-full bg-brand-500 text-white shadow-sm" onClick={(e) => e.stopPropagation()}>
      <button className={cn('flex items-center justify-center rounded-full active:bg-brand-600', s)} onClick={() => onChange(qty - 1)}><Minus className="size-4" strokeWidth={2.5} /></button>
      <span className={cn('min-w-6 text-center font-bold tabular', size === 'sm' ? 'text-[13px]' : 'text-[15px]')}>{qty}</span>
      <button className={cn('flex items-center justify-center rounded-full active:bg-brand-600', s)} onClick={() => onChange(qty + 1)}><Plus className="size-4" strokeWidth={2.5} /></button>
    </div>
  )
}

export function Chip({ active, children, onClick, className }: { active?: boolean; children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button onClick={onClick}
      className={cn('flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition active:scale-95',
        active ? 'bg-navy-900 text-white' : 'border border-slate-200 bg-white text-slate-600', className)}>
      {children}
    </button>
  )
}

export function MCard({ className, children, onClick }: { className?: string; children: React.ReactNode; onClick?: () => void }) {
  return <div onClick={onClick} className={cn('rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm', onClick && 'cursor-pointer transition active:scale-[.99]', className)}>{children}</div>
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-500">{children}</h2>
      {action}
    </div>
  )
}

export function AnimatedCheck({ size = 96 }: { size?: number }) {
  return (
    <div className="m-ring flex items-center justify-center rounded-full bg-emerald-500 shadow-xl shadow-emerald-500/30" style={{ width: size, height: size }}>
      <svg viewBox="0 0 52 52" width={size * 0.55} height={size * 0.55} fill="none" stroke="white" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
        <path className="m-draw" d="M14 27 l8 8 l16 -18" />
      </svg>
    </div>
  )
}
