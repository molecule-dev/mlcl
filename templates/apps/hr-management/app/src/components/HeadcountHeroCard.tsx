/**
 * Gradient hero card — total headcount in 6xl-extrabold, frosted-glass
 * change pill, decorative blurred orbs, and a department breakdown bar
 * list. Used as the dashboard primary hero and mirrored on the marketing
 * landing for visual continuity.
 *
 * Translated from applicant-tracking's PipelineFunnelHero.tsx — itself a
 * translation of personal-finance's NetWorthCard.tsx. Same gradient hero
 * + decorative-orb anatomy.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export interface DeptEntry {
  name: string
  count: number
  color: string
}

interface HeadcountHeroCardProps {
  total: number
  delta: number
  active: number
  onLeave: number
  departments: DeptEntry[]
  eyebrow?: string
  title?: string
}

export function HeadcountHeroCard({
  total,
  delta,
  active,
  onLeave,
  departments,
  eyebrow,
  title,
}: HeadcountHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const max = Math.max(...departments.map((d) => d.count), 1)
  return (
    <section
      className={cm.cn(
        cm.sp('p', 8),
        'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-container shadow-md shadow-primary/20',
      )}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-surface/10 blur-3xl',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -left-16 -top-20 h-64 w-64 rounded-full bg-secondary-fixed/20 blur-3xl',
        )}
      />

      <header
        className={cm.cn(
          'relative z-10',
          cm.flex({ align: 'start', justify: 'between', wrap: 'wrap', gap: 'md' }),
        )}
      >
        <div>
          <p
            className={cm.cn('text-[10px] font-black uppercase tracking-widest text-on-primary/70')}
          >
            {eyebrow ?? t('headcountHeroCard.eyebrow', {}, { defaultValue: 'Total headcount' })}
          </p>
          <h2
            className={cm.cn(
              cm.sp('mt', 1),
              'text-2xl md:text-3xl font-extrabold tracking-tight text-on-primary',
            )}
          >
            {title ??
              t(
                'headcountHeroCard.title',
                { appName: APP_NAME },
                { defaultValue: 'People at {{appName}}' },
              )}
          </h2>
          <p
            className={cm.cn(
              cm.sp('mt', 6),
              'text-6xl md:text-7xl font-extrabold tabular-nums tracking-tighter text-on-primary',
            )}
          >
            {total}
          </p>
        </div>

        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            'inline-flex items-baseline gap-2 rounded-full bg-surface/15 backdrop-blur-md border border-surface/10',
          )}
        >
          <span
            className={cm.cn('text-[10px] font-black uppercase tracking-widest text-on-primary/70')}
          >
            {t('headcountHeroCard.deltaLabel', {}, { defaultValue: '30 days' })}
          </span>
          <span
            className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight text-on-primary')}
          >
            {delta >= 0 ? `+${delta}` : `${delta}`}
          </span>
        </div>
      </header>

      <div
        className={cm.cn(
          cm.sp('mt', 6),
          'relative z-10 flex flex-wrap items-baseline gap-x-6 gap-y-2',
        )}
      >
        <span
          className={cm.cn('text-[10px] font-black uppercase tracking-widest text-on-primary/70')}
        >
          {t(
            'headcountHeroCard.activeLabel',
            { count: active },
            { defaultValue: '{{count}} active today' },
          )}
        </span>
        <span
          className={cm.cn('text-[10px] font-black uppercase tracking-widest text-on-primary/70')}
        >
          {t(
            'headcountHeroCard.onLeaveLabel',
            { count: onLeave },
            { defaultValue: '{{count}} on leave' },
          )}
        </span>
      </div>

      <ul className={cm.cn(cm.sp('mt', 6), 'relative z-10 space-y-3')}>
        {departments.map((d) => (
          <li key={d.name}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                'text-sm',
                cm.sp('mb', 1),
              )}
            >
              <span className={cm.cn('font-semibold text-on-primary')}>{d.name}</span>
              <span className={cm.cn('font-bold tabular-nums text-on-primary')}>{d.count}</span>
            </div>
            <div className={cm.cn('h-2.5 overflow-hidden rounded-full bg-surface/15')}>
              <div
                className={cm.cn('h-full rounded-full transition-all')}
                style={{
                  width: `${(d.count / max) * 100}%`,
                  backgroundColor: d.color,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
