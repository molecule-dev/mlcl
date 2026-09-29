import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'

/**
 * Landing chrome — the Stitch design's editorial top nav (shared-components
 * TopNavBar) and the full multi-column footer, both scoped to the marketing
 * surfaces. The authed workspace keeps the framework AppHeader/AppFooter.
 *
 * Nav anchors map the design's five links onto the sections that exist in
 * the rebuilt landing; the footer maps Product/Trust/Governance links onto
 * real anchors and routes so nothing dead-ends on '#'.
 */

const NAV_LINKS = [
  { key: 'intelligence', href: '#intelligence', label: 'Intelligence', active: true },
  { key: 'integrations', href: '#integrations', label: 'Integrations', active: false },
  { key: 'boutiqueRoi', href: '#boutique-roi', label: 'Boutique ROI', active: false },
  { key: 'architecture', href: '#architecture', label: 'Architecture', active: false },
  { key: 'journal', href: '#case-study', label: 'Journal', active: false },
] as const

const FOOTER_COLUMNS = [
  {
    key: 'product',
    title: 'Product',
    links: [
      { key: 'reception', href: '#intelligence', label: 'Autonomous Reception' },
      { key: 'pms', href: '#integrations', label: 'PMS Integrations' },
      { key: 'concierge', href: '#architecture', label: 'Concierge Architecture' },
    ],
  },
  {
    key: 'trust',
    title: 'Security & Trust',
    links: [
      { key: 'acoustic', href: '#intelligence', label: 'Acoustic Privacy' },
      { key: 'security', href: '/privacy', label: 'Security & Compliance' },
      { key: 'caseStudies', href: '#case-study', label: 'Boutique Case Studies' },
    ],
  },
  {
    key: 'governance',
    title: 'Governance',
    links: [
      { key: 'terms', href: '/terms', label: 'Terms of Service' },
      { key: 'privacy', href: '/privacy', label: 'Privacy Policy' },
    ],
  },
] as const

export function LandingNav() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <header
      className={cm.cn(
        'sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-outline-variant/40 lp-nav-shadow',
      )}
    >
      <div
        className={cm.cn(
          cm.maxW('7xl'),
          cm.mxAuto,
          'px-6 md:px-10 h-20 flex items-center justify-between gap-4',
        )}
      >
        {/* Brand logo anchor — the ONE shared brand component (concierge tile
            + serif wordmark). The nav's surface is the LIGHT `bg-surface/90`
            blurred bar in both themes, so no `invert`. The tile color-flip
            hover moves to the anchor (group-hover opacity) since the shared
            mark owns its own tile classes. */}
        <Link
          to="/"
          data-mol-id="nav-brand-home"
          className={cm.cn(
            'flex items-center gap-2 group shrink-0 transition-opacity duration-200 group-hover:opacity-80',
          )}
        >
          <BrandWordmark as="span" size="lg" />
        </Link>

        {/* Desktop nav items */}
        <nav
          className={cm.cn('hidden md:flex items-center gap-8')}
          aria-label={t('landing.nav.label', {}, { defaultValue: 'Landing sections' })}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className={cm.cn(
                'text-sm transition-all duration-150 active:scale-95',
                link.active
                  ? 'font-semibold text-primary border-b-2 border-secondary pb-1'
                  : 'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t(`landing.nav.${link.key}`, {}, { defaultValue: link.label })}
            </a>
          ))}
        </nav>

        {/* Trailing action controls */}
        <div className={cm.cn('flex items-center gap-3 md:gap-4')}>
          <Link
            to="/login"
            className={cm.cn(
              'hidden sm:inline-flex items-center gap-1.5 text-sm text-primary hover:text-secondary px-3 py-2 transition-colors duration-150',
            )}
          >
            <span>{t('landing.nav.operatorPortal', {}, { defaultValue: 'Operator Portal' })}</span>
            <span
              className={cm.cn('sb-icon flex h-4 w-4 items-center justify-center')}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">arrow_outward</span>
            </span>
          </Link>
          <button
            type="button"
            title={t('landing.nav.alertsTitle', {}, { defaultValue: 'Live System Alerts' })}
            aria-label={t('landing.nav.alertsTitle', {}, { defaultValue: 'Live System Alerts' })}
            className={cm.cn(
              'hidden sm:flex h-9 w-9 items-center justify-center rounded-lg lp-hairline text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors',
            )}
          >
            <span
              className={cm.cn('sb-icon flex h-4 w-4 items-center justify-center')}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">notifications_active</span>
            </span>
          </button>
          <a
            href="#demo-simulator"
            data-mol-id="nav-cta-demo"
            className={cm.cn(
              'inline-flex items-center gap-2 bg-primary text-surface text-sm font-semibold px-4 py-2.5 rounded-lg border border-primary hover:bg-primary-container focus:ring-2 focus:ring-secondary transition-all duration-150 active:scale-95 shadow-sm',
            )}
          >
            <span
              className={cm.cn('sb-icon flex h-4 w-4 items-center justify-center')}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined fill">phone_in_talk</span>
            </span>
            <span>{t('landing.nav.triggerDemo', {}, { defaultValue: 'Trigger Live Demo' })}</span>
          </a>
        </div>
      </div>
    </header>
  )
}

export function LandingFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <footer
      className={cm.cn('bg-surface-container-low border-t border-outline-variant/50')}
      data-mol-id="landing-footer"
    >
      <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, 'px-6 md:px-10 py-16 flex flex-col gap-12')}>
        {/* Top row: brand identity block + multi-column links */}
        <div className={cm.cn('grid grid-cols-1 md:grid-cols-12 gap-10')}>
          <div className={cm.cn('md:col-span-5 flex flex-col gap-4')}>
            {/* footer lockup: shared BrandWordmark (footer variant keeps the
      per-page brand-wordmark e2e contract header-scoped) */}
            <BrandWordmark as="span" size="md" footer />
            <p className={cm.cn('text-[13px] leading-relaxed text-on-surface-variant max-w-sm')}>
              {t(
                'landing.footer.mission',
                {},
                {
                  defaultValue:
                    'The autonomous hotel receptionist & night auditor engineered specifically for independent boutique hoteliers (30–120 rooms).',
                },
              )}
            </p>
            <div className={cm.cn('flex items-center gap-2 pt-2 text-xs text-secondary font-mono')}>
              <span className={cm.cn('w-2 h-2 rounded-full bg-emerald-600')} aria-hidden="true" />
              <span>
                {t(
                  'landing.footer.uptime',
                  {},
                  { defaultValue: 'Global Telephony Grid Active · 99.99% PBX Uptime' },
                )}
              </span>
            </div>
          </div>

          <div className={cm.cn('md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6')}>
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.key}>
                <div
                  className={cm.cn(
                    'text-xs font-semibold text-primary mb-3 uppercase tracking-wider',
                  )}
                >
                  {t(`landing.footer.${col.key}.title`, {}, { defaultValue: col.title })}
                </div>
                <ul className={cm.cn('space-y-2.5')}>
                  {col.links.map((link) => (
                    <li key={link.key}>
                      {link.href.startsWith('/') ? (
                        <Link
                          to={link.href}
                          className={cm.cn(
                            'text-[13px] text-on-surface-variant hover:text-secondary transition-colors duration-200',
                          )}
                        >
                          {t(
                            `landing.footer.${col.key}.${link.key}`,
                            {},
                            { defaultValue: link.label },
                          )}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className={cm.cn(
                            'text-[13px] text-on-surface-variant hover:text-secondary transition-colors duration-200',
                          )}
                        >
                          {t(
                            `landing.footer.${col.key}.${link.key}`,
                            {},
                            { defaultValue: link.label },
                          )}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom rows: copyright, compliance chips, AI disclosure */}
        <div className={cm.cn('lp-hairline-t pt-8 flex flex-col gap-4')}>
          <div
            className={cm.cn(
              'flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-on-surface-variant',
            )}
          >
            <div>
              {t(
                'landing.footer.copyright',
                {},
                {
                  defaultValue:
                    '© 2025 Switchboard Technologies Inc. Autonomous hospitality intelligence for independent hoteliers. All rights reserved.',
                },
              )}
            </div>
            <div className={cm.cn('flex items-center gap-4 text-xs font-mono')}>
              <span>{t('landing.footer.pci', {}, { defaultValue: 'PCI-DSS Level 1' })}</span>
              <span aria-hidden="true">•</span>
              <span>{t('landing.footer.gdpr', {}, { defaultValue: 'GDPR / CCPA Compliant' })}</span>
              <span aria-hidden="true">•</span>
              <span>
                {t('landing.footer.soc2', {}, { defaultValue: 'SOC2 Type II Certified' })}
              </span>
            </div>
          </div>
          <p className={cm.cn('text-xs text-on-surface-variant leading-relaxed max-w-3xl')}>
            {t(
              'landing.footer.aiDisclosure',
              {},
              {
                defaultValue:
                  'AI disclosure: Switchboard is an autonomous voice agent. Every caller is told they are speaking with an automated assistant, and a human operator can intercept any call at any moment.',
              },
            )}
          </p>
        </div>
      </div>
    </footer>
  )
}
