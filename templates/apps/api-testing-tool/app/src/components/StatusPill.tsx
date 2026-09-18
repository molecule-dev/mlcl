import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * HTTP status / runner pill — bold mono-uppercase tag with a leading dot,
 * frosted background keyed to the status family. Used in History rows,
 * Mocks cards, TestRunner, Monitors, Workspace response header.
 *
 * Translated from ci-cd-dashboard's StatusPill component, with palette
 * remapped to Pylon's response-code semantics from DESIGN.md (2xx green,
 * 3xx blue, 4xx amber, 5xx red, plus monitor/test families).
 */

export type PylonStatus =
  | 'success' // 2xx
  | 'redirect' // 3xx
  | 'clientError' // 4xx
  | 'serverError' // 5xx
  | 'pending'
  | 'cancelled'
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'healthy'
  | 'degraded'
  | 'down'

const TINT: Record<PylonStatus, { dot: string; bg: string; text: string; ring: string }> = {
  success: {
    dot: 'var(--color-status-2xx)',
    bg: 'color-mix(in srgb, var(--color-status-2xx) 15%, transparent)',
    text: 'var(--color-status-2xx)',
    ring: 'color-mix(in srgb, var(--color-status-2xx) 30%, transparent)',
  },
  redirect: {
    dot: 'var(--color-status-3xx)',
    bg: 'color-mix(in srgb, var(--color-status-3xx) 15%, transparent)',
    text: 'var(--color-status-3xx)',
    ring: 'color-mix(in srgb, var(--color-status-3xx) 30%, transparent)',
  },
  clientError: {
    dot: 'var(--color-status-4xx)',
    bg: 'color-mix(in srgb, var(--color-status-4xx) 15%, transparent)',
    text: 'var(--color-status-4xx)',
    ring: 'color-mix(in srgb, var(--color-status-4xx) 30%, transparent)',
  },
  serverError: {
    dot: 'var(--color-status-5xx)',
    bg: 'color-mix(in srgb, var(--color-status-5xx) 15%, transparent)',
    text: 'var(--color-status-5xx)',
    ring: 'color-mix(in srgb, var(--color-status-5xx) 30%, transparent)',
  },
  pending: {
    dot: 'var(--color-info)',
    bg: 'color-mix(in srgb, var(--color-info) 15%, transparent)',
    text: 'var(--color-info)',
    ring: 'color-mix(in srgb, var(--color-info) 30%, transparent)',
  },
  cancelled: {
    dot: 'var(--color-text-muted)',
    bg: 'color-mix(in srgb, var(--color-text-muted) 12%, transparent)',
    text: 'var(--color-text-muted)',
    ring: 'color-mix(in srgb, var(--color-text-muted) 25%, transparent)',
  },
  passed: {
    dot: 'var(--color-success)',
    bg: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
    text: 'var(--color-success)',
    ring: 'color-mix(in srgb, var(--color-success) 30%, transparent)',
  },
  failed: {
    dot: 'var(--color-error)',
    bg: 'color-mix(in srgb, var(--color-error) 15%, transparent)',
    text: 'var(--color-error)',
    ring: 'color-mix(in srgb, var(--color-error) 30%, transparent)',
  },
  skipped: {
    dot: 'var(--color-text-muted)',
    bg: 'color-mix(in srgb, var(--color-text-muted) 12%, transparent)',
    text: 'var(--color-text-muted)',
    ring: 'color-mix(in srgb, var(--color-text-muted) 25%, transparent)',
  },
  healthy: {
    dot: 'var(--color-success)',
    bg: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
    text: 'var(--color-success)',
    ring: 'color-mix(in srgb, var(--color-success) 30%, transparent)',
  },
  degraded: {
    dot: 'var(--color-warning)',
    bg: 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
    text: 'var(--color-warning)',
    ring: 'color-mix(in srgb, var(--color-warning) 30%, transparent)',
  },
  down: {
    dot: 'var(--color-error)',
    bg: 'color-mix(in srgb, var(--color-error) 15%, transparent)',
    text: 'var(--color-error)',
    ring: 'color-mix(in srgb, var(--color-error) 30%, transparent)',
  },
}

const DEFAULT_LABEL: Record<PylonStatus, string> = {
  success: '2xx',
  redirect: '3xx',
  clientError: '4xx',
  serverError: '5xx',
  pending: 'Pending',
  cancelled: 'Cancelled',
  passed: 'Passed',
  failed: 'Failed',
  skipped: 'Skipped',
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
}

/** Map a numeric HTTP status code to its semantic family. */
export function statusFromCode(code: number): PylonStatus {
  if (code >= 500) return 'serverError'
  if (code >= 400) return 'clientError'
  if (code >= 300) return 'redirect'
  if (code >= 200) return 'success'
  return 'pending'
}

interface StatusPillProps {
  status: PylonStatus
  /** Override the auto label (e.g. show "200 OK" instead of "2xx"). */
  label?: string
  /** Apply a thicker ring + bold weight — for detail-page emphasis. */
  emphasis?: boolean
  /** Pulse the dot — used for in-flight requests / running monitors. */
  pulse?: boolean
}

export function StatusPill({ status, label, emphasis = false, pulse = false }: StatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tint = TINT[status]
  const text = label ?? t(`statusPill.${status}`, {}, { defaultValue: DEFAULT_LABEL[status] })

  return (
    <span
      className={cm.cn(
        'inline-flex items-center gap-1.5 rounded-full font-mono uppercase tracking-widest',
        emphasis ? 'px-3 py-1 text-[11px] font-extrabold' : 'px-2.5 py-0.5 text-[10px] font-black',
      )}
      style={{
        backgroundColor: tint.bg,
        color: tint.text,
        boxShadow: emphasis ? `inset 0 0 0 1px ${tint.ring}` : undefined,
      }}
      data-mol-id={`status-pill-${status}`}
    >
      <span
        className={cm.cn('inline-block rounded-full', pulse && 'animate-pulse')}
        style={{
          width: emphasis ? 8 : 6,
          height: emphasis ? 8 : 6,
          backgroundColor: tint.dot,
          boxShadow: pulse ? `0 0 0 3px ${tint.ring}` : undefined,
        }}
        aria-hidden="true"
      />
      {text}
    </span>
  )
}
