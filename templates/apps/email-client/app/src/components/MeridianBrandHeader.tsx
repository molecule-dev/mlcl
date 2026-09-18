import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * §13.7 Variant — gradient orb chip + tracking-tight wordmark + tagline.
 * Used at the top of every Meridian auth page (Login / Signup / Forgot /
 * Reset). Matches the deep-blue → violet brand gradient.
 *
 * Translated from banking-dashboard's AuthBrandHeader pattern.
 */
export function MeridianBrandHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <header className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'sm' }))}>
      <div
        className={cm.cn(
          cm.w(14),
          cm.h(14),
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('mb', 2),
          'rounded-2xl shadow-lg shadow-primary/20 bg-gradient-to-br from-primary to-secondary',
        )}
      >
        <span
          className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-white')}
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          mail
        </span>
      </div>
      <h1
        className={cm.cn(
          cm.textSize('4xl'),
          cm.fontWeight('bold'),
          'text-primary tracking-tighter',
        )}
      >
        {t('meridian.brand.appName', {}, { defaultValue: APP_NAME })}
      </h1>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          cm.textCenter,
          'text-on-surface-variant max-w-xs',
        )}
      >
        {t('meridian.brand.tagline', {}, { defaultValue: APP_TAGLINE })}
      </p>
    </header>
  )
}
