/**
 * Trusted devices handler — exposes the rows of the shared `devices`
 * table (created by `@molecule/api-resource-device`) as an audit-style
 * "trusted devices" list for the Settings page.
 *
 * The Settings UI only needs id, display name, and last-seen timestamp.
 * Push subscription internals stay server-side.
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface DeviceRow {
  id: string
  userId: string
  name: string | null
  pushPlatform: string | null
  updatedAt: string | Date | null
  createdAt: string | Date | null
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const where: WhereCondition[] = [{ field: 'userId', operator: '=', value: userId }]
    const rows = await findMany<DeviceRow>('devices', {
      where,
      orderBy: [{ field: 'updatedAt', direction: 'desc' }],
    }).catch(() => [])

    const currentDeviceId = String(req.headers['x-device-id'] ?? '')

    const data = rows.map((row) => ({
      id: row.id,
      name:
        row.name ??
        (row.pushPlatform === 'web'
          ? t('settings.devices.webBrowser', {}, { defaultValue: 'Web browser' })
          : t('settings.devices.unnamed', {}, { defaultValue: 'Unnamed device' })),
      last_seen_iso: new Date(row.updatedAt ?? row.createdAt ?? Date.now()).toISOString(),
      current: row.id === currentDeviceId,
    }))

    res.json({ data, total: data.length })
  } catch (err) {
    logger.error('trusted_devices.list', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
