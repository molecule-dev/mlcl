import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'

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
  const location = useLocation()
  const http = useHttpClient()
  const [tree, setTree] = useState<PageTreeNode[]>([])
  const [recent, setRecent] = useState<{ id: string; title: string }[]>([])
  const [workspaceName, setWorkspaceName] = useState<string>(APP_NAME)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Close the mobile drawer on any navigation — it overlays the page it links to.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

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
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            'h-14 px-3 sm:px-8 border-b border-outline-variant/40 bg-surface-container-lowest/80 backdrop-blur sticky top-0 z-30',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0 flex-1')}>
            {/* Mobile-only hamburger — opens the page-tree drawer (below md). */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t('wikiLayout.openMenu', {}, { defaultValue: 'Open navigation' })}
              aria-expanded={drawerOpen}
              aria-controls="wiki-mobile-nav-panel"
              data-mol-id="mobile-nav-trigger"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'h-10 w-10 shrink-0 rounded-md text-on-surface-variant hover:bg-surface-container-high transition-colors md:hidden',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[22px]')} aria-hidden="true">
                menu
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/search')}
              aria-label={t('common.search', {}, { defaultValue: 'Search' })}
              data-mol-id="search-trigger"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                'h-9 w-10 sm:w-72 sm:px-3 rounded-md bg-surface-container-high text-sm text-on-surface-variant hover:bg-surface-container-highest transition-colors justify-center sm:justify-start min-w-0',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                search
              </span>
              <span className={cm.cn('hidden sm:inline truncate')}>
                {t(
                  'wikiLayout.searchPlaceholder',
                  { appName: APP_NAME },
                  { defaultValue: 'Search {{appName}} — pages, comments…' },
                )}
              </span>
              <span
                className={cm.cn(
                  cm.sp('px', 1),
                  'hidden md:inline ml-auto rounded text-[10px] font-mono bg-surface-container-lowest border border-outline-variant/60',
                )}
                aria-hidden="true"
              >
                ⌘K
              </span>
            </button>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}>
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main className={cm.cn('px-4 sm:px-10', cm.sp('py', 10), 'py-6 sm:py-10 flex-1')}>
          <div className={cm.cn('mx-auto max-w-6xl')}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile nav drawer (below md): hosts the SAME PageTreeSidebar the
          desktop rail renders, in a slide-in panel over a backdrop. */}
      {drawerOpen ? (
        <div className={cm.cn('md:hidden')} data-mol-id="mobile-nav-root">
          <button
            type="button"
            aria-label={t('wikiLayout.closeMenu', {}, { defaultValue: 'Close navigation' })}
            className={cm.cn('fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm')}
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            id="wiki-mobile-nav-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t('wikiLayout.menu', {}, { defaultValue: 'Navigation' })}
            className={cm.cn(
              'fixed inset-y-0 left-0 z-[61] w-[280px] max-w-[85vw] shadow-xl overflow-y-auto',
            )}
          >
            <PageTreeSidebar
              variant="drawer"
              tree={tree}
              recentPages={recent}
              workspaceName={workspaceName}
            />
          </aside>
        </div>
      ) : null}
    </div>
  )
}
