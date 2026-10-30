import { useCallback, useEffect, useState } from 'react'

import { type Analysis, type AnalysisQuery, fetchAnalysis } from '@/lib/api'

interface Settled {
  key: string | null
  data: Analysis | null
  error: string | null
}

export function useAnalysis({ from, to, gate }: AnalysisQuery) {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled>({ key: null, data: null, error: null })
  const key = `${from}|${to}|${gate}|${attempt}`

  useEffect(() => {
    const controller = new AbortController()
    fetchAnalysis({ from, to, gate }, controller.signal)
      .then((data) => setSettled({ key, data, error: null }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        // Stale figures under new controls would mislead, so drop them
        setSettled({ key, data: null, error: err instanceof Error ? err.message : String(err) })
      })
    return () => controller.abort()
  }, [from, to, gate, key])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const current = settled.key === key
  return { data: settled.data, error: current ? settled.error : null, loading: !current, retry }
}
