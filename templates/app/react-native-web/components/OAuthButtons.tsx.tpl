import { useOAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from './Icon.js'
import { oauthConfig } from '../config.js'

const providerIcons: Record<string, React.ReactNode> = {
  github: <Icon name="github" size={30} />,
  google: <Icon name="google" size={30} />,
  gitlab: <Icon name="gitlab" size={30} />,
  twitter: <Icon name="twitter" size={30} />,
}

export function OAuthButtons() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { providers, redirect } = useOAuth(oauthConfig)

  const providerLabels: Record<string, string> = {
    github: t('oauth.github'),
    google: t('oauth.google'),
    gitlab: t('oauth.gitlab'),
    twitter: t('oauth.twitter'),
  }

  if (!providers.length) return null

  return (
    <div>
      <div className={cm.oauthDivider}>
        <div className={cm.oauthDividerLine} />
        <span className={cm.oauthDividerText}>
          {t('oauth.orContinueWith')}
        </span>
      </div>
      <div className={cm.oauthButtonGroup}>
        {providers.map((provider) => (
          <button
            key={provider}
            type="button"
            onClick={() => redirect(provider)}
            aria-label={t('oauth.continueWith', { provider: providerLabels[provider] || provider })}
            className={cm.oauthButton}
          >
            <span className={cm.oauthButtonIcon}>
              {providerIcons[provider]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
