import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card for the Dashboard / Landing — Charter-serif
 * "writing of the day" line, indigo-to-cyan gradient, blurred orbs,
 * frosted-glass stat tiles for word counts and active collaborators,
 * and an inline SVG sparkline of recent writing activity.
 *
 * Translated from contract-management/VellumPortfolioHero.tsx and
 * personal-finance/NetWorthCard.tsx — adapted to Quillon's editorial
 * voice (Charter for the eyebrow line, white-on-indigo).
 */
export interface QuillonStudioHeroProps {
  /** Words drafted in the active period. */
  wordsToday: number
  /** Active collaborator session count across the workspace. */
  activeCollaborators: number
  /** Documents touched today. */
  documentsToday: number
  /** Twelve points for the sparkline (e.g. words per day). */
  trend?: number[]
  /** Optional eyebrow line to override the default literary epigraph. */
  epigraph?: string
}

const DEFAULT_TREND = [320, 410, 280, 540, 480, 620, 380, 720, 540, 660, 800, 940]

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

export function QuillonStudioHero({
  wordsToday,
  activeCollaborators,
  documentsToday,
  trend = DEFAULT_TREND,
  epigraph,
}: QuillonStudioHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const resolvedEpigraph =
    epigraph ??
    t('quillonStudioHero.epigraph', {}, { defaultValue: 'A page a day keeps the silence away.' })

  return (
    <section
      className={cm.cn(
        cm.sp('p', 8),
        'relative overflow-hidden rounded-[2rem] text-white shadow-xl',
      )}
      style={{
        background:
          'linear-gradient(to bottom right, var(--color-brand-gradient-from), var(--color-brand-gradient-via), var(--color-brand-gradient-to))',
      }}
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
          'pointer-events-none absolute -left-16 -bottom-24 h-72 w-72 rounded-full blur-3xl',
        )}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-brand-gradient-to) 30%, transparent)',
        }}
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
            {t('quillonStudioHero.label', {}, { defaultValue: 'Today\u2019s draft' })}
          </p>
          <p
            className={cm.cn(cm.sp('mt', 3), 'text-3xl italic leading-snug text-white md:text-4xl')}
            style={{ fontFamily: 'Charter, Georgia, serif' }}
          >
            “{resolvedEpigraph}”
          </p>
          <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-white/80')}>
            {t(
              'quillonStudioHero.subtitle',
              {},
              { defaultValue: 'Pick up the manuscript, drop a comment, push a paragraph forward.' },
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
            edit_note
          </span>
        </div>
      </div>

      <div className={cm.cn(cm.sp('mt', 6), cm.grid({ cols: 3, gap: 'md' }), 'relative z-10')}>
        <HeroStat
          label={t('quillonStudioHero.words', {}, { defaultValue: 'Words today' })}
          value={fmtNumber(wordsToday)}
        />
        <HeroStat
          label={t('quillonStudioHero.docs', {}, { defaultValue: 'Documents touched' })}
          value={String(documentsToday)}
        />
        <HeroStat
          label={t('quillonStudioHero.collab', {}, { defaultValue: 'Collaborators' })}
          value={String(activeCollaborators)}
        />
      </div>

      <div className={cm.cn(cm.sp('mt', 6), 'relative z-10')}>
        <svg
          viewBox="0 0 320 56"
          preserveAspectRatio="none"
          className={cm.cn('h-14 w-full pointer-events-none')}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="quillonSparkGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={buildSparkArea(trend)} fill="url(#quillonSparkGradient)" />
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
