import { Link } from 'react-router'

import { t as translate } from '@molecule/app-i18n'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type CairnArticleStatus, CairnArticleStatusPill } from './CairnArticleStatusPill.js'

/**
 * Editorial article row — title in extrabold, breadcrumb of
 * `Space › Section`, status pill, last-edited timestamp, and an
 * author byline. Used in Drafts, Bookmarks, Profile and the Home
 * "Recently updated" feed.
 *
 * Translated from blog/PostListItem.tsx and
 * document-collaboration/QuillonActivityRow.tsx — keeps Cairn's
 * library / runbook voice (no exclamation points, sober timestamps).
 */
export interface CairnArticleRowProps {
  id: string
  title: string
  excerpt: string
  spaceName: string
  /** Optional sub-section (e.g. "Engineering › Runbooks › Postgres"). */
  sectionPath?: string[]
  authorName: string
  authorInitials: string
  /** Hex avatar background. Defaults to a deterministic teal/amber. */
  authorColor?: string
  status: CairnArticleStatus
  /** ISO timestamp. */
  updatedAt: string
  /** Override the auto `/article/:id` link target. */
  href?: string
  /** Show a small bookmark glyph in the top-right. */
  bookmarked?: boolean
}

function fmtRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffH = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffH < 1) return translate('common.justNow', {}, { defaultValue: 'just now' })
  if (diffH < 24)
    return translate('time.hoursAgo', { count: diffH }, { defaultValue: '{{count}}h ago' })
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7)
    return translate('time.daysAgo', { count: diffD }, { defaultValue: '{{count}}d ago' })
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const PALETTE = ['#0f766e', '#d97706', '#7c3aed', '#16a34a', '#0d9488', '#b45309'] as const

function hashPick(id: string, override?: string): string {
  if (override) return override
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]!
}

export function CairnArticleRow({
  id,
  title,
  excerpt,
  spaceName,
  sectionPath,
  authorName,
  authorInitials,
  authorColor,
  status,
  updatedAt,
  href,
  bookmarked = false,
}: CairnArticleRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const target = href ?? `/article/${id}`
  const avatarColor = hashPick(id, authorColor)

  const breadcrumb =
    sectionPath && sectionPath.length > 0 ? [spaceName, ...sectionPath].join(' \u203a ') : spaceName

  return (
    <article
      className={cm.cn(
        cm.sp('p', 5),
        'group relative rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40',
      )}
    >
      <Link to={target} className={cm.cn('block')}>
        <div className={cm.flex({ align: 'start', justify: 'between', gap: 'md' })}>
          <div className={cm.cn('min-w-0 flex-1')}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('extrabold'),
                'truncate uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {breadcrumb}
            </p>
            <h3
              className={cm.cn(
                cm.sp('mt', 1),
                cm.textSize('lg'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-on-surface group-hover:text-primary',
              )}
            >
              {title}
            </h3>
            <p
              className={cm.cn(
                cm.sp('mt', 2),
                cm.textSize('sm'),
                'leading-relaxed text-on-surface-variant line-clamp-2',
              )}
              style={{ fontFamily: 'Georgia, "Iowan Old Style", serif' }}
            >
              {excerpt}
            </p>
          </div>
          {bookmarked ? (
            <span
              className={cm.cn('material-symbols-outlined shrink-0 text-secondary')}
              aria-label={t('cairnArticleRow.bookmarked', {}, { defaultValue: 'Bookmarked' })}
              style={{ fontSize: '1.25rem' }}
            >
              bookmark
            </span>
          ) : null}
        </div>
      </Link>

      <div
        className={cm.cn(
          cm.sp('mt', 4),
          cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-6 w-6 rounded-full text-[10px] font-extrabold text-white shadow-sm',
            )}
            style={{ backgroundColor: avatarColor }}
            aria-hidden="true"
          >
            {authorInitials}
          </span>
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            <span className={cm.fontWeight('semibold')}>{authorName}</span>
            {' \u00b7 '}
            <span>
              {t(
                'cairnArticleRow.updated',
                { when: fmtRelative(updatedAt) },
                { defaultValue: 'updated {{when}}' },
              )}
            </span>
          </span>
        </div>
        <CairnArticleStatusPill status={status} />
      </div>
    </article>
  )
}
