/**
 * `/api/loyalty/me` — current user's loyalty tier, points, and benefit
 * list. Backed by the `loyalty` table (one row per user per year).
 *
 * @module
 */

import { Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { decorateLoyalty } from './_decorate.js'

const router = Router()

router.get('/me', async (_req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const year = new Date().getFullYear()
  const row = await findOne<Record<string, unknown>>('loyalty', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'year', operator: '=', value: year },
  ])
  res.json(decorateLoyalty(row))
})

export default router
