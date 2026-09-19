import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { FamilyTreeLimits } from '../tiers.js'
import {
  buildLifeTimeline,
  deriveRelatives,
  type PersonRecord,
  planRelativeEdges,
  type RelationshipRecord,
  type RelativeRelation,
  sortPeopleByBirth,
} from './_graph.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

const RELATIVE_RELATIONS = ['parent', 'partner', 'child', 'sibling'] as const

const relativeSchema = z.object({
  personId: z.string().uuid(),
  relation: z.enum(RELATIVE_RELATIONS),
})

const personFieldsSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  maiden_name: z.string().optional(),
  gender: z.string().optional(),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'birth_date must be YYYY-MM-DD')
    .optional(),
  birth_place: z.string().optional(),
  death_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'death_date must be YYYY-MM-DD')
    .optional(),
  death_place: z.string().optional(),
  notes: z.string().optional(),
  photo_url: z.string().optional(),
})

const createSchema = personFieldsSchema.extend({
  relative: relativeSchema.optional(),
})

const updateSchema = personFieldsSchema.partial().extend({
  first_name: z.string().min(1).optional(),
})

function unauthorized(res: Response): Response {
  return res.status(401).json({
    error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
  })
}

async function loadPeople(userId: string): Promise<PersonRecord[]> {
  const people = await findMany<PersonRecord>('people', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
  })
  return people
}

async function loadRelationships(userId: string): Promise<RelationshipRecord[]> {
  const rels = await findMany<RelationshipRecord>('relationships', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
  })
  return rels
}

function matchesQuery(p: PersonRecord, q: string): boolean {
  const needle = q.toLowerCase()
  const haystack = [p.first_name, p.last_name, p.maiden_name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}

function displayName(p: PersonRecord): string {
  return [p.first_name, p.last_name].filter(Boolean).join(' ')
}

/**
 * GET /api/people?q=… — every person the caller owns, optional case-insensitive
 * name search (first / last / maiden), oldest-born first.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    await seedDemoForUser(userId)
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    let people = await loadPeople(userId)
    if (q) people = people.filter((p) => matchesQuery(p, q))
    res.json(sortPeopleByBirth(people))
  } catch (error) {
    logger.error('people.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

/**
 * GET /api/people/:id — the person plus relatives grouped by relation type
 * (parents / partners / children / siblings, derived server-side) and a
 * life timeline derived from the graph.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    await seedDemoForUser(userId)
    const id = getParamId(req)
    const person = await findById<PersonRecord>('people', id)
    if (!person || person.user_id !== userId) {
      return res.status(404).json({
        error: t('people.notFound', undefined, { defaultValue: 'Person not found.' }),
      })
    }
    const [people, rels] = await Promise.all([loadPeople(userId), loadRelationships(userId)])
    const relatives = deriveRelatives(id, people, rels)
    const timeline = buildLifeTimeline(person, relatives)
    res.json({ ...person, relatives, timeline })
  } catch (error) {
    logger.error('people.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

const enforcePeopleLimit = enforceLimit<FamilyTreeLimits>({
  limitType: 'maxPeople',
  getLimit: (limits) => limits.maxPeople,
  getCurrent: async (userId) =>
    count('people', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

/**
 * POST /api/people — create a person. With `relative`, also create the
 * implicit-inverse edges (see planRelativeEdges): adding a parent of X links
 * X → new in both directions of reading, adding a sibling shares X's parents,
 * etc. The relative person must belong to the caller.
 */
router.post(
  '/',
  enforcePeopleLimit,
  validateBody(createSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return unauthorized(res)
      const body = req.body as z.infer<typeof createSchema>

      let relativePerson: PersonRecord | null = null
      let existingRels: RelationshipRecord[] = []
      if (body.relative) {
        relativePerson = await findById<PersonRecord>('people', body.relative.personId)
        if (!relativePerson || relativePerson.user_id !== userId) {
          return res.status(404).json({
            error: t('people.relativeNotFound', undefined, {
              defaultValue: 'Relative person not found.',
            }),
          })
        }
        existingRels = await loadRelationships(userId)
      }

      const result = await create('people', {
        user_id: userId,
        first_name: body.first_name,
        last_name: body.last_name ?? null,
        maiden_name: body.maiden_name ?? null,
        gender: body.gender ?? null,
        birth_date: body.birth_date ?? null,
        birth_place: body.birth_place ?? null,
        death_date: body.death_date ?? null,
        death_place: body.death_place ?? null,
        notes: body.notes ?? null,
        photo_url: body.photo_url ?? null,
        created_at: new Date(),
      })
      const created = (result as { data?: Record<string, unknown> }).data ?? result
      const personId = (created as { id?: string }).id
      if (!personId) {
        return res.status(500).json({
          error: t('errors.internalServer', undefined, {
            defaultValue: 'Something went wrong. Please try again.',
          }),
        })
      }

      if (body.relative && relativePerson) {
        const planned = planRelativeEdges(
          personId,
          relativePerson.id,
          body.relative.relation as RelativeRelation,
          existingRels,
        )
        for (const edge of planned) {
          await create('relationships', {
            user_id: userId,
            from_person: edge.from_person,
            to_person: edge.to_person,
            kind: edge.kind,
            created_at: new Date(),
          })
        }
      }

      const [people, rels] = await Promise.all([loadPeople(userId), loadRelationships(userId)])
      const relatives = deriveRelatives(personId, people, rels)
      const fresh = await findById<PersonRecord>('people', personId)
      res.status(201).json({ ...fresh, relatives })
    } catch (error) {
      logger.error('people.handler', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, {
          defaultValue: 'Something went wrong. Please try again.',
        }),
      })
    }
  },
)

/**
 * PUT /api/people/:id — update biographical fields.
 */
router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = getParamId(req)
    const existing = await findById<PersonRecord>('people', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('people.notFound', undefined, { defaultValue: 'Person not found.' }),
      })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const result = await updateById('people', id, { ...body, updatedAt: new Date() })
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('people.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

/**
 * DELETE /api/people/:id — remove the person and every relationship edge that
 * references them (either side). Relatives' own records are untouched.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = getParamId(req)
    const existing = await findById<PersonRecord>('people', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('people.notFound', undefined, { defaultValue: 'Person not found.' }),
      })
    }
    const touching = await findMany<RelationshipRecord>('relationships', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    for (const rel of touching) {
      if (rel.from_person === id || rel.to_person === id) {
        await deleteById('relationships', rel.id)
      }
    }
    await deleteById('people', id)
    res.status(204).end()
  } catch (error) {
    logger.error('people.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export { displayName, matchesQuery }
export default router
