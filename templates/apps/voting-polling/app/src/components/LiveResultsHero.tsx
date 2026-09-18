/**
 * Live results gradient hero — cyan→primary-container gradient card showing
 * a poll's title, live participant count (frosted-glass pill with pulsing
 * dot), and a vertical stack of results bars. Each bar is 40px tall with an
 * 8px radius, label + tabular-nums vote count + percentage, and a leading
 * option highlight.
 *
 * Translated from applicant-tracking's PipelineFunnelHero (gradient hero
 * with frosted total pill, decorative orbs, bar list) — recoloured to the
 * cyan civic palette and tuned for poll results semantics from DESIGN.md
 * "Results Bar" + "Participant Counter".
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface LiveResultsOption {
  id: string
  label: string
  votes: number
  /** Override bar fill color for ranked / categorical contrast. */
  color?: string
}

interface LiveResultsHeroProps {
  title: string
  eyebrow: string
  /** Total ballots cast — drives the "live" pill on the right. */
  totalVotes: number
  /** "Live" / "Closed" / "Scheduled" — single-word state for the pill. */
  state?: 'live' | 'closed' | 'scheduled'
  options: LiveResultsOption[]
  /** Optional caption under the bars (e.g. "Quorum 64% met · closes in 2h"). */
  caption?: string
}

export function LiveResultsHero({
  title,
  eyebrow,
  totalVotes,
  state = 'live',
  options,
  caption,
}: LiveResultsHeroProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const max = Math.max(...options.map((o) => o.votes), 1)
  const total = Math.max(
    options.reduce((acc, o) => acc + o.votes, 0),
    1,
  )
  const leadingId = options.reduce<string | null>(
    (best, o) =>
      best === null || o.votes > (options.find((x) => x.id === best)?.votes ?? 0) ? o.id : best,
    null,
  )

  return (
    <section
      className={cm.cn(
        cm.sp('p', 8),
        'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-container shadow-md shadow-primary/20',
      )}
      data-mol-id="live-results-hero"
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-surface/10 blur-3xl pointer-events-none',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -left-16 -top-20 h-64 w-64 rounded-full bg-secondary-fixed/20 blur-3xl pointer-events-none',
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
            {eyebrow}
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
            'inline-flex items-center gap-2 rounded-full bg-surface/15 backdrop-blur-md border border-surface/10',
          )}
        >
          <span
            className={cm.cn(
              'inline-block h-2 w-2 rounded-full',
              state === 'live' && 'animate-pulse',
            )}
            style={{
              backgroundColor:
                state === 'live'
                  ? 'var(--mol-color-success)'
                  : state === 'scheduled'
                    ? 'var(--mol-color-warning)'
                    : 'var(--color-outline)',
              boxShadow:
                state === 'live'
                  ? '0 0 0 3px color-mix(in srgb, var(--mol-color-success) 30%, transparent)'
                  : undefined,
            }}
            aria-hidden="true"
          />
          <span className="text-[10px] font-black uppercase tracking-widest text-on-primary/70">
            {state === 'live'
              ? t('liveResultsHero.live', {}, { defaultValue: 'Live · ballots cast' })
              : state === 'closed'
                ? t('liveResultsHero.closed', {}, { defaultValue: 'Closed · final tally' })
                : t('liveResultsHero.scheduled', {}, { defaultValue: 'Scheduled · opens soon' })}
          </span>
          <span
            className={cm.cn('text-2xl font-extrabold tabular-nums tracking-tight text-on-primary')}
          >
            {totalVotes.toLocaleString()}
          </span>
        </div>
      </header>

      <ul className={cm.cn(cm.sp('mt', 6), 'relative z-10 space-y-3')}>
        {options.map((o) => {
          const pct = Math.round((o.votes / total) * 100)
          const widthPct = Math.max((o.votes / max) * 100, 2)
          const isLeading = o.id === leadingId
          return (
            <li key={o.id}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.textSize('sm'),
                  cm.sp('mb', 1),
                )}
              >
                <span className="font-semibold text-on-primary truncate">{o.label}</span>
                <span className="font-mono font-bold tabular-nums text-on-primary">
                  {o.votes.toLocaleString()}
                  <span className={cm.cn('ml-2 opacity-70')}>{pct}%</span>
                </span>
              </div>
              <div
                className={cm.cn('h-10 overflow-hidden rounded-lg bg-surface/15')}
                role="progressbar"
                aria-label={t(
                  'liveResultsHero.optionShare',
                  { option: o.label },
                  { defaultValue: '{{option}} vote share' },
                )}
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={cm.cn('h-full rounded-lg transition-all duration-500 ease-out')}
                  style={{
                    width: `${widthPct}%`,
                    background: o.color
                      ? o.color
                      : isLeading
                        ? 'linear-gradient(90deg, var(--mol-color-success) 0%, color-mix(in srgb, var(--mol-color-success) 70%, white) 100%)'
                        : 'linear-gradient(90deg, var(--color-surface-container-highest) 0%, color-mix(in srgb, var(--color-surface-container-highest) 70%, transparent) 100%)',
                    boxShadow: isLeading
                      ? `0 0 16px color-mix(in srgb, var(--mol-color-success) 45%, transparent)`
                      : undefined,
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      {caption ? (
        <p
          className={cm.cn(
            cm.sp('mt', 6),
            'relative z-10 text-[11px] font-semibold tracking-wide text-on-primary/80',
          )}
        >
          {caption}
        </p>
      ) : null}
    </section>
  )
}
