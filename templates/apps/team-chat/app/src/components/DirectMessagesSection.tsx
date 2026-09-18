import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import DirectMessageButton from './DirectMessageButton.js'
import DirectMessageUserButton from './DirectMessageUserButton.js'

export default function DirectMessagesSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [, setIsAddOpen] = useState(false)
  const navigate = useNavigate()
  return (
    <>
      {/* Direct Messages Section */}
      <div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 3),
            cm.sp('mb', 2),
          )}
        >
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] text-on-surface-variant uppercase tracking-widest',
            )}
          >
            {t('directMessagesSection.title', {}, { defaultValue: 'Direct Messages' })}
          </span>
          <button
            type="button"
            aria-label={t('directMessagesSection.addDm', undefined, {
              defaultValue: 'New direct message',
            })}
            className={cm.cn(
              cm.textSize('sm'),
              cm.cursorPointer,
              'material-symbols-outlined hover:text-primary transition-colors',
            )}
            onClick={() => setIsAddOpen(true)}
          >
            add
          </button>
        </div>
        <div className={cm.cn('space-y-0.5')}>
          <DirectMessageButton onClick={() => navigate('/dm')} />
          <DirectMessageUserButton
            onClick={() => navigate('/dm/sarah-kim')}
            name="Sarah Kim"
            avatar="https://picsum.photos/seed/DirectMessagesSection-1/1200/800"
            avatarAlt="profile photo of a smiling woman with glasses, editorial style studio portrait"
            isOnline={true}
          />
          <DirectMessageUserButton
            onClick={() => navigate('/dm/david-park')}
            name="David Park"
            avatar="https://picsum.photos/seed/DirectMessagesSection-2/1200/800"
            avatarAlt="headshot of David Park, professional corporate photography with neutral background"
            isOnline={false}
          />
        </div>
      </div>
    </>
  )
}
export { DirectMessagesSection }
