import type { RCol, Row } from './types'
import { fmtCell } from './gen'

/** footer aggregates as formatted strings; null when no column aggregates */
export function computeTotals(columns: RCol[], rows: Row[]): Record<string, string> | null {
  if (!columns.some((c) => c.total)) return null
  const out: Record<string, string> = {}
  columns.forEach((c) => {
    if (!c.total) return
    if (c.total === 'count') { out[c.key] = String(rows.length); return }
    const vals = rows.map((r) => Number(r[c.key])).filter((v) => !Number.isNaN(v))
    const sum = vals.reduce((a, b) => a + b, 0)
    const v = c.total === 'avg' ? (vals.length ? sum / vals.length : 0) : sum
    // percent shares should not exceed 100 due to rounding
    out[c.key] = fmtCell(c.fmt === 'pct' && c.total === 'sum' ? Math.min(100, v) : v, c.fmt)
  })
  return out
}
