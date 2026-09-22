import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Deck {
  id: string
  name: string
  description: string
  category: string
  card_count: number
  due_count: number
  new_count: number
  retention_rate: number
  last_studied: string | null
}

const CATEGORIES = ['all', 'language', 'science', 'humanities', 'professional', 'personal'] as const
type CategoryFilter = (typeof CATEGORIES)[number]
type DeckCategory = Exclude<CategoryFilter, 'all'>

const DECK_CATEGORIES: DeckCategory[] = [
  'language',
  'science',
  'humanities',
  'professional',
  'personal',
]

const CATEGORY_COLOR: Record<DeckCategory, string> = {
  language: 'bg-primary-container text-on-primary-container',
  science: 'bg-info-container text-on-info-container',
  humanities: 'bg-secondary-container text-on-secondary-container',
  professional: 'bg-success-container text-on-success-container',
  personal: 'bg-tertiary-container text-on-tertiary-container',
}

export function Decks() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/decks')
      .then((res) => {
        if (!cancelled) setDecks(unwrapList<Deck>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('decks.loadError', {}, { defaultValue: 'Failed to load decks.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(() => {
    if (filter === 'all') return decks
    return decks.filter((d) => d.category === filter)
  }, [decks, filter])

  const onCreate = async (name: string, description: string, category: DeckCategory) => {
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await http.post('/api/decks', {
        name: name.trim(),
        description: description.trim(),
        category,
      })
      const created = unwrapSingle<Deck>(res)
      if (created) {
        void track({
          name: 'deck.created',
          properties: { deck_id: created.id, category },
        })
        setDecks((prev) => [created, ...prev])
        setCreateOpen(false)
        navigate(`/decks/${created.id}`)
      }
    } catch (_error) {
      setError(t('decks.createError', {}, { defaultValue: 'Failed to create deck.' }))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('decks.heading', {}, { defaultValue: 'Decks' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'decks.subheading',
              { count: decks.length },
              { defaultValue: '{{count}} decks · review and manage' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          data-mol-id="decks-new"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md',
          )}
        >
          + {t('decks.newDeckLabel', {}, { defaultValue: 'New deck' })}
        </button>
      </header>

      <nav
        aria-label={t('decks.filterLabel', {}, { defaultValue: 'Filter decks by category' })}
        className={cm.cn(cm.flex({ gap: 'xs', align: 'center' }), 'flex-wrap')}
      >
        {CATEGORIES.map((c) => {
          const active = filter === c
          return (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'rounded-full',
                active
                  ? 'bg-primary text-on-primary'
                  : cm.cn('bg-surface border border-outline-variant', 'text-on-surface-variant'),
              )}
              aria-pressed={active}
            >
              {t(`decks.filter.${c}`, {}, { defaultValue: c.charAt(0).toUpperCase() + c.slice(1) })}
            </button>
          )
        })}
      </nav>

      {createOpen && (
        <NewDeckForm busy={creating} onCancel={() => setCreateOpen(false)} onSubmit={onCreate} />
      )}

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('decks.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('decks.empty', {}, { defaultValue: 'No decks in this category.' })}
        </p>
      ) : (
        <ul className={cm.grid({ cols: 2, gap: 'md' })}>
          {visible.map((d) => (
            <li key={d.id}>
              <Link
                to={`/decks/${d.id}`}
                data-mol-id={`deck-${d.id}`}
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 5),
                  'block hover:bg-surface-container space-y-3',
                )}
              >
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'truncate')}>
                    {d.name}
                  </h3>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      'rounded shrink-0',
                      CATEGORY_COLOR[d.category as DeckCategory] ?? 'bg-surface-container',
                    )}
                  >
                    {t(
                      `decks.category.${d.category}`,
                      {},
                      { defaultValue: d.category.charAt(0).toUpperCase() + d.category.slice(1) },
                    )}
                  </span>
                </div>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'line-clamp-2')}>
                  {d.description}
                </p>
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <div className={cm.flex({ align: 'center', gap: 'md' })}>
                    <Stat
                      label={t('decks.totalCards', {}, { defaultValue: 'Cards' })}
                      value={`${d.card_count}`}
                    />
                    <Stat
                      label={t('form.due', {}, { defaultValue: 'Due' })}
                      value={`${d.due_count}`}
                      accent={d.due_count > 0}
                    />
                    <Stat
                      label={t('decks.retention', {}, { defaultValue: 'Retain' })}
                      value={`${Math.round(Number(d.retention_rate ?? 0) * 100)}%`}
                    />
                  </div>
                  {d.due_count > 0 && (
                    <span
                      className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), cm.textPrimary)}
                    >
                      {t('decks.studyArrow', {}, { defaultValue: 'Study →' })}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function NewDeckForm({
  busy,
  onCancel,
  onSubmit,
}: {
  busy: boolean
  onCancel: () => void
  onSubmit: (name: string, description: string, category: DeckCategory) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<DeckCategory>('personal')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(name, description, category)
      }}
      data-mol-id="decks-new-form"
      className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
    >
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('decks.create.heading', {}, { defaultValue: 'Create a deck' })}
      </h2>
      <div className="block">
        <label
          htmlFor="decks-create-name"
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
        >
          {t('decks.create.nameLabel', {}, { defaultValue: 'Deck name' })}
        </label>
        <input
          id="decks-create-name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full border border-outline-variant rounded-md',
          )}
        />
      </div>
      <div className="block">
        <label
          htmlFor="decks-create-description"
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
        >
          {t('form.descriptionOptional', {}, { defaultValue: 'Description (optional)' })}
        </label>
        <input
          id="decks-create-description"
          name="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full border border-outline-variant rounded-md',
          )}
        />
      </div>
      <div className="block">
        <label
          htmlFor="decks-create-category"
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
        >
          {t('form.category', {}, { defaultValue: 'Category' })}
        </label>
        <select
          id="decks-create-category"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as DeckCategory)}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 2),
            'w-full border border-outline-variant rounded-md',
          )}
        >
          {DECK_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(
                `decks.category.${c}`,
                {},
                { defaultValue: c.charAt(0).toUpperCase() + c.slice(1) },
              )}
            </option>
          ))}
        </select>
      </div>
      <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
        <button
          type="button"
          onClick={onCancel}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'border border-outline-variant rounded-md',
          )}
        >
          {t('common.cancel', {}, { defaultValue: 'Cancel' })}
        </button>
        <button
          type="submit"
          disabled={busy || !name.trim()}
          data-mol-id="decks-new-submit"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-md disabled:opacity-50',
          )}
        >
          {busy
            ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
            : t('decks.create.submit', {}, { defaultValue: 'Create deck' })}
        </button>
      </div>
    </form>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const cm = getClassMap()
  return (
    <div>
      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{label}</p>
      <p
        className={cm.cn(
          cm.textSize('base'),
          cm.fontWeight('semibold'),
          accent ? cm.textPrimary : '',
        )}
      >
        {value}
      </p>
    </div>
  )
}
