import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface SegmentApi {
  id: string
  key: string
  name: string
  description: string
  conditions: unknown
  created_at?: string
  updated_at?: string
}

const conditionCount = (conds: unknown): number => {
  if (Array.isArray(conds)) return conds.length
  return 0
}

export function Segments() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [segments, setSegments] = useState<SegmentApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const reload = async () => {
    try {
      const res = await http.get<SegmentApi[]>('/api/segments')
      const arr = Array.isArray(res.data) ? res.data : []
      setSegments(arr)
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

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      await http.post('/api/segments', {
        key: newKey,
        name: newName,
        description: newDescription,
        conditions: [],
      })
      setShowCreate(false)
      setNewKey('')
      setNewName('')
      setNewDescription('')
      await reload()
    } catch (err) {
      // Keep the form open and surface why (e.g. duplicate segment key).
      setCreateError(err instanceof Error ? err.message : 'request failed')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))} data-mol-id="page-segments">
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
            style={{ color: 'var(--color-text-link)' }}
          >
            {t('segments.kicker', {}, { defaultValue: '// /segments' })}
          </p>
          <h1 className={cm.cn('mt-1 text-3xl font-extrabold tracking-tight text-on-surface')}>
            {t('segments.heading', {}, { defaultValue: 'User segments' })}
          </h1>
          <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>
            {t(
              'segments.subheading',
              { count: segments.length },
              { defaultValue: '{{count}} reusable segments. Reference them from any flag.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={cm.cn(
            'inline-flex items-center gap-1.5 rounded-md px-4 py-2 font-mono text-sm font-bold transition-colors',
          )}
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary-cta)' }}
          data-mol-id="segments-new-btn"
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            add
          </span>
          {showCreate
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('segments.newSegment', {}, { defaultValue: 'New segment' })}
        </button>
      </header>

      {showCreate ? (
        <form
          onSubmit={onCreate}
          className={cm.cn('rounded-xl p-6 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto]')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid rgba(30, 41, 59, 0.7)',
          }}
          data-mol-id="segments-new-form"
        >
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder={t('segments.keyPh', {}, { defaultValue: 'segment_key' })}
            required
            pattern="[a-zA-Z0-9_-]+"
            className={cm.cn('h-9 rounded-md px-2 font-mono text-sm')}
            style={{
              backgroundColor: 'var(--color-code-block)',
              border: '1px solid rgba(30, 41, 59, 0.8)',
              color: 'var(--color-text-code)',
            }}
            aria-label={t('segments.keyAria', {}, { defaultValue: 'Segment key' })}
            data-mol-id="segments-new-key"
          />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('form.name', {}, { defaultValue: 'Name' })}
            required
            className={cm.cn('h-9 rounded-md px-2 text-sm')}
            style={{
              backgroundColor: 'var(--color-code-block)',
              border: '1px solid rgba(30, 41, 59, 0.8)',
              color: 'var(--color-text-code)',
            }}
            aria-label={t('segments.nameAria', {}, { defaultValue: 'Segment name' })}
            data-mol-id="segments-new-name"
          />
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder={t('form.description', {}, { defaultValue: 'Description' })}
            className={cm.cn('h-9 rounded-md px-2 text-sm')}
            style={{
              backgroundColor: 'var(--color-code-block)',
              border: '1px solid rgba(30, 41, 59, 0.8)',
              color: 'var(--color-text-code)',
            }}
            aria-label={t('segments.descriptionAria', {}, { defaultValue: 'Segment description' })}
            data-mol-id="segments-new-description"
          />
          <button
            type="submit"
            disabled={creating}
            className={cm.cn(
              'inline-flex items-center rounded-md px-4 py-2 font-mono text-xs font-bold transition-colors disabled:opacity-50',
            )}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-on-primary-cta)',
            }}
            data-mol-id="segments-new-submit"
          >
            {creating
              ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
              : t('common.create', {}, { defaultValue: 'Create' })}
          </button>
          {createError ? (
            <p
              role="alert"
              className={cm.cn('col-span-full text-sm')}
              style={{ color: 'var(--color-error-chip-text)' }}
              data-mol-id="segments-new-error"
            >
              {t(
                'segments.createError',
                { message: createError },
                { defaultValue: 'Could not create segment: {{message}}' },
              )}
            </p>
          ) : null}
        </form>
      ) : null}

      {loading ? (
        <p className={cm.textMuted}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : error ? (
        <p className={cm.cn('text-sm')} style={{ color: 'var(--color-error-chip-text)' }}>
          {t(
            'segments.error',
            { message: error },
            { defaultValue: 'Could not load segments ({{message}}).' },
          )}
        </p>
      ) : segments.length === 0 ? (
        <div
          className={cm.cn('rounded-xl px-6 py-12 text-center')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px dashed rgba(30, 41, 59, 0.8)',
          }}
        >
          <p className={cm.cn('text-sm text-on-surface-variant')}>
            {t('segments.empty', {}, { defaultValue: 'No segments yet. Create one above.' })}
          </p>
        </div>
      ) : (
        <div className={cm.cn('grid gap-4 lg:grid-cols-2')} data-mol-id="segments-grid">
          {segments.map((s) => (
            <Link
              key={s.key}
              to={`/segments/${s.key}`}
              className={cm.cn(
                'group rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg',
              )}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid rgba(30, 41, 59, 0.7)',
                borderLeft: `4px solid var(--color-flag-on)`,
              }}
              data-mol-id={`segment-card-${s.key}`}
            >
              <p className={cm.cn('font-mono text-[14px] font-bold text-on-surface')}>{s.key}</p>
              <h2 className={cm.cn('mt-1 text-lg font-extrabold text-on-surface')}>{s.name}</h2>
              <p className={cm.cn('mt-1 text-sm text-on-surface-variant truncate')}>
                {s.description}
              </p>

              <dl
                className={cm.cn('mt-4 grid grid-cols-3 gap-3 pt-4 border-t')}
                style={{ borderColor: 'rgba(30, 41, 59, 0.7)' }}
              >
                <div>
                  <dt
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('segments.rules', {}, { defaultValue: 'Rules' })}
                  </dt>
                  <dd className={cm.cn('mt-1 font-mono text-xl font-extrabold text-on-surface')}>
                    {conditionCount(s.conditions)}
                  </dd>
                </div>
                <div>
                  <dt
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('segments.created', {}, { defaultValue: 'Created' })}
                  </dt>
                  <dd className={cm.cn('mt-1 font-mono text-xs text-on-surface-variant')}>
                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                  </dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
