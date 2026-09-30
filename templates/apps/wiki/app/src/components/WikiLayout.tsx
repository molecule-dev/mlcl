import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell } from '@molecule/app-ui-react'

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
 * Authenticated app shell — the shared `ResponsiveAppShell` around one
 * content region: a desktop sidebar (≥768px, the PageTreeSidebar with brand +
 * nav + page tree + theme/user footer) and a mobile dialog drawer (<768px,
 * full APG contract) fed the SAME sidebar element — the shell instantiates
 * only the mounted breakpoint's copy, renders the menu trigger itself and
 * owns the drawer open state, Escape/backdrop handling and
 * auto-close-on-navigate. The TopBar is mobile-only (trigger + search +
 * theme + user); on desktop the sidebar carries the chrome, so the shell row
 * is exactly sidebar + full-width content. Matches DESIGN.md hard
 * constraint: "Every authenticated screen renders inside the shared shell —
 * never full-bleed."
 */

export function WikiLayout() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()
  const [tree, setTree] = useState<PageTreeNode[]>([])
  const [recent, setRecent] = useState<{ id: string; title: string }[]>([])
  const [workspaceName, setWorkspaceName] = useState<string>(APP_NAME)

  useEffect(() => {
    // Only load once authenticated — a mid-session auth transition (logout,
    // cleared session) must not fire unauthenticated /spaces + /pages fetches.
    if (!isAuthenticated) return undefined
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
  }, [http, isAuthenticated])

  // The SAME nav element for both breakpoints — only the mounted
  // breakpoint's copy instantiates, so its links stay unique in the DOM.
  const sidebar = <PageTreeSidebar tree={tree} recentPages={recent} workspaceName={workspaceName} />

  // Chrome shared across breakpoints — only one side ever mounts it (the
  // TopBar renders <768px, the sidebar footer ≥768px).
  const userRow = (
    <>
      <ThemeToggle />
      <UserMenu />
    </>
  )

  return (
    <ResponsiveAppShell sidebarWidth="md">
      {/* Mobile only — on desktop the sidebar carries the brand + user row. */}
      <ResponsiveAppShell.TopBar
        mobileOnly
        actions={
          <>
            <button
              type="button"
              onClick={() => navigate('/search')}
              aria-label={t('common.search', {}, { defaultValue: 'Search' })}
              data-mol-id="search-trigger"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'h-10 w-10 rounded-md bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                search
              </span>
            </button>
            {userRow}
          </>
        }
      />
      {/* Sidebar footer (≥768px) — styled so the theme/user controls don't
          render as bare browser controls bolted onto the sidebar. The mobile
          TopBar keeps the shared bare `userRow` (its actions slot needs no
          footer chrome). */}
      <ResponsiveAppShell.Sidebar
        footer={
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              'w-full border-t border-outline-variant/40 pt-3',
            )}
          >
            <div className="text-on-surface-variant hover:text-on-surface transition-colors">
              <UserMenu />
            </div>
            <div className="text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container">
              <ThemeToggle />
            </div>
          </div>
        }
      >
        {sidebar}
      </ResponsiveAppShell.Sidebar>
      <ResponsiveAppShell.Drawer>{sidebar}</ResponsiveAppShell.Drawer>
      <ResponsiveAppShell.Content className="px-4 py-6 sm:px-10 sm:py-10">
        <div className={cm.cn('mx-auto max-w-6xl')}>
          <Outlet />
        </div>
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
