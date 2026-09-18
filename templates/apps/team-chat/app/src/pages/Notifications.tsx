import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import SideNavBar from '../components/SideNavBar.js'
import TopNavBar from '../components/TopNavBar.js'

interface MessageRow {
  id?: string
  channel_id?: string
  content?: string
  created_at?: string
  user_name?: string
}

/**
 * Notifications page — surfaces messages where the signed-in user has been
 * @-mentioned. The `@firstName` match and member-channel scoping are done
 * server-side by `GET /api/messages/mentions`; the page just renders the rows
 * it returns. (Hitting `/api/messages` directly 400s — that route requires a
 * `channel_id`/`search` scope — which is why the dedicated mentions feed exists.)
 */
export function Notifications() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [mentions, setMentions] = useState<MessageRow[] | null>(null)

  useEffect(() => {
    let active = true
    http
      .get<MessageRow[]>('/api/messages/mentions')
      .then((res) => {
        if (!active) return
        setMentions(Array.isArray(res?.data) ? res.data : [])
      })
      .catch(() => {
        if (active) setMentions([])
      })
    return () => {
      active = false
    }
  }, [http])

  return (
    <div
      className={cm.cn(cm.surface, cm.h('screen'), cm.w('full'), 'text-on-surface overflow-hidden')}
    >
      <SideNavBar />
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.h('screen'),
          'ml-[260px] w-[calc(100%-260px)]',
        )}
      >
        <TopNavBar />
        <main
          data-mol-id="page-notifications"
          className={cm.cn(cm.flex1, cm.surface, 'overflow-y-auto', cm.sp('px', 6), cm.sp('py', 8))}
        >
          <div className={cm.cn(cm.mxAuto, 'max-w-3xl')}>
            <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
              {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
            </h1>
            {mentions === null && (
              <p data-mol-id="notifications-loading" className={cm.textMuted}>
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </p>
            )}
            {mentions !== null && mentions.length === 0 && (
              <p data-mol-id="notifications-empty" className={cm.textMuted}>
                {t('notifications.empty', {}, { defaultValue: "You're all caught up." })}
              </p>
            )}
            {mentions && mentions.length > 0 && (
              <ul
                data-mol-id="notifications-list"
                className={cm.cn(cm.stack(3))}
                style={{ listStyle: 'none', padding: 0, margin: 0 }}
              >
                {mentions.map((m) => (
                  <li
                    key={String(m.id)}
                    data-mol-id="notifications-item"
                    className={cm.cn(cm.card({ variant: 'default' }), cm.sp('p', 4))}
                  >
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                      {String(
                        m.user_name ??
                          t('notifications.unknownUser', {}, { defaultValue: 'Someone' }),
                      )}
                    </p>
                    <p className={cm.textMuted} style={{ marginTop: 4 }}>
                      {String(m.content ?? '')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Notifications
