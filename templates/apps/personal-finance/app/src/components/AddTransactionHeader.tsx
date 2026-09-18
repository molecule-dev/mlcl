import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AddTransactionHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [notificationsOn, setNotificationsOn] = useState(true)
  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 12),
        cm.h(20),
        cm.w('full'),
        'bg-surface/80 backdrop-blur-lg sticky top-0 z-40',
      )}
    >
      <div className={cm.flex({ align: 'center', gap: 'md' })}>
        <Link
          to="/transactions"
          className={cm.cn(
            'w-10 h-10 flex items-center justify-center rounded-full text-foreground-secondary hover:bg-surface-container-low transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')}>arrow_back</span>
        </Link>
        <h2
          className={cm.cn(
            cm.textSize('4xl'),
            'font-extrabold font-headline tracking-tight text-on-surface',
          )}
        >
          {t('addTransactionHeader.title', {}, { defaultValue: 'Add Transaction' })}
        </h2>
      </div>
      <div className={cm.flex({ align: 'center', gap: 'lg' })}>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'text-foreground-secondary')}
        >
          <button
            type="button"
            aria-pressed={notificationsOn}
            aria-label={t(
              'addTransactionHeader.toggleNotifications',
              {},
              { defaultValue: 'Toggle notifications' },
            )}
            className={cm.cn(
              cm.cursorPointer,
              'material-symbols-outlined hover:text-success',
              notificationsOn && 'text-success',
            )}
            onClick={() => setNotificationsOn((v) => !v)}
          >
            {notificationsOn ? 'notifications' : 'notifications_off'}
          </button>
        </div>
        <button
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'bg-gradient-to-br from-primary to-primary-container text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all',
          )}
          onClick={() => navigate('/upgrade')}
        >
          {t('settings.upgrade', {}, { defaultValue: 'Upgrade' })}
        </button>
      </div>
    </header>
  )
}

export default AddTransactionHeader
export { AddTransactionHeader }
