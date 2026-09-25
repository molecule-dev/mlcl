import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ThemeToggle } from './ThemeToggle.js'
import { UserMenu } from './UserMenu.js'

export interface AiImageGeneratorTopBarProps {
  title: string
  /** Optional subtitle / breadcrumb shown beneath the title in muted ink. */
  subtitle?: string
  /** Optional credits balance pill — pass a formatted number. */
  credits?: number
  /** Slot for action buttons rendered to the right of the title. */
  actions?: ReactNode
}

/**
 * Sticky page title bar paired with the sidebar layout — title + breadcrumb on
 * the left, credits pill, theme toggle and user menu on the right. The mobile
 * menu trigger lives in the shared `ResponsiveAppShell`'s own top bar, so this
 * bar sticks just below it below the `md` breakpoint (`top-14`) and flush with
 * the viewport edge from `md` up. Glass-tint background blends with the dreamy
 * gradient surface.
 */
export function AiImageGeneratorTopBar({
  title,
  subtitle,
  credits,
  actions,
}: AiImageGeneratorTopBarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        cm.sp('px', 4),
        'md:px-8',
        cm.sp('py', 4),
        'sticky top-14 md:top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 min-w-0',
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 'sm' }) + ' min-w-0 flex-1'}>
        <div className={cm.flex({ direction: 'col' }) + ' min-w-0'}>
          <h1
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface truncate',
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant mt-0.5 truncate max-w-[60ch]',
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className={cm.flex({ align: 'center', gap: 'sm' }) + ' shrink-0'}>
        {actions}
        {typeof credits === 'number' && (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'rounded-full bg-primary-container/40 text-primary border border-primary/20',
            )}
            title={t('topBar.creditsTooltip', {}, { defaultValue: 'Generation credits' })}
          >
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>
              token
            </span>
            <span className={cm.cn('font-mono')}>{credits.toLocaleString()}</span>
          </span>
        )}
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
