import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { QuizCard, type QuizCardProps } from '../components/QuizCard.js'
import { QuizStatsRow } from '../components/QuizStatsRow.js'

interface UserShape {
  id: string
  name?: string
  username?: string
  email?: string
}

interface QuizRow {
  id: string
  title: string
  category?: string | null
  status: string
  time_per_question_s?: number
  play_count?: number
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

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as { data: T }).data
  }
  return res as T
}

function quizRowToCard(q: QuizRow): QuizCardProps {
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
    ctaTo: `/quiz/${q.id}`,
  }
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { username } = useParams<{ username: string }>()
  const { user } = useAuth<UserShape>()
  const http = useHttpClient()
  const isMe = !username || username === user?.username || username === user?.email?.split('@')[0]
  const [quizzes, setQuizzes] = useState<QuizRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    if (!isMe || !user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    try {
      const res = await http.get('/api/quizzes?mine=true')
      const list = unwrap<QuizRow[]>(res) ?? []
      const published = (Array.isArray(list) ? list : []).filter((q) => q.status === 'published')
      setQuizzes(published)
    } catch (_error) {
      // Failed fetch must not render as "Nothing published yet."
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [http, isMe, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const displayName =
    user?.name ??
    username ??
    t('profile.guest', { appName: APP_NAME }, { defaultValue: '{{appName}} player' })
  const handle = `@${user?.username ?? username ?? `${APP_NAME.toLowerCase()}.player`}`

  const totalPlays = quizzes.reduce((sum, q) => sum + (q.play_count ?? 0), 0)

  return (
    <div className={cm.cn(cm.stack(8), cm.sp('py', 8))} data-testid="profile">
      <section
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary to-tertiary text-white shadow-2xl shadow-primary/30',
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
        <div
          className={cm.cn(
            'relative z-10',
            cm.sp('p', 10),
            cm.flex({ direction: 'col', gap: 6 }),
            'lg:flex-row lg:items-end lg:justify-between',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 6 }))}>
            <div
              className={cm.cn(
                'w-28 h-28 rounded-3xl ring-4 ring-white/30 bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-4xl font-extrabold shadow-lg',
              )}
              aria-hidden="true"
            >
              {displayName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <span
                className={cm.cn(
                  'inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/25 border border-amber-300/30 text-[10px] font-black uppercase tracking-widest text-amber-100',
                  cm.sp('mb', 2),
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  workspace_premium
                </span>
                {t('profile.tier', { appName: APP_NAME }, { defaultValue: '{{appName}} player' })}
              </span>
              <h1
                className={cm.cn('text-4xl font-extrabold tracking-tight')}
                data-testid="profile-display-name"
              >
                {displayName}
              </h1>
              <p className={cm.cn('text-white/80')}>{handle}</p>
            </div>
          </div>
          {isMe ? (
            <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
              <Link
                to="/settings"
                data-testid="profile-edit"
                className={cm.cn(
                  'px-5 py-2.5 rounded-2xl bg-surface/15 backdrop-blur-md border border-surface/20 text-xs font-extrabold uppercase tracking-widest hover:bg-surface/25 transition-colors',
                )}
              >
                {t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
              </Link>
              <Link
                to="/my-quizzes"
                data-testid="profile-create"
                className={cm.cn(
                  'px-5 py-2.5 rounded-2xl bg-amber-400 text-amber-950 text-xs font-extrabold uppercase tracking-widest shadow-lg shadow-amber-400/30 hover:bg-amber-300',
                )}
              >
                {t('profile.createQuiz', {}, { defaultValue: 'Build a quiz' })}
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <QuizStatsRow
        stats={[
          {
            key: 'published',
            label: 'Published quizzes',
            value: String(quizzes.length),
            glyph: 'edit_note',
            accent: 'primary',
          },
          {
            key: 'plays',
            label: 'Total plays',
            value: totalPlays.toLocaleString(),
            glyph: 'sports_esports',
            accent: 'amber',
          },
          {
            key: 'avg',
            label: 'Per-quiz plays',
            value: quizzes.length ? String(Math.round(totalPlays / quizzes.length)) : '0',
            glyph: 'trending_up',
            accent: 'emerald',
          },
        ]}
      />

      <section>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('profile.hosted.title', {}, { defaultValue: 'Published quizzes' })}
          </h2>
          <span className={cm.cn('text-xs text-on-surface-variant font-semibold')}>
            {t(
              'profile.hosted.count',
              { count: quizzes.length },
              { defaultValue: '{{count}} published' },
            )}
          </span>
        </div>
        {loading ? (
          <p className={cm.cn('text-sm text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : error ? (
          <LoadErrorBanner
            onRetry={refresh}
            message={t(
              'common.loadError',
              {},
              { defaultValue: 'Something went wrong loading this content.' },
            )}
          />
        ) : quizzes.length === 0 ? (
          <div
            className={cm.cn(
              cm.sp('p', 12),
              cm.textCenter,
              'rounded-3xl border border-dashed border-outline-variant/40 text-on-surface-variant',
            )}
          >
            <p className={cm.cn('font-bold text-base mb-1')}>
              {t('profile.noPublished', {}, { defaultValue: 'Nothing published yet.' })}
            </p>
            {isMe ? (
              <Link
                to="/my-quizzes"
                className={cm.cn('text-sm font-bold text-primary hover:underline')}
              >
                {t('profile.startBuilding', {}, { defaultValue: 'Start building →' })}
              </Link>
            ) : null}
          </div>
        ) : (
          <div
            className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-3')}
            data-testid="profile-quiz-grid"
          >
            {quizzes.map((q) => (
              <QuizCard key={q.id} {...quizRowToCard(q)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Profile
