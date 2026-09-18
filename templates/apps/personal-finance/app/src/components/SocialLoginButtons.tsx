import { OAuthProviderLogo } from '@molecule/app-oauth-logos-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SocialLoginButtons() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const oauthUnavailableLabel = t(
    'socialLoginButtons.oauthUnavailable',
    {},
    { defaultValue: 'Single sign-on is not available yet.' },
  )
  return (
    <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
      <button
        title={oauthUnavailableLabel}
        disabled
        className={cm.cn(
          cm.roundedFull,
          cm.sp('py', 3),
          cm.sp('px', 6),
          cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
          'bg-surface-container-high transition-colors group opacity-60 cursor-not-allowed',
        )}
      >
        <OAuthProviderLogo provider="google" size={20} ariaLabel="" />
        <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
          {t('oauth.google', {}, { defaultValue: 'Google' })}
        </span>
      </button>
      <button
        title={oauthUnavailableLabel}
        disabled
        className={cm.cn(
          cm.roundedFull,
          cm.sp('py', 3),
          cm.sp('px', 6),
          cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
          'bg-surface-container-high transition-colors group opacity-60 cursor-not-allowed',
        )}
      >
        <OAuthProviderLogo provider="github" size={20} ariaLabel="" />
        <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
          {t('oauth.github', {}, { defaultValue: 'GitHub' })}
        </span>
      </button>
    </div>
  )
}

export default SocialLoginButtons
export { SocialLoginButtons }
