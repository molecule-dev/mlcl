import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'

interface CalciteAuthHeaderProps {
  /** Override the heading. Defaults to the localized welcome string. */
  title?: string
  /** Override the subtitle. */
  subtitle?: string
  /** Override the brand-tagline eyebrow. Defaults to `APP_TAGLINE`. */
  tagline?: string
}

/**
 * Calcite auth-page brand header — gradient grid-mark, app name in
 * extrabold tracking-tighter Inter, single-line tagline, optional
 * heading + subhead.
 *
 * Translated from project-management's AuthHeader.tsx (catalog §13.7).
 * The mark uses a `grid_on` Material Symbol inside a gradient tile to
 * signal the data-grid identity.
 */
export function CalciteAuthHeader({ title, subtitle, tagline }: CalciteAuthHeaderProps = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const heading = title ?? t('auth.login.signInTitle', {}, { defaultValue: 'Welcome back' })
  const sub =
    subtitle ??
    t('authHeader.subtitle', {}, { defaultValue: 'Sign in to keep your numbers honest.' })
  return (
    <div className={cm.cn(cm.stack(4), cm.textCenter)}>
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'sm' }))}>
        <BrandWordmark as="span" size="lg" />
      </div>
      <p
        className={cm.cn(
          'text-[10px] font-bold uppercase tracking-[0.25em] text-on-surface-variant',
        )}
      >
        {tagline ?? APP_TAGLINE}
      </p>
      <h1
        className={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('bold'),
          'tracking-tight text-on-surface',
        )}
      >
        {heading}
      </h1>
      <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}>
        {sub}
      </p>
    </div>
  )
}

export default CalciteAuthHeader
