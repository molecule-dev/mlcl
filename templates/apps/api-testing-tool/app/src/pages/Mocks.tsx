import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SURFACE_PANEL } from '../branding.js'
import { type HttpMethod, MethodBadge } from '../components/MethodBadge.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import { StatusPill } from '../components/StatusPill.js'

const PANEL_BORDER = 'var(--color-border)'

interface MockRow {
  id: string
  name?: string
  path_pattern?: string
  method?: string
  response_status?: number
  response_headers?: string
  response_body?: string
  is_public?: boolean
  public_token?: string | null
  latency_ms?: number
  created_at?: string
}

interface EditDraft {
  name: string
  path_pattern: string
  method: string
  response_status: number
  response_body: string
  latency_ms: number
}

const DEFAULT_RESPONSE_BODY = JSON.stringify({ ok: true }, null, 2)

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

export function Mocks() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [mocks, setMocks] = useState<MockRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EditDraft | null>(null)

  const load = async () => {
    try {
      const res = await http.get<MockRow[]>('/api/mocks')
      setMocks(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('mocks.fetchError', {}, { defaultValue: 'Could not load mock servers.' }),
      )
      setMocks([])
    }
  }

  useEffect(() => {
    let cancelled = false
    load().then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleNew = async () => {
    if (creating) return
    setCreating(true)
    try {
      const defaultName = t(
        'mocks.defaultName',
        { n: (mocks?.length ?? 0) + 1 },
        { defaultValue: 'Untitled mock {{n}}' },
      )
      await http.post('/api/mocks', {
        name: defaultName,
        path_pattern: '/v1/example',
        method: 'GET',
        response_status: 200,
        response_body: DEFAULT_RESPONSE_BODY,
        latency_ms: 0,
      })
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('mocks.createError', {}, { defaultValue: 'Could not create mock.' }),
      )
    } finally {
      setCreating(false)
    }
  }

  const togglePublic = async (mock: MockRow) => {
    if (busyId) return
    setBusyId(mock.id)
    try {
      await http.put(`/api/mocks/${mock.id}`, { is_public: !mock.is_public })
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('mocks.updateError', {}, { defaultValue: 'Could not update mock.' }),
      )
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (mock: MockRow) => {
    if (busyId) return
    setBusyId(mock.id)
    try {
      await http.delete(`/api/mocks/${mock.id}`)
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('mocks.deleteError', {}, { defaultValue: 'Could not delete mock.' }),
      )
    } finally {
      setBusyId(null)
    }
  }

  const startEdit = (mock: MockRow) => {
    setEditingId(mock.id)
    setDraft({
      name: mock.name ?? '',
      path_pattern: mock.path_pattern ?? '/',
      method: (mock.method ?? 'GET').toUpperCase(),
      response_status: mock.response_status ?? 200,
      response_body: mock.response_body ?? DEFAULT_RESPONSE_BODY,
      latency_ms: mock.latency_ms ?? 0,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(null)
  }

  const saveEdit = async () => {
    if (!editingId || !draft) return
    setBusyId(editingId)
    try {
      await http.put(`/api/mocks/${editingId}`, {
        name: draft.name,
        path_pattern: draft.path_pattern,
        method: draft.method,
        response_status: draft.response_status,
        response_body: draft.response_body,
        latency_ms: draft.latency_ms,
      })
      cancelEdit()
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('mocks.updateError', {}, { defaultValue: 'Could not update mock.' }),
      )
    } finally {
      setBusyId(null)
    }
  }

  const live = (mocks ?? []).filter((m) => m.is_public).length
  const totalEndpoints = mocks?.length ?? 0

  return (
    <div className={cm.cn('p-6')}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-6')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: 'var(--color-primary)' }}
          >
            {t('mocks.eyebrow', {}, { defaultValue: '$ pylon mock --serve' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('mocks.heading', {}, { defaultValue: 'Mock servers' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'mocks.subheading',
              {},
              {
                defaultValue:
                  'Spin up deterministic stand-ins for upstreams. Toggle them on to unblock front-end work in seconds.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleNew}
          disabled={creating}
          className={cm.cn(
            'px-4 py-2 rounded-md font-mono text-xs font-extrabold uppercase tracking-widest transition-all hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-60',
          )}
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            boxShadow: '0 8px 22px -10px color-mix(in srgb, var(--color-primary) 60%, transparent)',
          }}
          data-mol-id="mocks-new"
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add
          </span>
          {creating
            ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
            : t('mocks.newMock', {}, { defaultValue: 'New mock' })}
        </button>
      </header>

      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-8')}>
        <MetricStatCard
          eyebrow={t('mocks.metric.servers', {}, { defaultValue: 'Mocks' })}
          value={String(mocks?.length ?? 0)}
          icon="dns"
          tone="primary"
        />
        <MetricStatCard
          eyebrow={t('mocks.metric.live', {}, { defaultValue: 'Public' })}
          value={String(live)}
          icon="rocket_launch"
          tone={live > 0 ? 'success' : 'neutral'}
        />
        <MetricStatCard
          eyebrow={t('mocks.metric.endpoints', {}, { defaultValue: 'Endpoints' })}
          value={String(totalEndpoints)}
          icon="route"
          tone="info"
        />
        <MetricStatCard
          eyebrow={t('mocks.metric.latency', {}, { defaultValue: 'Avg latency' })}
          value={String(
            mocks && mocks.length
              ? Math.round(mocks.reduce((acc, m) => acc + (m.latency_ms ?? 0), 0) / mocks.length)
              : 0,
          )}
          unit="ms"
          icon="bolt"
          tone="accent"
        />
      </section>

      {mocks === null ? (
        <p
          className={cm.cn('text-sm py-8 text-center')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('mocks.loading', {}, { defaultValue: 'Loading mocks…' })}
        </p>
      ) : error ? (
        <p className={cm.cn('text-sm py-8 text-center')} style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      ) : mocks.length === 0 ? (
        <div
          className={cm.cn('py-16 text-center')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl opacity-40 mb-3 inline-block')}
            aria-hidden="true"
          >
            cloud_off
          </span>
          <p className={cm.cn('text-sm')}>
            {t(
              'mocks.empty',
              {},
              { defaultValue: 'No mocks yet — click “New mock” to spin one up.' },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('grid gap-5 grid-cols-1')}>
          {mocks.map((mock) => {
            const editing = editingId === mock.id
            const publicUrl =
              mock.is_public && mock.public_token
                ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/mock-server/${mock.public_token}`
                : null
            return (
              <article
                key={mock.id}
                className={cm.cn('rounded-2xl overflow-hidden')}
                style={{
                  backgroundColor: SURFACE_PANEL,
                  border: `1px solid ${PANEL_BORDER}`,
                }}
                data-mol-id={`mock-card-${mock.id}`}
              >
                <header
                  className={cm.cn(
                    'flex items-center justify-between px-6 py-4 border-b gap-3 flex-wrap',
                  )}
                  style={{ borderColor: PANEL_BORDER }}
                >
                  <div className={cm.cn('flex items-center gap-3 min-w-0 flex-1')}>
                    <div className={cm.cn('flex flex-col min-w-0')}>
                      <h3
                        className={cm.cn('text-lg font-extrabold tracking-tight truncate')}
                        style={{ color: 'var(--color-text)' }}
                      >
                        {mock.name ?? ''}
                      </h3>
                      <p
                        className={cm.cn('font-mono text-xs truncate')}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {mock.path_pattern ?? ''}
                      </p>
                    </div>
                  </div>
                  <div className={cm.cn('flex items-center gap-3 flex-wrap')}>
                    <span
                      className={cm.cn(
                        'font-mono text-[11px] font-extrabold uppercase tracking-widest',
                      )}
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {mock.latency_ms ?? 0} {t('mocks.ms', {}, { defaultValue: 'ms' })}
                    </span>
                    <StatusPill
                      status={mock.is_public ? 'healthy' : 'cancelled'}
                      pulse={mock.is_public}
                      label={
                        mock.is_public
                          ? t('mocks.online', {}, { defaultValue: 'Public' })
                          : t('mocks.paused', {}, { defaultValue: 'Private' })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => togglePublic(mock)}
                      disabled={busyId === mock.id}
                      className={cm.cn(
                        'px-3 py-1.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-widest border transition-colors hover:opacity-80 disabled:opacity-50',
                      )}
                      style={{
                        borderColor: 'color-mix(in srgb, var(--color-text) 18%, transparent)',
                        color: 'var(--color-text-primary)',
                        backgroundColor:
                          'color-mix(in srgb, var(--color-surface-elevated) 60%, transparent)',
                      }}
                      data-mol-id={`mock-toggle-${mock.id}`}
                    >
                      {mock.is_public
                        ? t('mocks.makePrivate', {}, { defaultValue: 'Make private' })
                        : t('mocks.makePublic', {}, { defaultValue: 'Make public' })}
                    </button>
                    <button
                      type="button"
                      onClick={() => (editing ? cancelEdit() : startEdit(mock))}
                      disabled={busyId === mock.id}
                      className={cm.cn(
                        'px-3 py-1.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-widest border transition-colors hover:opacity-80 disabled:opacity-50',
                      )}
                      style={{
                        borderColor: 'color-mix(in srgb, var(--color-text) 18%, transparent)',
                        color: 'var(--color-text-primary)',
                        backgroundColor:
                          'color-mix(in srgb, var(--color-surface-elevated) 60%, transparent)',
                      }}
                      data-mol-id={`mock-edit-${mock.id}`}
                    >
                      {editing
                        ? t('common.cancel', {}, { defaultValue: 'Cancel' })
                        : t('common.edit', {}, { defaultValue: 'Edit' })}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(mock)}
                      disabled={busyId === mock.id}
                      className={cm.cn(
                        'px-3 py-1.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-widest border transition-colors hover:opacity-80 disabled:opacity-50',
                      )}
                      style={{
                        borderColor: 'color-mix(in srgb, var(--color-error) 35%, transparent)',
                        color: 'var(--color-error)',
                        backgroundColor: 'color-mix(in srgb, var(--color-error) 18%, transparent)',
                      }}
                      data-mol-id={`mock-delete-${mock.id}`}
                    >
                      {t('common.delete', {}, { defaultValue: 'Delete' })}
                    </button>
                  </div>
                </header>
                <ul className={cm.cn('divide-y')} style={{ borderColor: PANEL_BORDER }}>
                  <li
                    className={cm.cn('flex items-center gap-4 px-6 py-3')}
                    style={{ borderBottom: `1px solid ${PANEL_BORDER}` }}
                  >
                    <MethodBadge method={(mock.method as HttpMethod) ?? 'GET'} />
                    <span
                      className={cm.cn('font-mono text-sm flex-1 truncate')}
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {mock.path_pattern ?? ''}
                    </span>
                    <StatusPill
                      status={
                        (mock.response_status ?? 200) >= 500
                          ? 'serverError'
                          : (mock.response_status ?? 200) >= 400
                            ? 'clientError'
                            : (mock.response_status ?? 200) >= 300
                              ? 'redirect'
                              : 'success'
                      }
                      label={String(mock.response_status ?? 200)}
                    />
                  </li>
                  {publicUrl ? (
                    <li className={cm.cn('px-6 py-3 flex items-center gap-3 flex-wrap')}>
                      <span
                        className={cm.cn(
                          'font-mono text-[10px] font-black uppercase tracking-widest',
                        )}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {t('mocks.publicUrl', {}, { defaultValue: 'Public URL' })}
                      </span>
                      <code
                        className={cm.cn(
                          'font-mono text-xs px-2 py-1 rounded flex-1 min-w-0 truncate',
                        )}
                        style={{
                          color: 'var(--color-success)',
                          backgroundColor:
                            'color-mix(in srgb, var(--color-success) 8%, transparent)',
                        }}
                        data-mol-id={`mock-public-url-${mock.id}`}
                      >
                        {publicUrl}
                      </code>
                    </li>
                  ) : null}
                </ul>
                {editing && draft ? (
                  <div
                    className={cm.cn('px-6 py-5 border-t flex flex-col gap-3')}
                    style={{ borderColor: PANEL_BORDER }}
                  >
                    <label className={cm.cn('flex flex-col gap-1')}>
                      <span
                        className={cm.cn(
                          'font-mono text-[10px] font-black uppercase tracking-widest',
                        )}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {t('form.name', {}, { defaultValue: 'Name' })}
                      </span>
                      <input
                        type="text"
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        className={cm.cn('font-mono text-sm rounded px-3 py-2')}
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--color-background) 60%, transparent)',
                          color: 'var(--color-text-primary)',
                          border:
                            '1px solid color-mix(in srgb, var(--color-text) 12%, transparent)',
                        }}
                        data-mol-id={`mock-edit-name-${mock.id}`}
                      />
                    </label>
                    <div className={cm.cn('grid grid-cols-1 md:grid-cols-3 gap-3')}>
                      <label className={cm.cn('flex flex-col gap-1')}>
                        <span
                          className={cm.cn(
                            'font-mono text-[10px] font-black uppercase tracking-widest',
                          )}
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {t('mocks.field.method', {}, { defaultValue: 'Method' })}
                        </span>
                        <select
                          value={draft.method}
                          onChange={(e) => setDraft({ ...draft, method: e.target.value })}
                          className={cm.cn('font-mono text-sm rounded px-3 py-2')}
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--color-background) 60%, transparent)',
                            color: 'var(--color-text-primary)',
                            border:
                              '1px solid color-mix(in srgb, var(--color-text) 12%, transparent)',
                          }}
                          data-mol-id={`mock-edit-method-${mock.id}`}
                        >
                          {HTTP_METHODS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className={cm.cn('flex flex-col gap-1 md:col-span-2')}>
                        <span
                          className={cm.cn(
                            'font-mono text-[10px] font-black uppercase tracking-widest',
                          )}
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {t('mocks.field.path', {}, { defaultValue: 'Path pattern' })}
                        </span>
                        <input
                          type="text"
                          value={draft.path_pattern}
                          onChange={(e) => setDraft({ ...draft, path_pattern: e.target.value })}
                          className={cm.cn('font-mono text-sm rounded px-3 py-2')}
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--color-background) 60%, transparent)',
                            color: 'var(--color-text-primary)',
                            border:
                              '1px solid color-mix(in srgb, var(--color-text) 12%, transparent)',
                          }}
                          data-mol-id={`mock-edit-path-${mock.id}`}
                        />
                      </label>
                    </div>
                    <div className={cm.cn('grid grid-cols-2 gap-3')}>
                      <label className={cm.cn('flex flex-col gap-1')}>
                        <span
                          className={cm.cn(
                            'font-mono text-[10px] font-black uppercase tracking-widest',
                          )}
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {t('mocks.field.status', {}, { defaultValue: 'Status code' })}
                        </span>
                        <input
                          type="number"
                          min={100}
                          max={599}
                          value={draft.response_status}
                          onChange={(e) =>
                            setDraft({ ...draft, response_status: Number(e.target.value) })
                          }
                          className={cm.cn('font-mono text-sm rounded px-3 py-2')}
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--color-background) 60%, transparent)',
                            color: 'var(--color-text-primary)',
                            border:
                              '1px solid color-mix(in srgb, var(--color-text) 12%, transparent)',
                          }}
                          data-mol-id={`mock-edit-status-${mock.id}`}
                        />
                      </label>
                      <label className={cm.cn('flex flex-col gap-1')}>
                        <span
                          className={cm.cn(
                            'font-mono text-[10px] font-black uppercase tracking-widest',
                          )}
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {t('mocks.field.latency', {}, { defaultValue: 'Latency (ms)' })}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={30_000}
                          value={draft.latency_ms}
                          onChange={(e) =>
                            setDraft({ ...draft, latency_ms: Number(e.target.value) })
                          }
                          className={cm.cn('font-mono text-sm rounded px-3 py-2')}
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--color-background) 60%, transparent)',
                            color: 'var(--color-text-primary)',
                            border:
                              '1px solid color-mix(in srgb, var(--color-text) 12%, transparent)',
                          }}
                          data-mol-id={`mock-edit-latency-${mock.id}`}
                        />
                      </label>
                    </div>
                    <label className={cm.cn('flex flex-col gap-1')}>
                      <span
                        className={cm.cn(
                          'font-mono text-[10px] font-black uppercase tracking-widest',
                        )}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {t('mocks.field.body', {}, { defaultValue: 'Response body' })}
                      </span>
                      <textarea
                        value={draft.response_body}
                        onChange={(e) => setDraft({ ...draft, response_body: e.target.value })}
                        rows={6}
                        className={cm.cn('font-mono text-xs rounded px-3 py-2')}
                        style={{
                          backgroundColor:
                            'color-mix(in srgb, var(--color-background) 60%, transparent)',
                          color: 'var(--color-text-primary)',
                          border:
                            '1px solid color-mix(in srgb, var(--color-text) 12%, transparent)',
                        }}
                        data-mol-id={`mock-edit-body-${mock.id}`}
                      />
                    </label>
                    <div className={cm.cn('flex justify-end gap-2')}>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className={cm.cn(
                          'px-3 py-1.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-widest border',
                        )}
                        style={{
                          borderColor: 'color-mix(in srgb, var(--color-text) 18%, transparent)',
                          color: 'var(--color-text-primary)',
                          backgroundColor:
                            'color-mix(in srgb, var(--color-surface-elevated) 60%, transparent)',
                        }}
                      >
                        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={busyId === mock.id}
                        className={cm.cn(
                          'px-4 py-1.5 rounded-md font-mono text-[11px] font-extrabold uppercase tracking-widest disabled:opacity-60',
                        )}
                        style={{
                          backgroundColor: 'var(--color-primary)',
                          color: 'var(--color-on-primary)',
                        }}
                        data-mol-id={`mock-save-${mock.id}`}
                      >
                        {t('common.save', {}, { defaultValue: 'Save' })}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
