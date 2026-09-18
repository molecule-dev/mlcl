import React from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import ReactionButton from './ReactionButton.js'

export function MessageItem() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleProfileClick = () => {
    navigate('/profile/sarah-kim')
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ gap: 4 }),
        cm.sp('p', 3),
        'group rounded-lg message-hover transition-colors',
      )}
    >
      <button
        type="button"
        aria-label={t(
          'messageItem.authorName',
          { name: 'Sarah Kim' },
          { defaultValue: '{{name}}' },
        )}
        className={cm.cn(
          cm.w(10),
          cm.h(10),
          cm.shrink0,
          cm.cursorPointer,
          'rounded-lg overflow-hidden',
        )}
        onClick={handleProfileClick}
      >
        <img
          className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
          data-alt="profile avatar of Sarah Kim, modern corporate portrait with soft lighting"
          src="https://picsum.photos/seed/MessageItem-1/1200/800"
          alt=""
        />
      </button>
      <div className={cm.flex1}>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 2 }), cm.sp('mb', 1))}>
          <button
            type="button"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.cursorPointer,
              'text-foreground hover:underline',
            )}
            onClick={handleProfileClick}
          >
            {t('messageItem.authorName', { name: 'Sarah Kim' }, { defaultValue: '{{name}}' })}
          </button>
          <span className={cm.cn('text-[11px] text-on-surface-variant')}>
            {t('messageItem.timestamp', { time: '10:23 AM' }, { defaultValue: '{{time}}' })}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface')}>
          {t(
            'messageItem.body',
            {},
            {
              defaultValue:
                "Hey team! The Q2 planning doc is ready for review. Please take a look before Thursday's standup.",
            },
          )}
        </p>
        <div className={cm.cn(cm.flex(), cm.sp('mt', 3), 'flex-wrap gap-1.5')}>
          <ReactionButton emoji="👍" count={5} />
          <ReactionButton emoji="🎉" count={3} />
          <ReactionButton emoji="👀" count={2} />
        </div>
      </div>
    </div>
  )
}
export default MessageItem
