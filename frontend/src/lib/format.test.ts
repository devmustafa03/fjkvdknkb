import { describe, expect, it } from 'vitest'

import {
  formatGw,
  formatHours,
  formatIso,
  formatMw,
  formatSignedMw,
  hhmmToMinutes,
  minutesToHhmm,
  plainSignedMw,
  plural,
} from './format'

describe('number formatting', () => {
  it('rounds before choosing the sign, so there is no −0', () => {
    expect(formatSignedMw(-0.4)).toBe('0 MW')
    expect(formatSignedMw(1727.04)).toBe('+1,727 MW')
    expect(formatSignedMw(-1200)).toBe('−1,200 MW')
    expect(formatMw(-0.2)).toBe('0 MW')
  })

  it('uses a real minus sign for gigawatts', () => {
    expect(formatGw(-4183.9)).toBe('−4.2 GW')
    expect(formatGw(-20)).toBe('0.0 GW')
  })

  it('keeps spreadsheet cells plain', () => {
    expect(plainSignedMw(2997)).toBe('+2997')
    expect(plainSignedMw(-1200)).toBe('-1200')
    expect(formatIso('2026-01-01T23:00:00Z')).toBe('2026-01-01 23:00')
  })

  it('shortens lead time and pluralises', () => {
    expect(formatHours(10.583333)).toBe('10.6 h')
    expect(plural(1, 'hour')).toBe('1 hour')
    expect(plural(744, 'hour')).toBe('744 hours')
  })
})

describe('hh:mm helpers', () => {
  it('round-trips', () => {
    expect(minutesToHhmm(hhmmToMinutes('09:50'))).toBe('09:50')
    expect(minutesToHhmm(150)).toBe('02:30')
  })
})
