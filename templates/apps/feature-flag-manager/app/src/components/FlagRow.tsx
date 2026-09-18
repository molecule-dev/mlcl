import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EnvironmentBadge, type EnvTone } from './EnvironmentBadge.js'
import { FlagToggle, type FlagToggleState } from './FlagToggle.js'
import { RolloutBar } from './RolloutBar.js'

/**
 * Editorial flag row — terminal-aesthetic dark surface with a status
 * `border-l-4` accent, mono flag key, name, env badges, rollout bar,
 * and stale-flag indicator dot. The whole row links to `/flags/:key`.
 *
 * Translated from ci-cd-dashboard's PipelineRow editorial-row treatment
 * (border-l-4 + dark surface + mono columns + hover translate-y) and
 * personal-finance's AccountRecentTransactions row hover lift.
 */

export interface FlagRowData {
  /** Database UUID. Optional for fixture rows used in non-interactive contexts (Landing). */
  id?: string
  /** Routing slug — `/flags/:key`. */
  key: string
  name: string
  description?: string
  flag_type: 'boolean' | 'multivariate' | 'string' | 'number'
  state: FlagToggleState
  rollout_percentage: number
  environments: EnvTone[]
  /** Days since last evaluation — >= 30 surfaces a stale dot. */
  stale_days?: number
  updated_at?: string
  updated_by?: string
}

interface FlagRowProps {
  flag: FlagRowData
  /** When false, renders a non-interactive demo row (used on Landing). */
  linked?: boolean
  onToggle?: (flag: FlagRowData) => void
}

const ACCENT: Record<FlagToggleState, string> = {
  on: 'var(--color-flag-on)',
  off: 'var(--color-flag-off)',
  killed: 'var(--color-flag-killed)',
  scheduled: 'var(--color-targeting-active)',
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return iso
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function FlagRow({ flag, linked = true, onToggle }: FlagRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = ACCENT[flag.state]
  const isStale = (flag.stale_days ?? 0) >= 30

  const body = (
    <div
      className={cm.cn(
        'group relative flex flex-col gap-3 rounded-xl px-5 py-4 transition-all md:flex-row md:items-center md:gap-4',
        linked && 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
      )}
      style={{
        backgroundColor: 'rgba(30, 34, 53, 0.6)',
        border: '1px solid rgba(30, 41, 59, 0.8)',
        borderLeft: `4px solid ${accent}`,
      }}
      data-mol-id={`flag-row-${flag.key}`}
    >
      {/* Identity */}
      <div className={cm.cn('flex-1 min-w-0')}>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {isStale ? (
            <span
              className={cm.cn('h-2 w-2 rounded-full shrink-0')}
              style={{
                backgroundColor: 'var(--color-stale-flag)',
                boxShadow: '0 0 8px rgba(249, 115, 22, 0.6)',
              }}
              aria-label={t('flagRow.staleAria', {}, { defaultValue: 'Stale flag' })}
            />
          ) : null}
          <p className={cm.cn('font-mono text-[14px] font-bold text-on-surface truncate')}>
            {flag.key}
          </p>
          <span
            className={cm.cn(
              'font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {flag.flag_type}
          </span>
        </div>
        <p className={cm.cn('mt-1 text-sm font-semibold text-on-surface truncate')}>{flag.name}</p>
        {flag.description ? (
          <p className={cm.cn('mt-0.5 text-xs text-on-surface-variant truncate')}>
            {flag.description}
          </p>
        ) : null}
      </div>

      {/* Environment badges */}
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), 'shrink-0')}>
        {flag.environments.map((env) => (
          <EnvironmentBadge key={env} tone={env} compact />
        ))}
      </div>

      {/* Rollout */}
      <div className={cm.cn('hidden md:block w-32 shrink-0')}>
        <RolloutBar percent={flag.rollout_percentage} showLabel={false} />
        <p
          className={cm.cn('mt-1.5 text-right font-mono text-xs font-bold text-on-surface')}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {flag.rollout_percentage}%
        </p>
      </div>

      {/* Updated */}
      <div className={cm.cn('hidden xl:flex shrink-0 flex-col items-end w-28')}>
        <span
          className={cm.cn(
            'text-[9px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('flagRow.updated', {}, { defaultValue: 'Updated' })}
        </span>
        <span className={cm.cn('font-mono text-xs text-on-surface-variant')}>
          {flag.updated_at ? fmtRelative(flag.updated_at) : '—'}
        </span>
      </div>

      {/* Toggle — single handler on FlagToggle's <button>. Clicks inside
          this cluster must not navigate the parent <Link>; the Link's own
          onClick guard (below) checks for [data-flag-toggle] ancestry and
          calls preventDefault, so onToggle fires exactly once and the row
          does not navigate. */}
      <div data-flag-toggle className={cm.cn('shrink-0')}>
        <FlagToggle
          state={flag.state}
          onClick={onToggle ? () => onToggle(flag) : undefined}
          hideLabel
          ariaLabel={t('flagRow.toggleAria', { key: flag.key }, { defaultValue: 'Toggle {{key}}' })}
        />
      </div>

      {linked ? (
        <span
          className={cm.cn(
            'material-symbols-outlined text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all text-base shrink-0',
          )}
          aria-hidden="true"
        >
          arrow_forward
        </span>
      ) : null}
    </div>
  )

  if (!linked) return body
  return (
    <Link
      to={`/flags/${flag.key}`}
      onClick={(e) => {
        // Clicks originating in the toggle cluster flip the flag; they must
        // not also navigate the row.
        if (e.target instanceof Element && e.target.closest('[data-flag-toggle]')) {
          e.preventDefault()
        }
      }}
    >
      {body}
    </Link>
  )
}
