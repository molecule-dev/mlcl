import {
  AuthBrandHeader as BrandHeader,
  AuthBrandHeaderTagline,
} from '@molecule/app-auth-brand-header-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * Yank wordmark for auth pages — heavy lowercase typography with a
 * periwinkle dot accent (the trademark "i" in the brand mark).
 *
 * §13.7 Variant E (wordmark-with-accent) — composes the shared
 * AuthBrandHeader shell + tagline; the lowercase-wordmark + dot accent
 * is bespoke and passed as a child.
 */
export function AuthBrandHeader({ subtitle }: { subtitle?: string } = {}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const name = t('authBrandHeader.appName', { appName: APP_NAME }, { defaultValue: APP_NAME })
  return (
    <BrandHeader className={cm.textCenter}>
      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'tracking-tighter lowercase')}
        style={{ color: 'var(--color-primary)' }}
      >
        <span className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'))}>
          {name.toLowerCase()}
        </span>
        <span
          aria-hidden="true"
          className={cm.cn('rounded-full')}
          style={{
            width: 8,
            height: 8,
            background: 'var(--color-primary)',
            boxShadow: '0 0 12px color-mix(in srgb, var(--color-primary) 50%, transparent)',
          }}
        />
      </div>
      <AuthBrandHeaderTagline>
        {subtitle || t('authBrandHeader.tagline', {}, { defaultValue: APP_TAGLINE })}
      </AuthBrandHeaderTagline>
    </BrandHeader>
  )
}

export default AuthBrandHeader
