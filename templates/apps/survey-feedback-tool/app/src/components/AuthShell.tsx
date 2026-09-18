/**
 * Branded auth shell — left brand panel with Gauge gradient + sample
 * NPS rating preview, right form panel. Used by Login, Signup,
 * ForgotPassword, ResetPassword.
 *
 * Catalog §13.3 "Decorated card with brand panel" with §13.4 decoration
 * recipe (corner orbs + sample-card overlay). Brand panel collapses on
 * small screens (catalog §13.0 anatomy). Translated from
 * customer-support-chat AuthShell.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface AuthShellProps {
  /** Form heading (e.g. "Welcome back"). */
  heading: string
  /** Smaller line under the heading. */
  subheading?: string
  /** Form body. */
  children: ReactNode
  /** Footer link row (e.g. "Don't have an account? Sign up"). */
  footer?: ReactNode
}

function AuthShell({ heading, subheading, children, footer }: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.sp('p', 4),
        'bg-gradient-to-br from-[var(--color-bg-tertiary)] via-[var(--color-text)] to-[var(--color-bg-tertiary)] dark:from-[var(--color-bg)] dark:via-[var(--color-bg-secondary)] dark:to-[var(--color-bg)]',
      )}
    >
      <main
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.w('full'),
          cm.maxW('5xl'),
          'lg:flex-row bg-surface rounded-[1.75rem] shadow-lg overflow-hidden border border-[color:var(--color-border)]',
        )}
      >
        <aside
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between' }),
            cm.sp('p', 10),
            'lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary text-white',
          )}
        >
          <div className={cm.cn('relative z-10')}>
            <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(10),
                  cm.h(10),
                  cm.roundedFull,
                  'bg-surface/20 backdrop-blur-md',
                )}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 20 }}
                  aria-hidden="true"
                >
                  graphic_eq
                </span>
              </span>
              <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                {APP_NAME}
              </span>
            </Link>
            <p
              className={cm.cn(
                cm.textSize('3xl'),
                cm.sp('mt', 8),
                'font-extrabold tracking-tight leading-[1.1]',
              )}
            >
              {t(
                'authShell.tagline',
                {},
                { defaultValue: 'Every voice matters. Every signal heard.' },
              )}
            </p>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 4),
                'text-white/85 max-w-sm leading-relaxed',
              )}
            >
              {t(
                'authShell.subline',
                { app: APP_NAME },
                {
                  defaultValue:
                    '{{app}} turns raw feedback into NPS, CSAT, and product clarity — sign in to keep listening.',
                },
              )}
            </p>
          </div>
          {/* Sample question preview */}
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 3 }),
              cm.sp('p', 4),
              cm.sp('mt', 8),
              'relative z-10 bg-surface/10 backdrop-blur-md rounded-2xl border border-surface/15',
            )}
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-white/80',
              )}
            >
              {t('authShell.previewEyebrow', {}, { defaultValue: 'Question 4 of 5' })}
            </span>
            <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
              {t(
                'authShell.previewQuestion',
                {},
                {
                  defaultValue: 'How likely are you to recommend us to a friend?',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ gap: 1 }))}>
              {Array.from({ length: 11 }).map((_, score) => (
                <span
                  key={score}
                  aria-hidden="true"
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.fontWeight('bold'),
                    cm.flex1,
                    'h-7 text-xs rounded-md tabular-nums bg-surface/15',
                    score === 9 && 'bg-surface/40 text-white shadow-md',
                  )}
                >
                  {score}
                </span>
              ))}
            </div>
          </div>
          <div
            aria-hidden="true"
            className={cm.cn(
              cm.w(80),
              cm.h(80),
              cm.roundedFull,
              'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
            )}
          />
          <div
            aria-hidden="true"
            className={cm.cn(
              cm.w(20),
              cm.h(20),
              cm.roundedFull,
              'absolute right-10 top-10 bg-surface/15 blur-xl',
            )}
          />
        </aside>
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'center' }),
            cm.sp('p', 10),
            'lg:w-1/2',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }), cm.sp('mb', 6))}>
            <h1
              className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {heading}
            </h1>
            {subheading && (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{subheading}</p>
            )}
          </div>
          {children}
          {footer && (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 1 }),
                cm.sp('mt', 6),
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              {footer}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default AuthShell
export { AuthShell }
