import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ScoreBreakdownCard } from '../components/ScoreBreakdownCard.js'
import { SparqLogo } from '../components/SparqLogo.js'

interface RecapRow {
  id: string
  position: number
  prompt: string
  correct_answer: string
  explanation?: string | null
  your_answer: string | null
  is_correct: boolean
  points_earned: number
  time_taken_ms: number
}

interface ResultsPayload {
  quiz: { title?: string } | null
  participantsTotal: number
  rank: number | null
  score: number
  totalCorrect: number
  totalQuestions: number
  recap: RecapRow[]
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

export function Results() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id: quizId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  const http = useHttpClient()
  const [data, setData] = useState<ResultsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setError(t('results.missingSession', {}, { defaultValue: 'No session to summarise.' }))
      setLoading(false)
      return
    }
    try {
      const res = await http.get(`/api/sessions/${sessionId}/results`)
      setData(unwrap<ResultsPayload>(res))
    } catch (err) {
      setError(t('results.error', {}, { defaultValue: 'Could not load results.' }))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [http, sessionId, t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (loading) {
    return (
      <div
        className={cm.cn(
          cm.minH('screen'),
          cm.flex({ align: 'center', justify: 'center' }),
          'text-on-surface-variant',
        )}
      >
        {t('results.loading', {}, { defaultValue: 'Tallying your score…' })}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div
        className={cm.cn(
          cm.minH('screen'),
          cm.flex({ align: 'center', justify: 'center' }),
          cm.textCenter,
          cm.sp('p', 8),
        )}
      >
        <div>
          <p className={cm.cn('text-base font-bold mb-4')}>{error}</p>
          <Link to="/discover" className={cm.cn('text-sm font-bold text-primary')}>
            {t('results.backToDiscover', {}, { defaultValue: 'Back to Discover' })}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'bg-warning-light/40 dark:bg-surface antialiased')}
      data-testid="results"
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
        )}
      >
        <Link to="/discover">
          <SparqLogo size="sm" />
        </Link>
        <Link
          to="/discover"
          className={cm.cn('text-xs font-semibold text-on-surface-variant hover:text-primary')}
        >
          {t('results.exit', {}, { defaultValue: 'Back to Discover' })}
        </Link>
      </header>

      <main
        className={cm.cn(cm.maxW('2xl'), 'mx-auto', cm.sp('px', 8), cm.sp('py', 6), cm.stack(8))}
      >
        <ScoreBreakdownCard
          correct={data.totalCorrect}
          total={data.totalQuestions}
          rank={data.rank ?? 1}
          totalPlayers={Math.max(data.participantsTotal, 1)}
          pointsEarned={data.score}
          streakBonusPct={0}
          quizTitle={data.quiz?.title ?? t('results.unknownQuiz', {}, { defaultValue: 'Quiz' })}
        />

        <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-3')}>
          {[
            {
              glyph: 'replay',
              title: 'Try again',
              body: 'Same quiz, fresh chance.',
              to: `/quiz/${quizId ?? ''}/play`,
            },
            {
              glyph: 'leaderboard',
              title: 'See leaderboard',
              body: 'Where you landed in the standings.',
              to: '/leaderboard',
            },
            {
              glyph: 'travel_explore',
              title: 'Find another quiz',
              body: 'Keep the streak alive.',
              to: '/discover',
            },
          ].map((card) => (
            <Link
              key={card.glyph}
              to={card.to}
              data-testid={`results-cta-${card.glyph}`}
              className={cm.cn(
                cm.sp('p', 5),
                'group rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm hover:-translate-y-0.5 transition-transform',
              )}
            >
              <span
                className={cm.cn(
                  'inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary mb-3',
                )}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">{card.glyph}</span>
              </span>
              <p className={cm.cn('font-extrabold text-base mb-1')}>
                {t(`results.next.${card.glyph}.title`, {}, { defaultValue: card.title })}
              </p>
              <p className={cm.cn('text-xs text-on-surface-variant')}>
                {t(`results.next.${card.glyph}.body`, {}, { defaultValue: card.body })}
              </p>
            </Link>
          ))}
        </div>

        {data.recap.length > 0 ? (
          <section
            className={cm.cn(
              'rounded-3xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
              cm.sp('p', 6),
            )}
          >
            <h2 className={cm.cn('text-lg font-extrabold tracking-tight mb-4')}>
              {t('results.recap.title', {}, { defaultValue: 'Question recap' })}
            </h2>
            <div
              className={cm.cn('divide-y divide-outline-variant/30')}
              data-testid="results-recap"
            >
              {data.recap.map((row, idx) => (
                <div
                  key={row.id}
                  className={cm.cn(cm.sp('py', 4), cm.flex({ align: 'start', gap: 4 }))}
                >
                  <span
                    className={cm.cn(
                      'w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md flex-shrink-0',
                      row.is_correct ? 'bg-emerald-500' : 'bg-rose-500',
                    )}
                    aria-hidden="true"
                  >
                    <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                      {row.is_correct ? 'check' : 'close'}
                    </span>
                  </span>
                  <div className={cm.flex1}>
                    <p
                      className={cm.cn(
                        'text-[10px] uppercase tracking-widest font-black text-on-surface-variant mb-1',
                      )}
                    >
                      {t(
                        'results.recap.questionLabel',
                        { number: idx + 1 },
                        { defaultValue: 'Question {{number}}' },
                      )}
                    </p>
                    <p className={cm.cn('font-bold text-sm md:text-base mb-2')}>{row.prompt}</p>
                    <div
                      className={cm.cn(cm.flex({ align: 'center', gap: 3 }), 'text-xs flex-wrap')}
                    >
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 1 }),
                          row.is_correct ? 'text-success' : 'text-error line-through',
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-[14px]')}
                          aria-hidden="true"
                        >
                          {row.is_correct ? 'check_circle' : 'cancel'}
                        </span>
                        {t(
                          'results.recap.yourAnswer',
                          { answer: row.your_answer ?? '—' },
                          { defaultValue: 'You: {{answer}}' },
                        )}
                      </span>
                      {!row.is_correct ? (
                        <span className={cm.cn('inline-flex items-center gap-1 text-success')}>
                          <span
                            className={cm.cn('material-symbols-outlined text-[14px]')}
                            aria-hidden="true"
                          >
                            check_circle
                          </span>
                          {t(
                            'results.recap.correctAnswer',
                            { answer: row.correct_answer },
                            { defaultValue: 'Correct: {{answer}}' },
                          )}
                        </span>
                      ) : null}
                    </div>
                    {row.explanation ? (
                      <p
                        className={cm.cn('text-xs text-on-surface-variant mt-2 leading-relaxed')}
                        data-testid="recap-explanation"
                      >
                        {row.explanation}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={cm.cn(
                      'text-warning font-extrabold text-sm tabular-nums flex-shrink-0',
                    )}
                  >
                    +{row.points_earned.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default Results
