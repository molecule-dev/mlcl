/**
 * Loyalty tier pill — a small uppercase tracked-out badge that surfaces
 * the member's tier (silver / gold / platinum) plus their points balance.
 * Sized to sit ambient inside the nav (per DESIGN.md "Loyalty is ambient")
 * and reusable on Account / BookingConfirmation as well.
 *
 * Bespoke to Auberge — there is no direct sibling; the visual treatment
 * borrows the polished-11 status-pill recipe (uppercase 10px, font-black,
 * tracking-widest, rounded-full) from `personal-finance/ActivityRow.tsx`'s
 * category chip and pairs it with DESIGN.md's loyalty palette.
 */

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type LoyaltyTier = 'silver' | 'gold' | 'platinum'

const TIER_THEME: Record<
  LoyaltyTier,
  { bg: string; text: string; ring: string; icon: string; label: string }
> = {
  silver: {
    bg: 'bg-border-secondary/30',
    text: 'text-foreground-tertiary',
    ring: 'ring-border-secondary/60',
    icon: 'workspace_premium',
    label: 'Silver',
  },
  gold: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-200',
    ring: 'ring-amber-400/60',
    icon: 'workspace_premium',
    label: 'Gold',
  },
  platinum: {
    bg: 'bg-violet-400/20',
    text: 'text-violet-100',
    ring: 'ring-violet-300/60',
    icon: 'diamond',
    label: 'Platinum',
  },
}

export function LoyaltyTierBadge({
  tier,
  points,
  compact,
}: {
  tier: LoyaltyTier
  points?: number
  compact?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const theme = TIER_THEME[tier]
  return (
    <span
      className={cm.cn(
        cm.sp('px', 3),
        cm.sp('py', 1),
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.fontWeight('bold'),
        'rounded-full text-[10px] uppercase tracking-widest ring-1 backdrop-blur-md',
        theme.bg,
        theme.text,
        theme.ring,
      )}
    >
      <span
        className={'material-symbols-outlined text-sm'}
        aria-hidden="true"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {theme.icon}
      </span>
      {t(`loyaltyTierBadge.tier.${tier}`, {}, { defaultValue: theme.label })}
      {typeof points === 'number' && !compact ? (
        <span className={cm.cn(cm.fontWeight('bold'), 'tabular-nums normal-case opacity-80')}>
          ·{' '}
          {t(
            'loyaltyTierBadge.points',
            { points: points.toLocaleString() },
            { defaultValue: '{{points}} pts' },
          )}
        </span>
      ) : null}
    </span>
  )
}
