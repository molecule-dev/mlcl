import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface ApiSpace {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  visibility: string
  is_public: boolean
  page_count: number
  created_at: string
  owner_id: string
}

const ACCENTS = [
  'from-primary to-primary',
  'from-secondary to-secondary',
  'from-primary to-secondary',
  'from-secondary to-primary',
] as const

export function Spaces() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [spaces, setSpaces] = useState<ApiSpace[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftDescription, setDraftDescription] = useState('')

  const loadSpaces = useCallback(async () => {
    try {
      const res = await http.get<ApiSpace[]>('/spaces')
      setSpaces(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load spaces')
    }
  }, [http])

  useEffect(() => {
    loadSpaces()
  }, [loadSpaces])

  useEffect(() => {
    if (!showDialog) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDialog(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showDialog])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draftName.trim() || creating) return
    setCreating(true)
    try {
      const payload: { name: string; description?: string } = { name: draftName.trim() }
      const desc = draftDescription.trim()
      if (desc) payload.description = desc
      await http.post('/spaces', payload)
      setDraftName('')
      setDraftDescription('')
      setShowDialog(false)
      await loadSpaces()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create space')
    } finally {
      setCreating(false)
    }
  }

  const decoratedSpaces = useMemo(() => {
    return (spaces ?? []).map((s, i) => ({ ...s, accentClass: ACCENTS[i % ACCENTS.length]! }))
  }, [spaces])

  return (
    <div className={cm.stack(8)} data-testid="spaces-page">
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div className={cm.stack(2)}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t(
              'spaces.eyebrow',
              { appName: APP_NAME },
              { defaultValue: 'Workspaces · {{appName}}' },
            )}
          </span>
          <h1
            className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('spaces.heading', {}, { defaultValue: 'Spaces' })}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
            {t(
              'spaces.subtitle',
              {},
              {
                defaultValue:
                  'Each cairn lives in a space. Pick one to read; pick four to compare.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDialog(true)}
          data-testid="new-space-button"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'h-10 rounded-full bg-primary text-on-primary hover:bg-primary-hover transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
            add
          </span>
          {t('spaces.newSpace', {}, { defaultValue: 'New space' })}
        </button>
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-md border-l-4 border-error bg-error/10 text-on-surface',
          )}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {spaces === null ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('spaces.loading', {}, { defaultValue: 'Loading spaces…' })}
        </p>
      ) : decoratedSpaces.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 12),
            cm.stack(2),
            cm.textCenter,
            'rounded-xl border border-outline-variant/40 bg-surface-container-lowest',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-[40px] text-on-surface-variant/60')}
            aria-hidden="true"
          >
            workspaces
          </span>
          <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {t('spaces.empty.title', {}, { defaultValue: 'No spaces yet.' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'spaces.empty.body',
              {},
              { defaultValue: 'Create your first space to start writing.' },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('grid gap-6 md:grid-cols-2')} data-testid="spaces-grid">
          {decoratedSpaces.map((s) => (
            <Link
              key={s.id}
              to={`/search?space_id=${encodeURIComponent(s.id)}`}
              data-testid={`space-card-${s.slug}`}
              className={cm.cn(
                'group relative overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant/40 hover:-translate-y-0.5 hover:shadow-md transition-all',
              )}
            >
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.flex({ direction: 'col', gap: 'md' }),
                  `bg-gradient-to-br ${s.accentClass} text-white`,
                )}
              >
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-10 w-10 rounded-lg bg-surface/20 backdrop-blur-md',
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-[22px]')}>
                      {s.icon || 'workspaces'}
                    </span>
                  </span>
                  <div className={cm.stack(0)}>
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'font-black uppercase tracking-widest opacity-90',
                      )}
                    >
                      {t('spaces.spaceLabel', {}, { defaultValue: 'Space' })}
                    </p>
                    <h2 className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}>
                      {s.name}
                    </h2>
                  </div>
                </div>
                {s.description ? (
                  <p className={cm.cn(cm.textSize('sm'), 'text-white/90 leading-relaxed')}>
                    {s.description}
                  </p>
                ) : null}
              </div>

              <div className={cm.cn(cm.sp('p', 5), cm.stack(3))}>
                <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(
                      'spaces.pageCount',
                      { count: s.page_count ?? 0 },
                      { defaultValue: '{{count}} pages' },
                    )}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {s.visibility}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showDialog ? (
        <div
          className={cm.cn('fixed inset-0 z-50 flex items-center justify-center')}
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-space-dialog-title"
        >
          <div
            role="presentation"
            className={cm.cn('absolute inset-0 bg-foreground/40 backdrop-blur-sm')}
            onClick={() => setShowDialog(false)}
          />
          <form
            onSubmit={handleCreate}
            data-testid="new-space-dialog"
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'relative w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-xl',
            )}
          >
            <h2
              id="new-space-dialog-title"
              className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {t('spaces.dialog.title', {}, { defaultValue: 'New space' })}
            </h2>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.name', {}, { defaultValue: 'Name' })}
              </span>
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                required
                data-testid="new-space-name"
                className={cm.cn(
                  cm.sp('px', 3),
                  'h-10 rounded-md border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40',
                )}
              />
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-bold uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.description', {}, { defaultValue: 'Description' })}
              </span>
              <textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                rows={3}
                data-testid="new-space-description"
                className={cm.cn(
                  cm.sp('p', 3),
                  'rounded-md border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none',
                )}
              />
            </label>
            <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'h-9 rounded-md border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={creating || !draftName.trim()}
                data-testid="new-space-submit"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'h-9 rounded-md bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-60 transition-colors',
                )}
              >
                {creating
                  ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                  : t('spaces.dialog.create', {}, { defaultValue: 'Create space' })}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
