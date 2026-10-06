import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { loadContent } from '../config.js'
import { BrandWordmark } from './BrandWordmark.js'

interface NoshAuthShellProps {
  /** h2 heading ("Welcome back", "Create your account", …). */
  heading: string
  /** Short paragraph below the heading. */
  subheading?: string
  /** Footer slot — typically the cross-link to the sibling auth page. */
  footer?: ReactNode
  /** Form / OAuth / fields. */
  children: ReactNode
}

/**
 * Brand-consistent split auth shell — teal gradient panel on the left with the
 * Nosh wordmark + decorative emojis + ring SVG, form card on the right.
 *
 * Catalog §13.3 (Decorated Brand Panel) variant adapted to Nosh's friendly
 * teal/orange palette. Used by Login / Signup / ForgotPassword / ResetPassword.
 */
export function NoshAuthShell({ heading, subheading, footer, children }: NoshAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased flex')}>
      <aside
        className={cm.cn(
          'hidden lg:flex w-1/2 bg-gradient-to-br from-primary-dark to-primary relative overflow-hidden items-center justify-center flex-col p-12',
        )}
        aria-hidden="true"
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'absolute inset-0 opacity-20 pointer-events-none',
          )}
        >
          <svg
            className={cm.cn('w-[120%] h-[120%] stroke-white fill-none stroke-[8] opacity-50')}
            viewBox="0 0 100 100"
          >
            <circle cx="50" cy="50" r="40" strokeDasharray="180 80" strokeLinecap="round" />
            <circle
              className={cm.cn('stroke-white/60')}
              cx="50"
              cy="50"
              r="28"
              strokeDasharray="100 80"
              strokeLinecap="round"
            />
            <circle
              className={cm.cn('stroke-white/40')}
              cx="50"
              cy="50"
              r="16"
              strokeDasharray="60 100"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className={cm.cn('absolute top-1/4 left-1/4 text-4xl opacity-30 select-none')}>🍎</div>
        <div className={cm.cn('absolute top-1/3 right-1/4 text-5xl opacity-20 select-none')}>
          🥗
        </div>
        <div className={cm.cn('absolute bottom-1/4 left-1/3 text-4xl opacity-30 select-none')}>
          💧
        </div>
        <div className={cm.cn('absolute bottom-1/3 right-1/3 text-5xl opacity-25 select-none')}>
          🥑
        </div>
        <Link
          to="/"
          tabIndex={-1}
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            'relative z-10 text-center',
          )}
        >
          <span className={cm.cn('block mb-4')}>
            <BrandWordmark as="span" size="xl" invert />
          </span>
          <span className={cm.cn(cm.textSize('xl'), 'text-white/90 font-medium')}>
            {t('nosh.auth.tagline', {}, { defaultValue: APP_TAGLINE })}
          </span>
        </Link>
      </aside>

      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'w-full lg:w-1/2 bg-surface p-6 sm:p-12',
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'w-full max-w-[440px]')}>
          <Link to="/" className={cm.cn('lg:hidden text-center mb-2 block')}>
            <BrandWordmark as="span" size="lg" />
            <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1 block')}>
              {t('nosh.auth.tagline', {}, { defaultValue: APP_TAGLINE })}
            </span>
          </Link>

          <header className={cm.cn(cm.textCenter, 'lg:text-left')}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'text-3xl text-on-surface leading-tight',
              )}
            >
              {heading}
            </h2>
            {subheading ? (
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>{subheading}</p>
            ) : null}
          </header>

          {children}

          {footer ? (
            <footer className={cm.cn(cm.textCenter, 'mt-2')}>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{footer}</p>
            </footer>
          ) : null}

          <div
            className={cm.cn(
              cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              'text-on-surface-variant lg:justify-start',
            )}
          >
            <span>
              {t('nosh.auth.legalPrefix', {}, { defaultValue: 'By continuing you agree to our' })}
            </span>
            <LegalModalLinks
              linkClassName={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
