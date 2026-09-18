import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ align: 'center', justify: 'center' }),
        'bg-background',
      )}
    >
      <div
        className={cm.cn(
          cm.maxW('xl'),
          cm.sp('px', 6),
          cm.sp('py', 12),
          cm.textCenter,
          cm.stack(6),
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'w-20 h-20 rounded-full mx-auto',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--mol-color-primary-light), var(--color-bid-panel))',
          }}
          aria-hidden="true"
        >
          <span
            className={cm.cn('material-symbols-outlined text-4xl')}
            style={{ color: 'var(--mol-color-primary)' }}
          >
            gavel
          </span>
        </div>
        <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
          {t('notFound.eyebrow', {}, { defaultValue: 'Lot 404' })}
        </p>
        <h1 className={cm.cn('text-5xl md:text-6xl font-extrabold tracking-tight')}>
          {t('notFound.heading', {}, { defaultValue: 'Going once… going twice…' })}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('lg'),
            'text-on-surface-variant max-w-md mx-auto leading-relaxed',
          )}
        >
          {t(
            'notFound.body',
            {},
            {
              defaultValue:
                'We can’t find the page you’re looking for. The auction may have ended — or this lot was never listed.',
            },
          )}
        </p>
        <div className={cm.flex({ align: 'center', justify: 'center', gap: 'sm', wrap: 'wrap' })}>
          <Link
            to="/auctions"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              'rounded-full text-white font-bold shadow-md shadow-primary/30 inline-flex items-center gap-2',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--mol-color-primary), var(--color-primary-gradient-end))',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              explore
            </span>
            {t('notFound.browseCta', {}, { defaultValue: 'Browse live auctions' })}
          </Link>
          <Link
            to="/"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              'rounded-full font-semibold border border-outline-variant hover:bg-surface-container-low',
            )}
          >
            {t('notFound.homeCta', {}, { defaultValue: 'Go home' })}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
