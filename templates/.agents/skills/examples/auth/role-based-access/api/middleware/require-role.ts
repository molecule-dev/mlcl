import type { NextFunction, Request, Response } from 'express'

import { t } from '@molecule/api-i18n'

export const ROLES = ['viewer', 'member', 'editor', 'admin'] as const
export type Role = (typeof ROLES)[number]

function rank(role: Role | undefined): number {
  if (!role) return -1
  return ROLES.indexOf(role)
}

export function requireRole(min: Role) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const userRole = res.locals.session?.role as Role | undefined
    if (rank(userRole) < rank(min)) {
      res.status(403).json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden' }) })
      return
    }
    next()
  }
}

export function requireAnyRole(...allowed: Role[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const userRole = res.locals.session?.role as Role | undefined
    if (!userRole || !allowed.includes(userRole)) {
      res.status(403).json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden' }) })
      return
    }
    next()
  }
}
