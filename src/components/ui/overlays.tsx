import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/format'
import { pushEsc } from '@/lib/shortcuts'
import { Button } from './primitives'

function useEscLayer(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    return pushEsc(onClose)
  }, [open, onClose])
}

const SIZES = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl', full: 'max-w-[96vw]' }

export interface ModalProps {
  open: boolean; onClose: () => void; title?: React.ReactNode; subtitle?: React.ReactNode; icon?: React.ReactNode
  size?: keyof typeof SIZES; footer?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string; hideClose?: boolean
}
export function Modal({ open, onClose, title, subtitle, icon, size = 'md', footer, children, className, bodyClassName, hideClose }: ModalProps) {
  useEscLayer(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-navy-950/40 p-4 backdrop-blur-[2px] animate-fade-in sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cn('relative my-auto flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-pop animate-pop', SIZES[size], className)}>
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              {icon && <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700 [&>svg]:size-4.5">{icon}</div>}
              <div className="min-w-0">
                {title && <h2 className="truncate text-[15px] font-semibold text-slate-900">{title}</h2>}
                {subtitle && <p className="truncate text-[12px] text-slate-500">{subtitle}</p>}
              </div>
            </div>
            {!hideClose && <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Close (Esc)"><X className="size-4" /></button>}
          </div>
        )}
        <div className={cn('flex-1 overflow-y-auto px-5 py-4', bodyClassName)}>{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = 480, icon }: { open: boolean; onClose: () => void; title?: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; width?: number; icon?: React.ReactNode }) {
  useEscLayer(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end bg-navy-950/30 animate-fade-in" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex h-full w-full flex-col bg-white shadow-pop animate-slide-left" style={{ maxWidth: width }}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon}
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-semibold text-slate-900">{title}</h2>
              {subtitle && <p className="truncate text-[12px] text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="size-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel = 'Confirm', tone = 'primary', children }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; body?: React.ReactNode; confirmLabel?: string; tone?: 'primary' | 'danger' | 'accent'; children?: React.ReactNode
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm" hideClose>
      <div className="flex gap-3.5 pt-1">
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600')}>
          <AlertTriangle className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
          {body && <div className="mt-1 text-[13px] text-slate-500">{body}</div>}
          {children}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant={tone} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}
