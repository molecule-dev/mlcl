import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTheme, useTranslation } from '@molecule/app-react'
import type { RealtimeConnection } from '@molecule/app-realtime'
import { getClassMap } from '@molecule/app-ui'

import MobileTopBar from '../components/MobileTopBar.js'
import SideNavBar from '../components/SideNavBar.js'
import {
  appendMessage,
  isMessageRow,
  removeMessage,
  replaceMessage,
  upsertMessage,
} from '../lib/message-merge.js'
import { getRealtimeConnection } from '../lib/realtime.js'

function ChannelChrome({ children }: { children: ReactNode }) {
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <SideNavBar />
      {/* <768px: the sidebar becomes an overlay drawer (see SideNavBar), so the
          content column takes the full width and carries the mobile top bar. */}
      <div className="ml-0 flex h-full w-full flex-col md:ml-[260px] md:w-[calc(100%-260px)]">
        <MobileTopBar />
        <div className="min-h-0 w-full flex-1">{children}</div>
      </div>
    </div>
  )
}

export function ChannelPage() {
  const { channelId } = useParams<{ channelId: string }>()
  const { t } = useTranslation()
  const http = useHttpClient()
  const cm = getClassMap()
  const { mode, setTheme } = useTheme()
  const { user } = useAuth<{ name?: string; email?: string }>()
  const userInitial = (user?.name || user?.email || 'U').charAt(0).toUpperCase()
  const [channel, setChannel] = useState<Record<string, unknown> | null>(null)
  const [messages, setMessages] = useState<Record<string, unknown>[]>([])
  const [members, setMembers] = useState<Record<string, unknown>[]>([])
  const [pinnedMessages, setPinnedMessages] = useState<Record<string, unknown>[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [showPinned, setShowPinned] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        await http.post(`/api/reactions/${messageId}`, { emoji })
        const fresh = await http.get<Record<string, unknown>[]>(
          `/api/messages?channel_id=${channelId}`,
        )
        if (fresh?.data) setMessages(fresh.data)
      } catch (_error) {
        // best-effort — leave UI state unchanged on failure
      }
    },
    [http, channelId],
  )

  useEffect(() => {
    if (!channelId) return
    setLoading(true)
    Promise.all([
      http
        .get<Record<string, unknown>>(`/api/channels/${channelId}`)
        .then((res) => setChannel(res.data)),
      http
        .get<Record<string, unknown>[]>(`/api/messages?channel_id=${channelId}`)
        .then((res) => setMessages(res.data || [])),
      http
        .get<Record<string, unknown>[]>(`/api/members/${channelId}`)
        .then((res) => setMembers(res.data || [])),
      http
        .get<Record<string, unknown>[]>(`/api/messages?channel_id=${channelId}&pinned=true`)
        .then((res) => setPinnedMessages(res.data || []))
        .catch(() => setPinnedMessages([])),
    ]).finally(() => setLoading(false))

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]) // http is stable across renders; including it would re-fetch on every call

  // Live updates: join this channel's realtime room (`channel:<id>`) and
  // apply message events as they arrive. The fetch effect above stays the
  // source of truth on mount; events keep it current without polling.
  useEffect(() => {
    if (!channelId) return
    let disposed = false
    let conn: RealtimeConnection | null = null
    const room = `channel:${channelId}`

    const onCreated = (data: unknown) => setMessages((prev) => appendMessage(prev, data))
    const onUpdated = (data: unknown) => {
      setMessages((prev) => replaceMessage(prev, data))
      setPinnedMessages((prev) => replaceMessage(prev, data))
    }
    const onDeleted = (data: unknown) => {
      if (!isMessageRow(data)) return
      setMessages((prev) => removeMessage(prev, data.id))
      setPinnedMessages((prev) => removeMessage(prev, data.id))
    }
    const onPinned = (data: unknown) => {
      setMessages((prev) => replaceMessage(prev, data))
      setPinnedMessages((prev) => upsertMessage(prev, data))
    }
    const onUnpinned = (data: unknown) => {
      setMessages((prev) => replaceMessage(prev, data))
      if (!isMessageRow(data)) return
      setPinnedMessages((prev) => removeMessage(prev, data.id))
    }
    const onReconnect = () => {
      // Missed-window recovery: events emitted while disconnected are gone
      // for good, so refetch this channel's messages after a reconnect.
      if (disposed) return
      http
        .get<Record<string, unknown>[]>(`/api/messages?channel_id=${channelId}`)
        .then((res) => {
          if (!disposed) setMessages(res.data || [])
        })
        .catch((_error) => {
          // Transient refetch failure — the feed keeps its last known state
          // and self-heals on the next event or reconnect.
        })
      http
        .get<Record<string, unknown>[]>(`/api/messages?channel_id=${channelId}&pinned=true`)
        .then((res) => {
          if (!disposed) setPinnedMessages(res.data || [])
        })
        .catch((_error) => {
          // Transient refetch failure — pinned panel keeps its last known state.
        })
    }

    getRealtimeConnection()
      .then(async (connection) => {
        if (disposed) return
        conn = connection
        connection.on('message:created', onCreated)
        connection.on('message:updated', onUpdated)
        connection.on('message:deleted', onDeleted)
        connection.on('message:pinned', onPinned)
        connection.on('message:unpinned', onUnpinned)
        // onReconnect has no un-register; the `disposed` flag makes stale
        // handlers inert after unmount / channel switch.
        connection.onReconnect(onReconnect)
        await connection.joinRoom(room)
      })
      .catch((_error) => {
        // Join denied (non-member) or transport unavailable — non-member
        // access is already surfaced at the HTTP layer, so stay quietly on
        // the fetched data with no live updates.
      })

    return () => {
      disposed = true
      if (conn) {
        conn.off('message:created', onCreated)
        conn.off('message:updated', onUpdated)
        conn.off('message:deleted', onDeleted)
        conn.off('message:pinned', onPinned)
        conn.off('message:unpinned', onUnpinned)
        conn.leaveRoom(room).catch((_error) => {
          // Connection already closed — nothing to leave.
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]) // http is stable across renders; including it would re-subscribe on every call

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || sending) return
    setSending(true)
    try {
      const res = await http.post<Record<string, unknown>>('/api/messages', {
        channel_id: channelId,
        content: newMessage,
      })
      // Dedupe by id: our own message:created broadcast may have landed first.
      const created = res.data as Record<string, unknown> | undefined
      setMessages((prev) => appendMessage(prev, created))
      setNewMessage('')
      setSendError(null)
      // Domain analytics: the send funnel's success point.
      track({
        name: 'message.sent',
        properties: { channel_id: String(channelId ?? ''), message_id: String(created?.id ?? '') },
      })
    } catch (_error) {
      // A failed send keeps the draft in the composer and surfaces inline —
      // it used to reject unhandled (silent failure from the user's view).
      setSendError(
        t('channel.sendError', {}, { defaultValue: 'Message failed to send — try again.' }),
      )
    } finally {
      setSending(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newMessage, channelId, sending, t]) // http is stable across renders; including it would re-fetch on every call

  // Wraps the current selection in the given prefix/suffix, or inserts the
  // suffix at the cursor if there's no selection. Toolbar buttons used to
  // be dead (no onClick) AND submit-typed inside a <form>, so clicking
  // "Bold" sent an empty message instead of formatting one.
  const wrapInTextarea = useCallback(
    (prefix: string, suffix: string = prefix) => {
      const ta = document.querySelector<HTMLTextAreaElement>('[data-mol-id="input-message"]')
      if (!ta) {
        setNewMessage((v) => v + prefix + suffix)
        return
      }
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const before = newMessage.slice(0, start)
      const selected = newMessage.slice(start, end)
      const after = newMessage.slice(end)
      const next = `${before}${prefix}${selected}${suffix}${after}`
      setNewMessage(next)
      requestAnimationFrame(() => {
        ta.focus()
        const cursor = start + prefix.length + selected.length + (selected ? suffix.length : 0)
        ta.setSelectionRange(cursor, cursor)
      })
    },
    [newMessage],
  )

  const insertAtCursor = useCallback((text: string) => wrapInTextarea(text, ''), [wrapInTextarea])

  const attachFile = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      insertAtCursor(`📎 ${file.name} `)
    }
    input.click()
  }, [insertAtCursor])

  const filteredMessages = searchQuery
    ? messages.filter((m) => String(m.content).toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  const formatDateSeparator = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    } catch (_error) {
      // invalid date string — fall back to the raw value
      return dateStr
    }
  }

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    } catch (_error) {
      // invalid date string — fall back to the raw value
      return dateStr
    }
  }

  const getDateKey = (dateStr: string) => {
    try {
      return new Date(dateStr).toDateString()
    } catch (_error) {
      // invalid date string — return empty string so grouping degrades gracefully
      return ''
    }
  }

  if (loading) {
    return (
      <ChannelChrome>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.sp('p', 8),
          )}
          style={{ height: '100%' }}
        >
          <div className={cm.spinner()} />
        </div>
      </ChannelChrome>
    )
  }

  if (!channel) {
    return (
      <ChannelChrome>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.sp('p', 8),
          )}
          style={{ height: '100%' }}
        >
          <div className={cm.textCenter}>
            <div className={cm.sp('mb', 3)}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '32px', color: 'var(--color-on-surface-variant)' }}
              >
                warning
              </span>
            </div>
            <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('medium'), cm.sp('mb', 2))}>
              {t('channel.notFound', {}, { defaultValue: 'Channel not found' })}
            </p>
            <p className={cm.cn(cm.textMuted, cm.sp('mb', 4))}>
              {t(
                'channel.notFoundHint',
                {},
                {
                  defaultValue:
                    'This channel may have been deleted or you do not have permission to access it.',
                },
              )}
            </p>
            <Link
              to="/"
              data-mol-id="link-back-to-dashboard"
              className={cm.button({ variant: 'outline' })}
            >
              {t('channel.backToDashboard', {}, { defaultValue: 'Back to Dashboard' })}
            </Link>
          </div>
        </div>
      </ChannelChrome>
    )
  }

  return (
    <ChannelChrome>
      <style>{`
        .ch-msg-hover:hover { background-color: var(--color-primary-container); }
        .ch-toolbar-btn { padding: 6px; border-radius: 4px; border: none; background: transparent; color: var(--color-on-surface-variant); cursor: pointer; display: flex; align-items: center; }
        .ch-toolbar-btn:hover { background-color: color-mix(in srgb, var(--color-on-surface) 10%, transparent); }
        .ch-header-btn { padding: 8px; border-radius: 8px; border: none; background: transparent; color: var(--color-outline); cursor: pointer; opacity: 0.8; display: flex; align-items: center; }
        .ch-header-btn:hover { color: var(--color-primary); background-color: color-mix(in srgb, var(--color-primary) 8%, transparent); opacity: 1; }
        .ch-reaction:hover { opacity: 0.85; }
        .ch-thread-btn { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 4px 8px; border-radius: 4px; border: 1px solid transparent; background: transparent; cursor: pointer; text-decoration: none; }
        .ch-thread-btn:hover { background-color: var(--color-surface); border-color: color-mix(in srgb, var(--color-primary) 20%, transparent); }
        .ch-file-card:hover { border-color: var(--color-primary); }
        .ch-member-row:hover { background-color: color-mix(in srgb, var(--color-primary) 6%, transparent); }
        .ch-send-btn:active { transform: scale(0.95); }
        .ch-input-wrap:focus-within { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); border-color: color-mix(in srgb, var(--color-secondary) 40%, transparent); }
        .ch-search-input:focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent); background-color: var(--color-surface); }
        .ch-name-hover:hover { text-decoration: underline; }
        .ch-textarea::placeholder { color: var(--color-outline); }
      `}</style>

      <div
        data-mol-id="page-channel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: 'var(--color-background)',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* ── TopAppBar ── */}
        <header
          data-mol-id="channel-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 clamp(12px, 4vw, 24px)',
            gap: '8px',
            height: '56px',
            backgroundColor: 'var(--color-surface)',
            borderBottom:
              '1px solid color-mix(in srgb, var(--color-outline-variant) 50%, transparent)',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            flexShrink: 0,
            borderRadius: 0,
          }}
        >
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div className={cm.flex({ align: 'center' })} style={{ gap: '6px' }}>
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--mol-color-text)',
                    lineHeight: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  #{String(channel.name)}
                </span>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '16px', color: 'var(--color-outline)', cursor: 'pointer' }}
                >
                  star
                </span>
              </div>
              <div
                className={cm.flex({ align: 'center' })}
                style={{ gap: '8px', marginTop: '2px' }}
              >
                <span style={{ fontSize: '12px', color: 'var(--color-outline)', fontWeight: 500 }}>
                  {t(
                    'channel.memberCount',
                    { count: members.length },
                    { defaultValue: '{{count}} members' },
                  )}
                </span>
                {Boolean(channel.topic) && (
                  <>
                    <span
                      style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '9999px',
                        backgroundColor: 'var(--color-outline)',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      className={cm.cn('max-md:max-w-[140px] md:max-w-[300px]')}
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-outline)',
                        fontStyle: 'italic',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {String(channel.topic)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className={cm.flex({ align: 'center' })} style={{ gap: '16px', flexShrink: 0 }}>
            {/* Search Input — <1024px it drops (it filters the feed in-page;
                the toolbar stays reachable) so tablet/mobile headers fit. */}
            <div className={cm.cn('relative hidden lg:block')}>
              <span
                className="material-symbols-outlined"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '18px',
                  color: 'var(--color-outline)',
                }}
              >
                search
              </span>
              <input
                data-mol-id="input-search-messages"
                type="text"
                className="ch-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(
                  'channel.searchPlaceholder',
                  {},
                  { defaultValue: 'Search message history' },
                )}
                aria-label={t(
                  'channel.searchLabel',
                  {},
                  { defaultValue: 'Search messages in this channel' },
                )}
                style={{
                  backgroundColor: 'var(--color-surface-container-low)',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '6px 16px 6px 40px',
                  fontSize: '12px',
                  fontWeight: 400,
                  lineHeight: '16px',
                  width: 'min(256px, 22vw)',
                  outline: 'none',
                  color: 'var(--mol-color-text)',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  transition: 'all 0.15s',
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className={cm.flex({ align: 'center' })} style={{ gap: '4px' }}>
              {pinnedMessages.length > 0 && (
                <button
                  data-mol-id="button-pinned"
                  onClick={() => setShowPinned((v) => !v)}
                  className="ch-header-btn"
                  aria-pressed={showPinned}
                  aria-label={t(
                    'channel.pinnedLabel',
                    { count: pinnedMessages.length },
                    { defaultValue: '{{count}} pinned messages' },
                  )}
                >
                  <span className="material-symbols-outlined">push_pin</span>
                </button>
              )}
              <button
                data-mol-id="button-members"
                className="ch-header-btn"
                onClick={() => setShowMembers(!showMembers)}
                aria-label={t(
                  'channel.toggleMembers',
                  {},
                  { defaultValue: 'Toggle members panel' },
                )}
              >
                <span className="material-symbols-outlined">person_add</span>
              </button>
              <button
                type="button"
                data-mol-id="button-toggle-theme"
                onClick={() => setTheme(mode === 'dark' ? 'light' : 'dark')}
                className="ch-header-btn"
                aria-label={t('channel.darkMode', {}, { defaultValue: 'Toggle dark mode' })}
              >
                <span className="material-symbols-outlined">
                  {mode === 'dark' ? 'light_mode' : 'dark_mode'}
                </span>
              </button>
            </div>

            <div
              style={{
                height: '32px',
                width: '1px',
                backgroundColor: 'var(--color-outline-variant)',
              }}
            />

            {/* Current User Avatar → Settings */}
            <Link
              data-mol-id="channel-user-avatar"
              to="/settings"
              aria-label={t('nav.settings', {}, { defaultValue: 'Settings' })}
              title={user?.name || user?.email || undefined}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9999px',
                backgroundColor: 'var(--color-primary)',
                border: '2px solid var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                textDecoration: 'none',
              }}
            >
              <span style={{ color: 'var(--color-on-primary)', fontSize: '12px', fontWeight: 700 }}>
                {userInitial}
              </span>
            </Link>
          </div>
        </header>

        {/* ── Pinned Messages Panel ── */}
        {showPinned && pinnedMessages.length > 0 && (
          <aside
            data-mol-id="pinned-panel"
            style={{
              padding: '12px 24px',
              backgroundColor: 'var(--color-surface)',
              borderBottom:
                '1px solid color-mix(in srgb, var(--color-outline-variant) 50%, transparent)',
            }}
          >
            <h3
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-outline)',
                textTransform: 'uppercase',
                margin: '0 0 8px',
              }}
            >
              {t(
                'channel.pinnedHeading',
                { count: pinnedMessages.length },
                { defaultValue: 'Pinned ({{count}})' },
              )}
            </h3>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {pinnedMessages.map((m) => (
                <li
                  key={String(m.id)}
                  data-mol-id="pinned-message"
                  style={{ fontSize: '13px', color: 'var(--mol-color-text)' }}
                >
                  {String(m.content ?? '')}
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* ── Body: Messages + optional Members sidebar ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* ── Message Feed ── */}
          <div
            data-mol-id="message-feed"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px clamp(12px, 4vw, 24px)',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--color-background)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {filteredMessages.length === 0 ? (
              <div
                className={cm.cn(cm.flex({ direction: 'col', align: 'center', justify: 'center' }))}
                style={{ flex: 1 }}
              >
                <div className={cm.textCenter}>
                  <div className={cm.sp('mb', 3)}>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '32px', color: 'var(--color-outline)' }}
                    >
                      {searchQuery ? 'search' : 'forum'}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '18px',
                      fontWeight: 500,
                      marginBottom: '4px',
                      color: 'var(--mol-color-text)',
                    }}
                  >
                    {searchQuery
                      ? t(
                          'channel.noSearchResults',
                          {},
                          { defaultValue: 'No messages match your search' },
                        )
                      : t(
                          'channel.welcomeChannel',
                          { name: String(channel.name) },
                          { defaultValue: 'Welcome to #{{name}}' },
                        )}
                  </p>
                  <p className={cm.textMuted}>
                    {searchQuery
                      ? t(
                          'channel.tryDifferentSearch',
                          {},
                          {
                            defaultValue: 'Try a different search term or clear the search filter',
                          },
                        )
                      : t(
                          'channel.noMessages',
                          {},
                          {
                            defaultValue:
                              'This is the start of the conversation. Send the first message to get things going.',
                          },
                        )}
                  </p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  paddingBottom: '8px',
                }}
              >
                {filteredMessages.map((message, idx) => {
                  const prev = filteredMessages[idx - 1]
                  const showDateSep =
                    idx === 0 ||
                    (prev &&
                      getDateKey(String(prev.created_at)) !==
                        getDateKey(String(message.created_at)))
                  const showHeader =
                    !prev || String(prev.user_name) !== String(message.user_name) || showDateSep

                  return (
                    <div key={String(message.id)}>
                      {/* Date Separator */}
                      {showDateSep && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            margin: idx === 0 ? '0 0 32px' : '32px 0',
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: '1px',
                              backgroundColor:
                                'color-mix(in srgb, var(--color-outline-variant) 50%, transparent)',
                            }}
                          />
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: 'var(--color-on-surface-variant)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.2em',
                              backgroundColor: 'var(--color-surface)',
                              padding: '0 12px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatDateSeparator(String(message.created_at))}
                          </span>
                          <div
                            style={{
                              flex: 1,
                              height: '1px',
                              backgroundColor:
                                'color-mix(in srgb, var(--color-outline-variant) 50%, transparent)',
                            }}
                          />
                        </div>
                      )}

                      {/* Message Row */}
                      <div
                        data-mol-id={`message-${String(message.id)}`}
                        className="ch-msg-hover"
                        style={{
                          display: 'flex',
                          gap: '16px',
                          padding: '12px',
                          borderRadius: '8px',
                          transition: 'background-color 0.15s',
                        }}
                      >
                        {/* Avatar or spacer */}
                        {showHeader ? (
                          message.user_avatar ? (
                            <img
                              src={String(message.user_avatar)}
                              alt={String(message.user_name)}
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '8px',
                                background:
                                  'linear-gradient(135deg, var(--color-primary-container), var(--color-primary))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <span
                                style={{
                                  color: 'var(--color-on-primary)',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                }}
                              >
                                {String(message.user_name || 'U')
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                          )
                        ) : (
                          <div style={{ width: '40px', flexShrink: 0 }} />
                        )}

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {showHeader && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'baseline',
                                gap: '8px',
                                marginBottom: '4px',
                              }}
                            >
                              <span
                                className="ch-name-hover"
                                style={{
                                  fontWeight: 700,
                                  color: 'var(--color-on-background)',
                                  cursor: 'pointer',
                                }}
                              >
                                {String(
                                  message.user_name ||
                                    t('settings.unknown', {}, { defaultValue: 'Unknown' }),
                                )}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--color-on-surface-variant)',
                                }}
                              >
                                {formatTime(String(message.created_at))}
                              </span>
                              {Boolean(message.is_edited) && (
                                <span style={{ fontSize: '12px', color: 'var(--color-outline)' }}>
                                  {t('channel.edited', {}, { defaultValue: '(edited)' })}
                                </span>
                              )}
                            </div>
                          )}

                          <p
                            style={{
                              fontSize: '0.875rem',
                              lineHeight: '1.625',
                              color: 'var(--color-on-background)',
                              margin: 0,
                            }}
                          >
                            {String(message.content)}
                          </p>

                          {/* Reactions */}
                          {Array.isArray(message.reactions) &&
                            (message.reactions as Record<string, unknown>[]).length > 0 && (
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '6px',
                                  marginTop: '12px',
                                  flexWrap: 'wrap',
                                }}
                              >
                                {(message.reactions as Record<string, unknown>[]).map(
                                  (reaction, i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      data-mol-id="button-toggle-reaction"
                                      onClick={() =>
                                        toggleReaction(String(message.id), String(reaction.emoji))
                                      }
                                      className="ch-reaction"
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '2px 8px',
                                        borderRadius: '9999px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        backgroundColor:
                                          'color-mix(in srgb, var(--color-secondary-container) 60%, transparent)',
                                        border: '1px solid var(--color-secondary-container)',
                                        color: 'var(--color-on-secondary-container)',
                                        transition: 'opacity 0.15s',
                                      }}
                                    >
                                      <span>{String(reaction.emoji)}</span>
                                      <span>{String(reaction.count)}</span>
                                    </button>
                                  ),
                                )}
                              </div>
                            )}

                          {/* Attachments (File Cards) */}
                          {Array.isArray(message.attachments) &&
                            (message.attachments as Record<string, unknown>[]).length > 0 && (
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                  marginTop: '12px',
                                }}
                              >
                                {(message.attachments as Record<string, unknown>[]).map(
                                  (att, i) => (
                                    <div
                                      key={i}
                                      className="ch-file-card"
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        padding: '16px',
                                        backgroundColor: 'var(--color-surface-container-low)',
                                        border: '1px solid var(--color-outline-variant)',
                                        borderRadius: '12px',
                                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                        maxWidth: '384px',
                                        cursor: 'pointer',
                                        transition: 'border-color 0.15s',
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: '48px',
                                          height: '48px',
                                          backgroundColor: 'rgb(254, 242, 242)',
                                          borderRadius: '8px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: 'rgb(239, 68, 68)',
                                          flexShrink: 0,
                                        }}
                                      >
                                        <span
                                          className="material-symbols-outlined"
                                          style={{ fontSize: '32px' }}
                                        >
                                          description
                                        </span>
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <h4
                                          style={{
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            color: 'var(--color-on-surface)',
                                            margin: 0,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {String(att.name)}
                                        </h4>
                                        <p
                                          style={{
                                            fontSize: '11px',
                                            color: 'var(--color-on-surface-variant)',
                                            textTransform: 'uppercase',
                                            fontWeight: 600,
                                            margin: '2px 0 0',
                                          }}
                                        >
                                          {att.size ? `${String(att.size)} \u2022 ` : ''}
                                          {String(
                                            att.type ||
                                              t(
                                                'channel.document',
                                                {},
                                                { defaultValue: 'Document' },
                                              ),
                                          )}
                                        </p>
                                      </div>
                                      <a
                                        href={String(att.url)}
                                        aria-label={t(
                                          'channel.downloadFile',
                                          { name: String(att.name) },
                                          { defaultValue: 'Download {{name}}' },
                                        )}
                                        style={{
                                          width: '32px',
                                          height: '32px',
                                          borderRadius: '9999px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: 'var(--color-on-surface-variant)',
                                          flexShrink: 0,
                                        }}
                                      >
                                        <span className="material-symbols-outlined">download</span>
                                      </a>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}

                          {/* Thread Replies */}
                          {(message.reply_count as number) > 0 && (
                            <Link
                              to={`/channels/${channelId}/threads/${message.id}`}
                              className="ch-thread-btn"
                            >
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: 'var(--color-primary)',
                                }}
                              >
                                {t(
                                  'channel.replies',
                                  { count: message.reply_count as number },
                                  { defaultValue: '{{count}} replies' },
                                )}
                              </span>
                              {Boolean(message.last_reply_at) && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    color: 'var(--color-on-surface-variant)',
                                  }}
                                >
                                  {t(
                                    'channel.lastReply',
                                    { time: formatTime(String(message.last_reply_at)) },
                                    { defaultValue: 'Last reply {{time}}' },
                                  )}
                                </span>
                              )}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Members Sidebar — overlays the feed below 768px (a static
              256px column would squeeze the 390px feed to ~130px) ── */}
          {showMembers && (
            <aside
              className={cm.cn(
                'max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-20 max-md:shadow-xl',
              )}
              style={{
                width: '256px',
                padding: '16px',
                overflowY: 'auto',
                flexShrink: 0,
                borderLeft: '1px solid var(--color-outline-variant)',
                backgroundColor: 'var(--color-surface-container-low)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <h2
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--color-on-surface)',
                    margin: 0,
                  }}
                >
                  {t('nav.members', {}, { defaultValue: 'Members' })}
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-on-surface-variant)',
                    backgroundColor: 'var(--color-surface-container-high)',
                    borderRadius: '9999px',
                    padding: '2px 8px',
                  }}
                >
                  {members.length}
                </span>
              </div>

              {members.length === 0 ? (
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--color-on-surface-variant)',
                    textAlign: 'center',
                  }}
                >
                  {t('channel.noMembers', {}, { defaultValue: 'No members' })}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {members.map((member) => (
                    <div
                      key={String(member.id)}
                      className="ch-member-row"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {member.user_avatar ? (
                          <img
                            src={String(member.user_avatar)}
                            alt={String(member.user_name)}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '9999px',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '9999px',
                              background: 'var(--color-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span
                              style={{
                                color: 'var(--color-on-primary)',
                                fontSize: '10px',
                                fontWeight: 700,
                              }}
                            >
                              {String(member.user_name || member.user_id || '?')
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '8px',
                            height: '8px',
                            borderRadius: '9999px',
                            backgroundColor: member.is_online
                              ? 'rgb(34, 197, 94)'
                              : 'rgb(203, 213, 225)',
                            border: '1px solid rgb(241, 245, 249)',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: '14px',
                          letterSpacing: '-0.01em',
                          color: 'var(--color-on-surface-variant)',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {String(member.user_name || member.user_id)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          )}
        </div>

        {/* ── Message Input Area ── */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage()
          }}
          style={{ padding: '0 clamp(12px, 4vw, 24px) 16px' }}
        >
          {sendError && (
            <p
              role="alert"
              data-mol-id="message-send-error"
              className={cm.cn(cm.textSize('sm'), cm.sp('mb', 2), 'text-error')}
            >
              {sendError}
            </p>
          )}
          <div
            data-mol-id="message-input"
            className="ch-input-wrap"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-outline-variant)',
              borderRadius: '12px',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
              transition: 'all 0.15s',
            }}
          >
            {/* Formatting Toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px',
                backgroundColor:
                  'color-mix(in srgb, var(--color-surface-container-low) 80%, transparent)',
                borderBottom: '1px solid var(--color-outline-variant)',
              }}
            >
              <button
                type="button"
                data-mol-id="toolbar-bold"
                onClick={() => wrapInTextarea('**')}
                className="ch-toolbar-btn"
                aria-label={t('channel.formatBold', {}, { defaultValue: 'Bold' })}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  format_bold
                </span>
              </button>
              <button
                type="button"
                data-mol-id="toolbar-italic"
                onClick={() => wrapInTextarea('_')}
                className="ch-toolbar-btn"
                aria-label={t('channel.formatItalic', {}, { defaultValue: 'Italic' })}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  format_italic
                </span>
              </button>
              <button
                type="button"
                data-mol-id="toolbar-code"
                onClick={() => wrapInTextarea('`')}
                className="ch-toolbar-btn"
                aria-label={t('channel.formatCode', {}, { defaultValue: 'Code' })}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  code
                </span>
              </button>
              <div
                style={{
                  width: '1px',
                  height: '16px',
                  backgroundColor: 'rgb(226, 232, 240)',
                  margin: '0 4px',
                }}
              />
              <button
                type="button"
                data-mol-id="toolbar-link"
                onClick={() => {
                  const url = window.prompt(
                    t('channel.linkPrompt', {}, { defaultValue: 'Link URL' }),
                    'https://',
                  )
                  if (!url) return
                  wrapInTextarea('[', `](${url})`)
                }}
                className="ch-toolbar-btn"
                aria-label={t('channel.insertLink', {}, { defaultValue: 'Link' })}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  link
                </span>
              </button>
              <button
                type="button"
                data-mol-id="toolbar-emoji"
                onClick={() => insertAtCursor(':smile:')}
                className="ch-toolbar-btn"
                aria-label={t('channel.insertEmoji', {}, { defaultValue: 'Emoji' })}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  sentiment_satisfied
                </span>
              </button>
              <button
                type="button"
                data-mol-id="toolbar-mention"
                onClick={() => insertAtCursor('@')}
                className="ch-toolbar-btn"
                aria-label={t('channel.mention', {}, { defaultValue: 'Mention' })}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  alternate_email
                </span>
              </button>
              <button
                type="button"
                data-mol-id="toolbar-attach"
                onClick={attachFile}
                className="ch-toolbar-btn"
                style={{ marginLeft: 'auto' }}
                aria-label={t('channel.attachFile', {}, { defaultValue: 'Attach file' })}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  attach_file
                </span>
              </button>
            </div>

            {/* Textarea */}
            <div style={{ padding: '12px' }}>
              <textarea
                data-mol-id="input-message"
                className={cm.cn('ch-textarea h-16 md:h-24')}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder={t(
                  'channel.messagePlaceholder',
                  { name: String(channel.name || '') },
                  { defaultValue: 'Message #{{name}}' },
                )}
                aria-label={t('channel.messageInputLabel', {}, { defaultValue: 'Type a message' })}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontSize: '0.875rem',
                  lineHeight: '1.625',
                  fontFamily: 'Inter, sans-serif',
                  color: 'var(--color-on-surface)',
                  backgroundColor: 'transparent',
                }}
              />
            </div>

            {/* Send Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px' }}>
              <button
                data-mol-id="button-send"
                type="submit"
                className="ch-send-btn"
                disabled={sending || !newMessage.trim()}
                aria-label={t('channel.sendLabel', {}, { defaultValue: 'Send message' })}
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                  lineHeight: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow:
                    '0 10px 15px -3px color-mix(in srgb, var(--color-primary) 20%, transparent)',
                  opacity: !newMessage.trim() || sending ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {sending ? (
                  <span className={cm.spinner({ size: 'sm' })} />
                ) : (
                  <>
                    <span>{t('common.send', {}, { defaultValue: 'Send' })}</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      send
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          <p
            style={{
              fontSize: '10px',
              textAlign: 'center',
              color: 'var(--color-on-surface-variant)',
              marginTop: '12px',
              fontWeight: 500,
              letterSpacing: '-0.025em',
            }}
          >
            <span style={{ fontWeight: 700 }}>
              {t('channel.returnKey', {}, { defaultValue: 'Return' })}
            </span>{' '}
            {t('channel.toSend', {}, { defaultValue: 'to send' })} &bull;{' '}
            <span style={{ fontWeight: 700 }}>
              {t('channel.shiftReturn', {}, { defaultValue: 'Shift + Return' })}
            </span>{' '}
            {t('channel.forNewLine', {}, { defaultValue: 'for new line' })}
          </p>
        </form>
      </div>
    </ChannelChrome>
  )
}
