import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EnvironmentBadge, type EnvTone } from '../components/EnvironmentBadge.js'
import { FlagRow, type FlagRowData } from '../components/FlagRow.js'

/**
 * Flags page — primary list view. Real /api/flags read, with filter chips
 * by env / state, search input, and inline toggle support.
 */

interface FlagApi {
  id: string
  key: string
  name: string
  description?: string
  flag_type?: 'boolean' | 'multivariate' | 'string' | 'number'
  state?: 'on' | 'off' | 'killed' | 'scheduled'
  rollout_percentage?: number
  is_enabled?: boolean
  environment?: string | null
  stale_days?: number
  updated_at?: string
  updated_by?: string
}

const ENV_FILTERS: ReadonlyArray<{ key: 'all' | EnvTone; defaultLabel: string }> = [
  { key: 'all', defaultLabel: 'All environments' },
  { key: 'production', defaultLabel: 'Production' },
  { key: 'staging', defaultLabel: 'Staging' },
  { key: 'development', defaultLabel: 'Development' },
] as const

const STATE_FILTERS = ['all', 'on', 'off', 'killed'] as const
type StateFilter = (typeof STATE_FILTERS)[number]

const ENV_TONES: ReadonlyArray<EnvTone> = ['production', 'staging', 'development', 'custom']
const toEnvTone = (s: unknown): EnvTone =>
  ENV_TONES.includes(s as EnvTone) ? (s as EnvTone) : 'production'

const shape = (row: FlagApi): FlagRowData => ({
  id: row.id,
  key: row.key,
  name: row.name,
  description: row.description,
  flag_type: row.flag_type ?? 'boolean',
  state:
    row.state === 'killed'
      ? 'killed'
      : row.state === 'scheduled'
        ? 'scheduled'
        : row.is_enabled
          ? 'on'
          : 'off',
  rollout_percentage: row.rollout_percentage ?? 0,
  environments: row.environment ? [toEnvTone(row.environment)] : ['production'],
  updated_at: row.updated_at,
  updated_by: row.updated_by,
  stale_days: row.stale_days,
})

export function Flags() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [flags, setFlags] = useState<FlagRowData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [envFilter, setEnvFilter] = useState<'all' | EnvTone>('all')
  const [stateFilter, setStateFilter] = useState<StateFilter>('all')
  // The layout's header search navigates to /flags?q=… — honor that param
  // so both search boxes drive the same filter.
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')

  useEffect(() => {
    setSearch(searchParams.get('q') ?? '')
  }, [searchParams])

  const reload = async () => {
    try {
      const res = await http.get<FlagApi[]>('/api/flags')
      const arr = Array.isArray(res.data) ? res.data : []
      setFlags(arr.map(shape))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    }
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await reload()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const onToggle = async (flag: FlagRowData) => {
    if (!flag.id) return
    try {
      await http.put(`/api/flags/${flag.id}/toggle`, {})
      await reload()
    } catch (_error) {
      // Surface as a row-level error: re-throw via state if needed; for now silently re-fetch.
      await reload()
    }
  }

  const visible = flags.filter((f) => {
    if (envFilter !== 'all' && !f.environments.includes(envFilter)) return false
    if (stateFilter !== 'all' && f.state !== stateFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!f.key.toLowerCase().includes(q) && !f.name.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))} data-mol-id="page-flags">
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <p
          className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
          style={{ color: 'var(--color-text-link)' }}
        >
          {t('flags.kicker', {}, { defaultValue: '// /flags' })}
        </p>
        <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
          <div>
            <h1 className={cm.cn('text-3xl font-extrabold tracking-tight text-on-surface')}>
              {t('flags.heading', {}, { defaultValue: 'Feature flags' })}
            </h1>
            <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>
              {t(
                'flags.subheading',
                { count: flags.length },
                { defaultValue: '{{count}} flags across all environments' },
              )}
            </p>
          </div>
          <Link
            to="/flags/new"
            className={cm.cn(
              'inline-flex items-center gap-1.5 rounded-md px-4 py-2 font-mono text-sm font-bold transition-colors',
            )}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary-cta)',
            }}
            data-mol-id="flags-new-link"
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              add
            </span>
            {t('flags.newFlag', {}, { defaultValue: 'New flag' })}
          </Link>
        </div>
      </header>

      <div
        className={cm.cn('rounded-xl px-4 py-3')}
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid rgba(30, 41, 59, 0.7)',
        }}
      >
        <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
          <div className={cm.cn('relative flex-1 min-w-[240px]')}>
            <span
              className={cm.cn(
                'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base',
              )}
              aria-hidden="true"
            >
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(
                'flags.searchPlaceholder',
                {},
                { defaultValue: 'Search flags by key or name…' },
              )}
              className={cm.cn(
                'h-9 w-full rounded-md pl-9 pr-3 font-mono text-sm transition-colors',
              )}
              style={{
                backgroundColor: 'var(--color-code-block)',
                border: '1px solid rgba(30, 41, 59, 0.8)',
                color: 'var(--color-text-code)',
              }}
              data-mol-id="flags-search"
            />
          </div>
          <div className={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}>
            <span
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('flags.envFilter', {}, { defaultValue: 'Env' })}
            </span>
            {ENV_FILTERS.map((f) => {
              const active = envFilter === f.key
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setEnvFilter(f.key)}
                  className={cm.cn(
                    'rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-colors',
                    active ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface',
                  )}
                  style={
                    active
                      ? {
                          backgroundColor: 'var(--color-env-filter-active-bg)',
                          color: 'var(--color-env-filter-active-text)',
                        }
                      : { backgroundColor: 'rgba(30, 41, 59, 0.7)' }
                  }
                  data-mol-id={`env-filter-${f.key}`}
                >
                  {t(`flags.env.${f.key}`, {}, { defaultValue: f.defaultLabel })}
                </button>
              )
            })}
          </div>
          <div className={cm.flex({ align: 'center', gap: 'xs' })}>
            <span
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('flags.stateFilter', {}, { defaultValue: 'State' })}
            </span>
            {STATE_FILTERS.map((s) => {
              const active = stateFilter === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStateFilter(s)}
                  className={cm.cn(
                    'rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-colors',
                    active ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface',
                  )}
                  style={
                    active
                      ? {
                          backgroundColor: 'var(--color-accent-chip-bg)',
                          color: 'var(--color-accent-chip-text)',
                        }
                      : { backgroundColor: 'rgba(30, 41, 59, 0.7)' }
                  }
                  data-mol-id={`state-filter-${s}`}
                >
                  {t(`flags.state.${s}`, {}, { defaultValue: s })}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {envFilter !== 'all' ? (
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <EnvironmentBadge tone={envFilter} />
          <span className={cm.cn('text-sm text-on-surface-variant')}>
            {t(
              'flags.filterSummary',
              { count: visible.length },
              { defaultValue: '{{count}} flags match this filter' },
            )}
          </span>
        </div>
      ) : null}

      {loading ? (
        <p className={cm.textMuted}>{t('flags.loading', {}, { defaultValue: 'Loading flags…' })}</p>
      ) : error ? (
        <p className={cm.cn('text-sm')} style={{ color: 'var(--color-error-chip-text)' }}>
          {t(
            'flags.error',
            { message: error },
            { defaultValue: 'Could not load flags ({{message}}).' },
          )}
        </p>
      ) : visible.length === 0 ? (
        <div
          className={cm.cn('rounded-xl px-6 py-12 text-center')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px dashed rgba(30, 41, 59, 0.8)',
          }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-4xl text-on-surface-variant')}
            aria-hidden="true"
          >
            search_off
          </span>
          <p className={cm.cn('mt-3 text-sm text-on-surface-variant')}>
            {flags.length === 0
              ? t(
                  'flags.empty.zero',
                  {},
                  { defaultValue: 'No flags yet. Create one to get started.' },
                )
              : t('flags.empty', {}, { defaultValue: 'No flags match your filters.' })}
          </p>
        </div>
      ) : (
        <div className={cm.cn('space-y-3')} data-mol-id="flags-list">
          {visible.map((f) => (
            <FlagRow key={f.key} flag={f} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  )
}
