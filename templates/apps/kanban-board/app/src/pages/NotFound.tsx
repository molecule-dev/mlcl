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
        'flex items-center justify-center bg-background text-on-surface',
      )}
    >
      <div className={cm.cn(`max-w-lg w-full text-center px-6`)}>
        <div
          className={cm.cn(
            `relative inline-flex items-center justify-center w-28 h-28 rounded-3xl mb-6 text-white shadow-lg bg-gradient-to-br from-primary to-primary-container`,
          )}
        >
          <span
            className="material-symbols-outlined text-5xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            view_kanban
          </span>
          <span
            className={cm.cn(
              `absolute -bottom-2 -right-2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-surface text-primary shadow`,
            )}
          >
            404
          </span>
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-primary-dark">
          {t('notFound.eyebrow', {}, { defaultValue: 'Card not found' })}
        </p>
        <h1 className={cm.cn(`mt-3 text-4xl font-extrabold tracking-tight text-on-surface`)}>
          {t('notFound.heading', {}, { defaultValue: 'This card got moved off the board.' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 4), 'text-on-surface-variant')}>
          {t(
            'notFound.body',
            {},
            {
              defaultValue:
                'The page you tried to reach was archived or never existed. Drift back to your dashboard and pick up where you left off.',
            },
          )}
        </p>
        <div className={cm.cn(cm.sp('mt', 8), 'flex items-center justify-center gap-3')}>
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'px-6 py-3 rounded-full font-bold text-white shadow-md',
              'bg-gradient-to-br from-primary to-primary-container hover:opacity-95 transition-opacity',
            )}
          >
            <span className="material-symbols-outlined">dashboard</span>
            {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
          </Link>
          <Link
            to="/boards"
            className={cm.cn(
              `px-6 py-3 rounded-full font-semibold text-on-surface border border-outline-variant hover:bg-surface-container-low transition-colors`,
            )}
          >
            {t('notFound.boardsCta', {}, { defaultValue: 'Browse boards' })}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
