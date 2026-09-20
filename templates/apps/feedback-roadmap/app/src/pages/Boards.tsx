/**
 * Boards — the public board directory.
 *
 * Live grid of feedback boards from GET /api/boards, plus a "submit your
 * own idea" CTA card. No auth required: the public face of the portal.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { error as logError } from '@molecule/app-logger'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BoardCard } from '../components/BoardCard.js'
import type { ApiBoardSummary } from '../utils/posts.js'

export function Boards() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [boards, setBoards] = useState<ApiBoardSummary[] | null>(null)
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
            {t('boards.title', {}, { defaultValue: 'Tell us what to build next' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'boards.subtitle',
              {},
              {
                defaultValue:
                  'Post an idea, vote for the ones you need, and follow them from planned to shipped.',
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
    </div>
  )
}

export default Boards
