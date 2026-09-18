import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        'min-h-screen bg-background text-on-surface flex flex-col items-center justify-center px-6 py-12 text-center',
      )}
    >
      <span
        aria-hidden="true"
        className={cm.cn('material-symbols-outlined text-[48px] mb-6 rounded-full p-5')}
        style={{
          color: BRAND_COLOR,
          backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
        }}
      >
        explore_off
      </span>
      <p
        className={cm.cn('text-xs uppercase tracking-widest font-bold')}
        style={{ color: BRAND_COLOR }}
      >
        {t('notFound.code', {}, { defaultValue: '404' })}
      </p>
      <h1 className={cm.cn('mt-2 text-3xl font-bold tracking-tight max-w-lg')}>
        {t('notFound.heading', {}, { defaultValue: 'We can\u2019t find that page.' })}
      </h1>
      <p className={cm.cn('mt-3 text-on-surface-variant max-w-md')}>
        {t(
          'notFound.body',
          {},
          { defaultValue: 'The link may have moved or been mistyped. Try one of these instead:' },
        )}
      </p>
      <div className={cm.cn('mt-8 flex items-center justify-center gap-3 flex-wrap')}>
        <Link
          to="/dashboard"
          className={cm.cn(
            'px-5 py-3 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity',
          )}
          style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-background)' }}
        >
          {t('notFound.goDashboard', {}, { defaultValue: 'Open dashboard' })}
        </Link>
        <Link
          to="/search"
          className={cm.cn(
            'px-5 py-3 rounded-md font-mono text-xs font-bold uppercase tracking-widest border border-outline-variant hover:bg-surface-container-low transition-colors',
          )}
        >
          {t('notFound.goSearch', {}, { defaultValue: 'Open search' })}
        </Link>
        <Link
          to="/"
          className={cm.cn('text-sm font-semibold hover:underline')}
          style={{ color: BRAND_COLOR }}
        >
          {t('auth.backToLanding', {}, { defaultValue: 'Back to landing' })}
        </Link>
      </div>
    </div>
  )
}
