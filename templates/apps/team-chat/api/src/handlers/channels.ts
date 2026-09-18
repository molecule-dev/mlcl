import type { RequestHandler } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId, requireAuth } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { broadcast } from '@molecule/api-realtime'
import { index, search as searchIndex } from '@molecule/api-search'

import { authorizeChannel, listMemberChannelIds } from '../lib/authz.js'
import type { TeamChatLimits } from '../tiers.js'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  is_private: z.boolean().optional().default(false),
  workspace_id: z.string().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  topic: z.string().max(250).optional(),
  is_private: z.boolean().optional(),
})

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  try {
    // Scope every listing/search to channels the caller is a member of so an
    // authenticated user can't enumerate channels (incl. other workspaces').
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    }
    const memberChannelIds = await listMemberChannelIds(userId)
    const { search, workspace_id } = req.query
    if (search) {
      const results = await searchIndex('channels', { text: String(search) })
      const allowed = new Set(memberChannelIds)
      return res.json(
        results.hits
          .map((h) => h.document)
          .filter((d) => allowed.has(String((d as Record<string, unknown>).id))),
      )
    }
    if (memberChannelIds.length === 0) return res.json([])
    const where: WhereCondition[] = [{ field: 'id', operator: 'in', value: memberChannelIds }]
    if (workspace_id) where.push({ field: 'workspace_id', operator: '=', value: workspace_id })
    const channels = await findMany('channels', { where })
    res.json(channels)
  } catch (error) {
    logger.error('channels.list', error)
    res.status(500).json({
      error: t('channels.listError', undefined, { defaultValue: 'Failed to list channels' }),
    })
  }
})

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const auth = await authorizeChannel(req, res)
    if (!auth) return
    res.json(auth.channel)
  } catch (error) {
    logger.error('channels.read', error)
    res.status(500).json({
      error: t('channels.readError', undefined, { defaultValue: 'Failed to read channel' }),
    })
  }
})

router.post(
  '/',
  requireAuth,
  enforceLimit<TeamChatLimits>({
    limitType: 'maxChannels',
    getLimit: (limits) => limits.maxChannels,
    getCurrent: async (userId) =>
      count('channels', [{ field: 'created_by', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  async (req, res) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
        errors: parsed.error.issues,
      })
    }
    try {
      const result = await create('channels', {
        ...parsed.data,
        created_by: res.locals.session.userId,
        created_at: new Date().toISOString(),
      })
      const channel = result.data
      if (channel) {
        // Auto-enroll the creator as an admin member so channel-membership
        // scoping (GET /channels) and the authorizeChannel gate let them back
        // into the channel they just made.
        try {
          await create('channel_members', {
            channel_id: String((channel as Record<string, unknown>).id),
            user_id: res.locals.session.userId,
            role: 'admin',
            joined_at: new Date().toISOString(),
          })
        } catch (membershipError) {
          // Non-fatal: the authorizeChannel helper also treats the creator as
          // an implicit member, so the channel stays usable even if this fails.
          logger.warn('channels.create.autoEnroll', membershipError)
        }
        // Search indexing is best-effort — a Meilisearch outage must not
        // block channel creation. Errors are logged but swallowed so the
        // user's request still returns 201.
        try {
          await index(
            'channels',
            String((channel as Record<string, unknown>).id),
            channel as Record<string, unknown>,
          )
        } catch (_error) {
          // index failure is non-fatal
        }
      }
      try {
        // Per-channel rooms: the creator's client joins `channel:<id>` after
        // navigating into the new channel, so this reaches them (and anyone
        // else who joins) — there is no global room.
        if (channel) {
          await broadcast(
            `channel:${String((channel as Record<string, unknown>).id)}`,
            'channel:created',
            channel,
          )
        }
      } catch (_error) {
        // broadcast failure is non-fatal
      }
      res.status(201).json(channel)
    } catch (error) {
      logger.error('channels.create', error)
      res.status(500).json({
        error: t('channels.createError', undefined, { defaultValue: 'Failed to create channel' }),
      })
    }
  },
)

router.put('/:id', requireAuth, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const auth = await authorizeChannel(req, res)
    if (!auth) return
    // Flipping privacy (public <-> private) is an admin-only action; ordinary
    // members may still rename / re-topic the channel.
    const flippingPrivacy =
      parsed.data.is_private !== undefined && parsed.data.is_private !== auth.channel.is_private
    if (flippingPrivacy && !auth.isAdmin) {
      return res.status(403).json({
        error: t('channels.adminRequired', undefined, {
          defaultValue: 'Only channel admins can perform this action',
        }),
      })
    }
    const result = await updateById('channels', req.params.id as string, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    if (!result.data) {
      return res
        .status(404)
        .json({ error: t('channels.notFound', undefined, { defaultValue: 'Channel not found' }) })
    }
    try {
      await index('channels', req.params.id as string, result.data as Record<string, unknown>)
    } catch (_error) {
      // index failure is non-fatal
    }
    try {
      await broadcast(`channel:${auth.channel.id}`, 'channel:updated', result.data)
    } catch (_error) {
      // broadcast failure is non-fatal
    }
    res.json(result.data)
  } catch (error) {
    logger.error('channels.update', error)
    res.status(500).json({
      error: t('channels.updateError', undefined, { defaultValue: 'Failed to update channel' }),
    })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Deleting a channel is admin-only (creator or role==='admin'); the helper
    // also 404s a missing channel, fixing the prior silent-204-on-missing bug.
    const auth = await authorizeChannel(req, res, { requireAdmin: true })
    if (!auth) return
    await deleteById('channels', req.params.id as string)
    try {
      await broadcast(`channel:${auth.channel.id}`, 'channel:deleted', { id: req.params.id })
    } catch (_error) {
      // broadcast failure is non-fatal
    }
    res.status(204).end()
  } catch (error) {
    logger.error('channels.delete', error)
    res.status(500).json({
      error: t('channels.deleteError', undefined, { defaultValue: 'Failed to delete channel' }),
    })
  }
})

router.post('/:id/archive', requireAuth, async (req, res) => {
  try {
    const auth = await authorizeChannel(req, res)
    if (!auth) return
    const result = await updateById('channels', req.params.id as string, {
      is_archived: true,
      archived_at: new Date().toISOString(),
    })
    if (!result.data) {
      return res
        .status(404)
        .json({ error: t('channels.notFound', undefined, { defaultValue: 'Channel not found' }) })
    }
    try {
      await broadcast(`channel:${auth.channel.id}`, 'channel:archived', result.data)
    } catch (_error) {
      // broadcast failure is non-fatal
    }
    res.json(result.data)
  } catch (error) {
    logger.error('channels.archive', error)
    res.status(500).json({
      error: t('channels.archiveError', undefined, { defaultValue: 'Failed to archive channel' }),
    })
  }
})

router.post('/:id/unarchive', requireAuth, async (req, res) => {
  try {
    const auth = await authorizeChannel(req, res)
    if (!auth) return
    const result = await updateById('channels', req.params.id as string, {
      is_archived: false,
      archived_at: null,
    })
    if (!result.data) {
      return res
        .status(404)
        .json({ error: t('channels.notFound', undefined, { defaultValue: 'Channel not found' }) })
    }
    try {
      await broadcast(`channel:${auth.channel.id}`, 'channel:unarchived', result.data)
    } catch (_error) {
      // broadcast failure is non-fatal
    }
    res.json(result.data)
  } catch (error) {
    logger.error('channels.unarchive', error)
    res.status(500).json({
      error: t('channels.unarchiveError', undefined, {
        defaultValue: 'Failed to unarchive channel',
      }),
    })
  }
})

export default router
