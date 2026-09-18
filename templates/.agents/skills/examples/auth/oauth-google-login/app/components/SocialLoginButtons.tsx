import { useOAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { OAuthProviderLogo } from '@molecule/app-oauth-logos-react'

function SocialLoginButtons() {
  const cm = getClassMap()
  const { t } = useTranslation()
  // The OAuth dance is entirely server-side: redirect() navigates the browser to the
  // backend initiation route (GET /users/oauth/:provider via the /api proxy), which
  // 302s to the provider's consent screen and returns to the callback. No client-id
  // env var is needed here. baseURL + oauthEndpoint must resolve to the mounted route.
  const { redirect } = useOAuth({
    baseURL: '/api',
    oauthProviders: ['google', 'github'],
    oauthEndpoint: '/users/oauth',
  })
  const buttonClass = cm.cn(
    cm.roundedFull,
    cm.sp('py', 3),
    cm.sp('px', 6),
    cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
    'border border-outline-variant/40 hover:bg-surface-container-high transition-colors',
  )
  return (
    <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
      <button
        type="button"
        data-mol-id="oauth-google"
        onClick={() => redirect('google')}
        className={buttonClass}
      >
        <OAuthProviderLogo provider="google" size={20} ariaLabel="" />
        <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
          {t('socialLoginButtons.google', {}, { defaultValue: 'Google' })}
        </span>
      </button>
      <button
        type="button"
        data-mol-id="oauth-github"
        onClick={() => redirect('github')}
        className={buttonClass}
      >
        <OAuthProviderLogo provider="github" size={20} ariaLabel="" />
        <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
          {t('socialLoginButtons.github', {}, { defaultValue: 'GitHub' })}
        </span>
      </button>
    </div>
  )
}

export default SocialLoginButtons
export { SocialLoginButtons }
