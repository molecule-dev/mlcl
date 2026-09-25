import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { QuizCard, type QuizCardProps } from '../components/QuizCard.js'

interface QuizRow {
  id: string
  title: string
  description?: string | null
  category?: string | null
  status: string
  cover_url?: string | null
  time_per_question_s?: number
  play_count?: number
  created_at: string
}

const CATEGORY_GLYPH: Record<string, string> = {
  geography: 'public',
  science: 'science',
  history: 'history_edu',
  arts: 'palette',
  sports: 'sports_soccer',
  pop: 'theater_comedy',
  general: 'sparkles',
}
const CATEGORY_HUE: Record<string, NonNullable<QuizCardProps['hue']>> = {
  geography: 'sky',
  science: 'tertiary',
  history: 'emerald',
  arts: 'rose',
  sports: 'amber',
  pop: 'rose',
  general: 'sky',
}

function quizRowToCard(q: QuizRow, ctaTo: string): QuizCardProps & { row: QuizRow } {
  const cat = (q.category ?? 'general').toLowerCase()
  return {
    id: q.id,
    title: q.title,
    category: q.category ?? 'General',
    questions: 0,
    plays: q.play_count ?? 0,
    durationMinutes: Math.max(1, Math.round(((q.time_per_question_s ?? 20) * 5) / 60)),
    difficulty: 'medium',
    iconGlyph: CATEGORY_GLYPH[cat] ?? 'sparkles',
    hue: CATEGORY_HUE[cat] ?? 'sky',
    ctaTo,
    row: q,
  }
}

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

export function MyQuizzes() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'created' | 'played'>('created')
  const [created, setCreated] = useState<QuizRow[]>([])
  const [played, setPlayed] = useState<QuizRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(false)
  // Two-step delete: the first click arms the confirmation, the second commits.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [mineRes, playedRes] = await Promise.allSettled([
        http.get('/api/quizzes?mine=true'),
        http.get('/api/quizzes'),
      ])
      let anyFailed = false
      if (mineRes.status === 'fulfilled') {
        const list = unwrap<QuizRow[]>(mineRes.value) ?? []
        setCreated(Array.isArray(list) ? list : [])
      } else {
        anyFailed = true
      }
      if (playedRes.status === 'fulfilled') {
        const list = unwrap<QuizRow[]>(playedRes.value) ?? []
        setPlayed(Array.isArray(list) ? list : [])
      } else {
        anyFailed = true
      }
      if (anyFailed) setError(true)
    } catch (_error) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleCreate() {
    setCreating(true)
    setError(false)
    try {
      const res = await http.post('/api/quizzes', {
        title: 'Untitled quiz',
        description: '',
        category: 'general',
      })
      const quiz = unwrap<QuizRow>(res)
      if (quiz?.id) {
        track({ name: 'quiz.created', properties: { quiz_id: quiz.id, source: 'my-quizzes' } })
        navigate(`/quiz/${quiz.id}/edit`)
      }
    } catch (_error) {
      setError(true)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    // First click arms the inline confirmation; the second commits.
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id)
      return
    }
    setPendingDeleteId(null)
    // Optimistic remove first; if the request fails we refresh from the
    // server so the row pops back in.
    setCreated((prev) => prev.filter((q) => q.id !== id))
    try {
      await http.delete(`/api/quizzes/${id}`)
      track({ name: 'quiz.deleted', properties: { quiz_id: id } })
    } catch (_error) {
      // Delete failed; refresh restores the optimistically-removed row
      await refresh()
    }
  }

  const list =
    tab === 'created'
      ? created.map((q) => quizRowToCard(q, `/quiz/${q.id}/edit`))
      : played.map((q) => quizRowToCard(q, `/quiz/${q.id}`))

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('py', 8))}>
      <header className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), 'flex-wrap gap-4')}>
        <div>
          <span className={cm.cn('text-[10px] uppercase tracking-widest font-black text-primary')}>
            {t('nav.yourLibrary', {}, { defaultValue: 'Your library' })}
          </span>
          <h1 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mt-1')}>
            {t('myQuizzes.title', {}, { defaultValue: 'My quizzes' })}
          </h1>
          <p className={cm.cn('text-sm text-on-surface-variant mt-2 max-w-md')}>
            {t(
              'myQuizzes.subhead',
              {},
              {
                defaultValue: 'Drafts you have built, plus published quizzes you can play.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className={cm.cn(
            'inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-primary to-tertiary text-white text-sm font-extrabold uppercase tracking-widest shadow-lg shadow-primary/30 hover:scale-[1.02] transition-transform disabled:opacity-60',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
            add
          </span>
          {creating
            ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
            : t('myQuizzes.createButton', {}, { defaultValue: 'New quiz' })}
        </button>
      </header>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 1 }),
          'rounded-2xl bg-surface-container-low p-1 w-max',
        )}
      >
        {(['created', 'played'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTab(option)}
            className={cm.cn(
              'px-5 min-h-[40px] inline-flex items-center rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors',
              tab === option
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t(
              `myQuizzes.tab.${option}`,
              {},
              { defaultValue: option === 'created' ? 'Created by me' : 'Discover' },
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className={cm.cn('text-sm text-on-surface-variant')}>
          {t('myQuizzes.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : error && list.length === 0 ? (
        <LoadErrorBanner
          onRetry={refresh}
          message={t(
            'common.loadError',
            {},
            { defaultValue: 'Something went wrong loading this content.' },
          )}
        />
      ) : list.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-3xl border border-dashed border-outline-variant/40 text-on-surface-variant',
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-4xl text-primary mb-3 inline-block')}
          >
            {tab === 'created' ? 'edit_note' : 'travel_explore'}
          </span>
          <p className={cm.cn('font-bold text-base mb-1')}>
            {tab === 'created'
              ? t('myQuizzes.empty.created', {}, { defaultValue: "You haven't built a quiz yet." })
              : t('myQuizzes.empty.played', {}, { defaultValue: 'No published quizzes yet.' })}
          </p>
          {tab === 'created' ? (
            <Link
              to="#"
              onClick={handleCreate}
              className={cm.cn('text-sm font-bold text-primary hover:underline')}
            >
              {t('myQuizzes.empty.createCta', {}, { defaultValue: 'Build your first quiz →' })}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-3')}>
          {list.map((q) => (
            <div key={q.id} data-testid={`quiz-row-${q.id}`} className={cm.cn(cm.stack(2))}>
              <QuizCard {...q} />
              {tab === 'created' ? (
                <div className={cm.cn(cm.flex({ align: 'center', gap: 2, wrap: 'wrap' }))}>
                  <Link
                    to={`/quiz/${q.id}/edit`}
                    data-testid={`quiz-edit-${q.id}`}
                    className={cm.cn(
                      'inline-flex items-center min-h-[40px] px-2 text-xs font-bold text-primary hover:underline',
                    )}
                  >
                    {t('common.edit', {}, { defaultValue: 'Edit' })}
                  </Link>
                  {pendingDeleteId === q.id ? (
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 2 }),
                        'ml-auto text-xs font-bold',
                      )}
                    >
                      <span className={cm.cn('text-on-surface-variant')}>
                        {t('myQuizzes.deleteConfirm', {}, { defaultValue: 'Delete forever?' })}
                      </span>
                      <button
                        type="button"
                        data-testid={`quiz-delete-confirm-${q.id}`}
                        onClick={() => void handleDelete(q.id)}
                        className={cm.cn(
                          'px-3 min-h-[40px] rounded-lg bg-error text-white text-xs font-bold inline-flex items-center',
                        )}
                      >
                        {t('common.confirm', {}, { defaultValue: 'Confirm' })}
                      </button>
                      <button
                        type="button"
                        data-testid={`quiz-delete-cancel-${q.id}`}
                        onClick={() => setPendingDeleteId(null)}
                        className={cm.cn(
                          'px-2 min-h-[40px] inline-flex items-center text-xs font-bold text-on-surface-variant',
                        )}
                      >
                        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-testid={`quiz-delete-${q.id}`}
                      onClick={() => handleDelete(q.id)}
                      className={cm.cn(
                        'ml-auto inline-flex items-center min-h-[40px] px-3 rounded-lg text-xs font-bold text-error hover:bg-error/10',
                      )}
                    >
                      {t('common.delete', {}, { defaultValue: 'Delete' })}
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyQuizzes
