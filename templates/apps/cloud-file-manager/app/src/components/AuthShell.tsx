import type { ReactNode } from 'react'

import { AuthShellCardColumn, AuthShellPanel } from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { NimbusBrandMark } from './NimbusBrandMark.js'

/**
 * Split-panel auth shell — left brand panel with floating glass cards
 * (catalog §13.3 + §13.4 decoration recipes), right form column on a
 * surface-container-low canvas.
 *
 * Used by Login / Signup / ForgotPassword / ResetPassword. The form column
 * accepts arbitrary children so each page controls its heading, fields,
 * submit copy and footer link without repeating the surrounding chrome.
 */
export interface AuthShellProps {
  /** Heading rendered above the form (e.g. "Welcome back"). */
  heading: string
  /** Sub-text between the heading and the form. */
  subheading: string
  /** Form + OAuth + footer link content. */
  children: ReactNode
}

export function AuthShell({ heading, subheading, children }: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(cm.flex({}), cm.minH('screen'), 'bg-background text-on-surface antialiased')}
    >
      <AuthShellPanel
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'center' }),
          cm.sp('p', 12),
          'w-[45%] relative overflow-hidden bg-gradient-to-br from-surface-bright to-surface-dim',
        )}
        aria-hidden="true"
      >
        <div
          className={cm.cn(
            'absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-primary-fixed opacity-40 blur-[100px]',
            cm.roundedFull,
          )}
        />
        <div
          className={cm.cn(
            'absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-tertiary-fixed opacity-30 blur-[120px]',
            cm.roundedFull,
          )}
        />
        <div className={cm.cn(cm.flex({ direction: 'col' }), cm.maxW('lg'), 'relative z-10')}>
          <NimbusBrandMark size="lg" showTagline />
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w('full'),
              cm.h(96),
              cm.sp('mt', 8),
              'relative',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(64),
                cm.h(40),
                'absolute bg-surface-container-highest rounded-2xl opacity-60 -rotate-12 translate-y-12 -translate-x-12 shadow-lg',
              )}
            >
              <span
                className={cm.cn(
                  'material-symbols-outlined text-outline-variant',
                  cm.textSize('4xl'),
                )}
                aria-hidden="true"
              >
                folder_open
              </span>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.w(72),
                cm.h(48),
                'absolute bg-surface-container-low rounded-2xl opacity-80 rotate-6 translate-y-4 translate-x-8 shadow-xl border border-outline-variant/20',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-outline', cm.textSize('5xl'))}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                description
              </span>
            </div>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col' }),
                cm.w(80),
                cm.h(56),
                cm.sp('p', 6),
                'absolute bg-surface-container-lowest/80 backdrop-blur-2xl rounded-2xl shadow-2xl border border-outline-variant/30 z-20',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(12),
                  cm.h(12),
                  cm.sp('mb', 6),
                  'rounded-xl bg-primary-fixed',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-primary', cm.textSize('2xl'))}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  cloud_sync
                </span>
              </div>
              <div
                className={cm.cn(
                  cm.h(3),
                  cm.sp('mb', 3),
                  cm.roundedFull,
                  'w-3/4 bg-surface-variant',
                )}
              />
              <div
                className={cm.cn(
                  cm.h(3),
                  cm.sp('mb', 6),
                  cm.roundedFull,
                  'w-1/2 bg-surface-variant',
                )}
              />
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mt-auto')}>
                <div className={cm.cn(cm.w(8), cm.h(8), cm.roundedFull, 'bg-surface-variant')} />
                <div
                  className={cm.cn(cm.w(16), cm.h(8), 'bg-primary-container rounded-lg opacity-30')}
                />
              </div>
            </div>
          </div>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 12),
              'uppercase tracking-widest font-semibold text-on-surface-variant',
            )}
          >
            {t(
              'authShell.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}} Archive' },
            )}
          </p>
        </div>
      </AuthShellPanel>
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.w('full'),
          'lg:w-[55%] bg-surface-container-low overflow-y-auto',
        )}
      >
        <div className={cm.cn(cm.flex({ justify: 'center' }), cm.sp('pt', 8), 'lg:hidden')}>
          <NimbusBrandMark size="sm" showIcon />
        </div>
        <AuthShellCardColumn className={cm.cn(cm.sp('p', 6), cm.flex1)}>
          <div className={cm.cn(cm.flex({ direction: 'col' }), cm.w('full'), 'max-w-[440px]')}>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'md' }),
                cm.sp('p', 10),
                'rounded-2xl bg-surface-container-lowest shadow-xl',
              )}
            >
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.textCenter)}>
                <h1
                  className={cm.cn(
                    cm.textSize('3xl'),
                    cm.fontWeight('bold'),
                    'tracking-tight text-on-surface',
                  )}
                >
                  {heading}
                </h1>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{subheading}</p>
              </div>
              {children}
            </div>
            <p
              className={cm.cn(
                cm.textCenter,
                cm.sp('mt', 6),
                cm.textSize('xs'),
                'uppercase tracking-widest font-semibold text-on-surface-variant',
              )}
            >
              {t(
                'authShell.footer',
                {},
                { defaultValue: 'Secure cloud storage · End-to-end encrypted' },
              )}
            </p>
          </div>
        </AuthShellCardColumn>
      </div>
    </div>
  )
}
