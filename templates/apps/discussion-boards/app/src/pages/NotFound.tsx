import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        'min-h-[60vh] text-center px-6 py-16',
      )}
    >
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.flex({ align: 'center', justify: 'center' }),
          cm.roundedFull,
          'bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30 mb-6',
        )}
        aria-hidden
      >
        <span className="material-symbols-outlined text-4xl">manage_search</span>
      </div>
      <p
        className={cm.cn(
          cm.fontWeight('bold'),
          'text-[10px] uppercase tracking-[0.3em] text-primary mb-2',
        )}
      >
        {t('notFound.eyebrow', {}, { defaultValue: '404 · Lost in the agora' })}
      </p>
      <h1
        className={cm.cn(
          cm.textSize('4xl'),
          cm.fontWeight('bold'),
          'tracking-tight text-on-surface mb-3',
        )}
      >
        {t('notFound.heading', {}, { defaultValue: "This thread isn't here." })}
      </h1>
      <p
        className={cm.cn(
          cm.textSize('base'),
          cm.maxW('md'),
          'text-on-surface-variant leading-relaxed mb-6',
        )}
      >
        {t(
          'notFound.body',
          {},
          {
            defaultValue:
              'It might have been locked into the archive, or the URL drifted. Wander back to the agora and pick up another conversation.',
          },
        )}
      </p>
      <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap justify-center')}>
        <Link
          to="/c"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'inline-flex items-center gap-2 bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-sm shadow-primary/30',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden>
            forum
          </span>
          {t('notFound.browseCta', {}, { defaultValue: 'Browse categories' })}
        </Link>
        <Link
          to="/search"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'inline-flex items-center gap-2 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/40 transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden>
            search
          </span>
          {t('notFound.searchCta', {}, { defaultValue: 'Search the archive' })}
        </Link>
      </div>
    </div>
  )
}

export default NotFound
