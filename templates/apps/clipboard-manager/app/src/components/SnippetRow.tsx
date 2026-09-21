import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { CategoryPill, type ClipCategory } from './CategoryPill.js'
import { KbdBadge } from './KbdBadge.js'

export interface SnippetItem {
  id: string
  /** Body preview — single-line, will be truncated. */
  preview: string
  /** Tag/icon for the category. */
  category: ClipCategory
  /** Material symbol name, e.g. `terminal`, `link`, `description`. */
  sourceIcon?: string
  /** Source app or context, e.g. "VS Code". */
  sourceLabel?: string
  /** Relative timestamp ready for display ("2m ago", "Yesterday"). */
  timestamp: string
  /** Pinned snippets pin to the top with an amber accent. */
  pinned?: boolean
  /** Encrypted snippets render `••••` instead of the preview. */
  encrypted?: boolean
  /** Optional keyboard shortcut to render at the right edge on hover. */
  shortcut?: string
}

interface SnippetRowProps {
  snippet: SnippetItem
  active?: boolean
  onSelect?: (id: string) => void
}

/**
 * Dense single-line snippet row. Mirrors the DESIGN.md "Snippet Row"
 * spec: 12/16 padding, monospace preview, category pill + relative
 * timestamp on the right, optional pinned/encrypted icon on the left,
 * left-border accent when active.
 *
 * Mobile (<md): rows render as tappable CARDS — bordered, 44px min
 * height (touch target), stacked by the parent's grid — since the
 * hover-revealed affordances a desktop row relies on don't exist on
 * touch.
 */
export function SnippetRow({ snippet, active = false, onSelect }: SnippetRowProps) {
  const cm = getClassMap()
  const previewText = snippet.encrypted ? '••••••••••••••••' : snippet.preview
  const leftIcon = snippet.encrypted
    ? { name: 'lock', color: 'var(--color-icon-lock)' }
    : snippet.pinned
      ? { name: 'push_pin', color: 'var(--color-icon-pin)' }
      : { name: 'content_copy', color: 'var(--color-icon-neutral)' }

  return (
    <button
      type="button"
      onClick={() => onSelect?.(snippet.id)}
      className={cm.cn(
        cm.flex({ align: 'center' }),
        cm.w('full'),
        cm.sp('px', 3),
        'group relative text-left rounded-md transition-colors hover:bg-surface-container-low min-h-[44px] md:min-h-0 py-3 md:py-2 border md:border-0 border-outline-variant/40',
        active ? 'bg-primary-container/30' : 'bg-surface-container-lowest',
      )}
      style={{
        boxShadow: active
          ? `inset 3px 0 0 ${BRAND_COLOR}`
          : snippet.pinned
            ? 'inset 3px 0 0 var(--color-pinned)'
            : snippet.encrypted
              ? 'inset 3px 0 0 var(--color-icon-lock)'
              : 'inset 3px 0 0 transparent',
      }}
    >
      <span
        aria-hidden="true"
        className={cm.cn('material-symbols-outlined mr-3 text-[16px] flex-shrink-0')}
        style={{
          color: leftIcon.color,
          fontVariationSettings: snippet.pinned ? "'FILL' 1" : "'FILL' 0",
        }}
      >
        {leftIcon.name}
      </span>

      <span
        className={cm.cn(
          cm.textSize('sm'),
          'flex-1 truncate font-mono text-on-surface',
          snippet.encrypted ? 'tracking-widest' : '',
        )}
      >
        {previewText}
      </span>

      <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-shrink-0 ml-3')}>
        <CategoryPill category={snippet.category} compact />

        {snippet.sourceIcon && snippet.sourceLabel && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'text-[10px] text-on-surface-variant',
            )}
          >
            <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
              {snippet.sourceIcon}
            </span>
            <span className={cm.cn('hidden md:inline')}>{snippet.sourceLabel}</span>
          </span>
        )}

        {snippet.shortcut ? (
          <span className={cm.cn('opacity-0 group-hover:opacity-100 transition-opacity')}>
            <KbdBadge>{snippet.shortcut}</KbdBadge>
          </span>
        ) : (
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant font-mono whitespace-nowrap',
            )}
          >
            {snippet.timestamp}
          </span>
        )}
      </span>
    </button>
  )
}

export default SnippetRow
