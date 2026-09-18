import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

/**
 * Brand header for public content pages (Privacy, Terms, Pricing).
 *
 * Unlike `<AuthBrandHeader>` — which renders the wordmark inside an `<h1>`
 * because an auth page's only heading IS the brand — content pages already
 * own their page-title `<h1>` (via `ContentPageShell`). Emitting a second
 * brand `<h1>` here makes the page have two `<h1>`s and shadows the real
 * title for "first heading" selectors. So this header renders the brand as
 * a non-heading `<Link>` (the convention every other flagship's public
 * `Header` follows), leaving the page title as the sole `<h1>`.
 */
export function PublicHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <header
      className={cm.cn(
        'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
      )}
    >
      <div
        className={cm.cn(
          cm.maxW('7xl'),
          cm.mxAuto,
          cm.sp('px', 6),
          cm.sp('py', 4),
          cm.flex({ align: 'center', justify: 'between' }),
        )}
      >
        <Link to="/" className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(
              cm.w(9),
              cm.h(9),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'shadow-md shadow-primary/30',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--color-primary-container, #1e3a8a), var(--color-primary, #1e40af))',
            }}
            aria-hidden="true"
          >
            <span
              className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined text-white')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_balance
            </span>
          </span>
          <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-primary')}>
            {t('authBrandHeader.appName', { appName: APP_NAME }, { defaultValue: APP_NAME })}
          </span>
        </Link>
        <span className={cm.cn(cm.textSize('sm'), 'hidden sm:block text-on-surface-variant')}>
          {t('authBrandHeader.tagline', {}, { defaultValue: APP_TAGLINE })}
        </span>
      </div>
    </header>
  )
}

export default PublicHeader
