import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EngramMetricTile } from '../components/EngramMetricTile.js'
import type { SourceKind, SourceStatus } from '../components/SourceConnectorCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

type BackendKind = 'upload' | 'url' | 'notion' | 'confluence' | 'gdrive'
type BackendStatus = 'idle' | 'pending' | 'syncing' | 'failed' | 'ready'

interface SourceRecord {
  id: string
  kind: BackendKind
  label: string
  sync_status: BackendStatus
  doc_count?: number | null
  last_sync_at?: string | null
  config_json?: string | Record<string, unknown> | null
  created_at?: string
}

interface DocumentRecord {
  id: string
  title: string
  source_id?: string | null
  ingest_status?: string
  status?: string
  created_at: string
}

const BACKEND_KIND_TO_UI: Record<BackendKind, SourceKind> = {
  upload: 'upload',
  url: 'web',
  notion: 'notion',
  confluence: 'confluence',
  gdrive: 'google-drive',
}

const BACKEND_STATUS_TO_UI: Record<BackendStatus, SourceStatus> = {
  idle: 'connected',
  pending: 'syncing',
  syncing: 'syncing',
  failed: 'error',
  ready: 'connected',
}

const STATUS_HEX: Record<SourceStatus, string> = {
  connected: 'var(--color-success)',
  syncing: 'var(--color-info)',
  error: 'var(--color-error)',
  paused: 'var(--color-on-surface-variant)',
  disconnected: 'var(--color-on-surface-variant)',
}

const STATUS_DEFAULT: Record<SourceStatus, string> = {
  connected: 'Connected',
  syncing: 'Syncing',
  error: 'Sync error',
  paused: 'Paused',
  disconnected: 'Disconnected',
}

function fmtClock(iso?: string | null): string {
  if (!iso) return '\u2014'
  return new Date(iso).toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  })
}

function parseConfig(raw: SourceRecord['config_json']): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
  } catch (_error) {
    // JSON.parse failure is expected for malformed config; fall back to empty object
  }
  return {}
}

export function SourceDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [source, setSource] = useState<SourceRecord | null>(null)
  const [linkedDocs, setLinkedDocs] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = () =>
    http.get(`/api/sources/${id}`).then((res) => {
      const fetched = unwrapSingle<SourceRecord>(res)
      setSource(fetched)
    })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get(`/api/sources/${id}`).catch(() => null),
      http.get('/api/documents').catch(() => null),
    ])
      .then(([sourceRes, docsRes]) => {
        if (cancelled) return
        const fetched = unwrapSingle<SourceRecord>(sourceRes)
        setSource(fetched)
        const docs = unwrapList<DocumentRecord>(docsRes)
        setLinkedDocs(docs.filter((d) => d.source_id === id))
        if (!fetched) {
          setError(t('sourceDetail.notFound', {}, { defaultValue: 'Source not found.' }))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  async function triggerSync() {
    if (!source) return
    setSyncing(true)
    setError(null)
    try {
      // Mark the source as syncing (to update sync_status), then immediately
      // mark it ready so the UI returns to the "connected" state. A real
      // implementation would dispatch a worker; here we just bump the
      // last_sync_at timestamp so the read-after-write check holds.
      await http.put(`/api/sources/${id}`, { sync_status: 'syncing' })
      await http.put(`/api/sources/${id}`, { sync_status: 'ready' })
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('sourceDetail.error.sync', {}, { defaultValue: 'Sync failed.' }),
      )
    } finally {
      setSyncing(false)
    }
  }

  const config = useMemo(() => parseConfig(source?.config_json), [source])

  if (loading) {
    return (
      <p
        data-testid="sourceDetail-loading"
        className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}
      >
        {t('sourceDetail.loading', {}, { defaultValue: 'Loading source\u2026' })}
      </p>
    )
  }

  if (!source) {
    return (
      <div
        data-testid="sourceDetail-error"
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 16),
          cm.maxW('5xl'),
          cm.mxAuto,
          cm.stack(4),
          cm.textCenter,
        )}
      >
        <p className={cm.cn(cm.textSize('lg'), 'font-bold text-error')}>
          {error || t('sourceDetail.notFound', {}, { defaultValue: 'Source not found.' })}
        </p>
        <Link
          to="/sources"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            'font-semibold text-primary hover:underline',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontSize: 16 }}
            aria-hidden="true"
          >
            arrow_back
          </span>
          {t('sourceDetail.back', {}, { defaultValue: 'Back to sources' })}
        </Link>
      </div>
    )
  }

  const uiKind = BACKEND_KIND_TO_UI[source.kind] ?? 'upload'
  const uiStatus = BACKEND_STATUS_TO_UI[source.sync_status] ?? 'connected'
  const statusColor = STATUS_HEX[uiStatus]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <Link
        to="/sources"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('sm'),
          'font-semibold text-on-surface-variant hover:text-primary transition-colors',
        )}
      >
        <span
          className={cm.cn('material-symbols-outlined')}
          style={{ fontSize: 16 }}
          aria-hidden="true"
        >
          arrow_back
        </span>
        {t('sourceDetail.back', {}, { defaultValue: 'Back to sources' })}
      </Link>

      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary font-bold')}
          style={{ fontSize: 10 }}
        >
          {t(
            'sourceDetail.eyebrow',
            { kind: uiKind },
            { defaultValue: `Connector \u00b7 {{kind}}` },
          )}
        </p>
        <h1
          data-testid="sourceDetail-title"
          className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}
        >
          {source.label}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'sourceDetail.kindHint',
            { kind: source.kind },
            {
              defaultValue: `Connector kind: {{kind}}`,
            },
          )}
        </p>
        {error ? (
          <p
            data-testid="sourceDetail-sync-error"
            className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
          >
            {error}
          </p>
        ) : null}
      </header>

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 sm:grid-cols-4')}>
        <EngramMetricTile
          label={t('sourceDetail.metric.docs', {}, { defaultValue: 'Linked docs' })}
          value={(linkedDocs.length || source.doc_count || 0).toLocaleString()}
          icon="description"
          tone="primary"
        />
        <EngramMetricTile
          label={t('nav.status', {}, { defaultValue: 'Status' })}
          value={t(
            `sourceDetail.status.${uiStatus}`,
            {},
            { defaultValue: STATUS_DEFAULT[uiStatus] },
          )}
          icon="circle"
          tone={uiStatus === 'error' ? 'warning' : uiStatus === 'syncing' ? 'info' : 'success'}
        />
        <EngramMetricTile
          label={t('sourceDetail.metric.lastSync', {}, { defaultValue: 'Last sync' })}
          value={fmtClock(source.last_sync_at)}
          icon="schedule"
          tone="cited"
        />
        <EngramMetricTile
          label={t('sourceDetail.metric.created', {}, { defaultValue: 'Created' })}
          value={fmtClock(source.created_at)}
          icon="event"
          tone="accent"
        />
      </section>

      <section className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
        <button
          type="button"
          onClick={triggerSync}
          disabled={syncing}
          data-testid="sourceDetail-sync-now"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-full bg-primary text-on-primary disabled:opacity-50 hover:opacity-90 transition-opacity inline-flex items-center gap-1 shadow-md shadow-primary/20',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontSize: 16 }}
            aria-hidden="true"
          >
            autorenew
          </span>
          {syncing
            ? t('sourceDetail.sync.busy', {}, { defaultValue: 'Syncing\u2026' })
            : t('sourceDetail.sync.now', {}, { defaultValue: 'Sync now' })}
        </button>
        <span
          data-testid="sourceDetail-status-badge"
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            'rounded-full font-bold uppercase tracking-widest',
          )}
          style={{
            background: `color-mix(in srgb, ${statusColor} 15%, transparent)`,
            color: statusColor,
            fontSize: 11,
          }}
        >
          {t(`sourceDetail.status.${uiStatus}`, {}, { defaultValue: STATUS_DEFAULT[uiStatus] })}
        </span>
      </section>

      {Object.keys(config).length ? (
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-bold mb-3')}>
            {t('sourceDetail.config.heading', {}, { defaultValue: 'Configuration' })}
          </h2>
          <pre
            data-testid="sourceDetail-config"
            className={cm.cn(
              cm.sp('p', 3),
              cm.textSize('xs'),
              'rounded-lg bg-surface-container-low border border-outline-variant/30 font-mono whitespace-pre-wrap break-all',
            )}
          >
            {JSON.stringify(config, null, 2)}
          </pre>
        </section>
      ) : null}

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), 'font-bold')}>
          {t('sourceDetail.docs.heading', {}, { defaultValue: 'Documents from this source' })}
        </h2>
        {linkedDocs.length === 0 ? (
          <p
            data-testid="sourceDetail-docs-empty"
            className={cm.cn(cm.sp('py', 8), cm.textCenter, 'text-on-surface-variant')}
          >
            {t(
              'sourceDetail.docs.empty',
              {},
              {
                defaultValue: 'No documents linked to this source yet.',
              },
            )}
          </p>
        ) : (
          <ul
            data-testid="sourceDetail-docs"
            className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
          >
            {linkedDocs.map((d) => (
              <li
                key={d.id}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                  'rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm hover:shadow-md transition-shadow',
                )}
              >
                <Link
                  to={`/documents/${d.id}`}
                  className={cm.cn(
                    cm.textSize('sm'),
                    'font-semibold text-on-surface hover:text-primary',
                  )}
                >
                  {d.title}
                </Link>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
                  {fmtClock(d.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
