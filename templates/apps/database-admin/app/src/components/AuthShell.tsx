import {
  AuthShellCard,
  AuthShellContainer,
  AuthShellDecoration,
} from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CommandHint } from './CommandHint.js'
import { QuarryBrandMark } from './QuarryBrandMark.js'

/**
 * Quarry-branded auth shell — centered card on the dark Quarry surface
 * with green/cyan glow accents and a meta-footer below the card.
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
      className={cm.cn(
        'font-body antialiased selection:bg-primary/30 selection:text-white grid-bg',
      )}
    >
      <AuthShellDecoration>
        <div className={cm.cn('glow-green')} aria-hidden="true" />
        <div className={cm.cn('glow-cyan')} aria-hidden="true" />
      </AuthShellDecoration>

      <main className={cm.cn('relative z-10 w-full max-w-[420px] p-6')} data-mol-id="auth-shell">
        <AuthShellCard
          outerClassName={cm.cn(cm.w('full'))}
          surfaceClassName={cm.cn(
            'rounded-lg border border-border bg-surface shadow-2xl backdrop-blur-sm',
          )}
          className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }), cm.sp('p', 10))}
        >
          <header
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              'text-center',
            )}
          >
            <div className={cm.cn('mb-4')}>
              <QuarryBrandMark size="lg" />
            </div>
            <h1 className={cm.cn('text-xl font-headline font-semibold text-text')}>{heading}</h1>
            {tagline ? (
              <p className={cm.cn('text-sm font-mono tracking-wide text-muted')}>{tagline}</p>
            ) : null}
          </header>

          {children}

          {footer ? (
            <div className={cm.cn('pt-2 text-center text-sm text-muted')}>{footer}</div>
          ) : null}
        </AuthShellCard>

        <div
          className={cm.cn(
            'mt-8 flex items-center justify-center gap-3 text-[10px] font-mono uppercase tracking-widest text-muted/50',
          )}
        >
          <span>v1.0.4</span>
          <span aria-hidden="true" className={cm.cn('h-1 w-1 rounded-full bg-border')} />
          <span>{t('authShell.ssoSupported', {}, { defaultValue: 'SSO supported' })}</span>
          <span aria-hidden="true" className={cm.cn('h-1 w-1 rounded-full bg-border')} />
          <CommandHint size="xs">⌘K</CommandHint>
          <span>{t('authShell.commands', {}, { defaultValue: 'Commands' })}</span>
        </div>
      </main>
    </AuthShellContainer>
  )
}
