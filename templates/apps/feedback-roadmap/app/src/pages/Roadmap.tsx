/**
 * Roadmap — the public commitment view.
 *
 * Three columns (Planned / In progress / Shipped & GA) of roadmap cards,
 * each carrying its target-quarter label, vote count, and status color, and
 * a closing primer on how the commitments stay honest. Shipped entries also
 * live on the changelog with full release notes — this column is the
 * at-a-glance counterpart.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatusBadge } from '../components/StatusBadge.js'
import { type ApiPost, authorName } from '../utils/posts.js'

interface Column {
  status: 'planned' | 'in_progress' | 'shipped'
  titleKey: string
  titleDefault: string
  icon: string
  barColor: string
}

const COLUMNS: Column[] = [
  {
    status: 'planned',
    titleKey: 'roadmap.colPlanned',
    titleDefault: 'Planned (Committed)',
    icon: 'event_available',
    barColor: 'var(--color-status-planned)',
  },
  {
    status: 'in_progress',
    titleKey: 'roadmap.colInProgress',
    titleDefault: 'In Progress (Active)',
    icon: 'progress_activity',
    barColor: 'var(--color-status-inprogress)',
  },
  {
    status: 'shipped',
    titleKey: 'roadmap.colShipped',
    titleDefault: 'Shipped & GA',
    icon: 'check_circle',
    barColor: 'var(--color-status-shipped)',
  },
]

export function Roadmap() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [posts, setPosts] = useState<ApiPost[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const http = getHttpClient()
    void http
      .get<{ data?: ApiPost[] }>('/api/posts?sort=top&limit=100')
      .then((res) => {
        if (cancelled) return
        const rows = Array.isArray(res?.data?.data) ? res.data.data : []
        setPosts(rows)
        track({
          name: 'roadmap.viewed',
          properties: {
            planned: rows.filter((p) => p.status === 'planned').length,
            in_progress: rows.filter((p) => p.status === 'in_progress').length,
            shipped: rows.filter((p) => p.status === 'shipped').length,
          },
        })
      })
      .catch((e) => {
        logError('roadmap.load', e)
        if (!cancelled)
          setError(t('roadmap.loadError', {}, { defaultValue: 'Could not load the roadmap.' }))
      })
    return () => {
      cancelled = true
    }
  }, [t])

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', gap: 'md' }), 'flex-wrap')}
      >
        <div>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-primary',
            )}
          >
            {t('roadmap.eyebrow', {}, { defaultValue: 'Public roadmap' })}
          </span>
          <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
            {t('roadmap.title', {}, { defaultValue: 'Public Product Roadmap' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'roadmap.subtitle',
              {},
              {
                defaultValue:
                  'Verifiable delivery commitments connected to engineering sprints. Track real-time progress — items move as the work moves, and voters hear it first.',
              },
            )}
          </p>
        </div>
        <Link
          to="/changelog"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'text-primary hover:underline',
          )}
        >
          {t('roadmap.changelogLink', {}, { defaultValue: 'See what already shipped' })}
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </header>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.sp('p', 3),
            'rounded-lg bg-error-container/40 text-on-error-container border border-error/40',
          )}
        >
          {error}
        </div>
      )}

      {posts === null && !error ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <div className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
          {COLUMNS.map((col) => {
            const rows = (posts ?? []).filter((p) => p.status === col.status)
            return (
              <section
                key={col.status}
                data-mol-id={`roadmap-column-${col.status}`}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.sp('p', 4),
                  'rounded-xl border border-outline-variant/40 bg-surface',
                )}
                style={{ borderTop: `4px solid ${col.barColor}` }}
              >
                <h2
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.fontWeight('bold'),
                    cm.textSize('lg'),
                  )}
                  style={{ color: col.barColor }}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {col.icon}
                  </span>
                  {t(col.titleKey, {}, { defaultValue: col.titleDefault })}
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'text-on-surface-variant',
                    )}
                  >
                    ({rows.length})
                  </span>
                </h2>
                {rows.length === 0 ? (
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t('roadmap.emptyColumn', {}, { defaultValue: 'Nothing here yet.' })}
                  </p>
                ) : (
                  rows.map((post) => (
                    <Link
                      key={post.id}
                      to={`/post/${post.id}`}
                      data-mol-id="roadmap-card"
                      className={cm.cn(
                        cm.flex({ direction: 'col', gap: 'xs' }),
                        cm.sp('p', 4),
                        'rounded-lg border border-outline-variant/40 bg-surface-container-low/40 hover:border-primary/40 transition-colors',
                      )}
                    >
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                        )}
                      >
                        <StatusBadge status={col.status} label={post.roadmap_label} />
                        <span
                          className={cm.cn(
                            cm.flex({ align: 'center', gap: 'xs' }),
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'text-on-surface-variant',
                          )}
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          <span
                            className="material-symbols-outlined"

                            aria-hidden="true"
                          >
                            arrow_drop_up
                          </span>
                          {post.vote_count ?? 0}
                        </span>
                      </div>
                      <span
                        className={cm.cn(
                          cm.fontWeight('semibold'),
                          cm.textSize('sm'),
                          'text-on-surface',
                        )}
                      >
                        {post.title}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'roadmap.cardMeta',
                          { author: authorName(post.author), board: post.board?.name ?? '' },
                          { defaultValue: 'by {{author}} · {{board}}' },
                        )}
                      </span>
                    </Link>
                  ))
                )}
              </section>
            )
          })}
        </div>
      )}

      <section
        aria-labelledby="roadmap-how"
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'sm' }),
          cm.sp('p', 6),
          'rounded-xl border border-outline-variant/40 bg-surface-container-low/40',
        )}
      >
        <h2
          id="roadmap-how"
          className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
        >
          {t('roadmap.howTitle', {}, { defaultValue: 'How SignalLoop Roadmap Commitments Work' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
          {t(
            'roadmap.howBody',
            {},
            {
              defaultValue:
                'Unlike static marketing roadmaps, this board reflects live engineering backlog states. An item only enters Planned once it is committed to a sprint, moves to In Progress when the work starts, and lands in Shipped & GA the moment it reaches production — at which point every voter is notified and the changelog entry goes out.',
            },
          )}
        </p>
      </section>
    </div>
  )
}

export default Roadmap
