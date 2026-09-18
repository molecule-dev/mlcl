/**
 * AI reply generation for the customer service bot.
 *
 * Loads conversation history, the operator's user_settings (bot tone +
 * greeting + signature), and the operator's published knowledge articles,
 * then asks the bonded AI provider for a reply. Persists the reply as a
 * `messages` row with `sender='bot'` / `role='assistant'` and bumps the
 * parent conversation's counters.
 *
 * Returns the persisted message row plus a flag that lets callers
 * distinguish a real model reply from the deterministic fallback we use
 * when no AI provider is bonded (or the call fails) — that fallback keeps
 * the operator UX functional even without API keys, which matters for
 * smoke tests and offline development.
 */
import {
  type ChatEvent,
  type ChatMessage,
  getProviderByName,
  hasProvider,
  requireProvider,
} from '@molecule/api-ai'
import { create, findMany, findOne, updateById } from '@molecule/api-database'

const MAX_KNOWLEDGE_CHARS = 6000
const MAX_HISTORY_MESSAGES = 20
const FALLBACK_MAX_CHARS = 600

interface MessageRow {
  id: string
  conversation_id: string
  sender: string
  role: string
  content: string
  created_at: string
}

interface ConversationRow {
  id: string
  owner_id: string
  customer_name: string | null
  message_count: number | string
}

interface KnowledgeRow {
  id: string
  title: string
  content?: string | null
  body_md?: string | null
  status?: string | null
  category?: string | null
}

interface SettingsRow {
  bot_tone?: string | null
  greeting?: string | null
  signature?: string | null
  auto_escalate?: boolean | null
}

export interface AiReplyResult {
  message: Record<string, unknown>
  source: 'model' | 'fallback'
  modelError?: string
}

function buildSystemPrompt(opts: {
  tone: string
  greeting: string
  signature: string
  customerName: string
  knowledge: KnowledgeRow[]
}): string {
  const { tone, greeting, signature, customerName, knowledge } = opts
  const knowledgeBlock = knowledge.length
    ? knowledge
        .map((article) => {
          const body = (article.body_md ?? article.content ?? '').trim()
          return `### ${article.title}\n${body}`.slice(0, 1500)
        })
        .join('\n\n')
        .slice(0, MAX_KNOWLEDGE_CHARS)
    : 'No knowledge articles are available yet — answer from general knowledge and offer to escalate when unsure.'

  const tonePhrase: Record<string, string> = {
    warm: 'Warm, friendly, and reassuring — like a trusted concierge.',
    brief: 'Brief and direct — short, to-the-point replies with no filler.',
    formal: 'Polite, precise, and professional, as in formal business correspondence.',
    casual: 'Relaxed, conversational, and lightly informal — never sloppy.',
    technical: 'Direct and detail-oriented, prioritizing accuracy over friendliness.',
  }

  return [
    'You are an AI customer-service bot answering on behalf of the operator.',
    `Tone: ${tonePhrase[tone] ?? tonePhrase.warm}`,
    greeting ? `Custom greeting (use only for the very first reply in a thread): ${greeting}` : '',
    signature ? `Always sign off with: ${signature}` : '',
    `Customer name: ${customerName}.`,
    'Reply in 1–3 short paragraphs. Cite knowledge articles by title when you use them.',
    'If the question is outside the knowledge base or appears to need a human, end your reply with the literal token [ESCALATE] on its own line so the operator can route the conversation.',
    '',
    'Knowledge base:',
    knowledgeBlock,
  ]
    .filter(Boolean)
    .join('\n')
}

function buildHistory(messages: MessageRow[]): ChatMessage[] {
  const trimmed = messages.slice(-MAX_HISTORY_MESSAGES).map((msg): ChatMessage => ({
    role: msg.sender === 'customer' ? 'user' : 'assistant',
    content: msg.content,
  }))

  // Anthropic (and most chat APIs) refuse to generate when the last message
  // is from the assistant — that's an "assistant prefill" pattern they don't
  // support. When the operator hits "Bot reply" after a previous bot reply
  // (e.g., to draft a follow-up), append a neutral user nudge so the model
  // has something to respond to.
  if (trimmed.length === 0 || trimmed[trimmed.length - 1].role !== 'user') {
    trimmed.push({
      role: 'user',
      content: 'Please continue the conversation with a helpful follow-up reply.',
    })
  }

  return trimmed
}

function fallbackReply(opts: {
  customerName: string
  greeting: string
  signature: string
  lastCustomerMessage: string
}): string {
  const { customerName, greeting, signature, lastCustomerMessage } = opts
  const intro = greeting?.trim()
    ? greeting.trim()
    : `Hi ${customerName.split(/\s+/)[0] ?? customerName}, thanks for reaching out!`
  const ack = lastCustomerMessage
    ? `I read your message: “${lastCustomerMessage.slice(0, 160)}${lastCustomerMessage.length > 160 ? '…' : ''}” — let me look into that for you.`
    : 'I saw your message and I am looking into it now.'
  const close = "I'll route this to a teammate so we can follow up shortly."
  const sig = signature?.trim() ? `\n\n${signature.trim()}` : ''
  return `${intro}\n\n${ack} ${close}${sig}`.slice(0, FALLBACK_MAX_CHARS)
}

export async function generateAiReply(opts: {
  conversation: ConversationRow
  ownerId: string
}): Promise<AiReplyResult> {
  const { conversation, ownerId } = opts

  const messages = await findMany<MessageRow>('messages', {
    where: [{ field: 'conversation_id', operator: '=', value: conversation.id }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
  })
  const history = buildHistory(messages)
  const lastCustomerMessage =
    [...messages].reverse().find((m) => m.sender === 'customer')?.content ?? ''

  const knowledge = await findMany<KnowledgeRow>('knowledge_articles', {
    where: [
      { field: 'owner_id', operator: '=', value: ownerId },
      { field: 'status', operator: '=', value: 'published' },
    ],
    orderBy: [{ field: 'updated_at', direction: 'desc' }],
    limit: 8,
  })

  const settings = await findOne<SettingsRow>('user_settings', [
    { field: 'user_id', operator: '=', value: ownerId },
  ])

  const tone = settings?.bot_tone ?? 'warm'
  const greeting = settings?.greeting ?? ''
  const signature = settings?.signature ?? ''
  const customerName = conversation.customer_name ?? 'Customer'

  const system = buildSystemPrompt({ tone, greeting, signature, customerName, knowledge })
  const messagesForModel: ChatMessage[] = history.length
    ? history
    : [{ role: 'user', content: 'Please introduce yourself briefly.' }]

  let outputText = ''
  let modelError: string | undefined
  let source: 'model' | 'fallback' = 'fallback'

  if (hasProvider('anthropic') || hasProvider()) {
    const provider = getProviderByName('anthropic') ?? requireProvider()
    try {
      for await (const event of provider.chat({
        system,
        messages: messagesForModel,
        maxTokens: 600,
        temperature: 0.4,
      }) as AsyncIterable<ChatEvent>) {
        if (event.type === 'text') outputText += event.content
        else if (event.type === 'error') {
          modelError = event.message
          break
        }
      }
      if (!modelError && outputText.trim()) source = 'model'
    } catch (err) {
      modelError = err instanceof Error ? err.message : String(err)
    }
  } else {
    modelError = 'no AI provider bonded'
  }

  if (source !== 'model') {
    outputText = fallbackReply({ customerName, greeting, signature, lastCustomerMessage })
  }

  // Honor the operator's auto_escalate setting (stored per-user, default on). Always strip the
  // model's [ESCALATE] marker from the visible reply, but only act on it (flip the conversation to
  // escalated + open an escalation) when auto-escalation is enabled — turning the toggle off
  // previously did nothing because this branch never read the setting.
  const autoEscalate = settings?.auto_escalate !== false
  const escalateRequested = autoEscalate && /\[ESCALATE\]\s*$/i.test(outputText.trim())
  const cleanContent = outputText.replace(/\s*\[ESCALATE\]\s*$/i, '').trim()

  const now = new Date().toISOString()
  const created = await create('messages', {
    conversation_id: conversation.id,
    sender: 'bot',
    role: 'assistant',
    content: cleanContent || 'Sorry, I had trouble drafting a reply. Escalating to a teammate.',
    created_at: now,
  })

  const newCount = (Number(conversation.message_count) || 0) + 1
  const updates: Record<string, unknown> = {
    message_count: newCount,
    last_message_at: now,
    updated_at: now,
  }
  if (escalateRequested) {
    updates.escalated = true
    updates.status = 'escalated'
  }
  await updateById('conversations', conversation.id, updates)

  if (escalateRequested) {
    await create('escalations', {
      owner_id: ownerId,
      conversation_id: conversation.id,
      requested_at: now,
      summary: 'Auto-escalated by bot — confidence low or out of scope.',
      created_at: now,
    })
  }

  return {
    message: created.data as Record<string, unknown>,
    source,
    modelError,
  }
}
