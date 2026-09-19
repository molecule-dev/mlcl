import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Three summary cards — this year's finishes, pages read, average rating.
 * Each card has a colored icon chip, uppercase 10px label, and font-extrabold
 * value with hover-lift transition.
 *
 * Adapted from habit-tracker/HabitStatsTriad.tsx.
 */

interface ReadingStatsTriadProps {
  finishedThisYear: number
  pagesRead: number
  avgRating: number
  currentlyReading: number
}

interface StatProps {
  icon: string
  label: string
  value: string
  caption: string
  accentVar: string
  iconColor: string
}

function StatCard({ icon, label, value, caption, accentVar, iconColor }: StatProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 hover:-translate-y-0.5 transition-transform group',
      )}
      style={{ borderLeftColor: `var(${accentVar})` }}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <div
          className={cm.cn(
            cm.sp('p', 3),
            'bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
          )}
          style={{ color: `var(${iconColor})` }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {icon}
          </span>
        </div>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </span>
      </div>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          cm.sp('mb', 1),
          'text-on-surface-variant',
        )}
      >
        {caption}
      </p>
      <p className={cm.cn('text-4xl font-extrabold tracking-tight text-on-surface')}>{value}</p>
    </div>
  )
}

export function ReadingStatsTriad({
  finishedThisYear,
  pagesRead,
  avgRating,
  currentlyReading,
}: ReadingStatsTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
      <StatCard
        icon="auto_stories"
        accentVar="--mol-color-primary"
        iconColor="--mol-color-primary"
        label={t('readingStatsTriad.finishedLabel', {}, { defaultValue: 'This year' })}
        caption={t(
          'readingStatsTriad.finishedCaption',
          { count: currentlyReading },
          { defaultValue: '{{count}} currently on the nightstand' },
        )}
        value={t(
          'readingStatsTriad.finishedValue',
          { count: finishedThisYear },
          { defaultValue: '{{count}} books' },
        )}
      />
      <StatCard
        icon="menu_book"
        accentVar="--mol-color-secondary"
        iconColor="--mol-color-secondary"
        label={t('readingStatsTriad.pagesLabel', {}, { defaultValue: 'Pages read' })}
        caption={t('readingStatsTriad.pagesCaption', {}, { defaultValue: 'Across finished books' })}
        value={String(pagesRead)}
      />
      <StatCard
        icon="star"
        accentVar="--color-achievement"
        iconColor="--color-achievement"
        label={t('readingStatsTriad.ratingLabel', {}, { defaultValue: 'Avg rating' })}
        caption={t(
          'readingStatsTriad.ratingCaption',
          {},
          { defaultValue: 'Out of 5, rated books only' },
        )}
        value={avgRating > 0 ? avgRating.toFixed(1) : '—'}
      />
    </section>
  )
}
