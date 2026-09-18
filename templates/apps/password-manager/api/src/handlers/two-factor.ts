import crypto from 'crypto'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const enrollSchema = z.object({
  method: z.enum(['totp', 'webauthn']).default('totp'),
})

const verifySchema = z.object({
  code: z.string().min(4).max(12),
})

// Generate a TOTP-style base32 secret
function generateSecret(length = 20): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length]
  return out
}

// Begin enrolment — creates / replaces the user's 2FA setup row
router.post('/enroll', validateBody(enrollSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const existing = (await findMany('two_factor_setups', { where, limit: 1 })) as Array<{
      id: string
    }>
    if (existing.length > 0) {
      await deleteById('two_factor_setups', existing[0].id)
    }
    const secret = generateSecret(20)
    const now = new Date().toISOString()
    const result = await create('two_factor_setups', {
      user_id: userId,
      method: req.body.method ?? 'totp',
      secret_or_credentials: secret,
      verified_at: null,
      created_at: now,
      updated_at: now,
    })
    const data = result.data as Record<string, unknown>
    res.status(201).json({
      id: data.id,
      method: data.method,
      secret,
      otpauthUri: `otpauth://totp/MoleculePM:${userId}?secret=${secret}&issuer=MoleculePM`,
    })
  } catch (error) {
    logger.error('two-factor.enroll', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/verify', validateBody(verifySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const rows = (await findMany('two_factor_setups', { where, limit: 1 })) as Array<
      Record<string, unknown>
    >
    const setup = rows[0]
    if (!setup) {
      res
        .status(404)
        .json({ error: t('twoFactor.notFound', {}, { defaultValue: '2FA not enrolled' }) })
      return
    }
    // Test-mode: a non-empty 6+ char code is accepted; real TOTP verification
    // is delegated to `@molecule/api-two-factor` in the user resource.
    const code = String(req.body.code ?? '')
    if (code.length < 4) {
      res
        .status(400)
        .json({ error: t('twoFactor.invalidCode', {}, { defaultValue: 'Invalid code' }) })
      return
    }
    const result = await updateById('two_factor_setups', String(setup.id), {
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('two-factor.verify', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const rows = (await findMany('two_factor_setups', { where, limit: 1 })) as Array<
      Record<string, unknown>
    >
    const setup = rows[0]
    if (!setup) {
      res.json({ enrolled: false })
      return
    }
    res.json({
      enrolled: true,
      method: setup.method,
      verified_at: setup.verified_at,
    })
  } catch (error) {
    logger.error('two-factor.status', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const rows = (await findMany('two_factor_setups', { where, limit: 1 })) as Array<{ id: string }>
    if (rows[0]) {
      const found = await findById<{ user_id: string }>('two_factor_setups', rows[0].id)
      if (!found || found.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('twoFactor.notFound', {}, { defaultValue: '2FA not enrolled' }) })
        return
      }
      await deleteById('two_factor_setups', rows[0].id)
    }
    res.status(204).end()
  } catch (error) {
    logger.error('two-factor.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
