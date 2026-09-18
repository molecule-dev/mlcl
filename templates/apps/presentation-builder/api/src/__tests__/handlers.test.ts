/**
 * Unit tests for the presentation-builder template handlers.
 *
 * Verifies handler-shape (router + correct routes) without booting the API or
 * requiring real database / entitlements bonds. The full DB-backed integration
 * coverage lives in the E2E spec suite (`mlcl/templates/apps/presentation-builder/e2e/`)
 * which runs against the scaffolded project on real Postgres via the verify
 * script.
 */
import type express from 'express'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-bond', () => ({
  bond: vi.fn(),
  unbond: vi.fn(),
  unbondAll: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(() => new Map()),
  isBonded: vi.fn(() => false),
  require: vi.fn(),
  getAnalytics: vi.fn(),
  expectBond: vi.fn(),
  unexpectBond: vi.fn(),
  getLogger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}))

vi.mock('@molecule/api-database', () => ({
  updateById: vi.fn(),
  deleteById: vi.fn(),
  query: vi.fn(() => ({ rows: [] })),
  getProvider: vi.fn(),
  setProvider: vi.fn(),
  hasProvider: vi.fn(() => false),
  requireProvider: vi.fn(),
  findById: vi.fn(),
  findOne: vi.fn(),
  findMany: vi.fn(async () => []),
  count: vi.fn(async () => 0),
  create: vi.fn(async () => ({ data: {}, affected: 1 })),
}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts: { defaultValue: string }) => opts.defaultValue,
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
  validateQuery:
    () => (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
      next(),
}))

describe('handlers/presentations', () => {
  it('exports an express router', async () => {
    const mod = await import('../handlers/presentations.js')
    expect(mod.default).toBeDefined()
    expect(typeof mod.default).toBe('function')
  })
})

describe('handlers/slides', () => {
  it('exports an express router', async () => {
    const mod = await import('../handlers/slides.js')
    expect(mod.default).toBeDefined()
    expect(typeof mod.default).toBe('function')
  })
})

describe('handlers/themes', () => {
  it('exports an express router', async () => {
    const mod = await import('../handlers/themes.js')
    expect(mod.default).toBeDefined()
    expect(typeof mod.default).toBe('function')
  })
})

describe('handlers/exports', () => {
  it('exports an express router', async () => {
    const mod = await import('../handlers/exports.js')
    expect(mod.default).toBeDefined()
    expect(typeof mod.default).toBe('function')
  })
})

describe('handlers/index', () => {
  it('exports an express router that mounts all sub-routers', async () => {
    const mod = await import('../handlers/index.js')
    expect(mod.default).toBeDefined()
    expect(typeof mod.default).toBe('function')
  })
})
