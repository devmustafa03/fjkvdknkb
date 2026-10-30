import { describe, expect, it } from 'vitest'

import { HOUR, gwTicks, timeTicks } from './ticks'

describe('gwTicks', () => {
  it('picks a round step with at most 7 ticks', () => {
    expect(gwTicks(21_500)).toEqual([0, 5000, 10_000, 15_000, 20_000, 25_000])
    expect(gwTicks(2_400)).toEqual([0, 500, 1000, 1500, 2000, 2500])
    expect(gwTicks(0)).toEqual([0])
  })
})

describe('timeTicks', () => {
  const t = (iso: string) => Date.parse(iso)

  it('labels midnight every few days across a month', () => {
    const ticks = timeTicks(t('2026-01-01T23:00Z'), t('2026-02-01T22:30Z'))
    expect(ticks[0]).toBe(t('2026-01-03T00:00Z'))
    expect(ticks[1] - ticks[0]).toBe(4 * 24 * HOUR)
    expect(ticks.at(-1)).toBe(t('2026-01-31T00:00Z'))
  })

  it('keeps the midnight tick on a two-day span', () => {
    const ticks = timeTicks(t('2026-01-04T23:00Z'), t('2026-01-06T22:30Z'))
    expect(ticks).toContain(t('2026-01-06T00:00Z'))
    expect(ticks[1] - ticks[0]).toBe(6 * HOUR)
  })
})
