import type { ReactNode } from 'react'

import {
  AuthShellCard,
  AuthShellContainer,
  AuthShellDecoration,
} from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from './AuthBrandHeader.js'
import { Footer } from './Footer.js'

interface AuthShellProps {
  children: ReactNode
  /** Optional centered footer slot (e.g. "Don't have an account? Sign up"). */
  altLink?: ReactNode
}

/**
 * §13.1 centered card on a soft cyan radial background — every Catapult
 * auth page (Login/Signup/Forgot/Reset) renders inside this shell so the
 * brand header, card chrome, and footer stay identical.
 */
export function AuthShell({ children, altLink }: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <AuthShellContainer layout="column">
      <AuthShellDecoration>
        <div
          className={cm.cn('absolute inset-0')}
          style={{
            background:
              'radial-gradient(ellipse at top, rgba(8,145,178,0.15) 0%, rgba(8,145,178,0) 60%)',
          }}
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
            surfaceClassName="rounded-xl bg-surface-container-lowest shadow-xl border border-outline-variant"
            className={cm.sp('p', 10)}
            dataMolId="auth-card"
          >
            <AuthBrandHeader />
            {children}
          </AuthShellCard>

          {altLink && (
            <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
              <div
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant',
                )}
              >
                {altLink}
              </div>
            </footer>
          )}

          <p
            className={cm.cn(
              cm.sp('mt', 6),
              cm.textCenter,
              cm.textSize('xs'),
              // /80 alpha dropped this to 4.33:1 on #f0f9ff (axe serious); solid token = 7.1:1
              'text-on-surface-variant',
            )}
          >
            {t(
              'authShell.tos',
              {},
              { defaultValue: 'By continuing you agree to our Terms and Privacy Policy.' },
            )}
          </p>
        </div>
      </main>

      <Footer />
    </AuthShellContainer>
  )
}

export default AuthShell
