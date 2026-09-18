import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function SettingsTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        'fixed top-0 right-0 left-64 h-16 z-40 bg-surface/70 backdrop-blur-xl no-border shadow-[0_40px_60px_-5px_rgba(24,20,69,0.04)]',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          cm.sp('py', 2),
          'bg-surface-container-high rounded-full w-96 transition-all focus-within:ring-2 focus-within:ring-primary/20',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('xl'),
            cm.sp('mr', 2),
            'material-symbols-outlined text-foreground-tertiary',
          )}
        >
          search
        </span>
        <input
          className={cm.cn(
            cm.textSize('sm'),
            'bg-transparent border-none focus:ring-0 w-full placeholder:text-foreground-tertiary',
          )}
          placeholder={t(
            'settingsTopNavBar.searchPlaceholder',
            {},
            { defaultValue: 'Search bots, integrations, settings...' },
          )}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-6')}>
        <button
          type="button"
          aria-expanded={notificationsOpen}
          className={cm.cn(
            cm.sp('p', 2),
            'text-foreground-tertiary hover:text-primary transition-colors',
          )}
          onClick={() => setNotificationsOpen((o) => !o)}
        >
          <span className={cm.cn('material-symbols-outlined')}>notifications</span>
        </button>
        <Link
          to="/help"
          className={cm.cn('p-2 text-foreground-tertiary hover:text-primary transition-colors')}
        >
          <span className={cm.cn('material-symbols-outlined')}>help</span>
        </Link>
        <div className={cm.cn(cm.sp('mx', 2), 'h-4 w-px bg-outline-variant/30')}></div>
        <button
          type="button"
          className={cm.cn(cm.flex({ align: 'center' }), cm.cursorPointer, 'gap-3 group')}
          onClick={() => navigate('/settings/profile')}
        >
          <div className={cm.textRight}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                "font-['Plus_Jakarta_Sans'] leading-none",
              )}
            >
              {t('settingsTopNavBar.profileName', {}, { defaultValue: 'Alex Rivera' })}
            </p>
            <p
              className={cm.cn(
                cm.fontWeight('medium'),
                cm.sp('mt', 1),
                'text-[10px] text-on-surface-variant uppercase tracking-tighter',
              )}
            >
              {t('settingsTopNavBar.profileRole', {}, { defaultValue: 'Pro Architect' })}
            </p>
          </div>
          <img
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              'object-cover ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all',
            )}
            alt=""
            data-alt="professional portrait of a creative director in a minimalist studio setting with soft natural light"
            src="https://picsum.photos/seed/SettingsTopNavBar-1/1200/800"
          />
        </button>
      </div>
    </header>
  )
}

export default SettingsTopNavBar
export { SettingsTopNavBar }
