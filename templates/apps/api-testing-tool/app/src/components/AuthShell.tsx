import type { ReactNode } from 'react'

import {
  AuthShellCard,
  AuthShellContainer,
  AuthShellDecoration,
} from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE, BRAND_COLOR, SURFACE_DARK } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { SafeLink } from './SafeLink.js'

/**
 * Branded auth shell — dark grid backdrop, brand wordmark with terminal
 * status pill ("runners online"), centered card, and decorative monospace
 * request-log corner traces matching the Stitch baseline.
 */

const BORDER = 'var(--color-border)'

interface AuthShellProps {
  children: ReactNode
  title: string
  subtitle?: string
  footer?: ReactNode
  statusLabel?: string
}

const TOP_LEFT_LOG = ['→ GET /health 200 OK 14ms', '→ POST /auth/session 201 Created 42ms'].join(
  '\n',
)

const BOTTOM_RIGHT_LOG = ['← 200 OK application/json', '← 401 Unauthorized'].join('\n')

export function AuthShell({ children, title, subtitle, footer, statusLabel }: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pillLabel =
    statusLabel ?? t('authShell.statusLabel', {}, { defaultValue: 'runners online' })
  return (
    <AuthShellContainer
      layout="column"
      className={cm.cn('font-body antialiased')}
      style={{ backgroundColor: SURFACE_DARK, color: 'var(--color-text-primary)' }}
    >
      <AuthShellDecoration>
        {/* Subtle grid backdrop */}
        <div
          aria-hidden="true"
          className={cm.cn('absolute inset-0 -z-10 pointer-events-none')}
          style={{
            backgroundImage:
              'linear-gradient(color-mix(in srgb, var(--color-text) 3.5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-text) 3.5%, transparent) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Emerald spotlight */}
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute top-1/4 left-1/2 -translate-x-1/2 -z-10 w-[60rem] h-[60rem] rounded-full pointer-events-none',
          )}
          style={{ background: BRAND_COLOR, filter: 'blur(140px)', opacity: 0.1 }}
        />
        {/* Decorative monospace request-log corners */}
        <pre
          aria-hidden="true"
          className={cm.cn(
            'absolute top-4 left-4 font-mono text-[10px] opacity-30 pointer-events-none whitespace-pre select-none m-0',
          )}
          style={{ color: 'var(--color-method-get)' }}
        >
          {TOP_LEFT_LOG}
        </pre>
        <pre
          aria-hidden="true"
          className={cm.cn(
            'absolute bottom-4 right-4 font-mono text-[10px] opacity-30 pointer-events-none whitespace-pre select-none m-0 text-right',
          )}
          style={{ color: 'var(--color-method-post)' }}
        >
          {BOTTOM_RIGHT_LOG}
        </pre>
      </AuthShellDecoration>

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          {/* Brand header — wordmark + status pill */}
          <header className={cm.cn('text-center mb-6')}>
            <div className={cm.cn('mb-4')}>
              <div
                className={cm.cn('inline-flex items-center gap-2 px-3 py-1 rounded-full')}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
                }}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn('h-1.5 w-1.5 rounded-full animate-pulse')}
                  style={{ backgroundColor: 'var(--color-primary)' }}
                />
                <span
                  className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                  style={{ color: 'var(--color-primary)' }}
                >
                  {pillLabel}
                </span>
              </div>
            </div>
            <SafeLink to="/">
              <BrandWordmark as="span" size="lg" />
            </SafeLink>
            <p
              className={cm.cn('mt-1 font-mono text-xs')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <span>v1.0.4 · </span>
              {APP_TAGLINE}
            </p>
          </header>

          <AuthShellCard
            outerClassName={cm.cn(cm.w('full'))}
            surfaceClassName={cm.cn('rounded-xl')}
            className={cm.cn(cm.sp('p', 8), 'flex flex-col gap-6')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: `1px solid ${BORDER}`,
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div>
              <h1
                className={cm.cn('text-lg font-bold tracking-tight')}
                style={{ color: 'var(--color-text)' }}
              >
                {title}
              </h1>
              {subtitle ? (
                <p
                  className={cm.cn('mt-1 text-sm')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {subtitle}
                </p>
              ) : null}
            </div>
            {children}
          </AuthShellCard>

          {footer ? (
            <footer
              className={cm.cn('mt-6 text-center text-sm')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {footer}
            </footer>
          ) : null}

          {/* Keyboard hint */}
          <div
            className={cm.cn('mt-6 text-xs flex items-center justify-center gap-1 font-mono')}
            style={{ color: 'var(--color-text-muted)' }}
          >
            <kbd
              className={cm.cn('px-1.5 py-0.5 rounded text-[10px]')}
              style={{
                backgroundColor: 'var(--color-border-light)',
                border: `1px solid ${BORDER}`,
              }}
            >
              ⌘
            </kbd>
            <kbd
              className={cm.cn('px-1.5 py-0.5 rounded text-[10px]')}
              style={{
                backgroundColor: 'var(--color-border-light)',
                border: `1px solid ${BORDER}`,
              }}
            >
              K
            </kbd>
            <span className={cm.cn('ml-2')}>anywhere to open command palette</span>
          </div>
        </div>
      </main>
    </AuthShellContainer>
  )
}
