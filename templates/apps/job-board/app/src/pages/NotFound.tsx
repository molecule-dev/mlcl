import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('px', 6),
        cm.sp('py', 16),
        cm.maxW('2xl'),
        cm.mxAuto,
        cm.textCenter,
        cm.stack(6),
      )}
    >
      <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
        {t('notFound.eyebrow', {}, { defaultValue: '404' })}
      </p>
      <h1 className={cm.cn('text-5xl md:text-6xl font-extrabold tracking-tight text-on-surface')}>
        {t('notFound.heading', {}, { defaultValue: 'That role is no longer open.' })}
      </h1>
      <p className={cm.cn('text-lg font-medium leading-relaxed text-on-surface-variant')}>
        {t(
          'notFound.body',
          {},
          {
            defaultValue:
              'The page you\u2019re looking for moved on to its next chapter. The best opportunities are still on the board.',
          },
        )}
      </p>
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }))}
      >
        <Link
          to="/jobs"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
          )}
        >
          {t('notFound.browseJobs', {}, { defaultValue: 'Browse open roles' })}
        </Link>
        <Link
          to="/"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container-low transition-colors',
          )}
        >
          {t('notFound.backHome', {}, { defaultValue: 'Back to home \u2192' })}
        </Link>
      </div>
    </div>
  )
}
