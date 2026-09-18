/**
 * Authorization helpers for messaging-app.
 *
 * Conversation- and group-scoped resources are reachable only by participants
 * (for conversations) or members (for groups). These helpers wrap raw row
 * lookups with the participant/member-ship check and return discriminated
 * results so handlers can branch on 404 vs. 403 without leaking existence
 * information. We standardise on 404-for-non-participant so attackers cannot
 * probe conversation existence.
 */

import { count, findById, findMany } from '@molecule/api-database'

export type AuthzResult<T> = { ok: true; row: T } | { ok: false; status: 404 }

export async function requireConversationParticipant<
  T extends Record<string, unknown> = Record<string, unknown>,
>(conversationId: string, userId: string): Promise<AuthzResult<T>> {
  const convo = await findById<T>('conversations', conversationId)
  if (!convo) return { ok: false, status: 404 }
  const participants = await findMany<{ user_id: unknown }>('conversation_participants', {
    where: [
      { field: 'conversation_id', operator: '=', value: conversationId },
      { field: 'user_id', operator: '=', value: userId },
    ],
    limit: 1,
  })
  if (participants.length === 0) return { ok: false, status: 404 }
  return { ok: true, row: convo }
}

export async function requireGroupMembership<
  T extends Record<string, unknown> = Record<string, unknown>,
>(groupId: string, userId: string): Promise<AuthzResult<T> & { role?: string }> {
  const group = await findById<T>('groups', groupId)
  if (!group) return { ok: false, status: 404 }
  const members = await findMany<{ role: string }>('group_members', {
    where: [
      { field: 'group_id', operator: '=', value: groupId },
      { field: 'user_id', operator: '=', value: userId },
    ],
    limit: 1,
  })
  if (members.length === 0) return { ok: false, status: 404 }
  const role = members[0]?.role
  return { ok: true, row: group, role }
}

export async function requireGroupAdmin<
  T extends Record<string, unknown> = Record<string, unknown>,
>(groupId: string, userId: string): Promise<AuthzResult<T>> {
  const result = await requireGroupMembership<T>(groupId, userId)
  if (!result.ok) return result
  if (result.role !== 'admin') return { ok: false, status: 404 }
  return { ok: true, row: result.row }
}

export async function isContactBlocked(
  ownerUserId: string,
  contactUserId: string,
): Promise<boolean> {
  const blocked = await count('contacts', [
    { field: 'user_id', operator: '=', value: ownerUserId },
    { field: 'contact_user_id', operator: '=', value: contactUserId },
    { field: 'is_blocked', operator: '=', value: true },
  ])
  return blocked > 0
}
