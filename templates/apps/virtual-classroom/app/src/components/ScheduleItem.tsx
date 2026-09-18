import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Single calendar/agenda row — left-edge color accent for class colour,
 * time block, course/title, instructor + action chip.
 *
 * Translated from lms/DeadlineItem.tsx — same hover-list shape with a
 * left-rail tint indicating the breakout colour for a given course.
 */
export type ScheduleTone =
  'primary' | 'secondary' | 'success' | 'tertiary' | 'breakout-a' | 'breakout-b'

const TONE_BG: Record<ScheduleTone, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  success: 'bg-success',
  tertiary: 'bg-tertiary',
  'breakout-a': 'bg-violet-500',
  'breakout-b': 'bg-cyan-500',
}

const TONE_TEXT: Record<ScheduleTone, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary-dark',
  success: 'text-success',
  tertiary: 'text-tertiary',
  'breakout-a': 'text-violet-700',
  'breakout-b': 'text-cyan-700',
}

export interface ScheduleItemProps {
  id?: string
  title?: string
  course?: string
  instructor?: string
  startTime?: string
  endTime?: string
  location?: string
  tone?: ScheduleTone
  status?: 'live' | 'upcoming' | 'completed'
}

export function ScheduleItem({
  id = 'demo-class-1',
  title,
  course,
  instructor,
  startTime,
  endTime,
  location,
  tone = 'primary',
  status = 'upcoming',
}: ScheduleItemProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const heading = title ?? t('scheduleItem.title', {}, { defaultValue: 'Workshop — Sonnet form' })
  const courseName =
    course ?? t('scheduleItem.course', {}, { defaultValue: 'Creative Writing · ENG 220' })
  const teacher =
    instructor ?? t('scheduleItem.instructor', {}, { defaultValue: 'Dr. Yusuf Adelana' })
  const start = startTime ?? t('scheduleItem.startTime', {}, { defaultValue: '2:00 PM' })
  const end = endTime ?? t('scheduleItem.endTime', {}, { defaultValue: '3:30 PM' })
  const room =
    location ??
    t(
      'scheduleItem.location',
      { appName: APP_NAME },
      { defaultValue: '{{appName}} room · Lavender' },
    )

  const ctaLabel =
    status === 'live'
      ? t('scheduleItem.joinLive', {}, { defaultValue: 'Join now' })
      : status === 'completed'
        ? t('scheduleItem.viewRecording', {}, { defaultValue: 'Recording' })
        : t('scheduleItem.openRoom', {}, { defaultValue: 'Open room' })

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'stretch' }),
        'group bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all',
      )}
      data-mol-id={`schedule-item-${id}`}
    >
      <div className={cm.cn('w-1.5 shrink-0', TONE_BG[tone])} aria-hidden="true"></div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), cm.sp('p', 5), cm.flex1)}>
        <div className={cm.cn(cm.stack(0), 'min-w-[80px] shrink-0')}>
          <span
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'tabular-nums leading-none',
              TONE_TEXT[tone],
            )}
          >
            {start}
          </span>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
            {t('scheduleItem.until', { end }, { defaultValue: 'until {{end}}' })}
          </span>
        </div>
        <div className={cm.cn(cm.flex1, cm.stack(1), 'min-w-0')}>
          <h3
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'text-on-surface group-hover:text-primary transition-colors truncate',
            )}
          >
            {heading}
          </h3>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.textSize('xs'),
              'text-on-surface-variant',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')}>school</span>
            <span className={cm.cn('truncate')}>{courseName}</span>
            <span aria-hidden="true">·</span>
            <span className={cm.cn('truncate')}>{teacher}</span>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 1 }),
              cm.textSize('xs'),
              'text-on-surface-variant',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')}>place</span>
            <span className={cm.cn('truncate')}>{room}</span>
          </div>
        </div>
        <Link
          to={`/class/${id}`}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 1 }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            'rounded-full transition-colors shrink-0',
            status === 'live'
              ? 'bg-error text-on-error hover:bg-error/90'
              : status === 'completed'
                ? 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                : 'bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary',
          )}
        >
          {status === 'live' && (
            <span
              className={cm.cn('h-1.5 w-1.5 rounded-full bg-surface animate-pulse')}
              aria-hidden="true"
            ></span>
          )}
          {ctaLabel}
        </Link>
      </div>
    </div>
  )
}

export default ScheduleItem
