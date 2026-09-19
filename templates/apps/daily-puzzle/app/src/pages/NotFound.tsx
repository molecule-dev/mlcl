import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function NotFound() {
  const { t } = useTranslation()
  const cm = getClassMap()

  return (
    <main
      data-testid="not-found"
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ align: 'center', justify: 'center' }),
        'bg-gradient-to-br from-[var(--puzzle-gradient-from)] via-primary to-[var(--puzzle-gradient-to)] text-white',
        cm.sp('p', 6),
      )}
    >
      <div className={cm.cn('max-w-md text-center')}>
        <p
          className={cm.cn('text-[10px] uppercase tracking-widest font-black text-amber-300 mb-3')}
        >
          {t('notFound.eyebrow', {}, { defaultValue: '404 · No such word' })}
        </p>
        <h1 className={cm.cn('text-6xl md:text-7xl font-extrabold tracking-tight mb-3')}>404</h1>
        <p className={cm.cn('text-base font-bold mb-6')}>
          {t('notFound.title', { app: APP_NAME }, { defaultValue: 'That route is empty.' })}
        </p>
        <p className={cm.cn('text-sm text-white/70 mb-8')}>
          {t(
            'notFound.body',
            {},
            { defaultValue: 'Try a different code or head back to the lobby.' },
          )}
        </p>
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 3 }), 'flex-wrap')}
        >
          <Link
            to="/"
            className={cm.cn(
              'px-5 py-3 rounded-2xl bg-amber-400 text-amber-950 text-xs font-extrabold uppercase tracking-widest',
            )}
          >
            {t('notFound.backToDiscover', {}, { defaultValue: 'Back to home' })}
          </Link>
          <Link
            to="/"
            className={cm.cn(
              'px-5 py-3 rounded-2xl bg-surface/10 border border-surface/20 text-xs font-extrabold uppercase tracking-widest',
            )}
          >
            {t('notFound.backHome', {}, { defaultValue: 'Back home' })}
          </Link>
        </div>
      </div>
    </main>
  )
}

export default NotFound
