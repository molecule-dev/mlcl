import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Webhook delivery status pill — bold mono-uppercase tag with a leading
 * dot, frosted background keyed to the delivery family. Used in
 * Deliveries log rows, EndpointCards, dashboards, audit log.
 *
 * Translated from api-testing-tool's StatusPill, with palette remapped
 * to webhook-manager's DESIGN.md delivery semantics: delivered green,
 * failed red, retrying amber, pending indigo, disabled slate, plus the
 * 2xx/3xx/4xx/5xx/timeout HTTP families.
 */

export type DeliveryStatus =
  | 'delivered'
  | 'failed'
  | 'retrying'
  | 'pending'
  | 'disabled'
  | 'success'
  | 'redirect'
  | 'clientError'
  | 'serverError'
  | 'timeout'
  | 'live'
  | 'paused'

const TINT: Record<DeliveryStatus, { dot: string; bg: string; text: string; ring: string }> = {
  delivered: {
    dot: 'var(--mol-color-success)',
    bg: 'color-mix(in srgb, var(--mol-color-success) 15%, transparent)',
    text: 'var(--mol-color-success)',
    ring: 'color-mix(in srgb, var(--mol-color-success) 30%, transparent)',
  },
  failed: {
    dot: 'var(--mol-color-error)',
    bg: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
    text: 'var(--mol-color-error)',
    ring: 'color-mix(in srgb, var(--mol-color-error) 30%, transparent)',
  },
  retrying: {
    dot: 'var(--mol-color-warning)',
    bg: 'color-mix(in srgb, var(--mol-color-warning) 15%, transparent)',
    text: 'var(--mol-color-warning)',
    ring: 'color-mix(in srgb, var(--mol-color-warning) 30%, transparent)',
  },
  pending: {
    dot: 'var(--mol-color-secondary)',
    bg: 'color-mix(in srgb, var(--mol-color-secondary) 15%, transparent)',
    text: 'var(--mol-color-secondary)',
    ring: 'color-mix(in srgb, var(--mol-color-secondary) 30%, transparent)',
  },
  disabled: {
    dot: 'var(--mol-color-text-tertiary)',
    bg: 'color-mix(in srgb, var(--mol-color-text-tertiary) 15%, transparent)',
    text: 'var(--mol-color-text-secondary)',
    ring: 'color-mix(in srgb, var(--mol-color-text-tertiary) 25%, transparent)',
  },
  success: {
    dot: 'var(--mol-color-success)',
    bg: 'color-mix(in srgb, var(--mol-color-success) 15%, transparent)',
    text: 'var(--mol-color-success)',
    ring: 'color-mix(in srgb, var(--mol-color-success) 30%, transparent)',
  },
  redirect: {
    dot: 'var(--mol-color-info)',
    bg: 'color-mix(in srgb, var(--mol-color-info) 15%, transparent)',
    text: 'var(--mol-color-info)',
    ring: 'color-mix(in srgb, var(--mol-color-info) 30%, transparent)',
  },
  clientError: {
    dot: 'var(--mol-color-warning)',
    bg: 'color-mix(in srgb, var(--mol-color-warning) 15%, transparent)',
    text: 'var(--mol-color-warning)',
    ring: 'color-mix(in srgb, var(--mol-color-warning) 30%, transparent)',
  },
  serverError: {
    dot: 'var(--mol-color-error)',
    bg: 'color-mix(in srgb, var(--mol-color-error) 15%, transparent)',
    text: 'var(--mol-color-error)',
    ring: 'color-mix(in srgb, var(--mol-color-error) 30%, transparent)',
  },
  timeout: {
    dot: 'var(--mol-color-secondary)',
    bg: 'color-mix(in srgb, var(--mol-color-secondary) 15%, transparent)',
    text: 'var(--mol-color-secondary)',
    ring: 'color-mix(in srgb, var(--mol-color-secondary) 30%, transparent)',
  },
  live: {
    dot: 'var(--mol-color-success)',
    bg: 'color-mix(in srgb, var(--mol-color-success) 15%, transparent)',
    text: 'var(--mol-color-success)',
    ring: 'color-mix(in srgb, var(--mol-color-success) 30%, transparent)',
  },
  paused: {
    dot: 'var(--mol-color-text-tertiary)',
    bg: 'color-mix(in srgb, var(--mol-color-text-tertiary) 15%, transparent)',
    text: 'var(--mol-color-text-secondary)',
    ring: 'color-mix(in srgb, var(--mol-color-text-tertiary) 30%, transparent)',
  },
}

const DEFAULT_LABEL: Record<DeliveryStatus, string> = {
  delivered: 'Delivered',
  failed: 'Failed',
  retrying: 'Retrying',
  pending: 'Pending',
  disabled: 'Disabled',
  success: '2xx',
  redirect: '3xx',
  clientError: '4xx',
  serverError: '5xx',
  timeout: 'Timeout',
  live: 'Live',
  paused: 'Paused',
}

/** Map a numeric HTTP status code to its semantic family. */
export function statusFromCode(code: number): DeliveryStatus {
  if (code >= 500) return 'serverError'
  if (code >= 400) return 'clientError'
  if (code >= 300) return 'redirect'
  if (code >= 200) return 'success'
  return 'pending'
}

interface StatusPillProps {
  status: DeliveryStatus
  label?: string
  emphasis?: boolean
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
