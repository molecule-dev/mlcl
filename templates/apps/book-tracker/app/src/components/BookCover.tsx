import { getClassMap } from '@molecule/app-ui'

/**
 * Generated book cover — a colored "spine + front" card rendered from the
 * book's cover_style token. The gradient stops live in theme.css
 * (--color-cover-*); the spine rule + faded title lines give every cover a
 * physical-book feel without shipping image assets.
 */

export type CoverStyle = 'teal' | 'amber' | 'wine' | 'indigo' | 'forest' | 'slate' | 'plum' | 'clay'

export const COVER_STYLES: CoverStyle[] = [
  'teal',
  'amber',
  'wine',
  'indigo',
  'forest',
  'slate',
  'plum',
  'clay',
]

interface BookCoverProps {
  title: string
  author: string
  coverStyle?: string | null
  /** Tailwind height class for the cover (width follows the 2:3 ratio). */
  size?: 'sm' | 'md' | 'lg'
}

const SIZES: Record<NonNullable<BookCoverProps['size']>, string> = {
  sm: 'h-20',
  md: 'h-28',
  lg: 'h-44',
}

export function BookCover({ title, author, coverStyle, size = 'md' }: BookCoverProps) {
  const cm = getClassMap()
  const style = (COVER_STYLES as string[]).includes(coverStyle ?? '')
    ? (coverStyle as CoverStyle)
    : 'teal'
  const colorVar = `var(--color-cover-${style})`
  return (
    <div
      className={cm.cn(
        SIZES[size],
        'aspect-[2/3]',
        'rounded-r-md rounded-l-sm',
        'relative overflow-hidden shrink-0 shadow-md',
      )}
      style={{
        background: `linear-gradient(150deg, color-mix(in srgb, ${colorVar} 82%, white) 0%, ${colorVar} 100%)`,
      }}
      aria-hidden="true"
    >
      {/* Spine */}
      <div
        className={cm.cn('absolute inset-y-0 left-0 w-1.5')}
        style={{ background: 'rgba(0, 0, 0, 0.25)' }}
      />
      {/* Title block */}
      <div
        className={cm.cn(
          'absolute inset-0 flex flex-col justify-center items-start px-3',
          'text-white/95',
        )}
      >
        <p
          className={cm.cn(
            size === 'lg' ? 'text-base' : 'text-[10px]',
            'font-bold leading-tight line-clamp-3',
          )}
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {title}
        </p>
        <p
          className={cm.cn(
            size === 'lg' ? 'text-xs' : 'text-[8px]',
            'mt-1 uppercase tracking-widest text-white/70 truncate max-w-full',
          )}
        >
          {author}
        </p>
        {size === 'lg' ? <div className={cm.cn('mt-3 w-8 border-t-2 border-white/40')} /> : null}
      </div>
    </div>
  )
}
