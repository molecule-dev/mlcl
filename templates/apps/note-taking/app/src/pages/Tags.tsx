import { useMemo } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useDefaultWorkspace, useWorkspacePages } from '../lib/api.js'

const TAG_REGEX = /#([\p{L}\p{N}_-]{2,32})/gu

interface TagSummary {
  name: string
  count: number
}

/**
 * Tags index — derives tags from `#hashtags` found in page titles
 * (lightweight; no separate tags table required). Empty state guides
 * the user to add hashtags to their note titles.
 */
export function Tags() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { workspace, error: wsError } = useDefaultWorkspace()
  const { pages, loading, error: pagesError } = useWorkspacePages(workspace?.id)
  const fetchError = wsError ?? pagesError

  const tags: TagSummary[] = useMemo(() => {
    const counts = new Map<string, number>()
    for (const page of pages) {
      const matches = (page.title || '').matchAll(TAG_REGEX)
      const seen = new Set<string>()
      for (const m of matches) {
        const tag = m[1]?.toLowerCase()
        if (!tag || seen.has(tag)) continue
        seen.add(tag)
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [pages])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 10), 'mx-auto w-full max-w-6xl')}>
      <header className={cm.cn('mb-10 max-w-2xl')}>
        <p
          className={cm.cn(
            'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant mb-2',
          )}
        >
          {t('tags.eyebrow', {}, { defaultValue: 'Index' })}
        </p>
        <h1
          className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface')}
          style={{
            fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
          }}
        >
          {t('form.tags', {}, { defaultValue: 'Tags' })}
        </h1>
        <p
          className={cm.cn(cm.sp('mt', 3), 'text-on-surface-variant text-base')}
          data-testid="tags-summary"
        >
          {t(
            'tags.subtitle',
            { tags: tags.length, notes: pages.length },
            {
              defaultValue:
                "{{tags}} tags across {{notes}} notes. Add #hashtags to a note title and they'll appear here.",
            },
          )}
        </p>
      </header>

      {fetchError ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('p', 4),
            'mb-6 rounded-2xl border border-error/40 bg-error/5 text-on-surface max-w-2xl',
          )}
        >
          {t(
            'tags.loadError',
            { message: fetchError.message },
            { defaultValue: 'Could not load tags: {{message}}' },
          )}
        </div>
      ) : null}
      {loading ? (
        <p className={cm.cn('text-sm text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : tags.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 10),
            'rounded-2xl border border-dashed border-outline-variant text-center max-w-2xl',
          )}
          data-testid="tags-empty"
        >
          <span
            className={cm.cn('material-symbols-outlined text-[44px] text-on-surface-variant')}
            aria-hidden="true"
          >
            sell
          </span>
          <p className={cm.cn('mt-3 text-on-surface text-lg font-bold')}>
            {t('tags.emptyTitle', {}, { defaultValue: 'No tags yet' })}
          </p>
          <p className={cm.cn('mt-2 text-on-surface-variant text-sm max-w-md mx-auto')}>
            {t(
              'tags.emptyBody',
              {},
              {
                defaultValue:
                  'Add #hashtags to a note title (e.g. "Reading list #books") and they will appear here automatically.',
              },
            )}
          </p>
          <Link
            to="/notes"
            className={cm.cn(
              'mt-4 inline-flex min-h-[40px] items-center text-sm font-bold text-primary hover:opacity-80',
            )}
          >
            {t('tags.goToNotes', {}, { defaultValue: 'Go to notes →' })}
          </Link>
        </div>
      ) : (
        <section
          className={cm.cn(
            'rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm overflow-hidden',
          )}
          data-testid="tags-table"
        >
          <table className={cm.cn('w-full')}>
            <thead>
              <tr
                className={cm.cn(
                  'border-b border-outline-variant/40 text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                <th className={cm.cn('text-left px-6 py-3')}>
                  {t('tags.col.tag', {}, { defaultValue: 'Tag' })}
                </th>
                <th className={cm.cn('text-right px-6 py-3')}>
                  {t('form.notes', {}, { defaultValue: 'Notes' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant/30')}>
              {tags.map((tag) => (
                <tr
                  key={tag.name}
                  className={cm.cn('hover:bg-surface-container-low/40 transition-colors')}
                >
                  <td className={cm.cn('px-6 py-4')}>
                    <span className={cm.cn('text-primary font-bold')}>#{tag.name}</span>
                  </td>
                  <td
                    className={cm.cn(
                      'px-6 py-4 text-right tabular-nums font-extrabold text-on-surface',
                    )}
                  >
                    {tag.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}

export default Tags
