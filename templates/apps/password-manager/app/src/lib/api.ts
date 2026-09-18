/**
 * Vault API client. Wraps `useHttpClient` with typed helpers for
 * /api/items, /api/vaults, /api/security, /api/shares, /api/two-factor,
 * and /api/recovery-keys. Used by every authenticated page so the UI
 * round-trips real backend state instead of static placeholders.
 */
import { useCallback, useEffect, useState } from 'react'

import { useHttpClient } from '@molecule/app-react'

export interface VaultItemSummary {
  id: string
  vault_id: string | null
  name: string
  type: string
  username: string | null
  url: string | null
  icon: string | null
  folder: string | null
  favorite: boolean
  is_trashed: boolean
  updated_at: string
  trashed_at?: string | null
}

export interface VaultItemDetail extends VaultItemSummary {
  password: string | null
  notes: string | null
  custom_fields: unknown[]
  created_at: string
}

export interface Vault {
  id: string
  owner_id: string
  name: string
  description: string | null
  icon: string | null
  created_at: string
  updated_at: string
}

export interface SecurityFinding {
  id: string
  owner_id: string
  item_id: string | null
  kind: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  detected_at: string
  dismissed: boolean
}

export interface VaultShare {
  id: string
  vault_id: string
  shared_by: string
  shared_with_user_id: string
  permission: 'view' | 'edit' | 'admin'
  created_at: string
  accepted_at: string | null
}

export interface TwoFactorStatus {
  enrolled: boolean
  method?: string
  verified_at?: string | null
}

interface ListState<T> {
  data: T[]
  loading: boolean
  error: string | null
}

function getPayload<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) {
    return (res as { data: T }).data
  }
  return res as T
}

/** Fetch a list and re-fetch when refreshKey changes. */
function useList<T>(
  buildUrl: () => string,
  refreshKey = 0,
): ListState<T> & {
  refetch: () => Promise<void>
  setData: React.Dispatch<React.SetStateAction<T[]>>
} {
  const http = useHttpClient()
  const [state, setState] = useState<ListState<T>>({ data: [], loading: true, error: null })

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const res = await http.get<unknown>(buildUrl())
      const payload = getPayload<unknown>(res)
      const items = Array.isArray(payload) ? (payload as T[]) : []
      setState({ data: items, loading: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed'
      setState({ data: [], loading: false, error: message })
    }
  }, [http, buildUrl])

  useEffect(() => {
    void refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch is stable; re-run only on refreshKey change
  }, [refreshKey])

  return {
    ...state,
    refetch,
    setData: (updater) =>
      setState((prev) => ({
        ...prev,
        data: typeof updater === 'function' ? (updater as (p: T[]) => T[])(prev.data) : updater,
      })),
  }
}

interface ItemQuery {
  vault_id?: string
  type?: string
  folder?: string
  is_trashed?: boolean
  search?: string
}

export function useVaultItems(
  query: ItemQuery = {},
  refreshKey = 0,
): ListState<VaultItemSummary> & {
  refetch: () => Promise<void>
  setData: React.Dispatch<React.SetStateAction<VaultItemSummary[]>>
} {
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (query.vault_id) params.set('vault_id', query.vault_id)
    if (query.type) params.set('type', query.type)
    if (query.folder) params.set('folder', query.folder)
    if (query.is_trashed !== undefined) params.set('is_trashed', String(query.is_trashed))
    if (query.search) params.set('search', query.search)
    const qs = params.toString()
    return '/api/items' + (qs ? `?${qs}` : '')
  }, [query.vault_id, query.type, query.folder, query.is_trashed, query.search])
  return useList<VaultItemSummary>(buildUrl, refreshKey)
}

export function useTrashedItems(refreshKey = 0): ListState<VaultItemSummary> & {
  refetch: () => Promise<void>
  setData: React.Dispatch<React.SetStateAction<VaultItemSummary[]>>
} {
  return useVaultItems({ is_trashed: true }, refreshKey)
}

export function useVaults(refreshKey = 0): ListState<Vault> & {
  refetch: () => Promise<void>
  setData: React.Dispatch<React.SetStateAction<Vault[]>>
} {
  const buildUrl = useCallback(() => '/api/vaults', [])
  return useList<Vault>(buildUrl, refreshKey)
}

export function useSecurityFindings(refreshKey = 0): ListState<SecurityFinding> & {
  refetch: () => Promise<void>
  setData: React.Dispatch<React.SetStateAction<SecurityFinding[]>>
} {
  const buildUrl = useCallback(() => '/api/security/findings', [])
  return useList<SecurityFinding>(buildUrl, refreshKey)
}

export function useIncomingShares(refreshKey = 0): ListState<VaultShare> & {
  refetch: () => Promise<void>
  setData: React.Dispatch<React.SetStateAction<VaultShare[]>>
} {
  const buildUrl = useCallback(() => '/api/shares/incoming', [])
  return useList<VaultShare>(buildUrl, refreshKey)
}

export function useOutgoingShares(refreshKey = 0): ListState<VaultShare> & {
  refetch: () => Promise<void>
  setData: React.Dispatch<React.SetStateAction<VaultShare[]>>
} {
  const buildUrl = useCallback(() => '/api/shares/outgoing', [])
  return useList<VaultShare>(buildUrl, refreshKey)
}

export function useItemDetail(
  id: string | undefined,
  refreshKey = 0,
): {
  item: VaultItemDetail | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const http = useHttpClient()
  const [item, setItem] = useState<VaultItemDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!id) {
      setItem(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<unknown>(`/api/items/${id}`)
      setItem(getPayload<VaultItemDetail>(res))
      setLoading(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load item'
      setError(message)
      setLoading(false)
    }
  }, [http, id])

  useEffect(() => {
    void refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch is stable; re-run only on id / refreshKey change
  }, [id, refreshKey])

  return { item, loading, error, refetch }
}

export function useTwoFactorStatus(refreshKey = 0): {
  status: TwoFactorStatus | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const http = useHttpClient()
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await http.get<unknown>('/api/two-factor/status')
      setStatus(getPayload<TwoFactorStatus>(res))
      setLoading(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed'
      setError(message)
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch is stable; re-run only on refreshKey change
  }, [refreshKey])

  return { status, loading, error, refetch }
}
