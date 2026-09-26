/**
 * Poll feed card — 4px-solid left status border keyed to poll lifecycle, top
 * row with title + question type + status pill, body line with question /
 * response counts, footer with creator avatar, timestamp, and quorum % bar.
 *
 * Translated from crm's RecentActivityCard (avatar + meta line + tinted left
 * border) and personal-finance's ActivityRow (footer separator with bullets).
 * Status border colors come directly from DESIGN.md "Poll Card".
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type PollStatus, PollStatusPill } from './PollStatusPill.js'

export interface PollCardData {
  id: string
  title: string
  type: 'single-choice' | 'multiple-choice' | 'ranked' | 'open-text' | 'rating'
  status: PollStatus
  question_count: number
  response_count: number
  /** Quorum % met, 0-100. */
  quorum_pct?: number
  creator_initial: string
  creator_name: string
  /** ISO date the poll was created or scheduled. */
  timestamp: string
  /** Optional caption (e.g. "closes in 2h", "open until Mar 14"). */
  caption?: string
}

const STATUS_BORDER: Record<PollStatus, string> = {
  live: 'var(--mol-color-success)',
  scheduled: 'var(--mol-color-warning)',
  closed: 'var(--color-outline)',
  draft: 'var(--mol-color-primary)',
  archived: 'var(--color-on-surface-variant)',
}

const TYPE_LABEL: Record<PollCardData['type'], string> = {
  'single-choice': 'Single choice',
  'multiple-choice': 'Multiple choice',
  ranked: 'Ranked',
  'open-text': 'Open text',
  rating: 'Rating',
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return iso
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

interface PollCardProps {
  poll: PollCardData
  /** Override the link target — defaults to /polls/:id. */
  to?: string
}

export function PollCard({ poll, to }: PollCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const href = to ?? `/polls/${poll.id}`
  return (
    <Link
      to={href}
      className={cm.cn(
        cm.sp('p', 5),
        cm.flex({ direction: 'col', gap: 'sm' }),
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all',
      )}
      style={{ borderLeftWidth: '4px', borderLeftColor: STATUS_BORDER[poll.status] }}
      data-mol-id={`poll-card-${poll.id}`}
    >
      <div className={cm.flex({ align: 'start', justify: 'between', gap: 'sm' })}>
        <div className={cm.cn('min-w-0 flex-1')}>
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            {t(`pollCard.type.${poll.type}`, {}, { defaultValue: TYPE_LABEL[poll.type] })}
          </p>
          <h3
            className={cm.cn(
              cm.sp('mt', 1),
              cm.textSize('lg'),
              'font-extrabold tracking-tight text-on-surface line-clamp-2',
            )}
          >
            {poll.title}
          </h3>
        </div>
        <PollStatusPill status={poll.status} />
      </div>

      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
        {t(
          'pollCard.questionsAndResponses',
          { questions: poll.question_count, responses: poll.response_count.toLocaleString() },
          { defaultValue: '{{questions}} questions · {{responses}} responses' },
        )}
      </p>

      {typeof poll.quorum_pct === 'number' ? (
        <div className={cm.cn('mt-1', cm.flex({ direction: 'col', gap: 'sm' }))}>
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              {t('pollCard.quorum', {}, { defaultValue: 'Quorum' })}
            </span>
            <span className={cm.cn('font-mono text-xs font-bold tabular-nums text-on-surface')}>
              {poll.quorum_pct}%
            </span>
          </div>
          <div className={cm.cn('h-1.5 overflow-hidden rounded-full bg-surface-container')}>
            <div
              className={cm.cn('h-full rounded-full transition-all duration-500')}
              style={{
                width: `${Math.min(poll.quorum_pct, 100)}%`,
                background:
                  poll.quorum_pct >= 100
                    ? 'var(--mol-color-success)'
                    : poll.quorum_pct >= 50
                      ? 'var(--mol-color-info)'
                      : 'var(--mol-color-warning)',
              }}
            />
          </div>
        </div>
      ) : null}

      <footer
        className={cm.cn(
          cm.sp('pt', 3),
          cm.flex({ align: 'center', gap: 'sm' }),
          'border-t border-outline-variant/20 text-xs text-on-surface-variant',
        )}
      >
        <span
          className={cm.cn(
            'grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold',
          )}
        >
          {poll.creator_initial}
        </span>
        <span className="font-semibold text-on-surface truncate">{poll.creator_name}</span>
        <span aria-hidden="true" className="opacity-50">
          ·
        </span>
        <span className="tabular-nums">{fmtRelative(poll.timestamp)}</span>
        {poll.caption ? (
          <>
            <span aria-hidden="true" className="opacity-50">
              ·
            </span>
            <span className="font-semibold tracking-tight">{poll.caption}</span>
          </>
        ) : null}
      </footer>
    </Link>
  )
}
