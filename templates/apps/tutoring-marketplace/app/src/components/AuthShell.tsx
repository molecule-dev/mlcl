import { Link } from 'react-router'

import { AuthShellCard, AuthShellContainer } from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from './Footer.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * Auth-page shell — soft brand-tinted page background with corner orbs,
 * compact top bar (logo + theme toggle), centered card with brand header,
 * footer band.
 */

export type AuthShellProps = {
  eyebrow?: string
  heading: string
  subheading?: string
  children: React.ReactNode
  footerLeft?: React.ReactNode
  footerRight?: React.ReactNode
}

export function AuthShell({
  eyebrow,
  heading,
  subheading,
  children,
  footerLeft,
  footerRight,
}: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <AuthShellContainer layout="column" className={cm.cn(cm.page)}>
      <div
        aria-hidden="true"
        className={cm.cn(
          'pointer-events-none absolute -left-32 -top-32 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-40',
        )}
        style={{ backgroundColor: 'var(--chalk-booked-light)' }}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'pointer-events-none absolute -right-24 top-40 w-72 h-72 rounded-full blur-3xl opacity-50',
        )}
        style={{ backgroundColor: 'var(--chalk-top-rated-light)' }}
      />
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 5),
          'relative z-10',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-xl shadow-md',
            )}
            style={{
              width: 36,
              height: 36,
              background:
                'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-primary-dark) 100%)',
            }}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined text-on-primary')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              edit_note
            </span>
          </span>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xl'),
              'font-display tracking-tight',
            )}
          >
            {APP_NAME}
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.flex1,
          cm.sp('px', 6),
          cm.sp('py', 8),
          'relative z-10',
        )}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'), cm.stack(6))}>
          <AuthShellCard
            outerClassName={cm.cn(cm.w('full'))}
            surfaceClassName={cm.cn(
              'bg-surface-container-lowest rounded-3xl shadow-xl border border-outline-variant/15',
            )}
            className={cm.cn(cm.sp('p', 8), cm.stack(6))}
          >
            {/* A <div>, not <header>: the app bar above is the page's single
                banner — a second <header> here reads as a duplicated app bar. */}
            <div className={cm.cn(cm.textCenter, cm.stack(2))}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'rounded-2xl shadow-md mx-auto',
                )}
                style={{
                  width: 56,
                  height: 56,
                  background:
                    'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-primary-dark) 100%)',
                }}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined text-on-primary text-3xl')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  edit_note
                </span>
              </span>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-primary',
                )}
              >
                {eyebrow ??
                  t(
                    'auth.shell.tagline',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
              </p>
              <h1
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('3xl'),
                  'font-display tracking-tight',
                )}
              >
                {heading}
              </h1>
              {subheading && (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{subheading}</p>
              )}
            </div>
            {children}
          </AuthShellCard>
          {(footerLeft || footerRight) && (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              <span>{footerLeft}</span>
              <span>{footerRight}</span>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </AuthShellContainer>
  )
}
