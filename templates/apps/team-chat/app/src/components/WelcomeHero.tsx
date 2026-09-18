import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function WelcomeHero() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ name?: string; email?: string }>()
  const firstName =
    typeof user?.name === 'string' && user.name.trim().length > 0 ? user.name.split(' ')[0] : null
  const titleKey = firstName ? 'welcomeHero.titleWithName' : 'welcomeHero.title'
  return (
    <section className={cm.cn(cm.textCenter, cm.stack(4))}>
      <div
        data-mol-id="welcome-hero-badge"
        className={cm.cn(
          'inline-block py-1.5 bg-primary-container/10 uppercase tracking-[0.2em]',
          cm.textPrimary,
          cm.sp('px', 4),
          cm.fontWeight('bold'),
          cm.textSize('xs'),
          cm.roundedFull,
          cm.sp('mb', 2),
        )}
      >
        {t('welcomeHero.badge', {}, { defaultValue: 'Workspace Overview' })}
      </div>
      <h2
        data-mol-id="welcome-hero-title"
        className={cm.cn(cm.textSize('5xl'), 'font-extrabold tracking-tight text-on-surface')}
      >
        {firstName
          ? t(titleKey, { name: firstName }, { defaultValue: 'Welcome back, {{name}}' })
          : t(titleKey, { appName: APP_NAME }, { defaultValue: 'Welcome to {{appName}}' })}
      </h2>
      <p
        data-mol-id="welcome-hero-description"
        className={cm.cn(
          cm.textSize('lg'),
          cm.maxW('lg'),
          cm.mxAuto,
          'text-on-surface-variant leading-relaxed',
        )}
      >
        {t(
          'welcomeHero.description',
          {},
          {
            defaultValue:
              'Your team communication hub. Everything you need to stay in sync in one place.',
          },
        )}
      </p>
    </section>
  )
}
export default WelcomeHero
