import { OAuthProviderLogo } from '@molecule/app-oauth-logos-react'
import { useOAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SocialLoginButtons() {
  const cm = getClassMap()
  const { t } = useTranslation()
  // The OAuth dance is entirely server-side: redirect() navigates the browser to the
  // backend initiation route (GET /users/oauth/:provider via the /api proxy), which
  // 302s to the provider's consent screen and returns to the callback. No client-id
  // env var is needed here. baseURL + oauthEndpoint must resolve to the mounted route.
  //
  // The list must name the providers the app actually BONDS (see
  // api/bonds/oauth-google.ts), and so must the buttons below: the initiation route
  // resolves the provider through `get('oauth', name)`, so a button for an unwired
  // name — a GitHub button in a project whose only bond is Google — sends the user
  // to `user.error.oauthServerNotConfigured`. This slice therefore ships exactly the
  // one button it wires; adding a provider means adding its bond (README → How to
  // adapt) AND its entry here, together.
  const { redirect } = useOAuth({
    baseURL: '/api',
    oauthProviders: ['google'],
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
    <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }))}>
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
    </div>
  )
}

export default SocialLoginButtons
export { SocialLoginButtons }
