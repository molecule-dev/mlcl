import { getClassMap } from '@molecule/app-ui'

export type ClipCategory = 'code' | 'text' | 'url' | 'image' | 'credential'

const CATEGORY_TINT: Record<ClipCategory, { bg: string; fg: string }> = {
  code: { bg: 'var(--color-cat-code-bg)', fg: 'var(--color-cat-code-fg)' },
  text: { bg: 'var(--color-cat-text-bg)', fg: 'var(--color-cat-text-fg)' },
  url: { bg: 'var(--color-cat-url-bg)', fg: 'var(--color-cat-url-fg)' },
  image: { bg: 'var(--color-cat-image-bg)', fg: 'var(--color-cat-image-fg)' },
  credential: { bg: 'var(--color-cat-credential-bg)', fg: 'var(--color-cat-credential-fg)' },
}

interface CategoryPillProps {
  category: ClipCategory
  /** Override label (defaults to capitalized category). */
  label?: string
  /** Tighter padding for inline usage in dense rows. Default false. */
  compact?: boolean
  className?: string
}

/**
 * Pastel pill rendering a clip category with the colors mandated by
 * DESIGN.md (code/text/url/image/credential).
 */
export function CategoryPill({ category, label, compact = false, className }: CategoryPillProps) {
  const cm = getClassMap()
  const tint = CATEGORY_TINT[category]
  const text = label ?? category.charAt(0).toUpperCase() + category.slice(1)

  return (
    <span
      className={cm.cn(
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        cm.fontWeight('semibold'),
        'inline-flex items-center rounded-full uppercase tracking-wider font-mono',
        className,
      )}
      style={{ backgroundColor: tint.bg, color: tint.fg }}
    >
      {text}
    </span>
  )
}

export default CategoryPill
