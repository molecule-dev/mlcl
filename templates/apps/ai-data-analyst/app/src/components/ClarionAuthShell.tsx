/**
 * Brand-consistent auth-page shell — gradient brand glyph + heading +
 * subhead, frosted card on a soft mesh background with two decorative
 * orbs, and a footer slot for sibling-page navigation links.
 *
 * Translated from personal-finance/LoginBrandingHeader + LoginCard
 * envelope. Using the catalog §13.1 centered-card variant with the
 * Clarion gradient orbs (the data-analyst brand reads minimal/utility, so
 * §13.3 brand-panel would be over-extended here).
 *
 * Used by Login / Signup / ForgotPassword / ResetPassword so all four
 * pages stay byte-identical in chrome and only diverge in the form +
 * footer slots.
 *
 * Privacy/Terms render here as IN-PLACE modals (`LegalModalLinks`) — the
 * bonded legal HTML is pre-loaded via `loadContent`, so the standalone
 * `/privacy` and `/terms` routes still exist for direct/deep links but the
 * auth flow never navigates away.
 */
import type { ReactNode } from 'react'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { loadContent } from '../config.js'

export interface ClarionAuthShellProps {
  /** Card heading (e.g. "Sign in", "Create account"). */
  heading: string
  /** Optional sub-text under the heading. */
  subheading?: string
  /** Form / OAuth slot. */
  children: ReactNode
  /** Footer slot — typically a sibling-page link ("New to Clarion? Sign up"). */
  footer?: ReactNode
}

export function ClarionAuthShell({ heading, subheading, children, footer }: ClarionAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.sp('px', 4),
        cm.sp('py', 12),
        'relative overflow-hidden bg-background text-on-surface',
      )}
    >
      <span
        aria-hidden="true"
        className={
          'absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-3xl'
        }
      />
      <span
        aria-hidden="true"
        className={
          'absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-secondary/20 blur-3xl'
        }
      />
      <span
        aria-hidden="true"
        className={'absolute inset-0 opacity-[0.04] pointer-events-none'}
        style={{
          backgroundImage:
            'linear-gradient(var(--color-on-surface) 1px, transparent 1px), linear-gradient(90deg, var(--color-on-surface) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <main className={cm.cn(cm.w('full'), 'relative z-10 max-w-[440px]')}>
        <header
          className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 3 }), cm.sp('mb', 8))}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(14),
              cm.h(14),
              cm.roundedFull,
              'bg-gradient-to-br from-primary to-primary-container shadow-[0_18px_36px_rgba(53,37,205,0.28)]',
            )}
          >
            <span
              className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined text-on-primary')}
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              auto_awesome
            </span>
          </span>
          <div className={cm.flex({ direction: 'col', align: 'center', gap: 1 })}>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'font-headline tracking-tighter text-on-surface',
              )}
            >
              {APP_NAME}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-[0.22em] text-on-surface-variant',
              )}
            >
              {APP_TAGLINE}
            </p>
          </div>
        </header>

        <div
          className={cm.cn(
            cm.sp('p', 8),
            'bg-surface-container-lowest rounded-3xl shadow-[0_24px_60px_color-mix(in_srgb,var(--color-on-background)_8%,transparent)] border border-outline-variant/40 sm:p-10 relative overflow-hidden',
          )}
        >
          <span
            aria-hidden="true"
            className={'absolute -top-16 -right-16 w-40 h-40 rounded-full bg-primary/10 blur-2xl'}
          />

          <div className={cm.cn(cm.textCenter, cm.sp('mb', 6), 'relative z-10')}>
            <h2
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'font-headline tracking-tight text-on-surface',
              )}
            >
              {heading}
            </h2>
            {subheading ? (
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 2),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {subheading}
              </p>
            ) : null}
          </div>

          <div className={'relative z-10'}>{children}</div>
        </div>

        {footer ? (
          <p
            className={cm.cn(
              cm.sp('mt', 8),
              cm.textCenter,
              cm.textSize('sm'),
              'text-on-surface-variant',
            )}
          >
            {footer}
          </p>
        ) : null}

        <nav
          className={cm.cn(
            cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'md' }),
            cm.sp('mt', footer ? 5 : 8),
            cm.textSize('xs'),
            'text-on-surface-variant',
          )}
        >
          <LegalModalLinks
            linkClassName={cm.cn(cm.fontWeight('semibold'), 'hover:text-primary transition-colors')}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
          />
        </nav>
      </main>
    </div>
  )
}

export default ClarionAuthShell
