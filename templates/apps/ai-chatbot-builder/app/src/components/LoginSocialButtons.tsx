import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Social sign-in buttons. No OAuth provider is wired into this template
 * out of the box, so — matching the Signup page — clicking explains how
 * to sign in instead of silently doing nothing.
 */
function LoginSocialButtons() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [oauthMessage, setOauthMessage] = useState<string | null>(null)

  const handleUnavailable = () => {
    setOauthMessage(
      t(
        'signup.oauthUnavailable',
        {},
        {
          defaultValue: 'Social sign-in is not enabled yet. Please use email and password.',
        },
      ),
    )
  }

  return (
    <div className={cm.w('full')}>
      <div className={cm.cn(cm.grid({ cols: 2, gap: 4 }), cm.w('full'))}>
        <button
          type="button"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('py', 3),
            cm.sp('px', 4),
            'gap-2 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container-high transition-colors group',
          )}
          onClick={handleUnavailable}
        >
          <svg
            aria-hidden="true"
            className={cm.cn(cm.w(5), cm.h(5))}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant group-hover:text-on-surface',
            )}
          >
            {t('oauth.google', {}, { defaultValue: 'Google' })}
          </span>
        </button>
        <button
          type="button"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('py', 3),
            cm.sp('px', 4),
            'gap-2 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container-high transition-colors group',
          )}
          onClick={handleUnavailable}
        >
          <svg
            aria-hidden="true"
            className={cm.cn(cm.w(5), cm.h(5))}
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 .296C5.375.296 0 5.67 0 12.296c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.26.82-.577 0-.286-.01-1.042-.016-2.046-3.338.725-4.042-1.61-4.042-1.61-.545-1.387-1.333-1.756-1.333-1.756-1.09-.744.082-.729.082-.729 1.204.086 1.838 1.236 1.838 1.236 1.07 1.834 2.808 1.304 3.492.997.108-.775.42-1.305.763-1.605-2.665-.304-5.467-1.332-5.467-5.93 0-1.31.467-2.381 1.236-3.22-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.3 1.23.957-.266 1.983-.398 3.003-.403 1.02.005 2.047.137 3.006.403 2.29-1.552 3.296-1.23 3.296-1.23.655 1.653.243 2.874.12 3.176.77.839 1.235 1.91 1.235 3.22 0 4.61-2.807 5.623-5.48 5.92.43.37.814 1.102.814 2.222 0 1.604-.014 2.896-.014 3.293 0 .32.218.694.825.577C20.565 22.092 24 17.593 24 12.296 24 5.67 18.627.296 12 .296z" />
          </svg>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant group-hover:text-on-surface',
            )}
          >
            {t('oauth.github', {}, { defaultValue: 'GitHub' })}
          </span>
        </button>
      </div>
      {oauthMessage && (
        <p
          className={cm.cn(
            cm.sp('mt', 3),
            cm.textSize('xs'),
            cm.textCenter,
            'text-on-surface-variant',
          )}
          data-mol-id="login-oauth-message"
        >
          {oauthMessage}
        </p>
      )}
    </div>
  )
}

export default LoginSocialButtons
export { LoginSocialButtons }
