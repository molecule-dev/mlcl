import type { ReactNode } from 'react'

import { AuthShellCard, AuthShellContainer } from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from './AuthBrandHeader.js'
import { Footer } from './Footer.js'
import { KbdBadge } from './KbdBadge.js'

interface AuthShellProps {
  brandSubtitle?: string
  heading?: string
  body?: string
  children: ReactNode
  footerSlot?: ReactNode
  showProTip?: boolean
}

/**
 * Branded auth shell — periwinkle gradient page background with a
 * centered card carrying the Yank wordmark, heading, slot for inputs,
 * and a floating ⌘K pro-tip on the bottom-right.
 */
export function AuthShell({
  brandSubtitle,
  heading,
  body,
  children,
  footerSlot,
  showProTip = true,
}: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <AuthShellContainer
      layout="column"
      className={cm.cn('font-body')}
      style={{
        background:
          'linear-gradient(135deg, var(--color-background) 0%, var(--color-surface-active) 100%)',
      }}
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -top-40 -right-32 w-[40rem] h-[40rem] rounded-full pointer-events-none',
        )}
        style={{ background: 'var(--color-primary)', filter: 'blur(140px)', opacity: 0.18 }}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -bottom-40 -left-32 w-[36rem] h-[36rem] rounded-full pointer-events-none',
        )}
        style={{ background: 'var(--color-primary-light)', filter: 'blur(140px)', opacity: 0.16 }}
      />

      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.flex1,
          cm.sp('p', 4),
          'relative z-10',
        )}
      >
        <div className={cm.cn(cm.w('full'), 'max-w-[420px]')}>
          <AuthShellCard
            outerClassName={cm.cn(cm.w('full'))}
            surfaceClassName={cm.cn('rounded-xl bg-surface border border-outline-variant/40')}
            className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 8))}
            style={{ boxShadow: '0 24px 48px -12px rgba(91,106,191,0.18)' }}
          >
            <AuthBrandHeader subtitle={brandSubtitle} />

            {(heading || body) && (
              <div className={cm.textCenter}>
                {heading && (
                  <h1
                    className={cm.cn(
                      cm.textSize('2xl'),
                      cm.fontWeight('bold'),
                      cm.sp('mb', 2),
                      'tracking-tight text-on-surface',
                    )}
                  >
                    {heading}
                  </h1>
                )}
                {body && (
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{body}</p>
                )}
              </div>
            )}

            {children}

            {footerSlot && <div className={cm.cn(cm.sp('pt', 2), cm.textCenter)}>{footerSlot}</div>}
          </AuthShellCard>

          <p
            className={cm.cn(
              cm.sp('mt', 4),
              cm.textCenter,
              cm.textSize('xs'),
              'text-on-surface-variant font-mono',
            )}
          >
            {t('authShell.version', {}, { defaultValue: 'v2.1.0' })}
          </p>
        </div>
      </main>

      {showProTip && (
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 4),
            cm.sp('py', 3),
            'fixed bottom-6 right-6 z-20 hidden md:flex bg-surface rounded-xl border border-outline-variant/40',
          )}
          style={{ boxShadow: '0 12px 32px -8px rgba(91,106,191,0.18)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-[20px]')}
            aria-hidden="true"
            style={{ color: 'var(--color-icon-success)' }}
          >
            lightbulb
          </span>
          <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('authShell.proTipPrefix', {}, { defaultValue: 'Pro tip:' })} <KbdBadge>⌘K</KbdBadge>{' '}
            {t('authShell.proTipSuffix', {}, { defaultValue: 'opens the command palette' })}
          </span>
        </div>
      )}

      <Footer />
    </AuthShellContainer>
  )
}

export default AuthShell
