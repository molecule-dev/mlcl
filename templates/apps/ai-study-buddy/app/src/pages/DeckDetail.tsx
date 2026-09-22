import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageBody, PageHeader } from '../components/PageHeader.js'

interface CardRow {
  id: string
  front_md: string
  back_md: string
  hint?: string | null
}

interface DeckRow {
  id: string
  name: string
  description?: string
  cards?: CardRow[]
}

export function DeckDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [deck, setDeck] = useState<DeckRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [draftFront, setDraftFront] = useState('')
  const [draftBack, setDraftBack] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)

  const refresh = () => {
    if (!id) return
    http
      .get<DeckRow>(`/api/decks/${id}`)
      .then((res) => {
        setDeck(res.data ?? null)
        setError(null)
      })
      .catch((e: unknown) => {
        setError(
          e instanceof Error
            ? e.message
            : t('deckDetail.error', {}, { defaultValue: 'Could not load deck.' }),
        )
        setDeck(null)
      })
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, id])

  const cards = useMemo<CardRow[]>(() => deck?.cards ?? [], [deck])
  const card = cards.length === 0 ? null : cards[index % cards.length]

  const reveal = () => setFlipped(true)
  const next = () => {
    setFlipped(false)
    setIndex((i) => (cards.length === 0 ? 0 : (i + 1) % cards.length))
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !draftFront.trim() || !draftBack.trim()) return
    setAdding(true)
    setAddError(null)
    try {
      await http.post(`/api/decks/${id}/cards`, {
        front_md: draftFront.trim(),
        back_md: draftBack.trim(),
      })
      // Fire-and-forget funnel event (no-ops without an analytics provider).
      void track({ name: 'deck.card_added', properties: { deckId: id } })
      setDraftFront('')
      setDraftBack('')
      setShowAdd(false)
      refresh()
    } catch (err) {
      setAddError(
        err instanceof Error
          ? err.message
          : t('deckDetail.addError', {}, { defaultValue: 'Could not add card.' }),
      )
    } finally {
      setAdding(false)
    }
  }

  const handleReview = async (rating: 'again' | 'good' | 'easy') => {
    if (!id || !card) return
    setReviewing(true)
    try {
      await http.post(`/api/decks/${id}/cards/${card.id}/review`, { rating })
      // Fire-and-forget funnel event (no-ops without an analytics provider).
      void track({
        name: 'deck.card_reviewed',
        properties: { deckId: id, cardId: card.id, rating },
      })
    } catch (_error) {
      // review POST failed — card still advances so the study flow is uninterrupted
    } finally {
      next()
      setReviewing(false)
    }
  }

  return (
    <div
      data-mol-id="page-deck"
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}
    >
      <PageHeader
        eyebrow={t('deckDetail.eyebrow', {}, { defaultValue: 'Deck' })}
        title={deck?.name ?? t('deckDetail.title', {}, { defaultValue: 'Deck' })}
        subtitle={t(
          'deckDetail.subtitle',
          {},
          { defaultValue: 'Active recall — flip when you commit to an answer.' },
        )}
        actions={
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-primary hover:bg-surface-container-low transition-colors',
              )}
            >
              {showAdd
                ? t('common.cancel', {}, { defaultValue: 'Cancel' })
                : t('deckDetail.addCard', {}, { defaultValue: '+ Add card' })}
            </button>
            <Link
              to="/flashcards"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-primary hover:underline',
              )}
            >
              {t('deckDetail.allDecks', {}, { defaultValue: '← All decks' })}
            </Link>
          </div>
        }
      />

      <PageBody>
        {showAdd ? (
          <form
            onSubmit={handleAdd}
            className={cm.cn(
              cm.sp('p', 5),
              cm.flex({ direction: 'col', gap: 'sm' }),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
            )}
          >
            <label
              htmlFor="card-front"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('deckDetail.frontLabel', {}, { defaultValue: 'Front (question)' })}
            </label>
            <textarea
              id="card-front"
              value={draftFront}
              onChange={(e) => setDraftFront(e.target.value)}
              required
              rows={3}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface focus:border-primary focus:outline-none',
              )}
            />
            <label
              htmlFor="card-back"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('deckDetail.backLabel', {}, { defaultValue: 'Back (answer)' })}
            </label>
            <textarea
              id="card-back"
              value={draftBack}
              onChange={(e) => setDraftBack(e.target.value)}
              required
              rows={3}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface focus:border-primary focus:outline-none',
              )}
            />
            {addError ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{addError}</p> : null}
            <div className={cm.cn(cm.flex({ justify: 'end' }))}>
              <button
                type="submit"
                disabled={adding || !draftFront.trim() || !draftBack.trim()}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2.5),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity',
                )}
              >
                {adding
                  ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
                  : t('deckDetail.addSubmit', {}, { defaultValue: 'Add card' })}
              </button>
            </div>
          </form>
        ) : null}

        {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}

        {!card ? (
          deck === null && !error ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('deckDetail.loading', {}, { defaultValue: 'Loading deck…' })}
            </p>
          ) : (
            <div
              className={cm.cn(
                cm.sp('p', 12),
                cm.textCenter,
                'rounded-3xl border border-dashed border-outline-variant/30',
              )}
            >
              <span
                className={
                  'material-symbols-outlined text-5xl mb-3 opacity-50 text-on-surface-variant'
                }
                aria-hidden="true"
              >
                add_card
              </span>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('semibold'),
                  'mb-1 text-on-surface',
                )}
              >
                {t('deckDetail.empty.title', {}, { defaultValue: 'No cards yet' })}
              </p>
              <p className={cm.cn(cm.textSize('sm'), 'serif-text italic text-on-surface-variant')}>
                {t(
                  'deckDetail.empty.body',
                  {},
                  { defaultValue: 'Use Add card to populate this deck.' },
                )}
              </p>
            </div>
          )
        ) : (
          <>
            <div>
              <div
                className={cm.cn(
                  cm.flex({ justify: 'between' }),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.sp('mb', 2),
                )}
              >
                <span className="uppercase tracking-widest text-on-surface-variant">
                  {t('nav.progress', {}, { defaultValue: 'Progress' })}
                </span>
                <span className="tabular-nums text-primary">
                  {Math.min((index % cards.length) + 1, cards.length)} / {cards.length}
                </span>
              </div>
              <div
                className={'h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest'}
              >
                <div
                  className={
                    'h-full rounded-full bg-gradient-to-r from-primary to-inverse-primary transition-all duration-500'
                  }
                  style={{ width: `${(((index % cards.length) + 1) / cards.length) * 100}%` }}
                />
              </div>
            </div>

            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
                cm.sp('py', 6),
              )}
            >
              <button
                type="button"
                data-mol-id="deck-card-flip"
                onClick={flipped ? next : reveal}
                className={cm.cn(
                  cm.sp('p', 10),
                  cm.maxW('2xl'),
                  cm.w('full'),
                  cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
                  'min-h-[320px] rounded-[2rem] bg-surface-container-lowest text-center shadow-ambient transition-transform hover:-translate-y-1 active:scale-95',
                )}
              >
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-primary mb-6',
                  )}
                >
                  {flipped
                    ? t('deckDetail.answer', {}, { defaultValue: 'Answer' })
                    : t('deckDetail.question', {}, { defaultValue: 'Question' })}
                </p>
                {flipped ? (
                  <p
                    data-mol-id="deck-card-back"
                    className={cm.cn(cm.textSize('2xl'), 'serif-text leading-snug text-on-surface')}
                  >
                    {card.back_md}
                  </p>
                ) : (
                  <p
                    data-mol-id="deck-card-front"
                    className={cm.cn(cm.textSize('2xl'), 'serif-text leading-snug text-on-surface')}
                  >
                    {card.front_md}
                  </p>
                )}
                {!flipped ? (
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mt', 6),
                      'italic text-on-surface-variant/70',
                    )}
                  >
                    {t('deckDetail.tap', {}, { defaultValue: 'Tap to reveal' })}
                  </p>
                ) : null}
              </button>
            </div>

            {flipped ? (
              <div className={'grid grid-cols-3 gap-3'}>
                {(['again', 'good', 'easy'] as const).map((tone, i) => (
                  <button
                    key={tone}
                    type="button"
                    data-mol-id={`deck-rating-${tone}`}
                    disabled={reviewing}
                    onClick={() => handleReview(tone)}
                    className={cm.cn(
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
                      'rounded-2xl border border-outline-variant/20 transition-colors hover:bg-surface-container-low disabled:opacity-50',
                      i === 0 ? 'text-error' : i === 1 ? 'text-primary' : 'text-success',
                    )}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {tone === 'again' ? 'replay' : tone === 'good' ? 'check' : 'rocket_launch'}
                    </span>
                    <span className={cm.textSize('sm')}>
                      {t(
                        `deckDetail.confidence.${tone}`,
                        {},
                        {
                          defaultValue:
                            tone === 'again' ? 'Again' : tone === 'good' ? 'Good' : 'Easy',
                        },
                      )}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {!flipped && card.hint ? (
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.textCenter,
                  'serif-text italic text-on-surface-variant/80',
                )}
              >
                <span className="text-primary font-bold">
                  {t('deckDetail.hint', {}, { defaultValue: 'Hint:' })}
                </span>{' '}
                {card.hint}
              </p>
            ) : null}
          </>
        )}
      </PageBody>
    </div>
  )
}
