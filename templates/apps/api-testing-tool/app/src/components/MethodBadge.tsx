import { getClassMap } from '@molecule/app-ui'

/**
 * HTTP method badge — bold mono pill keyed to the engineering palette
 * defined in DESIGN.md (GET green, POST blue, PUT amber, PATCH violet,
 * DELETE red, OPTIONS/HEAD slate). Renders in two densities: `compact`
 * for collection trees + history rows, `default` for the URL bar /
 * request tabs.
 *
 * Translated from ci-cd-dashboard's StatusPill tinting recipe and
 * recoloured to the HTTP method semantics from DESIGN.md.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'

const TINT: Record<HttpMethod, { fg: string; bg: string; ring: string }> = {
  GET: {
    fg: 'var(--color-method-get)',
    bg: 'color-mix(in srgb, var(--color-method-get) 18%, transparent)',
    ring: 'color-mix(in srgb, var(--color-method-get) 35%, transparent)',
  },
  POST: {
    fg: 'var(--color-method-post)',
    bg: 'color-mix(in srgb, var(--color-method-post) 18%, transparent)',
    ring: 'color-mix(in srgb, var(--color-method-post) 35%, transparent)',
  },
  PUT: {
    fg: 'var(--color-method-put)',
    bg: 'color-mix(in srgb, var(--color-method-put) 18%, transparent)',
    ring: 'color-mix(in srgb, var(--color-method-put) 35%, transparent)',
  },
  PATCH: {
    fg: 'var(--color-method-patch)',
    bg: 'color-mix(in srgb, var(--color-method-patch) 20%, transparent)',
    ring: 'color-mix(in srgb, var(--color-method-patch) 40%, transparent)',
  },
  DELETE: {
    fg: 'var(--color-method-delete)',
    bg: 'color-mix(in srgb, var(--color-method-delete) 18%, transparent)',
    ring: 'color-mix(in srgb, var(--color-method-delete) 35%, transparent)',
  },
  OPTIONS: {
    fg: 'var(--color-text-muted)',
    bg: 'color-mix(in srgb, var(--color-text-muted) 15%, transparent)',
    ring: 'color-mix(in srgb, var(--color-text-muted) 30%, transparent)',
  },
  HEAD: {
    fg: 'var(--color-text-muted)',
    bg: 'color-mix(in srgb, var(--color-text-muted) 15%, transparent)',
    ring: 'color-mix(in srgb, var(--color-text-muted) 30%, transparent)',
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
  /** Compact = 10px tracking-widest (tree rows), default = 11px (URL bar). */
  density?: 'compact' | 'default'
  /** Render `DEL` instead of `DELETE` — used in fixed-width tree columns. */
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
