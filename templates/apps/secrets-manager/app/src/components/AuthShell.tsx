import {
  AuthShellCard,
  AuthShellContainer,
  AuthShellDecoration,
} from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ArcanumBrandMark } from './ArcanumBrandMark.js'

/**
 * Arcanum-branded auth shell — centered card on the dark Arcanum
 * surface with emerald/violet glow accents, brand mark on top, and a
 * meta-footer (version + SSO) below the card.
 */
interface AuthShellProps {
  heading: string
  tagline?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthShell({ heading, tagline, children, footer }: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <AuthShellContainer
      className={cm.cn('font-body antialiased selection:bg-primary/30 selection:text-white')}
    >
      <AuthShellDecoration>
        <div className={cm.cn('glow-emerald')} aria-hidden="true" />
        <div className={cm.cn('glow-violet')} aria-hidden="true" />
      </AuthShellDecoration>

      <main className={cm.cn('relative z-10 w-full max-w-[440px] p-6')} data-mol-id="auth-shell">
        <AuthShellCard
          outerClassName={cm.cn(cm.w('full'))}
          surfaceClassName={cm.cn(
            'rounded-xl border border-border bg-surface shadow-2xl backdrop-blur-sm',
          )}
          className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('p', 10))}
        >
          <header
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              'text-center',
            )}
          >
            <div className={cm.cn('mb-3')}>
              <ArcanumBrandMark size="lg" />
            </div>
            <h1 className={cm.cn('font-headline text-xl font-semibold text-text')}>{heading}</h1>
            {tagline ? (
              <p className={cm.cn('font-mono text-sm tracking-wide text-muted')}>{tagline}</p>
            ) : null}
          </header>

          {children}

          {footer ? (
            <div className={cm.cn('pt-1 text-center text-sm text-muted')}>{footer}</div>
          ) : null}
        </AuthShellCard>

        <div
          className={cm.cn(
            'mt-8 flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-widest text-muted/60',
          )}
        >
          <span>v1.0.0</span>
          <span aria-hidden="true" className={cm.cn('h-1 w-1 rounded-full bg-border')} />
          <span>
            {t('authShell.zeroKnowledge', {}, { defaultValue: 'Zero-knowledge encryption' })}
          </span>
          <span aria-hidden="true" className={cm.cn('h-1 w-1 rounded-full bg-border')} />
          <span>{t('authShell.ssoSupported', {}, { defaultValue: 'SSO + Passkey' })}</span>
        </div>
      </main>
    </AuthShellContainer>
  )
}
