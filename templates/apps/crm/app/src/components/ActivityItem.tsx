import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function ActivityItem() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen])

  return (
    <div
      className={cm.cn(
        cm.flex({ gap: 'md' }),
        cm.sp('p', 4),
        'hover:bg-surface-container-low transition-colors rounded-xl group',
      )}
    >
      <img
        className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'object-cover')}
        alt=""
        data-alt="man with modern haircut in blue shirt, soft cinematic lighting"
        src="https://picsum.photos/seed/ActivityItem-1/1200/800"
      />
      <div className={cm.flex1}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
          <span className={cm.fontWeight('bold')}>Marcus Chen</span>
          {t('activityItem.moved', {}, { defaultValue: 'moved' })}
          <span className={cm.cn(cm.textPrimary, cm.fontWeight('semibold'))}>
            Cloud Infrastructure Upgrade
          </span>
          {t('activityItem.to', {}, { defaultValue: 'to' })}
          <span className={cm.fontWeight('semibold')}>Qualified</span>
        </p>
        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'activityItem.meta',
            { time: '2 hours ago', company: 'TechCorp' },
            { defaultValue: '{{time}} • {{company}}' },
          )}
        </span>
      </div>
      <div className={cm.fvdef3facc} ref={menuRef}>
        <button
          className={cm.cn(
            cm.sp('p', 2),
            cm.roundedFull,
            'opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface text-foreground-tertiary',
          )}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>more_vert</span>
        </button>
        {menuOpen && (
          <div
            className={cm.cn(
              cm.sp('mt', 1),
              cm.w(36),
              cm.sp('py', 1),
              'absolute right-0 bg-surface rounded-xl shadow-lg z-10',
            )}
          >
            {/* TODO: wire when backend endpoint exists */}
            <button
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'text-left text-on-surface hover:bg-surface-container-low',
              )}
              onClick={() => setMenuOpen(false)}
            >
              {t('common.viewDetails', {}, { defaultValue: 'View details' })}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
export { ActivityItem }
