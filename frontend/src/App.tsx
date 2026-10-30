import { AlertCircle, Check, Link2, Moon, Sun, Wind } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'

import { Controls } from '@/components/controls'
import { Kpis } from '@/components/kpis'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnalysis } from '@/hooks/use-analysis'
import { useTheme } from '@/hooks/use-theme'
import type { Analysis } from '@/lib/api'
import { formatGw, formatTime, plural } from '@/lib/format'
import { readQuery } from '@/lib/query'
import { cn } from '@/lib/utils'

// Figures should not wait for the heavy Recharts chunk
const GenerationChart = lazy(() => import('@/components/generation-chart'))
const HorizonChart = lazy(() => import('@/components/horizon-chart'))
const ErrorHistogram = lazy(() => import('@/components/error-histogram'))

const dayFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' })

export default function App() {
  const [query, setQuery] = useState(() => readQuery(window.location.search))
  const { data, error, loading, retry } = useAnalysis(query)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    window.history.replaceState(null, '', `?${new URLSearchParams({ ...query })}`)
  }, [query])

  const runTime = useMemo(() => {
    const first = data?.series.find((p) => p.publishTime !== null)
    return first?.publishTime ? formatTime(first.publishTime) : null
  }, [data])

  return (
    <div className="min-h-svh">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-12 max-w-[1200px] items-center gap-3 px-4 sm:px-6">
          <Wind className="size-5 text-[var(--series-forecast)]" aria-hidden />
          <span className="text-[15px] font-semibold">WindSight</span>
          <span className="hidden text-[13px] text-muted-foreground sm:inline">
            Elexon BMRS · decisions 1–31 Jan 2026
          </span>
          <div className="ml-auto flex items-center gap-1">
            <CopyLink />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-5 px-4 py-5 sm:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Day-ahead wind, January 2026</h1>
          {data ? (
            <p className="text-sm text-muted-foreground">{finding(data)}</p>
          ) : (
            <Skeleton className="h-5 w-full max-w-2xl" aria-hidden />
          )}
        </div>

        <Controls query={query} loading={loading} runTime={runTime} onChange={setQuery} />

        {error && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertTitle>Couldn't load wind data</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              {error}
              <Button size="sm" variant="outline" onClick={retry}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {data ? (
          <div
            className={cn('space-y-5 transition-opacity motion-reduce:transition-none', loading && 'opacity-60')}
            aria-busy={loading}
          >
            {data.metrics ? (
              <Kpis data={data} />
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No hours with both a forecast and a metered actual in this selection.
                </CardContent>
              </Card>
            )}
            <Suspense fallback={<Skeleton className="h-[408px]" />}>
              <GenerationChart data={data} />
            </Suspense>
            <div className="grid gap-5 lg:grid-cols-2">
              <Suspense fallback={<Skeleton className="h-[348px]" />}>
                <HorizonChart data={data} />
              </Suspense>
              <Suspense fallback={<Skeleton className="h-[348px]" />}>
                <ErrorHistogram data={data} />
              </Suspense>
            </div>
          </div>
        ) : (
          !error && <DashboardSkeleton />
        )}

        <Methodology />
      </main>
    </div>
  )
}

function finding(data: Analysis) {
  const m = data.metrics
  const days = `${dayFormat.format(new Date(data.deliveryFrom))} – ${dayFormat.format(new Date(data.deliveryTo))}`
  if (!m) return `${days}: no hours with both a forecast and a metered actual.`
  const gate = data.gate.slice(0, 5)
  return (
    `Delivery ${days}, ${plural(m.count, 'hour')} at the ${gate} gate. ` +
    `The forecast ran ${formatGw(Math.abs(m.bias))} ${m.bias >= 0 ? 'high' : 'low'} on average, ` +
    `and in 1 hour in 10 wind came in more than ${formatGw(Math.abs(m.p90))} ${m.p90 >= 0 ? 'below' : 'above'} it.`
  )
}

function CopyLink() {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard blocked: the address bar still has the link
    }
  }
  return (
    <Button variant="ghost" size="sm" onClick={copy} aria-live="polite">
      {copied ? <Check aria-hidden /> : <Link2 aria-hidden />}
      {copied ? 'Copied' : 'Copy link'}
    </Button>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading wind data" role="status">
      <Skeleton className="h-[164px]" />
      <Skeleton className="h-[408px]" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-[348px]" />
        <Skeleton className="h-[348px]" />
      </div>
    </div>
  )
}

function Methodology() {
  return (
    <Card>
      <CardContent className="grid gap-x-10 gap-y-3 text-sm text-muted-foreground md:grid-cols-2">
        <h2 className="text-base font-medium text-foreground md:col-span-2">How the numbers are made</h2>
        <p>
          <strong className="text-foreground">Actuals.</strong> Elexon FUELHH, fuel type WIND: half-hourly metered
          output of transmission-connected wind farms.
        </p>
        <p>
          <strong className="text-foreground">Forecasts.</strong> Elexon WINDFOR: the hourly national wind forecast,
          published 8 times a day and reaching about 3 days ahead.
        </p>
        <p>
          <strong className="text-foreground">Decision rule.</strong> Delivery day D runs 23:00 D−1 to 23:00 D UK time
          and is bought in the day-ahead auction on D−1. Each hour uses the latest run published at or before your
          decision time.
        </p>
        <p>
          <strong className="text-foreground">Error.</strong> Forecast − actual, compared on the hour. Positive means
          wind fell short and the buyer had to cover it. The band and the 9-in-10 figure use the P10 and P90 of errors
          over the days you selected, pooled across all wind levels.
        </p>
        <p className="md:col-span-2">
          <strong className="text-foreground">One caveat.</strong> WINDFOR sits about 15% above FUELHH even for hours
          that have already happened, so part of the bias comes from what the two datasets measure rather than from
          forecast skill. The buying decision is the same either way: expect less wind than the forecast says.
        </p>
      </CardContent>
    </Card>
  )
}
