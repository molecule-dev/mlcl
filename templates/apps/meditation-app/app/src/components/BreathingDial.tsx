import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface BreathingDialProps {
  /** Current phase label ("Inhale", "Hold", "Exhale"). Translated upstream. */
  phaseLabel: string
  /** Seconds remaining in the current phase. */
  secondsRemaining: number
  /** Optional ratio 0..1 driving the dial fill. */
  ratio?: number
  /** Diameter in CSS pixels. Default 280. */
  size?: number
}

/**
 * Signature breathing dial — concentric calm rings + inhale/hold/exhale
 * label inside.
 *
 * Bespoke to Stillpoint (no direct sibling) — borrows the SVG concentric-
 * ring decoration from the calorie-counter NoshAuthShell brand panel and
 * the centered count layout from CalorieRingCard. Shown on SessionPlayer
 * and as a decorative element on Landing's "Try a 1-minute breath".
 */
export function BreathingDial({
  phaseLabel,
  secondsRemaining,
  ratio = 0.5,
  size = 280,
}: BreathingDialProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const circumference = 2 * Math.PI * 40
  const offset = circumference * (1 - Math.max(0, Math.min(1, ratio)))

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        'relative',
      )}
      style={{ width: size, height: size }}
    >
      <div
        className={cm.cn(
          'absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-2xl',
        )}
        aria-hidden="true"
      />
      <svg
        className={cm.cn('w-full h-full -rotate-90 relative')}
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        {[26, 33, 40].map((r, i) => (
          <circle
            key={r}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.6"
            strokeOpacity={0.15 + i * 0.1}
            className={cm.cn('text-primary')}
          />
        ))}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cm.cn(
            'text-primary stroke-current transition-[stroke-dashoffset] duration-700 ease-in-out',
          )}
        />
      </svg>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          'absolute inset-0 text-center',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-[0.3em] text-primary',
          )}
        >
          {phaseLabel}
        </span>
        <span
          className={cm.cn('text-7xl font-extralight text-on-surface tabular-nums leading-none')}
        >
          {secondsRemaining}
        </span>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.sp('mt', 2),
            'tracking-widest text-on-surface-variant',
          )}
        >
          {t('breathingDial.seconds', {}, { defaultValue: 'seconds' })}
        </span>
      </div>
    </div>
  )
}
