import { getClassMap } from '@molecule/app-ui'

/**
 * HTTP method badge — bold mono pill keyed to the engineering palette
 * defined in DESIGN.md (GET emerald, POST indigo, PUT/PATCH amber,
 * DELETE red, OPTIONS/HEAD slate). Renders in two densities: `compact`
 * for log rows + endpoint cards, `default` for inline chips on detail
 * pages.
 *
 * Translated from api-testing-tool's MethodBadge — same shape, palette
 * remapped to webhook-manager's DESIGN.md (POST is indigo here, not blue).
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'

const TINT: Record<HttpMethod, { fg: string; bg: string; ring: string }> = {
  GET: {
    fg: 'var(--mol-color-success)',
    bg: 'color-mix(in srgb, var(--mol-color-success) 18%, transparent)',
    ring: 'color-mix(in srgb, var(--mol-color-success) 35%, transparent)',
  },
  POST: {
    fg: 'var(--mol-color-secondary)',
    bg: 'color-mix(in srgb, var(--mol-color-secondary) 18%, transparent)',
    ring: 'color-mix(in srgb, var(--mol-color-secondary) 35%, transparent)',
  },
  PUT: {
    fg: 'var(--mol-color-warning)',
    bg: 'color-mix(in srgb, var(--mol-color-warning) 18%, transparent)',
    ring: 'color-mix(in srgb, var(--mol-color-warning) 35%, transparent)',
  },
  PATCH: {
    fg: 'var(--mol-color-warning)',
    bg: 'color-mix(in srgb, var(--mol-color-warning) 18%, transparent)',
    ring: 'color-mix(in srgb, var(--mol-color-warning) 35%, transparent)',
  },
  DELETE: {
    fg: 'var(--mol-color-error)',
    bg: 'color-mix(in srgb, var(--mol-color-error) 18%, transparent)',
    ring: 'color-mix(in srgb, var(--mol-color-error) 35%, transparent)',
  },
  OPTIONS: {
    fg: 'var(--mol-color-text-secondary)',
    bg: 'color-mix(in srgb, var(--mol-color-text-tertiary) 15%, transparent)',
    ring: 'color-mix(in srgb, var(--mol-color-text-tertiary) 30%, transparent)',
  },
  HEAD: {
    fg: 'var(--mol-color-text-secondary)',
    bg: 'color-mix(in srgb, var(--mol-color-text-tertiary) 15%, transparent)',
    ring: 'color-mix(in srgb, var(--mol-color-text-tertiary) 30%, transparent)',
  },
}

const SHORT_LABEL: Record<HttpMethod, string> = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DEL',
  OPTIONS: 'OPT',
  HEAD: 'HEAD',
}

interface MethodBadgeProps {
  method: HttpMethod
  density?: 'compact' | 'default'
  short?: boolean
}

export function MethodBadge({ method, density = 'compact', short = false }: MethodBadgeProps) {
  const cm = getClassMap()
  const tint = TINT[method]
  const label = short ? SHORT_LABEL[method] : method
  const isCompact = density === 'compact'

  return (
    <span
      className={cm.cn(
        'inline-flex items-center justify-center rounded-md font-mono uppercase tracking-widest font-extrabold',
        isCompact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
      )}
      style={{
        backgroundColor: tint.bg,
        color: tint.fg,
        boxShadow: `inset 0 0 0 1px ${tint.ring}`,
      }}
      data-mol-id={`method-badge-${method.toLowerCase()}`}
    >
      {label}
    </span>
  )
}
