import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ThreadHeader() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isUserMenuOpen) return
    const handleClick = () => setIsUserMenuOpen(false)
    setTimeout(() => document.addEventListener('click', handleClick), 0)
    return () => document.removeEventListener('click', handleClick)
  }, [isUserMenuOpen])

  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 6),
        cm.h(14),
        cm.w('full'),
        'sticky top-0 z-40 bg-surface/80 backdrop-blur-md shadow-[0_1px_0_0_rgba(0,0,0,0.05)]',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
          <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t(
              'threadHeader.channelName',
              { channel: 'engineering' },
              { defaultValue: '#{{channel}}' },
            )}
          </span>
          <span className={cm.cn(cm.fontWeight('medium'), 'text-on-surface-variant opacity-40')}>
            {t('common.separator', {}, { defaultValue: '·' })}
          </span>
          <span
            className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t('threadHeader.contentType', {}, { defaultValue: 'Thread' })}
          </span>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 6 }))}>
        <div className={cm.cn(cm.flex(), '-space-x-2')}>
          <img
            className={cm.cn(
              cm.w(7),
              cm.h(7),
              'rounded-md border-2 border-surface-container-lowest',
            )}
            alt=""
            data-alt="avatar of a man with short dark hair, minimal style"
            src="https://picsum.photos/seed/ThreadHeader-1/1200/800"
          />
          <img
            className={cm.cn(
              cm.w(7),
              cm.h(7),
              'rounded-md border-2 border-surface-container-lowest',
            )}
            alt=""
            data-alt="avatar of a woman with long hair, professional look"
            src="https://picsum.photos/seed/ThreadHeader-2/1200/800"
          />
          <img
            className={cm.cn(
              cm.w(7),
              cm.h(7),
              'rounded-md border-2 border-surface-container-lowest',
            )}
            alt=""
            data-alt="avatar of a man with beard, tech professional"
            src="https://picsum.photos/seed/ThreadHeader-3/1200/800"
          />
          <div
            className={cm.cn(
              cm.w(7),
              cm.h(7),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.fontWeight('bold'),
              'rounded-md border-2 border-surface-container-lowest bg-surface-container-high text-[10px] text-on-surface-variant',
            )}
          >
            {t(
              'threadHeader.additionalParticipants',
              { count: 12 },
              { defaultValue: '+{{count}}' },
            )}
          </div>
        </div>
        <div
          className={cm.cn(
            cm.h(8),
            cm.w(64),
            cm.flex({ align: 'center', gap: 2 }),
            cm.sp('px', 3),
            'bg-surface-container-low rounded-lg group',
          )}
        >
          <span
            className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined text-outline')}
            data-icon="search"
          >
            search
          </span>
          <input
            className={cm.cn(
              cm.textSize('xs'),
              cm.w('full'),
              'bg-transparent border-none focus:ring-0 placeholder:text-outline',
            )}
            placeholder={t(
              'threadHeader.searchPlaceholder',
              {},
              { defaultValue: 'Search thread...' },
            )}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
          <button
            className={cm.cn('text-outline hover:text-primary transition-colors')}
            onClick={() => navigate('/settings')}
          >
            <span className={cm.cn('material-symbols-outlined')} data-icon="settings">
              settings
            </span>
          </button>
          <button
            type="button"
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.cursorPointer,
              'rounded-lg overflow-hidden border border-outline-variant/30',
            )}
            onClick={(e) => {
              e.stopPropagation()
              setIsUserMenuOpen((v) => !v)
            }}
          >
            <img
              alt={t('threadHeader.userAvatarAlt', {}, { defaultValue: 'User Profile Avatar' })}
              className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
              data-alt="smiling software engineer headshot, clean studio lighting, high resolution"
              src="https://picsum.photos/seed/ThreadHeader-4/1200/800"
            />
          </button>
        </div>
      </div>
    </header>
  )
}

export default ThreadHeader
export { ThreadHeader }
