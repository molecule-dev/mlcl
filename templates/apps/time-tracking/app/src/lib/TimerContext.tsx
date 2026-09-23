import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient } from '@molecule/app-react'

import type { ApiTimeEntry } from './types.js'
import { unwrapSingle } from './unwrap.js'

interface StartTimerInput {
  description?: string
  project_id?: string | null
  is_billable?: boolean
}

interface UpdateRunningInput {
  description?: string
  project_id?: string | null
  is_billable?: boolean
}

interface TimerContextValue {
  running: ApiTimeEntry | null
  elapsedSeconds: number
  loading: boolean
  start: (input?: StartTimerInput) => Promise<ApiTimeEntry | null>
  stop: () => Promise<ApiTimeEntry | null>
  updateRunning: (input: UpdateRunningInput) => Promise<ApiTimeEntry | null>
  refresh: () => Promise<void>
  /** Bump after every entry-affecting mutation so consumers can refetch. */
  entriesVersion: number
}

const TimerContext = createContext<TimerContextValue | null>(null)

export function TimerProvider({ children }: { children: ReactNode }) {
  const http = useHttpClient()
  const { isAuthenticated } = useAuth()
  const [running, setRunning] = useState<ApiTimeEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [entriesVersion, setEntriesVersion] = useState(0)
  const tickRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setRunning(null)
      return
    }
    setLoading(true)
    try {
      const res = await http.get('/api/entries/running')
      const value = unwrapSingle<ApiTimeEntry>(res)
      setRunning(value && value.id ? value : null)
    } catch (_error) {
      // best-effort: if the running-entry fetch fails, treat as no running timer
      setRunning(null)
    } finally {
      setLoading(false)
    }
  }, [http, isAuthenticated])

  // Initial fetch + refetch when auth flips.
  useEffect(() => {
    void refresh()
  }, [refresh])

  // 1 Hz tick of elapsed time while a timer is running.
  useEffect(() => {
    if (!running) {
      setElapsedSeconds(0)
      if (tickRef.current != null) {
        window.clearInterval(tickRef.current)
        tickRef.current = null
      }
      return
    }
    const startedMs = new Date(running.started_at).getTime()
    const update = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedMs) / 1000)))
    }
    update()
    tickRef.current = window.setInterval(update, 1000)
    return () => {
      if (tickRef.current != null) {
        window.clearInterval(tickRef.current)
        tickRef.current = null
      }
    }
  }, [running])

  const start = useCallback(
    async (input: StartTimerInput = {}): Promise<ApiTimeEntry | null> => {
      const res = await http.post('/api/entries/start', {
        description: input.description ?? '',
        project_id: input.project_id ?? null,
        is_billable: input.is_billable ?? true,
      })
      const value = unwrapSingle<ApiTimeEntry>(res)
      if (value) setRunning(value)
      setEntriesVersion((n) => n + 1)
      void track({
        name: 'timer.started',
        properties: {
          entry_id: value?.id ?? null,
          project_id: input.project_id ?? value?.project_id ?? null,
          is_billable: input.is_billable ?? true,
        },
      })
      return value
    },
    [http],
  )

  const stop = useCallback(async (): Promise<ApiTimeEntry | null> => {
    if (!running) return null
    const res = await http.post('/api/entries/stop')
    const value = unwrapSingle<ApiTimeEntry>(res)
    setRunning(null)
    setEntriesVersion((n) => n + 1)
    void track({
      name: 'timer.stopped',
      properties: {
        entry_id: value?.id ?? running.id,
        duration_seconds: value?.duration_seconds ?? null,
        project_id: running.project_id ?? null,
      },
    })
    return value
  }, [http, running])

  const updateRunning = useCallback(
    async (input: UpdateRunningInput): Promise<ApiTimeEntry | null> => {
      if (!running) return null
      const res = await http.put(`/api/entries/${running.id}`, input)
      const value = unwrapSingle<ApiTimeEntry>(res)
      if (value) setRunning(value)
      setEntriesVersion((n) => n + 1)
      void track({
        name: 'entry.updated',
        properties: {
          entry_id: value?.id ?? running.id,
          project_id: value?.project_id ?? running.project_id ?? null,
          assigned_project: input.project_id != null,
        },
      })
      if (input.project_id != null) {
        void track({
          name: 'project.tracked',
          properties: { project_id: input.project_id, entry_id: value?.id ?? running.id },
        })
      }
      return value
    },
    [http, running],
  )

  const value = useMemo<TimerContextValue>(
    () => ({
      running,
      elapsedSeconds,
      loading,
      start,
      stop,
      updateRunning,
      refresh,
      entriesVersion,
    }),
    [running, elapsedSeconds, loading, start, stop, updateRunning, refresh, entriesVersion],
  )

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext)
  if (!ctx) {
    throw new Error('useTimer must be used inside a TimerProvider')
  }
  return ctx
}
