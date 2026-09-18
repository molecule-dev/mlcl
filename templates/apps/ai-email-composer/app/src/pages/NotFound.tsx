import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthShell } from '../components/AuthShell.js'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <AuthShell
      subtitle={t('notFound.subtitle', {}, { defaultValue: 'This page never quite landed.' })}
    >
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          cm.sp('p', 6),
          cm.textCenter,
        )}
      >
        <p
          className={cm.cn('font-extrabold tracking-tighter leading-none select-none')}
          style={{
            fontSize: '6rem',
            color: 'var(--color-primary)',
            textShadow: '0 8px 32px color-mix(in srgb, var(--color-primary) 25%, transparent)',
          }}
          aria-hidden="true"
        >
          404
        </p>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('notFound.heading', {}, { defaultValue: 'Page not found' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed max-w-sm')}>
          {t(
            'notFound.body',
            {},
            {
              defaultValue:
                'The page you’re looking for has either moved, retired, or never existed. Let’s get you back to writing.',
            },
          )}
        </p>
      </div>

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className={cm.cn(
            cm.sp('py', 4),
            cm.textSize('base'),
            cm.fontWeight('bold'),
            'rounded-xl text-white hover:shadow-lg active:scale-95 transition-all',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, #a78bfa))',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--color-primary) 28%, transparent)',
          }}
        >
          {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
        </button>
        <Link
          to="/"
          className={cm.cn(
            cm.sp('py', 4),
            cm.textSize('base'),
            cm.fontWeight('bold'),
            cm.textCenter,
            'rounded-xl border border-outline hover:bg-surface-container-low transition-colors',
          )}
        >
          {t('notFound.backToLanding', {}, { defaultValue: 'Return to homepage' })}
        </Link>
      </div>
    </AuthShell>
  )
}

export default NotFound
export { NotFound as NotFoundPage }
