/**
 * Brand-panel auth shell — Catalog §13.3 Decorated-Card with Brand
 * Panel. Sky-lit cloud photograph on the left with a Skylark gradient
 * overlay (`from-primary` deep navy to `primary-container` slate-blue),
 * a glass testimonial pill, and decorative blurred orbs in the corners.
 * The form-card on the right collapses to a single column under `lg`.
 *
 * Used by Login / Signup / ForgotPassword / ResetPassword. Form
 * contents vary per screen-map.json's `derivationNotes`.
 *
 * Translated from hotel-booking's SojournAuthShell.tsx with the photo
 * swapped for a sky/clouds image and the eyebrow/headline copy mapped
 * to Skylark's flight-search brand voice.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'

interface SkylarkAuthShellProps {
  eyebrow: string
  heading: string
  subheading: string
  children: ReactNode
  footer?: ReactNode
  brandImage?: string
  testimonial?: { quote: string; author: string }
}

const DEFAULT_BRAND_IMAGE = 'https://picsum.photos/seed/skylark-clouds/1200/1600'

export function SkylarkAuthShell({
  eyebrow,
  heading,
  subheading,
  children,
  footer,
  brandImage = DEFAULT_BRAND_IMAGE,
  testimonial,
}: SkylarkAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const resolvedTestimonial = testimonial ?? {
    quote: t(
      'skylarkAuthShell.testimonial.quote',
      {},
      {
        defaultValue:
          'Saved $480 on a Tokyo trip in five minutes — the price alerts pinged me when JFK→HND dropped overnight.',
      },
    ),
    author: t(
      'skylarkAuthShell.testimonial.author',
      { app: APP_NAME },
      { defaultValue: 'Maya R. · {{app}} member since 2024' },
    ),
  }
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
            <span
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                'bg-primary text-on-primary',
              )}
              aria-hidden="true"
            >
              <span
                className={'material-symbols-outlined text-lg'}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                flight
              </span>
            </span>
            <span
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'text-primary tracking-tight',
              )}
            >
              {APP_NAME}
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

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
              'absolute inset-0 object-cover opacity-50',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-br from-primary/95 via-secondary/85 to-primary-container/85',
            )}
            aria-hidden="true"
          />
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
                  'skylarkAuthShell.brand.eyebrow',
                  {},
                  { defaultValue: 'Every route, one search' },
                )}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('5xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mt', 4),
                  'leading-[0.95] text-white tracking-tight',
                )}
              >
                {t(
                  'skylarkAuthShell.brand.heading',
                  {},
                  { defaultValue: 'Compare every airline. Track every fare. Book the best one.' },
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
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.sp('mt', 3),
                  'text-white leading-snug font-medium',
                )}
              >
                {resolvedTestimonial.quote}
              </blockquote>
              <figcaption
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mt', 4),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-white/80',
                )}
              >
                {resolvedTestimonial.author}
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
                'leading-tight tracking-tight',
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
          </div>
        </main>
      </div>
    </div>
  )
}
