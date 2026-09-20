import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface AuthHeaderProps {
  /** Override heading. Defaults to `t('login.title')` ("Welcome back"). */
  title?: string
  /** Override subtitle. Defaults to `t('login.subtitle')`. */
  subtitle?: string
}

export function AuthHeader({ title, subtitle }: AuthHeaderProps = {}) {
  const { t } = useTranslation()
  const cm = getClassMap()
  const heading = title ?? t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })
  const sub =
    subtitle ?? t('login.subtitle', {}, { defaultValue: 'Sign in to keep your jobsites on track' })
  return (
    <>
      {/* Branding Section */}
      <div className={cm.cn(cm.stack(4), cm.textCenter)}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'sm' }))}>
          <div
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.flex({ align: 'center', justify: 'center' }),
              'brand-gradient rounded-xl text-on-primary',
            )}
          >
            <span
              aria-hidden="true"
              className={cm.cn('material-symbols-outlined')}
              data-icon="construction"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              construction
            </span>
          </div>
          <Link to="/">
            <span
              className={cm.cn(
                cm.textSize('3xl'),
                'font-black tracking-tighter text-on-background',
              )}
            >
              {t('app.name', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </span>
          </Link>
        </div>
        <h1
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-background',
          )}
        >
          {heading}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}>
          {sub}
        </p>
      </div>
    </>
  )
}
export default AuthHeader
