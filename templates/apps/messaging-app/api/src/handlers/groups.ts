import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { broadcast } from '@molecule/api-realtime'

import { requireGroupAdmin, requireGroupMembership } from '../lib/authz.js'
import { decorateGroup, decorateGroups, type RawGroup } from './_decorate.js'
import { seedDemoForUserOnce } from './_seed.js'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  member_ids: z.array(z.string().min(1)).max(500).optional().default([]),
  encryption_enabled: z.boolean().optional().default(true),
})

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  encryption_enabled: z.boolean().optional(),
  avatar_url: z.string().max(2000).optional(),
})

const router = Router()

router.use(requireAuth)

/**
 * Resolve the realtime room for a group's mirrored conversation. Every group
 * is mirrored as a `conversations` row (`group_id` set — see POST / below),
 * and the join guard only admits clients into `conversation:<id>` rooms, so
 * group events are delivered through the mirror conversation's room. Returns
 * null when no mirror exists (the broadcast is then skipped, best-effort).
 */
const groupConversationRoom = async (groupId: string): Promise<string | null> => {
  const mirrors = await findMany<{ id: string }>('conversations', {
    where: [{ field: 'group_id', operator: '=', value: groupId }],
    limit: 1,
  })
  const mirror = mirrors[0]
  return mirror?.id ? `conversation:${String(mirror.id)}` : null
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  await seedDemoForUserOnce(userId).catch(() => {
    /* best-effort */
  })
  const memberships = await findMany<{ group_id: string }>('group_members', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 500,
  })
  const ids = memberships.map((m) => m.group_id).filter(Boolean)
  if (ids.length === 0) {
    res.json([])
    return
  }
  const groups = await findMany<RawGroup>('groups', {
    where: [{ field: 'id', operator: 'in', value: ids }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 200,
  })
  res.json(await decorateGroups(groups))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireGroupMembership<RawGroup>(req.params.id as string, userId)
  if (!check.ok) {
    res.status(check.status).json({
      error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }),
    })
    return
  }
  res.json(await decorateGroup(check.row))
})

router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  const userId = res.locals.session.userId as string
  const result = await create('groups', {
    owner_id: userId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    encryption_enabled: parsed.data.encryption_enabled,
    created_at: new Date().toISOString(),
  })
  const group = result.data as RawGroup | undefined
  if (!group?.id) {
    res.status(500).json({
      error: t('groups.createError', undefined, { defaultValue: 'Failed to create group' }),
    })
    return
  }

  const memberSet = new Set<string>([userId, ...parsed.data.member_ids])
  for (const uid of memberSet) {
    await create('group_members', {
      group_id: group.id,
      user_id: uid,
      role: uid === userId ? 'admin' : 'member',
      joined_at: new Date().toISOString(),
    })
  }

  // Mirror the group as a conversation so it shows up in the inbox.
  const convoCreated = await create('conversations', {
    type: 'group',
    title: parsed.data.name,
    created_by: userId,
    group_id: group.id,
    created_at: new Date().toISOString(),
  })
  const convo = convoCreated.data as { id: string } | undefined
  if (convo?.id) {
    for (const uid of memberSet) {
      await create('conversation_participants', {
        conversation_id: convo.id,
        user_id: uid,
        joined_at: new Date().toISOString(),
        unread_count: 0,
      })
    }
  }

  try {
    // The mirror conversation was just created above; its room reaches every
    // member's client once they open the conversation (there is no global room
    // — see lib/realtime-guard.ts).
    if (convo?.id) {
      await broadcast(`conversation:${String(convo.id)}`, 'group:created', group)
    }
  } catch (_error) {
    // broadcast failures are non-fatal — clients will receive the update on next poll
  }
  res.status(201).json(await decorateGroup(group))
})

router.put('/:id', async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  const userId = res.locals.session.userId as string
  const check = await requireGroupAdmin(req.params.id as string, userId)
  if (!check.ok) {
    res.status(check.status).json({
      error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }),
    })
    return
  }
  const result = await updateById('groups', req.params.id as string, {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  })
  try {
    const room = await groupConversationRoom(req.params.id as string)
    if (room) await broadcast(room, 'group:updated', result.data)
  } catch (_error) {
    // broadcast failures are non-fatal — clients will receive the update on next poll
  }
  res.json(await decorateGroup(result.data as RawGroup))
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const group = await findById<{ owner_id: unknown }>('groups', req.params.id as string)
  if (!group) {
    res
      .status(404)
      .json({ error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }) })
    return
  }
  if (String(group.owner_id) !== String(userId)) {
    res
      .status(404)
      .json({ error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }) })
    return
  }
  await deleteById('groups', req.params.id as string)
  try {
    // The mirror conversation outlives the group row, so the room still
    // resolves after the delete above.
    const room = await groupConversationRoom(req.params.id as string)
    if (room) await broadcast(room, 'group:deleted', { id: req.params.id })
  } catch (_error) {
    // broadcast failures are non-fatal — clients will receive the update on next poll
  }
  res.status(204).end()
})

router.get('/:id/members', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireGroupMembership(req.params.id as string, userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }) })
    return
  }
  const members = await findMany('group_members', {
    where: [{ field: 'group_id', operator: '=', value: req.params.id }],
    orderBy: [{ field: 'joined_at', direction: 'asc' }],
    limit: 500,
  })
  res.json(members)
})

router.post('/:id/members', async (req: Request, res: Response) => {
  const schema = z.object({
    user_id: z.string().min(1),
    role: z.enum(['admin', 'member']).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  const userId = res.locals.session.userId as string
  const check = await requireGroupAdmin(req.params.id as string, userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }) })
    return
  }
  const result = await create('group_members', {
    group_id: req.params.id,
    user_id: parsed.data.user_id,
    role: parsed.data.role ?? 'member',
    joined_at: new Date().toISOString(),
  })
  try {
    const room = await groupConversationRoom(req.params.id as string)
    if (room) await broadcast(room, 'member:joined', result.data)
  } catch (_error) {
    // broadcast failures are non-fatal — clients will receive the update on next poll
  }
  res.status(201).json(result.data)
})

router.delete('/:id/members/:memberId', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const member = await findById<{ group_id: unknown; user_id: unknown }>(
    'group_members',
    req.params.memberId as string,
  )
  if (!member || String(member.group_id) !== String(req.params.id)) {
    res
      .status(404)
      .json({ error: t('groups.memberNotFound', undefined, { defaultValue: 'Member not found' }) })
    return
  }
  const isSelf = String(member.user_id) === String(userId)
  if (!isSelf) {
    const adminCheck = await requireGroupAdmin(req.params.id as string, userId)
    if (!adminCheck.ok) {
      res
        .status(adminCheck.status)
        .json({ error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }) })
      return
    }
  } else {
    const memCheck = await requireGroupMembership(req.params.id as string, userId)
    if (!memCheck.ok) {
      res
        .status(memCheck.status)
        .json({ error: t('groups.notFound', undefined, { defaultValue: 'Group not found' }) })
      return
    }
  }
  await deleteById('group_members', req.params.memberId as string)
  try {
    const room = await groupConversationRoom(req.params.id as string)
    if (room) {
      await broadcast(room, 'member:left', {
        group_id: req.params.id,
        member_id: req.params.memberId,
      })
    }
  } catch (_error) {
    // broadcast failures are non-fatal — clients will receive the update on next poll
  }
  res.status(204).end()
})

export default router
