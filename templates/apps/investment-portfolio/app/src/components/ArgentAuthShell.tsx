/**
 * Decorated split-screen auth shell — navy brand panel on the left
 * (gradient + decorative orbs + sample portfolio teaser), white form
 * panel on the right with brand-mark Argent logo header.
 *
 * Translated from polished-pattern §13.3 (Decorated-Card with Brand
 * Panel) — same layout as crm/helpdesk-ticketing/property-listing,
 * adapted for Argent's "private-bank navy" mood with a teal accent.
 */

import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, LOGO_SIZE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'

interface ArgentAuthShellProps {
  eyebrow: string
  heading: string
  subheading: string
  children: React.ReactNode
  footerLink?: {
    to: string
    promptKey: string
    promptDefault: string
    ctaKey: string
    ctaDefault: string
  }
}

export function ArgentAuthShell({
  eyebrow,
  heading,
  subheading,
  children,
  footerLink,
}: ArgentAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface')}>
      <div className={cm.cn('grid lg:grid-cols-2 min-h-screen')}>
        {/* Brand panel — navy gradient with sample portfolio teaser */}
        <aside
          className={cm.cn(
            'hidden lg:flex flex-col justify-between relative overflow-hidden p-12 text-white bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900',
          )}
        >
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'relative z-10')}>
            <img
              src="/logo.svg"
              width={LOGO_SIZE}
              height={LOGO_SIZE}
              alt=""
              className={cm.cn('invert')}
            />
            <span className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {APP_NAME}
            </span>
          </Link>

          <div className={cm.cn('relative z-10 max-w-md')}>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-teal-300 mb-4',
              )}
            >
              {t(
                'argentAuthShell.brandEyebrow',
                { appName: APP_NAME },
                { defaultValue: '{{appName}} · Wealth tooling' },
              )}
            </p>
            <h2 className={cm.cn('text-4xl font-extrabold tracking-tight leading-tight mb-4')}>
              {t(
                'argentAuthShell.brandHeading',
                { tagline: APP_TAGLINE },
                { defaultValue: '{{tagline}}' },
              )}
            </h2>
            <p className={cm.cn('text-white/70 leading-relaxed')}>
              {t(
                'argentAuthShell.brandSubheading',
                {},
                {
                  defaultValue:
                    'A portfolio dashboard for individual investors and advisors who want disciplined rebalancing, sharp performance attribution, and tax-doc hygiene — without the noise.',
                },
              )}
            </p>

            {/* Sample portfolio teaser card */}
            <div
              className={cm.cn(
                'mt-10 bg-surface/10 backdrop-blur-md rounded-2xl p-6 border border-surface/10',
              )}
            >
              <p
                className={cm.cn('text-xs font-bold uppercase tracking-widest text-white/60 mb-2')}
              >
                {t('argentAuthShell.sampleLabel', {}, { defaultValue: 'Portfolio Value' })}
              </p>
              <p className={cm.cn('text-4xl font-extrabold tabular-nums tracking-tight')}>
                {t('argentAuthShell.sampleValue', {}, { defaultValue: '$1,032,251' })}
              </p>
              <p className={cm.cn('text-sm text-teal-300 font-semibold tabular-nums mt-1')}>
                {t('argentAuthShell.sampleChange', {}, { defaultValue: '+$2,841 (+0.28%) today' })}
              </p>
              <div className={cm.cn('mt-4 h-12 w-full opacity-60')}>
                <svg
                  viewBox="0 0 200 50"
                  preserveAspectRatio="none"
                  className={cm.cn('w-full h-full')}
                  aria-hidden="true"
                >
                  <path
                    d="M0,40 Q40,20 80,28 T160,18 T200,8"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          </div>

          <p className={cm.cn('relative z-10 text-xs text-white/40')}>
            {t(
              'argentAuthShell.brandFootnote',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}. Not investment advice.' },
            )}
          </p>

          {/* Decorative orbs */}
          <div
            className={cm.cn(
              'absolute -top-32 -right-32 w-96 h-96 rounded-full bg-teal-500/20 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'absolute bottom-0 -left-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl',
            )}
            aria-hidden="true"
          />
        </aside>

        {/* Form panel */}
        <main className={cm.cn(cm.flex({ direction: 'col' }), 'min-h-screen')}>
          <header
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('px', 6),
              cm.sp('py', 4),
            )}
          >
            <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'lg:invisible')}>
              <img src="/logo.svg" width={LOGO_SIZE} height={LOGO_SIZE} alt="" />
              <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{APP_NAME}</span>
            </Link>
            <ThemeToggle />
          </header>

          <section
            className={cm.cn(
              'flex-1',
              cm.flex({ direction: 'col', justify: 'center' }),
              cm.sp('px', 6),
              cm.sp('py', 8),
            )}
          >
            <div className={cm.cn('w-full max-w-sm mx-auto')}>
              <p
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  cm.sp('mb', 2),
                  'uppercase tracking-widest text-primary-dark',
                )}
              >
                {eyebrow}
              </p>
              <h1
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 2),
                  'tracking-tight',
                )}
              >
                {heading}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mb', 8),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {subheading}
              </p>

              {children}

              {footerLink ? (
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mt', 8),
                    'text-center text-on-surface-variant',
                  )}
                >
                  {t(
                    footerLink.promptKey,
                    { appName: APP_NAME },
                    { defaultValue: footerLink.promptDefault },
                  )}{' '}
                  <Link
                    to={footerLink.to}
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      'text-primary-dark hover:underline',
                    )}
                  >
                    {t(
                      footerLink.ctaKey,
                      { appName: APP_NAME },
                      { defaultValue: footerLink.ctaDefault },
                    )}
                  </Link>
                </p>
              ) : null}
            </div>
          </section>

          <footer
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 6),
              cm.textCenter,
              cm.textSize('xs'),
              'text-on-surface-variant',
            )}
          >
            <p>
              {t(
                'argentAuthShell.formFooter',
                { year: new Date().getFullYear(), app: APP_NAME },
                {
                  defaultValue:
                    '© {{year}} {{app}} · Past performance does not guarantee future results.',
                },
              )}
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}
