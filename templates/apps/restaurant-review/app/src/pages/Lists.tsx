import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ApiList {
  id: string
  owner_id: string
  name: string
  description: string
  cover_url: string | null
  visibility: 'public' | 'private'
  created_at: string
}

interface ListWithCount extends ApiList {
  itemCount: number
}

const FALLBACK_COVER = 'https://picsum.photos/seed/morsel-list-fallback/1200/700'

function ListCard({ list, isYours }: { list: ListWithCount; isYours: boolean }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pill = isYours
    ? t('lists.pill.personal', {}, { defaultValue: 'Personal' })
    : t('lists.pill.public', {}, { defaultValue: 'Public' })
  return (
    <Link
      to={`/lists/${list.id}`}
      data-testid={`list-card-${list.id}`}
      className={cm.cn(
        'group relative block overflow-hidden rounded-2xl bg-surface shadow-sm hover:shadow-xl transition-all hover:-translate-y-0.5 border border-outline-variant/40',
      )}
    >
      <div className={cm.cn('relative aspect-[16/9] overflow-hidden bg-surface-variant')}>
        <img
          src={list.cover_url ?? FALLBACK_COVER}
          alt={t('lists.coverAlt', { name: list.name }, { defaultValue: '{{name}} list cover' })}
          className={cm.cn(
            cm.w('full'),
            cm.h('full'),
            'object-cover transition-transform duration-500 group-hover:scale-105',
          )}
        />
        <div
          className={cm.cn(
            'absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent',
          )}
          aria-hidden="true"
        />
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'absolute top-3 left-3 uppercase tracking-widest rounded-full bg-accent text-on-secondary backdrop-blur-md',
          )}
        >
          {pill}
        </span>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'absolute bottom-3 right-3 uppercase tracking-widest rounded-full bg-foreground/60 text-white',
          )}
        >
          {t('lists.count', { n: list.itemCount }, { defaultValue: '{{n}} spots' })}
        </span>
      </div>
      <div className={cm.sp('p', 5)}>
        <h3
          className={cm.cn(cm.textSize('xl'), 'leading-tight')}
          style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
        >
          {list.name}
        </h3>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.sp('mt', 2),
            'text-on-surface-variant line-clamp-2 leading-relaxed',
          )}
        >
          {list.description ||
            t(
              'lists.descriptionEmpty',
              {},
              { defaultValue: 'A curated stack — open to add a note.' },
            )}
        </p>
      </div>
    </Link>
  )
}

export function Lists() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [yourLists, setYourLists] = useState<ListWithCount[]>([])
  const [trendingLists, setTrendingLists] = useState<ListWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createVisibility, setCreateVisibility] = useState<'private' | 'public'>('private')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [mineRes, publicRes] = await Promise.all([
        http.get('/api/lists?scope=mine&limit=50').catch(() => null),
        http.get('/api/lists?scope=public&limit=50').catch(() => null),
      ])
      const mine = unwrapList<ApiList>(mineRes)
      const pub = unwrapList<ApiList>(publicRes)
      // Hydrate item counts so cards can show "12 spots".
      const hydrate = (list: ApiList): Promise<ListWithCount> =>
        http
          .get(`/api/lists/${list.id}/items`)
          .then((r) => ({ ...list, itemCount: unwrapList(r).length }))
          .catch(() => ({ ...list, itemCount: 0 }))
      const [hydratedMine, hydratedPublic] = await Promise.all([
        Promise.all(mine.map(hydrate)),
        Promise.all(pub.filter((l) => !mine.some((m) => m.id === l.id)).map(hydrate)),
      ])
      setYourLists(hydratedMine)
      setTrendingLists(hydratedPublic)
    } catch (_error) {
      // Error is surfaced to the user via setError; individual http failures already caught above
      setError(t('lists.loadError', {}, { defaultValue: 'Failed to load lists.' }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/lists?scope=mine&limit=50').catch(() => null),
      http.get('/api/lists?scope=public&limit=50').catch(() => null),
    ])
      .then(async ([mineRes, publicRes]) => {
        if (cancelled) return
        const mine = unwrapList<ApiList>(mineRes)
        const pub = unwrapList<ApiList>(publicRes)
        const hydrate = (list: ApiList): Promise<ListWithCount> =>
          http
            .get(`/api/lists/${list.id}/items`)
            .then((r) => ({ ...list, itemCount: unwrapList(r).length }))
            .catch(() => ({ ...list, itemCount: 0 }))
        const [hydratedMine, hydratedPublic] = await Promise.all([
          Promise.all(mine.map(hydrate)),
          Promise.all(pub.filter((l) => !mine.some((m) => m.id === l.id)).map(hydrate)),
        ])
        if (cancelled) return
        setYourLists(hydratedMine)
        setTrendingLists(hydratedPublic)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('lists.loadError', {}, { defaultValue: 'Failed to load lists.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!createName.trim() || creating) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await http.post('/api/lists', {
        name: createName.trim(),
        description: createDescription.trim(),
        visibility: createVisibility,
      })
      const created = unwrapSingle<ApiList>(res)
      if (created) {
        setYourLists((prev) => [{ ...created, itemCount: 0 }, ...prev])
        void track({
          name: 'list.created',
          properties: { list_id: created.id, visibility: created.visibility },
        })
      } else {
        // fall back: refetch
        await loadAll()
      }
      setShowCreate(false)
      setCreateName('')
      setCreateDescription('')
      setCreateVisibility('private')
    } catch (err) {
      console.error('[Lists] create failed', err)
      setCreateError(t('lists.create.error', {}, { defaultValue: 'Could not create list.' }))
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 10), cm.mxAuto)}>
      <header
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 8),
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-[0.3em] text-primary',
            )}
          >
            {t('lists.eyebrow', {}, { defaultValue: 'Curated stacks' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('5xl'), cm.sp('mt', 2), 'leading-tight')}
            style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
          >
            {t('lists.heading', {}, { defaultValue: 'Lists' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mt', 2),
              cm.maxW('xl'),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'lists.subheading',
              {},
              {
                defaultValue:
                  'Curated by neighbors, editors, and the foodies whose palate you trust — start one of your own or follow a lead.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          data-testid="lists-new"
          onClick={() => setShowCreate(true)}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.flex({ align: 'center', gap: 'sm' }),
            'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-md',
          )}
        >
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            add
          </span>
          {t('lists.newList', {}, { defaultValue: 'New list' })}
        </button>
      </header>

      {showCreate ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('lists.create.heading', {}, { defaultValue: 'Create list' })}
          className={cm.cn(
            'fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm',
            cm.sp('p', 4),
          )}
        >
          <form
            onSubmit={handleCreate}
            className={cm.cn(
              cm.sp('p', 6),
              cm.maxW('md'),
              'w-full bg-surface rounded-2xl border border-outline-variant/40 shadow-2xl',
            )}
          >
            <h2
              className={cm.cn(cm.textSize('2xl'), 'leading-tight')}
              style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
            >
              {t('lists.create.heading', {}, { defaultValue: 'Create list' })}
            </h2>
            <div className={cm.cn(cm.sp('mt', 5), cm.flex({ direction: 'col', gap: 'md' }))}>
              <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.name', {}, { defaultValue: 'Name' })}
                </span>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  data-testid="list-create-name"
                  required
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
                  )}
                />
              </label>
              <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.description', {}, { defaultValue: 'Description' })}
                </span>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  data-testid="list-create-description"
                  rows={3}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors leading-relaxed',
                  )}
                  style={{ fontFamily: '"Lora", Georgia, serif' }}
                />
              </label>
              <fieldset>
                <legend
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant block',
                  )}
                >
                  {t('lists.create.visibilityLabel', {}, { defaultValue: 'Visibility' })}
                </legend>
                <div className={cm.cn(cm.flex({ gap: 'xs' }), cm.sp('mt', 2))}>
                  {(['private', 'public'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setCreateVisibility(v)}
                      data-testid={`list-create-visibility-${v}`}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'rounded-full transition-colors',
                        createVisibility === v
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'bg-surface-container-low text-on-surface hover:bg-surface-container',
                      )}
                    >
                      {t(
                        `lists.create.visibility.${v}`,
                        {},
                        { defaultValue: v === 'private' ? 'Private' : 'Public' },
                      )}
                    </button>
                  ))}
                </div>
              </fieldset>
              {createError ? <p className={'text-error text-sm'}>{createError}</p> : null}
            </div>
            <footer className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), cm.sp('mt', 6))}>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false)
                  setCreateError(null)
                }}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-full text-on-surface-variant hover:bg-surface-container transition-colors',
                )}
              >
                {t('lists.create.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={!createName.trim() || creating}
                data-testid="list-create-submit"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50',
                )}
              >
                {creating
                  ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                  : t('lists.create.submit', {}, { defaultValue: 'Create list' })}
              </button>
            </footer>
          </form>
        </div>
      ) : null}

      {loading ? (
        <p className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-on-surface-variant')}>
          {t('lists.loading', {}, { defaultValue: 'Loading lists…' })}
        </p>
      ) : error ? (
        <p className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-error')}>{error}</p>
      ) : (
        <>
          <section className={cm.sp('mb', 12)}>
            <h2
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('lists.yours.heading', {}, { defaultValue: 'Your lists' })}
            </h2>
            {yourLists.length === 0 ? (
              <p
                data-testid="lists-yours-empty"
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.textCenter,
                  'rounded-2xl border border-dashed border-outline-variant text-on-surface-variant',
                )}
              >
                {t(
                  'lists.yours.empty',
                  {},
                  { defaultValue: 'You haven’t started a list yet — try “New list”.' },
                )}
              </p>
            ) : (
              <div
                data-testid="lists-yours"
                className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-6')}
              >
                {yourLists.map((l) => (
                  <ListCard key={l.id} list={l} isYours />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('lists.trending.heading', {}, { defaultValue: 'Trending in the community' })}
            </h2>
            {trendingLists.length === 0 ? (
              <p
                data-testid="lists-public-empty"
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.textCenter,
                  'rounded-2xl border border-dashed border-outline-variant text-on-surface-variant',
                )}
              >
                {t('lists.trending.empty', {}, { defaultValue: 'No public lists yet.' })}
              </p>
            ) : (
              <div
                data-testid="lists-public"
                className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}
              >
                {trendingLists.map((l) => (
                  <ListCard key={l.id} list={l} isYours={false} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
