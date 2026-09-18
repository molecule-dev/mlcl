import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Auction status pill — uppercase 10px tracking-widest, rounded-full, semantic
 * background. Translated from the polished CRM/inventory pill pattern + the
 * Stitch Gavl baseline auction-status-badge.
 */
export type AuctionStatus =
  | 'live'
  | 'ending'
  | 'closed'
  | 'won'
  | 'outbid'
  | 'winning'
  | 'reserve_not_met'
  | 'reserve_met'
  | 'draft'

interface AuctionStatusPillProps {
  status: AuctionStatus
  label?: string
}

const VARIANTS: Record<
  AuctionStatus,
  { bg: string; fg: string; defaultLabel: string; pulse: boolean }
> = {
  live: {
    bg: 'var(--color-status-live-bg)',
    fg: 'var(--color-status-live-fg)',
    defaultLabel: 'Live',
    pulse: true,
  },
  ending: {
    bg: 'var(--color-status-ending-bg)',
    fg: 'var(--color-status-ending-fg)',
    defaultLabel: 'Ending soon',
    pulse: true,
  },
  closed: {
    bg: 'var(--color-status-closed-bg)',
    fg: 'var(--color-status-closed-fg)',
    defaultLabel: 'Closed',
    pulse: false,
  },
  won: {
    bg: 'var(--color-status-won-bg)',
    fg: 'var(--color-status-won-fg)',
    defaultLabel: 'Won',
    pulse: false,
  },
  outbid: {
    bg: 'var(--color-status-outbid-bg)',
    fg: 'var(--color-status-outbid-fg)',
    defaultLabel: 'Outbid',
    pulse: false,
  },
  winning: {
    bg: 'var(--color-status-won-bg)',
    fg: 'var(--color-status-won-fg)',
    defaultLabel: 'Winning',
    pulse: true,
  },
  reserve_not_met: {
    bg: 'var(--color-status-ending-bg)',
    fg: 'var(--color-status-ending-fg)',
    defaultLabel: 'Reserve not met',
    pulse: false,
  },
  reserve_met: {
    bg: 'var(--color-status-won-bg)',
    fg: 'var(--color-status-won-fg)',
    defaultLabel: 'Reserve met',
    pulse: false,
  },
  draft: {
    bg: 'var(--color-status-closed-bg)',
    fg: 'var(--color-status-closed-fg)',
    defaultLabel: 'Draft',
    pulse: false,
  },
}

export function AuctionStatusPill({ status, label }: AuctionStatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const v = VARIANTS[status]
  const text = label ?? t(`auctionStatusPill.${status}`, {}, { defaultValue: v.defaultLabel })
  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
      )}
      style={{ backgroundColor: v.bg, color: v.fg }}
    >
      {v.pulse ? (
        <span
          className={cm.cn('w-1.5 h-1.5 rounded-full animate-pulse')}
          style={{ backgroundColor: v.fg }}
          aria-hidden="true"
        />
      ) : null}
      {text}
    </span>
  )
}

export default AuctionStatusPill
