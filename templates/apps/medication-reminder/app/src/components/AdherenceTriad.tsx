import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Triad of editorial KPI cards (Streak, Doses today, Refills due) — left
 * border accent in dose-status colour, uppercase 10px tracking-widest label,
 * 3xl extrabold value, hover lift, optional click-through.
 *
 * Translated from personal-finance's DashboardAccountOverview.tsx — same
 * 3-up grid, same icon chip + tracking-widest label + extrabold value
 * pattern, restyled with Capsiva's left-border accent and dose-status
 * palette.
 */
export interface AdherenceTriadProps {
  currentStreak: number
  longestStreak: number
  takenCount: number
  totalDoses: number
  refillsDueSoon: number
}

export function AdherenceTriad({
  currentStreak,
  longestStreak,
  takenCount,
  totalDoses,
  refillsDueSoon,
}: AdherenceTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
      <Card
        icon="local_fire_department"
        accent="taken"
        eyebrow={t('adherenceTriad.streak.eyebrow', {}, { defaultValue: 'Streak' })}
        value={t(
          'adherenceTriad.streak.value',
          { days: currentStreak },
          { defaultValue: '{{days}}' },
        )}
        unit={t('adherenceTriad.streak.unit', {}, { defaultValue: 'days' })}
        meta={t(
          'adherenceTriad.streak.meta',
          { days: longestStreak },
          { defaultValue: 'Longest: {{days}} days' },
        )}
      />
      <Card
        icon="medication"
        accent="upcoming"
        eyebrow={t('status.today', {}, { defaultValue: 'Today' })}
        value={t(
          'adherenceTriad.today.value',
          { taken: takenCount, total: totalDoses },
          { defaultValue: '{{taken}}/{{total}}' },
        )}
        unit={t('adherenceTriad.today.unit', {}, { defaultValue: 'doses taken' })}
        meta={t(
          'adherenceTriad.today.meta',
          { count: Math.max(0, totalDoses - takenCount) },
          { defaultValue: '{{count}} still ahead' },
        )}
      />
      <Card
        icon="inventory_2"
        accent={refillsDueSoon > 0 ? 'missed' : 'taken'}
        eyebrow={t('adherenceTriad.refills.eyebrow', {}, { defaultValue: 'Refills' })}
        value={t(
          'adherenceTriad.refills.value',
          { count: refillsDueSoon },
          { defaultValue: '{{count}}' },
        )}
        unit={t('adherenceTriad.refills.unit', {}, { defaultValue: 'due soon' })}
        meta={t('adherenceTriad.refills.meta', {}, { defaultValue: 'Manage refills →' })}
        link="/refills"
      />
    </section>
  )
}

interface CardProps {
  icon: string
  accent: 'taken' | 'upcoming' | 'missed'
  eyebrow: string
  value: string
  unit: string
  meta: string
  link?: string
}

const ACCENT_BORDER: Record<CardProps['accent'], string> = {
  taken: 'var(--color-dose-taken)',
  upcoming: 'var(--color-dose-upcoming)',
  missed: 'var(--color-dose-missed)',
}

function Card({ icon, accent, eyebrow, value, unit, meta, link }: CardProps) {
  const cm = getClassMap()
  const inner = (
    <article
      className={cm.cn(
        cm.sp('p', 6),
        cm.accentCard({ tone: 'custom' }),
        'rounded-2xl bg-surface-container-lowest hover:-translate-y-0.5 hover:shadow-lg transition-all group h-full',
      )}
      style={{ ['--mol-accent' as string]: ACCENT_BORDER[accent] }}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
        <div
          className={cm.cn(
            cm.sp('p', 3),
            'bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
          )}
          style={{ color: ACCENT_BORDER[accent] }}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {icon}
          </span>
        </div>
        <span className={cm.accentCardLabel({ tone: 'custom' })}>{eyebrow}</span>
      </div>
      <p className={cm.cn('text-4xl font-extrabold tracking-tight')}>
        {value}
        <span
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.sp('ml', 2),
            'text-on-surface-variant',
          )}
        >
          {unit}
        </span>
      </p>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.sp('mt', 2),
          cm.fontWeight('medium'),
          'text-on-surface-variant',
        )}
      >
        {meta}
      </p>
    </article>
  )
  return link ? (
    <Link to={link} className="block">
      {inner}
    </Link>
  ) : (
    inner
  )
}

export default AdherenceTriad
