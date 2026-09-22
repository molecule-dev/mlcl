import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageBody, PageHeader } from '../components/PageHeader.js'

interface DeckRow {
  id: string
  name: string
  description?: string
  topic_id?: string | null
  card_count: number
  due_count: number
  mastery_pct: number
}

export function Flashcards() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [decks, setDecks] = useState<DeckRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')

  const refresh = () => {
    http
      .get<DeckRow[]>('/api/decks')
      .then((res) => {
        setDecks(Array.isArray(res.data) ? res.data : [])
        setError(null)
      })
      .catch((e: unknown) => {
        setError(
          e instanceof Error
            ? e.message
            : t('flashcards.error', {}, { defaultValue: 'Could not load decks.' }),
        )
        setDecks([])
      })
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draftName.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await http.post<{ id?: string }>('/api/decks', { name: draftName.trim() })
      // Fire-and-forget funnel event (no-ops without an analytics provider).
      void track({
        name: 'set.created',
        properties: { deckId: res.data?.id, name: draftName.trim() },
      })
      setDraftName('')
      setShowCreate(false)
      refresh()
    } catch (err) {
      setCreateError(
        err instanceof Error
          ? err.message
          : t('flashcards.createError', {}, { defaultValue: 'Could not create deck.' }),
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      data-mol-id="page-flashcards"
      className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}
    >
      <PageHeader
        eyebrow={t('flashcards.eyebrow', {}, { defaultValue: 'Decks' })}
        title={t('flashcards.title', {}, { defaultValue: 'Flashcards' })}
        subtitle={t(
          'flashcards.subtitle',
          {},
          { defaultValue: 'Spaced repetition that adapts to your pace.' },
        )}
        actions={
          <button
            type="button"
            data-mol-id="flashcards-new"
            onClick={() => setShowCreate((v) => !v)}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2.5),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              cm.flex({ align: 'center', gap: 'xs' }),
              'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 transition-opacity',
            )}
          >
            <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
              add
            </span>
            {showCreate
              ? t('common.cancel', {}, { defaultValue: 'Cancel' })
              : t('flashcards.create', {}, { defaultValue: 'New deck' })}
          </button>
        }
      />

      <PageBody>
        {showCreate ? (
          <form
            data-mol-id="flashcards-new-form"
            onSubmit={handleCreate}
            className={cm.cn(
              cm.sp('p', 5),
              cm.flex({ direction: 'col', gap: 'sm' }),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
            )}
          >
            <label
              htmlFor="deck-name"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('flashcards.nameLabel', {}, { defaultValue: 'Deck name' })}
            </label>
            <input
              id="deck-name"
              data-mol-id="flashcards-new-name"
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              required
              maxLength={200}
              placeholder={t(
                'flashcards.deckPrompt',
                {},
                { defaultValue: 'e.g. Spanish vocab — A1' },
              )}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface focus:border-primary focus:outline-none',
              )}
            />
            {createError ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{createError}</p>
            ) : null}
            <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }))}>
              <button
                type="submit"
                data-mol-id="flashcards-new-submit"
                disabled={creating || !draftName.trim()}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2.5),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity',
                )}
              >
                {creating
                  ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                  : t('common.create', {}, { defaultValue: 'Create' })}
              </button>
            </div>
          </form>
        ) : null}

        {decks === null ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('flashcards.loading', {}, { defaultValue: 'Loading decks…' })}
          </p>
        ) : error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p>
        ) : decks.length === 0 ? (
          <div
            data-mol-id="flashcards-empty"
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
              style
            </span>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('semibold'),
                'mb-1 text-on-surface',
              )}
            >
              {t('flashcards.empty.title', {}, { defaultValue: 'No decks yet' })}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'serif-text italic text-on-surface-variant')}>
              {t(
                'flashcards.empty.body',
                {},
                { defaultValue: 'Create your first deck to start practicing.' },
              )}
            </p>
          </div>
        ) : (
          <div className={'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'}>
            {decks.map((deck) => (
              <Link
                key={deck.id}
                to={`/flashcards/${deck.id}`}
                data-mol-id="flashcards-deck-link"
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.flex({ direction: 'col', gap: 'md' }),
                  'group rounded-[1.5rem] border border-outline-variant/20 bg-surface-container-lowest transition-shadow hover:shadow-ambient',
                )}
              >
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <div
                    className={cm.cn(
                      cm.w(12),
                      cm.h(12),
                      cm.flex({ align: 'center', justify: 'center' }),
                      'rounded-2xl bg-primary-container/15',
                    )}
                  >
                    <span
                      className={'material-symbols-outlined text-primary text-2xl'}
                      aria-hidden="true"
                    >
                      style
                    </span>
                  </div>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.roundedFull,
                      'uppercase tracking-wider bg-secondary-fixed-dim/30 text-secondary',
                    )}
                  >
                    {deck.due_count > 0
                      ? t(
                          'flashcards.dueCount',
                          { count: deck.due_count },
                          { defaultValue: '{{count}} due' },
                        )
                      : t('flashcards.noneDue', {}, { defaultValue: 'Up to date' })}
                  </span>
                </div>
                <div>
                  <h3
                    className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}
                  >
                    {deck.name}
                  </h3>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'mt-1 uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(
                      'flashcards.cardSummary',
                      { count: deck.card_count },
                      { defaultValue: '{{count}} cards' },
                    )}
                  </p>
                </div>
                <div>
                  <div
                    className={cm.cn(
                      cm.flex({ justify: 'between' }),
                      cm.textSize('xs'),
                      cm.sp('mb', 2),
                      'font-medium',
                    )}
                  >
                    <span className="text-on-surface-variant">
                      {t('flashcards.mastery', {}, { defaultValue: 'Mastery' })}
                    </span>
                    <span className="font-bold text-primary tabular-nums">{deck.mastery_pct}%</span>
                  </div>
                  <div
                    className={
                      'h-2 w-full overflow-hidden rounded-full bg-surface-container-highest'
                    }
                  >
                    <div
                      className={
                        'h-full rounded-full bg-gradient-to-r from-primary to-inverse-primary transition-all duration-700 ease-out'
                      }
                      style={{ width: `${deck.mastery_pct}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageBody>
    </div>
  )
}
