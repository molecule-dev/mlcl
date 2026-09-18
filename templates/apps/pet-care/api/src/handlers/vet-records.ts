import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

/**
 * Confirms the requesting user owns the pet referenced by `pet_id`.
 * Returns the pet row on success, `null` otherwise. Used to enforce
 * authorization on every pet-scoped vet-record write.
 */
async function ownsPet(petId: string, userId: string): Promise<Record<string, unknown> | null> {
  const pet = await findById<Record<string, unknown>>('pets', petId)
  if (!pet || pet.owner_user_id !== userId) return null
  return pet
}

const createVetRecordSchema = z.object({
  pet_id: z.string().min(1),
  kind: z.enum(['visit', 'vaccine', 'test', 'surgery', 'other']).default('visit'),
  title: z.string().min(1),
  occurred_on: z.string().optional(),
  vet_name: z.string().optional(),
  clinic_name: z.string().optional(),
  summary: z.string().optional(),
  follow_up_date: z.string().optional(),
})

const updateVetRecordSchema = createVetRecordSchema.partial().omit({ pet_id: true })

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    // Constrain results to pets owned by this user.
    const ownedPets = await findMany<Record<string, unknown>>('pets', {
      where: [{ field: 'owner_user_id', operator: '=', value: userId }],
      select: ['id'],
    })
    const ownedIds = ownedPets.map((p) => String(p.id))
    if (ownedIds.length === 0) {
      return res.json([])
    }

    const where: WhereCondition[] = [{ field: 'pet_id', operator: 'in', value: ownedIds }]
    if (req.query.pet_id) {
      where.push({ field: 'pet_id', operator: '=', value: String(req.query.pet_id) })
    }
    if (req.query.kind) {
      where.push({ field: 'kind', operator: '=', value: String(req.query.kind) })
    }

    const records = await findMany('vet_records', {
      where,
      orderBy: [{ field: 'occurred_on', direction: 'desc' }],
      limit: Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0,
    })
    res.json(records)
  } catch (err) {
    console.error(`[vet-records.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const record = await findById<Record<string, unknown>>('vet_records', getParamId(req))
    if (!record) {
      return res
        .status(404)
        .json({ error: t('vetRecords.notFound', {}, { defaultValue: 'Vet record not found' }) })
    }
    const owned = await ownsPet(String(record.pet_id), userId)
    if (!owned) {
      return res
        .status(404)
        .json({ error: t('vetRecords.notFound', {}, { defaultValue: 'Vet record not found' }) })
    }
    // Hydrate the pet's display name (the ownership check already fetched
    // the pet row) so the detail page never falls back to a raw UUID.
    res.json({ ...record, pet_name: owned.name ?? null })
  } catch (err) {
    console.error(`[vet-records.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createVetRecordSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const owned = await ownsPet(String(req.body.pet_id), userId)
    if (!owned) {
      return res
        .status(404)
        .json({ error: t('pets.notFound', {}, { defaultValue: 'Pet not found' }) })
    }

    const result = await create('vet_records', {
      pet_id: req.body.pet_id,
      kind: req.body.kind ?? 'visit',
      title: req.body.title,
      occurred_on: req.body.occurred_on ? new Date(req.body.occurred_on) : new Date(),
      vet_name: req.body.vet_name ?? null,
      clinic_name: req.body.clinic_name ?? null,
      summary: req.body.summary ?? null,
      // Storage key is NEVER taken from the client (cross-tenant read IDOR if a
      // future download route streams getFile(<client key>)). No upload-receipt
      // flow exists yet, so a record is created with no attachment; when one is
      // added, the key must be minted server-side (crypto.randomUUID()).
      attachment_s3_key: null,
      follow_up_date: req.body.follow_up_date ? new Date(req.body.follow_up_date) : null,
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error(`[vet-records.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateVetRecordSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('vet_records', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('vetRecords.notFound', {}, { defaultValue: 'Vet record not found' }) })
    }
    if (!(await ownsPet(String(existing.pet_id), userId))) {
      return res
        .status(404)
        .json({ error: t('vetRecords.notFound', {}, { defaultValue: 'Vet record not found' }) })
    }

    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date() }
    if (req.body.occurred_on) updates.occurred_on = new Date(req.body.occurred_on)
    if (req.body.follow_up_date) updates.follow_up_date = new Date(req.body.follow_up_date)

    const result = await updateById('vet_records', id, updates)
    res.json(result.data)
  } catch (err) {
    console.error(`[vet-records.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('vet_records', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('vetRecords.notFound', {}, { defaultValue: 'Vet record not found' }) })
    }
    if (!(await ownsPet(String(existing.pet_id), userId))) {
      return res
        .status(404)
        .json({ error: t('vetRecords.notFound', {}, { defaultValue: 'Vet record not found' }) })
    }

    await deleteById('vet_records', id)
    res.status(204).end()
  } catch (err) {
    console.error(`[vet-records.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
