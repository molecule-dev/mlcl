/**
 * Search across the viewer's messages, contacts, and conversations.
 *
 * The Hush UI is "encrypted on-device" — in production message bodies
 * would be decrypted client-side before search, but for the demo
 * dispatch we run an unindexed scan over the viewer's own decryptable
 * messages so search-from-zero actually returns hits.
 *
 *   GET /api/search?q=...
 *
 * Returns up to 50 hits, mixed across types, sorted by recency.
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { decrypt } from '@molecule/api-encryption'
import { t } from '@molecule/api-i18n'

import {
  decorateContacts,
  decorateConversations,
  type RawContact,
  type RawConversation,
} from './_decorate.js'

const router = Router()

interface SearchHit {
  id: string
  type: 'message' | 'conversation' | 'contact'
  display_text: string
  context: string
  conversation_id: string
  conversation_name: string
  matched_at: string
}

async function safeDecrypt(value: unknown): Promise<string> {
  if (typeof value !== 'string') return String(value ?? '')
  try {
    return String(await decrypt(value))
  } catch (_error) {
    // decryption unavailable — return ciphertext so search still runs over stored text
    return value
  }
}

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  const q = String(req.query.q ?? '')
    .trim()
    .toLowerCase()
  const hits: SearchHit[] = []

  // Find conversations the user participates in.
  const memberships = await findMany<{ conversation_id: string }>('conversation_participants', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 500,
  })
  const convoIds = memberships.map((m) => m.conversation_id).filter(Boolean)

  // Build conversation name index for hits — use the decorator so direct
  // conversation names show the OTHER participant's display name rather
  // than a generic "Direct conversation" label.
  const conversations =
    convoIds.length > 0
      ? await findMany<RawConversation>('conversations', {
          where: [{ field: 'id', operator: 'in', value: convoIds }],
          limit: 500,
        })
      : []
  const decoratedConversations = await decorateConversations(conversations, userId)
  const convoNameById = new Map<string, string>()
  const convoTypeById = new Map<string, string>()
  for (const c of decoratedConversations) {
    convoNameById.set(c.id, c.name)
    convoTypeById.set(c.id, c.type)
  }

  // Conversation hits (by title)
  for (const c of decoratedConversations) {
    const name = c.name
    if (!q || name.toLowerCase().includes(q)) {
      hits.push({
        id: c.id,
        type: 'conversation',
        display_text: name,
        context: c.type === 'group' ? 'Group' : 'Direct message',
        conversation_id: c.id,
        conversation_name: name,
        matched_at: c.last_message_at,
      })
    }
  }

  // Message hits
  if (convoIds.length > 0) {
    const messages = await findMany<{
      id: string
      conversation_id: string
      content: unknown
      created_at: string | Date
    }>('messages', {
      where: [{ field: 'conversation_id', operator: 'in', value: convoIds }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    for (const m of messages) {
      const body = await safeDecrypt(m.content)
      if (!q || body.toLowerCase().includes(q)) {
        const convoName = convoNameById.get(String(m.conversation_id)) ?? 'Conversation'
        hits.push({
          id: String(m.id),
          type: 'message',
          display_text: body.slice(0, 80),
          context: body,
          conversation_id: String(m.conversation_id),
          conversation_name: convoName,
          matched_at: new Date(m.created_at).toISOString(),
        })
        if (hits.length >= 50) break
      }
    }
  }

  // Contact hits. Resolve each contact's shared direct conversation (when
  // one exists) so `conversation_id` is a real conversation id — never the
  // peer's user id.
  const contacts = await findMany<RawContact>('contacts', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 200,
  })
  const directConvoByPeer = new Map<string, string>()
  const directIds = conversations.filter((c) => c.type === 'direct').map((c) => String(c.id))
  if (directIds.length > 0) {
    const parts = await findMany<{ conversation_id: string; user_id: string }>(
      'conversation_participants',
      {
        where: [{ field: 'conversation_id', operator: 'in', value: directIds }],
        limit: directIds.length * 200 + 100,
      },
    )
    for (const p of parts) {
      if (String(p.user_id) === String(userId)) continue
      if (!directConvoByPeer.has(String(p.user_id))) {
        directConvoByPeer.set(String(p.user_id), String(p.conversation_id))
      }
    }
  }
  const decoratedContacts = await decorateContacts(contacts)
  for (const c of decoratedContacts) {
    if (!q || c.name.toLowerCase().includes(q)) {
      hits.push({
        id: c.id,
        type: 'contact',
        display_text: c.name,
        context: c.status ?? '',
        conversation_id: directConvoByPeer.get(String(c.contact_user_id)) ?? '',
        conversation_name: c.name,
        matched_at: c.added_at,
      })
    }
  }

  hits.sort((a, b) => (a.matched_at > b.matched_at ? -1 : 1))
  res.json(hits.slice(0, 50))
})

export default router
