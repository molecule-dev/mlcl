import type { Request, Response } from 'express'
import { t } from '@molecule/app-i18n'
import { updateById } from '@molecule/api-database'

export async function update(req: Request, res: Response): Promise<void> {
  const result = await updateById('{{TABLE_NAME}}', req.params.id, req.body)
  if (!result.data) return res.status(404).json({ error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }) })
  res.json(result.data)
}
