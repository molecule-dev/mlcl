import type { Request, Response } from 'express'
import { create } from '@molecule/api-database'

export async function create(req: Request, res: Response): Promise<void> {
  const data = req.body
  const result = await create('{{TABLE_NAME}}', data)
  res.status(201).json(result.data)
}
