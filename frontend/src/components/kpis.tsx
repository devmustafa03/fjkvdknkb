import type { Analysis, SeriesPoint } from '@/lib/api'
import { formatDateTime, formatGw, formatMw, formatPercent, formatSignedMw, plural } from '@/lib/format'

const WINDY_MW = 15_000
const SHORT_SAMPLE_HOURS = 168

const onTheHour = (p: SeriesPoint) => new Date(p.time).getUTCMinutes() === 0

export function Kpis({ data }: { data: Analysis }) {
  const m = data.metrics!
  const gate = data.gate.slice(0, 5)
  const hours = data.series.filter((p) => p.actual !== null && onTheHour(p))
  const compared = data.series.filter((p) => p.error !== null)
  const worst = compared.reduce<SeriesPoint | null>(
    (best, p) => (best === null || p.error! > best.error! ? p : best),
    null,
  )
  const windy = compared.filter((p) => p.forecast! >= WINDY_MW)
  const windyMisses = windy.filter((p) => p.error! > m.p90).length
  const under = m.p90 >= 0

  return (
    <section aria-labelledby="kpi-heading" className="overflow-hidden rounded-xl bg-border border border-border">
      <h2 id="kpi-heading" className="sr-only">
        Forecast accuracy summary
      </h2>
      <div className="grid grid-cols-2 gap-px md:grid-cols-4 xl:grid-cols-[2fr_repeat(4,1fr)]">
        <div className="col-span-2 flex flex-col gap-2 bg-card p-5 md:col-span-4 xl:col-span-1">
          <span className="text-[13px] text-muted-foreground">Wind you can count on, 9 hours in 10</span>
          <span className="text-3xl font-semibold tracking-tight tabular-nums">
            Forecast {under ? '−' : '+'} {formatGw(Math.abs(m.p90))}
          </span>
          <p className="text-sm">
            {m.count < SHORT_SAMPLE_HOURS && (
              <>
                <strong>Only {plural(m.count, 'hour')} compared</strong>, so treat this as a rough guide.{' '}
              </>
            )}
            {m.count >= SHORT_SAMPLE_HOURS && (
              <>
                {plural(m.count, 'hour')} at the {gate} gate.{' '}
              </>
            )}
            {m.count < hours.length && (
              <>
                Only {m.count} of {hours.length} hours had a forecast at this gate.{' '}
              </>
            )}
            9 times in 10, metered wind was {under ? 'no more than' : 'at least'}{' '}
            <strong className="tabular-nums">{formatMw(Math.abs(m.p90))}</strong> {under ? 'below' : 'above'} forecast.
            {windy.length > 0 && (
              <>
                {' '}
                Above 15 GW it missed by more in {windyMisses} of {plural(windy.length, 'hour')}.
              </>
            )}
          </p>
        </div>
        <Stat
          label="Typical miss (MAE)"
          value={formatMw(m.mae)}
          note={
            m.maePct === null
              ? 'Mean output was zero'
              : `${formatPercent(m.maePct)} of mean output, ${formatGw(m.meanActual)}`
          }
        />
        <Stat
          label="Bias, forecast − actual"
          value={formatSignedMw(m.bias)}
          note={
            Math.abs(m.bias) < 0.02 * m.meanActual
              ? 'Close to unbiased over this period'
              : m.bias > 0
                ? 'Forecast runs high: plan for less wind'
                : 'Forecast runs low: wind beats the plan'
          }
        />
        <Stat label="RMSE" value={formatMw(m.rmse)} note="Big misses weigh more" />
        <Stat
          label="Worst shortfall"
          value={formatMw(m.maxShortfall)}
          note={`${worst ? formatDateTime(worst.time) : '—'} · worst surplus ${formatMw(m.maxSurplus)}`}
        />
      </div>
    </section>
  )
}

interface StatProps {
  label: string
  value: string
  note: string
}

function Stat({ label, value, note }: StatProps) {
  return (
    <div className="flex flex-col gap-1.5 bg-card p-5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-2xl font-medium tracking-tight tabular-nums">{value}</span>
      <span className="text-[13px] text-muted-foreground">{note}</span>
    </div>
  )
}
