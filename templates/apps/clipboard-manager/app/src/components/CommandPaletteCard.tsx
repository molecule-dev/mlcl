import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CategoryPill, type ClipCategory } from './CategoryPill.js'
import { KbdBadge } from './KbdBadge.js'

export interface PaletteResult {
  id: string
  /** Material symbol icon name. */
  icon: string
  /** Single-line preview. */
  preview: string
  /** Category for the badge on the right. */
  category: ClipCategory
  /** Shortcut shown on the right (e.g. "↵" or "⌘2"). */
  shortcut: string
  /** Tint icon color (hex). Optional. */
  iconColor?: string
}

interface CommandPaletteCardProps {
  /** Pre-filled query to render in the search box (no user typing here). */
  query?: string
  /** Active result index (highlighted row). */
  activeIndex?: number
  /** Result rows. */
  results: ReadonlyArray<PaletteResult>
  /** Footer right-side label. Defaults to product name. */
  footerLabel?: string
}

/**
 * Static command-palette mockup card. Used on the Landing hero and on
 * the CommandPalette page to demonstrate keyboard-driven retrieval.
 *
 * NOT interactive — purely visual. The real palette is wired up via
 * `@molecule/app-command-palette-cmdk` on the CommandPalette page.
 */
export function CommandPaletteCard({
  query = '',
  activeIndex = 0,
  results,
  footerLabel = `${APP_NAME} Pro`,
}: CommandPaletteCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.w('full'),
        'max-w-[560px] mx-auto bg-surface rounded-xl overflow-hidden border border-outline-variant/40',
      )}
      style={{
        boxShadow: '0 20px 50px -12px rgba(91,106,191,0.18), 0 0 0 1px rgba(91,106,191,0.08)',
      }}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'border-b border-outline-variant/40 bg-surface-container-lowest',
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn('material-symbols-outlined text-on-surface-variant mr-3 text-xl')}
        >
          search
        </span>
        <span
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('medium'),
            'flex-1 font-mono text-on-surface truncate',
          )}
        >
          {query}
          <span className={cm.cn('ml-0.5 text-primary animate-pulse')} aria-hidden="true">
            |
          </span>
        </span>
        <KbdBadge>esc</KbdBadge>
      </div>

      <ul className={cm.cn(cm.sp('p', 2), 'space-y-0.5')}>
        {results.map((result, idx) => {
          const isActive = idx === activeIndex
          return (
            <li
              key={result.id}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                'rounded-md transition-colors group',
                isActive ? 'bg-primary-container/30' : 'hover:bg-surface-container-low',
              )}
            >
              <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0 flex-1')}>
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined text-sm flex-shrink-0')}
                  style={{
                    color:
                      result.iconColor ??
                      (isActive ? 'var(--color-primary)' : 'var(--color-icon-neutral)'),
                  }}
                >
                  {result.icon}
                </span>
                <span className={cm.cn(cm.textSize('sm'), 'truncate font-mono text-on-surface')}>
                  {result.preview}
                </span>
              </span>
              <span
                className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-shrink-0 ml-3')}
              >
                <CategoryPill category={result.category} compact />
                <KbdBadge>{result.shortcut}</KbdBadge>
              </span>
            </li>
          )
        })}
      </ul>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 4),
          cm.sp('py', 2),
          'border-t border-outline-variant/40 bg-surface-container-lowest',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.textSize('xs'),
            'text-on-surface-variant',
          )}
        >
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <KbdBadge>↑</KbdBadge>
            <KbdBadge>↓</KbdBadge>
            <span className={cm.cn('ml-1')}>
              {t('commandPalette.footerNavigate', {}, { defaultValue: 'to navigate' })}
            </span>
          </span>
          <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
            <KbdBadge>↵</KbdBadge>
            <span className={cm.cn('ml-1')}>
              {t('commandPalette.footerPaste', {}, { defaultValue: 'to paste' })}
            </span>
          </span>
        </div>
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'text-primary uppercase tracking-wider font-mono',
          )}
        >
          {footerLabel}
        </span>
      </div>
    </div>
  )
}

export default CommandPaletteCard
