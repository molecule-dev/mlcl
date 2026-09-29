/**
 * Boards — the public board directory.
 *
 * Live grid of feedback boards from GET /api/boards, framed the way the
 * design lays the page out: directory heading, the active product domains
 * (with the live board count), a "how public feedback works" primer, and a
 * recent activity pulse fed by the newest posts. A "submit your own idea"
 * CTA card rides in the grid. No auth required: the public face of the
 * portal.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BoardCard } from '../components/BoardCard.js'
import { type ApiPost, authorName, timeAgo } from '../utils/posts.js'
import type { ApiBoardSummary } from '../utils/posts.js'

const HOW_STEPS = [
  {
    icon: 'how_to_vote',
    titleKey: 'boards.howStep1Title',
    titleDefault: 'Cast your vote',
    bodyKey: 'boards.howStep1Body',
    bodyDefault: 'Upvote the ideas you need, or propose specific use-cases of your own.',
  },
  {
    icon: 'description',
    titleKey: 'boards.howStep2Title',
    titleDefault: 'Add the details',
    bodyKey: 'boards.howStep2Body',
    bodyDefault: 'Add context and edge cases — high-signal requests strengthen priority.',
  },
  {
    icon: 'local_shipping',
    titleKey: 'boards.howStep3Title',
    titleDefault: 'Follow it to shipped',
    bodyKey: 'boards.howStep3Body',
    bodyDefault: 'Requests are triaged weekly and tracked publicly from planned to shipped.',
  },
]

export function Boards() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [boards, setBoards] = useState<ApiBoardSummary[] | null>(null)
  const [recent, setRecent] = useState<ApiPost[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const http = getHttpClient()
    void http
      .get<ApiBoardSummary[]>('/api/boards')
      .then((res) => {
        if (cancelled) return
        const data = res?.data
        if (Array.isArray(data)) setBoards(data)
        else setError(t('boards.loadError', {}, { defaultValue: 'Could not load boards.' }))
      })
      .catch((e) => {
        logError('boards.load', e)
        if (!cancelled)
          setError(t('boards.loadError', {}, { defaultValue: 'Could not load boards.' }))
      })
    void http
      .get<{ data?: ApiPost[] }>('/api/posts?sort=latest&limit=5')
      .then((res) => {
        if (cancelled) return
        if (Array.isArray(res?.data?.data)) setRecent(res.data.data)
      })
      .catch(() => undefined)
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
            {t('boards.eyebrow', {}, { defaultValue: 'Feedback boards' })}
          </span>
          <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight text-on-surface')}>
            {t('boards.title', {}, { defaultValue: 'Public Feedback & Product Boards' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'boards.subtitle',
              {},
              {
                defaultValue:
                  'Explore community suggestions, vote on key capabilities, and track what engineering is actively building. Requests are triaged weekly.',
              },
            )}
          </p>
        </div>
        <Link
          to="/submit"
          data-mol-id="boards-submit-cta"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('px', 5),
            cm.sp('py', 2),
            'rounded-full bg-primary text-on-primary hover:bg-primary-active transition-colors',
          )}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            add
          </span>
          {t('boards.submit', {}, { defaultValue: 'Submit feedback' })}
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

      <section
        aria-labelledby="boards-domains"
        className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          <h2
            id="boards-domains"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
          >
            {t('boards.domainsTitle', {}, { defaultValue: 'Active Product Domains' })}
          </h2>
          {boards !== null && (
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 0.5),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'rounded-full border text-on-surface-variant',
              )}
              style={{ borderColor: 'var(--color-outline-variant)' }}
            >
              {t(
                'boards.domainsCount',
                { count: boards.length },
                { defaultValue: '{{count}} available' },
              )}
            </span>
          )}
        </div>
        {boards === null && !error ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : (
          <div className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
            {(boards ?? []).map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
            <Link
              to="/submit"
              data-mol-id="boards-submit-card"
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('p', 5),
                'rounded-xl border-2 border-dashed border-outline-variant/50 hover:border-primary/50 text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('2xl'))}
                aria-hidden="true"
              >
                add_circle
              </span>
              <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                {t('boards.emptyCta', {}, { defaultValue: 'Post the first idea' })}
              </span>
            </Link>
          </div>
        )}
      </section>

      <section
        aria-labelledby="boards-how"
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('p', 6),
          'rounded-xl border border-outline-variant/40 bg-surface-container-low/40',
        )}
      >
        <h2
          id="boards-how"
          className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
        >
          {t('boards.howTitle', {}, { defaultValue: 'How Public Feedback Works' })}
        </h2>
        <div className={cm.cn('grid gap-4 grid-cols-1 sm:grid-cols-3')}>
          {HOW_STEPS.map((step) => (
            <div key={step.titleKey} className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(9),
                  cm.h(9),
                  'rounded-lg',
                )}
                style={{
                  backgroundColor: 'var(--color-primary-container)',
                  color: 'var(--color-primary)',
                }}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined', cm.textSize('base'))}>
                  {step.icon}
                </span>
              </span>
              <h3
                className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-on-surface')}
              >
                {t(step.titleKey, {}, { defaultValue: step.titleDefault })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(step.bodyKey, {}, { defaultValue: step.bodyDefault })}
              </p>
            </div>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section
          aria-labelledby="boards-pulse"
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
        >
          <h2
            id="boards-pulse"
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
          >
            {t('boards.pulseTitle', {}, { defaultValue: 'Recent Activity Pulse' })}
          </h2>
          <ul
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xs' }),
              cm.sp('p', 2),
              'rounded-xl border border-outline-variant/40 bg-surface divide-y divide-outline-variant/40',
            )}
          >
            {recent.map((post) => (
              <li
                key={post.id}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(6),
                    cm.h(6),
                    cm.roundedFull,
                    'shrink-0',
                  )}
                  style={{
                    backgroundColor: 'var(--color-primary-container)',
                    color: 'var(--color-primary)',
                  }}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined text-xs')}>arrow_drop_up</span>
                </span>
                <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant min-w-0')}>
                  <span className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                    {authorName(post.author)}
                  </span>{' '}
                  {t('boards.pulseActed', {}, { defaultValue: 'engaged with' })}{' '}
                  <Link
                    to={`/post/${post.id}`}
                    className={cm.cn(cm.fontWeight('medium'), 'text-primary hover:underline')}
                  >
                    {post.title}
                  </Link>
                </span>
                <span
                  className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant ml-auto shrink-0')}
                >
                  {timeAgo(post.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default Boards
