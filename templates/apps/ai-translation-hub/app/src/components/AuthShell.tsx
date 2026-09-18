import type { ReactNode } from 'react'

import { AuthShellContainer, AuthShellDecoration } from '@molecule/app-auth-shell-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from './Footer.js'

interface AuthShellProps {
  children: ReactNode
}

/**
 * Shared layout for every auth screen — ambient gradient backdrop,
 * centered card column, app footer pinned to the bottom.
 *
 * Pattern translated from ai-chatbot-builder's LoginCard glass-card
 * shell + the §13.0 anatomy in POLISHED-PATTERN-CATALOG.md.
 */
export function AuthShell({ children }: AuthShellProps) {
  const cm = getClassMap()

  return (
    <AuthShellContainer layout="column" className={cm.cn('bg-surface text-on-surface')}>
      <AuthShellDecoration>
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -top-40 -left-40 w-[800px] h-[800px] bg-gradient-to-br from-primary/15 to-tertiary/10 rounded-full blur-[120px] pointer-events-none',
          )}
        />
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-gradient-to-tr from-tertiary/10 to-primary/10 rounded-full blur-[120px] pointer-events-none',
          )}
        />
      </AuthShellDecoration>

      <main
        className={cm.cn(
          cm.flex1,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('p', 6),
          'relative z-10',
        )}
      >
        <div className={cm.cn(cm.w('full'), 'max-w-[440px]')}>{children}</div>
      </main>

      <div className={cm.cn('relative z-10')}>
        <Footer />
      </div>
    </AuthShellContainer>
  )
}
