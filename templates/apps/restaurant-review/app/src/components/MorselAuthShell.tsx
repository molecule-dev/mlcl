/**
 * Morsel auth shell — Catalog §13.3 Decorated-Card with Brand Panel.
 * Moody food photograph fills the left panel (50/50 split per
 * screen-map's Login derivationNotes), with overlaid Morsel brand mark,
 * editorial tagline, and a frosted-glass tasting-quote pill. The form
 * card lives in the right column.
 *
 * Used by Login / Signup / ForgotPassword / ResetPassword. Form
 * contents vary per screen-map.json's `derivationNotes`.
 *
 * Translated from hotel-booking's SojournAuthShell.tsx (brand-panel
 * decoration with photographic background + glass testimonial), with
 * Morsel typography (DM Serif Display headlines), saffron-gold accent
 * pills, and a food-tableau brand image override.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'

interface MorselAuthShellProps {
  eyebrow: string
  heading: string
  subheading: string
  children: ReactNode
  footer?: ReactNode
  /** Override the brand-panel image. Defaults to a moody Morsel-tableau photo. */
  brandImage?: string
  /** Optional small testimonial shown over the brand image. */
  testimonial?: { quote: string; author: string }
}

const DEFAULT_TESTIMONIAL = {
  quote:
    'Morsel is the only review app where I trust a four-star review. Real diners, real plates, real opinions.',
  author: 'Priya R. · Morsel Tastemaker since 2024',
}

const DEFAULT_BRAND_IMAGE = 'https://picsum.photos/seed/morsel-auth/1200/1600'

export function MorselAuthShell({
  eyebrow,
  heading,
  subheading,
  children,
  footer,
  brandImage = DEFAULT_BRAND_IMAGE,
  testimonial = DEFAULT_TESTIMONIAL,
}: MorselAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-background text-on-surface antialiased flex flex-col',
      )}
    >
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
            <span
              className={cm.cn(cm.textSize('2xl'), 'text-primary')}
              style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
            >
              {APP_NAME}
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className={cm.cn('flex-1 grid grid-cols-1 lg:grid-cols-2')}>
        <aside
          className={cm.cn('relative hidden lg:block bg-primary text-on-primary overflow-hidden')}
        >
          <img
            src={brandImage}
            alt=""
            className={cm.cn(
              cm.w('full'),
              cm.h('full'),
              'absolute inset-0 object-cover opacity-65',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-primary-container/85',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.w(80),
              cm.h(80),
              cm.roundedFull,
              'absolute -right-20 -top-20 bg-accent/35 blur-3xl',
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
                  'uppercase tracking-[0.3em] text-accent',
                )}
              >
                {t(
                  'morselAuthShell.brand.eyebrow',
                  {},
                  { defaultValue: 'Every bite tells a story' },
                )}
              </p>
              <h2
                className={cm.cn(cm.textSize('5xl'), cm.sp('mt', 4), 'leading-[0.95] text-white')}
                style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
              >
                {t(
                  'morselAuthShell.brand.heading',
                  {},
                  { defaultValue: 'Find your next favorite table — without the press-kit gloss.' },
                )}
              </h2>
            </div>

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
                className={cm.cn(cm.textSize('lg'), cm.sp('mt', 3), 'text-white leading-snug')}
                style={{ fontFamily: '"Lora", Georgia, serif', fontStyle: 'italic' }}
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

        <main
          className={cm.cn('flex items-center justify-center', cm.sp('px', 6), cm.sp('py', 12))}
        >
          <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.3em] text-primary',
              )}
            >
              {eyebrow}
            </p>
            <h1
              className={cm.cn(cm.textSize('4xl'), cm.sp('mt', 2), 'leading-tight italic')}
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
          </div>
        </main>
      </div>
    </div>
  )
}
