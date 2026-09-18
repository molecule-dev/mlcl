import { Link } from 'react-router'

import { t as translate } from '@molecule/app-i18n'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Knowledge-space card — square emoji/glyph icon on a tinted tile,
 * space title in extrabold, two-line description in muted body, and
 * an article-count footer with a per-space accent stripe along the
 * top edge.
 *
 * Translated from document-collaboration/QuillonDocumentCard.tsx and
 * online-store/CategoryTile — adapted to Cairn's grounded, library-
 * cataloging voice.
 */
export interface CairnSpaceCardProps {
  /** Space slug used in the route (`/spaces/:spaceKey`). */
  spaceKey: string
  name: string
  description: string
  /** Material Symbols glyph name (e.g. `engineering`, `policy`). */
  icon: string
  /** Total articles in the space. */
  articleCount: number
  /**
   * Active editors / maintainers in the last 30 days. Omit when the caller
   * has no real editor data — the tile is hidden rather than showing a
   * fabricated count.
   */
  editorCount?: number
  /** Hex accent color drawn at the top of the card. */
  accentColor?: string
  /** ISO timestamp of the last article update in the space. */
  updatedAt?: string
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

export function CairnSpaceCard({
  spaceKey,
  name,
  description,
  icon,
  articleCount,
  editorCount,
  accentColor = '#0f766e',
  updatedAt,
}: CairnSpaceCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const target = `/spaces/${spaceKey}`

  return (
    <article
      className={cm.cn(
        cm.sp('p', 6),
        'group relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40',
      )}
    >
      <span
        aria-hidden="true"
        className={cm.cn('absolute inset-x-0 top-0 h-1')}
        style={{ backgroundColor: accentColor }}
      />

      <Link to={target} className={cm.cn('block')}>
        <div className={cm.flex({ align: 'start', gap: 'md' })}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-14 w-14 shrink-0 rounded-xl text-on-primary',
            )}
            style={{ backgroundColor: accentColor }}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined')} style={{ fontSize: '1.75rem' }}>
              {icon}
            </span>
          </span>
          <div className={cm.cn('min-w-0 flex-1')}>
            <h3
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('extrabold'),
                'truncate tracking-tight text-on-surface group-hover:text-primary',
              )}
            >
              {name}
            </h3>
            <p
              className={cm.cn(
                cm.sp('mt', 1),
                cm.textSize('sm'),
                'text-on-surface-variant line-clamp-2',
              )}
            >
              {description}
            </p>
          </div>
        </div>
      </Link>

      <div
        className={cm.cn(
          cm.sp('mt', 5),
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.textSize('xs'),
            'text-on-surface-variant',
          )}
        >
          <span className={cm.flex({ align: 'center', gap: 'xs' })}>
            <span
              className={cm.cn('material-symbols-outlined')}
              aria-hidden="true"
              style={{ fontSize: '1rem' }}
            >
              article
            </span>
            <span className={cm.cn(cm.fontWeight('semibold'), 'tabular-nums')}>
              {t(
                'cairnSpaceCard.articleCount',
                { count: articleCount },
                { defaultValue: '{{count}} articles' },
              )}
            </span>
          </span>
          {editorCount === undefined ? null : (
            <span className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span
                className={cm.cn('material-symbols-outlined')}
                aria-hidden="true"
                style={{ fontSize: '1rem' }}
              >
                group
              </span>
              <span className={cm.cn(cm.fontWeight('semibold'), 'tabular-nums')}>
                {t(
                  'cairnSpaceCard.editorCount',
                  { count: editorCount },
                  { defaultValue: '{{count}} editors' },
                )}
              </span>
            </span>
          )}
        </div>
        {updatedAt ? (
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'cairnSpaceCard.updated',
              { when: fmtRelative(updatedAt) },
              { defaultValue: 'updated {{when}}' },
            )}
          </span>
        ) : null}
      </div>
    </article>
  )
}
