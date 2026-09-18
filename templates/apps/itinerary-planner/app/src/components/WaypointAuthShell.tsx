/**
 * Brand-panel auth shell — Catalog §13.3 Decorated-Card with Brand Panel.
 * Editorial travel photograph on the left with overlaid Waypoint wordmark,
 * "Every stop tells a story" tagline, and a glass testimonial pill +
 * decorative coral/teal blurred orbs. Centered card on the right hosts
 * the form. Layout collapses to a single column under `lg`.
 *
 * Used by Login / Signup / ForgotPassword / ResetPassword (per
 * screen-map.json — every auth screen derives from Login). Form contents
 * vary per screen-map.json's `derivationNotes`.
 *
 * Translated from travel-booking's SojournAuthShell.tsx — same chassis,
 * but the brand copy ("Every stop tells a story") and Plus Jakarta Sans
 * heading typography match Waypoint's DESIGN.md voice.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'

interface WaypointAuthShellProps {
  eyebrow: string
  heading: string
  subheading: string
  children: ReactNode
  footer?: ReactNode
  brandImage?: string
  testimonial?: { quote: string; author: string }
}

const DEFAULT_BRAND_IMAGE = 'https://picsum.photos/seed/waypoint-auth/1200/1600'

export function WaypointAuthShell({
  eyebrow,
  heading,
  subheading,
  children,
  footer,
  brandImage = DEFAULT_BRAND_IMAGE,
  testimonial,
}: WaypointAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const shownTestimonial = testimonial ?? {
    quote: t(
      'waypointAuthShell.testimonial.quote',
      { appName: APP_NAME },
      {
        defaultValue:
          '{{appName}} turned a hectic 3-week trip across four countries into the most relaxed itinerary we have ever shared.',
      },
    ),
    author: t(
      'waypointAuthShell.testimonial.author',
      { appName: APP_NAME },
      { defaultValue: 'Iris & Jonas · {{appName}} members since 2024' },
    ),
  }
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
              className="material-symbols-outlined text-primary text-3xl"
              aria-hidden="true"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              explore
            </span>
            <span
              className={cm.cn(
                cm.textSize('2xl'),
                cm.fontWeight('extrabold'),
                'text-primary tracking-tight',
              )}
              style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif' }}
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
          <div
            className={cm.cn(
              cm.w(80),
              cm.h(80),
              cm.roundedFull,
              'absolute -right-20 -top-20 bg-accent/40 blur-3xl',
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
                  'waypointAuthShell.brand.eyebrow',
                  { tagline: APP_TAGLINE },
                  { defaultValue: '{{tagline}}' },
                )}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('5xl'),
                  cm.fontWeight('extrabold'),
                  cm.sp('mt', 4),
                  'leading-[0.95] tracking-tight text-on-primary',
                )}
                style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif' }}
              >
                {t(
                  'waypointAuthShell.brand.heading',
                  {},
                  { defaultValue: 'Plan it once. Wander it together. Remember it forever.' },
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
                  'text-on-primary leading-snug font-medium',
                )}
              >
                {shownTestimonial.quote}
              </blockquote>
              <figcaption
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.sp('mt', 4),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-primary/80',
                )}
              >
                {shownTestimonial.author}
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
                'uppercase tracking-[0.25em] text-primary',
              )}
            >
              {eyebrow}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('extrabold'),
                cm.sp('mt', 2),
                'leading-tight tracking-tight',
              )}
              style={{ fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif' }}
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
