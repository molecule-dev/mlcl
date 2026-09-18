import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CompaniesTopBarProps {
  search: string
  onSearchChange: (value: string) => void
}

function CompaniesTopBar({ search, onSearchChange }: CompaniesTopBarProps) {
  const cm = getClassMap()
  const [notificationsOn, setNotificationsOn] = useState(false)
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        cm.h(16),
        'bg-background sticky top-0 z-40',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.flex1, 'gap-4')}>
        <div className={cm.cn(cm.w('full'), cm.maxW('md'), 'relative')}>
          <span
            className={cm.cn(
              cm.textSize('lg'),
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline',
            )}
          >
            search
          </span>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.roundedFull,
              'bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 transition-all outline-none',
            )}
            placeholder={t(
              'companiesTopBar.searchPlaceholder',
              {},
              { defaultValue: 'Search companies...' },
            )}
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
        <button
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            'text-outline hover:bg-surface-container transition-colors',
          )}
          onClick={() => setNotificationsOn((v) => !v)}
        >
          <span className={cm.fv5b245ffa}>
            {notificationsOn ? 'notifications_active' : 'notifications'}
          </span>
        </button>
        {/* TODO: wire when help/docs route exists */}
        <button
          aria-label={t('companiesTopBar.help', {}, { defaultValue: 'Help' })}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            'text-outline hover:bg-surface-container transition-colors',
          )}
          onClick={() => {
            // TODO: wire when help/docs route exists
          }}
        >
          <span className={cm.fv5b245ffa}>help_outline</span>
        </button>
        <div className={cm.cn(cm.h(8), cm.sp('mx', 2), 'w-[1px] bg-outline-variant/20')}></div>
        <button
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.roundedFull,
            'primary-gradient text-white gap-2 shadow-architectural active:scale-95 transition-transform',
          )}
          onClick={() => navigate('/companies/new')}
        >
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>add</span>
          {t('companiesTopBar.addCompany', {}, { defaultValue: 'Add Company' })}
        </button>
      </div>
    </header>
  )
}

export default CompaniesTopBar
export { CompaniesTopBar }
