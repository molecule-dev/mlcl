import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import FileCard from './FileCard.js'

export default function FileMessage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <>
      {/* Message 4: Emily Torres */}
      <div
        className={cm.cn(
          cm.flex({ gap: 4 }),
          cm.sp('p', 3),
          'group rounded-lg message-hover transition-colors',
        )}
      >
        <img
          className={cm.cn(cm.w(10), cm.h(10), cm.shrink0, 'rounded-lg object-cover')}
          alt=""
          data-alt="Emily Torres portrait, casual workspace setting with warm atmospheric lighting"
          src="https://picsum.photos/seed/FileMessage-1/1200/800"
        />
        <div className={cm.flex1}>
          <div className={cm.cn(cm.flex({ align: 'baseline', gap: 2 }), cm.sp('mb', 1))}>
            <button
              type="button"
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.cursorPointer,
                'text-foreground hover:underline',
              )}
              onClick={() => navigate('/users/emily-torres')}
            >
              {t('fileMessage.sender', { name: 'Emily Torres' }, { defaultValue: '{{name}}' })}
            </button>
            <span className={cm.cn('text-[11px] text-on-surface-variant')}>
              {t('fileMessage.time', { time: '11:30 AM' }, { defaultValue: '{{time}}' })}
            </span>
          </div>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mb', 3), 'leading-relaxed text-on-surface')}
          >
            {t('fileMessage.action', {}, { defaultValue: 'shared a file' })}
          </p>
          <FileCard
            fileName="Q2-roadmap-v3.pdf"
            fileSize="1.4 MB"
            fileType="PDF Document"
            onClick={() => window.open('/api/files/Q2-roadmap-v3.pdf', '_blank')}
          />
        </div>
      </div>
    </>
  )
}
export { FileMessage }
