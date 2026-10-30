export const HOUR = 3_600_000

export function gwTicks(maxMw: number): number[] {
  const step = [500, 1000, 2000, 5000].find((s) => maxMw / s <= 6) ?? 10_000
  return Array.from({ length: Math.ceil(maxMw / step) + 1 }, (_, i) => i * step)
}

export function timeTicks(start: number, end: number): number[] {
  const days = (end - start) / (24 * HOUR)
  // 6-hourly keeps the midnight tick on narrow screens
  const step = days <= 2 ? 6 * HOUR : Math.ceil(days / 10) * 24 * HOUR
  const first = Math.ceil(start / step) * step
  return Array.from({ length: Math.floor((end - first) / step) + 1 }, (_, i) => first + i * step)
}
