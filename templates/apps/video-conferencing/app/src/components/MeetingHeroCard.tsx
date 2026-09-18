/**
 * Gradient hero card — primary→secondary indigo/cyan gradient, large meeting
 * title in 5xl-extrabold, frosted-glass "starts in" pill, decorative blurred
 * orbs, attendee avatar stack, and join/details CTAs.
 *
 * Translated from personal-finance/NetWorthCard.tsx (gradient hero pattern)
 * and team-chat/ActivityCard.tsx (frosted-glass overlay pattern).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface MeetingHeroCardProps {
  title: string
  startsAtLabel: string
  startsInLabel?: string
  attendees: ReadonlyArray<{ id: string; name: string; avatarUrl?: string }>
  status: 'starting' | 'upcoming' | 'live'
  onJoin: () => void
  onDetails: () => void
}

export function MeetingHeroCard({
  title,
  startsAtLabel,
  startsInLabel,
  attendees,
  status,
  onJoin,
  onDetails,
}: MeetingHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const visibleAttendees = attendees.slice(0, 4)
  const overflow = Math.max(0, attendees.length - visibleAttendees.length)

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between', gap: 8 }),
        cm.sp('p', 10),
        'min-h-[280px] bg-gradient-to-br from-primary via-primary-dark to-secondary rounded-[2rem] text-on-primary relative overflow-hidden shadow-xl shadow-primary/20',
      )}
    >
      <div className={cm.cn('relative z-10', cm.stack(3))}>
        <div className={cm.flex({ align: 'center', gap: 3 })}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'uppercase tracking-widest bg-surface/20 backdrop-blur-md',
            )}
          >
            {status === 'live' && (
              <span className={'w-2 h-2 rounded-full bg-success animate-pulse'} />
            )}
            {t('status.upNext', {}, { defaultValue: 'Up next' })}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'bg-surface/15 backdrop-blur-md',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>schedule</span>
            {status === 'starting'
              ? t('meetingHeroCard.starting', {}, { defaultValue: 'Starting now' })
              : startsInLabel
                ? t(
                    'meetingHeroCard.startsIn',
                    { time: startsInLabel },
                    { defaultValue: 'Starts in {{time}}' },
                  )
                : startsAtLabel}
          </span>
        </div>
        <h2 className={cm.cn('text-5xl font-extrabold tracking-tight leading-[1.05]')}>{title}</h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-white/80')}>{startsAtLabel}</p>
      </div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 6 }),
          'relative z-10 flex-wrap',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 4 })}>
          <div className={'flex -space-x-3'}>
            {visibleAttendees.map((a) => (
              <div
                key={a.id}
                className={
                  'w-10 h-10 rounded-full border-2 border-surface/40 bg-surface/20 backdrop-blur-md flex items-center justify-center text-sm font-bold text-white'
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
                  'w-10 h-10 rounded-full border-2 border-surface/40 bg-surface/20 backdrop-blur-md flex items-center justify-center text-xs font-bold text-white'
                }
              >
                +{overflow}
              </div>
            )}
          </div>
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-primary/90')}
          >
            {t(
              'meetingHeroCard.attendees',
              { count: attendees.length },
              { defaultValue: '{{count}} attendees' },
            )}
          </span>
        </div>
        <div className={cm.flex({ align: 'center', gap: 3 })}>
          <button
            type="button"
            onClick={onDetails}
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'bg-surface/15 backdrop-blur-md text-on-primary hover:bg-surface/25 transition-colors',
            )}
          >
            {t('meetingHeroCard.detailsCta', {}, { defaultValue: 'View details' })}
          </button>
          <button
            type="button"
            onClick={onJoin}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 6),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'bg-surface text-primary hover:bg-surface/90 transition-all shadow-lg shadow-black/10',
            )}
          >
            <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>videocam</span>
            {t('meetingHeroCard.joinCta', {}, { defaultValue: 'Join meeting' })}
          </button>
        </div>
      </div>
      <div
        className={
          'absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-surface/15 blur-3xl pointer-events-none'
        }
      />
      <div
        className={
          'absolute right-16 top-8 w-24 h-24 rounded-full bg-secondary/40 blur-2xl pointer-events-none'
        }
      />
      <div
        className={
          'absolute -left-12 -top-12 w-40 h-40 rounded-full bg-surface/10 blur-3xl pointer-events-none'
        }
      />
    </div>
  )
}
