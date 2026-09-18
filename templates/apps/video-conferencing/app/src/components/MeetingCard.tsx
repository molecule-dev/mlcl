/**
 * Editorial meeting list item — left primary-color time block (border-l-4),
 * title in semibold, attendee avatar stack, status pill, and primary
 * Join/Start CTA aligned right. Hover lift + transition.
 *
 * Translated from personal-finance/ActivityRow.tsx (left accent bar +
 * editorial row pattern) and team-chat/MessagePreviewCard.tsx (avatar stack).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type MeetingCardStatus = 'upcoming' | 'live' | 'ended' | 'recurring'

export interface MeetingCardProps {
  id: string
  title: string
  subtitle?: string
  timeLabel: string
  durationLabel?: string
  attendees: ReadonlyArray<{ id: string; name: string; avatarUrl?: string }>
  status: MeetingCardStatus
  onPrimary: () => void
  onSecondary?: () => void
}

const STATUS_STYLES: Record<MeetingCardStatus, { dot: string; pill: string; label: string }> = {
  upcoming: {
    dot: 'bg-secondary',
    pill: 'bg-secondary/10 text-secondary',
    label: 'Upcoming',
  },
  live: {
    dot: 'bg-success animate-pulse',
    pill: 'bg-success/15 text-success',
    label: 'Live now',
  },
  ended: {
    dot: 'bg-on-surface-variant/40',
    pill: 'bg-on-surface-variant/10 text-on-surface-variant',
    label: 'Ended',
  },
  recurring: {
    dot: 'bg-tertiary',
    pill: 'bg-tertiary/10 text-tertiary',
    label: 'Recurring',
  },
}

export function MeetingCard({
  title,
  subtitle,
  timeLabel,
  durationLabel,
  attendees,
  status,
  onPrimary,
  onSecondary,
}: MeetingCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visible = attendees.slice(0, 4)
  const overflow = Math.max(0, attendees.length - visible.length)
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.upcoming
  const primaryLabel =
    status === 'live'
      ? t('meetingCard.join', {}, { defaultValue: 'Join' })
      : t('common.start', {}, { defaultValue: 'Start' })

  return (
    <article
      className={cm.cn(
        cm.flex({ align: 'center', gap: 6 }),
        cm.sp('p', 5),
        'group bg-surface-container-lowest border-l-4 border-primary/70 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
      )}
    >
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-[88px]')}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {timeLabel}
        </span>
        {durationLabel && (
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-on-surface-variant mt-1',
            )}
          >
            {durationLabel}
          </span>
        )}
      </div>
      <div className={cm.cn(cm.flex1, cm.stack(1))}>
        <div className={cm.flex({ align: 'center', gap: 3 })}>
          <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'text-on-surface')}>
            {title}
          </h3>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.sp('px', 2),
              'py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full',
              styles.pill,
            )}
          >
            <span className={cm.cn('w-1.5 h-1.5 rounded-full', styles.dot)} />
            {styles.label}
          </span>
        </div>
        {subtitle && (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{subtitle}</p>
        )}
      </div>
      <div className={cm.flex({ align: 'center', gap: 4 })}>
        <div className={'flex -space-x-2'}>
          {visible.map((a) => (
            <div
              key={a.id}
              className={
                'w-7 h-7 rounded-full border-2 border-surface bg-primary-container flex items-center justify-center text-[10px] font-bold text-on-primary-container'
              }
              title={a.name}
            >
              {a.avatarUrl ? (
                <img
                  src={a.avatarUrl}
                  alt=""
                  className={'w-full h-full rounded-full object-cover'}
                />
              ) : (
                a.name.charAt(0)
              )}
            </div>
          ))}
          {overflow > 0 && (
            <div
              className={
                'w-7 h-7 rounded-full border-2 border-surface bg-surface-container flex items-center justify-center text-[10px] font-bold text-on-surface-variant'
              }
            >
              +{overflow}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onPrimary}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.roundedFull,
            'bg-primary text-on-primary hover:bg-primary-dark transition-colors',
          )}
        >
          {primaryLabel}
        </button>
        {onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            aria-label={t('nav.details', {}, { defaultValue: 'Details' })}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-9 h-9 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors',
            )}
          >
            <span className={'material-symbols-outlined text-lg'}>arrow_forward</span>
          </button>
        )}
      </div>
    </article>
  )
}
