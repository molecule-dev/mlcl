import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface MessagePreviewCardProps {
  channel: string
  time: string
  author: string
  message: string
}

export default function MessagePreviewCard({
  channel,
  time,
  author,
  message,
}: MessagePreviewCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('p', 5),
        cm.w('full'),
        cm.cursorPointer,
        'text-left bg-surface-container-lowest rounded-xl border-l-4 border-primary shadow-sm hover:translate-x-1 transition-transform',
      )}
      onClick={() => navigate(`/channels/${encodeURIComponent(channel)}`)}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
        <div
          className={cm.cn(
            cm.w(12),
            cm.h(12),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-lg bg-surface-secondary text-on-surface-variant',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')}>tag</span>
        </div>
        <div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
            <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>{channel}</span>
            <span className={cm.cn('text-[10px] text-on-surface-variant')}>{time}</span>
          </div>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant truncate max-w-md')}>
            <span className={cm.cn(cm.fontWeight('semibold'), cm.textPrimary)}>
              {author}
              {t('messagePreviewCard.authorSeparator', {}, { defaultValue: ':' })}
            </span>
            {message}
          </p>
        </div>
      </div>
      <span className={cm.cn('material-symbols-outlined text-on-surface-variant/30')}>
        chevron_right
      </span>
    </button>
  )
}
export { MessagePreviewCard }
