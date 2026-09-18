import type { ReactNode } from 'react'
import { Link } from 'react-router'

import {
  AuthShellCard,
  AuthShellContainer,
  AuthShellDecoration,
} from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_GRADIENT } from '../branding.js'
import { AuthBrandHeader } from './AuthBrandHeader.js'
import { Footer } from './Footer.js'

interface AuthShellProps {
  children: ReactNode
  title: string
  subtitle?: string
  footerPrompt?: ReactNode
}

/**
 * Shared decorative shell — two soft brand-gradient orbs + centered card,
 * outer Footer. Translated from ai-document-processor's AuthShell.
 */
export function AuthShell({ children, title, subtitle, footerPrompt }: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <AuthShellContainer
      layout="column"
      className={cm.cn('bg-surface-container-low text-on-surface')}
    >
      <AuthShellDecoration>
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-25 blur-3xl pointer-events-none',
          )}
          style={{ background: BRAND_GRADIENT }}
        />
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full opacity-20 blur-3xl pointer-events-none',
          )}
          style={{ background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)' }}
        />
      </AuthShellDecoration>

      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          cm.flex1,
          cm.sp('p', 6),
          'relative z-10',
        )}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
          <AuthShellCard
            outerClassName={cm.cn(cm.w('full'))}
            surfaceClassName={cm.cn(
              'rounded-3xl bg-surface-container-lowest shadow-2xl shadow-primary/10 border border-outline-variant/30',
            )}
            className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 10))}
          >
            <AuthBrandHeader />

            <div className={cm.textCenter}>
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.sp('mb', 1),
                  'font-bold tracking-tight text-on-surface',
                )}
              >
                {title}
              </h2>
              {subtitle ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{subtitle}</p>
              ) : null}
            </div>

            {children}
          </AuthShellCard>

          {footerPrompt ? (
            <footer className={cm.cn(cm.sp('mt', 6), cm.textCenter)}>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{footerPrompt}</p>
            </footer>
          ) : (
            <p
              className={cm.cn(
                cm.sp('mt', 6),
                cm.textCenter,
                cm.textSize('xs'),
                'text-on-surface-variant',
              )}
            >
              <Link to="/" className={cm.cn('hover:text-primary transition-colors')}>
                {t('authShell.backToLanding', {}, { defaultValue: '← Back to landing' })}
              </Link>
            </p>
          )}
        </div>
      </main>
      <div className={cm.cn('relative z-10')}>
        <Footer />
      </div>
    </AuthShellContainer>
  )
}
