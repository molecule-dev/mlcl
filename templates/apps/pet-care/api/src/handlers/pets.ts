import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { PetCareLimits } from '../tiers.js'

const router = Router()

const createPetSchema = z.object({
  name: z.string().min(1),
  species: z.enum(['dog', 'cat', 'bird', 'rabbit', 'fish', 'reptile', 'other']).default('dog'),
  breed: z.string().optional(),
  sex: z.enum(['male', 'female', 'unknown']).optional(),
  neutered: z.boolean().optional(),
  date_of_birth: z.string().optional(),
  weight_kg: z.number().nonnegative().optional(),
  color: z.string().optional(),
  microchip_id: z.string().optional(),
  photo_url: z.string().optional(),
  notes: z.string().optional(),
})

const updatePetSchema = createPetSchema.partial()

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const where: WhereCondition[] = [{ field: 'owner_user_id', operator: '=', value: userId }]
    if (req.query.species) {
      where.push({ field: 'species', operator: '=', value: String(req.query.species) })
    }

    const pets = await findMany('pets', {
      where,
      orderBy: [{ field: 'name', direction: 'asc' }],
      limit: Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0,
    })
    res.json(pets)
  } catch (err) {
    console.error(`[pets.ts]`, err)
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

    const pet = await findById<Record<string, unknown>>('pets', getParamId(req))
    if (!pet || pet.owner_user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('pets.notFound', {}, { defaultValue: 'Pet not found' }) })
    }
    res.json(pet)
  } catch (err) {
    console.error(`[pets.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<PetCareLimits>({
    limitType: 'maxPets',
    getLimit: (limits) => limits.maxPets,
    getCurrent: async (userId) =>
      count('pets', [{ field: 'owner_user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createPetSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }

      const {
        name,
        species,
        breed,
        sex,
        neutered,
        date_of_birth,
        weight_kg,
        color,
        microchip_id,
        photo_url,
        notes,
      } = req.body

      const result = await create('pets', {
        owner_user_id: userId,
        name,
        species: species ?? 'dog',
        breed: breed ?? null,
        sex: sex ?? null,
        neutered: neutered ?? false,
        date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
        weight_kg: weight_kg ?? null,
        color: color ?? null,
        microchip_id: microchip_id ?? null,
        photo_url: photo_url ?? null,
        notes: notes ?? '',
      })

      res.status(201).json(result.data)
    } catch (err) {
      console.error(`[pets.ts]`, err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id', validateBody(updatePetSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('pets', id)
    if (!existing || existing.owner_user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('pets.notFound', {}, { defaultValue: 'Pet not found' }) })
    }

    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date() }
    if (req.body.date_of_birth) updates.date_of_birth = new Date(req.body.date_of_birth)

    const result = await updateById('pets', id, updates)
    res.json(result.data)
  } catch (err) {
    console.error(`[pets.ts]`, err)
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
    const existing = await findById<Record<string, unknown>>('pets', id)
    if (!existing || existing.owner_user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('pets.notFound', {}, { defaultValue: 'Pet not found' }) })
    }

    await deleteById('pets', id)
    res.status(204).end()
  } catch (err) {
    console.error(`[pets.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
