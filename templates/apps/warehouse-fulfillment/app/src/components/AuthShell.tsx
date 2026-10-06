import { Link } from 'react-router'

import { AuthShellCardColumn, AuthShellPanel } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { loadContent } from '../config.js'
import { BrandWordmark } from './BrandWordmark.js'

/**
 * Auth split-screen shell — navy left brand panel + white right form panel.
 *
 * Catalog §13.3 (Decorated-Card with Brand Panel) variant retuned for
 * Sorthaus: deep-navy `var(--color-sidebar)` panel, decorative blurred orbs,
 * sample dock-throughput tile overlay so a logged-out visitor sees what
 * the floor view looks like inside.
 *
 * Used by Login/Signup/ForgotPassword/ResetPassword. Keep all four pages
 * on the same shell — only the right-hand form changes per page.
 */

interface AuthShellProps {
  heading: string
  subheading?: string
  children: React.ReactNode
  bottomLinkText?: string
  bottomLinkLabel?: string
  bottomLinkTo?: string
}

export function AuthShell({
  heading,
  subheading,
  children,
  bottomLinkText,
  bottomLinkLabel,
  bottomLinkTo,
}: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Privacy/Terms open IN-PLACE modals (bonded legal HTML pre-loaded via
  // loadContent) so the auth pages never leave the flow — the standalone
  // /privacy and /terms routes still exist for direct/deep links.
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}>
      <div className={cm.cn('grid lg:grid-cols-2 flex-1')}>
        <AuthShellPanel
          className={cm.cn(
            'relative overflow-hidden text-white',
            cm.flex({ direction: 'col', justify: 'between' }),
            cm.sp('p', 12),
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-sidebar) 0%, var(--mol-color-primary-dark) 50%, var(--color-primary-dark) 100%)',
          }}
        >
          <div
            aria-hidden="true"
            className={cm.cn(
              'pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl',
            )}
          />
          <div
            aria-hidden="true"
            className={cm.cn(
              'pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-secondary/20 blur-3xl',
            )}
          />
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'relative')}>
            <BrandWordmark
              as="span"
              size="lg"
              invert
              subtitle={t('authShell.brandSubtitle', {}, { defaultValue: 'Fulfillment Console' })}
            />
          </Link>

          <div className={cm.cn('relative', cm.stack(6))}>
            <p className={cm.cn(cm.textSize('4xl'), 'font-extrabold leading-tight tracking-tight')}>
              {APP_TAGLINE}.
            </p>
            <p className={cm.cn(cm.textSize('lg'), 'text-white/80 max-w-md')}>
              {t(
                'authShell.pitch',
                {},
                {
                  defaultValue:
                    'A scanner-first console for the floor. Pick, pack, and ship from one console — built for ops leads who count what counts and refuse to let an order slip.',
                },
              )}
            </p>

            <div
              className={cm.cn(
                'rounded-2xl border border-surface/10 bg-surface/5 backdrop-blur-md',
                cm.sp('p', 5),
                cm.stack(3),
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <p
                  className={cm.cn(
                    'text-[10px] font-bold uppercase tracking-[0.22em] text-white/60',
                  )}
                >
                  {t('authShell.sampleEyebrow', {}, { defaultValue: 'Today on the dock' })}
                </p>
                <span
                  className={cm.cn(
                    'rounded-full bg-secondary/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white',
                  )}
                >
                  {t('status.live', {}, { defaultValue: 'Live' })}
                </span>
              </div>
              <p className={cm.cn('text-5xl font-extrabold tracking-tighter tabular-nums')}>
                1,284
              </p>
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <p className={cm.cn('text-xs text-white/70')}>
                  {t(
                    'authShell.sampleCaption',
                    {},
                    { defaultValue: 'orders shipped · 8 dock doors · 3 zones' },
                  )}
                </p>
                <span
                  className={cm.cn(
                    'inline-flex items-center gap-1 text-xs font-bold text-emerald-200',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[14px]')}
                    data-icon="trending_up"
                  >
                    trending_up
                  </span>
                  +6.4%
                </span>
              </div>
            </div>
          </div>

          <p className={cm.cn('relative text-xs uppercase tracking-[0.22em] text-white/55')}>
            {t(
              'authShell.footer',
              { appName: APP_NAME },
              { defaultValue: '{{appName}} · Operations console' },
            )}
          </p>
        </AuthShellPanel>

        <AuthShellCardColumn as="main" className={cm.cn(cm.sp('p', 8), 'min-h-[100dvh]')}>
          <div className={cm.cn(cm.w('full'), cm.maxW('md'), cm.stack(8))}>
            {/* BrandWordmark renders its own router link — wrapping it in
                another <Link> nests an <a> inside an <a>, which the console
                (and the e2e console-error gate) rejects. */}
            <div className={cm.cn('lg:hidden')}>
              <BrandWordmark size="md" />
            </div>

            <header className={cm.stack(2)}>
              <p
                className={cm.cn('text-[10px] font-bold uppercase tracking-[0.22em] text-primary')}
              >
                {t(
                  'authShell.eyebrow',
                  { appName: APP_NAME },
                  { defaultValue: 'Welcome to {{appName}}' },
                )}
              </p>
              <h1
                className={cm.cn(
                  cm.textSize('3xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {heading}
              </h1>
              {subheading && (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{subheading}</p>
              )}
            </header>

            {children}

            {bottomLinkText && bottomLinkLabel && bottomLinkTo && (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant text-center')}>
                {bottomLinkText}{' '}
                <Link
                  to={bottomLinkTo}
                  className={cm.cn(
                    'font-bold text-primary hover:text-primary-dark underline-offset-4 hover:underline',
                  )}
                >
                  {bottomLinkLabel}
                </Link>
              </p>
            )}

            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                cm.textSize('xs'),
                'text-on-surface-variant',
              )}
            >
              <button
                type="button"
                onClick={openTerms}
                className={cm.cn(cm.fontWeight('semibold'), 'hover:text-primary transition-colors')}
              >
                {t('nav.terms', {}, { defaultValue: 'Terms' })}
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={openPrivacy}
                className={cm.cn(cm.fontWeight('semibold'), 'hover:text-primary transition-colors')}
              >
                {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              </button>
            </div>
          </div>
        </AuthShellCardColumn>
      </div>
      {modals}
    </div>
  )
}

export default AuthShell
