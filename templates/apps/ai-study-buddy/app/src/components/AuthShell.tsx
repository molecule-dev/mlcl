import type { ReactNode } from 'react'

import {
  AuthShellCard,
  AuthShellContainer,
  AuthShellDecoration,
} from '@molecule/app-auth-shell-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from './Footer.js'

interface AuthShellProps {
  children: ReactNode
  dataMolId?: string
}

/**
 * Branded auth-page shell — soft warm orange + teal glow orbs in the
 * background ("Digital Sanctuary" feel from DESIGN.md), centered card
 * slot, footer at the bottom.
 */
export function AuthShell({ children, dataMolId }: AuthShellProps) {
  const cm = getClassMap()
  return (
    <AuthShellContainer
      layout="column"
      className={cm.cn('overflow-x-hidden bg-surface text-on-surface antialiased')}
    >
      <AuthShellDecoration>
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -top-24 -right-24 w-[600px] h-[600px] rounded-full bg-secondary-fixed opacity-30 blur-[120px] mix-blend-multiply',
          )}
        />
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -bottom-32 -left-24 w-[500px] h-[500px] rounded-full bg-primary-fixed opacity-20 blur-[100px] mix-blend-multiply',
          )}
        />
      </AuthShellDecoration>

      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.flex1,
          cm.sp('p', 6),
          'relative z-10',
        )}
      >
        <AuthShellCard
          outerClassName={cm.cn(cm.w('full'), 'max-w-[440px]')}
          surfaceClassName={cm.cn('rounded-[2rem] bg-surface-container-lowest ambient-shadow')}
          dataMolId={dataMolId}
        >
          {children}
        </AuthShellCard>
      </main>
      <Footer />
    </AuthShellContainer>
  )
}
