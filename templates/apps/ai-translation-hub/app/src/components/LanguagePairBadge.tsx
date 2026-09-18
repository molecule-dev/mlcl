import { getClassMap } from '@molecule/app-ui'

interface LanguagePairBadgeProps {
  source: string
  target: string
  /** Visual size — 'sm' for table rows, 'md' (default) for cards. */
  size?: 'sm' | 'md'
}

/**
 * Pill chip rendering `source → target` ISO code pair (e.g. `en → es`).
 *
 * Translated from the bespoke `bg-secondary-fixed/50` chip pattern in
 * the dashboard fixture — uses indigo secondary tokens with a mono
 * face per Rendition's DESIGN.md.
 */
export function LanguagePairBadge({ source, target, size = 'md' }: LanguagePairBadgeProps) {
  const cm = getClassMap()
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={cm.cn(
        cm.fontWeight('medium'),
        'inline-flex items-center gap-1 rounded-md bg-secondary-fixed/50 text-on-secondary-fixed font-mono',
        padding,
      )}
    >
      <span>{source}</span>
      <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
        arrow_forward
      </span>
      <span>{target}</span>
    </span>
  )
}
