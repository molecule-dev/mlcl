import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useDefaultWorkspace, useWorkspacePages } from '../lib/api.js'

/**
 * Graph view — placeholder. The note-taking template doesn't track
 * inter-note backlinks yet (no links table / parser), so the graph
 * rendering would be either fake or a single dot per page. We render a
 * page count summary instead and link out to the Notes list. When a
 * backlink graph is wired in (parsing `[[wiki]]` links from blocks
 * into a `note_links` table), this page can be upgraded.
 */
export function Graph() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { workspace } = useDefaultWorkspace()
  const { pages, loading } = useWorkspacePages(workspace?.id)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 10), 'mx-auto w-full max-w-4xl')}>
      <header className={cm.cn('mb-10 max-w-2xl')}>
        <p
          className={cm.cn(
            'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant mb-2',
          )}
        >
          {t('graph.eyebrow', {}, { defaultValue: 'Graph' })}
        </p>
        <h1
          className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface')}
          style={{
            fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
          }}
        >
          {t('graph.title', {}, { defaultValue: 'Knowledge graph' })}
        </h1>
        <p
          className={cm.cn(cm.sp('mt', 3), 'text-on-surface-variant text-base')}
          data-testid="graph-summary"
        >
          {loading
            ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
            : t(
                'graph.subtitle',
                { count: pages.length },
                {
                  defaultValue:
                    '{{count}} notes in this workspace. Backlink graph rendering will appear here once notes link to each other.',
                },
              )}
        </p>
      </header>

      <div
        className={cm.cn(
          cm.sp('p', 10),
          'rounded-2xl border border-dashed border-outline-variant text-center',
        )}
        data-testid="graph-placeholder"
      >
        <span
          className={cm.cn('material-symbols-outlined text-[44px] text-on-surface-variant')}
          aria-hidden="true"
        >
          hub
        </span>
        <p className={cm.cn('mt-3 text-on-surface text-lg font-bold')}>
          {t('graph.placeholderTitle', {}, { defaultValue: 'Backlink graph coming soon' })}
        </p>
        <p className={cm.cn('mt-2 text-on-surface-variant text-sm max-w-md mx-auto')}>
          {t(
            'graph.placeholderBody',
            {},
            {
              defaultValue:
                'When notes start linking to each other (with [[wiki]] syntax), an interactive force-directed graph will render here.',
            },
          )}
        </p>
        <Link
          to="/notes"
          className={cm.cn('mt-4 inline-block text-sm font-bold text-primary hover:opacity-80')}
        >
          {t('graph.goToNotes', {}, { defaultValue: 'Browse notes →' })}
        </Link>
      </div>
    </div>
  )
}

export default Graph
