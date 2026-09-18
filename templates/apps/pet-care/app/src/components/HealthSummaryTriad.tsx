import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Triad of editorial KPI cards (Pets / Bookings / Alerts) — left border in
 * pet-status colour, uppercase 10px tracking-widest label, 4xl extrabold
 * value, hover lift, click-through to the relevant detail page.
 *
 * Translated from health-records' HealthSummaryTriad.tsx — same 3-up grid
 * + icon chip + tracking-widest label + extrabold value pattern, recoloured
 * to Nuzzle's teal-cyan-emerald palette and re-keyed to pet-care metrics
 * (pets in care, upcoming bookings, refills/alerts due).
 */
export interface HealthSummaryTriadProps {
  petsCount: number
  upcomingBookingsCount: number
  alertsCount: number
  refillsDueCount: number
}

type Accent = 'healthy' | 'attention' | 'critical'

const ACCENT_BORDER: Record<Accent, string> = {
  healthy: 'var(--color-pet-healthy)',
  attention: 'var(--color-pet-attention)',
  critical: 'var(--color-pet-critical)',
}

export function HealthSummaryTriad({
  petsCount,
  upcomingBookingsCount,
  alertsCount,
  refillsDueCount,
}: HealthSummaryTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
      <Card
        icon="cruelty_free"
        accent="healthy"
        eyebrow={t('healthSummaryTriad.pets.eyebrow', {}, { defaultValue: 'Pets in your care' })}
        value={petsCount.toString()}
        unit={t('healthSummaryTriad.pets.unit', {}, { defaultValue: 'profiles' })}
        meta={t('healthSummaryTriad.pets.meta', {}, { defaultValue: 'Open pet roster →' })}
        link="/pets"
      />
      <Card
        icon="event_available"
        accent={upcomingBookingsCount > 0 ? 'attention' : 'healthy'}
        eyebrow={t(
          'healthSummaryTriad.bookings.eyebrow',
          {},
          { defaultValue: 'Upcoming bookings' },
        )}
        value={upcomingBookingsCount.toString()}
        unit={t('healthSummaryTriad.bookings.unit', {}, { defaultValue: 'this week' })}
        meta={t('healthSummaryTriad.bookings.meta', {}, { defaultValue: 'View calendar →' })}
        link="/bookings"
      />
      <Card
        icon="medication"
        accent={alertsCount + refillsDueCount > 0 ? 'critical' : 'healthy'}
        eyebrow={t('healthSummaryTriad.alerts.eyebrow', {}, { defaultValue: 'Health alerts' })}
        value={t(
          'healthSummaryTriad.alerts.value',
          { alerts: alertsCount, refills: refillsDueCount },
          { defaultValue: '{{alerts}}/{{refills}}' },
        )}
        unit={t('healthSummaryTriad.alerts.unit', {}, { defaultValue: 'flags · refills' })}
        meta={t('healthSummaryTriad.alerts.meta', {}, { defaultValue: 'Review alerts →' })}
        link="/notifications"
      />
    </section>
  )
}

interface CardProps {
  icon: string
  accent: Accent
  eyebrow: string
  value: string
  unit: string
  meta: string
  link?: string
}

function Card({ icon, accent, eyebrow, value, unit, meta, link }: CardProps) {
  const cm = getClassMap()
  const inner = (
    <article
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-lowest hover:-translate-y-0.5 hover:shadow-lg transition-all group h-full',
      )}
      style={{ borderLeft: `4px solid ${ACCENT_BORDER[accent]}` }}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 6))}>
        <div
          className={cm.cn(
            cm.sp('p', 3),
            'bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
          )}
          style={{ color: ACCENT_BORDER[accent] }}
        >
          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
            {icon}
          </span>
        </div>
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {eyebrow}
        </span>
      </div>
      <p className={cm.cn('text-4xl font-extrabold tracking-tight tabular-nums')}>
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
    <Link to={link} className={cm.cn('block')}>
      {inner}
    </Link>
  ) : (
    inner
  )
}

export default HealthSummaryTriad
