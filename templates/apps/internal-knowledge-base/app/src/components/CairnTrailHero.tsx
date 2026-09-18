import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card for Home and Landing — teal-to-cyan
 * gradient with blurred orbs, frosted-glass stat tiles for the
 * day's authoring activity, and an inline SVG sparkline of weekly
 * article reads.
 *
 * Translated from document-collaboration/QuillonStudioHero.tsx and
 * personal-finance/NetWorthCard.tsx — adapted to Cairn's deep teal
 * (#0f766e) + warm amber (#d97706) trail-marker palette.
 */
export interface CairnTrailHeroProps {
  /** Articles you've published or edited today. */
  articlesUpdatedToday: number
  /**
   * Distinct readers on your articles in the last 24h. The app does not
   * track readership, so authenticated surfaces omit this and the tile is
   * hidden; the marketing Landing hero passes an illustrative value.
   */
  readersToday?: number
  /** Drafts in flight. */
  draftsInFlight: number
  /**
   * Twelve points for the sparkline (e.g. reads per day). When omitted, an
   * illustrative curve renders only alongside `readersToday` (marketing
   * surfaces); data-driven surfaces that omit both show no sparkline.
   */
  trend?: number[]
  /** Optional eyebrow line override. */
  epigraph?: string
}

const DEFAULT_TREND = [120, 150, 180, 140, 200, 240, 220, 280, 320, 290, 360, 410]

function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
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

export function CairnTrailHero({
  articlesUpdatedToday,
  readersToday,
  draftsInFlight,
  trend,
  epigraph,
}: CairnTrailHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const sparkline = trend ?? (readersToday === undefined ? [] : DEFAULT_TREND)

  const resolvedEpigraph =
    epigraph ??
    t(
      'cairnTrailHero.epigraph',
      {},
      { defaultValue: 'Stack one stone today. Tomorrow, the trail is clearer.' },
    )

  return (
    <section
      className={cm.cn(
        cm.sp('p', 8),
        'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[var(--mol-color-primary)] via-[var(--mol-color-primary-hover)] to-[#0d9488] text-white shadow-xl',
      )}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-surface/15 blur-3xl',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'pointer-events-none absolute -left-16 -bottom-24 h-72 w-72 rounded-full bg-[var(--mol-color-secondary)]/30 blur-3xl',
        )}
      />

      <div
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'start', gap: 'md' }),
          'relative z-10',
        )}
      >
        <div className={cm.cn('min-w-0 flex-1')}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-white/70',
            )}
          >
            {t('cairnTrailHero.label', {}, { defaultValue: 'Today on the trail' })}
          </p>
          <p
            className={cm.cn(cm.sp('mt', 3), 'text-3xl italic leading-snug text-white md:text-4xl')}
            style={{ fontFamily: 'Georgia, "Iowan Old Style", serif' }}
          >
            “{resolvedEpigraph}”
          </p>
          <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-white/80')}>
            {t(
              'cairnTrailHero.subtitle',
              {},
              { defaultValue: 'Recent edits, reads, and drafts your team is still picking up.' },
            )}
          </p>
        </div>

        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            'h-20 w-20 shrink-0 rounded-full bg-surface/15 backdrop-blur-md ring-1 ring-white/25',
          )}
          aria-hidden="true"
        >
          <span
            className={cm.cn('material-symbols-outlined text-white')}
            style={{ fontSize: '2.25rem' }}
          >
            menu_book
          </span>
        </div>
      </div>

      <div
        className={cm.cn(
          cm.sp('mt', 6),
          cm.grid({ cols: readersToday === undefined ? 2 : 3, gap: 'md' }),
          'relative z-10',
        )}
      >
        <HeroStat
          label={t('cairnTrailHero.updated', {}, { defaultValue: 'Articles updated' })}
          value={String(articlesUpdatedToday)}
        />
        {readersToday === undefined ? null : (
          <HeroStat
            label={t('cairnTrailHero.readers', {}, { defaultValue: 'Readers today' })}
            value={fmtNumber(readersToday)}
          />
        )}
        <HeroStat
          label={t('cairnTrailHero.drafts', {}, { defaultValue: 'Drafts in flight' })}
          value={String(draftsInFlight)}
        />
      </div>

      {sparkline.length > 1 ? (
        <div className={cm.cn(cm.sp('mt', 6), 'relative z-10')}>
          <svg
            viewBox="0 0 320 56"
            preserveAspectRatio="none"
            className={cm.cn('h-14 w-full pointer-events-none')}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="cairnTrailSpark" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={buildSparkArea(sparkline)} fill="url(#cairnTrailSpark)" />
            <path
              d={buildSparkPath(sparkline)}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      ) : null}
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
        'rounded-2xl bg-surface/15 backdrop-blur-md ring-1 ring-white/20',
      )}
    >
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('extrabold'),
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
