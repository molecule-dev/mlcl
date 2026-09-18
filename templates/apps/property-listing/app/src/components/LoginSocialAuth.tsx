import { useState } from 'react'

import { OAuthProviderLogo } from '@molecule/app-oauth-logos-react'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

type SocialAuthClient = {
  loginWithGoogle?: () => Promise<void>
  loginWithGithub?: () => Promise<void>
}

export default function LoginSocialAuth() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth() as unknown as SocialAuthClient
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      await auth.loginWithGoogle?.()
    } finally {
      setIsLoading(false)
    }
  }

  const handleGithubLogin = async () => {
    setIsLoading(true)
    try {
      await auth.loginWithGithub?.()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Social Auth */}
      <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }), cm.w('full'))}>
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
            cm.fontWeight('semibold'),
            cm.h(14),
            'bg-surface-container-low rounded-xl text-on-surface hover:bg-surface-container-high transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <OAuthProviderLogo provider="google" size={20} ariaLabel="" />
          <span>{t('oauth.google', {}, { defaultValue: 'Google' })}</span>
        </button>
        <button
          onClick={handleGithubLogin}
          disabled={isLoading}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
            cm.fontWeight('semibold'),
            cm.h(14),
            'bg-surface-container-low rounded-xl text-on-surface hover:bg-surface-container-high transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <OAuthProviderLogo provider="github" size={24} ariaLabel="" />
          <span>{t('oauth.github', {}, { defaultValue: 'GitHub' })}</span>
        </button>
      </div>
    </>
  )
}
export { LoginSocialAuth }
