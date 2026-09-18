import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export interface CreditsHeroCardProps {
  /** Remaining generation credits. */
  credits: number
  /** Total credits in the current plan (used to compute the meter). */
  total: number
  /** Plan name shown in the eyebrow. */
  plan: string
  /**
   * Display-formatted date string when credits replenish. `null` for
   * one-shot tiers (free/starter has no recurring grant) — the line is
   * hidden in that case rather than printed as "Plan renews on null".
   */
  renewsOn: string | null
}

/**
 * Headline card for the Dashboard — gradient surface with the active credits
 * count, plan badge, sparkline-style meter and an upgrade CTA. Mirrors the
 * Net-Worth hero shape from the polished sibling but speaks the Reverie
 * dreamscape language.
 */
export function CreditsHeroCard({ credits, total, plan, renewsOn }: CreditsHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pct = Math.max(0, Math.min(100, Math.round((credits / Math.max(1, total)) * 100)))

  return (
    <article
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between', gap: 'lg' }),
        cm.sp('p', 8),
        cm.minH('full'),
        'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary to-secondary text-white shadow-xl shadow-primary/30',
      )}
    >
      <div
        className={cm.cn(
          'absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-surface/10 blur-3xl pointer-events-none',
        )}
      />
      <div
        className={cm.cn(
          'absolute right-10 top-10 w-20 h-20 rounded-full bg-surface/20 blur-xl pointer-events-none',
        )}
      />

      <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-white/70',
          )}
        >
          {t('credits.eyebrow', { plan }, { defaultValue: '{{plan}} plan' })}
        </span>
        <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
          <span className={cm.cn(cm.fontWeight('bold'), 'text-6xl tracking-tighter font-mono')}>
            {credits.toLocaleString()}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'rounded-full bg-surface/20 backdrop-blur-md text-white',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              token
            </span>
            {t('credits.units', {}, { defaultValue: 'credits left' })}
          </span>
        </div>
        {renewsOn ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-white/80')}>
            {t(
              'credits.renewsCopy',
              { date: renewsOn },
              { defaultValue: 'Plan renews on {{date}}' },
            )}
          </p>
        ) : null}
      </div>

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'relative z-10')}>
        <div
          className={cm.cn(
            cm.flex({ justify: 'between' }),
            cm.textSize('xs'),
            'text-white/80 font-mono',
          )}
        >
          <span>{t('credits.usage', { pct }, { defaultValue: '{{pct}}% remaining' })}</span>
          <span>
            {credits.toLocaleString()} / {total.toLocaleString()}
          </span>
        </div>
        <div className={cm.cn('h-2 w-full rounded-full bg-surface/15 overflow-hidden')}>
          <div
            className={cm.cn(
              'h-full rounded-full bg-surface shadow-[0_0_20px_rgba(255,255,255,0.6)]',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <Link
          to="/settings"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-full bg-surface text-primary hover:bg-surface/90 transition-colors',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            bolt
          </span>
          {t('credits.upgrade', {}, { defaultValue: 'Upgrade plan' })}
        </Link>
        <span
          className={cm.cn(cm.textSize('xs'), 'text-white/70 font-mono uppercase tracking-widest')}
        >
          {t(
            'credits.trail',
            { plan, appName: APP_NAME },
            { defaultValue: '{{appName}} · {{plan}} tier' },
          )}
        </span>
      </div>
    </article>
  )
}
