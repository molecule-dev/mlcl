import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ComponentStatus } from './StatusPill.js'

/**
 * Overall status hero card — gradient background keyed to the worst
 * current status, decorative blurred orb, large extrabold headline,
 * mono component-count + last-updated metadata, frosted-glass uptime
 * pill on the right.
 *
 * Translated from personal-finance's NetWorthCard (gradient bg + orbs
 * + frosted-glass change pill + huge mono number) and recoloured to
 * Vigil's emerald/indigo palette via DESIGN.md.
 */

type AggregateStatus = 'all_operational' | ComponentStatus

const TONE: Record<
  AggregateStatus,
  { gradFrom: string; gradTo: string; orb: string; pill: string }
> = {
  all_operational: {
    gradFrom: 'rgba(16, 185, 129, 0.45)',
    gradTo: 'rgba(99, 102, 241, 0.20)',
    orb: 'rgba(16, 185, 129, 0.40)',
    pill: '#6ee7b7',
  },
  operational: {
    gradFrom: 'rgba(16, 185, 129, 0.45)',
    gradTo: 'rgba(99, 102, 241, 0.20)',
    orb: 'rgba(16, 185, 129, 0.40)',
    pill: '#6ee7b7',
  },
  degraded_performance: {
    gradFrom: 'rgba(245, 158, 11, 0.40)',
    gradTo: 'rgba(99, 102, 241, 0.20)',
    orb: 'rgba(245, 158, 11, 0.45)',
    pill: '#fcd34d',
  },
  partial_outage: {
    gradFrom: 'rgba(249, 115, 22, 0.45)',
    gradTo: 'rgba(99, 102, 241, 0.18)',
    orb: 'rgba(249, 115, 22, 0.45)',
    pill: '#fdba74',
  },
  major_outage: {
    gradFrom: 'rgba(239, 68, 68, 0.45)',
    gradTo: 'rgba(99, 102, 241, 0.18)',
    orb: 'rgba(239, 68, 68, 0.45)',
    pill: '#fca5a5',
  },
  under_maintenance: {
    gradFrom: 'rgba(99, 102, 241, 0.45)',
    gradTo: 'rgba(16, 185, 129, 0.20)',
    orb: 'rgba(99, 102, 241, 0.45)',
    pill: '#a5b4fc',
  },
  unknown: {
    gradFrom: 'rgba(71, 85, 105, 0.45)',
    gradTo: 'rgba(15, 23, 42, 0.30)',
    orb: 'rgba(148, 163, 184, 0.30)',
    pill: '#cbd5e1',
  },
}

interface StatusOverviewCardProps {
  status: AggregateStatus
  totalServices: number
  operationalServices: number
  uptimePct90?: number | null
  lastUpdatedAt?: string | null
  headline?: string
  subhead?: string
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(0, Math.floor(ms / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function StatusOverviewCard({
  status,
  totalServices,
  operationalServices,
  uptimePct90,
  lastUpdatedAt,
  headline,
  subhead,
}: StatusOverviewCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tone = TONE[status]

  const defaultHeadline =
    status === 'all_operational' || status === 'operational'
      ? t('statusOverviewCard.allOperational', {}, { defaultValue: 'All systems operational' })
      : status === 'under_maintenance'
        ? t(
            'statusOverviewCard.maintenance',
            {},
            { defaultValue: 'Scheduled maintenance in progress' },
          )
        : t(
            'statusOverviewCard.issuesDetected',
            {},
            { defaultValue: 'Some systems are experiencing issues' },
          )

  const defaultSubhead = t(
    'statusOverviewCard.lastUpdated',
    { when: lastUpdatedAt ? fmtRelative(lastUpdatedAt) : 'just now' },
    { defaultValue: 'Live state — updated {{when}}' },
  )

  return (
    <article
      className={cm.cn('relative overflow-hidden rounded-[2rem]')}
      style={{
        backgroundImage: `linear-gradient(135deg, ${tone.gradFrom}, ${tone.gradTo})`,
        backgroundColor: 'var(--mol-color-text-inverse)',
        border: '1px solid var(--color-border-card)',
      }}
      data-mol-id="status-overview-card"
    >
      {/* Decorative blurred orbs */}
      <div
        className={cm.cn(
          'absolute -right-20 -bottom-24 h-72 w-72 rounded-full blur-3xl pointer-events-none',
        )}
        style={{ backgroundColor: tone.orb }}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute -left-20 -top-24 h-56 w-56 rounded-full blur-3xl pointer-events-none',
        )}
        style={{ backgroundColor: 'rgba(99, 102, 241, 0.20)' }}
        aria-hidden="true"
      />

      <div className={cm.cn('relative p-8 md:p-10')}>
        <p
          className={cm.cn(
            'font-mono text-[11px] font-black uppercase tracking-widest text-white/70',
          )}
        >
          <span
            className={cm.cn('inline-block h-2 w-2 rounded-full mr-2 align-middle animate-pulse')}
            style={{ backgroundColor: tone.pill, boxShadow: `0 0 0 3px ${tone.gradFrom}` }}
            aria-hidden="true"
          />
          {t('statusOverviewCard.eyebrow', {}, { defaultValue: 'service health · live' })}
        </p>

        <div
          className={cm.cn(
            'mt-3 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,auto)] gap-8 items-start',
          )}
        >
          <div>
            <h2
              className={cm.cn(
                'text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[0.98] text-white',
              )}
            >
              {headline ?? defaultHeadline}
            </h2>
            <p className={cm.cn('mt-3 text-base text-white/75 max-w-2xl')}>
              {subhead ?? defaultSubhead}
            </p>

            <dl className={cm.cn('mt-6 flex flex-wrap items-end gap-x-8 gap-y-3')}>
              <div>
                <dt
                  className={cm.cn(
                    'font-mono text-[10px] font-black uppercase tracking-widest text-white/55',
                  )}
                >
                  {t('statusOverviewCard.servicesUp', {}, { defaultValue: 'Services up' })}
                </dt>
                <dd
                  className={cm.cn('font-mono text-3xl font-extrabold tracking-tighter text-white')}
                >
                  {operationalServices}
                  <span className={cm.cn('opacity-50')}>/{totalServices}</span>
                </dd>
              </div>
              {uptimePct90 != null ? (
                <div>
                  <dt
                    className={cm.cn(
                      'font-mono text-[10px] font-black uppercase tracking-widest text-white/55',
                    )}
                  >
                    {t('statusOverviewCard.uptime90', {}, { defaultValue: '90-day uptime' })}
                  </dt>
                  <dd
                    className={cm.cn(
                      'font-mono text-3xl font-extrabold tracking-tighter text-white',
                    )}
                  >
                    {uptimePct90.toFixed(2)}
                    <span className={cm.cn('ml-0.5 text-base font-bold opacity-70')}>%</span>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className={cm.cn('hidden lg:block')}>
            <div
              className={cm.cn('rounded-2xl px-5 py-4 backdrop-blur-md')}
              style={{
                backgroundColor: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.16)',
              }}
            >
              <p
                className={cm.cn(
                  'font-mono text-[10px] font-black uppercase tracking-widest text-white/65',
                )}
              >
                {t('statusOverviewCard.lastIncident', {}, { defaultValue: 'Last update' })}
              </p>
              <p className={cm.cn('mt-1 font-mono text-base font-extrabold text-white')}>
                {lastUpdatedAt ? fmtRelative(lastUpdatedAt) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
