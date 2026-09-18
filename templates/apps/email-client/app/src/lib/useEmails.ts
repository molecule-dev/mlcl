import { useCallback, useEffect, useState } from 'react'

import { useHttpClient } from '@molecule/app-react'

import type { EmailCounts, EmailFolder, EmailLabel, EmailRow } from './api.js'

export interface ListOptions {
  folder?: string
  /** Filter by `email_labels.id`. Server joins the email_label_assignments
   *  table to find rows the label is attached to (NOT the legacy 1-to-1
   *  `emails.label_id` column, which is only set during seeding). */
  label?: string
  is_starred?: boolean
  is_read?: boolean
  search?: string
  limit?: number
  /** Increment to force a refetch. */
  refreshKey?: number
}

interface ListState {
  emails: EmailRow[]
  loading: boolean
  error: string | null
}

interface ListResult extends ListState {
  refetch: () => Promise<void>
  setEmails: React.Dispatch<React.SetStateAction<EmailRow[]>>
}

/**
 * Fetch a list of emails for the current user. Re-runs whenever any of
 * the filter options change. Exposes `refetch` so callers can re-pull
 * after a mutation (star, move, delete).
 */
export function useEmails(opts: ListOptions = {}): ListResult {
  const http = useHttpClient()
  const [state, setState] = useState<ListState>({ emails: [], loading: true, error: null })

  const refetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const params = new URLSearchParams()
      if (opts.folder) params.set('folder', opts.folder)
      if (opts.label) params.set('label', opts.label)
      if (opts.is_starred !== undefined) params.set('is_starred', String(opts.is_starred))
      if (opts.is_read !== undefined) params.set('is_read', String(opts.is_read))
      if (opts.search) params.set('search', opts.search)
      if (opts.limit) params.set('limit', String(opts.limit))
      const qs = params.toString()
      const url = '/api/emails' + (qs ? `?${qs}` : '')
      const res = await http.get<unknown>(url)
      const payload = (res as { data?: unknown }).data ?? res
      const items = Array.isArray(payload) ? (payload as EmailRow[]) : []
      setState({ emails: items, loading: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load emails'
      setState({ emails: [], loading: false, error: message })
    }
  }, [http, opts.folder, opts.label, opts.is_starred, opts.is_read, opts.search, opts.limit])

  useEffect(() => {
    void refetch()
  }, [refetch, opts.refreshKey])

  return {
    ...state,
    refetch,
    setEmails: (updater) =>
      setState((prev) => ({
        ...prev,
        emails:
          typeof updater === 'function'
            ? (updater as (e: EmailRow[]) => EmailRow[])(prev.emails)
            : updater,
      })),
  }
}

interface CountsResult {
  counts: EmailCounts | null
  refetchCounts: () => Promise<void>
}

const ZERO: EmailCounts = {
  inbox: 0,
  sent: 0,
  drafts: 0,
  trash: 0,
  spam: 0,
  archive: 0,
  starred: 0,
  unread: 0,
  total: 0,
}

export function useEmailCounts(refreshKey: number = 0): CountsResult {
  const http = useHttpClient()
  const [counts, setCounts] = useState<EmailCounts | null>(null)

  const refetch = useCallback(async () => {
    try {
      const res = await http.get<unknown>('/api/emails/counts')
      const payload = (res as { data?: unknown }).data ?? res
      const c =
        typeof payload === 'object' && payload !== null ? (payload as Partial<EmailCounts>) : {}
      setCounts({ ...ZERO, ...(c as EmailCounts) })
    } catch (_error) {
      // counts are best-effort; reset to zero so the UI stays functional
      setCounts({ ...ZERO })
    }
  }, [http])

  useEffect(() => {
    void refetch()
  }, [refetch, refreshKey])

  return { counts, refetchCounts: refetch }
}

export function useLabels(): { labels: EmailLabel[]; refetchLabels: () => Promise<void> } {
  const http = useHttpClient()
  const [labels, setLabels] = useState<EmailLabel[]>([])

  const refetch = useCallback(async () => {
    try {
      const res = await http.get<unknown>('/api/labels')
      const payload = (res as { data?: unknown }).data ?? res
      setLabels(Array.isArray(payload) ? (payload as EmailLabel[]) : [])
    } catch (_error) {
      // labels are best-effort; empty list keeps the UI functional
      setLabels([])
    }
  }, [http])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { labels, refetchLabels: refetch }
}

interface StorageUsage {
  used_bytes: number
  quota_bytes: number
  email_count: number
}

export function useStorageUsage(refreshKey: number = 0): {
  storage: StorageUsage | null
  refetchStorage: () => Promise<void>
} {
  const http = useHttpClient()
  const [storage, setStorage] = useState<StorageUsage | null>(null)

  const refetch = useCallback(async () => {
    try {
      const res = await http.get<unknown>('/api/emails/storage')
      const payload = (res as { data?: unknown }).data ?? res
      if (
        payload &&
        typeof payload === 'object' &&
        'used_bytes' in (payload as Record<string, unknown>) &&
        'quota_bytes' in (payload as Record<string, unknown>)
      ) {
        setStorage(payload as StorageUsage)
      } else {
        setStorage(null)
      }
    } catch (_error) {
      // storage usage is best-effort; null hides the widget gracefully
      setStorage(null)
    }
  }, [http])

  useEffect(() => {
    void refetch()
  }, [refetch, refreshKey])

  return { storage, refetchStorage: refetch }
}

export function useFolders(): { folders: EmailFolder[]; refetchFolders: () => Promise<void> } {
  const http = useHttpClient()
  const [folders, setFolders] = useState<EmailFolder[]>([])

  const refetch = useCallback(async () => {
    try {
      const res = await http.get<unknown>('/api/folders')
      const payload = (res as { data?: unknown }).data ?? res
      setFolders(Array.isArray(payload) ? (payload as EmailFolder[]) : [])
    } catch (_error) {
      // folders are best-effort; empty list keeps the UI functional
      setFolders([])
    }
  }, [http])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { folders, refetchFolders: refetch }
}
