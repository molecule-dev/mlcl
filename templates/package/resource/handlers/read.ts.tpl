import type { Request, Response } from 'express'
import { t } from '@molecule/app-i18n'
import { findById } from '@molecule/api-database'

export async function read(req: Request, res: Response): Promise<void> {
  const item = await findById('{{TABLE_NAME}}', req.params.id)
  if (!item) return res.status(404).json({ error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }) })
  res.json(item)
}
