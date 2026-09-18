import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

interface StillpointAuthShellProps {
  /** h2 heading ("Welcome back", "Create your account", …). */
  heading: string
  /** Short paragraph below the heading. */
  subheading?: string
  /** Footer slot — typically the cross-link to the sibling auth page. */
  footer?: ReactNode
  /** Form / OAuth / fields. */
  children: ReactNode
}

/**
 * Brand-consistent split auth shell — twilight indigo gradient panel on the
 * left with the Stillpoint wordmark + concentric breath rings + decorative
 * lotus emoji, form card on the right.
 *
 * Catalog §13.3 (Decorated Brand Panel) variant adapted to Stillpoint's
 * calm indigo/saffron palette. Used by Login / Signup / ForgotPassword /
 * ResetPassword. Translated from calorie-counter's NoshAuthShell.tsx.
 */
export function StillpointAuthShell({
  heading,
  subheading,
  footer,
  children,
}: StillpointAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased flex')}>
      <aside
        className={cm.cn(
          'hidden lg:flex w-1/2 bg-gradient-to-br from-[var(--color-hero-from)] via-primary to-[var(--color-cat-mindfulness)] relative overflow-hidden items-center justify-center flex-col p-12',
        )}
        aria-hidden="true"
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'absolute inset-0 opacity-25 pointer-events-none',
          )}
        >
          <svg
            className={cm.cn('w-[140%] h-[140%] stroke-white fill-none stroke-[1] opacity-70')}
            viewBox="0 0 100 100"
          >
            {[10, 18, 26, 34, 42].map((r) => (
              <circle key={r} cx="50" cy="50" r={r} strokeOpacity={0.5 - r / 120} />
            ))}
          </svg>
        </div>
        <div
          className={cm.cn(
            'absolute -top-24 -left-24 w-96 h-96 bg-surface/10 rounded-full blur-3xl',
          )}
        />
        <div
          className={cm.cn(
            'absolute -bottom-32 -right-20 w-80 h-80 bg-accent/30 rounded-full blur-3xl',
          )}
        />
        <div className={cm.cn('absolute top-1/4 right-1/4 text-5xl opacity-30 select-none')}>
          🪷
        </div>
        <div className={cm.cn('absolute bottom-1/4 left-1/4 text-4xl opacity-25 select-none')}>
          🌙
        </div>
        {/* tabIndex -1: this decorative aside is aria-hidden, so its logo link
            must not be keyboard-focusable (axe aria-hidden-focus, serious). */}
        <Link
          to="/"
          tabIndex={-1}
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            'relative z-10 text-center',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-white/90 mb-3')}
            style={{ fontSize: 56, fontVariationSettings: "'FILL' 1" }}
          >
            self_improvement
          </span>
          <span
            className={cm.cn('text-[56px] font-black text-white tracking-tight leading-none mb-4')}
          >
            {APP_NAME}
          </span>
          <span
            className={cm.cn(
              cm.textSize('xl'),
              'text-white/85 font-medium max-w-sm leading-relaxed',
            )}
          >
            {t('stillpoint.auth.tagline', {}, { defaultValue: APP_TAGLINE })}
          </span>
        </Link>
      </aside>

      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'w-full lg:w-1/2 bg-surface p-6 sm:p-12',
        )}
      >
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'w-full max-w-[440px]')}>
          <Link to="/" className={cm.cn('lg:hidden text-center mb-2 block')}>
            <span
              className={cm.cn(cm.fontWeight('bold'), 'text-4xl text-primary tracking-tight block')}
            >
              {APP_NAME}
            </span>
            <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1 block')}>
              {t('stillpoint.auth.tagline', {}, { defaultValue: APP_TAGLINE })}
            </span>
          </Link>

          <header className={cm.cn(cm.textCenter, 'lg:text-left')}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'text-3xl text-on-surface leading-tight',
              )}
            >
              {heading}
            </h2>
            {subheading ? (
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>{subheading}</p>
            ) : null}
          </header>

          {children}

          {footer ? (
            <footer className={cm.cn(cm.textCenter, 'mt-2')}>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{footer}</p>
            </footer>
          ) : null}
        </div>
      </main>
    </div>
  )
}
