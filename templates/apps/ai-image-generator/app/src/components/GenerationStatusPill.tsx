import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type GenerationStatus =
  'queued' | 'generating' | 'complete' | 'failed' | 'upscaled' | 'nsfw_blocked'

const STATUS_CONFIG: Record<GenerationStatus, { icon: string; label: string; tone: string }> = {
  queued: { icon: 'schedule', label: 'Queued', tone: 'bg-on-surface/10 text-on-surface-variant' },
  generating: {
    icon: 'progress_activity',
    label: 'Dreaming',
    tone: 'bg-primary/15 text-primary',
  },
  complete: {
    icon: 'check_circle',
    label: 'Complete',
    tone: 'bg-success-container/40 text-success',
  },
  failed: { icon: 'error', label: 'Failed', tone: 'bg-error-container/30 text-error' },
  upscaled: {
    icon: 'high_quality',
    label: 'Upscaled',
    tone: 'bg-info-container/30 text-info',
  },
  nsfw_blocked: {
    icon: 'visibility_off',
    label: 'Blocked',
    tone: 'bg-warning-container/30 text-warning',
  },
}

export interface GenerationStatusPillProps {
  status: GenerationStatus
  /** Override the visible label (otherwise uses i18n key per status). */
  label?: string
  /** Render in a more compact size for inline placements. */
  size?: 'sm' | 'md'
}

/**
 * Status chip used on image cards, the activity feed and the Generate page —
 * Material symbol + colour-coded background derived from the dreamscape palette.
 */
export function GenerationStatusPill({ status, label, size = 'md' }: GenerationStatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const cfg = STATUS_CONFIG[status]
  const text = label ?? t(`generation.status.${status}`, {}, { defaultValue: cfg.label })

  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.fontWeight('bold'),
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        'rounded-full uppercase tracking-widest border border-surface/10',
        cfg.tone,
        // Deliberately NOT `animate-pulse` while generating. Tailwind's pulse
        // animates opacity 1 → .5, and this pill is 10px bold text: at the
        // trough it measured 2.99:1 against the card, well under the 4.5:1 WCAG
        // AA floor, so the label became unreadable on every cycle. The spinning
        // icon below already carries the "in progress" signal without touching
        // the text's legibility.
      )}
    >
      <span
        className={cm.cn(
          'material-symbols-outlined',
          status === 'generating' ? 'animate-spin' : '',
        )}
        style={{ fontSize: size === 'sm' ? 12 : 14 }}
      >
        {cfg.icon}
      </span>
      {text}
    </span>
  )
}
