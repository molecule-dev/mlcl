import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TodaySessionHeroCardProps {
  /** Session id used to deep-link into the player. */
  sessionId: string
  /** Translated eyebrow ("Today's session", "Recommended for tonight"). */
  eyebrow: string
  /** Session headline (e.g. "Letting Go of Tension"). */
  title: string
  /** Instructor / teacher name. */
  instructor: string
  /** Duration in minutes. */
  durationMinutes: number
  /** Category label ("Sleep", "Focus", …). */
  category: string
}

/**
 * Brand hero — gradient indigo card promoting today's recommended session.
 *
 * Translated from personal-finance/NetWorthCard.tsx — same anatomy
 * (gradient-to-br + absolute decorative orbs + sparkline-equivalent SVG
 * concentric rings), retuned to Stillpoint's twilight palette, with a
 * play-pill CTA and a lotus-emoji accent in place of the trend pill.
 */
export function TodaySessionHeroCard({
  sessionId,
  eyebrow,
  title,
  instructor,
  durationMinutes,
  category,
}: TodaySessionHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[340px] lg:col-span-8 bg-gradient-to-br from-[var(--color-hero-from)] via-primary to-[var(--color-cat-mindfulness)] rounded-[2rem] text-white relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('mb', 3),
            'uppercase tracking-widest text-white/70',
          )}
        >
          {eyebrow}
        </h2>
        <p
          className={cm.cn(
            'text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05] mb-4 max-w-xl',
          )}
        >
          {title}
        </p>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/15 backdrop-blur-md uppercase tracking-widest',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              schedule
            </span>
            {t(
              'common.minutesMin',
              { minutes: durationMinutes },
              { defaultValue: '{{minutes}} min' },
            )}
          </span>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/15 backdrop-blur-md uppercase tracking-widest',
            )}
          >
            {category}
          </span>
          {instructor ? (
            <span className={cm.cn(cm.textSize('sm'), 'text-white/85 font-medium')}>
              {t(
                'todaySessionHeroCard.with',
                { name: instructor },
                { defaultValue: 'with {{name}}' },
              )}
            </span>
          ) : null}
        </div>
      </div>

      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'relative z-10 mt-8 flex-wrap')}
      >
        <Link
          to={`/sessions/${sessionId}`}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'rounded-full bg-surface text-primary hover:bg-accent hover:text-on-accent transition-colors shadow-lg',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-2xl')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            play_circle
          </span>
          {t('todaySessionHeroCard.begin', {}, { defaultValue: 'Begin session' })}
        </Link>
        <Link
          to="/library"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-full border border-surface/30 text-white hover:bg-surface/10 transition-colors',
          )}
        >
          {t('todaySessionHeroCard.browse', {}, { defaultValue: 'Browse library' })}
        </Link>
      </div>

      <svg
        aria-hidden="true"
        className={cm.cn('absolute -right-24 -bottom-24 w-[420px] h-[420px] opacity-30')}
        viewBox="0 0 100 100"
      >
        {[14, 22, 30, 38, 46].map((r) => (
          <circle
            key={r}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="white"
            strokeWidth="0.6"
            strokeOpacity={0.65 - r / 100}
          />
        ))}
      </svg>
      <div
        className={cm.cn(
          'absolute -right-32 -bottom-32 w-80 h-80 bg-accent/30 rounded-full blur-3xl',
        )}
      />
      <div
        className={cm.cn('absolute -top-20 -left-10 w-72 h-72 bg-surface/10 rounded-full blur-3xl')}
      />
    </div>
  )
}
