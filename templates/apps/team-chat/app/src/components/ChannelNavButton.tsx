import React from 'react'

import { getClassMap } from '@molecule/app-ui'

interface ChannelNavButtonProps {
  name: string
  unreadCount?: number
  isActive?: boolean
  onClick?: () => void
}

export function ChannelNavButton({
  name,
  unreadCount,
  isActive = false,
  onClick,
}: ChannelNavButtonProps) {
  const cm = getClassMap()
  if (isActive) {
    return (
      <button
        onClick={onClick}
        className={cm.cn(
          cm.w('full'),
          cm.flex({ align: 'center', gap: 3 }),
          cm.sp('px', 3),
          cm.fontWeight('semibold'),
          'py-1.5 bg-secondary-container text-on-secondary-container rounded-lg transition-transform scale-95 active:scale-90',
        )}
      >
        <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>tag</span>
        <span className={cm.cn(cm.textSize('sm'), "font-['Inter'] tracking-tight")}>{name}</span>
        {unreadCount !== undefined && (
          <span
            className={cm.cn(
              cm.roundedFull,
              cm.fontWeight('bold'),
              'ml-auto bg-primary text-on-primary text-[10px] px-1.5 py-0.5',
            )}
          >
            {unreadCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cm.cn(
        cm.w('full'),
        cm.flex({ align: 'center', gap: 3 }),
        cm.sp('px', 3),
        'py-1.5 text-foreground-secondary hover:bg-border rounded-lg transition-colors duration-200',
      )}
    >
      <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>tag</span>
      <span className={cm.cn(cm.textSize('sm'), "font-['Inter'] tracking-tight")}>{name}</span>
      {unreadCount !== undefined && (
        <span
          className={cm.cn(
            cm.roundedFull,
            cm.fontWeight('bold'),
            'ml-auto bg-border text-foreground-secondary text-[10px] px-1.5 py-0.5',
          )}
        >
          {unreadCount}
        </span>
      )}
    </button>
  )
}

export default ChannelNavButton
