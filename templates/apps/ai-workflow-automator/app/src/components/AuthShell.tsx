import type { ReactNode } from 'react'
import { Link } from 'react-router'

import {
  AuthShellCard,
  AuthShellContainer,
  AuthShellDecoration,
} from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'

interface AuthShellProps {
  heading: string
  subhead: string
  children: ReactNode
  footer?: ReactNode
  pageId?: string
}

/**
 * Dendrite branded auth shell — dotted-grid background, top-left and
 * bottom-right decorative node-graph SVG orbs, centered card slot.
 */
export function AuthShell({ heading, subhead, children, footer, pageId }: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <AuthShellContainer
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        'font-body',
      )}
      style={{ background: 'var(--mol-color-background)', color: 'var(--mol-color-on-background)' }}
    >
      <div data-mol-id={pageId ? `page-${pageId}` : undefined} className={cm.cn('contents')} />

      <AuthShellDecoration>
        {/* Dotted grid background */}
        <div
          aria-hidden="true"
          className={cm.cn('absolute inset-0 z-0 pointer-events-none')}
          style={{
            backgroundImage:
              'radial-gradient(color-mix(in srgb, var(--color-accent-violet) 8%, transparent) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Top-left node graph */}
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute top-0 left-0 w-64 h-64 opacity-50 z-0 pointer-events-none hidden md:block',
          )}
        >
          <svg fill="none" viewBox="0 0 200 200">
            <path
              d="M50 50 L100 100 L150 50"
              stroke="var(--color-node-trigger)"
              strokeOpacity="0.3"
              strokeWidth="2"
            />
            <circle cx="50" cy="50" fill="var(--color-node-trigger)" fillOpacity="0.4" r="8" />
            <circle cx="100" cy="100" fill="var(--color-node-condition)" fillOpacity="0.4" r="8" />
            <circle cx="150" cy="50" fill="var(--color-node-action)" fillOpacity="0.4" r="8" />
          </svg>
        </div>

        {/* Bottom-right node graph */}
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute bottom-0 right-0 w-64 h-64 opacity-50 z-0 pointer-events-none hidden md:block',
          )}
        >
          <svg fill="none" viewBox="0 0 200 200">
            <path
              d="M50 150 L100 100 L150 150"
              stroke="var(--color-node-trigger)"
              strokeOpacity="0.3"
              strokeWidth="2"
            />
            <circle cx="50" cy="150" fill="var(--color-node-action)" fillOpacity="0.4" r="8" />
            <circle cx="100" cy="100" fill="var(--color-node-condition)" fillOpacity="0.4" r="8" />
            <circle cx="150" cy="150" fill="var(--color-node-trigger)" fillOpacity="0.4" r="8" />
          </svg>
        </div>

        {/* Blurred orbs */}
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none z-0',
          )}
          style={{ background: 'color-mix(in srgb, var(--color-node-trigger) 18%, transparent)' }}
        />
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none z-0',
          )}
          style={{ background: 'color-mix(in srgb, var(--color-node-condition) 18%, transparent)' }}
        />
      </AuthShellDecoration>

      <AuthShellCard
        outerClassName={cm.cn(cm.w('full'), 'max-w-[440px] relative z-10')}
        surfaceClassName={cm.cn('rounded-2xl shadow-2xl')}
        className={cm.cn(cm.sp('p', 8))}
        style={{
          background: 'var(--mol-color-surface)',
          boxShadow: '0 24px 60px color-mix(in srgb, black 12%, transparent)',
        }}
      >
        {/* Brand mark + heading */}
        <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), cm.sp('mb', 6))}>
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 5))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded-xl shadow-lg',
              )}
              style={{
                width: 40,
                height: 40,
                background:
                  'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))',
                boxShadow:
                  '0 6px 16px color-mix(in srgb, var(--color-node-trigger) 35%, transparent)',
              }}
            >
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
                style={{ color: 'white', fontVariationSettings: "'FILL' 1" }}
              >
                bolt
              </span>
            </div>
            <span
              className={cm.cn(cm.fontWeight('bold'), cm.textSize('2xl'))}
              style={{ color: 'var(--color-text-dark-invert)', letterSpacing: '-0.02em' }}
            >
              {t('authShell.brand', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </span>
          </Link>
          <h1
            className={cm.cn(cm.fontWeight('bold'), 'text-[28px] tracking-tight text-center')}
            style={{ color: 'var(--color-text-dark-invert)' }}
          >
            {heading}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-center')}
            style={{ color: 'var(--color-status-muted-fg)' }}
          >
            {subhead}
          </p>
        </div>

        {children}

        {footer && (
          <div
            className={cm.cn(cm.sp('mt', 6), cm.textCenter, cm.textSize('sm'))}
            style={{ color: 'var(--color-status-muted-fg)' }}
          >
            {footer}
          </div>
        )}
      </AuthShellCard>

      <footer className={cm.cn(cm.sp('mt', 8), 'relative z-10')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'lg' }),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'uppercase tracking-widest',
          )}
          style={{ color: 'var(--color-status-muted-fg)' }}
        >
          <LegalModalLinks
            linkClassName={cm.cn('hover:text-primary transition-colors')}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
          />
          <Link to="/help" className={cm.cn('hover:text-primary transition-colors')}>
            {t('authShell.support', {}, { defaultValue: 'Support' })}
          </Link>
        </div>
      </footer>
    </AuthShellContainer>
  )
}
