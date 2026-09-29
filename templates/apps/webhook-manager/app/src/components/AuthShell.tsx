import type { ReactNode } from 'react'
import { Link } from 'react-router'

import {
  AuthShellCard,
  AuthShellContainer,
  AuthShellDecoration,
} from '@molecule/app-auth-shell-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE, BRAND_COLOR } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'

/**
 * Branded auth shell — dark grid backdrop, brand wordmark with terminal
 * status pill, centered card, decorative monospace webhook-log corners.
 */

interface AuthShellProps {
  children: ReactNode
  title: string
  subtitle?: string
  footer?: ReactNode
  statusLabel?: string
}

const TOP_LEFT_LOG = [
  '→ POST /webhooks/ep_8a3f 201 Created 142ms',
  '→ POST /webhooks/ep_2c11 200 OK 84ms',
].join('\n')

const BOTTOM_RIGHT_LOG = ['← 200 application/json', '← retry (2/5) 200 OK'].join('\n')

export function AuthShell({
  children,
  title,
  subtitle,
  footer,
  statusLabel = 'delivery uplink',
}: AuthShellProps) {
  const cm = getClassMap()
  return (
    <AuthShellContainer
      layout="column"
      className={cm.cn('font-body antialiased')}
      style={{ backgroundColor: 'var(--mol-color-background)', color: 'var(--mol-color-text)' }}
    >
      <AuthShellDecoration>
        <div
          aria-hidden="true"
          className={cm.cn('absolute inset-0 -z-10 pointer-events-none')}
          style={{
            backgroundImage:
              'linear-gradient(color-mix(in srgb, var(--mol-color-text) 4%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--mol-color-text) 4%, transparent) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute top-1/4 left-1/2 -translate-x-1/2 -z-10 w-[60rem] h-[60rem] rounded-full pointer-events-none',
          )}
          style={{ background: BRAND_COLOR, filter: 'blur(140px)', opacity: 0.1 }}
        />
        <pre
          aria-hidden="true"
          className={cm.cn(
            'absolute top-4 left-4 font-mono text-[10px] opacity-30 pointer-events-none whitespace-pre select-none m-0',
          )}
          style={{ color: 'var(--mol-color-primary)' }}
        >
          {TOP_LEFT_LOG}
        </pre>
        <pre
          aria-hidden="true"
          className={cm.cn(
            'absolute bottom-4 right-4 font-mono text-[10px] opacity-30 pointer-events-none whitespace-pre select-none m-0 text-right',
          )}
          style={{ color: 'var(--mol-color-secondary)' }}
        >
          {BOTTOM_RIGHT_LOG}
        </pre>
      </AuthShellDecoration>

      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.flex1, cm.sp('p', 6))}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <header className={cm.cn('text-center mb-6')}>
            <div className={cm.cn('mb-4')}>
              <div
                className={cm.cn('inline-flex items-center gap-2 px-3 py-1 rounded-full')}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--mol-color-primary) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--mol-color-primary) 30%, transparent)',
                }}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn('h-1.5 w-1.5 rounded-full animate-pulse')}
                  style={{ backgroundColor: BRAND_COLOR }}
                />
                <span
                  className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                  style={{ color: BRAND_COLOR }}
                >
                  {statusLabel}
                </span>
              </div>
            </div>
            <Link to="/" className={cm.cn('inline-flex')}>
              <BrandWordmark as="span" size="lg" invert />
            </Link>
            <p
              className={cm.cn('mt-1 font-mono text-xs')}
              style={{ color: 'var(--mol-color-text-secondary)' }}
            >
              {/* no opacity wrapper — it dimmed this to 4.11:1 on the dark canvas (axe fail);
                  the muted text-secondary token carries the de-emphasis */}
              <span>v1.0.0 · </span>
              {APP_TAGLINE}
            </p>
          </header>

          <AuthShellCard
            outerClassName={cm.cn(cm.w('full'))}
            surfaceClassName={cm.cn('rounded-xl')}
            className={cm.cn(cm.sp('p', 8), 'flex flex-col gap-6')}
            style={{
              backgroundColor: 'var(--mol-color-surface)',
              border: '1px solid var(--mol-color-border)',
              boxShadow: '0 30px 80px -30px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div>
              <h1
                className={cm.cn('text-lg font-bold tracking-tight')}
                style={{ color: 'var(--mol-color-text)' }}
              >
                {title}
              </h1>
              {subtitle ? (
                <p
                  className={cm.cn('mt-1 text-sm')}
                  style={{ color: 'var(--mol-color-text-secondary)' }}
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
              style={{ color: 'var(--mol-color-text-secondary)' }}
            >
              {footer}
            </footer>
          ) : null}

          <div
            className={cm.cn('mt-6 text-xs flex items-center justify-center gap-1 font-mono')}
            style={
              // solid muted token — the 60% color-mix fade was 4.11:1 on the dark canvas (axe fail)
              { color: 'var(--mol-color-text-secondary)' }
            }
          >
            <kbd
              className={cm.cn('px-1.5 py-0.5 rounded text-[10px]')}
              style={{
                backgroundColor: 'var(--mol-color-background-tertiary)',
                border: '1px solid var(--mol-color-border)',
              }}
            >
              ⌘
            </kbd>
            <kbd
              className={cm.cn('px-1.5 py-0.5 rounded text-[10px]')}
              style={{
                backgroundColor: 'var(--mol-color-background-tertiary)',
                border: '1px solid var(--mol-color-border)',
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
