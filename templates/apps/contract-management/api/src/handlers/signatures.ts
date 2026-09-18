import { randomBytes } from 'node:crypto'

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireContractChildOwnership, requireUserOwnership } from '../lib/authz.js'
import type { ContractManagementLimits } from '../tiers.js'

const router = Router()

const requestSignatureSchema = z.object({
  contract_id: z.string().uuid(),
  signer_name: z.string().min(1).max(500),
  signer_email: z.string().email().max(320),
  role: z.enum(['counterparty', 'internal']).optional().default('counterparty'),
  order: z.number().int().nonnegative().optional().default(1),
})

const updateSignatureSchema = z.object({
  status: z.enum(['pending', 'viewed', 'signed', 'declined']),
  ip: z.string().max(64).optional(),
})

router.use(authorizers.auth())

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { contract_id } = req.query
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (contract_id) {
      where.push({ field: 'contract_id', operator: '=', value: String(contract_id) })
    }
    const items = await findMany('signatures', {
      where,
      orderBy: [{ field: 'requested_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('signatures.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<ContractManagementLimits>({
    limitType: 'maxSignatures',
    getLimit: (limits) => limits.maxSignatures,
    getCurrent: async (userId) =>
      count('signatures', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(requestSignatureSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof requestSignatureSchema>
      const ownsContract = await requireUserOwnership('contracts', body.contract_id, userId)
      if (!ownsContract.ok) {
        res
          .status(ownsContract.status)
          .json({ error: t('contract.notFound', {}, { defaultValue: 'Contract not found' }) })
        return
      }
      const now = new Date().toISOString()
      const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const result = await create('signatures', {
        contract_id: body.contract_id,
        user_id: userId,
        signer_name: body.signer_name,
        signer_email: body.signer_email,
        role: body.role ?? 'counterparty',
        order: body.order ?? 1,
        status: 'pending',
        token: randomBytes(24).toString('hex'),
        token_expires_at: tokenExpiresAt,
        requested_at: now,
        created_at: now,
      })
      res.status(201).json(result.data ?? result)
    } catch (error) {
      logger.error('signatures.create', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.patch('/:id', validateBody(updateSignatureSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireContractChildOwnership('signatures', req.params.id as string, userId)
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('signature.notFound', {}, { defaultValue: 'Signature not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateSignatureSchema>
    const now = new Date().toISOString()
    const result = await updateById('signatures', req.params.id as string, {
      status: body.status,
      ip: body.ip ?? null,
      signed_at: body.status === 'signed' ? now : null,
    })
    res.json(result.data ?? result)
  } catch (error) {
    logger.error('signatures.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
