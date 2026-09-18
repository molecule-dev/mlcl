import { getClassMap } from '@molecule/app-ui'

export type EmailStatus =
  'sent' | 'draft' | 'scheduled' | 'bounced' | 'opened' | 'replied' | 'delivered' | 'ai-generated'

interface StatusPillProps {
  status: EmailStatus
  label: string
  icon?: string
}

const TONE_MAP: Record<EmailStatus, { bg: string; fg: string; defaultIcon: string }> = {
  sent: { bg: 'bg-success/15', fg: 'text-success', defaultIcon: 'send' },
  draft: { bg: 'bg-warning/15', fg: 'text-warning', defaultIcon: 'edit_note' },
  scheduled: { bg: 'bg-info/15', fg: 'text-info', defaultIcon: 'schedule' },
  bounced: { bg: 'bg-error/15', fg: 'text-error', defaultIcon: 'error' },
  opened: { bg: 'bg-secondary/20', fg: 'text-secondary-dark', defaultIcon: 'visibility' },
  replied: { bg: 'bg-primary/15', fg: 'text-primary', defaultIcon: 'reply' },
  delivered: { bg: 'bg-surface-container', fg: 'text-on-surface-variant', defaultIcon: 'done_all' },
  'ai-generated': { bg: 'bg-primary/10', fg: 'text-primary', defaultIcon: 'auto_awesome' },
}

/**
 * Compact uppercase pill used everywhere status appears in Signet —
 * email rows, dashboard activity feed, billing receipts, profile chips.
 *
 * Pill geometry matches the Material 3 surface-tint guidance: tinted
 * background at 15% alpha, full-width foreground for the label, tracking
 * widest at 10px font-bold.
 */
export function StatusPill({ status, label, icon }: StatusPillProps) {
  const cm = getClassMap()
  const tone = TONE_MAP[status]
  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.sp('px', 3),
        cm.sp('py', 1),
        cm.roundedFull,
        'text-[10px] font-bold uppercase tracking-widest inline-flex',
        tone.bg,
        tone.fg,
      )}
    >
      <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
        {icon ?? tone.defaultIcon}
      </span>
      {label}
    </span>
  )
}
