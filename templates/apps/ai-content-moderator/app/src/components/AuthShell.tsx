import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { AuthShellCardColumn, AuthShellPanel } from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_DESCRIPTION, APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'

interface AuthShellProps {
  /** Form heading shown above the form (e.g. "Welcome back"). */
  heading: string
  /** Subheading shown below the heading. */
  subheading?: string
  /** Form contents. */
  children: ReactNode
  /** Footer paragraph text + link (rendered under the form). */
  footer?: ReactNode
}

/**
 * Two-pane branded auth shell for Sift — dark slate brand pane (left) +
 * white form pane (right). Used by Login/Signup/ForgotPassword/ResetPassword.
 *
 * Decoration: radial-gradient fog + abstract "signal" curve in the bottom
 * corner of the brand pane. Inline styles are reserved for things ClassMap
 * can't express (radial gradients, custom radii, exact slate hex).
 */
export function AuthShell({ heading, subheading, children, footer }: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({}),
        cm.minH('screen'),
        'bg-background font-body text-on-surface selection:bg-primary-container selection:text-on-primary',
      )}
    >
      <div className={cm.cn(cm.flex({}), 'w-full h-screen overflow-hidden')}>
        {/* Brand pane (md+) */}
        <AuthShellPanel
          className={cm.cn('flex-col justify-between w-1/2 p-12 relative overflow-hidden')}
          style={{ backgroundColor: 'var(--color-on-secondary-fixed)' }}
          aria-hidden="true"
        >
          <Link to="/" className={cm.cn('z-10 inline-block')} tabIndex={-1}>
            <BrandWordmark as="span" invert size="lg" withTagline />
          </Link>
          <div className={cm.cn('z-10 max-w-md')}>
            <h2
              className={cm.cn('font-headline text-3xl font-bold tracking-tight text-white mb-4')}
            >
              {t('auth.brandHeading', {}, { defaultValue: 'Signal through the noise.' })}
            </h2>
            <p className={cm.cn('text-secondary-fixed-dim text-base leading-relaxed')}>
              {APP_DESCRIPTION}
            </p>
            <ul className={cm.cn('mt-8 space-y-3 text-secondary-fixed-dim text-sm')}>
              <li className={cm.cn('flex items-center gap-3')}>
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined text-[18px] text-primary/70')}
                >
                  shield
                </span>
                <span>
                  {t(
                    'auth.benefit.compliance',
                    {},
                    { defaultValue: 'Audit-ready logs for every verdict and escalation' },
                  )}
                </span>
              </li>
              <li className={cm.cn('flex items-center gap-3')}>
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined text-[18px] text-primary/70')}
                >
                  bolt
                </span>
                <span>
                  {t(
                    'auth.benefit.speed',
                    {},
                    { defaultValue: 'AI confidence + reasoning surfaced on every item' },
                  )}
                </span>
              </li>
              <li className={cm.cn('flex items-center gap-3')}>
                <span
                  aria-hidden="true"
                  className={cm.cn('material-symbols-outlined text-[18px] text-primary/70')}
                >
                  groups
                </span>
                <span>
                  {t(
                    'auth.benefit.team',
                    {},
                    { defaultValue: 'Built for trust & safety teams reviewing thousands per day' },
                  )}
                </span>
              </li>
            </ul>
          </div>
          {/* Decorative orb + signal curve — outside ClassMap surface area */}
          <div
            className={cm.cn(
              'absolute inset-0 z-0 opacity-25 pointer-events-none flex items-center justify-center',
            )}
            aria-hidden="true"
          >
            <div
              className={cm.cn(
                'absolute -right-32 -bottom-32 w-[420px] h-[420px] rounded-full blur-3xl',
              )}
              style={{
                background:
                  'radial-gradient(closest-side, color-mix(in srgb, var(--color-primary) 55%, transparent), transparent)',
              }}
            />
            <svg
              className={cm.cn('absolute right-0 bottom-0 w-3/4 h-3/4 text-primary/30')}
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <path
                d="M0,100 C30,90 40,50 60,60 C80,70 90,20 100,0 L100,100 Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </AuthShellPanel>

        {/* Form pane */}
        <AuthShellCardColumn
          className={cm.cn(
            cm.flex1,
            cm.sp('p', 8),
            'bg-surface-container-lowest relative z-10 sm:p-12 lg:p-16',
          )}
          style={{
            boxShadow: '0 0 40px color-mix(in srgb, var(--color-on-background) 5%, transparent)',
          }}
        >
          {/* Mobile brand */}
          <Link to="/" className={cm.cn('absolute top-8 left-8 lg:hidden')} aria-label={APP_NAME}>
            <BrandWordmark as="span" />
          </Link>
          <div className={cm.cn('w-full max-w-[400px]')}>
            <header className={cm.cn('mb-10')}>
              <h2
                className={cm.cn(
                  'font-headline text-3xl font-bold tracking-tight text-on-surface mb-2',
                )}
              >
                {heading}
              </h2>
              {subheading && (
                <p className={cm.cn('text-on-surface-variant text-base')}>{subheading}</p>
              )}
            </header>
            <div className={cm.cn('space-y-6')}>{children}</div>
            {footer && <div className={cm.cn('mt-10 text-center')}>{footer}</div>}
          </div>
        </AuthShellCardColumn>
      </div>
    </div>
  )
}
