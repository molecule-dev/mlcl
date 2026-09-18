import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Session card — left-border accent in the status color, tutor avatar
 * inline with subject + datetime, status pill, action button.
 *
 * Translated from personal-finance ActivityRow + lms DeadlineItem (left
 * accent + tone matrix), tuned for tutoring-session statuses.
 */

export type SessionStatus = 'upcoming' | 'in_progress' | 'completed' | 'cancelled'

const statusBorder: Record<SessionStatus, string> = {
  upcoming: 'var(--chalk-booked)',
  in_progress: 'var(--chalk-in-session)',
  completed: 'var(--chalk-available)',
  cancelled: 'var(--chalk-cancelled)',
}

const statusBg: Record<SessionStatus, string> = {
  upcoming: 'var(--chalk-booked-light)',
  in_progress: 'var(--chalk-in-session-light)',
  completed: 'var(--chalk-available-light)',
  cancelled: 'var(--chalk-cancelled-light)',
}

const statusFg: Record<SessionStatus, string> = {
  upcoming: 'var(--chalk-booked)',
  in_progress: 'var(--chalk-in-session)',
  completed: 'var(--chalk-available)',
  cancelled: 'var(--chalk-cancelled)',
}

export type SessionCardProps = {
  id: string
  tutorId: string
  tutorName: string
  tutorAvatarSeed?: string
  subject: string
  startsAt: string
  durationMinutes: number
  status: SessionStatus
}

export function SessionCard({
  id,
  tutorId,
  tutorName,
  tutorAvatarSeed,
  subject,
  startsAt,
  durationMinutes,
  status,
}: SessionCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const seed = tutorAvatarSeed ?? tutorId
  const statusLabel = t(
    `sessionCard.status.${status}`,
    {},
    {
      defaultValue: {
        upcoming: 'Upcoming',
        in_progress: 'In session',
        completed: 'Completed',
        cancelled: 'Cancelled',
      }[status],
    },
  )

  return (
    <article
      data-mol-id={`session-${id}`}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        'relative bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 pl-5 pr-4 py-4 transition-all hover:translate-x-1 hover:shadow-md',
      )}
      style={{ borderLeft: `4px solid ${statusBorder[status]}` }}
    >
      <div
        className={cm.cn(
          'rounded-full overflow-hidden ring-2 ring-surface-container-lowest shadow-sm shrink-0',
        )}
        style={{ width: 48, height: 48 }}
      >
        <img
          src={`https://i.pravatar.cc/96?u=${encodeURIComponent(seed)}`}
          alt={t('sessionCard.avatarAlt', { name: tutorName }, { defaultValue: '{{name}} avatar' })}
          className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
        />
      </div>

      <div className={cm.cn(cm.flex1, cm.stack(1))}>
        <p
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'font-display tracking-tight')}
        >
          {subject}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'sessionCard.line',
            { name: tutorName, when: startsAt, mins: durationMinutes },
            { defaultValue: 'with {{name}} • {{when}} • {{mins}} min' },
          )}
        </p>
      </div>

      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'rounded-full px-3 py-1 uppercase tracking-widest shrink-0',
        )}
        style={{
          backgroundColor: statusBg[status],
          color: statusFg[status],
          fontSize: '0.625rem',
        }}
      >
        {status === 'in_progress' && (
          <span
            aria-hidden="true"
            className={cm.cn(
              'inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle animate-pulse',
            )}
            style={{ backgroundColor: statusFg[status] }}
          />
        )}
        {statusLabel}
      </span>

      <Link
        to={`/sessions/${id}`}
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'rounded-full w-9 h-9 hover:bg-surface-container transition-colors text-on-surface-variant shrink-0',
        )}
        aria-label={t('sessionCard.openCta', {}, { defaultValue: 'Open session' })}
      >
        <span className={cm.cn('material-symbols-outlined text-lg')}>arrow_forward</span>
      </Link>
    </article>
  )
}

export default SessionCard
