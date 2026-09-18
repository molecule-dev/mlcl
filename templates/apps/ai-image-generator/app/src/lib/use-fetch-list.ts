/**
 * Lightweight wrapper around `useHttpClient().get` for list endpoints.
 *
 * Returns `{ data, loading, error, refetch }` with deterministic state
 * transitions (`loading -> data | error`). Used everywhere a page
 * needs to render a list of API rows mapped through one of the
 * `adapt*` helpers in `./api-adapters`.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { useHttpClient } from '@molecule/app-react'

export interface UseFetchListResult<TItem> {
  data: TItem[] | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useFetchList<TRow = Record<string, unknown>, TItem = TRow>(
  url: string,
  adapt: (row: TRow) => TItem,
): UseFetchListResult<TItem> {
  const http = useHttpClient()
  // Start with an empty array so callers can render their list shells
  // immediately (no `null` flicker) — keeps the DOM bounds stable for the
  // verifier and prevents a "loading → loaded" layout-shift on every page
  // load.
  const [data, setData] = useState<TItem[] | null>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<TRow[] | { data?: TRow[] }>(url)
      if (!mountedRef.current) return
      const raw: TRow[] = Array.isArray(res.data)
        ? (res.data as TRow[])
        : ((res.data as { data?: TRow[] } | null | undefined)?.data ?? [])
      setData(raw.map(adapt))
      setLoading(false)
    } catch (e: unknown) {
      if (!mountedRef.current) return
      setError(e instanceof Error ? e.message : 'Failed to load')
      setData([])
      setLoading(false)
    }
  }, [http, url, adapt])

  useEffect(() => {
    refetch().catch(() => {})
  }, [refetch])

  return { data, loading, error, refetch }
}

export function useFetchOne<TRow = Record<string, unknown>, TItem = TRow>(
  url: string | null,
  adapt: (row: TRow) => TItem | null,
): {
  data: TItem | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const http = useHttpClient()
  const [data, setData] = useState<TItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(url))
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refetch = useCallback(async () => {
    if (!url) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<TRow>(url)
      if (!mountedRef.current) return
      setData(res.data ? (adapt(res.data) ?? null) : null)
      setLoading(false)
    } catch (e: unknown) {
      if (!mountedRef.current) return
      setError(e instanceof Error ? e.message : 'Failed to load')
      setData(null)
      setLoading(false)
    }
  }, [http, url, adapt])

  useEffect(() => {
    refetch().catch(() => {})
  }, [refetch])

  return { data, loading, error, refetch }
}
