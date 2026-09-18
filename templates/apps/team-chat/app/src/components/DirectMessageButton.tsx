import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface DirectMessageButtonProps {
  onClick?: () => void | Promise<void>
}

export default function DirectMessageButton({ onClick }: DirectMessageButtonProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(2)

  const handleClick = () => {
    setUnreadCount(0)
    if (onClick) {
      void onClick()
      return
    }
    navigate('/messages/alex-chen')
  }
  return (
    <button
      onClick={handleClick}
      className={cm.cn(
        cm.w('full'),
        cm.flex({ align: 'center', gap: 3 }),
        cm.sp('px', 3),
        'py-1.5 text-foreground-secondary hover:bg-border rounded-lg group',
      )}
    >
      <div className={cm.cn('relative')}>
        <img
          className={cm.cn(cm.w(6), cm.h(6), cm.roundedFull, 'object-cover')}
          alt=""
          data-alt="professional headshot of Alex Chen with soft natural lighting in a modern office"
          src="https://picsum.photos/seed/DirectMessageButton-1/1200/800"
        />
        <span
          className={cm.cn(
            cm.w(2),
            cm.h(2),
            cm.roundedFull,
            'absolute bottom-0 right-0 bg-green-500 border border-border',
          )}
        ></span>
      </div>
      <span className={cm.cn(cm.textSize('sm'), "font-['Inter'] tracking-tight")}>
        {t('directMessageButton.contactName', { name: 'Alex Chen' }, { defaultValue: '{{name}}' })}
      </span>
      {unreadCount > 0 && (
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.roundedFull,
            'ml-auto bg-primary text-on-primary text-[10px] px-1.5 py-0.5',
          )}
        >
          {unreadCount}
        </span>
      )}
    </button>
  )
}
export { DirectMessageButton }
