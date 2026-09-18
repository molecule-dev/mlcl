/**
 * Telemedicine — providers handler.
 *
 * Public-read for verified+accepting providers (directory). Mutations are
 * scoped to the provider record's `user_id` (set at create time from the
 * session). Specialty list + availability slots are read-only public.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { decorateProvider, decorateProviders } from './_lib/decorate.js'
import { getParamId, getUserId } from './_lib/shared.js'

const router = Router()

const createSchema = z.object({
  display_name: z.string().min(1),
  npi: z.string().optional(),
  license_number: z.string().optional(),
  license_state: z.string().optional(),
  specialty_id: z.string().optional(),
  specialty: z.string().optional(),
  bio: z.string().optional(),
  hourly_rate_cents: z.number().int().min(0).optional(),
  consultation_fee: z.number().int().min(0).optional(),
  languages: z.array(z.string()).optional(),
  education: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  avatar_url: z.string().optional(),
})

const updateSchema = createSchema.partial().extend({
  accepting_patients: z.boolean().optional(),
  is_accepting_patients: z.boolean().optional(),
  is_active: z.boolean().optional(),
})

interface ProviderRow extends Record<string, unknown> {
  user_id?: string
  is_verified?: boolean
  accepting_patients?: boolean
  is_accepting_patients?: boolean
  specialty?: string
  specialty_id?: string | null
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const all = await findMany<ProviderRow>('providers', {
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const specialtyFilter = ((req.query.specialty as string | undefined) ?? '').trim().toLowerCase()
    const availableOnly = String(req.query.available ?? '').toLowerCase() === 'true'
    let list = (all as ProviderRow[]).filter((p) => p.is_verified)
    if (availableOnly) {
      list = list.filter((p) => p.accepting_patients ?? p.is_accepting_patients)
    }
    if (specialtyFilter) {
      let specialtyId: string | null = null
      let specialtyLabel: string | null = null
      const specialties =
        (await findMany<{ id: string; slug?: string; label?: string }>('specialties')) ?? []
      for (const s of specialties) {
        if (
          s.id === specialtyFilter ||
          (s.slug && String(s.slug).toLowerCase() === specialtyFilter) ||
          (s.label && String(s.label).toLowerCase() === specialtyFilter)
        ) {
          specialtyId = s.id
          specialtyLabel = s.label ?? null
          break
        }
      }
      list = list.filter((p) => {
        if (specialtyId && p.specialty_id === specialtyId) return true
        if (typeof p.specialty === 'string' && p.specialty.toLowerCase() === specialtyFilter)
          return true
        if (
          specialtyLabel &&
          typeof p.specialty === 'string' &&
          p.specialty.toLowerCase() === specialtyLabel.toLowerCase()
        )
          return true
        return false
      })
    }
    res.json(decorateProviders(list))
  } catch (error) {
    logger.error('telemedicine providers #1:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/specialties', async (_req: Request, res: Response) => {
  try {
    const specialties = await findMany('specialties', {
      orderBy: [{ field: 'label', direction: 'asc' }],
    })
    res.json(specialties)
  } catch (error) {
    logger.error('telemedicine providers #2:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const row = await findById<ProviderRow>('providers', id)
    if (!row || !row.is_verified) {
      return res.status(404).json({
        error: t('providers.notFound', undefined, { defaultValue: 'Provider not found.' }),
      })
    }
    res.json(decorateProvider(row as ProviderRow))
  } catch (error) {
    logger.error('telemedicine providers #3:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/:id/availability', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const slots = await findMany('availability_slots', {
      where: [
        { field: 'provider_id', operator: '=', value: id },
        { field: 'is_booked', operator: '=', value: false },
      ],
      orderBy: [{ field: 'starts_at', direction: 'asc' }],
    })
    res.json(slots)
  } catch (error) {
    logger.error('telemedicine providers #4:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const body = req.body as z.infer<typeof createSchema>
    const result = await create('providers', {
      user_id: userId,
      display_name: body.display_name,
      npi: body.npi ?? null,
      license_number: body.license_number ?? null,
      license_state: body.license_state ?? null,
      specialty_id: body.specialty_id ?? null,
      specialty: body.specialty ?? null,
      bio: body.bio ?? null,
      hourly_rate_cents: body.hourly_rate_cents ?? 0,
      consultation_fee: body.consultation_fee ?? 0,
      languages: JSON.stringify(body.languages ?? []),
      education: JSON.stringify(body.education ?? []),
      certifications: JSON.stringify(body.certifications ?? []),
      avatar_url: body.avatar_url ?? null,
      is_verified: false,
      is_active: true,
      accepting_patients: true,
      is_accepting_patients: true,
      created_at: new Date(),
    })
    const created = (result as { data?: Record<string, unknown> }).data ?? result
    res.status(201).json(created)
  } catch (error) {
    logger.error('telemedicine providers #5:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<ProviderRow>('providers', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('providers.notFound', undefined, { defaultValue: 'Provider not found.' }),
      })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const updates: Record<string, unknown> = { ...body, updatedAt: new Date() }
    if (body.languages !== undefined) updates.languages = JSON.stringify(body.languages)
    if (body.education !== undefined) updates.education = JSON.stringify(body.education)
    if (body.certifications !== undefined)
      updates.certifications = JSON.stringify(body.certifications)
    const result = await updateById('providers', id, updates)
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('telemedicine providers #6:', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
