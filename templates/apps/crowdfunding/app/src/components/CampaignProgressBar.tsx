import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CampaignProgressBarProps {
  /** Cents pledged so far. */
  pledgedCents: number
  /** Cents the campaign is targeting. */
  goalCents: number
  /** 'compact' (6px) | 'standard' (10px) | 'hero' (14px). */
  size?: 'compact' | 'standard' | 'hero'
  /** Optional label override; defaults to "Pledged" / "Funded". */
  label?: string
}

/**
 * Color-shifting progress bar — primary cyan < 80%, accent emerald >= 80%,
 * funded green at 100%+. Heights derived from DESIGN.md (compact/standard/
 * hero ladder). Reused on CampaignCard, CampaignDetail hero, and Dashboard.
 */
export function CampaignProgressBar({
  pledgedCents,
  goalCents,
  size = 'standard',
  label,
}: CampaignProgressBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const safeGoal = goalCents > 0 ? goalCents : 1
  const ratio = pledgedCents / safeGoal
  const pct = Math.max(0, Math.min(1, ratio))
  const overflow = ratio > 1
  const widthCss = `${(pct * 100).toFixed(1)}%`

  const heightClass = size === 'hero' ? 'h-3.5' : size === 'standard' ? 'h-2.5' : 'h-1.5'

  const fillColor = ratio >= 1 ? 'bg-success' : ratio >= 0.8 ? 'bg-accent' : 'bg-primary'

  const pctText = `${Math.round(ratio * 100)}%`
  const fundedText = t('campaignProgressBar.funded', {}, { defaultValue: 'Funded' })
  const labelText =
    label ??
    (overflow ? fundedText : t('campaignProgressBar.pledged', {}, { defaultValue: 'Pledged' }))

  return (
    <div className={cm.stack(2)}>
      <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {labelText}
        </span>
        <span
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            ratio >= 1 ? 'text-success' : 'text-on-surface',
          )}
        >
          {pctText}
        </span>
      </div>
      <div
        className={cm.cn(
          cm.w('full'),
          heightClass,
          cm.roundedFull,
          'bg-surface-container overflow-hidden',
        )}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct * 100)}
        aria-label={fundedText}
      >
        <div
          className={cm.cn(
            heightClass,
            cm.roundedFull,
            fillColor,
            'transition-all duration-500 ease-out',
          )}
          style={{ width: widthCss }}
        />
      </div>
    </div>
  )
}

export default CampaignProgressBar
