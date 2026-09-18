import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function BotSettingsTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const navigate = useNavigate()
  return (
    <header
      className={cm.cn(
        cm.flex({ justify: 'between', align: 'center' }),
        cm.sp('px', 8),
        'fixed top-0 right-0 left-64 h-16 bg-background/70 backdrop-blur-xl z-40',
      )}
    >
      <div className={cm.flex({ align: 'center' })}>
        <h2
          className={cm.cn(
            cm.textSize('lg'),
            cm.fontWeight('bold'),
            'font-headline tracking-tight text-on-surface',
          )}
        >
          {t('botSettingsTopNavBar.title', {}, { defaultValue: 'Bot Settings' })}
        </h2>
        <div className={cm.cn(cm.sp('mx', 4), 'h-6 w-px bg-outline-variant/30')}></div>
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}
        >
          {t('botSettingsTopNavBar.agentName', {}, { defaultValue: 'Customer Support Agent' })}
        </span>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
        <button
          type="button"
          aria-expanded={notificationsOpen}
          className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
          onClick={() => setNotificationsOpen((v) => !v)}
        >
          <span className={cm.cn('material-symbols-outlined')}>notifications</span>
        </button>
        <Link
          to="/help"
          className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
        >
          <span className={cm.cn('material-symbols-outlined')}>help</span>
        </Link>
        <button
          onClick={() => navigate('/profile')}
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            cm.cursorPointer,
            'overflow-hidden focus:outline-none',
          )}
        >
          <img
            className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
            alt={t('botSettingsTopNavBar.profileAvatarAlt', {}, { defaultValue: 'Your profile' })}
            data-alt="professional portrait of a user with a friendly expression and clean background"
            src="https://picsum.photos/seed/BotSettingsTopNavBar-1/1200/800"
          />
        </button>
      </div>
    </header>
  )
}

export default BotSettingsTopNavBar
export { BotSettingsTopNavBar }
