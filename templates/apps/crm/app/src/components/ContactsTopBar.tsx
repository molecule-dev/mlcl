import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ContactsTopBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [, setNotificationsOpen] = useState(false)
  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 8),
        cm.sp('py', 4),
        cm.w('full'),
        cm.surface,
        'sticky top-0 z-40 shadow-sm font-inter antialiased',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center' }), cm.flex1, cm.maxW('xl'), 'gap-4')}>
        <div className={cm.cn(cm.w('full'), 'relative group')}>
          <span className={cm.fv9cd72e67} data-icon="search">
            search
          </span>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.textSize('sm'),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              'bg-surface-secondary border-none rounded-xl py-2.5 focus:ring-2 focus:ring-blue-600/20 focus:bg-surface transition-all outline-none',
            )}
            placeholder={t(
              'contactsTopBar.searchPlaceholder',
              {},
              { defaultValue: 'Search contacts, deals, or teams...' },
            )}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
        <button
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            'text-foreground-secondary hover:bg-surface-secondary transition-colors relative',
          )}
          data-mol-id="top-notifications"
          onClick={() => setNotificationsOpen((o) => !o)}
        >
          <span className={cm.fv5b245ffa} data-icon="notifications">
            notifications
          </span>
          <span
            className={cm.cn(
              cm.w(2),
              cm.h(2),
              cm.roundedFull,
              'absolute top-2.5 right-2.5 bg-tertiary border-2 border-surface',
            )}
          ></span>
        </button>
        <button
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            'text-foreground-secondary hover:bg-surface-secondary transition-colors',
          )}
          data-mol-id="top-settings"
          onClick={() => navigate('/settings')}
        >
          <span className={cm.fv5b245ffa} data-icon="settings">
            settings
          </span>
        </button>
        <div className={cm.cn(cm.h(8), cm.sp('mx', 2), 'w-[1px] bg-border')}></div>
        <button
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.sp('px', 5),
            'bg-primary-container hover:bg-blue-700 text-white py-2.5 rounded-xl gap-2 shadow-lg shadow-blue-600/20 active:scale-95 duration-150 transition-all',
          )}
          data-mol-id="add-contact-btn"
          onClick={() => navigate('/contacts/new')}
        >
          <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')} data-icon="add">
            add
          </span>
          {t('contactsTopBar.addContact', {}, { defaultValue: 'Add Contact' })}
        </button>
        <img
          alt={t('contactsTopBar.userProfileAlt', {}, { defaultValue: 'User Profile' })}
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            'border-2 border-surface-container-high shadow-sm',
          )}
          src="https://picsum.photos/seed/ContactsTopBar-1/1200/800"
        />
      </div>
    </header>
  )
}
export default ContactsTopBar
export { ContactsTopBar }
