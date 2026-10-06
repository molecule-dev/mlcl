import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BookCover } from '../components/BookCover.js'
import { ChallengeHeroCard, type ChallengeSnapshot } from '../components/ChallengeHeroCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Book {
  id: string
  title: string
  author: string
  cover_style: string
  page_count: number
  my: {
    shelf: string
    current_page: number
    percent: number
    finished_at: string | null
  } | null
}

const SEASON_CARDS = [
  {
    key: 'winter',
    months: 'Jan — Mar',
    title: 'Cold Hearth & Victorian Prose',
    body: 'Dense syntax and moral tapestries — the long classics kept for the deep cold.',
    meta: 'Lamplight prose • Long evenings',
  },
  {
    key: 'spring',
    months: 'Apr — Jun',
    title: 'Natural Philosophy & Botany',
    body: 'Soil ecology, lichen, and indigenous herbal wisdom as the ground thaws.',
    meta: 'Field guides • Slow nonfiction',
  },
  {
    key: 'summer',
    months: 'Jul — Aug',
    title: 'European Translations & Novellas',
    body: 'Laconic masters and slim meditative reflections on trains and coastal quiet.',
    meta: 'Slim volumes • Travel light',
  },
  {
    key: 'autumn',
    months: 'Sep — Nov',
    title: 'Memory, Solitude & Rain',
    body: 'Interior weather, remembered places, and books that ask for patience.',
    meta: 'Current season • Desk reading',
  },
] as const

function seasonOfMonth(date: Date): 'winter' | 'spring' | 'summer' | 'autumn' {
  const m = date.getMonth() + 1
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
}

const GOLDEN_QUOTES = [
  {
    key: 'eliot',
    source: 'George Eliot, Middlemarch (p. 284)',
    quote:
      'It is a narrow mind which cannot look at a subject from various points of view with equal interest and curiosity.',
    note: 'Read this by candlelight during the January freeze. A talisman for resisting hasty judgments.',
  },
  {
    key: 'ishiguro',
    source: 'Kazuo Ishiguro, Klara and the Sun (p. 89)',
    quote:
      'In the morning light, her face was like a drawing in graphite on gray paper, subtle and exact, withholding nothing yet asking to be contemplated rather than solved.',
    note: 'The artificial perspective making human grief more gentle and luminous.',
  },
] as const

export function Challenge() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [challenge, setChallenge] = useState<ChallengeSnapshot | null>(null)
  const [finished, setFinished] = useState<Book[]>([])
  const [inProgress, setInProgress] = useState<Book[]>([])
  const [volumeFilter, setVolumeFilter] = useState<'all' | 'finished' | 'reading'>('all')
  const [goal, setGoal] = useState('24')
  const [saving, setSaving] = useState(false)
  const [goalSaved, setGoalSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const year = new Date().getFullYear()
  const currentSeason = seasonOfMonth(new Date())
  const SEASON_ORDER = ['winter', 'spring', 'summer', 'autumn'] as const
  const seasonIndex = SEASON_ORDER.indexOf(currentSeason)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([http.get(`/challenge?year=${year}`), http.get('/books?limit=200')])
      .then(([challengeRes, booksRes]) => {
        if (cancelled) return
        const snap = unwrapSingle<ChallengeSnapshot>(challengeRes)
        setChallenge(snap)
        if (snap && snap.goal_books > 0) setGoal(String(snap.goal_books))
        const books = unwrapList<Book>(booksRes)
        const byFinish = books
          .filter((b) => b.my?.finished_at)
          .sort(
            (a, b) =>
              new Date(b.my?.finished_at ?? 0).getTime() -
              new Date(a.my?.finished_at ?? 0).getTime(),
          )
        setFinished(byFinish)
        setInProgress(books.filter((b) => b.my?.shelf === 'reading'))
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
    setGoalSaved(false)
    try {
      const res = await http.put('/challenge', { year, goal_books: n })
      setChallenge(unwrapSingle<ChallengeSnapshot>(res))
      track({
        name: (challenge?.goal_books ?? 0) > 0 ? 'challenge.goal_updated' : 'challenge.joined',
        properties: { year, goal_books: n },
      })
      setGoalSaved(true)
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
          {t(
            'challenge.heading',
            { year },
            { defaultValue: '{{year}} Reading Challenge · Cadence & Companionship' },
          )}
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
          {goalSaved ? (
            <span
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
              data-mol-id="challenge-goal-saved"
              role="status"
            >
              {t('challenge.goalSaved', {}, { defaultValue: 'Goal saved' })}
            </span>
          ) : null}
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

      {/* Cadence by season — the year's thematic arc */}
      <section>
        <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' })}>
          <div>
            <h2
              className={cm.cn('text-xl md:text-2xl font-medium tracking-tight text-primary')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t('challenge.seasonsHeading', {}, { defaultValue: 'Cadence by Season' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
              {t(
                'challenge.seasonsSub',
                {},
                {
                  defaultValue:
                    "The chronological arc of this year's reading themes and interior weather.",
                },
              )}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-secondary bg-surface-container px-3 py-1 rounded-full border border-outline-variant">
            {t(
              'challenge.seasonsCycle',
              { n: seasonIndex + 1, total: 4 },
              { defaultValue: 'Cycle {{n}} of {{total}} active' },
            )}
          </span>
        </div>
        <div className={cm.cn(cm.grid({ cols: 4, gap: 'md' }), cm.sp('mt', 4))}>
          {SEASON_CARDS.map((card) => {
            const isCurrent = card.key === currentSeason
            return (
              <div
                key={card.key}
                className={cm.cn(
                  cm.sp('p', 4),
                  'rounded-xl transition-all relative',
                  isCurrent
                    ? 'bg-surface-container-lowest border-2 border-primary-container shadow-sm'
                    : 'bg-surface-container-lowest border border-outline-variant',
                )}
              >
                {isCurrent ? (
                  <span className="absolute top-0 right-0 bg-primary-container text-on-primary-container text-[10px] font-semibold px-2.5 py-0.5 rounded-bl uppercase tracking-wider">
                    {t('challenge.seasonCurrent', {}, { defaultValue: 'Current season' })}
                  </span>
                ) : null}
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    isCurrent ? 'text-secondary font-medium' : 'text-outline',
                  )}
                >
                  {t(`challenge.seasonMonths.${card.key}`, {}, { defaultValue: card.months })}
                </p>
                <h3
                  className={cm.cn(
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    'text-primary',
                    cm.sp('mt', 1),
                    cm.sp('mb', 1),
                  )}
                >
                  {t(`challenge.seasonTitle.${card.key}`, {}, { defaultValue: card.title })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}>
                  {t(`challenge.seasonBody.${card.key}`, {}, { defaultValue: card.body })}
                </p>
                <div className="pt-3 border-t border-outline-variant/60 flex items-center justify-between text-[11px] font-semibold text-secondary">
                  <span>
                    {t(`challenge.seasonMeta.${card.key}`, {}, { defaultValue: card.meta })}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Volumes in the cadence — every companion title this year */}
      <section>
        <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' })}>
          <h2
            className={cm.cn('text-xl md:text-2xl font-medium tracking-tight text-primary')}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t(
              'challenge.volumesHeading',
              { year },
              { defaultValue: 'Volumes in the {{year}} Cadence' },
            )}
          </h2>
          <div
            className={cm.flex({ align: 'center', gap: 1.5, wrap: 'wrap' })}
            role="group"
            aria-label={t('challenge.volumesFilterLabel', {}, { defaultValue: 'Filter volumes' })}
          >
            {(
              [
                ['all', 'challenge.volumesFilter.all', 'All volumes'],
                ['finished', 'challenge.volumesFilter.finished', 'Finished'],
                ['reading', 'challenge.volumesFilter.reading', 'Currently open'],
              ] as const
            ).map(([value, key, def]) => (
              <button
                key={value}
                type="button"
                onClick={() => setVolumeFilter(value)}
                aria-pressed={volumeFilter === value}
                data-mol-id={`challenge-volume-filter-${value}`}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'rounded-full transition-colors',
                  volumeFilter === value
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container text-on-surface-variant hover:text-primary',
                )}
              >
                {t(
                  key,
                  {
                    count:
                      value === 'finished'
                        ? finished.length
                        : value === 'reading'
                          ? inProgress.length
                          : finished.length + inProgress.length,
                  },
                  { defaultValue: def },
                )}
              </button>
            ))}
          </div>
        </div>

        {volumeFilter !== 'reading' ? (
          <div className={cm.sp('mt', 4)}>
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
                cm.sp('mb', 3),
              )}
            >
              {t('challenge.finishedHeading', {}, { defaultValue: 'Books finished this year' })}
            </h3>
            {finished.length === 0 ? (
              <p
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 8),
                  cm.textCenter,
                  'text-on-surface-variant',
                )}
              >
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
                      className={cm.cn(
                        cm.flex({ align: 'start', gap: 'sm' }),
                        cm.card(),
                        cm.sp('p', 4),
                        'block hover:bg-surface-container',
                      )}
                    >
                      <BookCover
                        title={b.title}
                        author={b.author}
                        coverStyle={b.cover_style}
                        size="sm"
                      />
                      <span className={cm.cn('min-w-0 flex-1')}>
                        <span
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'between', gap: 1.5 }),
                          )}
                        >
                          <span
                            className={cm.cn(
                              cm.sp('px', 2),
                              cm.sp('py', 1),
                              cm.textSize('xs'),
                              cm.fontWeight('bold'),
                              'rounded-full bg-success-container text-on-success-container uppercase tracking-wider',
                            )}
                          >
                            {t('challenge.volumeFinished', {}, { defaultValue: 'Finished' })}
                          </span>
                          <span className={cm.cn(cm.textSize('xs'), 'text-outline')}>
                            {b.my?.finished_at
                              ? new Date(b.my.finished_at).toLocaleDateString()
                              : ''}
                          </span>
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('bold'),
                            'truncate block',
                            cm.sp('mt', 2),
                          )}
                        >
                          {b.title}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant truncate block',
                          )}
                        >
                          {b.author}
                        </span>
                        <span
                          className={cm.cn(
                            'h-1.5 rounded-full bg-surface-container overflow-hidden block',
                            cm.sp('mt', 2),
                          )}
                        >
                          <span
                            className={cm.cn('h-full rounded-full block bg-primary-container')}
                            style={{ width: '100%' }}
                          />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {volumeFilter !== 'finished' ? (
          <div className={cm.sp('mt', 6)}>
            <h3
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
                cm.sp('mb', 3),
              )}
            >
              {t('challenge.readingGroupHeading', {}, { defaultValue: 'Active on the desk' })}
            </h3>
            {inProgress.length === 0 ? (
              <p
                className={cm.cn(
                  cm.card(),
                  cm.sp('p', 6),
                  cm.textCenter,
                  'text-on-surface-variant',
                )}
              >
                {t(
                  'challenge.readingEmpty',
                  {},
                  { defaultValue: 'Nothing on the desk right now — shelve a book as reading.' },
                )}
              </p>
            ) : (
              <ul className={cm.grid({ cols: 3, gap: 'md' })}>
                {inProgress.slice(0, 6).map((b) => {
                  const pct = Math.round(b.my?.percent ?? 0)
                  return (
                    <li key={b.id}>
                      <Link
                        to={`/books/${b.id}`}
                        className={cm.cn(
                          cm.flex({ align: 'start', gap: 'sm' }),
                          cm.card(),
                          cm.sp('p', 4),
                          'block hover:bg-surface-container',
                        )}
                      >
                        <BookCover
                          title={b.title}
                          author={b.author}
                          coverStyle={b.cover_style}
                          size="sm"
                        />
                        <span className={cm.cn('min-w-0 flex-1')}>
                          <span
                            className={cm.cn(
                              cm.flex({ align: 'center', justify: 'between', gap: 1.5 }),
                            )}
                          >
                            <span
                              className={cm.cn(
                                cm.sp('px', 2),
                                cm.sp('py', 1),
                                cm.textSize('xs'),
                                cm.fontWeight('bold'),
                                'rounded-full bg-secondary-container text-on-secondary-container uppercase tracking-wider',
                              )}
                            >
                              {t('challenge.volumeReading', {}, { defaultValue: 'Active on desk' })}
                            </span>
                            <span className={cm.cn(cm.textSize('xs'), 'text-outline')}>
                              {t(
                                'challenge.volumePageOf',
                                { page: b.my?.current_page ?? 0, total: b.page_count },
                                { defaultValue: 'p. {{page}} of {{total}}' },
                              )}
                            </span>
                          </span>
                          <span
                            className={cm.cn(
                              cm.textSize('sm'),
                              cm.fontWeight('bold'),
                              'truncate block',
                              cm.sp('mt', 2),
                            )}
                          >
                            {b.title}
                          </span>
                          <span
                            className={cm.cn(
                              cm.textSize('xs'),
                              'text-on-surface-variant truncate block',
                            )}
                          >
                            {b.author}
                          </span>
                          <span
                            className={cm.cn(
                              'h-1.5 rounded-full bg-surface-container overflow-hidden block',
                              cm.sp('mt', 2),
                            )}
                          >
                            <span
                              className={cm.cn('h-full rounded-full block bg-primary')}
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ) : null}
      </section>

      {/* Golden sentences & transcriptions */}
      <section className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' })}>
          <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-primary')}>
            {t(
              'challenge.goldenHeading',
              {},
              { defaultValue: 'Golden Sentences & Transcriptions' },
            )}
          </h3>
          <span className={cm.cn(cm.textSize('xs'), 'text-secondary')}>
            {t('challenge.goldenScope', { year }, { defaultValue: 'Transcribed in {{year}}' })}
          </span>
        </div>
        <ul className={cm.cn('space-y-4', cm.sp('mt', 4))}>
          {GOLDEN_QUOTES.map((q) => (
            <li
              key={q.key}
              className={cm.cn(
                cm.sp('p', 4),
                'bg-surface-container-low/40 rounded-lg border border-outline-variant/60',
              )}
            >
              <blockquote
                className={cm.cn('text-lg text-primary italic leading-relaxed')}
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                “{t(`challenge.goldenQuote.${q.key}`, {}, { defaultValue: q.quote })}”
              </blockquote>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
                  cm.textSize('xs'),
                  'text-secondary',
                  cm.sp('mt', 2),
                )}
              >
                <span>{t(`challenge.goldenSource.${q.key}`, {}, { defaultValue: q.source })}</span>
              </div>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface-variant italic border-l-2 pl-3',
                  cm.sp('mt', 2),
                )}
                style={{ borderColor: 'var(--color-primary-container)' }}
              >
                {t(`challenge.goldenNote.${q.key}`, {}, { defaultValue: q.note })}
              </p>
            </li>
          ))}
        </ul>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            'text-on-surface-variant',
            cm.sp('mt', 3),
            'leading-relaxed',
          )}
        >
          {t(
            'challenge.goldenFootnote',
            {},
            {
              defaultValue:
                'Transcribe your own from any book desk — every quote keeps its page number.',
            },
          )}
        </p>
      </section>

      {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}
    </div>
  )
}
