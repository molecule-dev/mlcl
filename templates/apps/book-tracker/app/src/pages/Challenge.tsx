import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ChallengeHeroCard, type ChallengeSnapshot } from '../components/ChallengeHeroCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Book {
  id: string
  title: string
  author: string
  cover_style: string
  my: { shelf: string; finished_at: string | null } | null
}

export function Challenge() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [challenge, setChallenge] = useState<ChallengeSnapshot | null>(null)
  const [finished, setFinished] = useState<Book[]>([])
  const [goal, setGoal] = useState('24')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const year = new Date().getFullYear()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get(`/api/challenge?year=${year}`),
      http.get('/api/books?shelf=read&limit=200'),
    ])
      .then(([challengeRes, booksRes]) => {
        if (cancelled) return
        const snap = unwrapSingle<ChallengeSnapshot>(challengeRes)
        setChallenge(snap)
        if (snap && snap.goal_books > 0) setGoal(String(snap.goal_books))
        const books = unwrapList<Book>(booksRes)
        setFinished(
          books
            .filter((b) => b.my?.finished_at)
            .sort(
              (a, b) =>
                new Date(b.my?.finished_at ?? 0).getTime() -
                new Date(a.my?.finished_at ?? 0).getTime(),
            ),
        )
      })
      .catch(() => {
        if (!cancelled)
          setError(t('challenge.loadError', {}, { defaultValue: 'Failed to load challenge.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, year])

  const saveGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = Number(goal)
    if (Number.isNaN(n) || n < 1 || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await http.put('/api/challenge', { year, goal_books: n })
      setChallenge(unwrapSingle<ChallengeSnapshot>(res))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </p>
    )

  const hasGoal = (challenge?.goal_books ?? 0) > 0
  const remaining = Math.max(0, (challenge?.goal_books ?? 0) - (challenge?.books_read ?? 0))

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-8')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('challenge.eyebrow', {}, { defaultValue: 'Read more, on purpose' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}>
          {t('challenge.heading', { year }, { defaultValue: '{{year}} reading challenge' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'challenge.subheading',
            {},
            { defaultValue: 'Set a goal. Watch the ring close, book by book.' },
          )}
        </p>
      </header>

      <ChallengeHeroCard
        challenge={challenge}
        motivationalMessage={
          hasGoal
            ? t(
                'challenge.heroMessage',
                { remaining },
                { defaultValue: '{{remaining}} books to go. One shelf at a time.' },
              )
            : t(
                'challenge.noGoalMessage',
                {},
                { defaultValue: 'Set a goal below and the ring starts closing.' },
              )
        }
      />

      <section className={cm.cn(cm.card(), cm.sp('p', 6))} data-mol-id="challenge-goal-section">
        <h2 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mb', 3))}>
          {t('challenge.goalHeading', {}, { defaultValue: 'Set your goal' })}
        </h2>
        <form
          className={cm.cn(cm.flex({ align: 'end', gap: 'md' }), 'flex-wrap')}
          onSubmit={saveGoal}
        >
          <label>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant uppercase tracking-wider block mb-1',
              )}
            >
              {t('challenge.goalLabel', { year }, { defaultValue: 'Books in {{year}}' })}
            </span>
            <input
              type="number"
              min={1}
              max={365}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              data-mol-id="challenge-goal-input"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-28 border-2 border-outline-variant rounded-lg bg-surface text-on-surface focus:border-primary focus:outline-none',
              )}
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            data-mol-id="challenge-goal-save"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-full disabled:opacity-50',
            )}
          >
            {t('challenge.saveGoal', {}, { defaultValue: 'Save goal' })}
          </button>
        </form>

        {challenge ? (
          <dl className={cm.cn(cm.grid({ cols: 3, gap: 'md' }), cm.sp('mt', 6))}>
            <div className={cm.cn(cm.card(), cm.sp('p', 4))}>
              <dt
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-wider',
                )}
              >
                {t('challenge.stat.read', {}, { defaultValue: 'Finished' })}
              </dt>
              <dd className={cm.cn('text-3xl font-extrabold')}>{challenge.books_read}</dd>
            </div>
            <div className={cm.cn(cm.card(), cm.sp('p', 4))}>
              <dt
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-wider',
                )}
              >
                {t('challenge.stat.pace', {}, { defaultValue: 'Pace to goal' })}
              </dt>
              <dd className={cm.cn('text-3xl font-extrabold')}>
                {t(
                  'challenge.stat.paceValue',
                  { rate: challenge.pace_needed_per_week },
                  { defaultValue: '{{rate}}/wk' },
                )}
              </dd>
            </div>
            <div className={cm.cn(cm.card(), cm.sp('p', 4))}>
              <dt
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-wider',
                )}
              >
                {t('challenge.stat.status', {}, { defaultValue: 'Status' })}
              </dt>
              <dd
                className={cm.cn('text-2xl font-extrabold')}
                style={{
                  color: challenge.on_pace ? 'var(--color-success)' : 'var(--color-error)',
                }}
              >
                {challenge.on_pace
                  ? t('challenge.onPace', {}, { defaultValue: 'On pace' })
                  : t(
                      'challenge.behind',
                      { count: challenge.books_behind },
                      { defaultValue: '{{count}} behind' },
                    )}
              </dd>
            </div>
          </dl>
        ) : null}
        {challenge && !challenge.on_pace && challenge.goal_books > 0 ? (
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-on-surface-variant')}>
            {t(
              'challenge.catchUpHint',
              { rate: challenge.pace_needed_per_week },
              { defaultValue: 'Finish {{rate}} books a week from here to land the goal.' },
            )}
          </p>
        ) : null}
      </section>

      <section>
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
            cm.sp('mb', 3),
          )}
        >
          {t('challenge.finishedHeading', {}, { defaultValue: 'Books finished this year' })}
        </h2>
        {finished.length === 0 ? (
          <p className={cm.cn(cm.card(), cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t(
              'challenge.finishedEmpty',
              {},
              { defaultValue: 'No finished books yet — the first one is the sweetest.' },
            )}
          </p>
        ) : (
          <ul className={cm.grid({ cols: 3, gap: 'md' })}>
            {finished.slice(0, 9).map((b) => (
              <li key={b.id}>
                <Link
                  to={`/books/${b.id}`}
                  className={cm.cn(cm.card(), cm.sp('p', 4), 'block hover:bg-surface-container')}
                >
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'truncate')}>
                    {b.title}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                    {b.author}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}
                  >
                    {b.my?.finished_at ? new Date(b.my.finished_at).toLocaleDateString() : ''}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}
    </div>
  )
}
