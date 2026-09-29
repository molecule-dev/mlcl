/**
 * Brand shell for Switchboard auth surfaces. Two variants:
 *
 * - `panel` (default, no `aside`): the deep-ink brand panel on the left (app
 *   mark, the multilingual pitch, sample greetings) + a centered form card
 *   on the right. Signup keeps this layout.
 * - `editorial` (when `aside` is passed): the Stitch auth design — sticky
 *   portal header, 7-column form card with a brass top rule on the left,
 *   the page's proof/security rail on the right, and the slim shared footer.
 *   Used by Login / ForgotPassword / ResetPassword.
 *
 * Collapses to one column under `lg` in both variants.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'

interface SwitchboardAuthShellProps {
  eyebrow: string
  heading: string
  subheading: string
  children: ReactNode
  footer?: ReactNode
  /** Editorial variant: the pill tag above the form heading. */
  badge?: ReactNode
  /** Editorial variant: the right-hand proof/security rail. Its presence selects the variant. */
  aside?: ReactNode
  /** Editorial variant: trailing actions in the portal header. */
  headerAside?: ReactNode
}

/** Greetings the voice agent actually speaks — the brand panel's texture. */
const SAMPLE_GREETINGS: ReadonlyArray<{ lang: string; text: string }> = [
  { lang: 'EN', text: 'Thank you for calling — how may I help you?' },
  { lang: 'ES', text: 'Gracias por llamar — ¿en qué puedo ayudarle?' },
  { lang: 'FR', text: 'Merci de votre appel — comment puis-je vous aider ?' },
  { lang: 'DE', text: 'Danke für Ihren Anruf — wie kann ich helfen?' },
  { lang: '中文', text: '感谢来电 — 请问有什么可以帮您？' },
  { lang: '日本語', text: 'お電話ありがとうございます — ご用件をどうぞ' },
]

/** Portal header shared by the editorial variant (the auth designs' nav). */
function EditorialHeader({ headerAside }: { headerAside?: ReactNode }) {
  const cm = getClassMap()
  return (
    <header
      className={cm.cn(
        'sticky top-0 z-40 w-full border-b border-outline-variant/40 bg-surface/90 backdrop-blur-md',
      )}
    >
      <div
        className={cm.cn(
          cm.maxW('7xl'),
          cm.mxAuto,
          'px-6 md:px-10 h-20 flex items-center justify-between gap-4',
        )}
      >
        {/* Brand & subtitle — the ONE shared brand component with its
            tagline eyebrow (`brand.tagline`, "Autonomous Night Telephony"). */}
        <Link
          to="/"
          className={cm.cn('flex items-center gap-3 group shrink-0')}
          data-mol-id="auth-brand-home"
        >
          <BrandWordmark as="span" size="lg" withTagline />
        </Link>
        <div className={cm.cn('flex items-center gap-4 md:gap-6')}>
          {headerAside}
          <LanguagePicker display="icon" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

/** Slim shared footer for the editorial auth designs. */
function EditorialFooter() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const links = [
    { key: 'reception', href: '/#intelligence', label: 'Autonomous Reception' },
    { key: 'pms', href: '/#integrations', label: 'PMS Integrations' },
    { key: 'acoustic', href: '/privacy', label: 'Acoustic Privacy' },
    { key: 'security', href: '/privacy', label: 'Security & Compliance' },
    { key: 'terms', href: '/terms', label: 'Terms of Service' },
    { key: 'privacy', href: '/privacy', label: 'Privacy Policy' },
  ] as const
  return (
    <footer
      className={cm.cn('w-full border-t border-outline-variant/50 bg-surface-container-low mt-12')}
    >
      <div
        className={cm.cn(
          cm.maxW('7xl'),
          cm.mxAuto,
          'px-6 md:px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-6',
        )}
      >
        <div
          className={cm.cn('flex flex-col md:flex-row items-center gap-3 text-center md:text-left')}
        >
          <BrandWordmark as="span" size="md" footer />
          <span className={cm.cn('hidden md:inline text-outline-variant')} aria-hidden="true">
            |
          </span>
          <span className={cm.cn('text-[13px] text-on-surface-variant')}>
            {t(
              'authShell.footerCopyright',
              {},
              {
                defaultValue:
                  '© 2025 Switchboard Technologies Inc. Autonomous hospitality intelligence for independent hoteliers. All rights reserved.',
              },
            )}
          </span>
        </div>
        <nav
          className={cm.cn(
            'flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center',
          )}
          aria-label={t('authShell.footerNavLabel', {}, { defaultValue: 'Footer' })}
        >
          {links.map((link) => (
            <Link
              key={link.key}
              to={link.href}
              className={cm.cn(
                'text-[13px] text-on-surface-variant hover:text-secondary transition-colors',
              )}
            >
              {t(`authShell.footer.${link.key}`, {}, { defaultValue: link.label })}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}

export function SwitchboardAuthShell({
  eyebrow,
  heading,
  subheading,
  children,
  footer,
  badge,
  aside,
  headerAside,
}: SwitchboardAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })

  /* ------------------------- Editorial variant ------------------------- */
  if (aside) {
    return (
      <div
        className={cm.cn(
          cm.minH('screen'),
          'bg-background text-on-surface antialiased flex flex-col',
        )}
      >
        <EditorialHeader headerAside={headerAside} />

        {/* Split canvas: form card (7) + proof rail (5) */}
        <main
          className={cm.cn(
            'flex-1 w-full',
            cm.maxW('7xl'),
            cm.mxAuto,
            'px-6 md:px-10 py-10 md:py-14',
          )}
        >
          <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start')}>
            {/* Left: authentication card */}
            <section className={cm.cn('lg:col-span-7 flex flex-col')}>
              <div
                className={cm.cn(
                  'relative bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-8 md:p-12 sb-card-shadow overflow-hidden',
                )}
              >
                {/* Brass accent rule */}
                <div
                  className={cm.cn(
                    'absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-secondary via-secondary/30 to-transparent',
                  )}
                  aria-hidden="true"
                />
                <div className={cm.cn('mb-8')}>
                  {badge ? <div className={cm.cn('mb-3')}>{badge}</div> : null}
                  <h1
                    className={cm.cn(
                      'sb-serif text-3xl md:text-4xl tracking-tight text-primary font-normal',
                    )}
                  >
                    {heading}
                  </h1>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      'text-on-surface-variant mt-2 max-w-xl leading-relaxed',
                    )}
                  >
                    {subheading}
                  </p>
                </div>

                {children}

                {footer ? (
                  <div className={cm.cn(cm.sp('mt', 8), cm.textSize('sm'), 'text-center')}>
                    {footer}
                  </div>
                ) : null}

                <div
                  className={cm.cn(
                    cm.sp('mt', 6),
                    cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
                    cm.textSize('xs'),
                    'text-on-surface-variant',
                  )}
                >
                  <button
                    type="button"
                    onClick={openPrivacy}
                    className={'-my-2 inline-block py-2 hover:text-primary transition-colors'}
                    data-mol-id="auth-privacy-link"
                  >
                    {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
                  </button>
                  <button
                    type="button"
                    onClick={openTerms}
                    className={'-my-2 inline-block py-2 hover:text-primary transition-colors'}
                    data-mol-id="auth-terms-link"
                  >
                    {t('nav.terms', {}, { defaultValue: 'Terms' })}
                  </button>
                </div>
              </div>
            </section>

            {/* Right: page-specific proof rail */}
            <aside className={cm.cn('lg:col-span-5 flex flex-col gap-6')}>{aside}</aside>
          </div>
        </main>

        <EditorialFooter />
        {modals}
      </div>
    )
  }

  /* --------------------------- Panel variant --------------------------- */
  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-background text-on-surface antialiased flex flex-col',
      )}
    >
      {/* Slim top header */}
      <header
        className={cm.cn('border-b border-outline-variant/40 bg-surface/95 backdrop-blur-md')}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <Link
            to="/"
            className={cm.flex({ align: 'center', gap: 'sm' })}
            data-mol-id="auth-brand-home"
          >
            {/* The ONE shared brand component — replaces the old bold-sans
                support_agent lockup so signup matches every other surface. */}
            <BrandWordmark as="span" size="lg" />
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <LanguagePicker display="icon" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Split body */}
      <div className={cm.cn('flex-1 grid grid-cols-1 lg:grid-cols-2')}>
        {/* Brand panel */}
        <aside
          className={cm.cn('relative hidden lg:block bg-primary text-on-primary overflow-hidden')}
        >
          <div
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-br from-primary/95 via-primary-container/90 to-primary/85',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.w(96),
              cm.h(96),
              cm.roundedFull,
              'absolute -right-24 -top-24 bg-accent/20 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.w(64),
              cm.h(64),
              cm.roundedFull,
              'absolute -left-16 -bottom-16 bg-surface/10 blur-3xl',
            )}
            aria-hidden="true"
          />

          <div
            className={cm.cn(
              'relative z-10 h-full',
              cm.sp('p', 12),
              cm.flex({ direction: 'col', justify: 'between' }),
            )}
          >
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-tertiary',
                )}
              >
                {t(
                  'switchboardAuthShell.brand.eyebrow',
                  {},
                  { defaultValue: 'Every call answered, in every language' },
                )}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mt', 4),
                  'leading-tight text-white',
                )}
              >
                {t(
                  'switchboardAuthShell.brand.heading',
                  {},
                  {
                    defaultValue:
                      'The AI receptionist that picks up in the caller\u2019s own language — and books the room on the same call.',
                  },
                )}
              </h2>
            </div>

            {/* Sample greetings in the agent's languages */}
            <figure
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface/15 backdrop-blur-xl rounded-2xl ring-1 ring-white/20',
              )}
              aria-label={t(
                'switchboardAuthShell.brand.sampleGreetingLabel',
                {},
                { defaultValue: 'Sample agent greetings' },
              )}
            >
              <span
                className="material-symbols-outlined text-3xl text-tertiary"
                aria-hidden="true"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                graphic_eq
              </span>
              <ul className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'col', gap: 'xs' }))}>
                {SAMPLE_GREETINGS.map((g) => (
                  <li key={g.lang} className={cm.cn(cm.textSize('sm'), 'text-white/90')}>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-widest text-tertiary',
                      )}
                    >
                      {g.lang}
                    </span>{' '}
                    {g.text}
                  </li>
                ))}
              </ul>
            </figure>
          </div>
        </aside>

        {/* Form panel */}
        <main
          className={cm.cn('flex items-center justify-center', cm.sp('px', 6), cm.sp('py', 12))}
        >
          <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.25em] text-primary',
              )}
            >
              {eyebrow}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 2),
                'leading-tight',
              )}
            >
              {heading}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.sp('mt', 3),
                'text-on-surface-variant leading-relaxed',
              )}
            >
              {subheading}
            </p>

            <div className={cm.sp('mt', 8)}>{children}</div>

            {footer ? (
              <div className={cm.cn(cm.sp('mt', 8), cm.textSize('sm'), cm.textCenter)}>
                {footer}
              </div>
            ) : null}

            <div
              className={cm.cn(
                cm.sp('mt', 8),
                cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
                cm.textSize('xs'),
                'text-on-surface-variant',
              )}
            >
              <button
                type="button"
                onClick={openPrivacy}
                className={'-my-2 inline-block py-2 hover:text-primary transition-colors'}
                data-mol-id="auth-privacy-link"
              >
                {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              </button>
              <button
                type="button"
                onClick={openTerms}
                className={'-my-2 inline-block py-2 hover:text-primary transition-colors'}
                data-mol-id="auth-terms-link"
              >
                {t('nav.terms', {}, { defaultValue: 'Terms' })}
              </button>
            </div>
          </div>
        </main>
      </div>
      {modals}
    </div>
  )
}

/** Shared: the "Lines Operational" telephony status pill for auth headers. */
export function AuthStatusPill() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <span
      className={cm.cn(
        'hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/40',
      )}
    >
      <span className={cm.cn('relative flex h-2 w-2')} aria-hidden="true">
        <span
          className={cm.cn(
            'animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-fixed-dim opacity-75',
          )}
        />
        <span className={cm.cn('relative inline-flex rounded-full h-2 w-2 bg-emerald-700')} />
      </span>
      <span className={cm.cn('text-[11px] font-medium text-on-surface-variant')}>
        {t('authShell.linesOperational', {}, { defaultValue: 'Lines Operational (99.99%)' })}
      </span>
    </span>
  )
}
