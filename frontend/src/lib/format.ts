const UK = 'Europe/London'
const MINUS = '−'

const integer = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })
const dateTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: UK,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})
const day = new Intl.DateTimeFormat('en-GB', { timeZone: UK, day: 'numeric', month: 'short' })
const clock = new Intl.DateTimeFormat('en-GB', { timeZone: UK, hour: '2-digit', minute: '2-digit' })
// sv-SE gives "2026-01-01 23:00", which spreadsheets parse
const iso = new Intl.DateTimeFormat('sv-SE', {
  timeZone: UK,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const signOf = (n: number) => (n > 0 ? '+' : n < 0 ? MINUS : '')

export function formatMw(mw: number) {
  const rounded = Math.round(mw)
  return `${rounded < 0 ? MINUS : ''}${integer.format(Math.abs(rounded))} MW`
}

export function formatSignedMw(mw: number) {
  const rounded = Math.round(mw)
  return `${signOf(rounded)}${integer.format(Math.abs(rounded))} MW`
}

export function formatGw(mw: number, digits = 1) {
  const gw = Number((mw / 1000).toFixed(digits))
  return `${gw < 0 ? MINUS : ''}${Math.abs(gw).toFixed(digits)} GW`
}

export function formatGwTick(mw: number) {
  const gw = Number((mw / 1000).toFixed(1))
  return `${gw < 0 ? MINUS : ''}${Math.abs(gw)}`
}

export const formatHours = (hours: number) => `${Number(hours.toFixed(1))} h`
export const formatPercent = (value: number) => `${value.toFixed(1)}%`

export const formatDateTime = (value: string | number) => dateTime.format(new Date(value))
export const formatDay = (value: string | number) => day.format(new Date(value))
export const formatTime = (value: string | number) => clock.format(new Date(value))
export const formatIso = (value: string | number) => iso.format(new Date(value))

export const plainMw = (mw: number) => String(Math.round(mw))
export const plainSignedMw = (mw: number) => {
  const rounded = Math.round(mw)
  return rounded > 0 ? `+${rounded}` : String(rounded)
}

export const plural = (n: number, word: string) => `${integer.format(n)} ${word}${n === 1 ? '' : 's'}`

export const minutesToHhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export const hhmmToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
