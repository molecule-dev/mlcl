import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { UserMenu } from './UserMenu.js'
function CommentsTopNavBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <header
      className={cm.cn(
        // Mobile renders MobileTopBar instead; full-width below md.
        'fixed top-0 right-0 w-full md:w-[calc(100%-240px)] z-50 bg-background/80 backdrop-blur-md md:ml-[240px] hidden md:flex',
        cm.flex({ justify: 'between', align: 'center' }),
        cm.h(16),
        cm.sp('px', 8),
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'xl' }))}>
        <h2 className={cm.cn('font-serif italic text-on-surface', cm.textSize('2xl'))}>
          {t('commentsTopNavBar.comments', {}, { defaultValue: 'Comments' })}
        </h2>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
        <button
          type="button"
          aria-label={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          className={cm.fvdef3facc}
          data-mol-id="topnav-notifications"
          onClick={() => navigate('/notifications')}
        >
          <span className={cm.fv84fd39f1} data-icon="notifications">
            notifications
          </span>
        </button>
        <UserMenu />
      </div>
      <div
        className={cm.cn('bg-surface-container h-[1px] absolute bottom-0 left-0', cm.w('full'))}
      ></div>
    </header>
  )
}

export default CommentsTopNavBar
export { CommentsTopNavBar }
