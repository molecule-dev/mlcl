import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { LogVolumeSparkline } from '../components/LogVolumeSparkline.js'
import { unwrapList } from '../lib/unwrap.js'

interface StreamSummary {
  id: string
  name: string
  source: string
  format: string
  rate_per_sec: number
  retention_days: number
  status: 'active' | 'paused'
  last_event_at: string
}

const SAMPLE_RATES: Record<string, number[]> = {
  'prod-app': [180, 220, 240, 260, 290, 310, 340, 360, 380, 410, 412, 412],
  'prod-api': [110, 140, 130, 150, 170, 180, 200, 210, 218, 218, 220, 218],
  staging: [12, 14, 11, 18, 22, 18, 16, 20, 18, 18, 17, 18],
  'edge-access': [820, 880, 900, 920, 950, 980, 1010, 980, 970, 982, 982, 970],
  payments: [38, 42, 50, 58, 60, 62, 62, 64, 64, 66, 64, 64],
  'mobile-ios': [40, 50, 60, 65, 70, 71, 75, 71, 71, 72, 71, 71],
  'mobile-android': [50, 60, 75, 85, 90, 88, 88, 88, 88, 90, 88, 88],
  'cron-jobs': [0, 0, 1, 0, 0, 2, 1, 2, 0, 0, 0, 0],
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function loadStreams(http: ReturnType<typeof useHttpClient>): Promise<StreamSummary[]> {
  return http.get('/api/streams').then((res) => unwrapList<StreamSummary>(res))
}

export function Streams() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [streams, setStreams] = useState<StreamSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSource, setNewSource] = useState('')
  const [newFormat, setNewFormat] = useState('json')
  const [submitting, setSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loadStreams(http)
      .then((items) => {
        if (!cancelled) setStreams(items)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('streams.loadError', {}, { defaultValue: 'Failed to load streams.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  function openCreate() {
    setNewName('')
    setNewSource('')
    setNewFormat('json')
    setCreateError(null)
    setShowCreate(true)
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setSubmitting(true)
    setCreateError(null)
    try {
      await http.post('/api/streams', {
        name: newName.trim(),
        source: newSource.trim() || undefined,
        format: newFormat,
      })
      setShowCreate(false)
      const items = await loadStreams(http)
      setStreams(items)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/maxSources|stream limit/i.test(msg)) {
        setCreateError(
          t(
            'streams.createLimitError',
            {},
            { defaultValue: 'You have reached your stream limit. Upgrade to add more.' },
          ),
        )
      } else {
        setCreateError(
          msg || t('streams.createError', {}, { defaultValue: 'Could not create stream.' }),
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-end justify-between gap-6 flex-wrap mb-6')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t('streams.eyebrow', {}, { defaultValue: '$ signalink streams ls' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('streams.heading', {}, { defaultValue: 'Streams' })}
          </h1>
        </div>
        <button
          type="button"
          onClick={openCreate}
          data-mol-id="streams-new"
          className={cm.cn(
            'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-90',
          )}
          style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-background)' }}
        >
          {t('streams.newCta', {}, { defaultValue: '+ New stream' })}
        </button>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('streams.loading', {}, { defaultValue: 'Loading streams…' })}
        </p>
      ) : streams.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('streams.empty', {}, { defaultValue: 'No streams configured.' })}
        </p>
      ) : (
        <ul className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-2')}>
          {streams.map((s) => {
            const rates = SAMPLE_RATES[s.name] || []
            const isActive = s.status === 'active'
            return (
              <li key={s.id}>
                <Link
                  to={`/streams/${s.id}`}
                  className={cm.cn(
                    'block rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl',
                  )}
                  style={{
                    backgroundColor: 'var(--color-surface-container)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div className={cm.cn('flex items-start justify-between gap-3')}>
                    <div>
                      <p
                        className={cm.cn(
                          'font-mono text-base font-extrabold text-on-surface tracking-tight',
                        )}
                      >
                        {s.name}
                      </p>
                      <p className={cm.cn('mt-0.5 font-mono text-[11px] text-on-surface-variant')}>
                        <span className={cm.cn('opacity-70')}>source </span>
                        {s.source}
                      </p>
                    </div>
                    <span
                      className={cm.cn(
                        'inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-widest',
                      )}
                      style={{
                        backgroundColor: isActive
                          ? 'color-mix(in srgb, var(--color-success) 16%, transparent)'
                          : 'color-mix(in srgb, var(--color-severity-warn) 16%, transparent)',
                        color: isActive
                          ? 'var(--color-success-light)'
                          : 'var(--color-severity-warn-light)',
                      }}
                    >
                      <span
                        className={cm.cn('h-1.5 w-1.5 rounded-full')}
                        style={{
                          backgroundColor: isActive
                            ? 'var(--color-live-tail-active)'
                            : 'var(--color-live-tail-paused)',
                        }}
                        aria-hidden="true"
                      />
                      {isActive
                        ? t('status.active', {}, { defaultValue: 'Active' })
                        : t('status.paused', {}, { defaultValue: 'Paused' })}
                    </span>
                  </div>

                  <div className={cm.cn('mt-4 grid grid-cols-3 gap-4')}>
                    <div>
                      <p
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('streams.col.rate', {}, { defaultValue: 'Rate / sec' })}
                      </p>
                      <p
                        className={cm.cn(
                          'font-mono text-xl font-extrabold tracking-tighter text-on-surface',
                        )}
                      >
                        {s.rate_per_sec.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('form.format', {}, { defaultValue: 'Format' })}
                      </p>
                      <p className={cm.cn('font-mono text-xs font-bold text-on-surface mt-1')}>
                        {s.format.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('streams.col.retention', {}, { defaultValue: 'Retention' })}
                      </p>
                      <p className={cm.cn('font-mono text-xs font-bold text-on-surface mt-1')}>
                        {s.retention_days}d
                      </p>
                    </div>
                  </div>

                  {rates.length > 1 ? (
                    <div className={cm.cn('mt-4')}>
                      <LogVolumeSparkline
                        values={rates}
                        width={300}
                        height={36}
                        stroke={isActive ? BRAND_COLOR : 'var(--color-text-secondary)'}
                        ariaLabel={t(
                          'streams.sparkAria',
                          { name: s.name },
                          { defaultValue: 'Recent rate for {{name}}' },
                        )}
                        className={cm.cn('w-full')}
                      />
                    </div>
                  ) : null}

                  <p className={cm.cn('mt-3 font-mono text-[10px] text-on-surface-variant')}>
                    {t(
                      'streams.lastEventAt',
                      { when: fmtRelative(s.last_event_at) },
                      { defaultValue: 'last event {{when}}' },
                    )}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {showCreate ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="streams-create-title"
          className={cm.cn('fixed inset-0 z-50 flex items-center justify-center px-4')}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-background) 65%, transparent)',
          }}
        >
          <form
            onSubmit={submitCreate}
            className={cm.cn('w-full max-w-md rounded-xl p-6 space-y-4')}
            style={{
              backgroundColor: 'var(--color-input-background)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2
              id="streams-create-title"
              className={cm.cn('text-lg font-semibold tracking-tight text-on-surface')}
            >
              {t('streams.create.title', {}, { defaultValue: 'New stream' })}
            </h2>
            <div>
              <label
                htmlFor="streams-new-name"
                className={cm.cn(
                  'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono text-on-surface-variant',
                )}
              >
                {t('form.name', {}, { defaultValue: 'Name' })}
              </label>
              <input
                id="streams-new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className={cm.cn('w-full py-2.5 px-3 rounded-md font-mono text-sm')}
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-severity-debug-light)',
                }}
              />
            </div>
            <div>
              <label
                htmlFor="streams-new-source"
                className={cm.cn(
                  'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono text-on-surface-variant',
                )}
              >
                {t('streams.create.sourceLabel', {}, { defaultValue: 'Source' })}
              </label>
              <input
                id="streams-new-source"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                className={cm.cn('w-full py-2.5 px-3 rounded-md font-mono text-sm')}
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-severity-debug-light)',
                }}
              />
            </div>
            <div>
              <label
                htmlFor="streams-new-format"
                className={cm.cn(
                  'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono text-on-surface-variant',
                )}
              >
                {t('form.format', {}, { defaultValue: 'Format' })}
              </label>
              <select
                id="streams-new-format"
                value={newFormat}
                onChange={(e) => setNewFormat(e.target.value)}
                className={cm.cn('w-full py-2.5 px-3 rounded-md font-mono text-sm')}
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-severity-debug-light)',
                }}
              >
                <option value="json">json</option>
                <option value="logfmt">logfmt</option>
                <option value="clf">clf</option>
                <option value="raw">raw</option>
              </select>
            </div>
            {createError ? (
              <div className={cm.cn('text-sm text-error')}>
                {createError}{' '}
                {/maxSources|stream limit|Upgrade to add/i.test(createError) ? (
                  <button
                    type="button"
                    onClick={() => navigate('/pricing')}
                    className={cm.cn('underline font-bold')}
                    style={{ color: BRAND_COLOR }}
                  >
                    {t('streams.create.upgradeLink', {}, { defaultValue: 'Upgrade plan' })}
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className={cm.cn('flex items-center justify-end gap-3 pt-2')}>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className={cm.cn(
                  'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border border-outline-variant',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={submitting || !newName.trim()}
                data-mol-id="streams-create-submit"
                className={cm.cn(
                  'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed',
                )}
                style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-background)' }}
              >
                {submitting
                  ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                  : t('streams.create.submit', {}, { defaultValue: 'Create stream' })}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
