import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, Download, Mail, MessageCircle } from 'lucide-react'
import { Modal, Button, Segmented } from '@/components/ui'
import { useShortcut } from '@/lib/shortcuts'
import { toast } from '@/store/toast'
import { cn } from '@/lib/format'

/**
 * Wraps any printable document. Shows it on a "paper" preview and, on Print,
 * mounts it into #print-root and calls window.print() with the right @page size.
 *   paper="thermal" → 80mm/58mm receipt roll     paper="a4" → A4 page (salary slip, GRN, reports)
 */
export function PrintPreviewModal({ open, onClose, title = 'Print Preview', subtitle, paper = 'thermal', children, allowWidthToggle = true, actions }: {
  open: boolean; onClose: () => void; title?: string; subtitle?: string; paper?: 'thermal' | 'a4'; children: React.ReactNode | ((w: '80mm' | '58mm') => React.ReactNode)
  allowWidthToggle?: boolean; actions?: React.ReactNode
}) {
  const [width, setWidth] = useState<'80mm' | '58mm'>('80mm')
  const [printing, setPrinting] = useState(false)
  const content = typeof children === 'function' ? children(width) : children

  const doPrint = () => {
    setPrinting(true)
    const style = document.createElement('style')
    style.id = 'rf-page-size'
    style.innerHTML = paper === 'a4' ? '@page { size: A4; margin: 12mm; }' : `@page { size: ${width} auto; margin: 0; }`
    document.getElementById('rf-page-size')?.remove()
    document.head.appendChild(style)
    setTimeout(() => {
      window.print()
      setPrinting(false)
      toast.success('Sent to printer', paper === 'thermal' ? `Thermal ${width} • EPSON TM-T82` : 'A4 • Default printer')
    }, 60)
  }
  useShortcut('print', doPrint, open)

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} icon={<Printer />} size={paper === 'a4' ? 'lg' : 'md'}
      footer={
        <>
          {paper === 'thermal' && allowWidthToggle && (
            <Segmented size="sm" className="mr-auto" value={width} onChange={setWidth} items={[{ value: '80mm', label: '80 mm' }, { value: '58mm', label: '58 mm' }]} />
          )}
          {actions}
          <Button icon={<MessageCircle className="size-3.5" />} onClick={() => toast.success('e-Bill sent on WhatsApp', 'Simulated – no message was sent')}>WhatsApp</Button>
          <Button icon={<Download className="size-3.5" />} onClick={() => toast.info('PDF export simulated')}>PDF</Button>
          <Button variant="primary" icon={<Printer className="size-3.5" />} kbd="F8" onClick={doPrint} loading={printing}>Print</Button>
        </>
      }>
      <div className={cn('flex justify-center rounded-xl bg-slate-100 py-6', paper === 'a4' && 'px-4')}>
        <div className={cn('shadow-[0_4px_24px_-6px_rgba(0,0,0,.25)]', paper === 'thermal' && 'relative')}>
          {content}
          {paper === 'thermal' && <div className="thermal-edge" />}
        </div>
      </div>
      {printing && createPortal(<div className={paper === 'a4' ? 'a4' : ''}>{content}</div>, document.getElementById('print-root')!)}
    </Modal>
  )
}

/* ---------- thermal building blocks ---------- */
export const TRow = ({ l, r, bold, className }: { l: React.ReactNode; r?: React.ReactNode; bold?: boolean; className?: string }) => (
  <div className={cn('flex justify-between gap-2', bold && 'font-bold', className)}><span className="min-w-0">{l}</span>{r !== undefined && <span className="shrink-0 text-right">{r}</span>}</div>
)
export const TDash = () => <div className="dash" />
export const TCenter = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={cn('text-center', className)}>{children}</div>

export function ThermalPaper({ width = '80mm', children }: { width?: '80mm' | '58mm'; children: React.ReactNode }) {
  return <div className={cn('thermal px-3 py-4', width === '58mm' && 'w58')}>{children}</div>
}

/** Fake barcode/QR for receipts */
export function MiniQR({ seed = 'x', size = 64 }: { seed?: string; size?: number }) {
  const n = 21
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const cells: boolean[] = []
  for (let i = 0; i < n * n; i++) {
    h = (h * 1103515245 + 12345) >>> 0
    cells.push(((h >> 16) & 1) === 1)
  }
  const finder = (x: number, y: number) => {
    const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7
    const ring = (ox: number, oy: number) => { const dx = x - ox, dy = y - oy; return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) }
    if (inBox(0, 0)) return ring(0, 0) ? 1 : 0
    if (inBox(n - 7, 0)) return ring(n - 7, 0) ? 1 : 0
    if (inBox(0, n - 7)) return ring(0, n - 7) ? 1 : 0
    return -1
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#fff" />
      {cells.map((on, i) => {
        const x = i % n, y = Math.floor(i / n)
        const f = finder(x, y)
        const fill = f === -1 ? on : f === 1
        return fill ? <rect key={i} x={x} y={y} width={1} height={1} fill="#111" /> : null
      })}
    </svg>
  )
}
