/**
 * Status pill — tiny mono-uppercase badge used on project cards and asset
 * tiles. Color-coded for ready / rendering / draft / error states.
 *
 * Pattern source: ai-agent-playground/AgentCard status dot + api-documentation
 * MethodBadgeRow uppercase mono treatment.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type ProjectStatus = 'ready' | 'rendering' | 'draft' | 'error' | 'shared'

interface StatusPillProps {
  status: ProjectStatus
  label?: string
}

const CONFIG: Record<
  ProjectStatus,
  { bg: string; text: string; border: string; defaultLabel: string; pulse?: boolean }
> = {
  ready: {
    bg: 'color-mix(in srgb, var(--anim-primary) 15%, transparent)',
    text: 'var(--anim-primary)',
    border: 'color-mix(in srgb, var(--anim-primary) 40%, transparent)',
    defaultLabel: 'Ready',
  },
  rendering: {
    bg: 'color-mix(in srgb, var(--anim-secondary) 15%, transparent)',
    text: 'var(--anim-secondary)',
    border: 'color-mix(in srgb, var(--anim-secondary) 40%, transparent)',
    defaultLabel: 'Rendering',
    pulse: true,
  },
  draft: {
    bg: 'color-mix(in srgb, var(--anim-text-muted) 15%, transparent)',
    text: 'var(--anim-text-secondary)',
    border: 'color-mix(in srgb, var(--anim-text-muted) 40%, transparent)',
    defaultLabel: 'Draft',
  },
  error: {
    bg: 'color-mix(in srgb, var(--anim-danger) 15%, transparent)',
    text: 'var(--anim-danger)',
    border: 'color-mix(in srgb, var(--anim-danger) 40%, transparent)',
    defaultLabel: 'Error',
  },
  shared: {
    bg: 'color-mix(in srgb, var(--mol-color-info) 15%, transparent)',
    text: 'var(--mol-color-info)',
    border: 'color-mix(in srgb, var(--mol-color-info) 40%, transparent)',
    defaultLabel: 'Shared',
  },
}

export function StatusPill({ status, label }: StatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const cfg = CONFIG[status]
  return (
    <span
      data-mol-id={`status-${status}`}
      className={cm.cn(
        cm.sp('px', 2),
        cm.sp('py', 1),
        'inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full border',
      )}
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        borderColor: cfg.border,
      }}
    >
      {/* The "in progress" pulse lives on a non-text dot: animating the whole
          pill fades the TEXT below the contrast floor and trips axe mid-cycle
          (contrast is computed against the faded composite). */}
      {cfg.pulse ? (
        <span
          aria-hidden
          className={cm.cn('animate-pulse w-1.5 h-1.5 rounded-full')}
          style={{ backgroundColor: cfg.text }}
        />
      ) : null}
      {label ?? t(`statusPill.${status}`, {}, { defaultValue: cfg.defaultLabel })}
    </span>
  )
}

export default StatusPill
