/**
 * Changelog — shipped requests, newest first (public).
 *
 * Every post an admin marked shipped appears here with its ship date,
 * title, body, and the vote count that got it built — the closed feedback
 * loop, rendered.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type ApiPost, formatDate } from '../utils/posts.js'

export function Changelog() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [posts, setPosts] = useState<ApiPost[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const http = getHttpClient()
    void http
      .get<{ data?: ApiPost[] }>('/api/posts?status=shipped&sort=latest&limit=50')
      .then((res) => {
        if (cancelled) return
        setPosts(Array.isArray(res?.data?.data) ? res.data.data : [])
      })
      .catch((e) => {
        logError('changelog.load', e)
        if (!cancelled)
          setError(t('changelog.loadError', {}, { defaultValue: 'Could not load the changelog.' }))
      })
    return () => {
      cancelled = true
    }
  }, [t])

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'max-w-3xl')}>
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
            {t('changelog.eyebrow', {}, { defaultValue: 'Changelog' })}
          </span>
          <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
            {t('changelog.title', {}, { defaultValue: 'Product Changelog' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'changelog.subtitle',
              {},
              {
                defaultValue:
                  'Verifiable release notes directly connected to customer demand. Every release closes the loop with the customers and teams who requested it.',
              },
            )}
          </p>
        </div>
        <Link
          to="/boards"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'text-primary hover:underline',
          )}
        >
          {t('changelog.boardsLink', {}, { defaultValue: 'Shape the next one' })}
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
      ) : (posts ?? []).length === 0 ? (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.sp('p', 10),
            'rounded-xl border border-dashed border-outline-variant/50 text-center',
          )}
        >
          <span
            className={cm.cn(
              'material-symbols-outlined',
              cm.textSize('3xl'),
              'text-on-surface-variant',
            )}
            aria-hidden="true"
          >
            local_shipping
          </span>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('changelog.empty', {}, { defaultValue: 'Nothing shipped yet — check the roadmap.' })}
          </p>
        </div>
      ) : (
        <section
          aria-labelledby="changelog-timeline"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
        >
          <h2
            id="changelog-timeline"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
          >
            {t('changelog.timelineTitle', {}, { defaultValue: 'Release Timeline' })}
          </h2>
          <div className={cm.cn(cm.flex({ direction: 'col' }))}>
            {(posts ?? []).map((post) => (
              <article
                key={post.id}
                data-mol-id="changelog-entry"
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  'relative pb-8 pl-8 border-l-2',
                )}
                style={{ borderColor: 'var(--color-roadmap-planned-bar)' }}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(6),
                    cm.h(6),
                    cm.roundedFull,
                    'absolute -left-[13px] top-0',
                  )}
                  style={{
                    backgroundColor: 'var(--color-status-shipped)',
                    color: 'var(--color-on-primary)',
                  }}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>
                    check
                  </span>
                </span>
                <time
                  dateTime={post.shipped_at ?? post.created_at}
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'uppercase tracking-widest',
                  )}
                  style={{ color: 'var(--color-changelog-date)' }}
                >
                  {formatDate(post.shipped_at ?? post.created_at)}
                </time>
                <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'), 'text-on-surface')}>
                  <Link to={`/post/${post.id}`} className="hover:text-primary transition-colors">
                    {post.title}
                  </Link>
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant leading-relaxed whitespace-pre-wrap',
                  )}
                >
                  {post.body}
                </p>
                {post.admin_response && (
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.sp('p', 3),
                      'rounded-lg',
                      cm.accentCard({ tone: 'custom' }),
                    )}
                    style={{
                      ['--mol-accent' as string]: 'var(--color-official-border)',
                      backgroundColor: 'var(--color-official-bg)',
                    }}
                  >
                    {post.admin_response}
                  </p>
                )}
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('xs'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant',
                  )}
                >
                  <span
                    className="material-symbols-outlined"

                    aria-hidden="true"
                  >
                    arrow_drop_up
                  </span>
                  {t(
                    'changelog.voteCount',
                    { count: post.vote_count ?? 0 },
                    { defaultValue: '{{count}} votes got this built' },
                  )}
                  {post.board && (
                    <>
                      <span aria-hidden="true">·</span>
                      <Link
                        to={`/b/${post.board.slug}`}
                        className="hover:text-primary transition-colors"
                      >
                        {post.board.name}
                      </Link>
                    </>
                  )}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-3')}>
        <section
          aria-labelledby="changelog-subscribe"
          data-mol-id="changelog-subscribe"
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 5),
            'rounded-xl border border-outline-variant/40 bg-surface',
          )}
        >
          <h3
            id="changelog-subscribe"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}
          >
            {t('changelog.subscribeTitle', {}, { defaultValue: 'Subscribe to Releases' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'changelog.subscribeBody',
              {},
              {
                defaultValue:
                  'Receive changelog notes directly in your inbox the second new builds are deployed to production. Voters are auto-notified on the requests they backed.',
              },
            )}
          </p>
          <Link
            to="/signup"
            data-mol-id="changelog-subscribe-cta"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-full bg-primary text-on-primary self-start hover:bg-primary-active transition-colors',
            )}
          >
            {t('changelog.subscribeCta', {}, { defaultValue: 'Get release notes' })}
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              mail
            </span>
          </Link>
        </section>

        <section
          aria-labelledby="changelog-integrations"
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 5),
            'rounded-xl border border-outline-variant/40 bg-surface',
          )}
        >
          <h3
            id="changelog-integrations"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}
          >
            {t(
              'changelog.integrationsTitle',
              {},
              { defaultValue: 'Changelog via Integrations Live Feeds' },
            )}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'changelog.integrationsBody',
              {},
              {
                defaultValue:
                  'Pipe every release into the tools your team already lives in — chat channels and webhooks carry the same verifiable notes the portal shows.',
              },
            )}
          </p>
        </section>

        <section
          aria-labelledby="changelog-cadence"
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 5),
            'rounded-xl border border-outline-variant/40 bg-surface',
          )}
        >
          <h3
            id="changelog-cadence"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}
          >
            {t('changelog.cadenceTitle', {}, { defaultValue: 'Release Cadence & SLA' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'changelog.cadenceBody',
              {},
              {
                defaultValue:
                  'Ships roll out continuously; the portal, API, and webhook feeds update within minutes of each deploy. Every entry names the request and voters that triggered it.',
              },
            )}
          </p>
        </section>
      </div>
    </div>
  )
}

export default Changelog
