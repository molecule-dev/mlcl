import { useEffect, useMemo, useState } from 'react'

import { get } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { InboxLayout } from '../components/InboxLayout.js'
import { KpiStatCard } from '../components/KpiStatCard.js'
import { StatusPill } from '../components/StatusPill.js'

interface ConversationRow {
  id: string
  status: string | null
  agent_id: string | null
  created_at: string | null
  last_message_at: string | null
}

interface AgentApiRow {
  id: string
  name: string | null
  email: string | null
  status: 'online' | 'away' | 'offline'
}

interface TeamRow {
  id: string
  name: string
  initials: string
  resolved: number
  open: number
  status: 'online' | 'away' | 'offline'
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function ReportsBody() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [agents, setAgents] = useState<AgentApiRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [c, a] = await Promise.all([
          get<ConversationRow[]>('/api/conversations'),
          get<AgentApiRow[]>('/api/agents'),
        ])
        if (cancelled) return
        setConversations(Array.isArray(c.data) ? c.data : [])
        setAgents(Array.isArray(a.data) ? a.data : [])
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load reports')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const totalConversations = conversations.length
  const closedConversations = conversations.filter(
    (c) => c.status === 'closed' || c.status === 'resolved',
  ).length
  const openConversations = totalConversations - closedConversations
  const resolvedRate =
    totalConversations === 0 ? 0 : Math.round((closedConversations / totalConversations) * 100)

  const dailyVolume = useMemo(() => {
    const days = 14
    const counts = new Array<number>(days).fill(0)
    const now = Date.now()
    for (const c of conversations) {
      const d = new Date(c.created_at || c.last_message_at || 0).getTime()
      if (!d) continue
      const ageDays = Math.floor((now - d) / (24 * 60 * 60 * 1000))
      if (ageDays >= 0 && ageDays < days)
        counts[days - 1 - ageDays] = (counts[days - 1 - ageDays] || 0) + 1
    }
    return counts
  }, [conversations])

  const sparkPoints = useMemo(() => {
    const max = Math.max(1, ...dailyVolume)
    const stepX = 280 / Math.max(1, dailyVolume.length - 1)
    return dailyVolume
      .map((v, i) => `${(i * stepX).toFixed(1)},${(50 - (v / max) * 40 - 5).toFixed(1)}`)
      .join(' ')
  }, [dailyVolume])

  const teamRows: TeamRow[] = useMemo(() => {
    return agents
      .map((a) => {
        const myConvos = conversations.filter((c) => c.agent_id === a.id)
        const resolved = myConvos.filter(
          (c) => c.status === 'closed' || c.status === 'resolved',
        ).length
        const open = myConvos.length - resolved
        return {
          id: a.id,
          name: a.name || a.email || t('reports.agentFallback', {}, { defaultValue: 'Agent' }),
          initials: initials(a.name || a.email || 'A'),
          resolved,
          open,
          status: a.status || 'offline',
        }
      })
      .sort((x, y) => y.resolved - x.resolved)
  }, [agents, conversations, t])

  return (
    <div className={cm.cn(cm.stack(6), cm.sp('p', 6))}>
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 1 }))}>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-primary-dark',
          )}
        >
          {t('status.last30Days', {}, { defaultValue: 'Last 30 days' })}
        </span>
        <h1 className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('nav.reports', {}, { defaultValue: 'Reports' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'reports.subheading',
            {},
            {
              defaultValue:
                'Team performance, CSAT and conversation volume — refreshed every 5 minutes.',
            },
          )}
        </p>
      </header>
      <section className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'sm:grid-cols-2 lg:grid-cols-4')}>
        <KpiStatCard
          label={t('reports.kpi.volume', {}, { defaultValue: 'Conversations' })}
          value={totalConversations.toLocaleString()}
          trend={t(
            'reports.kpi.volumeTrend',
            { count: openConversations },
            { defaultValue: '{{count}} currently open' },
          )}
          icon="chat_bubble"
          accent="primary"
          trendTone="neutral"
        />
        <KpiStatCard
          label={t('status.resolved', {}, { defaultValue: 'Resolved' })}
          value={closedConversations.toLocaleString()}
          trend={t(
            'reports.kpi.resolvedTrend',
            { rate: resolvedRate },
            { defaultValue: '{{rate}}% resolution rate' },
          )}
          icon="check_circle"
          accent="success"
          trendTone="up"
        />
        <KpiStatCard
          label={t('reports.kpi.agents', {}, { defaultValue: 'Agents' })}
          value={agents.length.toLocaleString()}
          trend={t(
            'reports.kpi.agentsTrend',
            { count: agents.filter((a) => a.status === 'online').length },
            { defaultValue: '{{count}} online' },
          )}
          icon="groups"
          accent="bot"
          trendTone="neutral"
        />
        <KpiStatCard
          label={t('reports.kpi.open', {}, { defaultValue: 'Open queue' })}
          value={openConversations.toLocaleString()}
          trend={
            loading
              ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
              : t('reports.kpi.openTrend', {}, { defaultValue: 'Awaiting reply' })
          }
          icon="bolt"
          accent="warning"
          trendTone="neutral"
        />
      </section>
      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-error-container)] text-[color:var(--color-on-error-container)]',
          )}
        >
          {error}
        </div>
      ) : null}

      <section
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 4 }),
          cm.sp('p', 6),
          'bg-surface rounded-xl border border-[color:var(--color-border)]',
        )}
      >
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}>
            {t('reports.volumeChartTitle', {}, { defaultValue: 'Daily conversation volume' })}
          </h2>
          <StatusPill variant="online" label={t('status.live', {}, { defaultValue: 'Live' })} />
        </header>
        <div className={cm.cn(cm.h('[180px]'))}>
          <svg
            className={cm.cn(cm.w('full'), cm.h('full'))}
            viewBox="0 0 280 50"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="reportsGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`${sparkPoints} 280,50 0,50`} fill="url(#reportsGrad)" />
            <polyline
              points={sparkPoints}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </section>

      <section
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 4 }),
          cm.sp('p', 6),
          'bg-surface rounded-xl border border-[color:var(--color-border)]',
        )}
      >
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}>
            {t('reports.teamTitle', {}, { defaultValue: 'Team performance' })}
          </h2>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t('reports.teamHint', {}, { defaultValue: 'Sorted by resolved conversations' })}
          </span>
        </header>
        <div
          className={cm.cn('overflow-x-auto rounded-lg border border-[color:var(--color-border)]')}
        >
          <table className={cm.cn('w-full min-w-[480px] text-left text-sm')}>
            <thead className="bg-surface-secondary">
              <tr>
                {[
                  t('reports.team.col.agent', {}, { defaultValue: 'Agent' }),
                  t('status.resolved', {}, { defaultValue: 'Resolved' }),
                  t('common.open', {}, { defaultValue: 'Open' }),
                  t('nav.status', {}, { defaultValue: 'Status' }),
                ].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={'divide-y divide-[color:var(--color-border-secondary)]'}>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 6),
                      cm.textSize('sm'),
                      'text-center text-on-surface-variant',
                    )}
                  >
                    {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                  </td>
                </tr>
              ) : teamRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 8),
                      cm.textSize('sm'),
                      'text-center text-on-surface-variant',
                    )}
                  >
                    {t('reports.team.empty', {}, { defaultValue: 'No agents yet.' })}
                  </td>
                </tr>
              ) : (
                teamRows.map((agent) => (
                  <tr key={agent.id} className={'hover:bg-surface-secondary transition-colors'}>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                        <div
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'center' }),
                            cm.w(8),
                            cm.h(8),
                            cm.roundedFull,
                            cm.fontWeight('bold'),
                            cm.textSize('xs'),
                            'bg-primary/15 text-primary-dark',
                          )}
                        >
                          {agent.initials}
                        </div>
                        <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                          {agent.name}
                        </span>
                      </div>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.fontWeight('semibold'),
                        'tabular-nums text-on-surface',
                      )}
                    >
                      {agent.resolved}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.fontWeight('semibold'),
                        'tabular-nums text-on-surface',
                      )}
                    >
                      {agent.open}
                    </td>
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <StatusPill variant={agent.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Reports() {
  return <InboxLayout main={<ReportsBody />} />
}

export default Reports
export { Reports, Reports as ReportsPage }
