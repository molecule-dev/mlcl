/**
 * Auth'd-area shell — dark sidebar (260px) + top bar + scroll area.
 *
 * Translated from ai-chatbot-builder's BotsListMainContent split-pane shape,
 * adapted for Dendrite's workflow-automation chrome (cleaner top bar, search
 * + new-workflow CTA).
 */
import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { SafeLink } from './SafeLink.js'
import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'
import { WorkflowSidebar } from './WorkflowSidebar.js'

interface WorkflowAppShellProps {
  title: string
  eyebrow?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  /** When true, content fills the viewport without padding (used by the canvas builder). */
  flush?: boolean
  /** Identifies the page for `data-mol-id="page-<pageId>"` on the root container. */
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

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'bg-background text-foreground font-body')}
      data-mol-id={pageId ? `page-${pageId}` : undefined}
    >
      <WorkflowSidebar />

      <div className={'ml-[260px] min-h-screen flex flex-col'}>
        {/* Top bar */}
        <header
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('px', 8),
            cm.sp('py', 4),
            'sticky top-0 z-20 bg-surface/80 backdrop-blur-md border-b',
          )}
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
                style={{ color: 'var(--color-foreground-secondary)' }}
              >
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
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <SafeLink
              to="/templates"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-full text-white shadow-md transition-all hover:-translate-y-0.5',
              )}
              style={{
                background:
                  'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))',
                boxShadow:
                  '0 4px 12px color-mix(in srgb, var(--color-node-trigger) 30%, transparent)',
              }}
            >
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}
                style={{ color: 'white' }}
              >
                bolt
              </span>
              {t('workflowAppShell.newWorkflow', {}, { defaultValue: 'New workflow' })}
            </SafeLink>
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        {/* Page header band */}
        {!flush && (
          <div
            className={cm.cn(cm.sp('px', 8), cm.sp('pt', 8), cm.sp('pb', 4))}
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
        <main className={cm.cn('flex-1', flush ? '' : cm.cn(cm.sp('px', 8), cm.sp('pb', 12)))}>
          {flush ? children : <div className="max-w-7xl mx-auto">{children}</div>}
        </main>
      </div>
    </div>
  )
}
