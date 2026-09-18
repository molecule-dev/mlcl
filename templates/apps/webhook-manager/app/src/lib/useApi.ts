/**
 * Tiny, dependency-free fetch hook for authenticated `/api/*` endpoints.
 *
 * Returns `{ data, error, loading, refetch }` so pages can render
 * loading skeletons / empty states / errors without each page re-implementing
 * the same boilerplate.
 *
 * - Uses the bonded http client (which inherits the JWT bearer token wired
 *   in main.tsx).
 * - Re-runs whenever any value in `deps` changes.
 * - On unmount, the resolver short-circuits so we don't setState after
 *   teardown.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { getClient } from '@molecule/app-http'

export interface UseApiResult<T> {
  data: T | null
  error: string | null
  loading: boolean
  refetch: () => void
}

export function useApi<T>(path: string | null, deps: ReadonlyArray<unknown> = []): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(path !== null)
  const [reloadKey, setReloadKey] = useState(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!path) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const client = getClient()
    client
      .get<T>(path)
      .then((res) => {
        if (!mounted.current) return
        setData(res.data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!mounted.current) return
        const msg = err instanceof Error ? err.message : 'Request failed'
        setError(msg)
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- path + reloadKey control fetch identity; ...deps is caller-supplied
  }, [path, reloadKey, ...deps])

  const refetch = useCallback(() => setReloadKey((k) => k + 1), [])

  return { data, error, loading, refetch }
}
