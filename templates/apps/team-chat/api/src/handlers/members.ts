import { Router } from 'express'
import process from 'process'
import { z } from 'zod'

import { getParamId, requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { broadcast } from '@molecule/api-realtime'

import { authorizeChannel } from '../lib/authz.js'

const addMemberSchema = z.object({
  user_id: z.string().min(1),
  role: z.enum(['admin', 'member']).optional().default('member'),
})

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
})

const inviteSchema = z.object({
  email: z.string().email(),
})

const router = Router()

router.get('/:channelId', requireAuth, async (req, res) => {
  try {
    const auth = await authorizeChannel(req, res, { channelId: getParamId(req, 'channelId') })
    if (!auth) return
    const members = await findMany('channel_members', {
      where: [{ field: 'channel_id', operator: '=', value: req.params.channelId }],
    })
    res.json(members)
  } catch (error) {
    logger.error('members.list', error)
    res.status(500).json({
      error: t('members.listError', undefined, { defaultValue: 'Failed to list members' }),
    })
  }
})

router.post('/:channelId', requireAuth, async (req, res) => {
  const parsed = addMemberSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const auth = await authorizeChannel(req, res, {
      channelId: getParamId(req, 'channelId'),
      requireAdmin: true,
    })
    if (!auth) return
    const result = await create('channel_members', {
      channel_id: req.params.channelId,
      user_id: parsed.data.user_id,
      role: parsed.data.role,
      joined_at: new Date().toISOString(),
    })
    try {
      // Membership events go to the affected channel's room only.
      await broadcast(`channel:${req.params.channelId}`, 'member:joined', {
        ...result.data,
        channel_id: req.params.channelId,
      })
    } catch (_error) {
      // broadcast failure is non-fatal
    }
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('members.add', error)
    res
      .status(500)
      .json({ error: t('members.addError', undefined, { defaultValue: 'Failed to add member' }) })
  }
})

router.put('/:channelId/:memberId', requireAuth, async (req, res) => {
  const parsed = updateRoleSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const auth = await authorizeChannel(req, res, {
      channelId: getParamId(req, 'channelId'),
      requireAdmin: true,
    })
    if (!auth) return
    // authorizeChannel only proves the caller administers the PATH channel; the
    // membership row is addressed by its own id, so bind the child row to its
    // parent channel before mutating — otherwise an admin of channel A could
    // change roles on a membership row belonging to channel B (cross-channel).
    const member = (await findById('channel_members', req.params.memberId as string)) as Record<
      string,
      unknown
    > | null
    if (!member || String(member.channel_id) !== getParamId(req, 'channelId')) {
      return res
        .status(404)
        .json({ error: t('members.notFound', undefined, { defaultValue: 'Member not found' }) })
    }
    const result = await updateById('channel_members', req.params.memberId as string, {
      role: parsed.data.role,
      updated_at: new Date().toISOString(),
    })
    if (!result.data) {
      return res
        .status(404)
        .json({ error: t('members.notFound', undefined, { defaultValue: 'Member not found' }) })
    }
    try {
      await broadcast(`channel:${req.params.channelId}`, 'member:updated', result.data)
    } catch (_error) {
      // broadcast failure is non-fatal
    }
    res.json(result.data)
  } catch (error) {
    logger.error('members.update', error)
    res.status(500).json({
      error: t('members.updateError', undefined, { defaultValue: 'Failed to update member' }),
    })
  }
})

router.delete('/:channelId/:memberId', requireAuth, async (req, res) => {
  try {
    const auth = await authorizeChannel(req, res, {
      channelId: getParamId(req, 'channelId'),
      requireAdmin: true,
    })
    if (!auth) return
    // Bind the membership row (addressed by its own id) to the path channel
    // before deleting, so an admin of channel A cannot remove a member of
    // channel B (cross-channel membership mutation).
    const member = (await findById('channel_members', req.params.memberId as string)) as Record<
      string,
      unknown
    > | null
    if (!member || String(member.channel_id) !== getParamId(req, 'channelId')) {
      return res
        .status(404)
        .json({ error: t('members.notFound', undefined, { defaultValue: 'Member not found' }) })
    }
    await deleteById('channel_members', req.params.memberId as string)
    try {
      await broadcast(`channel:${req.params.channelId}`, 'member:left', {
        id: req.params.memberId,
        channel_id: req.params.channelId,
      })
    } catch (_error) {
      // broadcast failure is non-fatal
    }
    res.status(204).end()
  } catch (error) {
    logger.error('members.remove', error)
    res.status(500).json({
      error: t('members.removeError', undefined, { defaultValue: 'Failed to remove member' }),
    })
  }
})

router.post('/:channelId/invite', requireAuth, async (req, res) => {
  const parsed = inviteSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const auth = await authorizeChannel(req, res, { channelId: getParamId(req, 'channelId') })
    if (!auth) return
    await sendMail({
      from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
      to: parsed.data.email,
      subject: t('members.inviteSubject', undefined, {
        defaultValue: 'You have been invited to a channel',
      }),
      text: t(
        'members.inviteBody',
        { channelId: getParamId(req, 'channelId') as string },
        { defaultValue: 'Click to join the channel' },
      ),
    })
    res.json({ sent: true })
  } catch (error) {
    logger.error('members.invite', error)
    res.status(500).json({
      error: t('members.inviteError', undefined, { defaultValue: 'Failed to send invitation' }),
    })
  }
})

export default router
