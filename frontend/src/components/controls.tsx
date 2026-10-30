import { format, parseISO } from 'date-fns'
import { CalendarDays, Loader2 } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useMediaQuery } from '@/hooks/use-media-query'
import { type AnalysisQuery, DELIVERY_FIRST, DELIVERY_LAST, GATE_PRESETS } from '@/lib/api'
import { hhmmToMinutes, minutesToHhmm } from '@/lib/format'
import { GATE_MAX_MINUTES, GATE_MIN_MINUTES, GATE_STEP } from '@/lib/query'

const Calendar = lazy(() => import('@/components/ui/calendar').then((m) => ({ default: m.Calendar })))

const FIRST = parseISO(DELIVERY_FIRST)
const LAST = parseISO(DELIVERY_LAST)
const COMMIT_DELAY_MS = 250
const toIso = (d: Date) => format(d, 'yyyy-MM-dd')

interface ControlsProps {
  query: AnalysisQuery
  loading: boolean
  runTime: string | null
  onChange: (query: AnalysisQuery) => void
}

export function Controls({ query, loading, runTime, onChange }: ControlsProps) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-10">
      <DeliveryDays query={query} onChange={onChange} />
      <GateClosure query={query} runTime={runTime} onChange={onChange} />
      <p className="min-h-5 text-[13px] text-muted-foreground lg:ml-auto lg:self-end" role="status" aria-live="polite">
        {loading && (
          <>
            <Loader2 className="mr-1.5 inline size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
            Updating…
          </>
        )}
      </p>
    </div>
  )
}

function rangeLabel(from: Date, to: Date) {
  if (from.getTime() === to.getTime()) return format(from, 'd MMM yyyy')
  return `${format(from, 'd MMM')} – ${format(to, 'd MMM yyyy')}`
}

function DeliveryDays({ query, onChange }: Pick<ControlsProps, 'query' | 'onChange'>) {
  const [open, setOpen] = useState(false)
  const [first, setFirst] = useState<Date | undefined>()
  const oneMonth = useMediaQuery('(max-width: 639px)')
  const from = parseISO(query.from)
  const to = parseISO(query.to)

  const apply = (a: Date, b: Date) => {
    const [start, end] = a <= b ? [a, b] : [b, a]
    onChange({ ...query, from: toIso(start), to: toIso(end) })
    setOpen(false)
  }
  // Closing before the second pick cancels, as Escape should
  const handleOpenChange = (next: boolean) => {
    setFirst(undefined)
    setOpen(next)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id="delivery-label" className="text-[13px] text-muted-foreground">
        Delivery days
      </span>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="delivery-button"
            variant="outline"
            size="lg"
            className="w-full justify-start font-normal tabular-nums sm:w-60"
            aria-labelledby="delivery-label delivery-button"
          >
            <CalendarDays aria-hidden />
            {rangeLabel(from, to)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto max-w-[calc(100vw-1rem)] p-0" align="start" aria-label="Choose delivery days">
          <Suspense fallback={<div className="h-[22rem] w-72" />}>
            <Calendar
              mode="range"
              required
              numberOfMonths={oneMonth ? 1 : 2}
              defaultMonth={first ?? from}
              startMonth={FIRST}
              endMonth={LAST}
              disabled={[{ before: FIRST }, { after: LAST }]}
              selected={first ? { from: first, to: undefined } : { from, to }}
              onSelect={(_range, day) => (first ? apply(first, day) : setFirst(day))}
              weekStartsOn={1}
            />
          </Suspense>
          <div className="flex items-center justify-between gap-4 border-t px-3 py-2">
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {first ? `From ${format(first, 'd MMM')}. Now pick the last day.` : 'Pick the first day, then the last.'}
            </span>
            <Button size="sm" variant="ghost" onClick={() => apply(FIRST, LAST)}>
              Whole month
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function GateClosure({ query, runTime, onChange }: Omit<ControlsProps, 'loading'>) {
  const [minutes, setMinutes] = useState(() => hhmmToMinutes(query.gate))
  const [seenGate, setSeenGate] = useState(query.gate)
  const timer = useRef<number>(undefined)

  // Follow presets, shared links and cancelled drags
  if (query.gate !== seenGate) {
    setSeenGate(query.gate)
    setMinutes(hhmmToMinutes(query.gate))
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const change = (value: number) => onChange({ ...query, gate: minutesToHhmm(value) })
  // Held arrow keys would otherwise fire one request per step
  const commitSoon = (value: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => change(value), COMMIT_DELAY_MS)
  }

  const label = minutesToHhmm(minutes)
  const preset = GATE_PRESETS.find((p) => p.time === label)?.time ?? ''

  return (
    <div className="flex flex-1 flex-col gap-1.5 lg:max-w-xl">
      <span id="gate-label" className="text-[13px] text-muted-foreground">
        Decision time on D−1 <strong className="font-semibold text-foreground tabular-nums">{label}</strong>
        {runTime && <span className="tabular-nums"> · using the {runTime} forecast run</span>}
      </span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
        <div className="flex-1">
          <Slider
            min={GATE_MIN_MINUTES}
            max={GATE_MAX_MINUTES}
            step={GATE_STEP}
            value={[minutes]}
            onValueChange={([v]) => setMinutes(v)}
            onValueCommit={([v]) => commitSoon(v)}
            aria-labelledby="gate-label"
            aria-valuetext={label}
            className="py-3"
          />
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums" aria-hidden>
            <span>{minutesToHhmm(GATE_MIN_MINUTES)}</span>
            <span>{minutesToHhmm(GATE_MAX_MINUTES)}</span>
          </div>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={preset}
          aria-label="Auction gate presets"
          onValueChange={(time) => {
            if (!time) return
            window.clearTimeout(timer.current)
            setMinutes(hhmmToMinutes(time))
            change(hhmmToMinutes(time))
          }}
        >
          {GATE_PRESETS.map((p) => (
            <ToggleGroupItem key={p.label} value={p.time} className="tabular-nums">
              {p.label} {p.time}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  )
}
