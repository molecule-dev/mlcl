import { Router } from 'express'
import { z } from 'zod'

import { getUserId, requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { broadcast } from '@molecule/api-realtime'

import { authorizeChannelForMessage } from '../lib/authz.js'

const addReactionSchema = z.object({
  emoji: z.string().min(1).max(20),
})

const router = Router()

router.get('/:messageId', requireAuth, async (req, res) => {
  try {
    // Only members of the message's channel may list its reactions, matching
    // the POST/DELETE routes. A session alone is NOT enough — without this gate
    // any authenticated user could enumerate who reacted to any message.
    const auth = await authorizeChannelForMessage(req, res, req.params.messageId as string)
    if (!auth) return
    const reactions = await findMany('reactions', {
      where: [{ field: 'message_id', operator: '=', value: req.params.messageId }],
    })
    res.json(reactions)
  } catch (error) {
    logger.error('reactions.list', error)
    res.status(500).json({
      error: t('reactions.listError', undefined, { defaultValue: 'Failed to list reactions' }),
    })
  }
})

router.post('/:messageId', requireAuth, async (req, res) => {
  const parsed = addReactionSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const auth = await authorizeChannelForMessage(req, res, req.params.messageId as string)
    if (!auth) return
    // Archived channels are read-only — a reaction is new content, so reject it
    // (mirrors the message-post gate in messages.ts).
    if ((auth.channel as Record<string, unknown>).is_archived === true) {
      return res.status(403).json({
        error: t('channel.archived', undefined, { defaultValue: 'This channel is archived' }),
      })
    }
    const userId = res.locals.session.userId
    const existing = await findMany('reactions', {
      where: [
        { field: 'message_id', operator: '=', value: req.params.messageId },
        { field: 'user_id', operator: '=', value: userId },
        { field: 'emoji', operator: '=', value: parsed.data.emoji },
      ],
    })
    if (existing.length > 0) {
      return res.status(409).json({
        error: t('reactions.alreadyExists', undefined, {
          defaultValue: 'Reaction already exists',
        }),
      })
    }

    const result = await create('reactions', {
      message_id: req.params.messageId,
      user_id: userId,
      emoji: parsed.data.emoji,
      created_at: new Date().toISOString(),
    })
    try {
      // Reactions belong to the parent message's channel room.
      await broadcast(`channel:${String(auth.message.channel_id)}`, 'reaction:added', result.data)
    } catch (_error) {
      // broadcast failure is non-fatal
    }
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('reactions.create', error)
    res.status(500).json({
      error: t('reactions.createError', undefined, { defaultValue: 'Failed to add reaction' }),
    })
  }
})

router.delete('/:messageId/:reactionId', requireAuth, async (req, res) => {
  try {
    // Must be a member of the message's channel, and only the reaction's owner
    // or a channel admin may remove it.
    const auth = await authorizeChannelForMessage(req, res, req.params.messageId as string)
    if (!auth) return
    const reaction = (await findById('reactions', req.params.reactionId as string)) as Record<
      string,
      unknown
    > | null
    if (!reaction) {
      return res.status(404).json({
        error: t('reactions.notFound', undefined, { defaultValue: 'Reaction not found' }),
      })
    }
    if (String(reaction.user_id) !== String(getUserId(res)) && !auth.isAdmin) {
      return res.status(403).json({
        error: t('reactions.forbidden', undefined, {
          defaultValue: 'You can only remove your own reactions',
        }),
      })
    }
    await deleteById('reactions', req.params.reactionId as string)
    try {
      await broadcast(`channel:${String(auth.message.channel_id)}`, 'reaction:removed', {
        id: req.params.reactionId,
        message_id: req.params.messageId,
      })
    } catch (_error) {
      // broadcast failure is non-fatal
    }
    res.status(204).end()
  } catch (error) {
    logger.error('reactions.delete', error)
    res.status(500).json({
      error: t('reactions.deleteError', undefined, { defaultValue: 'Failed to remove reaction' }),
    })
  }
})

export default router
