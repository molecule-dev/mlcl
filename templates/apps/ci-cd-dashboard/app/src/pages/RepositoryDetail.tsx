import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface Repository {
  id: string
  slug: string
  name: string
  default_branch?: string
  language?: string
  description?: string
  branches?: Array<{ name: string; last_commit: string; ahead: number; behind: number }>
  recent_pipelines?: Array<{ id: string; name: string; status: string; started_at: string }>
  config_yml?: string
  webhooks?: Array<{ id: string; url: string; events: string[]; active: boolean }>
  stats?: { total_builds?: number; success_rate_pct?: number; mean_duration_seconds?: number }
}

const TABS = ['overview', 'branches', 'pipelines', 'settings'] as const
type Tab = (typeof TABS)[number]

function fmtDur(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m${(seconds % 60).toString().padStart(2, '0')}s`
}

export function RepositoryDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { slug } = useParams<{ slug: string }>()
  const http = useHttpClient()
  const [repo, setRepo] = useState<Repository | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/repositories/${slug}`)
      .then((res) => {
        if (!cancelled) setRepo(unwrapSingle<Repository>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('repositoryDetail.loadError', {}, { defaultValue: 'Failed to load repository.' }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug, http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <Link
        to="/repositories"
        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant hover:underline')}
      >
        ← {t('repositoryDetail.backLink', {}, { defaultValue: 'All repositories' })}
      </Link>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : !repo ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('repositoryDetail.notFound', {}, { defaultValue: 'Repository not found.' })}
        </p>
      ) : (
        (() => {
          const branches = repo.branches ?? []
          const recentPipelines = repo.recent_pipelines ?? []
          const webhooks = repo.webhooks ?? []
          const stats = repo.stats ?? {}
          const totalBuilds = stats.total_builds ?? 0
          const successRate = stats.success_rate_pct ?? 0
          const meanDuration = stats.mean_duration_seconds ?? 0
          const configYml = repo.config_yml ?? '# No CI configuration found.\n'
          return (
            <div className={cm.sp('mt', 4)}>
              <header className={cm.sp('mb', 4)}>
                <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-mono')}>
                  {repo.name}
                </h1>
                <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
                  {repo.description ?? ''}
                </p>
              </header>

              <nav
                className={cm.cn(
                  cm.flex({ gap: 'md' }),
                  cm.sp('mb', 6),
                  'border-b border-outline-variant',
                )}
              >
                {TABS.map((tabKey) => {
                  const isActive = tab === tabKey
                  return (
                    <button
                      key={tabKey}
                      type="button"
                      onClick={() => setTab(tabKey)}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        'border-b-2 -mb-px',
                        isActive
                          ? 'border-primary text-primary'
                          : 'border-transparent text-on-surface-variant hover:text-on-surface',
                      )}
                    >
                      {t(
                        `repositoryDetail.tab.${tabKey}`,
                        {},
                        { defaultValue: tabKey.charAt(0).toUpperCase() + tabKey.slice(1) },
                      )}
                    </button>
                  )
                })}
              </nav>

              {tab === 'overview' && (
                <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
                  <div className={'col-span-12 lg:col-span-8'}>
                    <h2
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'uppercase tracking-wider text-on-surface-variant',
                        cm.sp('mb', 2),
                      )}
                    >
                      {t('repositoryDetail.configHeading', {}, { defaultValue: '.conduit.yml' })}
                    </h2>
                    <pre
                      className={cm.cn(
                        cm.sp('p', 4),
                        'bg-surface border border-outline-variant rounded-md font-mono text-xs overflow-x-auto whitespace-pre',
                      )}
                    >
                      {configYml}
                    </pre>
                  </div>
                  <aside className={'col-span-12 lg:col-span-4 space-y-3'}>
                    <Stat
                      label={t(
                        'repositoryDetail.totalBuilds',
                        {},
                        { defaultValue: 'Total builds' },
                      )}
                      value={totalBuilds.toLocaleString()}
                    />
                    <Stat
                      label={t(
                        'repositoryDetail.successRate',
                        {},
                        { defaultValue: 'Success rate' },
                      )}
                      value={`${successRate.toFixed(1)}%`}
                    />
                    <Stat
                      label={t(
                        'repositoryDetail.meanDuration',
                        {},
                        { defaultValue: 'Mean duration' },
                      )}
                      value={fmtDur(meanDuration)}
                    />
                  </aside>
                </div>
              )}

              {tab === 'branches' && (
                <ul className={'space-y-2'}>
                  {branches.map((b) => (
                    <li
                      key={b.name}
                      className={cm.cn(
                        cm.sp('p', 3),
                        cm.flex({ align: 'center', justify: 'between' }),
                        'bg-surface rounded-md border border-outline-variant',
                      )}
                    >
                      <div>
                        <p className={cm.cn(cm.fontWeight('semibold'), 'font-mono')}>{b.name}</p>
                        <p
                          className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}
                        >
                          {b.last_commit.slice(0, 7)}
                        </p>
                      </div>
                      <span
                        className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}
                      >
                        {t(
                          'repositoryDetail.aheadBehind',
                          { ahead: b.ahead, behind: b.behind },
                          { defaultValue: '↑{{ahead}} ↓{{behind}}' },
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {tab === 'pipelines' && (
                <ul className={'space-y-2'}>
                  {recentPipelines.map((p) => (
                    <li key={p.id}>
                      <Link
                        to={`/pipelines/${p.id}`}
                        className={cm.cn(
                          cm.sp('p', 3),
                          cm.flex({ align: 'center', justify: 'between' }),
                          'block bg-surface rounded-md border border-outline-variant hover:border-primary',
                        )}
                      >
                        <p className={cm.fontWeight('semibold')}>{p.name}</p>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            'font-mono text-on-surface-variant uppercase',
                          )}
                        >
                          {p.status}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {tab === 'settings' && (
                <div
                  className={cm.cn(
                    cm.sp('p', 5),
                    'bg-surface rounded-md border border-outline-variant space-y-4',
                  )}
                >
                  <div>
                    <h2
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'uppercase tracking-wider text-on-surface-variant',
                        cm.sp('mb', 2),
                      )}
                    >
                      {t('repositoryDetail.webhooksHeading', {}, { defaultValue: 'Webhooks' })}
                    </h2>
                    <ul className={'space-y-2'}>
                      {webhooks.map((w) => (
                        <li
                          key={w.id}
                          className={cm.cn(
                            cm.sp('p', 3),
                            'border border-outline-variant rounded-md font-mono text-xs',
                          )}
                        >
                          <p>{w.url}</p>
                          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                            {w.events.join(', ')} ·{' '}
                            {w.active
                              ? t('repositoryDetail.webhookActive', {}, { defaultValue: 'active' })
                              : t('repositoryDetail.webhookPaused', {}, { defaultValue: 'paused' })}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )
        })()
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.sp('p', 4), 'bg-surface rounded-md border border-outline-variant')}>
      <p className={cm.cn(cm.textSize('xs'), 'uppercase tracking-wider text-on-surface-variant')}>
        {label}
      </p>
      <p className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'font-mono')}>{value}</p>
    </div>
  )
}
