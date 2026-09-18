import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandLogo } from '../components/BrandLogo.js'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'lg' }),
        cm.minH('screen'),
        cm.sp('p', 8),
        'relative overflow-hidden bg-background text-on-surface text-center',
      )}
    >
      <div className={cm.cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden')}>
        <div
          className={cm.cn(
            'absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-primary/30 to-secondary/30 blur-[120px]',
          )}
        />
      </div>

      <BrandLogo />

      <p
        className={cm.cn(
          cm.fontWeight('bold'),
          'text-[10rem] leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary font-mono',
        )}
      >
        404
      </p>
      <h1
        className={cm.cn(
          cm.fontWeight('bold'),
          'text-3xl md:text-4xl tracking-tight text-on-surface',
        )}
      >
        {t('notFound.title', {}, { defaultValue: 'This dream has drifted away' })}
      </h1>
      <p className={cm.cn(cm.textSize('lg'), 'max-w-xl text-on-surface-variant leading-relaxed')}>
        {t(
          'notFound.body',
          {},
          {
            defaultValue:
              'The page you’re looking for slipped between two seeds. Head back to the dreamscape and start a new render.',
          },
        )}
      </p>
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <Link
          to="/"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            home
          </span>
          {t('auth.backToLanding', {}, { defaultValue: 'Back to landing' })}
        </Link>
        <Link
          to="/dashboard"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'rounded-xl bg-surface-container text-on-surface hover:bg-primary/10 hover:text-primary transition-colors',
          )}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            dashboard
          </span>
          {t('notFound.dashboard', {}, { defaultValue: 'Open dashboard' })}
        </Link>
      </div>
    </div>
  )
}

export default NotFound
