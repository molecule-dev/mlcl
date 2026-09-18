import type { Request, Response } from 'express'
import { t } from '@molecule/app-i18n'
import { deleteById } from '@molecule/api-database'

export async function del(req: Request, res: Response): Promise<void> {
  const result = await deleteById('{{TABLE_NAME}}', req.params.id)
  if (result.affected === 0) return res.status(404).json({ error: t('resource.error.notFound', undefined, { defaultValue: 'Not found' }) })
  res.status(204).end()
}
