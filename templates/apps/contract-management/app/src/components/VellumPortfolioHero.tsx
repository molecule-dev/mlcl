import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card — total contract portfolio value in 6xl-extrabold,
 * frosted-glass status pill, decorative blurred orbs, gold seal motif,
 * and an inline SVG sparkline reflecting throughput history.
 *
 * Translated from personal-finance's NetWorthCard.tsx and Vellum's
 * brand identity (dark navy `#0f1d2f` + seal gold `#c49a2a`).
 */
export interface VellumPortfolioHeroProps {
  totalValueCents: number
  activeCount: number
  pendingCount: number
  expiringCount: number
  /** Twelve points for the sparkline (e.g. monthly signed counts). */
  trend?: number[]
}

const DEFAULT_TREND = [3, 4, 3, 5, 4, 6, 4, 8, 5, 6, 7, 9]

function fmtUsdCompact(cents: number): string {
  const abs = cents / 100
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(0)}K`
  return `$${abs.toFixed(0)}`
}

function buildSparkPath(values: number[], width = 320, height = 56): string {
  if (values.length < 2) return ''
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(max - min, 1)
  const stepX = width / (values.length - 1)
  return values
    .map((v, i) => {
      const x = i * stepX
      const y = height - ((v - min) / range) * (height - 6) - 3
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

function buildSparkArea(values: number[], width = 320, height = 56): string {
  const line = buildSparkPath(values, width, height)
  if (!line) return ''
  return `${line} L ${width} ${height} L 0 ${height} Z`
}

export function VellumPortfolioHero({
  totalValueCents,
  activeCount,
  pendingCount,
  expiringCount,
  trend = DEFAULT_TREND,
}: VellumPortfolioHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      className={cm.cn(
        cm.sp('p', 8),
        'relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-sidebar-bg via-[var(--mol-color-primary-dark)] to-[var(--mol-color-primary)] text-white shadow-xl',
      )}
    >
      <div
        aria-hidden="true"
        className={
          'pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[var(--color-status-pending)]/20 blur-3xl'
        }
      />
      <div
        aria-hidden="true"
        className={
          'pointer-events-none absolute -left-16 -bottom-24 h-72 w-72 rounded-full bg-surface/5 blur-3xl'
        }
      />

      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'start', gap: 'md' }),
          'relative z-10',
        )}
      >
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-white/70',
            )}
          >
            {t('vellumPortfolioHero.label', {}, { defaultValue: 'Portfolio value' })}
          </p>
          <p
            className={cm.cn(
              cm.sp('mt', 3),
              cm.fontWeight('extrabold'),
              'text-6xl tracking-tighter tabular-nums',
            )}
          >
            {fmtUsdCompact(totalValueCents)}
          </p>
          <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-white/70')}>
            {t(
              'vellumPortfolioHero.tagline',
              {},
              { defaultValue: 'Across active, pending, and renewing agreements.' },
            )}
          </p>
        </div>

        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            'h-20 w-20 shrink-0 rounded-full bg-surface/10 backdrop-blur-md ring-1 ring-white/20',
          )}
          aria-hidden="true"
        >
          <span
            className={'material-symbols-outlined text-[var(--color-status-pending)]'}
            style={{ fontSize: '2.25rem' }}
          >
            workspace_premium
          </span>
        </div>
      </div>

      <div className={cm.cn(cm.sp('mt', 6), cm.grid({ cols: 3, gap: 'md' }), 'relative z-10')}>
        <HeroStat
          label={t('status.active', {}, { defaultValue: 'Active' })}
          value={String(activeCount)}
        />
        <HeroStat
          label={t('status.pending', {}, { defaultValue: 'Pending' })}
          value={String(pendingCount)}
        />
        <HeroStat
          label={t('vellumPortfolioHero.expiring', {}, { defaultValue: 'Expiring 30d' })}
          value={String(expiringCount)}
        />
      </div>

      <div className={cm.cn(cm.sp('mt', 6), 'relative z-10')}>
        <svg
          viewBox="0 0 320 56"
          preserveAspectRatio="none"
          className={'h-14 w-full pointer-events-none'}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="vellumSparkGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--mol-color-secondary)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--mol-color-secondary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={buildSparkArea(trend)} fill="url(#vellumSparkGradient)" />
          <path
            d={buildSparkPath(trend)}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </section>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 3),
        'rounded-2xl bg-surface/10 backdrop-blur-md ring-1 ring-white/15',
      )}
    >
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-white/70',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(
          cm.sp('mt', 1),
          cm.textSize('2xl'),
          cm.fontWeight('extrabold'),
          'tabular-nums',
        )}
      >
        {value}
      </p>
    </div>
  )
}
