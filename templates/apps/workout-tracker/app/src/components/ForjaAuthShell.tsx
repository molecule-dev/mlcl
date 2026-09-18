import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

interface ForjaAuthShellProps {
  /** h2 heading ("Welcome back", "Forge your account", …). */
  heading: string
  /** Short paragraph below the heading. */
  subheading?: string
  /** Footer slot — typically the cross-link to the sibling auth page. */
  footer?: ReactNode
  /** Form / OAuth / fields. */
  children: ReactNode
}

/**
 * Brand-consistent split auth shell — charcoal-to-near-black gradient panel
 * on the left with the Forja wordmark, a tagline stamp, and a stylised
 * barbell SVG; form card on the right.
 *
 * Catalog §13.3 (Decorated Brand Panel) variant translated from calorie-
 * counter's NoshAuthShell.tsx — replaces Nosh's emoji food motif with a
 * darker, gym-mood barbell + plate decoration. Used by Login / Signup /
 * ForgotPassword / ResetPassword.
 */
export function ForjaAuthShell({ heading, subheading, footer, children }: ForjaAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased flex')}>
      <aside
        className={cm.cn(
          'hidden lg:flex w-1/2 bg-gradient-to-br from-accent-container to-accent relative overflow-hidden items-center justify-center flex-col p-12',
        )}
        aria-hidden="true"
      >
        <div
          className={cm.cn(
            'absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/30 blur-3xl',
          )}
        />
        <div
          className={cm.cn(
            'absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-primary/15 blur-3xl',
          )}
        />

        <svg
          className={cm.cn('absolute inset-0 w-full h-full opacity-15')}
          viewBox="0 0 400 400"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <g stroke="currentColor" strokeWidth="2" fill="none" className={cm.cn('text-white')}>
            <line x1="80" y1="200" x2="320" y2="200" strokeWidth="6" />
            <rect x="60" y="170" width="20" height="60" rx="3" fill="currentColor" />
            <rect x="320" y="170" width="20" height="60" rx="3" fill="currentColor" />
            <rect x="40" y="150" width="20" height="100" rx="3" fill="currentColor" />
            <rect x="340" y="150" width="20" height="100" rx="3" fill="currentColor" />
          </g>
        </svg>

        <div
          className={cm.cn(
            'absolute top-12 left-12 text-white/30 text-[10px] font-black tracking-[0.4em] uppercase',
          )}
        >
          {t('forja.auth.markTop', {}, { defaultValue: 'Forged · Vol I' })}
        </div>
        <div
          className={cm.cn(
            'absolute bottom-12 left-12 text-white/30 text-[10px] font-black tracking-[0.4em] uppercase',
          )}
        >
          {t('forja.auth.markBottom', {}, { defaultValue: 'Iron · Discipline · Volume' })}
        </div>

        <Link
          to="/"
          // the decorative aside is aria-hidden, so this link must not be
          // focusable (axe serious: aria-hidden-focus)
          tabIndex={-1}
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            'relative z-10 text-center',
          )}
        >
          <span
            className={cm.cn(
              'text-[80px] font-black text-white tracking-tighter leading-none mb-4',
            )}
          >
            {APP_NAME}
          </span>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              'text-white/70 font-bold tracking-[0.32em] uppercase',
            )}
          >
            {t('forja.auth.tagline', {}, { defaultValue: APP_TAGLINE })}
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
            <span className={cm.cn('text-5xl font-black text-primary tracking-tighter block')}>
              {APP_NAME}
            </span>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant mt-2 block uppercase tracking-[0.32em] font-bold',
              )}
            >
              {t('forja.auth.tagline', {}, { defaultValue: APP_TAGLINE })}
            </span>
          </Link>

          <header className={cm.cn(cm.textCenter, 'lg:text-left')}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
                'text-3xl text-on-surface leading-tight tracking-tight',
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
