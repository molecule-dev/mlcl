/**
 * Two-column auth shell — left brand panel with Sigil mark, tagline, and a
 * decorative sample portfolio card preview; right form panel hosting the
 * actual auth form. Falls back to a single column on narrow viewports.
 *
 * Translated from §13.3 (Decorated Card with Brand Panel) of the polish
 * catalog, with the gold/charcoal Bloomberg-terminal aesthetic from
 * `crypto-tracker/DESIGN.md`.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { loadContent } from '../config.js'
import { ThemeToggle } from './ThemeToggle.js'

export interface SigilAuthShellProps {
  eyebrow: string
  heading: string
  subheading?: string
  children: ReactNode
  footer?: ReactNode
}

export function SigilAuthShell({
  eyebrow,
  heading,
  subheading,
  children,
  footer,
}: SigilAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface')}>
      <div
        className={cm.cn(
          cm.minH('screen'),
          cm.grid({ cols: 1, gap: 'sm' }),
          'lg:grid-cols-[1.05fr_1fr]',
        )}
      >
        {/* Brand panel */}
        <aside
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between' }),
            cm.sp('p', 10),
            'relative overflow-hidden bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-stone-50',
          )}
          aria-hidden="false"
        >
          <div
            className={cm.cn(
              cm.w(80),
              cm.h(80),
              cm.roundedFull,
              'absolute -left-24 -top-24 bg-primary/30 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.w(80),
              cm.h(80),
              cm.roundedFull,
              'absolute -right-24 -bottom-32 bg-secondary/30 blur-3xl',
            )}
            aria-hidden="true"
          />

          <header className="relative z-10">
            <BrandWordmark as="span" invert />
          </header>

          <div className={cm.cn('relative z-10 max-w-md space-y-6')}>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
              {t(
                'sigilAuthShell.tagline',
                { tagline: APP_TAGLINE },
                { defaultValue: '— {{tagline}} —' },
              )}
            </p>
            <h2
              className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]')}
            >
              {t(
                'sigilAuthShell.brandHeadline',
                {},
                { defaultValue: 'Decode every signal across the entire ledger.' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'text-foreground-tertiary leading-relaxed')}>
              {t(
                'sigilAuthShell.brandBody',
                {},
                {
                  defaultValue:
                    'Realtime prices, portfolio P/L, and standing wards on the conditions that matter — all on one terminal.',
                },
              )}
            </p>

            <SamplePortfolioPreview />
          </div>

          <footer
            className={cm.cn(
              'relative z-10 text-[10px] font-bold uppercase tracking-widest text-foreground-secondary',
            )}
          >
            {t(
              'sigilAuthShell.brandFooter',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}} — built on Molecule' },
            )}
          </footer>
        </aside>

        {/* Form panel */}
        <main
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.sp('p', 8),
            'relative bg-surface',
          )}
        >
          <div className={cm.cn('absolute top-6 right-6 z-10')}>
            <ThemeToggle />
          </div>
          <div className={cm.cn(cm.w('full'), 'max-w-md space-y-6')}>
            <div>
              <p
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-primary-dark',
                )}
              >
                {eyebrow}
              </p>
              <h1
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.sp('mt', 2),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {heading}
              </h1>
              {subheading ? (
                <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                  {subheading}
                </p>
              ) : null}
            </div>

            <div
              className={cm.cn(
                cm.sp('p', 8),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm space-y-5',
              )}
            >
              {children}
            </div>

            {footer ? <div className={cm.textCenter}>{footer}</div> : null}

            {/* Privacy/Terms open IN-PLACE modals (the bonded legal HTML is
                pre-loaded via loadContent) — both Login and Signup render through
                this shell, so both auth pages get them. The standalone /privacy
                and /terms routes still exist for direct/deep links. */}
            <div
              className={cm.cn(
                cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'md' }),
                cm.textSize('xs'),
                'text-on-surface-variant',
              )}
            >
              <LegalModalLinks
                linkClassName={cm.cn(
                  cm.fontWeight('semibold'),
                  'text-primary-dark hover:underline',
                )}
                appName={APP_NAME}
                loadContent={loadContent}
                privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
                termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
              />
            </div>

            <p className={cm.cn(cm.textCenter, cm.textSize('xs'), 'text-on-surface-variant')}>
              <Link
                to="/"
                className={cm.cn(cm.fontWeight('bold'), 'text-primary-dark hover:underline')}
              >
                {t(
                  'sigilAuthShell.backHomeCta',
                  { appName: APP_NAME },
                  { defaultValue: '← Back to {{appName}}' },
                )}
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

function SamplePortfolioPreview() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        'relative rounded-2xl bg-foreground/80 border border-stone-700/60 backdrop-blur-md shadow-xl',
      )}
      aria-hidden="true"
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-foreground-tertiary">
        {t('sigilAuthShell.samplePortfolio', {}, { defaultValue: 'Sample portfolio' })}
      </p>
      <div className={cm.cn('mt-2 flex items-baseline gap-3')}>
        <span className="text-4xl font-extrabold tracking-tighter tabular-nums text-stone-50">
          $74.2K
        </span>
        <span
          className={cm.cn(
            'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-success/15 text-success tabular-nums',
          )}
        >
          +3.18%
        </span>
      </div>
      <ul className={cm.cn('mt-4 space-y-2 text-xs font-mono text-foreground-tertiary')}>
        <li className={cm.cn('flex justify-between')}>
          <span>BTC · Bitcoin</span>
          <span className="tabular-nums text-success">+2.18%</span>
        </li>
        <li className={cm.cn('flex justify-between')}>
          <span>ETH · Ethereum</span>
          <span className="tabular-nums text-success">+1.94%</span>
        </li>
        <li className={cm.cn('flex justify-between')}>
          <span>SOL · Solana</span>
          <span className="tabular-nums text-success">+4.18%</span>
        </li>
        <li className={cm.cn('flex justify-between')}>
          <span>DOGE · Dogecoin</span>
          <span className="tabular-nums text-error">-1.42%</span>
        </li>
      </ul>
    </div>
  )
}
