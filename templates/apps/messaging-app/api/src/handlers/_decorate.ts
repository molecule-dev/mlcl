/**
 * Decoration helpers — project raw DB rows into the rich shapes the
 * Hush UI components expect (name, initials, avatar_index, presence,
 * last_message, unread_count, member_count, encrypted, etc.).
 *
 * The DB schema stores only the canonical fields (ids, content,
 * timestamps); the UI is happiest with denormalized "card"-shaped
 * objects. Decorating in one place keeps handlers thin and matches the
 * pattern used by other flagships (podcast, customer-support-chat).
 *
 * @module
 */

import { findMany } from '@molecule/api-database'

export interface RawConversation extends Record<string, unknown> {
  id: string
  type: 'direct' | 'group'
  title: string | null
  group_id: string | null
  created_by: string
  last_message_at: string | Date | null
  last_message_preview: string | null
  last_sender_id: string | null
  is_archived: boolean
  archived_at: string | Date | null
  created_at: string | Date
}

export interface DecoratedConversation {
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
  is_archived: boolean
  archived_at: string | null
  archived: boolean
  /** Linked group id for group conversations (drives the details link). */
  group_id: string | null
  /** The viewer's contact row id for the other participant in a direct conversation. */
  contact_id: string | null
}

export interface RawContact extends Record<string, unknown> {
  id: string
  user_id: string
  contact_user_id: string
  nickname: string | null
  is_blocked: boolean
  created_at: string | Date
}

export interface DecoratedContact {
  id: string
  user_id: string
  contact_user_id: string
  name: string
  initials: string
  avatar_index: number
  presence: 'online' | 'away' | 'offline'
  status: string | null
  phone: string
  safety_number: string
  safety_number_verified: boolean
  blocked: boolean
  disappearing_seconds: number
  shared_media_count: number
  added_at: string
}

export interface RawGroup extends Record<string, unknown> {
  id: string
  owner_id: string
  name: string
  description: string | null
  avatar_url: string | null
  encryption_enabled: boolean
  created_at: string | Date
}

export interface DecoratedGroup {
  id: string
  name: string
  description: string
  member_count: number
  avatar_index: number
  unread_count: number
  encrypted: boolean
  safety_number: string
  disappearing_seconds: number
  shared_media_count: number
  last_active_at: string
  created_at: string
  /** Id of the group's mirror conversation (drives the "Open chat" link). */
  conversation_id: string | null
}

export interface RawMember extends Record<string, unknown> {
  id: string
  group_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string | Date
}

export interface DecoratedMember {
  id: string
  user_id: string
  name: string
  initials: string
  avatar_index: number
  role: 'owner' | 'admin' | 'member'
}

export interface DecoratedMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  body: string
  sent_at: string
  delivered: boolean
  read: boolean
  self: boolean
  reactions: { emoji: string; count: number }[]
  type: string
  media_id: string | null
  reply_to_message_id: string | null
}

const PRESENCE_STATES: Array<'online' | 'away' | 'offline'> = ['online', 'away', 'offline']

/**
 * Stable hash of a string into a non-negative integer. Used to derive
 * deterministic avatar indices and presence buckets per user/group so
 * the UI is consistent across reloads (no random flicker).
 */
function stableHash(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '??').toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

function presenceFor(
  userId: string,
  lastSeenAt: string | Date | null,
): 'online' | 'away' | 'offline' {
  if (!lastSeenAt) return PRESENCE_STATES[stableHash(userId) % 3] ?? 'offline'
  const ageMin = (Date.now() - new Date(lastSeenAt).getTime()) / 60000
  if (ageMin < 5) return 'online'
  if (ageMin < 60) return 'away'
  return 'offline'
}

function safetyNumberFor(userId: string, otherId?: string): string {
  // 12 groups of 5 digits — deterministic per (userId, otherId) pair.
  const seed = stableHash(userId + (otherId ?? ''))
  const digits = []
  let cur = seed
  for (let i = 0; i < 60; i++) {
    cur = (cur * 1103515245 + 12345) & 0x7fffffff
    digits.push(String(cur % 10))
  }
  const groups: string[] = []
  for (let i = 0; i < 12; i++) groups.push(digits.slice(i * 5, i * 5 + 5).join(''))
  return groups.join(' ')
}

function phoneFor(userId: string): string {
  const seed = stableHash(userId + ':phone')
  const area = 200 + (seed % 800)
  const exch = 200 + ((seed >> 4) % 800)
  const line = 1000 + ((seed >> 8) % 9000)
  return `+1 (${area}) ${exch}-${line}`
}

interface UserRow {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  status_text: string | null
  last_seen_at: string | Date | null
}

async function loadUsers(ids: string[]): Promise<Map<string, UserRow>> {
  const map = new Map<string, UserRow>()
  if (ids.length === 0) return map
  const unique = [...new Set(ids.filter(Boolean))]
  const rows = await findMany<UserRow>('users', {
    where: [{ field: 'id', operator: 'in', value: unique }],
    limit: unique.length + 10,
  })
  for (const r of rows) map.set(String(r.id), r)
  return map
}

function userDisplayName(user: UserRow | undefined, fallback: string): string {
  if (!user) return fallback
  if (user.name && user.name.trim()) return user.name
  if (user.email) return String(user.email).split('@')[0] ?? 'Someone'
  return fallback
}

/**
 * Decorate a conversations list for the inbox view. For direct
 * conversations the "name" is the OTHER participant's display name; for
 * groups it's the conversation.title (or the linked group's name).
 */
export async function decorateConversations(
  rows: RawConversation[],
  viewerId: string,
): Promise<DecoratedConversation[]> {
  if (rows.length === 0) return []

  const convoIds = rows.map((r) => r.id)
  const allParticipants = await findMany<{
    id: string
    conversation_id: string
    user_id: string
    last_read_at: string | Date | null
    is_muted: boolean
    unread_count: number
  }>('conversation_participants', {
    where: [{ field: 'conversation_id', operator: 'in', value: convoIds }],
    limit: convoIds.length * 200 + 100,
  })

  const participantsByConvo = new Map<string, typeof allParticipants>()
  for (const p of allParticipants) {
    const list = participantsByConvo.get(p.conversation_id) ?? []
    list.push(p)
    participantsByConvo.set(p.conversation_id, list)
  }

  const otherUserIds = new Set<string>()
  for (const r of rows) {
    const parts = participantsByConvo.get(r.id) ?? []
    for (const p of parts) {
      if (String(p.user_id) !== String(viewerId)) otherUserIds.add(String(p.user_id))
    }
  }
  const userMap = await loadUsers([...otherUserIds])

  // Map other-participant user ids to the viewer's contact row ids so
  // direct conversations can link to the contact detail page.
  const viewerContacts =
    otherUserIds.size > 0
      ? await findMany<{ id: string; contact_user_id: string }>('contacts', {
          where: [
            { field: 'user_id', operator: '=', value: viewerId },
            { field: 'contact_user_id', operator: 'in', value: [...otherUserIds] },
          ],
          limit: otherUserIds.size + 10,
        })
      : []
  const contactIdByUser = new Map<string, string>()
  for (const c of viewerContacts) contactIdByUser.set(String(c.contact_user_id), String(c.id))

  const groupIds = rows.map((r) => r.group_id).filter((g): g is string => Boolean(g))
  const groups =
    groupIds.length > 0
      ? await findMany<{ id: string; name: string; encryption_enabled: boolean }>('groups', {
          where: [{ field: 'id', operator: 'in', value: groupIds }],
          limit: groupIds.length + 10,
        })
      : []
  const groupMap = new Map<string, { id: string; name: string; encryption_enabled: boolean }>()
  for (const g of groups) groupMap.set(String(g.id), g)

  return rows.map((r) => {
    const parts = participantsByConvo.get(r.id) ?? []
    const myMembership = parts.find((p) => String(p.user_id) === String(viewerId))
    const others = parts.filter((p) => String(p.user_id) !== String(viewerId))

    let name: string
    let initials: string
    let avatarSeed: string
    let presence: 'online' | 'away' | 'offline' = 'offline'
    let memberCount: number | null = null
    let encrypted = true
    let verified = false
    let contactId: string | null = null

    if (r.type === 'group' || r.group_id) {
      const g = r.group_id ? groupMap.get(r.group_id) : undefined
      name = r.title ?? g?.name ?? 'Group'
      initials = initialsFor(name)
      avatarSeed = r.id
      memberCount = parts.length
      encrypted = g?.encryption_enabled ?? true
    } else {
      const otherId = others[0] ? String(others[0].user_id) : ''
      const u = otherId ? userMap.get(otherId) : undefined
      name = u ? userDisplayName(u, 'Direct chat') : (r.title ?? 'Direct chat')
      initials = initialsFor(name)
      avatarSeed = otherId || r.id
      presence = u ? presenceFor(otherId, u.last_seen_at) : 'offline'
      verified = otherId ? stableHash(otherId + ':verified') % 3 === 0 : false
      contactId = otherId ? (contactIdByUser.get(otherId) ?? null) : null
    }

    const lastMessageAt = r.last_message_at
      ? new Date(r.last_message_at).toISOString()
      : new Date(r.created_at).toISOString()

    return {
      id: r.id,
      type: r.type,
      name,
      initials,
      avatar_index: stableHash(avatarSeed) % 6,
      last_message: r.last_message_preview ?? '',
      last_message_at: lastMessageAt,
      last_message_self: String(r.last_sender_id ?? '') === String(viewerId),
      unread_count: myMembership?.unread_count ?? 0,
      presence,
      muted: myMembership?.is_muted ?? false,
      encrypted,
      member_count: memberCount,
      safety_number_verified: verified,
      disappearing_seconds: 0,
      is_archived: r.is_archived,
      archived_at: r.archived_at ? new Date(r.archived_at).toISOString() : null,
      archived: r.is_archived,
      group_id: r.group_id ?? null,
      contact_id: contactId,
    }
  })
}

export async function decorateConversation(
  row: RawConversation,
  viewerId: string,
): Promise<DecoratedConversation> {
  const [d] = await decorateConversations([row], viewerId)
  // safe: decorateConversations on a single non-empty input always yields one row
  return d!
}

/**
 * Decorate a contacts list. The viewer's own contact rows include
 * pointers to other users — we hydrate those user rows for display.
 */
export async function decorateContacts(rows: RawContact[]): Promise<DecoratedContact[]> {
  if (rows.length === 0) return []
  const otherIds = rows.map((r) => String(r.contact_user_id))
  const userMap = await loadUsers(otherIds)
  return rows.map((r) => {
    const u = userMap.get(String(r.contact_user_id))
    const name = r.nickname ?? userDisplayName(u, 'Contact')
    const otherId = String(r.contact_user_id)
    return {
      id: r.id,
      user_id: String(r.user_id),
      contact_user_id: otherId,
      name,
      initials: initialsFor(name),
      avatar_index: stableHash(otherId) % 6,
      presence: u ? presenceFor(otherId, u.last_seen_at) : 'offline',
      status: u?.status_text ?? null,
      phone: u?.phone ?? phoneFor(otherId),
      safety_number: safetyNumberFor(String(r.user_id), otherId),
      safety_number_verified: stableHash(otherId + ':verified') % 3 === 0,
      blocked: r.is_blocked,
      disappearing_seconds: 0,
      shared_media_count: stableHash(otherId + ':media') % 50,
      added_at: new Date(r.created_at).toISOString(),
    }
  })
}

export async function decorateGroups(rows: RawGroup[]): Promise<DecoratedGroup[]> {
  if (rows.length === 0) return []
  const ids = rows.map((r) => String(r.id))
  const allMembers = await findMany<{ group_id: string }>('group_members', {
    where: [{ field: 'group_id', operator: 'in', value: ids }],
    limit: ids.length * 200 + 100,
  })
  const memberCount = new Map<string, number>()
  for (const m of allMembers) {
    memberCount.set(String(m.group_id), (memberCount.get(String(m.group_id)) ?? 0) + 1)
  }
  // Every group is mirrored as a conversation (group_id set) — resolve the
  // mirror ids so the UI can link straight into the group's chat.
  const mirrors = await findMany<{ id: string; group_id: string }>('conversations', {
    where: [{ field: 'group_id', operator: 'in', value: ids }],
    limit: ids.length + 10,
  })
  const conversationIdByGroup = new Map<string, string>()
  for (const c of mirrors) conversationIdByGroup.set(String(c.group_id), String(c.id))
  return rows.map((r) => ({
    id: String(r.id),
    name: r.name,
    description: r.description ?? '',
    member_count: memberCount.get(String(r.id)) ?? 0,
    avatar_index: stableHash(String(r.id)) % 6,
    unread_count: 0,
    encrypted: r.encryption_enabled,
    safety_number: safetyNumberFor(String(r.owner_id), String(r.id)),
    disappearing_seconds: 0,
    shared_media_count: stableHash(String(r.id) + ':media') % 50,
    last_active_at: new Date(r.created_at).toISOString(),
    created_at: new Date(r.created_at).toISOString(),
    conversation_id: conversationIdByGroup.get(String(r.id)) ?? null,
  }))
}

export async function decorateGroup(row: RawGroup): Promise<DecoratedGroup> {
  const [d] = await decorateGroups([row])
  return d!
}

export async function decorateGroupMembers(rows: RawMember[]): Promise<DecoratedMember[]> {
  if (rows.length === 0) return []
  const userIds = rows.map((r) => String(r.user_id))
  const userMap = await loadUsers(userIds)
  return rows.map((r) => {
    const u = userMap.get(String(r.user_id))
    const name = userDisplayName(u, 'Member')
    return {
      id: String(r.id),
      user_id: String(r.user_id),
      name,
      initials: initialsFor(name),
      avatar_index: stableHash(String(r.user_id)) % 6,
      role: r.role,
    }
  })
}

interface RawMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: unknown
  type: string
  media_id: string | null
  reply_to_message_id: string | null
  created_at: string | Date
  is_edited?: boolean
  edited_at?: string | Date | null
}

export async function decorateMessages(
  rows: RawMessage[],
  viewerId: string,
  decryptOne: (raw: unknown) => Promise<unknown>,
): Promise<DecoratedMessage[]> {
  if (rows.length === 0) return []
  const senderIds = rows.map((r) => String(r.sender_id))
  const userMap = await loadUsers(senderIds)
  const messageIds = rows.map((r) => String(r.id))
  const reactions =
    messageIds.length > 0
      ? await findMany<{ message_id: string; emoji: string }>('reactions', {
          where: [{ field: 'message_id', operator: 'in', value: messageIds }],
          limit: messageIds.length * 50 + 100,
        })
      : []
  const reactionsByMsg = new Map<string, Map<string, number>>()
  for (const r of reactions) {
    const map = reactionsByMsg.get(String(r.message_id)) ?? new Map<string, number>()
    map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1)
    reactionsByMsg.set(String(r.message_id), map)
  }
  const receipts =
    messageIds.length > 0
      ? await findMany<{ message_id: string; user_id: string; status: string }>(
          'message_receipts',
          {
            where: [{ field: 'message_id', operator: 'in', value: messageIds }],
            limit: messageIds.length * 20 + 100,
          },
        )
      : []
  const receiptByMsg = new Map<string, { delivered: boolean; read: boolean }>()
  for (const r of receipts) {
    if (String(r.user_id) === String(viewerId)) continue
    const cur = receiptByMsg.get(String(r.message_id)) ?? { delivered: false, read: false }
    if (r.status === 'delivered') cur.delivered = true
    if (r.status === 'read') {
      cur.delivered = true
      cur.read = true
    }
    receiptByMsg.set(String(r.message_id), cur)
  }

  return Promise.all(
    rows.map(async (m) => {
      const u = userMap.get(String(m.sender_id))
      const senderName = userDisplayName(u, 'Someone')
      const body = await decryptOne(m.content)
      const reactionMap = reactionsByMsg.get(String(m.id))
      const reactionList = reactionMap
        ? [...reactionMap.entries()].map(([emoji, count]) => ({ emoji, count }))
        : []
      const receipt = receiptByMsg.get(String(m.id)) ?? { delivered: false, read: false }
      return {
        id: String(m.id),
        conversation_id: String(m.conversation_id),
        sender_id: String(m.sender_id),
        sender_name: senderName,
        body: typeof body === 'string' ? body : String(body ?? ''),
        sent_at: new Date(m.created_at).toISOString(),
        delivered: receipt.delivered || String(m.sender_id) === String(viewerId),
        read: receipt.read,
        self: String(m.sender_id) === String(viewerId),
        reactions: reactionList,
        type: m.type,
        media_id: m.media_id,
        reply_to_message_id: m.reply_to_message_id,
      }
    }),
  )
}
