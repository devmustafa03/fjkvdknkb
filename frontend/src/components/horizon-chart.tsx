import { memo, useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceArea, XAxis, YAxis } from 'recharts'

import { ChartCard, type Column, DataTable } from '@/components/chart-card'
import { type ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart'
import type { Analysis, HorizonBucket } from '@/lib/api'
import { formatGwTick, formatMw, plainMw, plural } from '@/lib/format'
import { gwTicks } from '@/lib/ticks'

const MAX_HOURS = 48
const config = { mae: { label: 'Mean absolute error', color: 'var(--series-forecast)' } } satisfies ChartConfig

const columns: Column<HorizonBucket>[] = [
  { header: 'Hours ahead', cell: (b) => `${b.hours}–${b.hours + 1}`, numeric: true },
  { header: 'MAE (MW)', cell: (b) => plainMw(b.mae), numeric: true },
  { header: 'P90 of |error| (MW)', cell: (b) => plainMw(b.p90Abs), numeric: true },
  { header: 'Forecasts', cell: (b) => b.count, numeric: true },
]

function HorizonChart({ data }: { data: Analysis }) {
  const [minLead, maxLead] = useMemo(() => {
    const hours = data.series.flatMap((p) => (p.horizonHours === null ? [] : [p.horizonHours]))
    return hours.length ? [Math.min(...hours), Math.max(...hours)] : [null, null]
  }, [data.series])
  const yTicks = useMemo(() => gwTicks(Math.max(0, ...data.horizonProfile.map((b) => b.mae))), [data.horizonProfile])
  const top = yTicks.at(-1) ?? 0

  return (
    <ChartCard
      title="Accuracy against lead time"
      description="Mean absolute error of every WINDFOR run for these delivery days, by hours from publication to delivery. The shaded span is the lead time you trade on at this gate."
      chart={
        <ChartContainer config={config} className="aspect-auto h-[240px] w-full">
          <AreaChart data={data.horizonProfile} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="hours"
              type="number"
              domain={[0, MAX_HOURS]}
              ticks={[0, 6, 12, 18, 24, 30, 36, 42, 48]}
              tickFormatter={(h: number) => `${h} h`}
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
            {minLead !== null && maxLead !== null && (
              <ReferenceArea
                x1={Math.floor(minLead)}
                x2={Math.min(MAX_HOURS, Math.ceil(maxLead))}
                fill="var(--foreground)"
                fillOpacity={0.06}
                label={{
                  value: 'Your decision window',
                  position: 'insideTop',
                  fill: 'var(--muted-foreground)',
                  fontSize: 12,
                }}
              />
            )}
            <ChartTooltip
              content={({ active, payload }) => {
                const b = payload?.[0]?.payload as HorizonBucket | undefined
                if (!active || !b) return null
                return (
                  <div className="grid gap-1 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                    <div className="font-medium">
                      {b.hours}–{b.hours + 1} hours ahead
                    </div>
                    <div className="tabular-nums">MAE {formatMw(b.mae)}</div>
                    <div className="text-muted-foreground tabular-nums">P90 of |error| {formatMw(b.p90Abs)}</div>
                    <div className="text-muted-foreground">{plural(b.count, 'forecast')}</div>
                  </div>
                )
              }}
            />
            <Area
              dataKey="mae"
              type="linear"
              stroke="var(--color-mae)"
              strokeWidth={2}
              fill="var(--color-mae)"
              fillOpacity={0.1}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      }
      table={
        <DataTable
          caption="Forecast error by lead time"
          columns={columns}
          rows={data.horizonProfile}
          rowKey={(b) => b.hours}
        />
      }
    />
  )
}

export default memo(HorizonChart)
