import { useEffect, useState } from 'react'

import { useHttpClient, useIsAuthenticated } from '@molecule/app-react'

export interface DashboardStats {
  completedLessons: number
  completedLessonsThisWeek: number
  totalLessons: number
  activeCourses: number
  averageScore: number | null
  graded: number
}

const EMPTY: DashboardStats = {
  completedLessons: 0,
  completedLessonsThisWeek: 0,
  totalLessons: 0,
  activeCourses: 0,
  averageScore: null,
  graded: 0,
}

/**
 * Fetches the per-user dashboard stats from `/api/me/stats`.
 *
 * Returns `{ stats, loading, error }`. While loading, `stats` is `null` so
 * the calling card can render its own skeleton/placeholder. On error, `stats`
 * stays `null` and `error` carries a human-readable message — cards should
 * fall through to a "no data yet" empty state instead of pretending the
 * numbers are real.
 */
export function useDashboardStats(): {
  stats: DashboardStats | null
  loading: boolean
  error: Error | null
} {
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setStats(null)
      setLoading(false)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res: unknown = await http.get<DashboardStats>('/api/me/stats')
        if (cancelled) return
        const data: DashboardStats =
          res && typeof res === 'object' && 'data' in res && (res as { data: unknown }).data
            ? (res as { data: DashboardStats }).data
            : (res as DashboardStats)
        setStats({ ...EMPTY, ...data })
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e : new Error(String(e)))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, isAuthenticated])

  return { stats, loading, error }
}
