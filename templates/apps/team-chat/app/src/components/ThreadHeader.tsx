import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ThreadHeaderProps {
  /** The :channelId route param — drives the back link + the real channel name. */
  channelId?: string
}

function ThreadHeader({ channelId }: ThreadHeaderProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<{ name?: string; email?: string }>()
  const [channelName, setChannelName] = useState<string | null>(null)

  // The header used to hardcode "#engineering" for every thread; resolve the
  // real channel so the title matches the page you navigated from.
  useEffect(() => {
    if (!channelId) return
    let active = true
    http
      .get<{ name?: string }>(`/api/channels/${channelId}`)
      .then((res) => {
        if (active) setChannelName(String(res.data?.name ?? ''))
      })
      .catch(() => {
        if (active) setChannelName('')
      })
    return () => {
      active = false
    }
  }, [http, channelId])

  const userInitial = (user?.name || user?.email || 'U').charAt(0).toUpperCase()

  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between' }),
        cm.sp('px', 6),
        cm.h(14),
        cm.w('full'),
        'sticky top-0 z-40 shrink-0 bg-surface/80 backdrop-blur-md shadow-[0_1px_0_0_rgba(0,0,0,0.05)]',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), 'min-w-0')}>
        {channelId && (
          <Link
            data-mol-id="thread-back"
            to={`/channels/${channelId}`}
            aria-label={t('thread.backToChannel', {}, { defaultValue: 'Back to channel' })}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-9 w-9 shrink-0 rounded-md border-none bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-primary',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[22px]')}>arrow_back</span>
          </Link>
        )}
        <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'min-w-0')}>
          <span
            className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'truncate text-on-surface')}
          >
            {channelName
              ? t(
                  'threadHeader.channelName',
                  { channel: channelName },
                  { defaultValue: '#{{channel}}' },
                )
              : t('threadHeader.contentType', {}, { defaultValue: 'Thread' })}
          </span>
          {channelName && (
            <>
              <span
                className={cm.cn(cm.fontWeight('medium'), 'text-on-surface-variant opacity-40')}
              >
                {t('common.separator', {}, { defaultValue: '·' })}
              </span>
              <span
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
              >
                {t('threadHeader.contentType', {}, { defaultValue: 'Thread' })}
              </span>
            </>
          )}
        </div>
      </div>
      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 6 }), 'hidden md:flex')}
        aria-hidden="true"
      >
        {/* Participant cluster — decorative placeholder chips (the API does not
            expose thread participants), rendered locally instead of the remote
            stock photos this used to fetch. */}
        <div className={cm.cn(cm.flex(), '-space-x-2')}>
          {['A', 'M', 'J'].map((initial) => (
            <div
              key={initial}
              className={cm.cn(
                cm.w(7),
                cm.h(7),
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
                'rounded-md border-2 border-surface-container-lowest bg-primary-container text-[11px] text-on-primary-container',
              )}
            >
              {initial}
            </div>
          ))}
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
            aria-label={t('threadHeader.searchPlaceholder', {}, { defaultValue: 'Search thread' })}
          />
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
        <Link
          to="/settings"
          data-mol-id="thread-header-settings"
          aria-label={t('nav.settings', {}, { defaultValue: 'Settings' })}
          title={t('nav.settings', {}, { defaultValue: 'Settings' })}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-9 w-9 rounded-md text-outline hover:text-primary transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} data-icon="settings">
            settings
          </span>
        </Link>
        <Link
          to="/settings"
          data-mol-id="thread-header-user"
          aria-label={t('threadHeader.userAvatarAlt', {}, { defaultValue: 'User profile' })}
          title={user?.name || user?.email || undefined}
          className={cm.cn(
            cm.w(8),
            cm.h(8),
            cm.flex({ align: 'center', justify: 'center' }),
            cm.cursorPointer,
            'rounded-lg bg-primary text-sm font-bold text-on-primary overflow-hidden border border-outline-variant/30',
          )}
        >
          {userInitial}
        </Link>
      </div>
    </header>
  )
}

export default ThreadHeader
export { ThreadHeader }
