import { useEffect, useState } from 'react'

import { useHttpClient } from '@molecule/app-react'

interface QueueSummary {
  queued?: number
}

interface ApiNotification {
  id: string
  read_at: string | null
}

export interface SiftNavBadges {
  /** Items awaiting triage (sidebar Queue badge). */
  queued: number | null
  /** Unread notification count (sidebar Notifications badge). */
  unread: number | null
}

/**
 * Queue + notification badge counts for the navigation chrome.
 *
 * Shared by the desktop sidebar and the mobile drawer so both surfaces
 * agree. Fetch failures resolve to null (badge simply not shown) — the
 * nav must never block on the API.
 */
export function useSiftNavBadges(pathname: string): SiftNavBadges {
  const http = useHttpClient()
  const [badges, setBadges] = useState<SiftNavBadges>({ queued: null, unread: null })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<QueueSummary>('/api/moderation/stats/summary').catch(() => null),
      http.get<ApiNotification[]>('/api/notifications').catch(() => null),
    ])
      .then(([summary, notifs]) => {
        if (cancelled) return
        const queued = summary?.data?.queued
        const list = notifs?.data
        setBadges({
          queued: typeof queued === 'number' ? queued : null,
          unread: Array.isArray(list) ? list.filter((n) => !n.read_at).length : null,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http, pathname])

  return badges
}
