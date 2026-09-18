import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { type PageTreeNode, PageTreeSidebar } from './PageTreeSidebar.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

interface ApiSpace {
  id: string
  name: string
  slug: string
}

interface ApiPage {
  id: string
  title: string
  space_id: string
  parent_id: string | null
  updated_at: string | null
}

interface ApiMe {
  defaultSpace?: { id: string; name: string; slug: string }
}

/**
 * Authenticated app shell — persistent left rail (PageTreeSidebar) +
 * thin breadcrumb header + content slot. Matches DESIGN.md hard
 * constraint: "Every authenticated screen renders inside the shared
 * shell — never full-bleed."
 *
 * Translated from helpdesk-ticketing/AppShell + crm/AppShellLayout —
 * same anatomy (sticky sidebar, top-bar with breadcrumb + user menu,
 * scrolling main) tuned to Cairn's calm/editorial mood.
 */

export function WikiLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [tree, setTree] = useState<PageTreeNode[]>([])
  const [recent, setRecent] = useState<{ id: string; title: string }[]>([])
  const [workspaceName, setWorkspaceName] = useState<string>(APP_NAME)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        // Calling /api/me first guarantees the user has at least one
        // seeded space + welcome page before we render the tree (the
        // backend ensures this idempotently on first read).
        const meRes = await http.get<ApiMe>('/me').catch(() => null)
        if (cancelled) return
        if (meRes?.data?.defaultSpace?.name) setWorkspaceName(meRes.data.defaultSpace.name)
        const [spacesRes, pagesRes] = await Promise.all([
          http.get<ApiSpace[]>('/spaces').catch(() => null),
          http
            .get<ApiPage[]>('/pages', { params: { sort: 'updated_at', order: 'desc', limit: 8 } })
            .catch(() => null),
        ])
        if (cancelled) return
        const spaces: ApiSpace[] = Array.isArray(spacesRes?.data) ? spacesRes!.data : []
        const pages: ApiPage[] = Array.isArray(pagesRes?.data) ? pagesRes!.data : []
        const treeNodes: PageTreeNode[] = spaces.map((s) => ({
          id: s.id,
          title: s.name,
          children: pages
            .filter((p) => p.space_id === s.id)
            .slice(0, 6)
            .map((p) => ({ id: p.id, title: p.title })),
        }))
        setTree(treeNodes)
        setRecent(pages.slice(0, 4).map((p) => ({ id: p.id, title: p.title })))
      } catch (_error) {
        // Sidebar empty is non-fatal; missing spaces/pages is recoverable.
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div className={cm.cn(cm.flex({}), 'min-h-screen bg-surface-container-lowest/50')}>
      <PageTreeSidebar tree={tree} recentPages={recent} workspaceName={workspaceName} />
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0 flex-1')}>
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('px', 8),
            'h-14 border-b border-outline-variant/40 bg-surface-container-lowest/80 backdrop-blur',
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <button
              type="button"
              onClick={() => navigate('/search')}
              aria-label={t('common.search', {}, { defaultValue: 'Search' })}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 3),
                'h-8 w-72 rounded-md bg-surface-container-high text-sm text-on-surface-variant hover:bg-surface-container-highest transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                search
              </span>
              {t(
                'wikiLayout.searchPlaceholder',
                { appName: APP_NAME },
                { defaultValue: 'Search {{appName}} — pages, comments…' },
              )}
              <span
                className={cm.cn(
                  cm.sp('px', 1),
                  'ml-auto rounded text-[10px] font-mono bg-surface-container-lowest border border-outline-variant/60',
                )}
                aria-hidden="true"
              >
                ⌘K
              </span>
            </button>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main className={cm.cn(cm.sp('px', 10), cm.sp('py', 10), 'flex-1')}>
          <div className={cm.cn('mx-auto max-w-6xl')}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
