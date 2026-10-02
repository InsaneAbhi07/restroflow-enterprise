import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { CHART, tooltipStyle, Legend } from '@/components/ui'
import { inr, inrShort, num } from '@/lib/format'
import type { CartesianSpec, ChartSpec } from './types'

const moneyTick = (v: number) => inrShort(v)
const numTick = (v: number) => (Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'K' : String(Math.round(v * 10) / 10))

export function ChartView({ spec }: { spec: ChartSpec }) {
  if (spec.kind === 'custom') return <>{spec.node}</>
  const h = spec.height ?? 260
  if (spec.kind === 'pie' || spec.kind === 'donut') {
    const data = spec.data.filter((d) => d.value > 0)
    const sum = data.reduce((s, d) => s + d.value, 0) || 1
    return (
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="w-full sm:w-1/2" style={{ height: h }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={spec.kind === 'donut' ? '58%' : 0} outerRadius="88%" paddingAngle={spec.kind === 'donut' ? 2 : 0} stroke="#fff">
                {data.map((d, i) => <Cell key={d.name} fill={d.color ?? CHART.series[i % CHART.series.length]} />)}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={(v) => (spec.money ? inr(Number(v)) : num(Number(v)))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <Legend className="w-full sm:w-1/2" items={data.map((d, i) => ({ name: `${d.name} · ${((d.value / sum) * 100).toFixed(1)}%`, color: d.color ?? CHART.series[i % CHART.series.length], value: spec.money ? inrShort(d.value) : num(d.value) }))} />
      </div>
    )
  }
  return <CartesianChart spec={spec as CartesianSpec} />
}

function CartesianChart({ spec }: { spec: CartesianSpec }) {
  const h = spec.height ?? 260
  const fmt = (v: unknown, name: unknown) => {
    const s = spec.series.find((x) => x.name === name || x.key === name)
    const money = spec.money && s?.axis !== 'right'
    return money ? inr(Number(v)) : num(Number(v))
  }
  const hasRight = spec.series.some((s) => s.axis === 'right')
  const axes = (
    <>
      <CartesianGrid stroke={CHART.grid} vertical={false} />
      <XAxis dataKey={spec.x} tick={CHART.axis} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
      <YAxis yAxisId="left" tick={CHART.axis} tickLine={false} axisLine={false} width={56} tickFormatter={spec.money ? moneyTick : numTick} />
      {hasRight && <YAxis yAxisId="right" orientation="right" tick={CHART.axis} tickLine={false} axisLine={false} width={40} tickFormatter={numTick} />}
      <Tooltip {...tooltipStyle} formatter={(v, n) => fmt(v, n)} cursor={{ fill: 'rgba(148,163,184,.08)' }} />
    </>
  )
  const color = (i: number, c?: string) => c ?? CHART.series[i % CHART.series.length]
  const legend = spec.series.length > 1 && (
    <div className="mb-2 flex flex-wrap gap-3 text-[11.5px] text-slate-500">
      {spec.series.map((s, i) => <span key={s.key} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: color(i, s.color) }} />{s.name}</span>)}
    </div>
  )

  if (spec.kind === 'hbar') {
    return (
      <div style={{ height: Math.max(h, spec.data.length * 26 + 30) }}>
        {legend}
        <ResponsiveContainer>
          <BarChart data={spec.data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid stroke={CHART.grid} horizontal={false} />
            <XAxis type="number" tick={CHART.axis} tickLine={false} axisLine={false} tickFormatter={spec.money ? moneyTick : numTick} />
            <YAxis type="category" dataKey={spec.x} tick={CHART.axis} tickLine={false} axisLine={false} width={130} />
            <Tooltip {...tooltipStyle} formatter={(v, n) => fmt(v, n)} cursor={{ fill: 'rgba(148,163,184,.08)' }} />
            {spec.series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.name} fill={color(i, s.color)} radius={[0, 4, 4, 0]} stackId={s.stack} barSize={14} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div>
      {legend}
      <div style={{ height: h }}>
        <ResponsiveContainer>
          {spec.kind === 'line' ? (
            <LineChart data={spec.data}>
              {axes}
              {spec.series.map((s, i) => <Line key={s.key} yAxisId={s.axis ?? 'left'} type="monotone" dataKey={s.key} name={s.name} stroke={color(i, s.color)} strokeWidth={2} dot={spec.data.length < 20} />)}
            </LineChart>
          ) : spec.kind === 'area' ? (
            <AreaChart data={spec.data}>
              <defs>
                {spec.series.map((s, i) => (
                  <linearGradient key={s.key} id={`rg-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color(i, s.color)} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={color(i, s.color)} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              {axes}
              {spec.series.map((s, i) => <Area key={s.key} yAxisId={s.axis ?? 'left'} type="monotone" dataKey={s.key} name={s.name} stroke={color(i, s.color)} strokeWidth={2} fill={`url(#rg-${s.key})`} stackId={s.stack} />)}
            </AreaChart>
          ) : spec.kind === 'composed' ? (
            <ComposedChart data={spec.data}>
              {axes}
              {spec.series.map((s, i) => {
                const t = s.type ?? 'bar'
                if (t === 'line') return <Line key={s.key} yAxisId={s.axis ?? 'left'} type="monotone" dataKey={s.key} name={s.name} stroke={color(i, s.color)} strokeWidth={2} dot={false} />
                if (t === 'area') return <Area key={s.key} yAxisId={s.axis ?? 'left'} type="monotone" dataKey={s.key} name={s.name} stroke={color(i, s.color)} fill={color(i, s.color)} fillOpacity={0.12} />
                return <Bar key={s.key} yAxisId={s.axis ?? 'left'} dataKey={s.key} name={s.name} fill={color(i, s.color)} radius={[4, 4, 0, 0]} maxBarSize={28} />
              })}
            </ComposedChart>
          ) : (
            <BarChart data={spec.data}>
              {axes}
              {spec.series.map((s, i) => (
                <Bar key={s.key} yAxisId={s.axis ?? 'left'} dataKey={s.key} name={s.name} fill={color(i, s.color)} maxBarSize={30}
                  stackId={spec.kind === 'stacked' ? s.stack ?? 'a' : undefined} radius={spec.kind === 'stacked' ? (i === spec.series.length - 1 ? [4, 4, 0, 0] : 0) : [4, 4, 0, 0]} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** CSS-grid heatmap (rows × columns) */
export function Heatmap({ rows, cols, values, fmt = (v) => num(v), color = '20,168,145' }: {
  rows: string[]; cols: string[]; values: number[][]; fmt?: (v: number) => string; color?: string
}) {
  const max = Math.max(1, ...values.flat())
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[640px] gap-[3px]" style={{ gridTemplateColumns: `52px repeat(${cols.length}, minmax(26px, 1fr))` }}>
        <div />
        {cols.map((c) => <div key={c} className="pb-1 text-center text-[10px] font-medium text-slate-400">{c}</div>)}
        {rows.map((r, ri) => (
          <div key={r} className="contents">
            <div className="flex items-center text-[11px] font-medium text-slate-500">{r}</div>
            {cols.map((c, ci) => {
              const v = values[ri][ci]
              const a = v / max
              return (
                <div key={c} title={`${r} ${c} · ${fmt(v)}`}
                  className="flex h-8 items-center justify-center rounded-[5px] text-[9.5px] font-semibold tabular transition hover:ring-2 hover:ring-navy-300"
                  style={{ background: `rgba(${color},${0.06 + a * 0.9})`, color: a > 0.55 ? '#fff' : '#334155' }}>
                  {a > 0.28 ? fmt(v) : ''}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-slate-400">
        Low
        <div className="h-2 w-40 rounded-full" style={{ background: `linear-gradient(90deg, rgba(${color},.06), rgba(${color},.96))` }} />
        High
      </div>
    </div>
  )
}
