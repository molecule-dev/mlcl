import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.sp('p', 8),
        'bg-gradient-to-br from-[var(--color-video-grid)] via-[var(--color-video-grid)] to-participant-tile text-white relative overflow-hidden',
      )}
    >
      <div
        className={
          'absolute -right-32 -top-32 w-96 h-96 rounded-full bg-primary/30 blur-3xl pointer-events-none'
        }
      />
      <div
        className={
          'absolute -left-32 bottom-0 w-96 h-96 rounded-full bg-secondary/25 blur-3xl pointer-events-none'
        }
      />
      <div className={cm.cn(cm.maxW('lg'), cm.textCenter, cm.stack(6), 'relative z-10')}>
        <span className="material-symbols-outlined text-7xl text-secondary">videocam_off</span>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-secondary',
          )}
        >
          {t('notFound.brand', { app: APP_NAME }, { defaultValue: '404 · {{app}}' })}
        </p>
        <h1 className={cm.cn('text-5xl font-extrabold tracking-tight')}>
          {t('notFound.title', {}, { defaultValue: 'Page not found' })}
        </h1>
        <p className={cm.cn(cm.textSize('lg'), 'text-white/70')}>
          {t(
            'notFound.body',
            {},
            { defaultValue: "The route you're looking for doesn't exist or has moved." },
          )}
        </p>
        <Link
          to="/dashboard"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.textSize('base'),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'self-center bg-gradient-to-r from-primary to-secondary text-on-primary shadow-lg shadow-primary/40 hover:shadow-xl hover:shadow-primary/60 transition-all',
          )}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
        </Link>
      </div>
    </div>
  )
}
