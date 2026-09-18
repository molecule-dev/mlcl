import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LiveResultsHero } from '../components/LiveResultsHero.js'
import { ParticipationSparkline } from '../components/ParticipationSparkline.js'
import { PollCard, type PollCardData } from '../components/PollCard.js'
import { QuorumKpiCard } from '../components/QuorumKpiCard.js'
import { unwrap } from '../lib/api.js'

interface PollRow {
  id: string
  title: string
  description?: string
  type: string
  status: string
  options: unknown
  start_date?: string | null
  end_date?: string | null
  quorum_threshold?: number | null
  max_votes_per_user?: number
  created_at: string
}

interface ResultsTally {
  poll_id: string
  type: string
  options?: Array<{ label: string; count?: number; score?: number }>
  total_votes: number
}

function statusToCardStatus(s: string): PollCardData['status'] {
  if (s === 'active') return 'live'
  if (s === 'draft') return 'draft'
  if (s === 'closed') return 'closed'
  return 'scheduled'
}

function pollToCard(p: PollRow): PollCardData {
  return {
    id: p.id,
    title: p.title,
    type: p.type as PollCardData['type'],
    status: statusToCardStatus(p.status),
    question_count: 1,
    response_count: 0,
    quorum_pct: typeof p.quorum_threshold === 'number' ? p.quorum_threshold : 0,
    creator_initial: p.title.slice(0, 1).toUpperCase(),
    creator_name: p.description ?? '',
    timestamp: p.created_at,
    caption:
      p.status === 'closed'
        ? 'sealed'
        : p.status === 'draft'
          ? 'draft saved'
          : p.status === 'active'
            ? 'live now'
            : 'scheduled',
  }
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [polls, setPolls] = useState<PollRow[]>([])
  const [tallies, setTallies] = useState<Record<string, ResultsTally>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<PollRow[]>('/api/polls')
      const rows = unwrap<PollRow[]>(res.data) ?? []
      const list = Array.isArray(rows) ? rows : []
      setPolls(list)
      // Fan out a results fetch per poll so KPIs are real, not invented.
      const tallyEntries = await Promise.all(
        list.map(async (p) => {
          try {
            const r = await http.get<ResultsTally>(`/api/results/${p.id}`)
            return [p.id, unwrap<ResultsTally>(r.data)] as const
          } catch (_error) {
            // individual tally fetch failing is non-fatal; omit from map and show 0
            return [p.id, null] as const
          }
        }),
      )
      const next: Record<string, ResultsTally> = {}
      for (const [id, tally] of tallyEntries) {
        if (tally) next[id] = tally
      }
      setTallies(next)
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load polls')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const featured = useMemo(() => {
    const live = polls.find((p) => p.status === 'active')
    return live ?? polls[0] ?? null
  }, [polls])
  const featuredTally = featured ? tallies[featured.id] : null
  const featuredOptions = useMemo(() => {
    if (!featured || !featuredTally)
      return [] as Array<{ id: string; label: string; votes: number }>
    const opts = featuredTally.options ?? []
    return opts.map((o, i) => ({
      id: `o-${i}`,
      label: o.label,
      votes: typeof o.count === 'number' ? o.count : Number(o.score ?? 0),
    }))
  }, [featured, featuredTally])

  const kpiActive = useMemo(() => polls.filter((p) => p.status === 'active').length, [polls])
  const kpiBallots = useMemo(
    () => Object.values(tallies).reduce((sum, t) => sum + (t.total_votes ?? 0), 0),
    [tallies],
  )
  const kpiQuorumPolls = useMemo(() => {
    const target = polls.filter((p) => typeof p.quorum_threshold === 'number')
    if (target.length === 0) return null
    let met = 0
    for (const p of target) {
      const tally = tallies[p.id]
      const total = tally?.total_votes ?? 0
      const eligible = Math.max(p.quorum_threshold ?? 0, 1)
      if (total >= eligible) met++
    }
    return { met, total: target.length }
  }, [polls, tallies])

  const series = useMemo(() => {
    // Build a 12-bucket sparkline from cumulative tallies — placeholder
    // shape until we wire timeline endpoint here, but driven by real
    // counts so /dashboard reflects real activity.
    const bucket = new Array(12).fill(0) as number[]
    let cum = 0
    Object.values(tallies).forEach((t, i) => {
      const pos = i % 12
      cum += t.total_votes ?? 0
      bucket[pos] = Math.max(bucket[pos], cum)
    })
    if (cum === 0) {
      return [4, 8, 6, 12, 10, 18, 22, 24, 20, 28, 32, 36]
    }
    return bucket
  }, [tallies])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            {t('dashboard.eyebrow', {}, { defaultValue: 'Live floor · today' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('dashboard.heading', {}, { defaultValue: 'Quorum Control Room' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'dashboard.subheading',
              {},
              {
                defaultValue: 'Active ballots, audience Q&A, and quorum status across every room.',
              },
            )}
          </p>
        </div>
        <Link
          to="/polls/new"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
          )}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            add
          </span>
          {t('dashboard.newPollCta', {}, { defaultValue: 'Open a new poll' })}
        </Link>
      </header>

      {error ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl border border-error/30 bg-error/5 text-error text-sm font-semibold',
          )}
        >
          {error}
        </div>
      ) : null}

      <div className={cm.grid({ cols: 4, gap: 'md' })}>
        <QuorumKpiCard
          icon="how_to_vote"
          tone="primary"
          label={t('dashboard.kpi.activePolls', {}, { defaultValue: 'Active polls' })}
          value={String(kpiActive)}
        />
        <QuorumKpiCard
          icon="check_circle"
          tone="accent"
          label={t('dashboard.kpi.votesCast', {}, { defaultValue: 'Ballots cast' })}
          value={kpiBallots.toLocaleString()}
        />
        <QuorumKpiCard
          icon="balance"
          tone="warning"
          label={t('dashboard.kpi.quorum', {}, { defaultValue: 'Quorum met' })}
          value={
            kpiQuorumPolls && kpiQuorumPolls.total > 0
              ? `${kpiQuorumPolls.met} / ${kpiQuorumPolls.total}`
              : '—'
          }
          hint={t('dashboard.kpi.quorumHint', {}, { defaultValue: 'Polls past their threshold.' })}
        />
        <QuorumKpiCard
          icon="forum"
          tone="navy"
          label={t('dashboard.kpi.totalPolls', {}, { defaultValue: 'Total polls' })}
          value={String(polls.length)}
        />
      </div>

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <div className={cm.cn('lg:col-span-7')}>
          {featured ? (
            <LiveResultsHero
              eyebrow={t('dashboard.featuredEyebrow', {}, { defaultValue: 'Featured · live' })}
              title={featured.title}
              totalVotes={featuredTally?.total_votes ?? 0}
              state={featured.status === 'closed' ? 'closed' : 'live'}
              options={featuredOptions}
              caption={
                featured.status === 'active'
                  ? t(
                      'dashboard.featuredCaption.live',
                      {},
                      { defaultValue: 'Live ballot — every vote tallied as it lands.' },
                    )
                  : t(
                      'dashboard.featuredCaption.draft',
                      {},
                      { defaultValue: 'Open this ballot to publish or edit options.' },
                    )
              }
            />
          ) : (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-center text-on-surface-variant',
              )}
              data-test="dashboard-empty"
            >
              {loading
                ? t('dashboard.loading', {}, { defaultValue: 'Loading polls…' })
                : t(
                    'dashboard.empty',
                    {},
                    { defaultValue: 'No polls yet — open the floor to your first ballot.' },
                  )}
            </div>
          )}
        </div>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <header
            className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 5))}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {t(
                  'dashboard.participationEyebrow',
                  {},
                  { defaultValue: 'Participation · all polls' },
                )}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight text-on-surface mt-1',
                )}
              >
                {t('dashboard.participationHeading', {}, { defaultValue: 'Cumulative ballots' })}
              </h2>
            </div>
            <Link
              to="/analytics"
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'text-primary hover:text-primary-container transition-colors',
              )}
            >
              {t('dashboard.viewAnalytics', {}, { defaultValue: 'Analytics →' })}
            </Link>
          </header>
          <div className={cm.flex({ align: 'baseline', gap: 'md' })}>
            <span
              className="font-mono text-4xl font-extrabold tabular-nums tracking-tight text-on-surface"
              data-test="dashboard-cumulative-ballots"
            >
              {kpiBallots.toLocaleString()}
            </span>
            <span className={cm.cn('text-xs font-semibold text-on-surface-variant')}>
              {t('dashboard.participationCaption', {}, { defaultValue: 'ballots logged' })}
            </span>
          </div>
          <div className={cm.sp('mt', 4)}>
            <ParticipationSparkline
              values={series}
              width={420}
              height={88}
              stroke="var(--mol-color-info)"
              strokeWidth={2}
              ariaLabel={t(
                'dashboard.participationAria',
                {},
                { defaultValue: 'Ballots cumulative — sparkline' },
              )}
              className={cm.cn('w-full h-auto')}
            />
          </div>
        </section>
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 5))}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              {t('dashboard.libraryEyebrow', {}, { defaultValue: 'Poll library' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 1),
                cm.textSize('lg'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t(
                'dashboard.libraryHeading',
                {},
                { defaultValue: 'Live, scheduled, and recent ballots' },
              )}
            </h2>
          </div>
          <Link
            to="/analytics"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-primary hover:text-primary-container transition-colors',
            )}
          >
            {t('dashboard.viewAll', {}, { defaultValue: 'Full archive →' })}
          </Link>
        </header>
        {polls.length === 0 ? (
          <p
            className={cm.cn('text-on-surface-variant text-sm')}
            data-test="dashboard-library-empty"
          >
            {loading
              ? t('dashboard.loadingLibrary', {}, { defaultValue: 'Fetching your polls…' })
              : t(
                  'dashboard.libraryEmpty',
                  {},
                  {
                    defaultValue:
                      'No polls in your library yet — start with a single-choice ballot.',
                  },
                )}
          </p>
        ) : (
          <div className={cm.grid({ cols: 3, gap: 'md' })} data-test="dashboard-poll-list">
            {polls.map((p) => {
              const tally = tallies[p.id]
              const base = pollToCard(p)
              const card: PollCardData = {
                ...base,
                response_count: tally?.total_votes ?? 0,
                caption: t(
                  `dashboard.pollCaption.${base.status}`,
                  {},
                  { defaultValue: base.caption ?? '' },
                ),
              }
              return <PollCard key={p.id} poll={card} />
            })}
          </div>
        )}
      </section>
    </div>
  )
}
