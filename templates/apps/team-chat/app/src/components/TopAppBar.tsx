import { useState } from 'react'

import { useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface TopAppBarProps {
  channel?: Record<string, unknown> | null
  memberCount?: number
}

export default function TopAppBar({ channel, memberCount }: TopAppBarProps) {
  const cm = getClassMap()
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()
  const handleThemeToggle = () => setTheme(theme?.mode === 'dark' ? 'light' : 'dark')
  const [, setIsFavorite] = useState(false)
  const [, setIsPinned] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [inviteNotice, setInviteNotice] = useState<string | null>(null)

  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 6),
        cm.w('full'),
        cm.h(14),
        'sticky top-0 z-30 bg-surface shadow-sm dark:shadow-none border-b border-border/50',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
        <div className={cm.cn(cm.flex({ direction: 'col' }))}>
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-1.5')}>
            <span className={cm.cn(cm.textSize('lg'), 'font-black text-foreground')}>
              #
              {channel
                ? String(channel.name)
                : t('topAppBar.defaultChannelName', {}, { defaultValue: 'general' })}
            </span>
            <button
              type="button"
              aria-label={t('topAppBar.favoriteChannel', undefined, {
                defaultValue: 'Favorite channel',
              })}
              className={cm.cn(
                cm.cursorPointer,
                'material-symbols-outlined text-[18px] text-on-surface-variant',
              )}
              onClick={() => setIsFavorite((f) => !f)}
            >
              star
            </button>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
            <span className={cm.cn(cm.fontWeight('medium'), 'text-[12px] text-on-surface-variant')}>
              {t(
                'topAppBar.memberCount',
                { count: memberCount ?? 24 },
                { defaultValue: '{{count}} members' },
              )}
            </span>
            <span className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-outline-variant')}></span>
            <span
              className={cm.cn(
                cm.maxW('[300px]'),
                'text-[12px] text-on-surface-variant italic truncate',
              )}
            >
              {channel?.topic
                ? String(channel.topic)
                : t(
                    'topAppBar.defaultTopic',
                    {},
                    { defaultValue: 'Company-wide announcements and updates' },
                  )}
            </span>
          </div>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
        <div className={cm.cn('relative hidden lg:block')}>
          <span
            className={cm.cn(
              'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]',
            )}
          >
            search
          </span>
          <input
            className={cm.cn(
              cm.roundedFull,
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.textSize('xs'),
              cm.w(64),
              'border-none bg-surface-container-low py-1.5 transition-all focus:bg-surface focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30',
            )}
            placeholder={t(
              'topAppBar.searchPlaceholder',
              {},
              { defaultValue: 'Search message history' },
            )}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 1 }))}>
          {inviteNotice && (
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'hidden max-w-[200px] truncate text-warning xl:inline',
              )}
            >
              {inviteNotice}
            </span>
          )}
          <button
            type="button"
            className={cm.cn(
              cm.sp('p', 2),
              'rounded-lg text-foreground-secondary opacity-80 transition-all hover:bg-surface-secondary hover:text-sky-500 hover:opacity-100',
            )}
            onClick={() => setIsPinned((p) => !p)}
          >
            <span className={cm.cn('material-symbols-outlined')}>push_pin</span>
          </button>
          <button
            type="button"
            className={cm.cn(
              cm.sp('p', 2),
              'rounded-lg text-foreground-secondary opacity-80 transition-all hover:bg-surface-secondary hover:text-sky-500 hover:opacity-100',
            )}
            onClick={() => {
              setInviteNotice(t('demo.inviteMembersUnavailable'))
              window.setTimeout(() => setInviteNotice(null), 4000)
            }}
          >
            <span className={cm.cn('material-symbols-outlined')}>person_add</span>
          </button>
          <button
            type="button"
            className={cm.cn(
              cm.sp('p', 2),
              'rounded-lg text-foreground-secondary opacity-80 transition-all hover:bg-surface-secondary hover:text-sky-500 hover:opacity-100',
            )}
            onClick={handleThemeToggle}
          >
            <span className={cm.cn('material-symbols-outlined')}>dark_mode</span>
          </button>
        </div>
        <div className={cm.cn(cm.h(8), 'w-px bg-border/50')}></div>
        <img
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.roundedFull,
            'border-2 border-primary-container object-cover',
          )}
          alt=""
          data-alt="circular user profile picture of a young man, minimalist aesthetic with clean studio lighting"
          src="https://picsum.photos/seed/TopAppBar-1/1200/800"
        />
      </div>
    </header>
  )
}
export { TopAppBar }
