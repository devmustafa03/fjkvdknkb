import { memo, useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from 'recharts'

import { ChartCard, type Column, DataTable, Legend } from '@/components/chart-card'
import { type ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart'
import type { Analysis, HistogramBin } from '@/lib/api'
import { formatGw, formatGwTick, plainSignedMw, plural } from '@/lib/format'

const config = {
  shortfall: { label: 'Shortfall: forecast too high', color: 'var(--series-shortfall)' },
  surplus: { label: 'Surplus: forecast too low', color: 'var(--series-surplus)' },
} satisfies ChartConfig

const range = (b: HistogramBin) => `${formatGw(b.start)} to ${formatGw(b.end)}`

const columns: Column<HistogramBin>[] = [
  { header: 'Error, forecast − actual (MW)', cell: (b) => `${plainSignedMw(b.start)} to ${plainSignedMw(b.end)}` },
  { header: 'Hours', cell: (b) => b.count, numeric: true },
]

function ErrorHistogram({ data }: { data: Analysis }) {
  const bins = useMemo(() => data.histogram.map((b) => ({ ...b, mid: (b.start + b.end) / 2 })), [data.histogram])
  const min = bins[0]?.start ?? 0
  const max = bins.at(-1)?.end ?? 0
  // Bin-edge ticks keep bars half a GW wide
  const ticks = useMemo(() => bins.map((b) => b.start).concat(max), [bins, max])

  return (
    <ChartCard
      title="How big are the misses?"
      description="Hourly forecast errors at decision time, in 0.5 GW bins. Right of zero the forecast was too high and the buyer was short."
      legend={
        <Legend
          items={[
            { label: config.shortfall.label, color: config.shortfall.color, kind: 'bar' },
            { label: config.surplus.label, color: config.surplus.color, kind: 'bar' },
          ]}
        />
      }
      chart={
        <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
          <BarChart data={bins} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap={1}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="mid"
              type="number"
              domain={[min, max]}
              ticks={ticks}
              interval={0}
              tickFormatter={(v: number) => (v % 1000 === 0 ? `${formatGwTick(v)}${v === max ? ' GW' : ''}` : '')}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v: number, i: number) => (i === 0 ? String(v) : `${v}`)}
            />
            <ReferenceLine x={0} stroke="var(--foreground)" strokeOpacity={0.5} />
            <ChartTooltip
              cursor={{ fill: 'var(--muted)', fillOpacity: 0.6 }}
              content={({ active, payload }) => {
                const b = payload?.[0]?.payload as HistogramBin | undefined
                if (!active || !b) return null
                return (
                  <div className="grid gap-1 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                    <div className="font-medium tabular-nums">{range(b)}</div>
                    <div className="text-muted-foreground">
                      {plural(b.count, 'hour')} · {b.start >= 0 ? 'shortfall' : 'surplus'}
                    </div>
                  </div>
                )
              }}
            />
            <Bar dataKey="count" isAnimationActive={false}>
              {bins.map((b) => (
                <Cell key={b.start} fill={b.start >= 0 ? 'var(--color-shortfall)' : 'var(--color-surplus)'} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      }
      table={
        <DataTable
          caption="Forecast error distribution"
          columns={columns}
          rows={data.histogram}
          rowKey={(b) => b.start}
        />
      }
    />
  )
}

export default memo(ErrorHistogram)
