/**
 * Gradient hero card — the masthead used on Landing, CategoriesList, and
 * UserProfile. Indigo-to-amber gradient with frosted-glass stat pills, a
 * decorative blurred orb, and an inline "spark" SVG that hints at a thread
 * pulse. Headline uses the 6xl extrabold tracking-tighter pattern.
 *
 * Translated from personal-finance's NetWorthCard / AccountHeaderCard
 * gradient hero treatment.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ForumHeroStat {
  labelKey: string
  defaultLabel: string
  value: string
  hint?: string
  hintKey?: string
  defaultHint?: string
}

interface ForumHeroCardProps {
  eyebrow: string
  eyebrowKey?: string
  defaultEyebrow?: string
  title: string
  titleKey?: string
  defaultTitle?: string
  subtitle: string
  subtitleKey?: string
  defaultSubtitle?: string
  primaryCta?: { label: string; labelKey?: string; defaultLabel?: string; to: string }
  secondaryCta?: { label: string; labelKey?: string; defaultLabel?: string; to: string }
  stats?: ForumHeroStat[]
  pulse?: number[]
  variant?: 'on-light' | 'on-dark'
}

const SPARK_POINTS = (values: number[]) => {
  if (values.length === 0) return ''
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = Math.max(max - min, 1)
  return values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * 100
      const y = 100 - ((v - min) / span) * 80 - 10
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

export function ForumHeroCard({
  eyebrow,
  eyebrowKey,
  defaultEyebrow,
  title,
  titleKey,
  defaultTitle,
  subtitle,
  subtitleKey,
  defaultSubtitle,
  primaryCta,
  secondaryCta,
  stats = [],
  pulse = [12, 18, 14, 24, 31, 22, 28, 36, 30, 42, 38, 48, 44, 52],
}: ForumHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const resolvedTitle = titleKey ? t(titleKey, {}, { defaultValue: defaultTitle ?? title }) : title
  const resolvedEyebrow = eyebrowKey
    ? t(eyebrowKey, {}, { defaultValue: defaultEyebrow ?? eyebrow })
    : eyebrow
  const resolvedSubtitle = subtitleKey
    ? t(subtitleKey, {}, { defaultValue: defaultSubtitle ?? subtitle })
    : subtitle
  const points = SPARK_POINTS(pulse)
  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'relative overflow-hidden text-white rounded-[2rem] min-h-[340px] bg-gradient-to-br from-primary via-primary-dark to-[var(--color-hero-gradient-end)] shadow-[0_24px_60px_-20px_var(--color-shadow-hero)]',
      )}
    >
      <div
        aria-hidden
        className={cm.cn(
          cm.roundedFull,
          cm.w(64),
          cm.h(64),
          'absolute -right-20 -top-20 bg-secondary/30 blur-3xl',
        )}
      />
      <div
        aria-hidden
        className={cm.cn(
          cm.roundedFull,
          cm.w(64),
          cm.h(64),
          'absolute -left-24 -bottom-24 bg-surface/10 blur-3xl',
        )}
      />
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className={cm.cn('absolute inset-x-0 bottom-0 h-32 w-full opacity-30')}
      >
        <defs>
          <linearGradient id="forumHeroPulse" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke="rgba(255,255,255,0.95)"
          strokeWidth="0.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polygon points={`0,100 ${points} 100,100`} fill="url(#forumHeroPulse)" stroke="none" />
      </svg>

      <div className={cm.cn('relative z-10', cm.stack(4))}>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'self-start text-[10px] uppercase tracking-[0.3em] bg-surface/20 backdrop-blur-md',
          )}
        >
          {resolvedEyebrow}
        </span>
        <h1
          className={cm.cn(
            'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[0.95]',
          )}
        >
          {resolvedTitle}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), cm.maxW('xl'), 'text-white/85 leading-relaxed')}>
          {resolvedSubtitle}
        </p>
      </div>

      <div className={cm.cn('relative z-10', cm.stack(6), cm.sp('mt', 8))}>
        {stats.length > 0 && (
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'lg' }), 'items-stretch')}>
            {stats.map((s) => (
              <div
                key={s.labelKey}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 4),
                  'rounded-2xl bg-surface/15 backdrop-blur-md border border-surface/20 min-w-[160px]',
                )}
              >
                <p
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-[0.25em] text-white/75',
                  )}
                >
                  {t(s.labelKey, {}, { defaultValue: s.defaultLabel })}
                </p>
                <p className={cm.cn('text-3xl font-extrabold tabular-nums tracking-tight')}>
                  {s.value}
                </p>
                {(s.hintKey || s.hint) && (
                  <p className={cm.cn(cm.textSize('xs'), 'text-white/70 mt-1')}>
                    {s.hintKey
                      ? t(s.hintKey, {}, { defaultValue: s.defaultHint ?? s.hint ?? '' })
                      : s.hint}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {(primaryCta || secondaryCta) && (
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
            {primaryCta && (
              <Link
                to={primaryCta.to}
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'inline-flex items-center gap-2 bg-surface text-primary hover:bg-surface/90 transition-colors shadow-lg shadow-primary/20',
                )}
              >
                {primaryCta.labelKey
                  ? t(
                      primaryCta.labelKey,
                      {},
                      { defaultValue: primaryCta.defaultLabel ?? primaryCta.label },
                    )
                  : primaryCta.label}
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden>
                  arrow_forward
                </span>
              </Link>
            )}
            {secondaryCta && (
              <Link
                to={secondaryCta.to}
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'inline-flex items-center gap-2 bg-surface/10 hover:bg-surface/20 text-white border border-surface/30 backdrop-blur-md transition-colors',
                )}
              >
                {secondaryCta.labelKey
                  ? t(
                      secondaryCta.labelKey,
                      {},
                      { defaultValue: secondaryCta.defaultLabel ?? secondaryCta.label },
                    )
                  : secondaryCta.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default ForumHeroCard
