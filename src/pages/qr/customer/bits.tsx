import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/format'

export function QtyStepper({ value, onChange, size = 'md', className }: { value: number; onChange: (v: number) => void; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const h = size === 'sm' ? 'h-8' : size === 'lg' ? 'h-12' : 'h-9'
  return (
    <div className={cn('inline-flex items-center overflow-hidden rounded-xl border border-brand-500 bg-white text-brand-700 shadow-sm', h, className)}>
      <button aria-label="Decrease" onClick={(e) => { e.stopPropagation(); onChange(value - 1) }} className={cn('flex items-center justify-center px-2.5 active:bg-brand-50', h)}><Minus className="size-4" strokeWidth={2.5} /></button>
      <span className="min-w-6 text-center text-[15px] font-bold tabular">{value}</span>
      <button aria-label="Increase" onClick={(e) => { e.stopPropagation(); onChange(value + 1) }} className={cn('flex items-center justify-center px-2.5 active:bg-brand-50', h)}><Plus className="size-4" strokeWidth={2.5} /></button>
    </div>
  )
}

export function FoodArt({ emoji, color = '#ea580c', className, size = 44 }: { emoji: string; color?: string; className?: string; size?: number }) {
  return (
    <div className={cn('flex items-center justify-center overflow-hidden', className)}
      style={{ background: `radial-gradient(circle at 30% 25%, #fff8 0%, transparent 45%), linear-gradient(135deg, ${color}22, ${color}44)` }}>
      <span style={{ fontSize: size, filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.18))' }}>{emoji}</span>
    </div>
  )
}

export const GkLogo = ({ className }: { className?: string }) => (
  <div className={cn('flex items-center justify-center rounded-2xl bg-white font-extrabold tracking-tight text-navy-900 shadow-lg', className)}>
    G<span className="text-brand-500">K</span>
  </div>
)
