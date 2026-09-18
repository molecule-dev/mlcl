import { useEffect, useState } from 'react'

/**
 * `useFlag('new-dashboard')` → whether that feature flag is on for the
 * signed-in user. The whole flag set is fetched once, on mount, from the
 * server's `/api/flags` endpoint (which evaluates each flag for the current
 * user via lib/flags.ts `isEnabled` and returns a `{ [name]: boolean }` map).
 *
 * A single shared request backs every caller: components can call `useFlag`
 * with different names and they all reuse ONE in-flight `/api/flags` fetch,
 * never one request per flag (see the README "don't check flags in tight
 * loops without caching" anti-pattern). Never read a server-only flag any
 * other way from the client — go through `/api/flags` (or `/api/me`).
 */

type FlagMap = Record<string, boolean>

// Module-level so the flag set is loaded once for the whole app, not once per
// hook instance. Set back to `null` if you ever need to force a re-fetch.
let flagsPromise: Promise<FlagMap> | null = null

function loadFlags(): Promise<FlagMap> {
  if (!flagsPromise) {
    flagsPromise = fetch('/api/flags')
      .then((r) => (r.ok ? (r.json() as Promise<FlagMap>) : {}))
      .catch(() => ({}))
  }
  return flagsPromise
}

export function useFlag(name: string): boolean {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    let active = true
    loadFlags().then((flags) => {
      if (active) setEnabled(Boolean(flags[name]))
    })
    return () => {
      active = false
    }
  }, [name])

  return enabled
}
