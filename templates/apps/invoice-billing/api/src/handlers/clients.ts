import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { InvoiceBillingLimits } from '../tiers.js'
import { decorateClient } from './_decorate.js'
import { ensureDemoSeeded } from './_seed.js'

const router = Router()

const addressSchema = z.union([z.string(), z.record(z.string(), z.unknown())]).optional()

const createClientSchema = z.object({
  name: z.string().min(1),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  company: z.string().optional(),
  phone: z.string().optional(),
  address: addressSchema,
  tax_id: z.string().optional(),
  notes: z.string().optional(),
})

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  company: z.string().optional(),
  phone: z.string().optional(),
  address: addressSchema,
  tax_id: z.string().optional(),
  notes: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    await ensureDemoSeeded(userId)

    const [clients, invoices, payments] = await Promise.all([
      findMany<Record<string, unknown>>('clients', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'name', direction: 'asc' }],
      }),
      findMany<Record<string, unknown>>('invoices', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
      }),
      findMany<Record<string, unknown>>('invoice_payments', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
      }),
    ])

    res.json(clients.map((c) => decorateClient(c as never, invoices as never, payments as never)))
  } catch (error) {
    logger.error('clients.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const client = await findById<Record<string, unknown>>('clients', id)

    if (!client || client.user_id !== userId) {
      return res.status(404).json({ error: t('clients.notFound') })
    }

    const [invoices, payments] = await Promise.all([
      findMany<Record<string, unknown>>('invoices', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'client_id', operator: '=', value: id },
        ],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      }),
      findMany<Record<string, unknown>>('invoice_payments', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
      }),
    ])

    res.json(decorateClient(client as never, invoices as never, payments as never))
  } catch (error) {
    logger.error('clients.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  enforceLimit<InvoiceBillingLimits>({
    limitType: 'maxClients',
    getLimit: (limits) => limits.maxClients,
    getCurrent: async (userId) =>
      count('clients', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createClientSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({ error: t('auth.unauthorized') })
      }

      const { name, email, company, phone, address, tax_id, notes } = req.body

      const result = await create('clients', {
        user_id: userId,
        name,
        email: email ?? null,
        company: company ?? null,
        phone: phone ?? null,
        address: address !== undefined && address !== null ? JSON.stringify(address) : null,
        tax_id: tax_id ?? null,
        notes: notes ?? null,
        total_billed: 0,
        total_paid: 0,
        created_at: new Date(),
      })

      const created = result.data as Record<string, unknown> | null
      if (!created) return res.status(500).json({ error: t('errors.internalServer') })
      res.status(201).json(decorateClient(created as never, [] as never, [] as never))
    } catch (error) {
      logger.error('clients.create', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put('/:id', validateBody(updateClientSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('clients', id)

    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('clients.notFound') })
    }

    const { name, email, company, phone, address, tax_id, notes } = req.body
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email
    if (company !== undefined) updates.company = company
    if (phone !== undefined) updates.phone = phone
    if (address !== undefined) {
      updates.address = address !== null ? JSON.stringify(address) : null
    }
    if (tax_id !== undefined) updates.tax_id = tax_id
    if (notes !== undefined) updates.notes = notes

    const result = await updateById('clients', id, updates)
    const updated = result.data as Record<string, unknown> | null
    if (!updated) return res.status(500).json({ error: t('errors.internalServer') })

    const [invoices, payments] = await Promise.all([
      findMany<Record<string, unknown>>('invoices', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'client_id', operator: '=', value: id },
        ],
      }),
      findMany<Record<string, unknown>>('invoice_payments', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
      }),
    ])
    res.json(decorateClient(updated as never, invoices as never, payments as never))
  } catch (error) {
    logger.error('clients.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('clients', id)

    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('clients.notFound') })
    }

    await deleteById('clients', id)
    res.status(204).end()
  } catch (error) {
    logger.error('clients.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
