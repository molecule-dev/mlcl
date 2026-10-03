import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { LeaderboardRow } from '../components/LeaderboardRow.js'
import { QuizCard, type QuizCardProps } from '../components/QuizCard.js'
import { QuizStatsRow } from '../components/QuizStatsRow.js'

interface QuestionRow {
  id: string
  prompt: string
  position: number
}

interface QuizRow {
  id: string
  title: string
  description?: string | null
  category?: string | null
  status: string
  cover_url?: string | null
  time_per_question_s?: number
  play_count?: number
}

interface LeaderboardEntry {
  user_id: string
  nickname?: string
  username?: string
  best_score?: number
  total_score?: number
  score?: number
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

const CATEGORY_GLYPH: Record<string, string> = {
  geography: 'public',
  science: 'science',
  history: 'history_edu',
  arts: 'palette',
  sports: 'sports_soccer',
  pop: 'theater_comedy',
  general: 'auto_awesome',
}

const CATEGORY_HUE: Record<string, NonNullable<QuizCardProps['hue']>> = {
  science: 'tertiary',
  geography: 'sky',
  history: 'amber',
  arts: 'rose',
  sports: 'emerald',
  pop: 'rose',
  general: 'primary',
}

export function QuizDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const quizId = id ?? ''
  const [quiz, setQuiz] = useState<QuizRow | null>(null)
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [related, setRelated] = useState<QuizRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    if (!quizId) return
    setLoading(true)
    setError(false)
    try {
      const [quizRes, qRes, lbRes, allRes] = await Promise.allSettled([
        http.get(`/api/quizzes/${quizId}`),
        http.get(`/api/questions/quiz/${quizId}`),
        http.get(`/api/leaderboard/quiz/${quizId}`),
        http.get('/api/quizzes'),
      ])
      const loadedQuiz =
        quizRes.status === 'fulfilled' ? unwrap<QuizRow | null>(quizRes.value) : null
      if (quizRes.status === 'fulfilled') {
        setQuiz(unwrap<QuizRow>(quizRes.value))
      }
      if (qRes.status === 'fulfilled') {
        const list = unwrap<QuestionRow[]>(qRes.value) ?? []
        setQuestions(Array.isArray(list) ? list : [])
      }
      if (lbRes.status === 'fulfilled') {
        const list = unwrap<LeaderboardEntry[]>(lbRes.value) ?? []
        setLeaderboard(Array.isArray(list) ? list : [])
      }
      if (allRes.status === 'fulfilled') {
        const list = unwrap<QuizRow[]>(allRes.value) ?? []
        setRelated(
          Array.isArray(list)
            ? list
                .filter((q) => q.id !== quizId && q.id !== loadedQuiz?.id)
                .sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0))
                .slice(0, 3)
            : [],
        )
      }
      // The quiz row is the page's subject: if IT fails to load, the page has
      // no subject — say so instead of spinning forever.
      if (quizRes.status === 'rejected') setError(true)
    } finally {
      setLoading(false)
    }
  }, [http, quizId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
        {t('quizDetail.loading', {}, { defaultValue: 'Loading quiz…' })}
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className={cm.cn(cm.stack(4), cm.sp('py', 12))}>
        <LoadErrorBanner
          onRetry={refresh}
          message={t('quizDetail.loadError', {}, { defaultValue: 'Could not load this quiz.' })}
        />
      </div>
    )
  }

  const cat = (quiz.category ?? 'general').toLowerCase()
  const glyph = CATEGORY_GLYPH[cat] ?? 'auto_awesome'
  const totalPlays = quiz.play_count ?? 0
  const durationMin = Math.max(
    1,
    Math.round(((quiz.time_per_question_s ?? 20) * (questions.length || 5)) / 60),
  )

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('py', 8))} data-testid="quiz-detail">
      <section
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-tertiary via-primary to-[var(--quiz-gradient-to)] text-white shadow-2xl shadow-primary/30',
          cm.sp('p', 10),
        )}
      >
        <span
          className={cm.cn(
            'absolute -right-24 -bottom-24 w-72 h-72 rounded-full bg-amber-400/30 blur-3xl',
          )}
          aria-hidden="true"
        />
        <span
          className={cm.cn(
            'absolute -left-20 -top-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
          aria-hidden="true"
        />
        <span
          className={cm.cn(
            'material-symbols-outlined absolute right-12 bottom-8 text-[180px] text-white/10 rotate-[-12deg] select-none',
          )}
          aria-hidden="true"
        >
          rocket_launch
        </span>
        <div className={cm.cn('relative z-10', cm.maxW('lg'))}>
          <span
            className={cm.cn(
              'inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest',
              cm.sp('mb', 4),
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
              {glyph}
            </span>
            {quiz.category ?? 'General'}
          </span>
          <h1
            className={cm.cn(
              'text-4xl md:text-5xl font-extrabold tracking-tight leading-[0.95] mb-3',
            )}
            data-testid="quiz-title"
          >
            {quiz.title}
          </h1>
          {quiz.description ? (
            <p className={cm.cn('text-white/85 text-base max-w-md mb-6')}>{quiz.description}</p>
          ) : null}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 6 }),
              'flex-wrap text-xs uppercase tracking-widest font-black opacity-90',
            )}
          >
            <span className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                quiz
              </span>
              {t(
                'quizDetail.questionCount',
                { count: questions.length },
                { defaultValue: '{{count}} questions' },
              )}
            </span>
            <span className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                timer
              </span>
              {t(
                'quizDetail.duration',
                { minutes: durationMin },
                { defaultValue: '~{{minutes}} min' },
              )}
            </span>
            <span className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                groups
              </span>
              {t('quizDetail.plays', { count: totalPlays }, { defaultValue: '{{count}} plays' })}
            </span>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mt', 8), 'flex-wrap')}>
            <Link
              to={`/quiz/${quizId}/play`}
              data-testid="play-solo"
              className={cm.cn(
                'inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-amber-400 text-amber-950 font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-amber-400/30 hover:bg-amber-300 transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                play_arrow
              </span>
              {t('quizDetail.playSolo', {}, { defaultValue: 'Play solo' })}
            </Link>
            <Link
              to={`/quiz/${quizId}/lobby`}
              data-testid="host-multiplayer"
              className={cm.cn(
                'inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-surface/15 text-white font-extrabold text-sm uppercase tracking-widest backdrop-blur-md border border-surface/20 hover:bg-surface/25 transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                bolt
              </span>
              {t('quizDetail.hostMultiplayer', {}, { defaultValue: 'Host multiplayer' })}
            </Link>
          </div>
        </div>
      </section>

      <QuizStatsRow
        stats={[
          {
            key: 'questions',
            label: 'Questions',
            value: String(questions.length),
            glyph: 'quiz',
            accent: 'primary',
          },
          {
            key: 'plays',
            label: 'Plays',
            value: String(totalPlays),
            glyph: 'sports_esports',
            accent: 'amber',
          },
          {
            key: 'duration',
            label: 'Duration',
            value: `${durationMin} min`,
            glyph: 'timer',
            accent: 'emerald',
          },
        ]}
      />

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-3')}>
        <div
          className={cm.cn(
            'lg:col-span-2 rounded-3xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            cm.sp('p', 6),
          )}
        >
          <h2 className={cm.cn('text-lg font-extrabold tracking-tight mb-3')}>
            {t('quizDetail.previewTitle', {}, { defaultValue: 'Question preview' })}
          </h2>
          {questions.length === 0 ? (
            <p className={cm.cn('text-sm text-on-surface-variant')}>
              {t('quizDetail.previewEmpty', {}, { defaultValue: 'No questions in this quiz yet.' })}
            </p>
          ) : (
            <ol className={cm.cn('space-y-3')} data-testid="question-preview">
              {questions.slice(0, 5).map((q, i) => (
                <li
                  key={q.id}
                  className={cm.cn(
                    cm.sp('p', 4),
                    'rounded-2xl bg-surface-container-low border border-outline-variant/10',
                    cm.flex({ align: 'start', gap: 3 }),
                  )}
                >
                  <span
                    className={cm.cn(
                      'w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm flex-shrink-0',
                    )}
                  >
                    {i + 1}
                  </span>
                  <p className={cm.cn('text-sm font-semibold leading-snug')}>{q.prompt}</p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div
          className={cm.cn(
            'rounded-3xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            cm.sp('p', 6),
          )}
        >
          <h2 className={cm.cn('text-lg font-extrabold tracking-tight mb-4')}>
            {t('quizDetail.topPlayersTitle', {}, { defaultValue: 'Top players' })}
          </h2>
          {leaderboard.length === 0 ? (
            <p className={cm.cn('text-sm text-on-surface-variant')}>
              {t(
                'quizDetail.leaderboardEmpty',
                {},
                { defaultValue: 'No plays yet — be the first to set a score.' },
              )}
            </p>
          ) : (
            <div className={cm.stack(2)}>
              {leaderboard.slice(0, 5).map((entry, i) => {
                const displayName = entry.nickname ?? entry.username ?? entry.user_id
                const score = Number(entry.best_score ?? entry.total_score ?? entry.score ?? 0)
                return (
                  <LeaderboardRow
                    key={`${entry.user_id}-${i}`}
                    rank={i + 1}
                    username={displayName}
                    displayName={displayName}
                    avatarSeed={entry.user_id}
                    score={score}
                    streakDays={0}
                  />
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* More like this (design: related-quiz card rail) */}
      {related.length > 0 ? (
        <section data-testid="quiz-related" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn('text-lg font-extrabold tracking-tight text-on-surface')}>
            {t('quizDetail.relatedTitle', {}, { defaultValue: 'More like this' })}
          </h2>
          <div className={cm.grid({ cols: 3, gap: 'md' })}>
            {related.map((q) => {
              const qCat = (q.category ?? 'general').toLowerCase()
              return (
                <QuizCard
                  key={q.id}
                  id={q.id}
                  title={q.title}
                  category={q.category ?? 'General'}
                  questions={0}
                  plays={q.play_count ?? 0}
                  durationMinutes={Math.max(
                    1,
                    Math.round(((q.time_per_question_s ?? 20) * 5) / 60),
                  )}
                  difficulty="medium"
                  iconGlyph={CATEGORY_GLYPH[qCat] ?? 'auto_awesome'}
                  hue={CATEGORY_HUE[qCat] ?? 'sky'}
                  ctaTo={`/quiz/${q.id}`}
                />
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default QuizDetail
