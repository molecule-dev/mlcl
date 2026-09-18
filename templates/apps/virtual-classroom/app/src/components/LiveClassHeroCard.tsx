import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card on the Dashboard — promotes the next or currently
 * live class with a "Join now" CTA. Frosted-glass live-pill, decorative
 * blurred orbs, embedded participant avatars.
 *
 * Translated from personal-finance/NetWorthCard.tsx (gradient hero shape)
 * + lms/WelcomeBanner.tsx (decorative material symbol orb).
 */
export interface LiveClassHeroCardProps {
  classId?: string
  courseTitle?: string
  classTitle?: string
  startsInMinutes?: number
  isLive?: boolean
  participantCount?: number
  instructor?: string
}

export function LiveClassHeroCard({
  classId = 'demo-room-1',
  courseTitle,
  classTitle,
  startsInMinutes = 0,
  isLive = true,
  participantCount = 24,
  instructor,
}: LiveClassHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const course =
    courseTitle ?? t('liveClassHeroCard.course', {}, { defaultValue: 'Calculus II — MTH 202' })
  const klass =
    classTitle ?? t('liveClassHeroCard.title', {}, { defaultValue: 'Lecture 14 — Vector fields' })
  const teacher =
    instructor ?? t('liveClassHeroCard.instructor', {}, { defaultValue: 'Prof. Maya Okafor' })

  return (
    <section
      className={cm.cn(
        cm.sp('p', 10),
        'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary-dark to-tertiary text-on-primary shadow-xl',
      )}
      data-mol-id="live-class-hero"
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -right-20 -top-24 h-72 w-72 rounded-full bg-secondary/40 blur-3xl',
        )}
      ></div>
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -left-16 -bottom-20 h-72 w-72 rounded-full bg-surface/15 blur-3xl',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'start', gap: 6 }),
          'relative z-10 flex-wrap',
        )}
      >
        <div className={cm.cn(cm.maxW('xl'))}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.sp('mb', 3))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 1 }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                'rounded-full bg-surface/20 backdrop-blur-md text-[10px] uppercase tracking-widest',
              )}
            >
              <span
                className={cm.cn(
                  'h-2 w-2 rounded-full',
                  isLive ? 'bg-red-400 animate-pulse' : 'bg-surface/60',
                )}
                aria-hidden="true"
              ></span>
              {isLive
                ? t('liveClassHeroCard.live', {}, { defaultValue: 'Live now' })
                : t('status.upNext', {}, { defaultValue: 'Up next' })}
            </span>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                'rounded-full bg-surface/15 backdrop-blur-md',
              )}
            >
              {course}
            </span>
          </div>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('mb', 4),
              'text-4xl md:text-5xl tracking-tight leading-[1.05]',
            )}
          >
            {klass}
          </h2>
          <p className={cm.cn(cm.textSize('base'), cm.sp('mb', 6), 'opacity-90 leading-relaxed')}>
            {isLive
              ? t(
                  'liveClassHeroCard.bodyLive',
                  { instructor: teacher, count: participantCount },
                  {
                    defaultValue:
                      '{{instructor}} just opened the room. {{count}} classmates are already inside — slide in before roll-call.',
                  },
                )
              : t(
                  'liveClassHeroCard.bodyUpcoming',
                  { instructor: teacher, minutes: startsInMinutes },
                  {
                    defaultValue:
                      '{{instructor}} is hosting in {{minutes}} minutes. Camera and mic check is open now.',
                  },
                )}
          </p>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), 'flex-wrap')}>
            <Link
              to={`/class/${classId}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.fontWeight('bold'),
                'bg-surface text-primary px-7 py-3 rounded-2xl text-sm shadow-lg hover:scale-[1.02] active:scale-[0.99] transition-transform',
              )}
              data-mol-id="cta-join-class"
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>video_call</span>
              {isLive
                ? t('liveClassHeroCard.joinNow', {}, { defaultValue: 'Join classroom' })
                : t('liveClassHeroCard.joinLobby', {}, { defaultValue: 'Open lobby' })}
            </Link>
            <Link
              to="/calendar"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-2xl border border-surface/30 bg-surface/10 backdrop-blur-md px-6 py-3 hover:bg-surface/20 transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>event</span>
              {t('liveClassHeroCard.viewSchedule', {}, { defaultValue: 'See full schedule' })}
            </Link>
          </div>
        </div>
        <div className={cm.cn(cm.stack(3), 'min-w-[220px] hidden lg:flex')}>
          <div
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-2xl bg-surface/15 backdrop-blur-md border border-surface/15',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.sp('mb', 3))}>
              <span className={cm.cn('material-symbols-outlined text-[18px] opacity-90')}>
                group
              </span>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest opacity-90',
                )}
              >
                {t('liveClassHeroCard.inRoom', {}, { defaultValue: 'In the room' })}
              </span>
            </div>
            <p
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'leading-none tracking-tight',
              )}
            >
              {participantCount}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center' }), cm.sp('mt', 3), '-space-x-2')}>
              {['Aiyana', 'Kenji', 'Priya', 'Liam'].map((name, i) => (
                <div
                  key={name}
                  className={cm.cn(
                    'h-8 w-8 rounded-full border-2 border-surface/70 flex items-center justify-center text-[10px] font-bold',
                    i === 0 && 'bg-secondary text-on-secondary',
                    i === 1 && 'bg-tertiary text-on-tertiary',
                    i === 2 && 'bg-primary-container text-on-primary-container',
                    i === 3 && 'bg-surface text-primary',
                  )}
                >
                  {name.slice(0, 2)}
                </div>
              ))}
              <span
                className={cm.cn(
                  'h-8 w-8 rounded-full border-2 border-surface/70 bg-surface/20 backdrop-blur-md flex items-center justify-center text-[10px] font-bold',
                )}
              >
                +{Math.max(0, participantCount - 4)}
              </span>
            </div>
          </div>
          <div
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-2xl bg-surface/15 backdrop-blur-md border border-surface/15',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.sp('mb', 2))}>
              <span className={cm.cn('material-symbols-outlined text-[18px] opacity-90')}>
                schedule
              </span>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest opacity-90',
                )}
              >
                {isLive
                  ? t('liveClassHeroCard.elapsed', {}, { defaultValue: 'Elapsed' })
                  : t('liveClassHeroCard.startsIn', {}, { defaultValue: 'Starts in' })}
              </span>
            </div>
            <p
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'leading-none tracking-tight tabular-nums',
              )}
            >
              {isLive
                ? t('liveClassHeroCard.elapsedValue', {}, { defaultValue: '12:08' })
                : t(
                    'common.minutesMin',
                    { minutes: startsInMinutes },
                    { defaultValue: '{{minutes}} min' },
                  )}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LiveClassHeroCard
