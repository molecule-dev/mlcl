/**
 * Brand-panel auth shell — Catalog §13.3 Decorated-Card with Brand
 * Panel. Dusk-city photograph on the left with a MetroPulse gradient
 * overlay (`from-primary` deep teal to `primary-container` mist), a glass
 * testimonial pill, and decorative blurred orbs in the corners.
 * The form-card on the right collapses to a single column under `lg`.
 *
 * Used by Login / Signup / ForgotPassword / ResetPassword. Form contents
 * vary per screen-map.json's shape; form-state patterns come verbatim from
 * the donor's auth pages.
 */

import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'

interface MetroPulseAuthShellProps {
  eyebrow: string
  heading: string
  subheading: string
  children: ReactNode
  footer?: ReactNode
  brandImage?: string
  testimonial?: { quote: string; author: string }
}

const DEFAULT_BRAND_IMAGE = 'https://picsum.photos/seed/metropulse-dusk-city/1200/1600'

export function MetroPulseAuthShell({
  eyebrow,
  heading,
  subheading,
  children,
  footer,
  brandImage = DEFAULT_BRAND_IMAGE,
  testimonial,
}: MetroPulseAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const resolvedTestimonial = testimonial ?? {
    quote: t(
      'metroPulseAuthShell.testimonial.quote',
      {},
      {
        defaultValue:
          'I stopped camping at the bus stop — the board tells me when to leave the house, and the planner even warns me about the detour.',
      },
    ),
    author: t(
      'metroPulseAuthShell.testimonial.author',
      { app: APP_NAME },
      { defaultValue: 'Priya S. · {{app}} member since 2024' },
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
          <BrandWordmark />
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
                  'metroPulseAuthShell.brand.eyebrow',
                  {},
                  { defaultValue: 'Every line, every stop, live' },
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
                  'metroPulseAuthShell.brand.heading',
                  {},
                  {
                    defaultValue:
                      'Know exactly when to leave. Boards, detours, and door-to-door trips.',
                  },
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
