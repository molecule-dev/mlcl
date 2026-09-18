/**
 * Gradient hero card showing pipeline funnel — stages with tabular-num
 * counts and proportional bars in stage colors. Frosted-glass total pill,
 * decorative blurred orbs.
 *
 * Translated from personal-finance's NetWorthCard.tsx — same gradient hero
 * + decorative-orb anatomy, with bar list instead of sparkline.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface FunnelEntry {
  stage: string
  count: number
  color: string
}

interface PipelineFunnelHeroProps {
  title: string
  subtitle: string
  funnel: FunnelEntry[]
}

export function PipelineFunnelHero({ title, subtitle, funnel }: PipelineFunnelHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const total = funnel.reduce((acc, f) => acc + f.count, 0)
  const max = Math.max(...funnel.map((f) => f.count), 1)
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
            {subtitle}
          </p>
          <h2
            className={cm.cn(
              cm.sp('mt', 1),
              'text-2xl md:text-3xl font-extrabold tracking-tight text-on-primary',
            )}
          >
            {title}
          </h2>
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
            {t('pipelineFunnelHero.totalLabel', {}, { defaultValue: 'In motion' })}
          </span>
          <span
            className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight text-on-primary')}
          >
            {total}
          </span>
        </div>
      </header>
      <ul className={cm.cn(cm.sp('mt', 6), 'relative z-10 space-y-3')}>
        {funnel.map((f) => (
          <li key={f.stage}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                'text-sm',
                cm.sp('mb', 1),
              )}
            >
              <span className={cm.cn('font-semibold text-on-primary')}>{f.stage}</span>
              <span className={cm.cn('font-bold tabular-nums text-on-primary')}>{f.count}</span>
            </div>
            <div className={cm.cn('h-2.5 overflow-hidden rounded-full bg-surface/15')}>
              <div
                className={cm.cn('h-full rounded-full transition-all')}
                style={{
                  width: `${(f.count / max) * 100}%`,
                  backgroundColor: f.color,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
