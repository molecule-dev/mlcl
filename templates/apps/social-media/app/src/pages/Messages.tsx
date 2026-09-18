import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { useConversations, useThreadMessages } from '../lib/api.js'
import { fmtRelativeShort, vividGradient } from '../lib/sample-feed.js'

export function Messages() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [params] = useSearchParams()
  const initialThread = params.get('thread')
  const { data: conversations, loading: convosLoading, refetch: refetchConvos } = useConversations()
  const [activeId, setActiveId] = useState<string | null>(initialThread)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (!activeId && conversations && conversations.length > 0) {
      setActiveId(conversations[0].id)
    }
  }, [activeId, conversations])

  const active = useMemo(
    () => (conversations ?? []).find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  )
  const { data: messages, refetch: refetchMessages } = useThreadMessages(activeId)

  const sendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!activeId || !draft.trim()) return
      setSending(true)
      try {
        await http.post(`/messages/threads/${activeId}/messages`, { content: draft.trim() })
        setDraft('')
        await Promise.all([refetchMessages(), refetchConvos()])
      } catch (err) {
        logError('messages.sendMessage', err)
      } finally {
        setSending(false)
      }
    },
    [activeId, draft, http, refetchMessages, refetchConvos],
  )

  const filteredConvos = (conversations ?? []).filter((c) => {
    if (!filter.trim()) return true
    const q = filter.trim().toLowerCase()
    return c.with.display_name.toLowerCase().includes(q) || c.with.handle.toLowerCase().includes(q)
  })

  return (
    <div className={cm.cn(cm.sp('p', 6), cm.sp('py', 8), 'lg:px-10 mx-auto w-full max-w-7xl')}>
      <header className={cm.cn(cm.sp('mb', 6))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('nav.inbox', {}, { defaultValue: 'Inbox' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight md:text-4xl mt-1')}>
          {t('nav.messages', {}, { defaultValue: 'Messages' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
          {convosLoading
            ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
            : t(
                'messages.subheading',
                { count: (conversations ?? []).length },
                { defaultValue: '{{count}} conversations.' },
              )}
        </p>
      </header>

      <div
        className={cm.cn(
          'grid grid-cols-1 lg:grid-cols-12 gap-6 bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden min-h-[640px]',
        )}
      >
        <aside className={cm.cn('lg:col-span-4 border-r border-outline-variant/40')}>
          <div
            className={cm.cn(
              cm.sp('p', 4),
              cm.flex({ align: 'center', gap: 'sm' }),
              'border-b border-outline-variant/40',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-on-surface-variant text-[20px]')}
            >
              search
            </span>
            <input
              type="search"
              data-testid="threads-search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t(
                'messages.searchPlaceholder',
                {},
                { defaultValue: 'Search conversations…' },
              )}
              className={cm.cn(
                cm.flex1,
                cm.sp('p', 0),
                cm.textSize('sm'),
                'bg-transparent border-none focus:ring-0 outline-none placeholder:text-on-surface-variant',
              )}
            />
          </div>
          <ul
            data-testid="threads-list"
            className={cm.cn('divide-y divide-outline-variant/40 max-h-[640px] overflow-y-auto')}
          >
            {filteredConvos.length === 0 && (
              <li
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.textCenter,
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
              >
                {convosLoading
                  ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                  : t(
                      'messages.noConversations',
                      {},
                      { defaultValue: 'No conversations yet — visit a profile and message them.' },
                    )}
              </li>
            )}
            {filteredConvos.map((conv) => {
              const isActive = conv.id === activeId
              const cover = vividGradient(conv.with.cover_index)
              return (
                <li key={conv.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(conv.id)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.flex({ align: 'center', gap: 'sm' }),
                      'w-full text-left transition-colors',
                      isActive ? 'bg-primary/10' : 'hover:bg-surface-container-low',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'inline-flex shrink-0 w-12 h-12 rounded-full items-center justify-center text-white font-extrabold shadow-sm',
                      )}
                      style={{ background: cover }}
                      aria-hidden="true"
                    >
                      {conv.with.display_name.charAt(0)}
                    </span>
                    <div className={cm.cn('flex-1 min-w-0')}>
                      <p className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                        <span
                          className={cm.cn(
                            cm.fontWeight('semibold'),
                            cm.textSize('sm'),
                            'truncate',
                          )}
                        >
                          @{conv.with.handle}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant tabular-nums',
                          )}
                        >
                          {fmtRelativeShort(conv.last_message_at)}
                        </span>
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                        {conv.last_message_by === 'me'
                          ? `${t('messages.youPrefix', {}, { defaultValue: 'You: ' })}${conv.last_message}`
                          : conv.last_message}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <section className={cm.cn('lg:col-span-8 flex flex-col')}>
          {!active ? (
            <div
              className={cm.cn(
                'flex-1 flex items-center justify-center text-on-surface-variant text-sm',
              )}
            >
              {t(
                'messages.empty',
                {},
                { defaultValue: 'Select a conversation to start chatting.' },
              )}
            </div>
          ) : (
            <>
              <header
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 4),
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'border-b border-outline-variant/40',
                )}
              >
                <span
                  className={cm.cn(
                    'inline-flex w-10 h-10 rounded-full items-center justify-center text-white font-extrabold shadow-sm',
                  )}
                  style={{ background: vividGradient(active.with.cover_index) }}
                  aria-hidden="true"
                >
                  {active.with.display_name.charAt(0)}
                </span>
                <div>
                  <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                    {active.with.display_name}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    @{active.with.handle}
                  </p>
                </div>
              </header>

              <ul
                data-testid="messages-list"
                className={cm.cn(
                  cm.flex1,
                  cm.sp('p', 5),
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  'overflow-y-auto',
                )}
              >
                {(messages ?? []).length === 0 && (
                  <li
                    className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}
                  >
                    {t('messages.noMessages', {}, { defaultValue: 'No messages yet — say hi!' })}
                  </li>
                )}
                {(messages ?? []).map((m) => (
                  <li
                    key={m.id}
                    className={cm.cn(
                      'max-w-[70%] rounded-2xl px-4 py-2 text-sm leading-relaxed',
                      m.from_me
                        ? 'self-end bg-primary text-on-primary'
                        : 'self-start bg-surface-container border border-outline-variant/40',
                    )}
                  >
                    {m.content}
                    <div className={cm.cn(cm.textSize('xs'), 'opacity-70 mt-1 tabular-nums')}>
                      {fmtRelativeShort(m.sent_at)}
                    </div>
                  </li>
                ))}
              </ul>

              <form
                onSubmit={sendMessage}
                className={cm.cn(
                  cm.sp('p', 4),
                  cm.flex({ align: 'center', gap: 'sm' }),
                  'border-t border-outline-variant/40',
                )}
              >
                <input
                  type="text"
                  value={draft}
                  data-testid="message-input"
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t(
                    'messages.composePlaceholder',
                    {},
                    { defaultValue: 'Send a message…' },
                  )}
                  className={cm.cn(
                    cm.flex1,
                    cm.sp('p', 2),
                    cm.textSize('sm'),
                    'bg-surface-container border border-outline-variant rounded-full px-4 focus:outline-none focus:ring-2 focus:ring-primary',
                  )}
                />
                <button
                  type="submit"
                  data-testid="message-submit"
                  disabled={sending || !draft.trim()}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'rounded-full bg-primary text-on-primary text-sm font-bold disabled:bg-surface-container-high disabled:text-on-surface-variant',
                  )}
                >
                  {sending
                    ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
                    : t('common.send', {}, { defaultValue: 'Send' })}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
