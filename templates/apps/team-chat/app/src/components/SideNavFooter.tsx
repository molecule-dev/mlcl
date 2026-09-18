import React from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function SideNavFooter() {
  const cm = getClassMap()
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.sp('pt', 4), cm.stack(1), 'mt-auto border-t border-border/50')}>
      <Link
        className={cm.cn(
          cm.flex({ align: 'center', gap: 3 }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.w('full'),
          'text-foreground-secondary hover:bg-border rounded-lg transition-colors',
        )}
        to="/settings"
      >
        <span className={cm.cn('material-symbols-outlined text-[20px]')}>settings</span>
        <span className={cm.cn(cm.textSize('sm'), "font-['Inter']")}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </span>
      </Link>
      <button
        className={cm.cn(
          cm.flex({ align: 'center', gap: 3 }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.w('full'),
          'text-foreground-secondary hover:bg-border rounded-lg transition-colors',
        )}
        onClick={() => navigate('/profile')}
      >
        <span className={cm.cn('material-symbols-outlined text-[20px]')}>account_circle</span>
        <span className={cm.cn(cm.textSize('sm'), "font-['Inter']")}>
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </span>
      </button>
      <div className={cm.sp('mt', 4)}>
        <button
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.w('full'),
            'bg-gradient-to-br from-primary to-primary-container text-on-primary py-2.5 rounded-lg shadow-lg shadow-primary/20 active:scale-95 transition-all',
          )}
          onClick={() => navigate('/invite')}
        >
          {t('sideNavFooter.inviteMembers', {}, { defaultValue: 'Invite Members' })}
        </button>
      </div>
    </div>
  )
}

export default SideNavFooter
