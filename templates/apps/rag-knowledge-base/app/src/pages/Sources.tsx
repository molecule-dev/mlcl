import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { EngramMetricTile } from '../components/EngramMetricTile.js'
import {
  SourceConnectorCard,
  type SourceKind,
  type SourceStatus,
} from '../components/SourceConnectorCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

type BackendKind = 'upload' | 'url' | 'notion' | 'confluence' | 'gdrive'
type BackendStatus = 'idle' | 'pending' | 'syncing' | 'failed' | 'ready'

interface SourceRecord {
  id: string
  user_id?: string
  collection_id?: string | null
  kind: BackendKind
  label: string
  config_json?: string | Record<string, unknown> | null
  sync_status: BackendStatus
  doc_count?: number
  last_sync_at?: string | null
  created_at?: string
}

interface NewSourceForm {
  kind: BackendKind
  label: string
  source_url: string
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

const KIND_OPTIONS: Array<{ value: BackendKind; label: string; needsUrl: boolean }> = [
  { value: 'upload', label: 'Manual upload', needsUrl: false },
  { value: 'url', label: 'Web URL', needsUrl: true },
  { value: 'notion', label: 'Notion workspace', needsUrl: false },
  { value: 'confluence', label: 'Confluence space', needsUrl: false },
  { value: 'gdrive', label: 'Google Drive', needsUrl: false },
]

function fmtRelative(iso?: string | null): string | undefined {
  if (!iso) return undefined
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}

function emptyForm(): NewSourceForm {
  return { kind: 'url', label: '', source_url: '' }
}

export function Sources() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [sources, setSources] = useState<SourceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<NewSourceForm>(emptyForm())
  const [submitting, setSubmitting] = useState(false)

  const refresh = () =>
    http.get('/api/sources').then((res) => {
      setSources(unwrapList<SourceRecord>(res))
    })

  useEffect(() => {
    setLoading(true)
    refresh()
      .catch(() =>
        setError(t('sources.error.load', {}, { defaultValue: 'Could not load sources.' })),
      )
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http]) // refresh and t are stable across renders; run once on http change

  const counts = useMemo(() => {
    let connected = 0
    let syncing = 0
    let errors = 0
    let totalDocs = 0
    for (const s of sources) {
      const ui = BACKEND_STATUS_TO_UI[s.sync_status] ?? 'connected'
      if (ui === 'connected') connected += 1
      if (ui === 'syncing') syncing += 1
      if (ui === 'error') errors += 1
      totalDocs += s.doc_count ?? 0
    }
    return { connected, syncing, errors, totalDocs }
  }, [sources])

  function openAdd() {
    setForm(emptyForm())
    setShowAdd(true)
    setError(null)
  }

  async function submitAdd(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const opt = KIND_OPTIONS.find((o) => o.value === form.kind)
    if (!form.label.trim()) {
      setError(t('sources.error.labelRequired', {}, { defaultValue: 'Label is required.' }))
      setSubmitting(false)
      return
    }
    if (opt?.needsUrl && !form.source_url.trim()) {
      setError(
        t(
          'sources.error.urlRequired',
          {},
          { defaultValue: 'URL is required for this source kind.' },
        ),
      )
      setSubmitting(false)
      return
    }
    const body: Record<string, unknown> = {
      kind: form.kind,
      label: form.label.trim(),
    }
    if (opt?.needsUrl && form.source_url.trim()) {
      body.source_url = form.source_url.trim()
    }
    try {
      const res = await http.post('/api/sources', body)
      // Domain funnel: a knowledge source was connected.
      const created = unwrapSingle<{ id?: string }>(res)
      void track({
        name: 'source.connected',
        properties: { source_id: created?.id ?? null, kind: form.kind },
      })
      setShowAdd(false)
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('sources.error.add', {}, { defaultValue: 'Could not add source.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(cm.textSize('xs'), 'uppercase tracking-widest text-primary font-bold')}
          style={{ fontSize: 10 }}
        >
          {t('sources.eyebrow', {}, { defaultValue: 'Connectors' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('sources.heading', {}, { defaultValue: 'Sources' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'sources.subheading',
            { appName: APP_NAME },
            {
              defaultValue:
                'Where {{appName}} pulls knowledge from. Sync schedules and health are visible here.',
            },
          )}
        </p>
        {error ? (
          <p
            data-testid="sources-error"
            className={cm.cn(cm.textSize('sm'), 'text-error font-semibold')}
          >
            {error}
          </p>
        ) : null}
      </header>

      <section className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 sm:grid-cols-4')}>
        <EngramMetricTile
          label={t('status.connected', {}, { defaultValue: 'Connected' })}
          value={counts.connected.toLocaleString()}
          icon="link"
          tone="success"
        />
        <EngramMetricTile
          label={t('sources.metric.syncing', {}, { defaultValue: 'Syncing' })}
          value={counts.syncing.toLocaleString()}
          icon="autorenew"
          tone="info"
        />
        <EngramMetricTile
          label={t('sources.metric.errors', {}, { defaultValue: 'Errors' })}
          value={counts.errors.toLocaleString()}
          icon="warning"
          tone="warning"
        />
        <EngramMetricTile
          label={t('sources.metric.docs', {}, { defaultValue: 'Indexed docs' })}
          value={counts.totalDocs.toLocaleString()}
          icon="description"
          tone="primary"
        />
      </section>

      <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' })}>
        <h2 className={cm.cn(cm.textSize('xl'), 'font-bold')}>
          {t(
            'sources.activeHeading',
            { count: sources.length },
            { defaultValue: 'Active connectors' },
          )}
        </h2>
        <button
          type="button"
          onClick={openAdd}
          data-testid="sources-add-button"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity inline-flex items-center gap-1 shadow-md shadow-primary/20',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontSize: 18 }}
            aria-hidden="true"
          >
            add
          </span>
          {t('sources.add', {}, { defaultValue: 'Add source' })}
        </button>
      </div>

      {showAdd ? (
        <form
          onSubmit={submitAdd}
          data-testid="sources-add-form"
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'sm' }),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-md',
          )}
        >
          <h3 className={cm.cn(cm.textSize('lg'), 'font-bold')}>
            {t('sources.add.heading', {}, { defaultValue: 'Add a new source' })}
          </h3>
          <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest font-bold text-on-surface-variant',
              )}
              style={{ fontSize: 10 }}
            >
              {t('form.kind', {}, { defaultValue: 'Kind' })}
            </span>
            <select
              data-testid="sources-add-kind"
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as BackendKind }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant bg-surface text-on-surface',
              )}
            >
              {KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(`sources.kind.${opt.value}`, {}, { defaultValue: opt.label })}
                </option>
              ))}
            </select>
          </label>
          <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest font-bold text-on-surface-variant',
              )}
              style={{ fontSize: 10 }}
            >
              {t('sources.add.label', {}, { defaultValue: 'Label' })}
            </span>
            <input
              data-testid="sources-add-label"
              type="text"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder={t(
                'sources.add.labelPlaceholder',
                {},
                { defaultValue: 'My documentation site' },
              )}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant bg-surface text-on-surface',
              )}
            />
          </label>
          {KIND_OPTIONS.find((o) => o.value === form.kind)?.needsUrl ? (
            <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-widest font-bold text-on-surface-variant',
                )}
                style={{ fontSize: 10 }}
              >
                {t('sources.add.url', {}, { defaultValue: 'Source URL' })}
              </span>
              <input
                data-testid="sources-add-url"
                type="url"
                value={form.source_url}
                onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
                placeholder="https://example.com/docs"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'rounded-lg border border-outline-variant bg-surface text-on-surface',
                )}
              />
            </label>
          ) : null}
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <button
              type="submit"
              disabled={submitting}
              data-testid="sources-add-submit"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-on-primary disabled:opacity-50 hover:opacity-90 transition-opacity',
              )}
            >
              {submitting
                ? t('sources.add.submitting', {}, { defaultValue: 'Adding\u2026' })
                : t('sources.add.submit', {}, { defaultValue: 'Add source' })}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p
          data-testid="sources-loading"
          className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('sources.loading', {}, { defaultValue: 'Loading sources\u2026' })}
        </p>
      ) : sources.length === 0 ? (
        <div
          data-testid="sources-empty"
          className={cm.cn(
            cm.sp('py', 12),
            cm.textCenter,
            'rounded-2xl border border-dashed border-outline-variant/40',
          )}
        >
          <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
            {t('sources.empty.title', {}, { defaultValue: 'No sources yet.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'sources.empty.body',
              {},
              { defaultValue: 'Click \u201cAdd source\u201d to wire your first connector.' },
            )}
          </p>
        </div>
      ) : (
        <section
          data-testid="sources-list"
          className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}
        >
          {sources.map((s) => (
            <SourceConnectorCard
              key={s.id}
              id={s.id}
              name={s.label}
              kind={BACKEND_KIND_TO_UI[s.kind] ?? 'upload'}
              status={BACKEND_STATUS_TO_UI[s.sync_status] ?? 'connected'}
              documentCount={s.doc_count ?? 0}
              lastSyncLabel={fmtRelative(s.last_sync_at)}
            />
          ))}
        </section>
      )}
    </div>
  )
}
