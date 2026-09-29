/**
 * Bargain auth shell — catalog §13.3 decorated-card pattern with a brand
 * panel on the left (gradient + decorative orbs + animated "live drops"
 * status pill + sample SavingsHeroCard) and the form pane on the right
 * (centered max-w card with a brand mark + headline/subhead slot + form
 * children + footer link).
 *
 * Translated from coupon-deals-platform/SnagrAuthShell.tsx — the brand
 * panel re-skinned with Bargain's deep-orange gradient, its sample card
 * swapped for the SavingsHeroCard so a logged-out visitor sees what their
 * lifetime savings dashboard will look like.
 */
import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { SavingsHeroCard } from './SavingsHeroCard.js'

export interface SiftAuthShellProps {
  /** Form-pane heading. */
  heading: string
  /** Subheading under the form heading. */
  subheading: string
  /** Form fields + submit button. */
  children: ReactNode
  /** Bottom-of-card footer (e.g. "New here? Create an account"). */
  footer: ReactNode
}

export function SiftAuthShell({ heading, subheading, children, footer }: SiftAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      data-mol-id="auth-shell"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.sp('p', 4),
        'bg-gradient-to-br from-surface-container-low via-surface to-background text-on-surface antialiased md:p-8',
      )}
    >
      <main
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.maxW('xl'),
          cm.w('full'),
          'lg:flex-row max-w-screen-xl rounded-[2rem] overflow-hidden bg-surface-container-lowest shadow-xl shadow-primary/5 border border-outline-variant/30',
        )}
      >
        <aside
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between' }),
            cm.sp('p', 12),
            'hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary to-primary-container text-on-primary',
          )}
        >
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-secondary/30 blur-3xl pointer-events-none',
            )}
          />
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute top-1/4 -left-12 h-64 w-64 rounded-full bg-surface/15 blur-3xl pointer-events-none',
            )}
          />

          <BrandWordmark size="lg" invert />

          <div className={cm.cn('relative space-y-6 max-w-md')}>
            <h2
              className={cm.cn('text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight')}
            >
              {t(
                'siftAuthShell.heroTitle',
                { tagline: APP_TAGLINE },
                { defaultValue: '{{tagline}}.' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-primary/85 leading-relaxed')}>
              {t(
                'siftAuthShell.heroSubtitle',
                {},
                {
                  defaultValue:
                    'Compare every retailer in seconds, watch for the right moment, and never overpay again.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                'rounded-2xl bg-surface/10 backdrop-blur-md p-1 ring-1 ring-white/20',
              )}
            >
              <SavingsHeroCard
                totalSavingsCents={184220}
                watchingCount={28}
                weekDropCount={6}
                eyebrow={t(
                  'siftAuthShell.previewEyebrow',
                  {},
                  { defaultValue: 'Sample dashboard' },
                )}
              />
            </div>
          </div>

          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 5),
              cm.sp('py', 3),
              'relative w-fit rounded-full bg-surface/15 backdrop-blur-md',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('h-2.5 w-2.5 rounded-full bg-secondary-container animate-pulse')}
            />
            <span
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-primary/90')}
            >
              {t(
                'siftAuthShell.statusLive',
                {},
                { defaultValue: '4,800+ price drops detected today' },
              )}
            </span>
          </div>
        </aside>

        <section
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('px', 6),
            cm.sp('py', 12),
            cm.w('full'),
            'lg:w-1/2 sm:px-12 bg-surface-container-lowest',
          )}
        >
          <div className={cm.cn(cm.w('full'), 'max-w-[440px] space-y-8')}>
            <BrandWordmark size="lg" />

            <header className={cm.cn(cm.textCenter)}>
              <h1
                className={cm.cn(
                  'text-3xl font-extrabold tracking-tight text-on-surface leading-tight',
                )}
              >
                {heading}
              </h1>
              <p
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.textSize('sm'),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {subheading}
              </p>
            </header>

            {children}

            <footer
              className={cm.cn(
                cm.textCenter,
                cm.sp('pt', 2),
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {footer}
            </footer>
          </div>
        </section>
      </main>
    </div>
  )
}
