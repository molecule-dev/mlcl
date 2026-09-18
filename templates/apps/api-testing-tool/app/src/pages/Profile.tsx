import { useEffect, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, SURFACE_PANEL } from '../branding.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import { fmtRelative } from '../lib/format.js'

const PANEL_BORDER = 'var(--color-border)'

interface CountRow {
  id: string
}

interface HistoryRow {
  id: string
  method?: string
  url?: string
  status_code?: number
  created_at?: string
}

function deriveDisplayName(user: (UserProfile & { email?: string }) | null): string {
  if (!user) return ''
  const cast = user as { name?: string; firstName?: string; lastName?: string; email?: string }
  if (cast.name) return cast.name
  if (cast.firstName || cast.lastName) {
    return [cast.firstName, cast.lastName].filter(Boolean).join(' ').trim()
  }
  return cast.email ?? ''
}

function deriveHandle(user: (UserProfile & { email?: string }) | null): string {
  if (!user) return ''
  const email = (user as { email?: string }).email
  if (!email) return ''
  return email.split('@')[0] ?? ''
}

function deriveInitial(name: string, fallback: string): string {
  const seed = (name || fallback).trim()
  return seed.length > 0 ? seed.charAt(0).toUpperCase() : '?'
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile & { email?: string; createdAt?: string }>()
  const [collectionCount, setCollectionCount] = useState<number | null>(null)
  const [requestCount, setRequestCount] = useState<number | null>(null)
  const [monitorCount, setMonitorCount] = useState<number | null>(null)
  const [recentHistory, setRecentHistory] = useState<HistoryRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<CountRow[]>('/api/collections').catch(() => ({ data: [] as CountRow[] })),
      http.get<CountRow[]>('/api/requests').catch(() => ({ data: [] as CountRow[] })),
      http.get<CountRow[]>('/api/monitors').catch(() => ({ data: [] as CountRow[] })),
      http.get<HistoryRow[]>('/api/history?limit=8').catch(() => ({ data: [] as HistoryRow[] })),
    ])
      .then(([cols, reqs, mons, hist]) => {
        if (cancelled) return
        setCollectionCount(Array.isArray(cols.data) ? cols.data.length : 0)
        setRequestCount(Array.isArray(reqs.data) ? reqs.data.length : 0)
        setMonitorCount(Array.isArray(mons.data) ? mons.data.length : 0)
        setRecentHistory(Array.isArray(hist.data) ? hist.data : [])
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t('nav.couldNotLoadProfile', {}, { defaultValue: 'Could not load profile.' }),
        )
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const displayName = deriveDisplayName(user ?? null)
  const handle = deriveHandle(user ?? null)
  const initial = deriveInitial(displayName, handle)
  const joined = (user as { createdAt?: string } | null)?.createdAt ?? null

  return (
    <div className={cm.cn('p-6')}>
      {/* Hero */}
      <section
        className={cm.cn('relative overflow-hidden rounded-[2rem] p-8 mb-8')}
        style={{
          backgroundImage:
            'linear-gradient(135deg, color-mix(in srgb, var(--color-success) 30%, transparent), color-mix(in srgb, var(--color-method-patch) 18%, transparent))',
          backgroundColor: SURFACE_PANEL,
          border: `1px solid ${PANEL_BORDER}`,
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 h-72 w-72 rounded-full blur-3xl pointer-events-none',
          )}
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 30%, transparent)' }}
          aria-hidden="true"
        />
        <div className={cm.cn('relative flex flex-wrap items-center gap-6')}>
          <div
            className={cm.cn(
              'h-24 w-24 rounded-full flex items-center justify-center font-extrabold text-5xl tracking-tighter shrink-0',
            )}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-text) 10%, transparent)',
              color: 'var(--color-text)',
              border: '2px solid color-mix(in srgb, var(--color-text) 20%, transparent)',
            }}
            aria-hidden="true"
          >
            {initial}
          </div>
          <div className={cm.cn('flex-1 min-w-0')}>
            {handle ? (
              <p
                className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
                style={{ color: 'var(--color-primary)' }}
              >
                {t('profile.eyebrow', { handle }, { defaultValue: '@{{handle}}' })}
              </p>
            ) : null}
            <h1
              className={cm.cn('text-4xl font-extrabold tracking-tight')}
              style={{ color: 'var(--color-text)' }}
            >
              {displayName ||
                t('profile.signedOut', {}, { defaultValue: 'Sign in to view your profile' })}
            </h1>
            {joined ? (
              <p
                className={cm.cn('mt-1 font-mono text-sm')}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t(
                  'profile.joined',
                  { when: fmtRelative(joined) },
                  { defaultValue: 'joined {{when}}' },
                )}
              </p>
            ) : null}
            <p
              className={cm.cn('mt-3 max-w-2xl text-sm')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t(
                'profile.bio',
                { app: APP_NAME },
                {
                  defaultValue:
                    'Your personal {{app}} workspace — pin collections, share environments, and monitor the APIs that ship product.',
                },
              )}
            </p>
          </div>
        </div>
      </section>

      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-3 mb-8')}>
        <MetricStatCard
          eyebrow={t('profile.metric.collections', {}, { defaultValue: 'Collections' })}
          value={collectionCount === null ? '—' : String(collectionCount)}
          icon="folder"
          tone="primary"
        />
        <MetricStatCard
          eyebrow={t('profile.metric.requests', {}, { defaultValue: 'Saved requests' })}
          value={requestCount === null ? '—' : String(requestCount)}
          icon="route"
          tone="info"
        />
        <MetricStatCard
          eyebrow={t('profile.metric.monitors', {}, { defaultValue: 'Monitors' })}
          value={monitorCount === null ? '—' : String(monitorCount)}
          icon="monitor_heart"
          tone="accent"
        />
      </section>

      {/* Recent activity (real history rows) */}
      <section
        className={cm.cn('rounded-2xl overflow-hidden')}
        style={{ backgroundColor: SURFACE_PANEL, border: `1px solid ${PANEL_BORDER}` }}
      >
        <header className={cm.cn('px-5 py-4 border-b')} style={{ borderColor: PANEL_BORDER }}>
          <h2
            className={cm.cn('text-lg font-extrabold tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('nav.recentActivity', {}, { defaultValue: 'Recent activity' })}
          </h2>
        </header>
        {recentHistory === null ? (
          <p
            className={cm.cn('px-5 py-6 text-sm')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('nav.loadingActivity', {}, { defaultValue: 'Loading activity…' })}
          </p>
        ) : error ? (
          <p className={cm.cn('px-5 py-6 text-sm')} style={{ color: 'var(--color-error)' }}>
            {error}
          </p>
        ) : recentHistory.length === 0 ? (
          <p
            className={cm.cn('px-5 py-6 text-sm')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t(
              'profile.noActivity',
              {},
              {
                defaultValue:
                  'No requests have been fired yet — head to the Workspace tab to make one.',
              },
            )}
          </p>
        ) : (
          <ul className={cm.cn('divide-y')} style={{ borderColor: PANEL_BORDER }}>
            {recentHistory.map((entry) => (
              <li
                key={entry.id}
                className={cm.cn('px-5 py-3 flex items-center gap-3 font-mono text-sm')}
                style={{
                  borderBottom: `1px solid ${PANEL_BORDER}`,
                  color: 'var(--color-text-primary)',
                }}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-base')}
                  style={{ color: 'var(--color-primary)' }}
                  aria-hidden="true"
                >
                  bolt
                </span>
                <span
                  className={cm.cn(
                    'font-mono text-[11px] font-extrabold uppercase tracking-widest min-w-[3rem]',
                  )}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {entry.method ?? 'GET'}
                </span>
                <span className={cm.cn('flex-1 truncate')}>{entry.url ?? ''}</span>
                <span
                  style={{
                    color:
                      (entry.status_code ?? 0) >= 400
                        ? 'var(--color-error)'
                        : 'var(--color-success)',
                  }}
                >
                  {entry.status_code ?? '—'}
                </span>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  {entry.created_at ? fmtRelative(entry.created_at) : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
