import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { decrypt } from '@molecule/api-encryption'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listFindingsQuery = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  dismissed: z.enum(['true', 'false']).optional(),
})

const dismissSchema = z.object({
  dismissed: z.boolean().default(true),
})

const WEAK_PATTERNS = ['password', '123456', 'qwerty', 'letmein', 'admin', 'welcome']

function isWeak(plain: string): boolean {
  if (plain.length < 8) return true
  const lower = plain.toLowerCase()
  return WEAK_PATTERNS.some((p) => lower.includes(p))
}

// Recompute findings for the current user's items (idempotent — clears
// previous undismissed findings for the same kind/item before inserting).
router.post('/refresh', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [
      { field: 'owner_id', operator: '=', value: userId },
      { field: 'is_trashed', operator: '=', value: false },
    ]
    const items = (await findMany('vault_items', { where })) as Array<Record<string, unknown>>

    const seenPasswords = new Map<string, string[]>()
    const findings: Array<{ kind: string; severity: string; item_id: string }> = []

    for (const item of items) {
      const enc = item.encrypted_password
      if (typeof enc !== 'string' || !enc) continue
      let plain: string
      try {
        plain = await decrypt(enc)
      } catch (error) {
        // decryption failed for this item (corrupt/missing key) — skip it,
        // but leave an observable trace so silent vault rot is visible
        logger.warn('security.findings.decrypt_skip', error)
        continue
      }
      if (isWeak(plain)) {
        findings.push({ kind: 'weak', severity: 'high', item_id: String(item.id) })
      }
      const list = seenPasswords.get(plain) ?? []
      list.push(String(item.id))
      seenPasswords.set(plain, list)
    }

    for (const list of seenPasswords.values()) {
      if (list.length > 1) {
        for (const itemId of list) {
          findings.push({ kind: 'reused', severity: 'medium', item_id: itemId })
        }
      }
    }

    const created: unknown[] = []
    const now = new Date().toISOString()
    for (const f of findings) {
      const result = await create('security_findings', {
        owner_id: userId,
        item_id: f.item_id,
        kind: f.kind,
        severity: f.severity,
        detected_at: now,
        dismissed: false,
      })
      created.push(result.data)
    }
    res.json({ findings: created })
  } catch (error) {
    logger.error('security.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/findings', validateQuery(listFindingsQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { severity, dismissed } = req.query as unknown as z.infer<typeof listFindingsQuery>
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (severity) where.push({ field: 'severity', operator: '=', value: severity })
    if (dismissed !== undefined)
      where.push({ field: 'dismissed', operator: '=', value: dismissed === 'true' })
    const findings = await findMany('security_findings', {
      where,
      orderBy: [{ field: 'detected_at', direction: 'desc' }],
    })
    res.json(findings)
  } catch (error) {
    logger.error('security.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/findings/:id', validateBody(dismissSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<{ owner_id: string }>('security_findings', id)
    if (!existing || existing.owner_id !== userId) {
      res
        .status(404)
        .json({ error: t('finding.notFound', {}, { defaultValue: 'Finding not found' }) })
      return
    }
    const result = await updateById('security_findings', id, { dismissed: req.body.dismissed })
    res.json(result.data)
  } catch (error) {
    logger.error('security.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/findings/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<{ owner_id: string }>('security_findings', id)
    if (!existing || existing.owner_id !== userId) {
      res
        .status(404)
        .json({ error: t('finding.notFound', {}, { defaultValue: 'Finding not found' }) })
      return
    }
    await deleteById('security_findings', id)
    res.status(204).end()
  } catch (error) {
    logger.error('security.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
