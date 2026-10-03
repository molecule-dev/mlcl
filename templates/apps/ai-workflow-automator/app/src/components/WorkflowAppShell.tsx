/**
 * Auth'd-area shell — the SHARED `ResponsiveAppShell` compound from
 * `@molecule/app-ui-react`, composed to Dendrite's chrome: dark sidebar
 * (WorkflowSidebar pieces) + top bar (search + new-workflow CTA) + the page
 * header band around one `<main>`.
 *
 * The shell owns the breakpoint split (768px, one chrome mounted per
 * breakpoint): the desktop Sidebar and the mobile Drawer (full APG dialog —
 * focus trap, Escape/backdrop close, scroll lock, auto-close on navigation)
 * receive the SAME `WorkflowNav` element, and the mobile menu trigger is
 * rendered by the shell's TopBar itself. The former hand-rolled
 * `hidden md:flex` aside and portal drawer (MobileNavMenu) are deleted with
 * the migration.
 */
import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ResponsiveAppShell, useIsDesktop } from '@molecule/app-ui-react'

import { SafeLink } from './SafeLink.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'
import { WorkflowBrandBlock, WorkflowNav, WorkflowStatusFooter } from './WorkflowSidebar.js'

interface WorkflowAppShellProps {
  title: string
  eyebrow?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  /** When true, content fills the viewport without padding (used by the canvas builder). */
  flush?: boolean
  /** Identifies the page for `data-mol-id="page-<pageId>"` on the content wrapper. */
  pageId?: string
}

export function WorkflowAppShell({
  title,
  eyebrow,
  description,
  actions,
  children,
  flush = false,
  pageId,
}: WorkflowAppShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  // Top-bar leading slot: the brand block (mobile) and the global search
  // (desktop) share the row — the shell renders its menu trigger before it
  // below 768px. Visibility swaps are CSS-only: neither is nav chrome, so no
  // landmark/id is ever duplicated.
  const leading = (
    <div className="min-w-0">
      <WorkflowBrandBlock />
    </div>
  )

  const navAriaLabel = t('workflowSidebar.navLabel', {}, { defaultValue: 'Primary navigation' })

  // The shell's TopBar is mobile-only: a non-mobileOnly TopBar becomes a
  // squeezed flex-row COLUMN on desktop (the shared shell's documented
  // composition is mobileOnly + desktop chrome elsewhere). On desktop the
  // search + New-workflow cluster renders as the content column's header
  // strip — only one copy mounts per breakpoint.
  const topActions = (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}>
      <SafeLink
        to="/templates"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'rounded-full text-white shadow-md transition-all hover:-translate-y-0.5 h-10',
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))',
          boxShadow: '0 4px 12px color-mix(in srgb, var(--color-node-trigger) 30%, transparent)',
        }}
      >
        <span
          className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}
          style={{ color: 'white' }}
        >
          bolt
        </span>
        <span className="hidden sm:inline">
          {t('workflowAppShell.newWorkflow', {}, { defaultValue: 'New workflow' })}
        </span>
        <span className="sm:hidden">
          {t('workflowAppShell.newWorkflowShort', {}, { defaultValue: 'New' })}
        </span>
      </SafeLink>
      {/* Styled hosts for the shared controls — bare, they read as
          unstyled browser widgets bolted onto the styled top bar. */}
      <div className="text-foreground-secondary hover:text-foreground transition-colors rounded-lg hover:bg-surface/10">
        <ThemeToggle />
      </div>
      <div className="text-foreground-secondary hover:text-foreground transition-colors">
        <UserMenu />
      </div>
    </div>
  )
  const isDesktop = useIsDesktop()

  return (
    <ResponsiveAppShell sidebarWidth={260} className="bg-background text-foreground font-body">
      <ResponsiveAppShell.TopBar
        mobileOnly
        brand={leading}
        className="bg-surface/80 backdrop-blur-md"
        actions={topActions}
      />

      {/*
        Desktop sidebar (>=768px): brand block + grouped nav + status footer
        on the dark sidebar surface.
      */}
      <ResponsiveAppShell.Sidebar
        navLabel={navAriaLabel}
        // Dendrite's dark sidebar surface — `!` so it wins over the shell's
        // `cm.surface` background/border token.
        className="[background:var(--color-sidebar)]! [border-color:var(--color-sidebar-border)]! border-r"
      >
        <div
          className={cm.cn(cm.sp('px', 4), cm.sp('py', 4))}
          style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}
        >
          <WorkflowBrandBlock />
        </div>
        <WorkflowNav />
      </ResponsiveAppShell.Sidebar>

      {/*
        Mobile drawer (<768px): the shell's APG dialog over the SAME nav
        element, brand in the header, status row in the footer. `h-full`
        restores the full-height left-panel geometry (the shared panel ships
        no height token — same as the exemplar shell).
      */}
      <ResponsiveAppShell.Drawer
        navLabel={navAriaLabel}
        header={<WorkflowBrandBlock />}
        footer={<WorkflowStatusFooter />}
        className="h-full [background:var(--color-sidebar)]! [border-color:var(--color-sidebar-border)]! border-r"
      >
        <WorkflowNav />
      </ResponsiveAppShell.Drawer>

      <ResponsiveAppShell.Content>
        <div
          className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'))}
          data-mol-id={pageId ? `page-${pageId}` : undefined}
        >
          {/* Desktop top strip — search + actions (see TopBar note above). */}
          {isDesktop && !flush && (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                cm.sp('px', 4),
                'md:px-8 h-14 shrink-0 items-center border-b bg-surface/80 backdrop-blur-md',
              )}
            >
              <div
                className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
                style={{ color: 'var(--color-foreground-secondary)' }}
              >
                <span className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}>
                  search
                </span>
                <input
                  type="search"
                  placeholder={t(
                    'workflowAppShell.searchPlaceholder',
                    {},
                    { defaultValue: 'Search workflows, runs, templates…' },
                  )}
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    cm.sp('px', 2),
                    'bg-transparent border-0 focus:ring-0 focus:outline-none w-72 text-foreground placeholder:text-foreground-secondary',
                  )}
                />
              </div>
              {topActions}
            </div>
          )}
          {/* Page header band */}
          {!flush && (
            <div
              className={cm.cn(
                cm.sp('px', 4),
                'md:px-8',
                cm.sp('pt', 6),
                'md:pt-8',
                cm.sp('pb', 4),
              )}
              style={{ background: 'var(--color-background)' }}
            >
              <div className="max-w-7xl mx-auto">
                <div
                  className={cm.cn(
                    cm.flex({ align: 'start', justify: 'between', gap: 'md' }),
                    'flex-wrap',
                  )}
                >
                  <div className={'min-w-0'}>
                    {eyebrow && (
                      <div
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          cm.sp('mb', 1),
                          'uppercase tracking-widest',
                        )}
                        style={{ color: 'var(--color-secondary)' }}
                      >
                        {eyebrow}
                      </div>
                    )}
                    <h1
                      className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
                      style={{ color: 'var(--color-foreground)' }}
                    >
                      {title}
                    </h1>
                    {description && (
                      <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), cm.textMuted)}>
                        {description}
                      </p>
                    )}
                  </div>
                  {actions && (
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>{actions}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <main
            className={cm.cn(
              'flex-1',
              flush ? '' : cm.cn(cm.sp('px', 4), 'md:px-8', cm.sp('pb', 12)),
            )}
          >
            {flush ? children : <div className="max-w-7xl mx-auto">{children}</div>}
          </main>
        </div>
      </ResponsiveAppShell.Content>
    </ResponsiveAppShell>
  )
}
