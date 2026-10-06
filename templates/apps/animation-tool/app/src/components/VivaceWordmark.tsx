/**
 * Vivace wordmark — thin compatibility wrapper around the canonical
 * `BrandWordmark` (italic, gradient-stroked text logo; bespoke per Vivace
 * DESIGN.md). Kept so existing call sites keep their `size`/`to` API while
 * the brand itself renders through the one shared component
 * (scripts/verify-brand-consistency.mjs greps for exactly that).
 */
import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { SafeLink } from './SafeLink.js'

interface VivaceWordmarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  to?: string
}

export function VivaceWordmark({ size = 'md', to }: VivaceWordmarkProps) {
  const mark = <BrandWordmark as="span" size={size} />
  if (to) {
    return (
      <SafeLink to={to} aria-label={`${APP_NAME} home`} data-mol-id="vivace-wordmark">
        {mark}
      </SafeLink>
    )
  }
  return mark
}

export default VivaceWordmark
