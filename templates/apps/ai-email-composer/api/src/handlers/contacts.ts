import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

function handleError(res: Response, err: unknown, where: string): void {
  // Map known schema constraint failures to user-friendly 4xx codes so the
  // UI can surface a helpful message instead of a generic 500.
  const message = err instanceof Error ? err.message : String(err)
  if (/duplicate key value|email_contacts_user_email_uniq/i.test(message)) {
    res.status(409).json({
      error: t(
        'contacts.duplicateEmail',
        {},
        { defaultValue: 'A contact with that email already exists.' },
      ),
    })
    return
  }

  console.error(`[contacts:${where}]`, err)
  res.status(500).json({
    error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
  })
}

const createContactSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

const updateContactSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const contacts = await findMany('email_contacts', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(contacts)
  } catch (err) {
    handleError(res, err, 'contacts')
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const row = await findById<Record<string, unknown>>('email_contacts', id)
    if (!row || row.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('contacts.notFound', {}, { defaultValue: 'Contact not found' }) })
      return
    }
    res.json(row)
  } catch (err) {
    handleError(res, err, 'contacts')
  }
})

router.post('/', validateBody(createContactSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createContactSchema>
    const result = await create('email_contacts', {
      user_id: userId,
      email: body.email,
      name: body.name ?? null,
      tags: JSON.stringify(body.tags),
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    handleError(res, err, 'contacts')
  }
})

router.put('/:id', validateBody(updateContactSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('email_contacts', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('contacts.notFound', {}, { defaultValue: 'Contact not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateContactSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.email !== undefined) updates.email = body.email
    if (body.name !== undefined) updates.name = body.name
    if (body.tags !== undefined) updates.tags = JSON.stringify(body.tags)
    const result = await updateById('email_contacts', id, updates)
    res.json(result.data)
  } catch (err) {
    handleError(res, err, 'contacts')
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('email_contacts', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('contacts.notFound', {}, { defaultValue: 'Contact not found' }) })
      return
    }
    await deleteById('email_contacts', id)
    res.status(204).end()
  } catch (err) {
    handleError(res, err, 'contacts')
  }
})

export default router
