// Mirrors backend/app/schemas.py by hand

export interface SeriesPoint {
  time: string
  actual: number | null
  forecast: number | null
  publishTime: string | null
  horizonHours: number | null
  error: number | null
  bandLow: number | null
  bandHigh: number | null
}

export interface Metrics {
  count: number
  meanActual: number
  meanForecast: number
  mae: number
  rmse: number
  bias: number
  maePct: number | null
  p10: number
  p50: number
  p90: number
  maxShortfall: number
  maxSurplus: number
}

export interface HorizonBucket {
  hours: number
  count: number
  mae: number
  p90Abs: number
}

export interface HistogramBin {
  start: number
  end: number
  count: number
}

export interface Analysis {
  deliveryFrom: string
  deliveryTo: string
  gate: string
  windowStart: string
  windowEnd: string
  series: SeriesPoint[]
  metrics: Metrics | null
  horizonProfile: HorizonBucket[]
  histogram: HistogramBin[]
}

export interface AnalysisQuery {
  from: string
  to: string
  gate: string
}

// Must match DELIVERY_FIRST/LAST in backend/app/elexon.py
export const DELIVERY_FIRST = '2026-01-02'
export const DELIVERY_LAST = '2026-02-01'

export const GATE_PRESETS = [
  { label: 'N2EX', time: '09:50' },
  { label: 'EPEX', time: '09:20' },
] as const

export const analysisUrl = (query: AnalysisQuery) => `/api/v1/wind/analysis?${new URLSearchParams({ ...query })}`

export async function fetchAnalysis(query: AnalysisQuery, signal: AbortSignal): Promise<Analysis> {
  let res: Response
  try {
    res = await fetch(analysisUrl(query), { signal })
  } catch (err) {
    if (signal.aborted) throw err
    throw new Error("Can't reach the service. Check your connection and retry.")
  }
  if (!res.ok) {
    const body: { error?: { message?: string } } | null = await res.json().catch(() => null)
    throw new Error(body?.error?.message ?? 'The service returned an error. Please retry in a moment.')
  }
  return res.json() as Promise<Analysis>
}
