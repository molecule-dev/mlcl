import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AVATAR_BG } from '../lib/avatarColors.js'

interface Conversation {
  id: string
  type: 'direct' | 'group'
  name: string
  initials: string
  avatar_index: number
  last_message: string
  last_message_at: string
  last_message_self: boolean
  unread_count: number
  presence: 'online' | 'away' | 'offline'
  muted: boolean
  encrypted: boolean
  member_count: number | null
  safety_number_verified: boolean
  disappearing_seconds: number
}

interface ConversationListProps {
  conversations: Conversation[]
  /** Optional active id to highlight the selected row in split-pane mode. */
  activeId?: string | null
}

const PRESENCE_DOT: Record<Conversation['presence'], string> = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  offline: 'bg-slate-400',
}

function fmtTime(iso: string, yesterdayLabel: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return yesterdayLabel
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Editorial conversation list — avatar + bold name + presence dot + glyph chips
 * (lock, timer, mute) + preview + timestamp + unread bubble. Translated from
 * team-chat's SideNavBar with Hush's slate-glass aesthetic.
 */
export function ConversationList({ conversations, activeId }: ConversationListProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const yesterdayLabel = t('time.yesterday', {}, { defaultValue: 'Yesterday' })

  if (conversations.length === 0) {
    return (
      <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant text-sm')}>
        {t(
          'conversationList.empty',
          {},
          { defaultValue: 'No conversations yet — start a thread.' },
        )}
      </p>
    )
  }

  return (
    <ul className={'space-y-1'}>
      {conversations.map((c) => {
        const active = activeId === c.id
        const ephemeral = c.disappearing_seconds > 0
        return (
          <li key={c.id}>
            <Link
              to={`/conversations/${c.id}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl transition-colors group',
                active ? 'bg-primary/10 ring-1 ring-primary/20' : 'hover:bg-surface-container-low',
              )}
            >
              <div className="relative shrink-0">
                <div
                  className={
                    'w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm'
                  }
                  style={{ backgroundColor: AVATAR_BG[c.avatar_index % AVATAR_BG.length] }}
                  aria-hidden="true"
                >
                  {c.type === 'group' ? (
                    <span className={'material-symbols-outlined text-lg'}>group</span>
                  ) : (
                    c.initials || c.name.charAt(0).toUpperCase()
                  )}
                </div>
                {c.type === 'direct' && (
                  <span
                    className={cm.cn(
                      'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-surface-container-lowest',
                      PRESENCE_DOT[c.presence],
                    )}
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className={cm.cn(cm.flex1, 'min-w-0')}>
                <div className={'flex items-baseline gap-2'}>
                  <p
                    className={cm.cn(
                      'text-sm truncate',
                      active ? 'font-extrabold text-primary' : 'font-bold text-on-surface',
                    )}
                  >
                    {c.name}
                  </p>
                  {c.encrypted && (
                    <span
                      className="material-symbols-outlined text-success text-[14px] shrink-0"
                      aria-label={t(
                        'common.endToEndEncrypted',
                        {},
                        { defaultValue: 'End-to-end encrypted' },
                      )}
                    >
                      lock
                    </span>
                  )}
                  {c.safety_number_verified && (
                    <span
                      className="material-symbols-outlined text-success text-[14px] shrink-0"
                      aria-label={t(
                        'conversationList.verifiedAria',
                        {},
                        { defaultValue: 'Verified safety number' },
                      )}
                    >
                      verified
                    </span>
                  )}
                  {ephemeral && (
                    <span
                      className="material-symbols-outlined text-warning text-[14px] shrink-0"
                      aria-label={t(
                        'conversationList.ephemeralAria',
                        {},
                        { defaultValue: 'Disappearing messages on' },
                      )}
                    >
                      timer
                    </span>
                  )}
                  {c.muted && (
                    <span
                      className="material-symbols-outlined text-on-surface-variant text-[14px] shrink-0"
                      aria-label={t('conversationList.mutedAria', {}, { defaultValue: 'Muted' })}
                    >
                      notifications_off
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-on-surface-variant shrink-0 tabular-nums">
                    {fmtTime(c.last_message_at, yesterdayLabel)}
                  </span>
                </div>
                <p className={'text-xs text-on-surface-variant truncate mt-0.5'}>
                  {c.last_message_self
                    ? t('conversationList.youPrefix', {}, { defaultValue: 'You: ' })
                    : ''}
                  {c.last_message}
                </p>
              </div>

              {c.unread_count > 0 && (
                <span
                  className={
                    'px-2 py-0.5 rounded-full bg-primary text-white text-[11px] font-extrabold tabular-nums shrink-0 min-w-[24px] text-center'
                  }
                  aria-label={t(
                    'common.countUnread',
                    { count: c.unread_count },
                    { defaultValue: '{{count}} unread' },
                  )}
                >
                  {c.unread_count}
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
