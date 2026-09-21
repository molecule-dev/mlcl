import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SafeLink } from '../components/SafeLink.js'
import SideNavBar from '../components/SideNavBar.js'
import TopNavBar from '../components/TopNavBar.js'

interface IssueStats {
  issue_id: string
  subject: string | null
  status: string | null
  publish_at: string | null
  delivered: number
  opened: number
  clicked: number
  open_rate: number
  click_rate: number
  opens_over_time: Array<{ date: string; count: number }>
}

interface Issue {
  id: string
  subject?: string
  preview_text?: string | null
  body_md?: string
  status?: string
  publish_at?: string | null
}

/**
 * IssueDetail — the creator's view of a published issue: the rendered body
 * plus its delivery stats (delivered / opened / clicked, opens over time).
 * The stats are the SIMULATED delivery numbers produced by the sends-table
 * fan-out and the demo open/click trackers (public tokened issue URLs) — no
 * real email is sent by this template.
 */
function IssueDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [issue, setIssue] = useState<Issue | null>(null)
  const [stats, setStats] = useState<IssueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const http = useHttpClient()

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    Promise.all([
      http.get<Issue>(`/api/issues/${id}`),
      http.get<IssueStats>(`/api/issues/${id}/stats`),
    ])
      .then(([issueRes, statsRes]) => {
        if (!active) return
        // The app-http client resolves to a response wrapper; `.data` is the body.
        setIssue(issueRes.data)
        setStats(statsRes.data)
      })
      .catch((err: unknown) => {
        if (active)
          setError(
            err instanceof Error
              ? err.message
              : t('issueDetail.loadFailed', {}, { defaultValue: 'Failed to load issue' }),
          )
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id, http, t])

  const opens = stats?.opens_over_time ?? []
  const maxOpens = Math.max(...opens.map((o) => o.count), 1)
  const sections = (issue?.body_md ?? '')
    .split(/\n\n+/g)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <>
      <SideNavBar />
      <TopNavBar />
      <main
        aria-label={issue?.subject ?? t('issueDetail.title', {}, { defaultValue: 'Issue detail' })}
        className={cm.cn(
          // Sidebar is hidden below md — content spans full width there.
          'md:ml-[240px] pt-24 pb-28 md:pb-24 px-4 md:px-12',
          'max-w-[1200px]',
        )}
      >
        {loading ? (
          <div
            className={cm.cn(
              cm.sp('py', 12),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {t('common.loading', {}, { defaultValue: 'Loading...' })}
          </div>
        ) : error ? (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        ) : issue ? (
          <div
            className={cm.cn(cm.flex({ direction: 'col' }), 'gap-10 lg:flex-row lg:items-start')}
          >
            {/* Rendered issue */}
            <article data-mol-id="issue-detail-body" className={cm.cn(cm.flex1, 'max-w-[680px]')}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {issue.publish_at
                  ? new Date(issue.publish_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : ''}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('3xl'),
                  "font-black font-['Newsreader'] text-on-background mt-2",
                )}
              >
                {issue.subject}
              </h2>
              {issue.preview_text && (
                <p
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.sp('mt', 2),
                    'italic text-on-surface-variant',
                  )}
                >
                  {issue.preview_text}
                </p>
              )}
              <div className={cm.cn('prose-editorial', cm.sp('mt', 8))}>
                {sections.length > 0 ? (
                  sections.map((p, i) =>
                    p.startsWith('## ') ? (
                      <h3
                        key={i}
                        className={cm.cn(
                          cm.textSize('xl'),
                          cm.fontWeight('bold'),
                          "font-['Newsreader'] text-on-surface mt-8 mb-4",
                        )}
                      >
                        {p.slice(3)}
                      </h3>
                    ) : p.startsWith('- ') ? (
                      <ul key={i} className="list-disc pl-6">
                        {p.split('\n').map((li, j) => (
                          <li key={j} className={cm.textSize('base')}>
                            {li.replace(/^- /, '')}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p key={i} className={cm.textSize('base')}>
                        {p}
                      </p>
                    ),
                  )
                ) : (
                  <p className={cm.textSize('base')}>
                    {t('issueDetail.empty', {}, { defaultValue: 'This issue has no body yet.' })}
                  </p>
                )}
              </div>
              <SafeLink
                to={`/issues/${issue.id}`}
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-primary hover:underline mt-8 inline-block',
                )}
              >
                {t('issueDetail.viewPublic', {}, { defaultValue: 'View the public page' })}
              </SafeLink>
            </article>

            {/* Per-issue stats */}
            <aside
              data-mol-id="issue-detail-stats"
              className={cm.cn('lg:w-[360px] w-full', cm.stack(6))}
            >
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-xl bg-surface-container-lowest',
                  cm.stack(4),
                )}
              >
                <h3
                  className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-on-surface')}
                >
                  {t('issueDetail.deliveryTitle', {}, { defaultValue: 'Delivery' })}
                </h3>
                <StatPill
                  label={t('dashboard.delivered', {}, { defaultValue: 'Delivered' })}
                  value={(stats?.delivered ?? 0).toLocaleString()}
                  dataMolId="issue-stats-delivered"
                />
                <StatPill
                  label={t('dashboard.opened', {}, { defaultValue: 'Opened' })}
                  value={`${(stats?.opened ?? 0).toLocaleString()} (${stats?.open_rate ?? 0}%)`}
                  dataMolId="issue-stats-opened"
                />
                <StatPill
                  label={t('dashboard.clicked', {}, { defaultValue: 'Clicked' })}
                  value={`${(stats?.clicked ?? 0).toLocaleString()} (${stats?.click_rate ?? 0}%)`}
                  dataMolId="issue-stats-clicked"
                />
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'issueDetail.demoNote',
                    {},
                    {
                      defaultValue:
                        'Demo delivery: sends are logged per subscriber; opens/clicks come from tokened public-issue visits.',
                    },
                  )}
                </p>
              </div>

              <div className={cm.cn(cm.sp('p', 6), 'rounded-xl bg-surface-container-lowest')}>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    'text-on-surface mb-4',
                  )}
                >
                  {t('issueDetail.opensOverTime', {}, { defaultValue: 'Opens over time' })}
                </h3>
                <div
                  className={cm.cn(cm.flex({ align: 'end', gap: 'sm' }), cm.h(24))}
                  role="img"
                  aria-label={t(
                    'issueDetail.opensOverTime',
                    {},
                    { defaultValue: 'Opens over time' },
                  )}
                >
                  {opens.map((point) => (
                    <div
                      key={point.date}
                      title={`${point.date}: ${point.count}`}
                      className={cm.cn(
                        cm.flex1,
                        'rounded-t bg-primary/70 hover:bg-primary transition-all',
                      )}
                      style={{ height: `${Math.max(4, (point.count / maxOpens) * 100)}%` }}
                    />
                  ))}
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </main>
    </>
  )
}

function StatPill({
  label,
  value,
  dataMolId,
}: {
  label: string
  value: string
  dataMolId: string
}) {
  const cm = getClassMap()
  return (
    <div
      data-mol-id={dataMolId}
      className={cm.cn(cm.flex({ justify: 'between' }), cm.textSize('sm'))}
    >
      <span className="text-on-surface-variant">{label}</span>
      <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>{value}</span>
    </div>
  )
}

export default IssueDetail
export { IssueDetail, IssueDetail as IssueDetailPage }
