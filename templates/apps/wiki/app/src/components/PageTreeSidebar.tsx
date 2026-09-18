import { useState } from 'react'
import { Link, useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Persistent left-rail page tree — the spine of every authenticated
 * Cairn screen per DESIGN.md "Page tree sidebar is persistent on
 * desktop". Top section: workspace switcher + new-page CTA. Middle:
 * top-level navigation (Home / Search / Spaces / Templates /
 * Notifications / Comments / Trash). Bottom: recent pages with
 * collapsible nesting per "Page Tree Item" spec (32px row,
 * 16px-per-level indent, hover + active backgrounds).
 *
 * Translated from blog/SideNavBar.tsx + helpdesk-ticketing sidebar —
 * same anatomy (vertical stack, section headings in 10px tracking-widest,
 * active row primary background) with Cairn's editorial mood.
 */

export interface PageTreeNode {
  id: string
  title: string
  children?: PageTreeNode[]
}

export interface PageTreeSidebarProps {
  /** Recent pages (top 5-8). */
  recentPages?: { id: string; title: string }[]
  /** Hierarchical workspace tree, top-level spaces with nested pages. */
  tree?: PageTreeNode[]
  /** Workspace name shown in the top switcher. */
  workspaceName?: string
}

const NAV_ITEMS: Array<{ key: string; href: string; icon: string; defaultLabel: string }> = [
  { key: 'home', href: '/home', icon: 'home', defaultLabel: 'Home' },
  { key: 'search', href: '/search', icon: 'search', defaultLabel: 'Search' },
  { key: 'spaces', href: '/spaces', icon: 'workspaces', defaultLabel: 'Spaces' },
  { key: 'templates', href: '/templates', icon: 'description', defaultLabel: 'Templates' },
  {
    key: 'notifications',
    href: '/notifications',
    icon: 'notifications',
    defaultLabel: 'Notifications',
  },
  { key: 'comments', href: '/comments', icon: 'forum', defaultLabel: 'Comments' },
  { key: 'team', href: '/team', icon: 'group', defaultLabel: 'Team' },
  { key: 'trash', href: '/trash', icon: 'delete', defaultLabel: 'Trash' },
]

function TreeRow({
  node,
  depth,
  pathname,
}: {
  node: PageTreeNode
  depth: number
  pathname: string
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(depth === 0)
  const hasChildren = (node.children?.length ?? 0) > 0
  const href = `/page/${node.id}`
  const active = pathname === href

  return (
    <li>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          'h-8 rounded-md text-sm transition-colors',
          active
            ? 'bg-primary/15 text-primary font-medium'
            : 'text-on-surface-variant hover:bg-surface-container-high',
        )}
        style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: '8px' }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cm.cn('material-symbols-outlined text-[14px] opacity-70 hover:opacity-100')}
            aria-label={
              expanded
                ? t('pageTreeSidebar.collapse', {}, { defaultValue: 'Collapse' })
                : t('pageTreeSidebar.expand', {}, { defaultValue: 'Expand' })
            }
          >
            {expanded ? 'expand_more' : 'chevron_right'}
          </button>
        ) : (
          <span className={cm.cn('inline-block w-[14px]')} aria-hidden="true" />
        )}
        <Link to={href} className={cm.cn('flex min-w-0 flex-1 items-center gap-2')}>
          <span
            className={cm.cn('material-symbols-outlined text-[16px] opacity-70')}
            aria-hidden="true"
          >
            {hasChildren ? 'folder' : 'description'}
          </span>
          <span className={cm.cn('truncate')}>{node.title}</span>
        </Link>
      </div>
      {hasChildren && expanded ? (
        <ul>
          {node.children!.map((child) => (
            <TreeRow key={child.id} node={child} depth={depth + 1} pathname={pathname} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function PageTreeSidebar({ recentPages, tree, workspaceName }: PageTreeSidebarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { pathname } = useLocation()

  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'w-[280px] shrink-0 h-screen sticky top-0 border-r border-outline-variant/40 bg-surface-container-lowest',
      )}
    >
      <div className={cm.cn(cm.sp('p', 4), 'border-b border-outline-variant/40')}>
        <Link to="/home" className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-secondary text-white',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-[18px]')}>layers</span>
          </span>
          <div className={cm.flex({ direction: 'col' })}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface')}>
              {APP_NAME}
            </span>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {workspaceName ??
                t('pageTreeSidebar.defaultWorkspace', {}, { defaultValue: 'Engineering' })}
            </span>
          </div>
        </Link>
        <Link
          to="/page/new/edit"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            'h-9 w-full rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-primary-hover transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
            add
          </span>
          {t('pageTreeSidebar.newPage', {}, { defaultValue: 'New page' })}
        </Link>
      </div>

      <nav className={cm.cn(cm.sp('p', 2), 'flex-1 overflow-y-auto')}>
        <ul className={cm.cn(cm.stack(0))}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            return (
              <li key={item.key}>
                <Link
                  to={item.href}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    'h-8 rounded-md text-sm transition-colors',
                    active
                      ? 'bg-primary/15 text-primary font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container-high',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  {t(`pageTreeSidebar.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
                </Link>
              </li>
            )
          })}
        </ul>

        {tree && tree.length > 0 ? (
          <div className={cm.sp('mt', 6)}>
            <p
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('mb', 2),
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('pageTreeSidebar.workspaceHeader', {}, { defaultValue: 'Workspace' })}
            </p>
            <ul className={cm.stack(0)}>
              {tree.map((node) => (
                <TreeRow key={node.id} node={node} depth={0} pathname={pathname} />
              ))}
            </ul>
          </div>
        ) : null}

        {recentPages && recentPages.length > 0 ? (
          <div className={cm.sp('mt', 6)}>
            <p
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('mb', 2),
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('status.recent', {}, { defaultValue: 'Recent' })}
            </p>
            <ul className={cm.stack(0)}>
              {recentPages.map((p) => {
                const href = `/page/${p.id}`
                const active = pathname === href
                return (
                  <li key={p.id}>
                    <Link
                      to={href}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.sp('px', 3),
                        'h-8 rounded-md text-sm transition-colors',
                        active
                          ? 'bg-primary/15 text-primary font-medium'
                          : 'text-on-surface-variant hover:bg-surface-container-high',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[16px] opacity-70')}
                        aria-hidden="true"
                      >
                        description
                      </span>
                      <span className={cm.cn('truncate')}>{p.title}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </nav>
    </aside>
  )
}
