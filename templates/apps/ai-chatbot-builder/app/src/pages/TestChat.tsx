/**
 * Test-chat page: wraps the @molecule/app-chatbot-tester-react sandbox
 * with the app-local SideNavBar + TestChatTopBar + TestChatBotConfigPanel.
 *
 * Owns the per-app transport: GET /api/bots to populate the picker,
 * POST /api/conversations to spin up a fresh test conversation, POST
 * /api/conversations/:id/messages to send.
 */
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { ChatbotTester, type TesterMessage } from '@molecule/app-chatbot-tester-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import SideNavBar from '../components/SideNavBar.js'
import TestChatBotConfigPanel from '../components/TestChatBotConfigPanel.js'
import TestChatTopBar from '../components/TestChatTopBar.js'

interface BotSummary {
  id: string
  name?: string
}

interface ConversationWithMessages {
  id: string
  messages?: Array<{ id: string | number; role: string; content: string; created_at?: string }>
}

function timestamp(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// http.* returns HttpResponse<T> with the API body in `.data`.
// `asArray` / `asObject` unwrap that double-layer (HttpResponse →
// possibly { data: [...] }) so call sites stay short.
function asArray<T>(res: unknown): T[] {
  const body = (res as { data?: unknown })?.data ?? res
  if (Array.isArray(body)) return body as T[]
  if (body && Array.isArray((body as { data?: unknown }).data)) {
    return (body as { data: T[] }).data
  }
  return []
}

function asObject<T>(res: unknown): T | null {
  const body = (res as { data?: unknown })?.data ?? res
  if (body && typeof body === 'object' && !Array.isArray(body)) return body as T
  return null
}

function TestChat() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [searchParams] = useSearchParams()
  // Deep links (e.g. the editor's "Test" button) pass ?botId=… to
  // preselect that bot instead of defaulting to the first one.
  const requestedBotId = searchParams.get('botId')

  const [bots, setBots] = useState<BotSummary[]>([])
  const [botId, setBotId] = useState<string | undefined>(undefined)
  const [conversationId, setConversationId] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<TesterMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const startedFor = useRef<string | null>(null)

  const botName = bots.find((b) => b.id === botId)?.name

  // Load bots once.
  useEffect(() => {
    let active = true
    http
      .get('/api/bots')
      .then((res) => {
        if (!active) return
        const list = asArray<BotSummary>(res)
        setBots(list)
        const preferred =
          requestedBotId && list.some((b) => String(b.id) === requestedBotId)
            ? requestedBotId
            : list[0]?.id
        if (preferred) setBotId(preferred)
        else setLoading(false)
      })
      .catch(
        (err) =>
          active &&
          setError(
            err instanceof Error
              ? err.message
              : t('testChat.botsLoadError', {}, { defaultValue: 'Could not load your bots.' }),
          ),
      )
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  // Start a fresh test conversation whenever bot changes.
  useEffect(() => {
    if (!botId || startedFor.current === botId) return
    startedFor.current = botId
    let active = true
    setLoading(true)
    setMessages([])
    setError(null)
    http
      .post('/api/conversations', { bot_id: botId, visitor_name: 'Owner Test' })
      .then(async (res) => {
        const conv = asObject<ConversationWithMessages>(res)
        if (!active || !conv?.id) return
        setConversationId(conv.id)
        void track({
          name: 'testchat.conversation_started',
          properties: { conversation_id: conv.id, bot_id: botId },
        })
        // Re-hydrate (so welcome message shows).
        const fullRes = await http.get(`/api/conversations/${conv.id}`)
        if (!active) return
        const full = asObject<ConversationWithMessages>(fullRes)
        setMessages(
          (full?.messages ?? []).map((m) => ({
            id: m.id,
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
            timestamp: timestamp(),
          })),
        )
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof Error
            ? err.message
            : t(
                'testChat.startError',
                {},
                { defaultValue: 'Could not start a test conversation.' },
              ),
        )
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [botId, http, t])

  async function handleSend(text: string): Promise<void> {
    if (!conversationId) return
    const userMsg: TesterMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: timestamp(),
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)
    setError(null)
    try {
      const res = await http.post(`/api/conversations/${conversationId}/messages`, {
        content: text,
      })
      const reply = asObject<{ id: string | number; content?: string; role?: string }>(res)
      if (reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: reply.id ?? `assistant-${Date.now()}`,
            role: 'assistant',
            content: reply.content ?? '',
            timestamp: timestamp(),
          },
        ])
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('testChat.sendError', {}, { defaultValue: 'Could not get a response.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cm.cn('bg-surface text-on-surface min-h-screen flex overflow-hidden')}
      aria-label={t('testChat.pageLabel', {}, { defaultValue: 'Test chat with bot' })}
    >
      <SideNavBar />
      <main className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0')}>
        <TestChatTopBar botName={botName} botId={botId} />
        <section className={cm.cn(cm.flex(), cm.flex1, 'overflow-hidden')}>
          {/*
            No-bots empty state: a bare chat box with nothing in it reads as
            broken — point the builder at creating their first bot instead.
          */}
          {!loading && bots.length === 0 && !error ? (
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
                cm.flex1,
                cm.stack(4),
                cm.sp('p', 8),
                'text-center',
              )}
            >
              <div
                className={cm.cn(
                  cm.w(16),
                  cm.h(16),
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                  'bg-primary/10',
                )}
                aria-hidden="true"
              >
                <span
                  className={cm.cn(cm.textSize('3xl'), 'material-symbols-outlined text-primary')}
                  data-icon="smart_toy"
                >
                  smart_toy
                </span>
              </div>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t('testChat.emptyTitle', {}, { defaultValue: 'No bots to test yet' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-sm')}>
                {t(
                  'testChat.emptyBody',
                  {},
                  {
                    defaultValue:
                      'Create your first bot, then come back here to try it out in a sandboxed chat.',
                  },
                )}
              </p>
              <Link
                to="/bots/new"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'bg-primary text-on-primary shadow-md hover:opacity-90 transition-opacity',
                )}
              >
                {t('botsList.createBot', {}, { defaultValue: 'Create Bot' })}
              </Link>
            </div>
          ) : (
            <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'bg-surface relative')}>
              <ChatbotTester
                messages={messages}
                loading={loading}
                onSend={handleSend}
                bots={bots}
                botId={botId}
                onBotChange={(id) => {
                  startedFor.current = null
                  setConversationId(undefined)
                  setBotId(id)
                }}
                error={error}
                botPickerLabel={t('testChat.botPickerLabel', {}, { defaultValue: 'Test bot' })}
              />
            </div>
          )}
          <TestChatBotConfigPanel />
        </section>
      </main>
    </div>
  )
}

export default TestChat
export { TestChat, TestChat as TestChatPage }
