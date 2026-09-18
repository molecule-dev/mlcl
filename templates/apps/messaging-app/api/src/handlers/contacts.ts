import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { decorateContacts, type RawContact } from './_decorate.js'
import { seedDemoForUserOnce } from './_seed.js'

const createSchema = z
  .object({
    contact_user_id: z.string().min(1).optional(),
    email: z.string().email().optional(),
    nickname: z.string().max(100).optional(),
  })
  .refine((d) => d.contact_user_id || d.email, {
    message: 'Either contact_user_id or email is required',
  })

const updateSchema = z.object({
  nickname: z.string().max(100).nullable().optional(),
  is_blocked: z.boolean().optional(),
})

const router = Router()

router.use(requireAuth)

router.get('/', async (_req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  await seedDemoForUserOnce(userId).catch(() => {
    /* best-effort */
  })
  const contacts = await findMany<RawContact>('contacts', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 500,
  })
  res.json(await decorateContacts(contacts))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const contact = await findById<RawContact>('contacts', req.params.id as string)
  if (!contact || String(contact.user_id) !== String(userId)) {
    res.status(404).json({
      error: t('contacts.notFound', undefined, { defaultValue: 'Contact not found' }),
    })
    return
  }
  const [decorated] = await decorateContacts([contact])
  res.json(decorated)
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
  let contactUserId = parsed.data.contact_user_id

  // Email-based add: look up an existing user by email. If they don't
  // exist, surface a 404 so the UI can prompt the user to invite them.
  if (!contactUserId && parsed.data.email) {
    const matched = await findMany<{ id: string }>('users', {
      where: [{ field: 'email', operator: '=', value: parsed.data.email }],
      limit: 1,
    })
    if (matched.length === 0) {
      res.status(404).json({
        error: t('contacts.userNotFound', undefined, {
          defaultValue: 'No Hush user with that email yet',
        }),
      })
      return
    }
    contactUserId = String(matched[0]!.id)
  }

  if (!contactUserId) {
    res.status(400).json({ error: 'contact_user_id required' })
    return
  }

  // Idempotent: if the contact row already exists, return it.
  const existing = await findMany<RawContact>('contacts', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'contact_user_id', operator: '=', value: contactUserId },
    ],
    limit: 1,
  })
  if (existing[0]) {
    const [decorated] = await decorateContacts([existing[0]])
    res.status(200).json(decorated)
    return
  }

  const result = await create('contacts', {
    user_id: userId,
    contact_user_id: contactUserId,
    nickname: parsed.data.nickname ?? null,
    created_at: new Date().toISOString(),
  })
  const [decorated] = await decorateContacts([result.data as RawContact])
  res.status(201).json(decorated)
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
  const contact = await findById<RawContact>('contacts', req.params.id as string)
  if (!contact || String(contact.user_id) !== String(userId)) {
    res.status(404).json({
      error: t('contacts.notFound', undefined, { defaultValue: 'Contact not found' }),
    })
    return
  }
  const result = await updateById('contacts', req.params.id as string, {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  })
  const [decorated] = await decorateContacts([result.data as RawContact])
  res.json(decorated)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const contact = await findById<RawContact>('contacts', req.params.id as string)
  if (!contact || String(contact.user_id) !== String(userId)) {
    res.status(404).json({
      error: t('contacts.notFound', undefined, { defaultValue: 'Contact not found' }),
    })
    return
  }
  await deleteById('contacts', req.params.id as string)
  res.status(204).end()
})

router.post('/:id/block', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const contact = await findById<RawContact>('contacts', req.params.id as string)
  if (!contact || String(contact.user_id) !== String(userId)) {
    res.status(404).json({
      error: t('contacts.notFound', undefined, { defaultValue: 'Contact not found' }),
    })
    return
  }
  const result = await updateById('contacts', req.params.id as string, {
    is_blocked: true,
    updated_at: new Date().toISOString(),
  })
  const [decorated] = await decorateContacts([result.data as RawContact])
  res.json(decorated)
})

router.post('/:id/unblock', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const contact = await findById<RawContact>('contacts', req.params.id as string)
  if (!contact || String(contact.user_id) !== String(userId)) {
    res.status(404).json({
      error: t('contacts.notFound', undefined, { defaultValue: 'Contact not found' }),
    })
    return
  }
  const result = await updateById('contacts', req.params.id as string, {
    is_blocked: false,
    updated_at: new Date().toISOString(),
  })
  const [decorated] = await decorateContacts([result.data as RawContact])
  res.json(decorated)
})

export default router
