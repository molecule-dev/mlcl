import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Flag toggle — 44×24 pill with a sliding white knob. Three states:
 * `on` (emerald), `off` (slate), `killed` (red, disabled).
 *
 * Per DESIGN.md "Flag Toggle" spec: 44px wide × 24px tall, 18px knob,
 * full-pill radius, 150ms ease transition, knob has sm shadow.
 */

export type FlagToggleState = 'on' | 'off' | 'killed' | 'scheduled'

const TONE: Record<FlagToggleState, { bg: string; ring: string }> = {
  on: { bg: 'var(--color-flag-on)', ring: 'var(--color-success-banner-border)' },
  off: { bg: 'var(--color-flag-off)', ring: 'rgba(100, 116, 139, 0.40)' },
  killed: { bg: 'var(--color-flag-killed)', ring: 'var(--color-error-banner-border)' },
  scheduled: { bg: 'var(--color-accent)', ring: 'rgba(167, 139, 250, 0.40)' },
}

const DEFAULT_ARIA: Record<FlagToggleState, string> = {
  on: 'Flag enabled',
  off: 'Flag disabled',
  killed: 'Flag killed',
  scheduled: 'Flag scheduled',
}

interface FlagToggleProps {
  state: FlagToggleState
  onClick?: () => void
  /** Required when `onClick` is provided (i18n label override). */
  ariaLabel?: string
  /** Hide the trailing on/off label. */
  hideLabel?: boolean
}

export function FlagToggle({ state, onClick, ariaLabel, hideLabel = false }: FlagToggleProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tint = TONE[state]
  const knobX = state === 'off' ? 3 : 23
  const interactive = onClick != null && state !== 'killed'

  // The visible pill stays at the DESIGN.md spec (44×24), but when the
  // toggle is interactive the <button> hit area is 44×36 — a 24px-tall
  // touch target is under every mobile guideline, and the extra 12px are
  // transparent padding around the pill, not a visual change.
  const label = ariaLabel ?? t(`flagToggle.${state}`, {}, { defaultValue: DEFAULT_ARIA[state] })

  const pill = (
    <span
      className={cm.cn('relative inline-block rounded-full')}
      style={{
        width: 44,
        height: 24,
        backgroundColor: tint.bg,
        boxShadow: `inset 0 0 0 1px ${tint.ring}`,
      }}
    >
      <span
        className={cm.cn(
          'absolute top-1/2 -translate-y-1/2 inline-block rounded-full transition-all duration-150 ease-out',
        )}
        style={{
          left: knobX,
          width: 18,
          height: 18,
          backgroundColor: 'var(--color-inverse-surface, #ffffff)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
        }}
        aria-hidden="true"
      />
    </span>
  )

  return (
    <span className={cm.flex({ align: 'center', gap: 'sm' })} data-mol-id={`flag-toggle-${state}`}>
      {interactive ? (
        <button
          type="button"
          onClick={onClick}
          aria-pressed={state === 'on'}
          aria-label={label}
          className={cm.cn(
            'inline-flex items-center justify-center rounded-full transition-all duration-150 ease-out cursor-pointer hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          )}
          style={{
            width: 44,
            height: 36,
            outlineColor: 'var(--color-primary)',
          }}
        >
          {pill}
        </button>
      ) : (
        <span
          // Non-interactive renders are a <span>; aria-label needs a valid
          // role there (axe aria-prohibited-attr).
          role="img"
          aria-label={label}
          className={cm.cn(
            'relative inline-block rounded-full',
            state === 'killed' && 'cursor-not-allowed opacity-80',
          )}
          style={{
            width: 44,
            height: 24,
            backgroundColor: tint.bg,
            boxShadow: `inset 0 0 0 1px ${tint.ring}`,
          }}
        >
          <span
            className={cm.cn(
              'absolute top-1/2 -translate-y-1/2 inline-block rounded-full transition-all duration-150 ease-out',
            )}
            style={{
              left: knobX,
              width: 18,
              height: 18,
              backgroundColor: 'var(--color-inverse-surface, #ffffff)',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
            }}
            aria-hidden="true"
          />
        </span>
      )}
      {hideLabel ? null : (
        <span
          className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
          style={{
            color:
              state === 'on'
                ? 'var(--color-emerald-chip-text)'
                : state === 'killed'
                  ? 'var(--color-error-chip-text)'
                  : 'var(--color-text-secondary)',
          }}
        >
          {state === 'on'
            ? t('flagToggle.labelOn', {}, { defaultValue: 'On' })
            : state === 'killed'
              ? t('flagToggle.labelKilled', {}, { defaultValue: 'Killed' })
              : t('status.off', {}, { defaultValue: 'Off' })}
        </span>
      )}
    </span>
  )
}
