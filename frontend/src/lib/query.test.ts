import { describe, expect, it } from 'vitest'

import { readQuery, snapGate } from './query'

describe('readQuery', () => {
  it('uses the whole month and the N2EX gate by default', () => {
    expect(readQuery('')).toEqual({ from: '2026-01-02', to: '2026-02-01', gate: '09:50' })
  })

  it('accepts a valid shared link', () => {
    expect(readQuery('?from=2026-01-05&to=2026-01-11&gate=09:20')).toEqual({
      from: '2026-01-05',
      to: '2026-01-11',
      gate: '09:20',
    })
  })

  it.each(['2026-01-32', '20260105', '2026-01-05T10:00', '2025-12-31', '2026-02-02'])(
    'falls back to the full month for date %s',
    (bad) => {
      expect(readQuery(`?from=${bad}&to=2026-01-11`).from).toBe('2026-01-02')
    },
  )

  it('rejects a reversed range', () => {
    const q = readQuery('?from=2026-01-11&to=2026-01-05')
    expect([q.from, q.to]).toEqual(['2026-01-02', '2026-02-01'])
  })

  it('snaps the gate to what the slider can show', () => {
    expect(readQuery('?gate=22:55').gate).toBe('22:50')
    expect(readQuery('?gate=01:00').gate).toBe('02:30')
    expect(readQuery('?gate=09:55').gate).toBe('10:00')
    expect(readQuery('?gate=9am').gate).toBe('09:50')
    expect(readQuery('?gate=0٩:50').gate).toBe('09:50')
  })
})

describe('snapGate', () => {
  it('keeps values already on the grid', () => {
    expect(snapGate('09:50')).toBe('09:50')
  })
})
