/**
 * Escalation policies handler — ordered notify ladders.
 *
 * A policy is an ordered list of rules; each rule pages one member (or a
 * notification channel — rendered as text, never actually dialed) and then
 * waits wait_minutes before the next rule applies. The incidents handler's
 * /escalate walks these positions; repeat_cycles bounds how often the whole
 * ladder may cycle.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  deleteMany,
  findById,
  findMany,
  updateById,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { loadRoster } from './_roster.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

const ruleSchema = z.object({
  notify_member_id: z.string().uuid().nullable().optional(),
  notify_channel: z.string().max(200).nullable().optional(),
  wait_minutes: z.number().int().min(0).max(1440).optional(),
})

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  repeat_cycles: z.number().int().min(1).max(10).optional(),
  is_active: z.boolean().optional(),
  rules: z.array(ruleSchema).max(20).optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  repeat_cycles: z.number().int().min(1).max(10).optional(),
  is_active: z.boolean().optional(),
  rules: z.array(ruleSchema).max(20).optional(),
})

interface PolicyRow {
  id: string
  user_id: string
  name: string
  description: string
  repeat_cycles: number
  is_active: boolean
}

interface RuleRow {
  id: string
  policy_id: string
  position: number
  notify_member_id: string | null
  notify_channel: string | null
  wait_minutes: number
}

const loadRules = async (userId: string, policyId: string): Promise<RuleRow[]> =>
  findMany<RuleRow>('escalation_rules', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'policy_id', operator: '=', value: policyId },
    ],
    orderBy: [{ field: 'position', direction: 'asc' }],
    limit: 50,
  })

const projectRules = (
  rules: RuleRow[],
  roster: Map<string, { name: string }>,
): Array<Record<string, unknown>> =>
  rules.map((r) => ({
    ...r,
    wait_minutes: Number(r.wait_minutes ?? 0),
    position: Number(r.position ?? 0),
    notify_member_name: r.notify_member_id ? (roster.get(r.notify_member_id)?.name ?? null) : null,
  }))

const loadOwnedPolicy = async (userId: string, id: string): Promise<PolicyRow | null> => {
  const row = await findById<PolicyRow>('escalation_policies', id)
  if (!row || row.user_id !== userId) return null
  return row
}

const writeRules = async (
  userId: string,
  policyId: string,
  rules: Array<z.infer<typeof ruleSchema>>,
): Promise<void> => {
  await deleteMany('escalation_rules', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'policy_id', operator: '=', value: policyId },
  ])
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]!
    await create('escalation_rules', {
      user_id: userId,
      policy_id: policyId,
      position: i,
      notify_member_id: rule.notify_member_id ?? null,
      notify_channel: rule.notify_channel ?? null,
      wait_minutes: rule.wait_minutes ?? 0,
      created_at: new Date(),
    })
  }
}

const countLinkedIncidents = async (userId: string, policyId: string): Promise<number> => {
  const rows = await findMany<{ id: string }>('incidents', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'escalation_policy_id', operator: '=', value: policyId },
    ],
    limit: 200,
    select: ['id'],
  })
  return rows.length
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  await seedDemoForUser(userId)
  const policies = await findMany<PolicyRow>('escalation_policies', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
    limit: 100,
  })
  const roster = await loadRoster(userId)
  const projected = []
  for (const policy of policies) {
    const rules = await loadRules(userId, policy.id)
    projected.push({
      ...policy,
      repeat_cycles: Number(policy.repeat_cycles ?? 1),
      rules: projectRules(rules, roster),
    })
  }
  res.json(projected)
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const body = req.body as z.infer<typeof createSchema>
  const created = await create<PolicyRow>('escalation_policies', {
    user_id: userId,
    name: body.name,
    description: body.description ?? '',
    repeat_cycles: body.repeat_cycles ?? 1,
    is_active: body.is_active ?? true,
    created_at: new Date(),
    updated_at: new Date(),
  })
  const policy = created.data
  if (!policy) {
    return res.status(500).json({
      error: t('policies.createFailed', {}, { defaultValue: 'Could not create policy' }),
    })
  }
  if (body.rules?.length) {
    await writeRules(userId, policy.id, body.rules)
  }
  const roster = await loadRoster(userId)
  res.status(201).json({
    ...policy,
    rules: projectRules(await loadRules(userId, policy.id), roster),
  })
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const policy = await loadOwnedPolicy(userId, id)
  if (!policy) {
    return res
      .status(404)
      .json({ error: t('policies.notFound', {}, { defaultValue: 'Policy not found' }) })
  }
  const linked = await countLinkedIncidents(userId, id)
  const roster = await loadRoster(userId)
  res.json({
    ...policy,
    rules: projectRules(await loadRules(userId, id), roster),
    linked_incidents: linked,
  })
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const policy = await loadOwnedPolicy(userId, id)
  if (!policy) {
    return res
      .status(404)
      .json({ error: t('policies.notFound', {}, { defaultValue: 'Policy not found' }) })
  }
  const body = req.body as z.infer<typeof updateSchema>
  const result = await updateById<PolicyRow>('escalation_policies', id, {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.repeat_cycles !== undefined ? { repeat_cycles: body.repeat_cycles } : {}),
    ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
    updated_at: new Date(),
  })
  if (body.rules !== undefined) {
    await writeRules(userId, id, body.rules)
  }
  const updated = result.data ?? policy
  const roster = await loadRoster(userId)
  res.json({
    ...updated,
    rules: projectRules(await loadRules(userId, id), roster),
  })
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const policy = await loadOwnedPolicy(userId, id)
  if (!policy) {
    return res
      .status(404)
      .json({ error: t('policies.notFound', {}, { defaultValue: 'Policy not found' }) })
  }
  await deleteMany('escalation_rules', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'policy_id', operator: '=', value: id },
  ])
  await deleteById('escalation_policies', id)
  res.status(204).end()
})

export default router
