import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

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
  total_reviews: number
  created_at: string
}

interface Card {
  id: string
  deck_id: string
  front: string
  back: string
  state: 'new' | 'learning' | 'review' | 'relearning'
  ease_factor: number
  interval_days: number
  next_review: string
  total_reviews: number
  lapses: number
  tags: string[]
}

const STATE_COLOR: Record<Card['state'], string> = {
  new: 'bg-info-container text-on-info-container',
  learning: 'bg-warning-container text-on-warning-container',
  review: 'bg-success-container text-on-success-container',
  relearning: 'bg-error-container text-on-error-container',
}

export function DeckDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { deckId = '' } = useParams<{ deckId: string }>()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stateFilter, setStateFilter] = useState<'all' | Card['state']>('all')
  const [deleting, setDeleting] = useState(false)

  const onDeleteDeck = async () => {
    if (
      !window.confirm(
        t(
          'decks.confirmDelete',
          {},
          { defaultValue: 'Delete this deck and all its cards? This cannot be undone.' },
        ),
      )
    ) {
      return
    }
    setDeleting(true)
    try {
      await http.delete(`/api/decks/${deckId}`)
      navigate('/decks')
    } catch (_error) {
      setError(t('deckDetail.deleteError', {}, { defaultValue: 'Failed to delete deck.' }))
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (!deckId) return
    let cancelled = false
    setLoading(true)
    Promise.all([http.get(`/api/decks/${deckId}`), http.get(`/api/cards?deck_id=${deckId}`)])
      .then(([d, c]) => {
        if (cancelled) return
        setDeck(unwrapSingle<Deck>(d))
        setCards(unwrapList<Card>(c))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('deckDetail.loadError', {}, { defaultValue: 'Failed to load deck.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, deckId, t])

  const visible = useMemo(
    () => (stateFilter === 'all' ? cards : cards.filter((c) => c.state === stateFilter)),
    [cards, stateFilter],
  )

  if (error) return <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )
  if (!deck)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('deckDetail.notFound', {}, { defaultValue: 'Deck not found.' })}
      </p>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-6')}>
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <Link
          to="/decks"
          className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'hover:text-on-surface')}
        >
          ← {t('deckDetail.backLink', {}, { defaultValue: 'All decks' })}
        </Link>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            type="button"
            onClick={onDeleteDeck}
            disabled={deleting}
            data-mol-id="deck-delete"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'border border-error/40 text-error rounded hover:bg-error-container/30 disabled:opacity-50',
            )}
          >
            {deleting
              ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
              : t('decks.delete', {}, { defaultValue: 'Delete deck' })}
          </button>
          <Link
            to={`/decks/${deck.id}/cards/new`}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'border border-outline-variant rounded hover:bg-surface-container',
            )}
          >
            + {t('deckDetail.newCardLabel', {}, { defaultValue: 'New card' })}
          </Link>
        </div>
      </div>

      <header className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <div className={cm.flex({ align: 'start', justify: 'between' })}>
          <div>
            <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>{deck.name}</h1>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
              {deck.description}
            </p>
          </div>
          {deck.due_count > 0 && (
            <Link
              to={`/study/${deck.id}`}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md',
              )}
            >
              {t(
                'deckDetail.studyDueLabel',
                { count: deck.due_count },
                { defaultValue: 'Study {{count}} due' },
              )}
            </Link>
          )}
        </div>
        <div className={cm.cn(cm.grid({ cols: 4, gap: 'md' }), cm.sp('mt', 4))}>
          <Stat
            label={t('deckDetail.stat.total', {}, { defaultValue: 'Cards' })}
            value={`${deck.card_count}`}
          />
          <Stat
            label={t('deckDetail.stat.due', {}, { defaultValue: 'Due now' })}
            value={`${deck.due_count}`}
            accent={deck.due_count > 0}
          />
          <Stat label={t('status.new', {}, { defaultValue: 'New' })} value={`${deck.new_count}`} />
          <Stat
            label={t('deckDetail.stat.retain', {}, { defaultValue: 'Retention' })}
            value={`${Math.round(deck.retention_rate * 100)}%`}
          />
        </div>
      </header>

      <nav
        aria-label={t('deckDetail.filterLabel', {}, { defaultValue: 'Filter cards by state' })}
        className={cm.flex({ gap: 'xs', align: 'center' })}
      >
        {(['all', 'new', 'learning', 'review', 'relearning'] as const).map((s) => {
          const active = stateFilter === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStateFilter(s)}
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
              {t(
                `deckDetail.cardState.${s}`,
                {},
                { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
              )}
            </button>
          )
        })}
      </nav>

      <ul className={cm.cn('space-y-2')}>
        {visible.map((c) => (
          <li key={c.id}>
            <Link
              to={`/decks/${deck.id}/cards/${c.id}/edit`}
              className={cm.cn(cm.card(), cm.sp('p', 4), 'block hover:bg-surface-container')}
            >
              <div className={cm.flex({ align: 'start', justify: 'between', gap: 'md' })}>
                <div className={cm.cn(cm.flex1, 'min-w-0 space-y-1')}>
                  <p
                    className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'truncate')}
                    style={{ fontFamily: 'var(--mol-font-serif)' }}
                  >
                    {c.front}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', 'line-clamp-1')}
                    style={{ fontFamily: 'var(--mol-font-serif)' }}
                  >
                    {c.back}
                  </p>
                </div>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0)}>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      'rounded',
                      STATE_COLOR[c.state],
                    )}
                  >
                    {t(`deckDetail.cardState.${c.state}`, {}, { defaultValue: c.state })}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {c.interval_days > 0
                      ? t(
                          'deckDetail.intervalDays',
                          { days: c.interval_days },
                          { defaultValue: '{{days}}d' },
                        )
                      : ''}
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const cm = getClassMap()
  return (
    <div>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          'text-on-surface-variant',
          cm.fontWeight('medium'),
          'uppercase tracking-wider',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('bold'),
          cm.sp('mt', 1),
          accent ? cm.textPrimary : '',
        )}
      >
        {value}
      </p>
    </div>
  )
}
