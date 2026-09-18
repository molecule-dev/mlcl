import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

async function ownsPet(petId: string, userId: string): Promise<boolean> {
  const pet = await findById<Record<string, unknown>>('pets', petId)
  return Boolean(pet && pet.owner_user_id === userId)
}

const createMedicationSchema = z.object({
  pet_id: z.string().min(1),
  name: z.string().min(1),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  prescriber: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  instructions: z.string().optional(),
  is_active: z.boolean().optional(),
})

const updateMedicationSchema = createMedicationSchema.partial().omit({ pet_id: true })

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const ownedPets = await findMany<Record<string, unknown>>('pets', {
      where: [{ field: 'owner_user_id', operator: '=', value: userId }],
      select: ['id'],
    })
    const ownedIds = ownedPets.map((p) => String(p.id))
    if (ownedIds.length === 0) return res.json([])

    const where: WhereCondition[] = [{ field: 'pet_id', operator: 'in', value: ownedIds }]
    if (req.query.pet_id) {
      where.push({ field: 'pet_id', operator: '=', value: String(req.query.pet_id) })
    }
    if (req.query.active !== undefined) {
      where.push({ field: 'is_active', operator: '=', value: String(req.query.active) === 'true' })
    }

    const meds = await findMany('pet_medications', {
      where,
      orderBy: [{ field: 'name', direction: 'asc' }],
      limit: Number(req.query.limit) || 100,
    })
    res.json(meds)
  } catch (err) {
    console.error(`[medications.ts]`, err)
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

    const med = await findById<Record<string, unknown>>('pet_medications', getParamId(req))
    if (!med) {
      return res
        .status(404)
        .json({ error: t('medications.notFound', {}, { defaultValue: 'Medication not found' }) })
    }
    if (!(await ownsPet(String(med.pet_id), userId))) {
      return res
        .status(404)
        .json({ error: t('medications.notFound', {}, { defaultValue: 'Medication not found' }) })
    }
    res.json(med)
  } catch (err) {
    console.error(`[medications.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createMedicationSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    if (!(await ownsPet(String(req.body.pet_id), userId))) {
      return res
        .status(404)
        .json({ error: t('pets.notFound', {}, { defaultValue: 'Pet not found' }) })
    }

    const result = await create('pet_medications', {
      pet_id: req.body.pet_id,
      name: req.body.name,
      dosage: req.body.dosage ?? null,
      frequency: req.body.frequency ?? null,
      prescriber: req.body.prescriber ?? null,
      start_date: req.body.start_date ? new Date(req.body.start_date) : null,
      end_date: req.body.end_date ? new Date(req.body.end_date) : null,
      instructions: req.body.instructions ?? null,
      is_active: req.body.is_active ?? true,
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error(`[medications.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateMedicationSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('pet_medications', id)
    if (!existing || !(await ownsPet(String(existing.pet_id), userId))) {
      return res
        .status(404)
        .json({ error: t('medications.notFound', {}, { defaultValue: 'Medication not found' }) })
    }

    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date() }
    if (req.body.start_date) updates.start_date = new Date(req.body.start_date)
    if (req.body.end_date) updates.end_date = new Date(req.body.end_date)

    const result = await updateById('pet_medications', id, updates)
    res.json(result.data)
  } catch (err) {
    console.error(`[medications.ts]`, err)
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
    const existing = await findById<Record<string, unknown>>('pet_medications', id)
    if (!existing || !(await ownsPet(String(existing.pet_id), userId))) {
      return res
        .status(404)
        .json({ error: t('medications.notFound', {}, { defaultValue: 'Medication not found' }) })
    }

    await deleteById('pet_medications', id)
    res.status(204).end()
  } catch (err) {
    console.error(`[medications.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
