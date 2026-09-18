import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import ChannelNavButton from './ChannelNavButton.js'

export function ChannelsList() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
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
          {t('channelsList.header', {}, { defaultValue: 'Channels' })}
        </span>
        <button
          type="button"
          aria-label={t('channelsList.addChannel', undefined, { defaultValue: 'New channel' })}
          className={cm.cn(
            cm.textSize('sm'),
            cm.cursorPointer,
            'material-symbols-outlined hover:text-primary transition-colors',
          )}
          onClick={() => navigate('/channels/new')}
        >
          add
        </button>
      </div>
      <div className={cm.cn('space-y-0.5')}>
        <ChannelNavButton
          name={t('channelsList.general', {}, { defaultValue: 'general' })}
          unreadCount={3}
          isActive={true}
          onClick={() => navigate('/channels/general')}
        />
        <button
          className={cm.cn(
            cm.w('full'),
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 3),
            'py-1.5 text-foreground-secondary hover:bg-border rounded-lg transition-colors duration-200',
          )}
          onClick={() => navigate('/channels/engineering')}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>tag</span>
          <span className={cm.cn(cm.textSize('sm'), "font-['Inter'] tracking-tight")}>
            {t('channelsList.engineering', {}, { defaultValue: 'engineering' })}
          </span>
          <span
            className={cm.cn(
              cm.roundedFull,
              cm.fontWeight('bold'),
              'ml-auto bg-border text-foreground-secondary text-[10px] px-1.5 py-0.5',
            )}
          >
            {t('channelsList.unreadCount', { count: 12 }, { defaultValue: '{{count}}' })}
          </span>
        </button>
        <button
          className={cm.cn(
            cm.w('full'),
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 3),
            'py-1.5 text-foreground-secondary hover:bg-border rounded-lg transition-colors duration-200',
          )}
          onClick={() => navigate('/channels/design')}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>tag</span>
          <span className={cm.cn(cm.textSize('sm'), "font-['Inter'] tracking-tight")}>
            {t('channelsList.design', {}, { defaultValue: 'design' })}
          </span>
        </button>
        <button
          className={cm.cn(
            cm.w('full'),
            cm.flex({ align: 'center', gap: 3 }),
            cm.sp('px', 3),
            'py-1.5 text-foreground-secondary hover:bg-border rounded-lg transition-colors duration-200',
          )}
          onClick={() => navigate('/channels/marketing')}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>tag</span>
          <span className={cm.cn(cm.textSize('sm'), "font-['Inter'] tracking-tight")}>
            {t('channelsList.marketing', {}, { defaultValue: 'marketing' })}
          </span>
        </button>
      </div>
    </div>
  )
}

export default ChannelsList
