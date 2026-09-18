import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Triad of editorial KPI cards (Conditions / Medications / Recent Labs)
 * — left border in clinical-status colour, uppercase 10px tracking-widest
 * label, 3xl extrabold value, hover lift, click-through to the
 * relevant detail page.
 *
 * Translated from medication-reminder's AdherenceTriad.tsx — same 3-up
 * grid + icon chip + tracking-widest label + extrabold value pattern,
 * recoloured to Meridian's clinical palette.
 */
export interface HealthSummaryTriadProps {
  conditionsCount: number
  medicationsCount: number
  labsAbnormal: number
  labsTotal: number
}

type Accent = 'normal' | 'caution' | 'abnormal'

const ACCENT_BORDER: Record<Accent, string> = {
  normal: 'var(--color-clinical-normal)',
  caution: 'var(--color-clinical-caution)',
  abnormal: 'var(--color-clinical-abnormal)',
}

export function HealthSummaryTriad({
  conditionsCount,
  medicationsCount,
  labsAbnormal,
  labsTotal,
}: HealthSummaryTriadProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
      <Card
        icon="medical_information"
        accent={conditionsCount > 0 ? 'caution' : 'normal'}
        eyebrow={t(
          'healthSummaryTriad.conditions.eyebrow',
          {},
          { defaultValue: 'Active conditions' },
        )}
        value={conditionsCount.toString()}
        unit={t('healthSummaryTriad.conditions.unit', {}, { defaultValue: 'on file' })}
        meta={t('healthSummaryTriad.conditions.meta', {}, { defaultValue: 'View conditions →' })}
        link="/records?type=condition"
      />
      <Card
        icon="medication"
        accent={medicationsCount > 0 ? 'normal' : 'caution'}
        eyebrow={t('healthSummaryTriad.medications.eyebrow', {}, { defaultValue: 'Medications' })}
        value={medicationsCount.toString()}
        unit={t('healthSummaryTriad.medications.unit', {}, { defaultValue: 'currently active' })}
        meta={t(
          'healthSummaryTriad.medications.meta',
          {},
          { defaultValue: 'Manage medications →' },
        )}
        link="/medications"
      />
      <Card
        icon="science"
        accent={labsAbnormal > 0 ? 'abnormal' : 'normal'}
        eyebrow={t('healthSummaryTriad.labs.eyebrow', {}, { defaultValue: 'Recent labs' })}
        value={t(
          'healthSummaryTriad.labs.value',
          { abnormal: labsAbnormal, total: labsTotal },
          { defaultValue: '{{abnormal}}/{{total}}' },
        )}
        unit={t('healthSummaryTriad.labs.unit', {}, { defaultValue: 'flagged' })}
        meta={t('healthSummaryTriad.labs.meta', {}, { defaultValue: 'See lab results →' })}
        link="/labs"
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
          {eyebrow}
        </span>
      </div>
      <p
        className={cm.cn('text-4xl font-extrabold tracking-tight tabular-nums')}
        style={{ fontFamily: 'var(--mol-font-mono)' }}
      >
        {value}
        <span
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.sp('ml', 2),
            'text-on-surface-variant',
          )}
          style={{ fontFamily: 'inherit' }}
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
