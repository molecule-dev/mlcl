import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type CategoryTone, getCategoryAccent } from '../lib/categoryTone.js'

export interface SessionCardItem {
  id: string
  title: string
  instructor: string
  durationMinutes: number
  category: CategoryTone
  /** Translated category label, e.g. "Sleep". */
  categoryLabel: string
  /** Optional one-line description (used as the sub-headline when present). */
  description?: string
}

interface SessionCardProps {
  session: SessionCardItem
}

/**
 * Editorial session tile — used on Library, Home recommendations, and
 * Search results.
 *
 * Translated from personal-finance's AccountCard.tsx (rounded-xl shadow-sm
 * card with a colored icon block + uppercase label + bold value), retuned
 * to Stillpoint's category-tinted hover treatment.
 */
export function SessionCard({ session }: SessionCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = getCategoryAccent(session.category)

  return (
    <Link
      to={`/sessions/${session.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between', gap: 'md' }),
        cm.sp('p', 5),
        'bg-surface-container-lowest rounded-2xl shadow-sm border border-outline/20 hover:-translate-y-0.5 hover:shadow-md transition-all group h-full',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-12 h-12 rounded-xl shadow-sm group-hover:scale-110 transition-transform',
          )}
          style={{ backgroundColor: accent.softBg, color: accent.fg }}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-2xl')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {accent.icon}
          </span>
        </div>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.sp('px', 3),
            cm.sp('py', 1),
            'text-[10px] uppercase tracking-widest rounded-full',
          )}
          style={{ backgroundColor: accent.softBg, color: accent.fg }}
        >
          {session.categoryLabel}
        </span>
      </div>

      <div>
        <h3
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-lg text-on-surface tracking-tight leading-snug',
          )}
        >
          {session.title}
        </h3>
        {session.description ? (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 2),
              'text-on-surface-variant leading-relaxed',
            )}
          >
            {session.description}
          </p>
        ) : null}
      </div>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          'pt-2 border-t border-outline/30',
        )}
      >
        <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant font-medium')}>
          {session.instructor
            ? t('sessionCard.with', { name: session.instructor }, { defaultValue: 'with {{name}}' })
            : null}
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'text-primary tabular-nums',
          )}
        >
          <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
            schedule
          </span>
          {t(
            'common.minutesMin',
            { minutes: session.durationMinutes },
            { defaultValue: '{{minutes}} min' },
          )}
        </span>
      </div>
    </Link>
  )
}
