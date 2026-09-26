/**
 * AuthShell — shared centered-card frame for Login / Signup / Forgot /
 * Reset.
 *
 * Brand band (SignalLoop wordmark + tagline) over a glassy gradient strip,
 * centered card with subtle decorative orbs, footer band with theme toggle.
 *
 * Translated from blog/LoginMainContent.tsx centered-card pattern fused
 * with personal-finance/AuthShell brand-eyebrow header.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { AuthShellCardColumn } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { loadContent } from '../config.js'
import { ThemeToggle } from './ThemeToggle.js'

interface AuthShellProps {
  /** Page eyebrow (small uppercase line above the card). */
  eyebrow: string
  /** Page heading inside the card. */
  heading: string
  /** Body copy under the heading. */
  description?: string
  /** The form children. */
  children: ReactNode
  /** Optional below-card link slot. */
  footer?: ReactNode
}

export function AuthShell({ eyebrow, heading, description, children, footer }: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background relative overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          cm.w(60),
          cm.h(60),
          cm.roundedFull,
          'absolute -top-32 -right-32 bg-primary/10 blur-3xl pointer-events-none',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          cm.w(60),
          cm.h(60),
          cm.roundedFull,
          'absolute -bottom-32 -left-32 bg-secondary/10 blur-3xl pointer-events-none',
        )}
        aria-hidden="true"
      />

      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 5),
          'relative z-10',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ direction: 'col' }))}>
          <span
            className={cm.cn(cm.fontWeight('bold'), 'text-2xl tracking-tight')}
            style={{ color: 'var(--color-primary, var(--color-pinned))' }}
          >
            {APP_NAME}
          </span>
          <span
            className={cm.cn(
              cm.fontWeight('medium'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {APP_TAGLINE}
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <AuthShellCardColumn
        as="main"
        className={cm.cn(cm.flex1, cm.sp('px', 6), cm.sp('py', 8), 'relative z-10')}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'w-full max-w-md')}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textCenter,
              'text-[11px] uppercase tracking-widest',
            )}
            style={{ color: 'var(--color-primary, var(--color-pinned))' }}
          >
            {eyebrow}
          </span>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'md' }),
              cm.sp('p', 8),
              'rounded-2xl border border-outline-variant/40 bg-surface shadow-sm',
            )}
          >
            {/* Card heading — a <div>, not <header>: the shell topbar above is the
                page's one header; a second <header> reads as a duplicate app bar. */}
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.textCenter)}>
              <h1
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-2xl md:text-3xl tracking-tight text-on-surface',
                )}
              >
                {heading}
              </h1>
              {description && (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {description}
                </p>
              )}
            </div>
            {children}
          </div>
          {footer && (
            <div className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}>
              {footer}
            </div>
          )}
        </div>
      </AuthShellCardColumn>

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
          cm.sp('px', 6),
          cm.sp('py', 5),
          cm.textSize('xs'),
          'relative z-10 text-on-surface-variant flex-wrap',
        )}
      >
        <Link to="/about" className={cm.cn('hover:text-primary transition-colors')}>
          {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
        </Link>
        <Link to="/boards" className={cm.cn('hover:text-primary transition-colors')}>
          {t('authShell.communities', {}, { defaultValue: 'Communities' })}
        </Link>
        <Link to="/feed" className={cm.cn('hover:text-primary transition-colors')}>
          {t('authShell.trending', {}, { defaultValue: 'Trending' })}
        </Link>
        <LegalModalLinks
          linkClassName={cm.cn('hover:text-primary transition-colors')}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
        />
        <span>
          {t(
            'authShell.copyright',
            { appName: APP_NAME },
            { defaultValue: '{{appName}} — every voice counts.' },
          )}
        </span>
      </footer>
    </div>
  )
}

export default AuthShell
