import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { NimbusBrandMark } from '../components/NimbusBrandMark.js'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      data-mol-id="page-not-found"
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.sp('p', 8),
        cm.textCenter,
        'bg-gradient-to-br from-surface-bright to-surface-dim text-on-surface relative overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          'absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary-fixed opacity-30 blur-[100px]',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-tertiary-fixed opacity-25 blur-[120px]',
        )}
        aria-hidden="true"
      />

      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'lg' }),
          'relative z-10 max-w-xl',
        )}
      >
        <NimbusBrandMark size="md" showIcon />
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(20),
            cm.h(20),
            cm.roundedFull,
            cm.sp('mt', 4),
            'bg-gradient-to-br from-primary-container/40 to-tertiary-container/40 backdrop-blur-md border border-outline-variant/30',
          )}
          aria-hidden="true"
        >
          <span
            className="material-symbols-outlined text-5xl text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            cloud_off
          </span>
        </span>
        <h1
          className={cm.cn(
            'text-7xl md:text-8xl font-extrabold tracking-tight bg-gradient-to-br from-primary to-tertiary-container bg-clip-text text-transparent',
          )}
        >
          {t('notFound.code', {}, { defaultValue: '404' })}
        </h1>
        <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-on-surface')}>
          {t('notFound.heading', {}, { defaultValue: 'This file is not in your archive.' })}
        </h2>
        <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
          {t(
            'notFound.body',
            {},
            {
              defaultValue:
                'The link you followed may have been moved, renamed, or removed. Head back to your library to keep working.',
            },
          )}
        </p>
        <div
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.sp('mt', 4), 'sm:flex-row')}
        >
          <Link
            to="/files"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'rounded-xl bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90 transition-opacity shadow-lg shadow-primary/20',
            )}
          >
            <span className="material-symbols-outlined">folder_open</span>
            {t('notFound.primaryCta', {}, { defaultValue: 'Open My Files' })}
          </Link>
          <Link
            to="/"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              'rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors',
            )}
          >
            {t('auth.backToHome', {}, { defaultValue: 'Back to home' })}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
