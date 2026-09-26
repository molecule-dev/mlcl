import { useCallback, useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ParticipationSparkline } from '../components/ParticipationSparkline.js'
import { PollStatusPill } from '../components/PollStatusPill.js'
import { QuorumKpiCard } from '../components/QuorumKpiCard.js'
import { unwrap } from '../lib/api.js'

interface PollRow {
  id: string
  title: string
  type: string
  status: 'draft' | 'active' | 'closed'
  options: unknown
  start_date?: string | null
  end_date?: string | null
  quorum_threshold?: number | null
  created_at?: string
}

interface ResultsTally {
  poll_id: string
  total_votes: number
}

function statusToPill(s: string): 'live' | 'closed' | 'draft' | 'scheduled' {
  if (s === 'active') return 'live'
  if (s === 'closed') return 'closed'
  if (s === 'draft') return 'draft'
  return 'scheduled'
}

export function Analytics() {
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
      setError((err as Error).message ?? 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const totalVotes = useMemo(
    () => Object.values(tallies).reduce((acc, t) => acc + (t.total_votes ?? 0), 0),
    [tallies],
  )
  const livePolls = useMemo(() => polls.filter((p) => p.status === 'active').length, [polls])
  const closedPolls = useMemo(() => polls.filter((p) => p.status === 'closed').length, [polls])
  const quorumPolls = useMemo(() => {
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

  const recent = useMemo(() => polls.slice(0, 10), [polls])

  const series = useMemo(() => {
    if (polls.length === 0) return new Array(12).fill(0) as number[]
    const buckets: number[] = []
    for (let i = 0; i < 12; i++) buckets.push(0)
    const now = Date.now()
    polls.forEach((p) => {
      if (!p.created_at) return
      const created = new Date(p.created_at).getTime()
      if (!Number.isFinite(created)) return
      const monthsAgo = Math.min(
        11,
        Math.max(0, Math.floor((now - created) / (30 * 24 * 3600 * 1000))),
      )
      const idx = 11 - monthsAgo
      buckets[idx] += tallies[p.id]?.total_votes ?? 0
    })
    const sum = buckets.reduce((s, b) => s + b, 0)
    if (sum === 0) {
      buckets[buckets.length - 1] = totalVotes
    }
    return buckets
  }, [polls, tallies, totalVotes])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-primary">
          {t('analytics.eyebrow', {}, { defaultValue: 'Civic analytics' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 2),
            cm.textSize('4xl'),
            'font-extrabold tracking-tight text-on-surface',
          )}
          data-test="analytics-title"
        >
          {t('analytics.heading', {}, { defaultValue: 'Where the room is moving' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), 'font-medium text-on-surface-variant')}>
          {t(
            'analytics.subheading',
            {},
            {
              defaultValue:
                'Cross-poll participation and quorum trends — live from your workspace.',
            },
          )}
        </p>
      </div>

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
          icon="ballot"
          tone="primary"
          label={t('analytics.kpi.totalVotes', {}, { defaultValue: 'Ballots cast' })}
          value={totalVotes.toLocaleString()}
        />
        <QuorumKpiCard
          icon="balance"
          tone="accent"
          label={t('analytics.kpi.quorumMet', {}, { defaultValue: 'Quorum cleared' })}
          value={
            quorumPolls && quorumPolls.total > 0 ? `${quorumPolls.met} / ${quorumPolls.total}` : '—'
          }
        />
        <QuorumKpiCard
          icon="how_to_vote"
          tone="warning"
          label={t('analytics.kpi.live', {}, { defaultValue: 'Live ballots' })}
          value={String(livePolls)}
        />
        <QuorumKpiCard
          icon="lock_clock"
          tone="navy"
          label={t('analytics.kpi.closed', {}, { defaultValue: 'Closed ballots' })}
          value={String(closedPolls)}
        />
      </div>

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-8 min-w-0 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 5))}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                {t('analytics.trendEyebrow', {}, { defaultValue: 'Participation curve' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('lg'),
                  'font-extrabold tracking-tight text-on-surface mt-1',
                )}
              >
                {t(
                  'analytics.trendHeading',
                  {},
                  { defaultValue: 'Ballots over the last 12 months' },
                )}
              </h2>
            </div>
          </div>
          <ParticipationSparkline
            values={series}
            width={640}
            height={140}
            stroke="var(--mol-color-info)"
            strokeWidth={2}
            className={cm.cn('w-full h-auto')}
            ariaLabel={t('analytics.trendAria', {}, { defaultValue: 'Ballots cast per month' })}
          />
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-4 min-w-0 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          )}
        >
          <div className={cm.sp('mb', 4)}>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              {t('analytics.totalsEyebrow', {}, { defaultValue: 'Workspace totals' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('lg'),
                'font-extrabold tracking-tight text-on-surface mt-1',
              )}
            >
              {t('analytics.totalsHeading', {}, { defaultValue: 'Polls and ballots' })}
            </h2>
          </div>
          <ul className={cm.stack(2)}>
            <li className={cm.flex({ align: 'center', justify: 'between' })}>
              <span className="text-sm text-on-surface-variant">
                {t('analytics.totalsPolls', {}, { defaultValue: 'Total polls' })}
              </span>
              <span className="font-mono text-base font-extrabold tabular-nums text-on-surface">
                {polls.length}
              </span>
            </li>
            <li className={cm.flex({ align: 'center', justify: 'between' })}>
              <span className="text-sm text-on-surface-variant">
                {t('analytics.totalsBallots', {}, { defaultValue: 'Ballots cast' })}
              </span>
              <span className="font-mono text-base font-extrabold tabular-nums text-on-surface">
                {totalVotes}
              </span>
            </li>
          </ul>
        </section>
      </div>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <div className={cm.sp('mb', 5)}>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            {t('analytics.recentEyebrow', {}, { defaultValue: 'Recent ballots' })}
          </p>
          <h2
            className={cm.cn(
              cm.textSize('lg'),
              'font-extrabold tracking-tight text-on-surface mt-1',
            )}
          >
            {t('analytics.recentHeading', {}, { defaultValue: 'Across all polls' })}
          </h2>
        </div>
        {loading ? (
          <p className="text-sm text-on-surface-variant" data-test="analytics-loading">
            {t('analytics.loading', {}, { defaultValue: 'Loading analytics…' })}
          </p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-on-surface-variant" data-test="analytics-empty">
            {t(
              'analytics.empty',
              {},
              { defaultValue: 'No polls yet — create your first to see analytics.' },
            )}
          </p>
        ) : (
          <div className={cm.cn('overflow-x-auto -mx-6')}>
            <table className={cm.cn('min-w-full text-sm')} data-test="analytics-table">
              <thead>
                <tr className={cm.cn('border-b border-outline-variant/30')}>
                  <th
                    className={cm.cn(
                      'px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('analytics.col.poll', {}, { defaultValue: 'Poll' })}
                  </th>
                  <th
                    className={cm.cn(
                      'px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('nav.status', {}, { defaultValue: 'Status' })}
                  </th>
                  <th
                    className={cm.cn(
                      'px-6 py-3 text-right text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('analytics.col.votes', {}, { defaultValue: 'Votes' })}
                  </th>
                  <th
                    className={cm.cn(
                      'px-6 py-3 text-right text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('analytics.col.quorum', {}, { defaultValue: 'Quorum' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {recent.map((p) => {
                  const tally = tallies[p.id]
                  const votes = tally?.total_votes ?? 0
                  return (
                    <tr
                      key={p.id}
                      className={cm.cn('hover:bg-surface-container-low transition-colors')}
                      data-test={`analytics-row-${p.id}`}
                    >
                      <td className={cm.cn('px-6 py-4 font-semibold text-on-surface')}>
                        {p.title}
                      </td>
                      <td className={cm.cn('px-6 py-4')}>
                        <PollStatusPill status={statusToPill(p.status)} />
                      </td>
                      <td
                        className={cm.cn(
                          'px-6 py-4 text-right font-mono tabular-nums text-on-surface',
                        )}
                      >
                        {votes.toLocaleString()}
                      </td>
                      <td
                        className={cm.cn(
                          'px-6 py-4 text-right font-mono tabular-nums text-on-surface',
                        )}
                      >
                        {p.quorum_threshold ? `${p.quorum_threshold}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
