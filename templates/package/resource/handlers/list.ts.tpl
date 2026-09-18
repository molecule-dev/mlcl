import type { Request, Response } from 'express'
import { findMany } from '@molecule/api-database'

export async function list(req: Request, res: Response): Promise<void> {
  const items = await findMany('{{TABLE_NAME}}')
  res.json(items)
}
