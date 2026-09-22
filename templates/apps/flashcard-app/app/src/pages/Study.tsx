import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { FlashcardSurface } from '../components/FlashcardSurface.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Deck {
  id: string
  name: string
}

interface Card {
  id: string
  deck_id: string
  front: string
  back: string
  state: 'new' | 'learning' | 'review' | 'relearning'
  ease_factor: number
  interval_days: number
  tags: string[]
}

type AnswerGrade = 'again' | 'hard' | 'good' | 'easy'

interface AnswerButton {
  grade: AnswerGrade
  quality: number
  labelKey: string
  labelDefault: string
  intervalKey: string
  intervalDefault: string
  toneClasses: string
}

// SM-2 quality mapping. POST /api/study/review uses 0..5; we collapse the
// four user-facing buttons to four representative qualities.
const ANSWER_BUTTONS: AnswerButton[] = [
  {
    grade: 'again',
    quality: 0,
    labelKey: 'study.answer.again',
    labelDefault: 'Again',
    intervalKey: 'study.interval.again',
    intervalDefault: '< 1m',
    toneClasses: 'bg-gradient-to-br from-error to-error-container text-white',
  },
  {
    grade: 'hard',
    quality: 3,
    labelKey: 'study.answer.hard',
    labelDefault: 'Hard',
    intervalKey: 'study.interval.hard',
    intervalDefault: '6m',
    toneClasses: 'bg-gradient-to-br from-warning to-warning-container text-white',
  },
  {
    grade: 'good',
    quality: 4,
    labelKey: 'study.answer.good',
    labelDefault: 'Good',
    intervalKey: 'study.interval.good',
    intervalDefault: '1d',
    toneClasses: 'bg-gradient-to-br from-success to-success-container text-white',
  },
  {
    grade: 'easy',
    quality: 5,
    labelKey: 'study.answer.easy',
    labelDefault: 'Easy',
    intervalKey: 'study.interval.easy',
    intervalDefault: '4d',
    toneClasses: 'bg-gradient-to-br from-info to-info-container text-white',
  },
]

const KEY_TO_GRADE: Record<string, AnswerGrade> = {
  '1': 'again',
  '2': 'hard',
  '3': 'good',
  '4': 'easy',
}

interface SessionState {
  reviewed: number
  again: number
  hard: number
  good: number
  easy: number
}

const initialSession: SessionState = { reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 }

export function Study() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { deckId = '' } = useParams<{ deckId: string }>()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [queue, setQueue] = useState<Card[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [session, setSession] = useState<SessionState>(initialSession)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [grading, setGrading] = useState(false)

  useEffect(() => {
    if (!deckId) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/decks/${deckId}`),
      // Prefer due cards; fall back to all cards if none are due so a
      // freshly-created deck still has a non-empty session.
      http.get(`/api/study/deck/${deckId}/due`).catch(() => []),
    ])
      .then(async ([d, dueRes]) => {
        if (cancelled) return
        setDeck(unwrapSingle<Deck>(d))
        const due = unwrapList<Card>(dueRes)
        if (due.length > 0) {
          setQueue(due.slice(0, 20))
        } else {
          // Surface ALL cards (cap 20) so a fresh-deck practice session works.
          const allRes = await http.get(`/api/cards?deck_id=${deckId}`)
          if (!cancelled) setQueue(unwrapList<Card>(allRes).slice(0, 20))
        }
        if (!cancelled && unwrapList<Card>(dueRes).length > 0) {
          void track({
            name: 'session.started',
            properties: { deck_id: deckId, cards: Math.min(due.length, 20) },
          })
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('study.loadError', {}, { defaultValue: 'Failed to load study session.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, deckId, t])

  const card = queue[index]
  const done = !card

  const grade = async (g: AnswerGrade) => {
    if (!card || grading) return
    const button = ANSWER_BUTTONS.find((b) => b.grade === g)
    if (!button) return
    setGrading(true)
    try {
      // The actual SR work — without this the grade is pure local state.
      await http.post('/api/study/review', { card_id: card.id, quality: button.quality })
      void track({
        name: 'review.answered',
        properties: { card_id: card.id, deck_id: deckId, grade: g, quality: button.quality },
      })
      setSession((s) => ({ ...s, reviewed: s.reviewed + 1, [g]: s[g] + 1 }))
      setFlipped(false)
      const wasLast = index + 1 >= queue.length
      setIndex((i) => i + 1)
      if (wasLast) {
        void track({
          name: 'session.completed',
          properties: { deck_id: deckId, cards: queue.length },
        })
      }
    } catch (_error) {
      setError(
        t('study.gradeError', {}, { defaultValue: 'Could not save your review. Try again.' }),
      )
    } finally {
      setGrading(false)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return
      if (!flipped && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        setFlipped(true)
        return
      }
      if (flipped) {
        const g = KEY_TO_GRADE[e.key]
        if (g) {
          e.preventDefault()
          void grade(g)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, done, card, grading])

  const progressPct = useMemo(
    () => (queue.length === 0 ? 0 : Math.round((session.reviewed / queue.length) * 100)),
    [session.reviewed, queue.length],
  )

  if (error)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')} data-mol-id="study-error">
        {error}
      </p>
    )
  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )

  return (
    <div
      className={cm.cn(
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.maxW('2xl'),
        cm.mxAuto,
        cm.flex({ direction: 'col', gap: 'lg' }),
      )}
    >
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <Link
          to={`/decks/${deckId}`}
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('study.backLink', { name: deck?.name ?? '' }, { defaultValue: 'Back to deck' })}
        </Link>
        <span
          className="text-[10px] font-black uppercase tracking-[0.25em] text-on-surface-variant"
          data-mol-id="study-progress"
        >
          {t(
            'study.progressLabel',
            { reviewed: session.reviewed, total: queue.length },
            { defaultValue: '{{reviewed}} of {{total}}' },
          )}
        </span>
      </header>

      <div
        className={cm.cn('relative h-1.5 w-full overflow-hidden rounded-full bg-surface-container')}
      >
        <div
          className={cm.cn(
            'h-full rounded-full bg-gradient-to-r from-primary to-tertiary transition-all duration-500',
          )}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {done ? (
        queue.length === 0 ? (
          <EmptyDeck deckId={deckId} deckName={deck?.name ?? ''} />
        ) : (
          <SessionDone
            deck={deck}
            session={session}
            onRestart={() => {
              setIndex(0)
              setSession(initialSession)
              setFlipped(false)
            }}
            onExit={() => navigate(`/study/${deckId}/summary`)}
          />
        )
      ) : (
        <>
          <FlashcardSurface
            front={card.front}
            back={card.back}
            flipped={flipped}
            onFlip={() => setFlipped(true)}
            cardIndex={index}
            totalCards={queue.length}
            tags={card.tags}
          />

          {flipped && (
            // 2 columns on phones (44px+ tap targets stay thumb-sized), 4 on
            // md+ — a 1-col responsive collapse would push Easy below the fold.
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
              {ANSWER_BUTTONS.map((b, i) => (
                <button
                  key={b.grade}
                  type="button"
                  onClick={() => void grade(b.grade)}
                  disabled={grading}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 4),
                    cm.fontWeight('bold'),
                    'min-h-[64px] rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50',
                    b.toneClasses,
                  )}
                  data-mol-id={`answer-${b.grade}`}
                >
                  <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'xs' }))}>
                    <span className={cm.cn('text-sm font-extrabold tracking-tight')}>
                      {t(b.labelKey, {}, { defaultValue: b.labelDefault })}
                    </span>
                    <span className="text-[11px] font-medium opacity-80">
                      {t(b.intervalKey, {}, { defaultValue: b.intervalDefault })}
                    </span>
                    <kbd
                      className={cm.cn(
                        'hidden md:inline-block rounded border border-surface/30 bg-surface/15 px-1 text-[9px] font-mono font-bold',
                      )}
                    >
                      {i + 1}
                    </kbd>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!flipped && (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
                'hidden md:flex text-xs text-on-surface-variant',
              )}
            >
              <span className={cm.cn('inline-flex items-center gap-1')}>
                <kbd
                  className={cm.cn(
                    'rounded border border-outline-variant bg-surface-container-low px-1.5 py-0.5 font-mono',
                  )}
                >
                  Space
                </kbd>
                {t('study.flipKeyHint', {}, { defaultValue: 'flip' })}
              </span>
              <span aria-hidden="true">·</span>
              <span className={cm.cn('inline-flex items-center gap-1')}>
                <kbd
                  className={cm.cn(
                    'rounded border border-outline-variant bg-surface-container-low px-1.5 py-0.5 font-mono',
                  )}
                >
                  1-4
                </kbd>
                {t('study.gradeKeyHint', {}, { defaultValue: 'grade after flip' })}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EmptyDeck({ deckId, deckName }: { deckId: string; deckName: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      data-mol-id="study-empty"
      className={cm.cn(
        cm.sp('p', 10),
        cm.textCenter,
        'rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-lowest',
      )}
    >
      <h2 className={cm.cn(cm.fontWeight('bold'), 'text-2xl font-extrabold')}>
        {t('study.empty.heading', { name: deckName }, { defaultValue: 'Nothing to study yet' })}
      </h2>
      <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
        {t(
          'study.empty.body',
          {},
          { defaultValue: 'Add your first card to start a study session.' },
        )}
      </p>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
          cm.sp('mt', 6),
        )}
      >
        <Link
          to={`/decks/${deckId}/cards/new`}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'text-sm rounded-xl bg-primary text-on-primary',
          )}
        >
          {t('study.empty.addCard', {}, { defaultValue: 'Add a card' })}
        </Link>
      </div>
    </div>
  )
}

function SessionDone({
  deck,
  session,
  onRestart,
  onExit,
}: {
  deck: Deck | null
  session: SessionState
  onRestart: () => void
  onExit: () => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const goodOrEasy = session.good + session.easy
  const accuracy = session.reviewed > 0 ? Math.round((goodOrEasy / session.reviewed) * 100) : 0
  return (
    <div
      data-mol-id="study-session-done"
      className={cm.cn(
        cm.sp('p', 10),
        'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-success-container/40 via-surface to-primary-container/30 border border-outline-variant/20 shadow-md text-center',
      )}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -top-20 -right-16 h-56 w-56 rounded-full bg-success/15 blur-3xl',
        )}
      />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant">
        {t('study.summary.heading', {}, { defaultValue: 'Session complete' })}
      </p>
      {deck && (
        <h2 className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 2), 'text-2xl font-extrabold')}>
          {deck.name}
        </h2>
      )}
      <p
        className={cm.cn(
          cm.fontWeight('bold'),
          cm.sp('mt', 6),
          'text-7xl font-extrabold tracking-tighter text-primary',
        )}
      >
        {accuracy}%
      </p>
      <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-on-surface-variant')}>
        {t(
          'study.summary.body',
          {
            reviewed: session.reviewed,
            again: session.again,
            hard: session.hard,
            good: session.good,
            easy: session.easy,
          },
          {
            defaultValue:
              '{{reviewed}} cards · Again {{again}} · Hard {{hard}} · Good {{good}} · Easy {{easy}}',
          },
        )}
      </p>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
          cm.sp('mt', 8),
        )}
      >
        <button
          type="button"
          onClick={onRestart}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'text-sm rounded-xl border border-outline-variant bg-surface hover:bg-surface-container transition-colors',
          )}
        >
          {t('study.summary.restart', {}, { defaultValue: 'Review again' })}
        </button>
        <button
          type="button"
          onClick={onExit}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'text-sm rounded-xl bg-primary text-on-primary hover:bg-primary-fixed-dim transition-colors shadow-sm',
          )}
        >
          {t('study.summary.done', {}, { defaultValue: 'See full summary' })}
        </button>
      </div>
    </div>
  )
}
