/**
 * tests handler — assertion suites attached to a saved request.
 *
 * Assertions evaluate against the most recent execution; the run endpoint
 * loads the latest history row for the parent request, evaluates each
 * assertion, and returns pass/fail breakdown.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const ASSERTION_OPS = [
  'equals',
  'notEquals',
  'contains',
  'exists',
  'matches',
  'lt',
  'lte',
  'gt',
  'gte',
] as const

const assertionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(ASSERTION_OPS),
  expected: z.unknown().optional(),
})

const createTestSchema = z.object({
  request_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255),
  assertions: z.array(assertionSchema).optional(),
})

const updateTestSchema = createTestSchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'updated_at', direction: 'desc' }]
    const rows = await findMany('tests', { where, orderBy })
    res.json(rows)
  } catch (error) {
    logger.error('tests.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const row = await findById<Record<string, unknown>>('tests', getParamId(req))
    if (!row || row.user_id !== userId) {
      return res.status(404).json({ error: t('tests.notFound') })
    }
    res.json(row)
  } catch (error) {
    logger.error('tests.getById', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createTestSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const result = await create('tests', {
      user_id: userId,
      request_id: req.body.request_id ?? null,
      name: req.body.name,
      assertions: JSON.stringify(req.body.assertions ?? []),
      last_run_at: null,
      last_status: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error('tests.create', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id', validateBody(updateTestSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('tests', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('tests.notFound') })
    }
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (req.body.name !== undefined) updates.name = req.body.name
    if (req.body.request_id !== undefined) updates.request_id = req.body.request_id
    if (req.body.assertions !== undefined) {
      updates.assertions = JSON.stringify(req.body.assertions)
    }
    const result = await updateById('tests', id, updates)
    res.json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error('tests.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

interface AssertionInput {
  field: string
  operator: (typeof ASSERTION_OPS)[number]
  expected?: unknown
}

function pickField(payload: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = payload
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function evalAssertion(payload: Record<string, unknown>, a: AssertionInput): boolean {
  const value = pickField(payload, a.field)
  switch (a.operator) {
    case 'equals':
      return value === a.expected
    case 'notEquals':
      return value !== a.expected
    case 'contains':
      return typeof value === 'string' && value.includes(String(a.expected))
    case 'exists':
      return value !== undefined && value !== null
    case 'matches':
      try {
        return typeof value === 'string' && new RegExp(String(a.expected)).test(value)
      } catch (_error) {
        // invalid regex pattern — treat as non-match
        return false
      }
    case 'lt':
      return typeof value === 'number' && typeof a.expected === 'number' && value < a.expected
    case 'lte':
      return typeof value === 'number' && typeof a.expected === 'number' && value <= a.expected
    case 'gt':
      return typeof value === 'number' && typeof a.expected === 'number' && value > a.expected
    case 'gte':
      return typeof value === 'number' && typeof a.expected === 'number' && value >= a.expected
    default:
      return false
  }
}

router.post('/:id/run', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const test = await findById<Record<string, unknown>>('tests', id)
    if (!test || test.user_id !== userId) {
      return res.status(404).json({ error: t('tests.notFound') })
    }
    let assertions: AssertionInput[]
    try {
      assertions = JSON.parse((test.assertions as string) || '[]') as AssertionInput[]
    } catch (_error) {
      // malformed assertions JSON — treat as no assertions
      assertions = []
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (test.request_id) {
      where.push({ field: 'request_id', operator: '=', value: test.request_id as string })
    }
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const recent = await findMany<Record<string, unknown>>('history', { where, orderBy, limit: 1 })
    const row = recent?.[0] ?? null
    let parsedBody: unknown = null
    try {
      parsedBody = JSON.parse((row?.response_body as string) || 'null')
    } catch (_error) {
      // response body is not JSON — use it as-is
      parsedBody = row?.response_body ?? null
    }
    const payload: Record<string, unknown> = {
      status: row?.status_code ?? 0,
      duration_ms: row?.duration_ms ?? 0,
      body: parsedBody,
      response: parsedBody,
    }
    const results = assertions.map((a) => ({ ...a, passed: evalAssertion(payload, a) }))
    const allPassed = results.every((r) => r.passed)
    const status = allPassed ? 'passed' : 'failed'
    await updateById('tests', id, {
      last_run_at: new Date(),
      last_status: status,
      last_results: JSON.stringify(results),
      updated_at: new Date(),
    })
    res.json({ status, results, ranAt: new Date().toISOString() })
  } catch (error) {
    logger.error('tests.run', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('tests', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('tests.notFound') })
    }
    await deleteById('tests', id)
    res.status(204).end()
  } catch (error) {
    logger.error('tests.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
