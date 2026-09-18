import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * Branded centered-card auth shell — soft lavender background with the
 * Plume quote-pattern (defined in index.css), wordmark in heavy primary,
 * Lora-italic tagline, and a card body slot for the form. The footer
 * link slot routes back to Sign in / Sign up depending on the page.
 *
 * Translated from POLISHED-PATTERN-CATALOG §13.1 (Centered Card) +
 * blog brand-mark variant in §13.7.
 */
export interface PlumeAuthShellProps {
  /** Heading shown above the form (e.g. "Welcome back"). */
  headingKey: string
  headingDefault: string
  /** Sub-copy under the heading (e.g. "Sign in to continue writing"). */
  subheadingKey: string
  subheadingDefault: string
  /** The form body. */
  children: ReactNode
  /** Footer prompt (e.g. "New to Plume?"). Optional. */
  footerPromptKey?: string
  footerPromptDefault?: string
  /** Footer link label (e.g. "Create an account"). Optional. */
  footerLinkKey?: string
  footerLinkDefault?: string
  /** Footer link target. Defaults to /signup. */
  footerLinkTo?: string
}

export function PlumeAuthShell({
  headingKey,
  headingDefault,
  subheadingKey,
  subheadingDefault,
  children,
  footerPromptKey,
  footerPromptDefault,
  footerLinkKey,
  footerLinkDefault,
  footerLinkTo = '/signup',
}: PlumeAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 4),
        'bg-background bg-quote-pattern font-body text-on-background',
      )}
    >
      <div
        className={cm.cn(
          cm.w('full'),
          cm.sp('p', 10),
          'max-w-[440px] bg-surface rounded-xl shadow-sm border border-outline-variant relative z-10',
        )}
      >
        {/* Brand wordmark */}
        <div className={cm.cn(cm.textCenter, cm.sp('mb', 8))}>
          <Link to="/" className={cm.cn('inline-block')}>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-3xl tracking-tight font-serif text-primary',
              )}
            >
              {APP_NAME}
            </h1>
          </Link>
          <p
            className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), cm.textMuted, 'font-serif italic')}
          >
            {t('plumeAuthShell.tagline', {}, { defaultValue: APP_TAGLINE })}
          </p>
        </div>

        {/* Heading */}
        <div className={cm.cn(cm.sp('mb', 6))}>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t(headingKey, {}, { defaultValue: headingDefault })}
          </h2>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), cm.textMuted)}>
            {t(subheadingKey, {}, { defaultValue: subheadingDefault })}
          </p>
        </div>

        {/* Form */}
        {children}

        {/* Footer prompt */}
        {footerPromptKey && footerLinkKey ? (
          <p className={cm.cn(cm.textCenter, cm.sp('mt', 8), cm.textSize('sm'), cm.textMuted)}>
            {t(footerPromptKey, {}, { defaultValue: footerPromptDefault ?? '' })}{' '}
            <Link
              to={footerLinkTo}
              className={cm.cn(
                cm.fontWeight('semibold'),
                'text-primary hover:text-primary-dark transition-colors',
              )}
            >
              {t(footerLinkKey, {}, { defaultValue: footerLinkDefault ?? '' })}
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default PlumeAuthShell
