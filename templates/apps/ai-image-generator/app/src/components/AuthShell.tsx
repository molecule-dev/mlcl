import type { ReactNode } from 'react'

import {
  AuthShellBackLink,
  AuthShellCard,
  AuthShellContainer,
  AuthShellDecoration,
  AuthShellFooter,
  AuthShellHeading,
} from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'
import { BrandLogo } from './BrandLogo.js'

export interface AuthShellProps {
  heading: string
  subheading: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * Centered glassmorphic auth surface — dreamy purple/pink mesh-gradient
 * background, decorative orbs, brand mark + tagline panel and a glass card
 * for the form. Used by Login, Signup, Forgot/Reset Password.
 */
export function AuthShell({ heading, subheading, children, footer }: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <AuthShellContainer>
      <AuthShellDecoration>
        <div
          className={cm.cn(
            'absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 blur-[120px]',
          )}
        />
        <div
          className={cm.cn(
            'absolute bottom-0 right-0 w-[480px] h-[480px] rounded-full bg-secondary/30 blur-[100px]',
          )}
        />
        <div
          className={cm.cn(
            'absolute top-10 right-1/3 w-72 h-72 rounded-full bg-primary-container/40 blur-[80px]',
          )}
        />
      </AuthShellDecoration>

      <div>
        <AuthShellCard>
          <div className={cm.flex({ direction: 'col', align: 'center', gap: 'sm' })}>
            <BrandLogo showTagline={false} size="lg" />
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('brand.tagline', {}, { defaultValue: APP_TAGLINE })}
            </p>
          </div>

          <AuthShellHeading heading={heading} subheading={subheading} />

          {children}

          {footer ? <AuthShellFooter>{footer}</AuthShellFooter> : null}
        </AuthShellCard>

        <AuthShellBackLink to="/" />
      </div>
    </AuthShellContainer>
  )
}

export default AuthShell
