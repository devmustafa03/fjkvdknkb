import { memo, useMemo } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'

import { ChartCard, type Column, DataTable, Legend } from '@/components/chart-card'
import { type ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart'
import type { Analysis, SeriesPoint } from '@/lib/api'
import {
  formatDateTime,
  formatDay,
  formatGwTick,
  formatHours,
  formatIso,
  formatMw,
  formatSignedMw,
  formatTime,
  plainMw,
  plainSignedMw,
} from '@/lib/format'
import { HOUR, gwTicks, timeTicks } from '@/lib/ticks'

const config = {
  actual: { label: 'Actual (metered)', color: 'var(--series-actual)' },
  forecast: { label: 'Forecast at decision time', color: 'var(--series-forecast)' },
  band: { label: 'Where the actual landed, 8 hours in 10', color: 'var(--series-forecast)' },
} satisfies ChartConfig

interface Row {
  t: number
  actual: number | null
  forecast: number | null
  band: [number, number] | null
  point: SeriesPoint
  hour: SeriesPoint | undefined
}

// UTC hours equal UK hours in January
const tickLabel = (t: number) => (new Date(t).getUTCHours() === 0 ? formatDay(t) : formatTime(t))

const columns: Column<SeriesPoint>[] = [
  { header: 'Hour (UK)', cell: (p) => formatIso(p.time) },
  { header: 'Actual (MW)', cell: (p) => (p.actual === null ? '—' : plainMw(p.actual)), numeric: true },
  { header: 'Forecast (MW)', cell: (p) => (p.forecast === null ? '—' : plainMw(p.forecast)), numeric: true },
  {
    header: 'Error, forecast − actual (MW)',
    cell: (p) => (p.error === null ? '—' : plainSignedMw(p.error)),
    numeric: true,
  },
  { header: 'Forecast published (UK)', cell: (p) => (p.publishTime ? formatIso(p.publishTime) : '—') },
]

function GenerationChart({ data }: { data: Analysis }) {
  const { rows, hourly } = useMemo(() => {
    const hourly = data.series.filter((p) => p.forecast !== null)
    const byHour = new Map(hourly.map((p) => [Date.parse(p.time), p]))
    const rows: Row[] = data.series.map((p) => {
      const t = Date.parse(p.time)
      return {
        t,
        actual: p.actual,
        forecast: p.forecast,
        band: p.bandLow !== null && p.bandHigh !== null ? [p.bandLow, p.bandHigh] : null,
        point: p,
        hour: byHour.get(t - (t % HOUR)),
      }
    })
    return { rows, hourly }
  }, [data.series])

  const start = Date.parse(data.windowStart)
  const end = Date.parse(data.windowEnd) - HOUR / 2
  const xTicks = useMemo(() => timeTicks(start, end), [start, end])
  const yTicks = useMemo(
    () => gwTicks(Math.max(0, ...data.series.flatMap((p) => [p.actual ?? 0, p.forecast ?? 0, p.bandHigh ?? 0]))),
    [data.series],
  )
  const top = yTicks.at(-1) ?? 0

  return (
    <ChartCard
      title="Actual wind against the forecast you had at decision time"
      description={`Latest WINDFOR run published by ${data.gate.slice(0, 5)} on D−1, next to metered output. UK time.`}
      legend={
        <Legend
          items={[
            { label: config.actual.label, color: config.actual.color },
            { label: config.forecast.label, color: config.forecast.color },
            { label: config.band.label, color: config.band.color, kind: 'band' },
          ]}
        />
      }
      chart={
        <ChartContainer config={config} className="aspect-auto h-[300px] w-full">
          <ComposedChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[start, end]}
              ticks={xTicks}
              tickFormatter={tickLabel}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              domain={[0, top]}
              ticks={yTicks}
              tickFormatter={(v: number) => (v === top ? `${formatGwTick(v)} GW` : formatGwTick(v))}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <ChartTooltip
              cursor
              content={({ active, payload }) => (
                <PointTooltip active={active} row={payload?.[0]?.payload as Row | undefined} />
              )}
            />
            <Area
              dataKey="band"
              type="linear"
              stroke="none"
              fill="var(--color-band)"
              fillOpacity={0.12}
              connectNulls
              isAnimationActive={false}
              activeDot={false}
            />
            <Line
              dataKey="actual"
              type="linear"
              stroke="var(--color-actual)"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="forecast"
              type="linear"
              stroke="var(--color-forecast)"
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>
      }
      table={
        <DataTable caption="Hourly actual against forecast" columns={columns} rows={hourly} rowKey={(p) => p.time} />
      }
    />
  )
}

export default memo(GenerationChart)

function PointTooltip({ active, row }: { active?: boolean; row?: Row }) {
  if (!active || !row) return null
  const p = row.point
  const h = row.hour
  return (
    <div className="grid min-w-60 gap-1.5 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{formatDateTime(p.time)}</div>
      <TooltipRow color="var(--color-actual)" label="Actual" value={p.actual === null ? '—' : formatMw(p.actual)} />
      {h && h.forecast !== null && (
        <>
          <TooltipRow
            color="var(--color-forecast)"
            label={h.time === p.time ? 'Forecast' : `Forecast for the ${formatTime(h.time)} hour`}
            value={formatMw(h.forecast)}
          />
          {h.error !== null && (
            <TooltipRow label={h.error >= 0 ? 'Shortfall' : 'Surplus'} value={formatSignedMw(h.error)} />
          )}
          {h.bandLow !== null && h.bandHigh !== null && (
            <TooltipRow label="Likely range" value={`${formatMw(h.bandLow)} – ${formatMw(h.bandHigh)}`} />
          )}
          {h.publishTime && h.horizonHours !== null && (
            <div className="border-t pt-1.5 text-muted-foreground">
              Published {formatDateTime(h.publishTime)} · {formatHours(h.horizonHours)} ahead
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TooltipRow({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: color ?? 'transparent' }} aria-hidden />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium tabular-nums">{value}</span>
    </div>
  )
}
