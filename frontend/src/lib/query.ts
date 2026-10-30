import { type AnalysisQuery, DELIVERY_FIRST, DELIVERY_LAST, GATE_PRESETS } from './api'
import { hhmmToMinutes, minutesToHhmm } from './format'

// Before 02:30 the only run available stops before hour 22
export const GATE_MIN_MINUTES = 2 * 60 + 30
export const GATE_MAX_MINUTES = 22 * 60 + 50
export const GATE_STEP = 10

const GATE = /^([01][0-9]|2[0-2]):[0-5][0-9]$/

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const ms = Date.parse(`${value}T00:00:00Z`)
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === value
}

export function snapGate(hhmm: string) {
  const stepped = Math.round(hhmmToMinutes(hhmm) / GATE_STEP) * GATE_STEP
  return minutesToHhmm(Math.min(GATE_MAX_MINUTES, Math.max(GATE_MIN_MINUTES, stepped)))
}

export function readQuery(search: string): AnalysisQuery {
  const params = new URLSearchParams(search)
  const inRange = (d: string | null): d is string =>
    d !== null && isRealDate(d) && d >= DELIVERY_FIRST && d <= DELIVERY_LAST
  const from = params.get('from')
  const to = params.get('to')
  const gate = params.get('gate')
  const dates = inRange(from) && inRange(to) && from <= to ? { from, to } : { from: DELIVERY_FIRST, to: DELIVERY_LAST }
  return { ...dates, gate: gate !== null && GATE.test(gate) ? snapGate(gate) : GATE_PRESETS[0].time }
}
