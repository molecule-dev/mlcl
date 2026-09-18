import type { ReactNode } from 'react'

import { AuthShellCard, AuthShellContainer } from '@molecule/app-auth-shell-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from './AuthBrandHeader.js'
import { Footer } from './Footer.js'

interface AuthShellProps {
  /** Optional override for the tagline beneath the wordmark. */
  subtitle?: string
  children: ReactNode
}

/**
 * Branded shell for every Signet auth page (Login, Signup, Forgot, Reset).
 * Radial purple/gold gradient backdrop, tonal-surface card, outer Footer.
 */
export function AuthShell({ subtitle, children }: AuthShellProps) {
  const cm = getClassMap()
  return (
    <AuthShellContainer
      layout="column"
      className={cm.cn('font-body text-on-surface')}
      style={{
        background:
          'radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, transparent 45%), radial-gradient(circle at 88% 18%, color-mix(in srgb, var(--color-secondary) 10%, transparent) 0%, transparent 50%), var(--mol-color-background, var(--color-bg))',
      }}
    >
      <main
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('p', 6), 'flex-1')}
      >
        <AuthShellCard
          surfaceClassName={cm.cn(
            'bg-surface-container-lowest rounded-3xl shadow-xl shadow-primary/5 border border-outline-variant/40',
          )}
          className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }), cm.sp('p', 10))}
        >
          <AuthBrandHeader subtitle={subtitle} />
          {children}
        </AuthShellCard>
      </main>
      <Footer />
    </AuthShellContainer>
  )
}
