import { type RequestHandler, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

/**
 * Emergency contact for the signed-in user (design: Profile → Emergency
 * Contact). One row per user, upserted on save — kept OUT of the shared
 * users resource, whose update schema intentionally whitelists only
 * username/name/email/avatar/bio.
 */
const router = Router()

const saveSchema = z.object({
  contact_name: z.string().max(120).default(''),
  contact_phone: z.string().max(40).default(''),
})

router.get('/', async (_req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const rows = await findMany<Record<string, unknown>>('emergency_contacts', {
    where: [{ field: 'user_id', operator: '=' as const, value: userId }],
    limit: 1,
  })
  res.json({ data: rows[0] ?? null })
})

router.put('/', validateBody(saveSchema) as RequestHandler, async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const body = req.body as z.infer<typeof saveSchema>
  const existing = await findMany<Record<string, unknown>>('emergency_contacts', {
    where: [{ field: 'user_id', operator: '=' as const, value: userId }],
    limit: 1,
  })
  const current = existing[0]
  const result = current
    ? await updateById<Record<string, unknown>>('emergency_contacts', String(current.id), {
        contact_name: body.contact_name,
        contact_phone: body.contact_phone,
        updated_at: new Date().toISOString(),
      })
    : await create<Record<string, unknown>>('emergency_contacts', {
        user_id: userId,
        contact_name: body.contact_name,
        contact_phone: body.contact_phone,
      })
  res.json({ data: result.data })
})

export default router
