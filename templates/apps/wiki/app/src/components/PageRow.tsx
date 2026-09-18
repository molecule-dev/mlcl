import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StatPill, type StatPillTone } from './StatPill.js'

/**
 * Editorial wiki page row — the workhorse list item for Home (recent),
 * Spaces (per-space pages), Search (results), Trash (archived) and
 * Profile (contributions). Mirrors DESIGN.md "Search Results" + page-tree
 * typography.
 *
 * Translated from blog/ArticleListItem.tsx + crm/ActivityFeed.tsx — same
 * anatomy (icon, title, breadcrumb metadata, status pill, hover lift)
 * with Cairn's slate-on-paper palette and indigo internal-link hue.
 */

export interface PageRowEntry {
  id: string
  title: string
  /** Breadcrumb segments (e.g. ['Engineering', 'Architecture']). */
  breadcrumb: string[]
  /** Optional snippet shown on the second line (search results). */
  snippet?: string
  /** Initials shown in the avatar circle. */
  authorInitials: string
  /** Free-form last-edited string (e.g. "2h ago" or "Updated Jan 4"). */
  lastEdited: string
  /** Page status — draft / published / archived / locked. */
  status?: StatPillTone
  /** Override the navigation target (default `/page/:id`). */
  href?: string
  /** Material symbol name shown in the leading icon tile. */
  icon?: string
}

export interface PageRowProps {
  entry: PageRowEntry
  onClick?: (entry: PageRowEntry) => void
}

export function PageRow({ entry, onClick }: PageRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const href = entry.href ?? `/page/${entry.id}`

  return (
    <Link
      to={href}
      onClick={onClick ? () => onClick(entry) : undefined}
      className={cm.cn(
        cm.flex({ align: 'start', gap: 'md' }),
        cm.sp('p', 4),
        'group rounded-xl bg-surface-container-lowest border border-outline-variant/40 hover:-translate-y-0.5 hover:shadow-sm transition-all',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'h-10 w-10 shrink-0 rounded-lg bg-primary/10 text-primary',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-[20px]')} aria-hidden="true">
          {entry.icon ?? 'description'}
        </span>
      </div>

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'min-w-0 flex-1')}>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <h3
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'truncate text-on-surface group-hover:text-primary transition-colors',
            )}
          >
            {entry.title}
          </h3>
          {entry.status ? (
            <StatPill tone={entry.status}>
              {t(
                `pageRow.status.${entry.status}`,
                {},
                { defaultValue: entry.status.charAt(0).toUpperCase() + entry.status.slice(1) },
              )}
            </StatPill>
          ) : null}
        </div>

        {entry.breadcrumb.length > 0 ? (
          <p className={cm.cn(cm.textSize('xs'), 'truncate text-on-surface-variant')}>
            {entry.breadcrumb.join(' / ')}
          </p>
        ) : null}

        {entry.snippet ? (
          <p
            className={cm.cn(
              cm.textSize('sm'),
              // /90 alpha dropped snippets to 3.9:1 on white (axe serious); solid = 4.8:1
              'line-clamp-2 text-on-surface-variant leading-relaxed',
            )}
          >
            {entry.snippet}
          </p>
        ) : null}

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 1))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'h-6 w-6 rounded-full bg-secondary/15 text-secondary',
            )}
            aria-hidden="true"
          >
            {entry.authorInitials}
          </span>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {entry.lastEdited}
          </span>
        </div>
      </div>
    </Link>
  )
}
