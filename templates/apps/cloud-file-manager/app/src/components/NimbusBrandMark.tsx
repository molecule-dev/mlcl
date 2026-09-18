import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * Gradient brand wordmark for the Nimbus app — used on the auth split-panel,
 * the sidebar header, and the marketing nav. The wordmark is rendered as a
 * `bg-clip-text` gradient that draws from the primary → tertiary container
 * tokens so it respects every theme override.
 *
 * Translated treatment from personal-finance's LoginBrandingHeader / blog's
 * brand wordmark — adapted for cloud's blue → teal palette.
 */
export interface NimbusBrandMarkProps {
  /** Wordmark size — `lg` is for landing/auth heroes, `md` for sidebar, `sm` for inline chrome. */
  size?: 'sm' | 'md' | 'lg'
  /** When true, render the tagline beneath the wordmark. */
  showTagline?: boolean
  /** When true, prepend the cloud icon glyph. */
  showIcon?: boolean
}

export function NimbusBrandMark({
  size = 'md',
  showTagline = false,
  showIcon = false,
}: NimbusBrandMarkProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const wordmarkClass =
    size === 'lg'
      ? 'text-6xl font-black tracking-tighter'
      : size === 'sm'
        ? 'text-xl font-extrabold tracking-tight'
        : 'text-2xl font-extrabold tracking-tighter'

  const taglineClass =
    size === 'lg'
      ? 'text-2xl font-light tracking-tight'
      : 'text-xs uppercase tracking-widest font-semibold'

  const iconSize = size === 'lg' ? 'text-4xl' : size === 'sm' ? 'text-lg' : 'text-2xl'

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.sp('mb', size === 'lg' ? 4 : 2))}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
        {showIcon && (
          <span
            className={cm.cn(iconSize, 'material-symbols-outlined text-primary')}
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            cloud
          </span>
        )}
        <span
          className={cm.cn(
            wordmarkClass,
            'bg-gradient-to-br from-primary to-tertiary-container bg-clip-text text-transparent',
          )}
        >
          {t('nimbusBrandMark.appName', {}, { defaultValue: APP_NAME })}
        </span>
      </div>
      {showTagline && (
        <p
          className={cm.cn(
            taglineClass,
            cm.sp('mt', size === 'lg' ? 4 : 1),
            'text-on-surface-variant',
          )}
        >
          {t('nimbusBrandMark.tagline', {}, { defaultValue: APP_TAGLINE })}
        </p>
      )}
    </div>
  )
}
