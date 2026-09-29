/**
 * Branded split-pane auth shell — purple gradient brand panel on the
 * left with frosted-glass orbs and Lectura wordmark, form card on the
 * right. Reused by Login / Signup / ForgotPassword / ResetPassword.
 *
 * Translated from POLISHED-PATTERN-CATALOG §13.3 (decorated card with
 * brand panel) into Lectura's purple/gold palette per DESIGN.md.
 */
import type { ReactNode } from 'react'

import { AuthShellCardColumn, AuthShellPanel } from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'

export type AuthShellProps = {
  heading: string
  subheading?: string
  children: ReactNode
  footer?: ReactNode
  brandTagline?: string
  socialProof?: string
}

export function AuthShell(props: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tagline =
    props.brandTagline ??
    t('authShell.tagline', {}, { defaultValue: 'Master anything,\nteach everything.' })
  const proof =
    props.socialProof ?? t('authShell.socialProof', {}, { defaultValue: 'Join 3M+ learners' })
  return (
    <div className={cm.cn('bg-background text-on-surface min-h-screen w-full flex')}>
      <AuthShellPanel
        className={cm.cn(
          'w-1/2 bg-gradient-to-br from-primary to-primary-container flex-col justify-between p-12 text-white relative overflow-hidden',
        )}
      >
        <div
          className={cm.cn(
            'absolute -top-40 -left-40 w-96 h-96 bg-surface/10 rounded-full blur-3xl pointer-events-none',
          )}
        ></div>
        <div
          className={cm.cn(
            'absolute top-1/2 -right-20 w-80 h-80 bg-secondary-container/30 rounded-full blur-3xl mix-blend-overlay pointer-events-none',
          )}
        ></div>
        <div className={cm.cn('relative z-10')}>
          <h1 className={cm.cn('mb-4 leading-none')}>
            <BrandWordmark as="span" size="lg" invert />
          </h1>
          <p
            className={cm.cn(
              'text-2xl font-bold leading-tight max-w-md whitespace-pre-line opacity-95',
            )}
          >
            {tagline}
          </p>
        </div>
        <div className={cm.cn('relative z-10 flex-1 flex items-center justify-center my-8')}>
          <div
            className={cm.cn(
              'w-full max-w-sm aspect-square rounded-[2rem] bg-surface/10 backdrop-blur-md border border-surface/15 shadow-2xl flex flex-col items-center justify-center p-8 gap-6',
            )}
          >
            <div
              className={cm.cn(
                'w-20 h-20 bg-secondary-container rounded-full flex items-center justify-center shadow-lg',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-4xl text-on-secondary-container')}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                school
              </span>
            </div>
            <div className={cm.cn('flex gap-3')}>
              <div className={cm.cn('bg-surface/20 p-3 rounded-xl backdrop-blur-md')}>
                <span
                  className={cm.cn('material-symbols-outlined text-2xl text-white')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  library_books
                </span>
              </div>
              <div className={cm.cn('bg-surface/20 p-3 rounded-xl backdrop-blur-md')}>
                <span
                  className={cm.cn('material-symbols-outlined text-2xl text-white')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_arrow
                </span>
              </div>
              <div className={cm.cn('bg-surface/20 p-3 rounded-xl backdrop-blur-md')}>
                <span
                  className={cm.cn('material-symbols-outlined text-2xl text-white')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  workspace_premium
                </span>
              </div>
            </div>
            <p className={cm.cn('text-center text-sm text-white/85 leading-relaxed')}>
              {t(
                'authShell.cardCopy',
                {},
                {
                  defaultValue:
                    'Curated courses from leading instructors. Earn certificates that mean something.',
                },
              )}
            </p>
          </div>
        </div>
        <div className={cm.cn('relative z-10 flex items-center gap-4')}>
          <div className={cm.cn('flex -space-x-3')}>
            {['a', 'b', 'c'].map((s) => (
              <img
                key={s}
                src={`https://i.pravatar.cc/64?u=lectura-${s}`}
                alt=""
                className={cm.cn('w-10 h-10 rounded-full border-2 border-primary object-cover')}
              />
            ))}
          </div>
          <p className={cm.cn('font-medium text-sm tracking-wide text-white/90')}>{proof}</p>
        </div>
      </AuthShellPanel>

      <AuthShellCardColumn
        className={cm.cn('w-full lg:w-1/2 min-h-screen bg-surface', cm.sp('p', 8))}
      >
        <div className={cm.cn('lg:hidden mb-8 text-center w-full max-w-[440px]')}>
          <h1 className={cm.cn('leading-none')}>
            <BrandWordmark as="span" />
          </h1>
        </div>
        <div
          className={cm.cn(
            cm.sp('p', 10),
            cm.maxW('md'),
            'w-full bg-surface-container-lowest rounded-2xl shadow-[0px_12px_32px_rgba(75,8,201,0.06)] flex flex-col',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'text-on-surface tracking-tight',
            )}
          >
            {props.heading}
          </h2>
          {props.subheading && (
            <p className={cm.cn(cm.textSize('base'), cm.sp('mb', 8), 'text-on-surface-variant')}>
              {props.subheading}
            </p>
          )}
          {props.children}
        </div>
        {props.footer && (
          <div className={cm.cn('mt-8 text-center text-sm font-medium')}>{props.footer}</div>
        )}
      </AuthShellCardColumn>
    </div>
  )
}

export default AuthShell
