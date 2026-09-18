import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import MessageBubble from './MessageBubble.js'

export default function ChannelIntroMessage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <MessageBubble
      author={t('channelIntro.authorName', { name: 'David Park' }, { defaultValue: '{{name}}' })}
      avatar="https://picsum.photos/seed/ChannelIntroMessage-1/1200/800"
      avatarAlt={t(
        'channelIntro.avatarAlt',
        { author: 'David Park' },
        {
          defaultValue:
            '{{author}} headshot, smiling male executive, professional office setting background',
        },
      )}
      timestamp={t('channelIntro.timestamp', { time: '10:45 AM' }, { defaultValue: '{{time}}' })}
    >
      <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface')}>
        {t(
          'channelIntro.leadIn',
          {},
          { defaultValue: "Sounds good! I've added my comments on the engineering section. " },
        )}
        <button
          type="button"
          className={cm.cn(
            cm.textPrimary,
            cm.fontWeight('medium'),
            cm.cursorPointer,
            'hover:underline',
          )}
          onClick={() => navigate('/users/alex')}
        >
          {t('channelIntro.userMention', { username: 'Alex' }, { defaultValue: '@{{username}}' })}
        </button>
        {t('channelIntro.reviewPrompt', {}, { defaultValue: ' can you review the infra budget?' })}
      </p>
    </MessageBubble>
  )
}
export { ChannelIntroMessage }
