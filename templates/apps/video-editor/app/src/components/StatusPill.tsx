/**
 * Status pill — tiny mono-uppercase badge used on project cards, asset
 * tiles, and render rows. Color-coded for ready / rendering / draft / error
 * / shared / processing states.
 *
 * Pattern source: animation-tool/StatusPill.tsx tweaked for Rushes' clip
 * type palette (video-violet, audio-cyan, image-amber, text-pink).
 */
import { getClassMap } from '@molecule/app-ui'

export type ProjectStatus =
  'ready' | 'rendering' | 'draft' | 'error' | 'shared' | 'queued' | 'complete'

interface StatusPillProps {
  status: ProjectStatus
  label?: string
}

const CONFIG: Record<ProjectStatus, { className: string; defaultLabel: string }> = {
  ready: {
    className:
      'bg-[var(--video-cta-from)]/15 text-[var(--video-link)] border-[var(--video-cta-from)]/40',
    defaultLabel: 'Ready',
  },
  rendering: {
    // The pulse lives on a leading dot, NOT the pill: animate-pulse on the whole
    // pill dims the label text below 4.5:1 mid-animation (axe catches the frame).
    className:
      'bg-[var(--mol-color-info)]/15 text-[var(--mol-color-info)] border-[var(--mol-color-info)]/40',
    defaultLabel: 'Rendering',
  },
  draft: {
    className:
      'bg-[var(--video-text-dim)]/15 text-[var(--video-text-muted-alt)] border-[var(--video-text-dim)]/40',
    defaultLabel: 'Draft',
  },
  error: {
    className:
      'bg-[var(--video-danger)]/15 text-[var(--video-error-text)] border-[var(--video-danger)]/40',
    defaultLabel: 'Failed',
  },
  shared: {
    className:
      'bg-[var(--mol-color-info)]/15 text-[var(--mol-color-info)] border-[var(--mol-color-info)]/40',
    defaultLabel: 'Shared',
  },
  queued: {
    className:
      'bg-[var(--mol-color-warning)]/15 text-[var(--mol-color-warning)] border-[var(--video-warning)]/40',
    defaultLabel: 'Queued',
  },
  complete: {
    className:
      'bg-[var(--video-secondary)]/15 text-[var(--mol-color-success)] border-[var(--video-secondary)]/40',
    defaultLabel: 'Complete',
  },
}

export function StatusPill({ status, label }: StatusPillProps) {
  const cm = getClassMap()
  const cfg = CONFIG[status]
  return (
    <span
      data-mol-id={`status-${status}`}
      className={cm.cn(
        cm.sp('px', 2),
        cm.sp('py', 1),
        'inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full border',
        cfg.className,
      )}
    >
      {status === 'rendering' && (
        <span
          aria-hidden="true"
          className={cm.cn(
            'w-1.5 h-1.5 rounded-full bg-[var(--mol-color-info)] animate-pulse shrink-0',
          )}
        />
      )}
      {label ?? cfg.defaultLabel}
    </span>
  )
}

export default StatusPill
