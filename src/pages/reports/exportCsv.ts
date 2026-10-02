import { ORG } from '@/data/outlets'
import type { RCol, Row } from './types'
import { fmtCell } from './gen'
import { computeTotals } from './totals'

const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)
/** numeric cells exported raw (Excel friendly), others formatted */
const raw = (v: Row[string], c: RCol) => {
  if (typeof v === 'number' && c.fmt && !['date', 'time', 'datetime', 'text'].includes(c.fmt)) return String(Math.round(v * 100) / 100)
  return fmtCell(v, c.fmt)
}

export function downloadCsv(filename: string, meta: { title: string; outlet: string; period: string }, columns: RCol[], rows: Row[]) {
  const lines: string[] = []
  lines.push(esc(ORG.name), esc(meta.title), esc('Outlet: ' + meta.outlet), esc('Period: ' + meta.period), esc('Generated: ' + new Date().toLocaleString('en-IN')), '')
  lines.push(columns.map((c) => esc(c.header)).join(','))
  rows.forEach((r) => lines.push(columns.map((c) => esc(raw(r[c.key], c))).join(',')))
  const t = computeTotals(columns, rows)
  if (t) lines.push(columns.map((c, i) => esc(i === 0 ? 'TOTAL' : (t[c.key] ?? '').replace(/[₹,]/g, ''))).join(','))
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
