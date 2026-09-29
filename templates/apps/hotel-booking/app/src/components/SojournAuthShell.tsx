/**
 * Brand-panel auth shell — Catalog §13.3 Decorated-Card with Brand Panel.
 * Editorial photograph on the left (with overlaid Sojourn brand mark,
 * tagline, and a glass testimonial pill) + a centered card on the right
 * for the form. Layout collapses to a single column under `lg`.
 *
 * Used by Login / Signup / ForgotPassword / ResetPassword. Form contents
 * vary per screen-map.json's `derivationNotes`.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker } from '@molecule/app-ui-react'
import { BrandWordmark } from './BrandWordmark.js'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
import { ThemeToggle } from './ThemeToggle.js'

interface SojournAuthShellProps {
  eyebrow: string
  heading: string
  subheading: string
  children: ReactNode
  footer?: ReactNode
  /** Image URL used for the brand panel; defaults to a Sojourn-branded property photo. */
  brandImage?: string
  /** Optional small testimonial shown over the brand image. */
  testimonial?: { quote: string; author: string }
}

const DEFAULT_TESTIMONIAL = {
  quote: `The most thoughtfully curated stays we have ever booked. ${APP_NAME} picks places we would have missed.`,
  author: `Henrik L. · ${APP_NAME} member since 2024`,
}

const DEFAULT_BRAND_IMAGE = 'https://picsum.photos/seed/sojourn-auth/1200/1600'

export function SojournAuthShell({
  eyebrow,
  heading,
  subheading,
  children,
  footer,
  brandImage = DEFAULT_BRAND_IMAGE,
  testimonial = DEFAULT_TESTIMONIAL,
}: SojournAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })
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
          <Link to="/" className={cm.flex({ align: 'center', gap: 'sm' })}>
            <BrandWordmark as="span" />
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
          <img
            src={brandImage}
            alt=""
            className={cm.cn(
              cm.w('full'),
              cm.h('full'),
              'absolute inset-0 object-cover opacity-70',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/70 to-primary-container/80',
            )}
            aria-hidden="true"
          />
          {/* Decorative orbs */}
          <div
            className={cm.cn(
              cm.w(80),
              cm.h(80),
              cm.roundedFull,
              'absolute -right-20 -top-20 bg-accent/30 blur-3xl',
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
                  'uppercase tracking-[0.25em] text-accent',
                )}
              >
                {t(
                  'sojournAuthShell.brand.eyebrow',
                  {},
                  { defaultValue: 'Stay somewhere extraordinary' },
                )}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('5xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mt', 4),
                  'leading-[0.95] text-white',
                )}
                style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
              >
                {t(
                  'sojournAuthShell.brand.heading',
                  {},
                  {
                    defaultValue:
                      'A curated collection of properties — beautifully presented, transparently priced.',
                  },
                )}
              </h2>
            </div>

            {/* Glass testimonial pill */}
            <figure
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface/15 backdrop-blur-xl rounded-2xl ring-1 ring-white/20',
              )}
            >
              <span
                className="material-symbols-outlined text-3xl text-accent"
                aria-hidden="true"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                format_quote
              </span>
              <blockquote
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.sp('mt', 3),
                  'text-white leading-snug font-medium',
                )}
              >
                {testimonial.quote}
              </blockquote>
              <figcaption
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mt', 4),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-white/80',
                )}
              >
                {testimonial.author}
              </figcaption>
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
              style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
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
                className={'hover:text-primary transition-colors'}
              >
                {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              </button>
              <button
                type="button"
                onClick={openTerms}
                className={'hover:text-primary transition-colors'}
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
