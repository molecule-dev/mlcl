/**
 * Schedule re-arming tests for PUT /workflows/:id.
 *
 * Proves the live-edit contract: editing `cron_expression` (or changing
 * `trigger_type`) on an ENABLED scheduled workflow cancels the registered
 * in-process cron job and re-registers it against the NEW definition —
 * previously the update handler only wrote the DB row, so the old cron kept
 * firing forever (and a trigger_type change away from 'schedule' never
 * stopped it).
 *
 * The workflows router runs on a real (ephemeral) Express server; the data
 * layer, cron bond, i18n, validation, and auth are mocked so the
 * cancel/re-register logic (including the job-id bookkeeping in
 * `scheduledJobIds`) is exercised for real — ownership checks go through the
 * REAL `requireWorkflowOwnership`, which reads the mocked `findById`.
 */

import type { Server } from 'node:http'

import express, { type NextFunction, type Request, type Response } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import workflowsRouter from '../handlers/workflows.js'

// Mutable in-memory data layer + cron journal, shared with the mocks below
// via vi.hoisted so each test can shape the workflow row it needs.
const harness = vi.hoisted(() => {
  const state: {
    workflow: Record<string, unknown> | null
    nextJobId: number
  } = { workflow: null, nextJobId: 1 }
  return { state }
})

const cronMocks = vi.hoisted(() => ({
  schedule: vi.fn(async (_name: string, _cron: string, _cb: () => Promise<void>) => {
    return `job-${harness.state.nextJobId++}`
  }),
  cancel: vi.fn(async (_jobId: string) => undefined),
}))

vi.mock('@molecule/api-cron', () => ({
  schedule: cronMocks.schedule,
  cancel: cronMocks.cancel,
}))

vi.mock('@molecule/api-database', () => ({
  findById: vi.fn(async (table: string, id: string) =>
    table === 'workflows' && harness.state.workflow?.id === id ? harness.state.workflow : null,
  ),
  findMany: vi.fn(async (table: string) => {
    if (table === 'workflows' && harness.state.workflow) return [harness.state.workflow]
    return []
  }),
  findOne: vi.fn(async () => null),
  count: vi.fn(async () => 0),
  create: vi.fn(async (_table: string, data: Record<string, unknown>) => ({
    data: { id: 'row-1', ...data },
  })),
  deleteById: vi.fn(async () => ({ data: null })),
  updateById: vi.fn(async (table: string, _id: string, data: Record<string, unknown>) => {
    if (table === 'workflows' && harness.state.workflow) {
      harness.state.workflow = { ...harness.state.workflow, ...data }
    }
    return { data: harness.state.workflow }
  }),
}))

vi.mock('@molecule/api-ai', () => ({
  hasProvider: vi.fn(() => false),
  requireProvider: vi.fn(),
}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
    options?.defaultValue ?? key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-resource-user', () => ({
  authorizers: {
    auth: () => (req: Request, res: Response, next: NextFunction) => {
      res.locals.session = { userId: req.header('x-test-user') ?? 'user-1' }
      next()
    },
  },
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/workflows', workflowsRouter)
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })
})

beforeEach(() => {
  cronMocks.schedule.mockClear()
  cronMocks.cancel.mockClear()
  harness.state.nextJobId = 1
  harness.state.workflow = {
    id: 'wf-1',
    user_id: 'user-1',
    name: 'nightly digest',
    description: '',
    trigger_type: 'schedule',
    cron_expression: '0 3 * * *',
    condition_prompt: '',
    enabled: false,
    run_count: 0,
    success_count: 0,
    failure_count: 0,
  }
})

async function toggle(): Promise<number> {
  const res = await fetch(`${baseUrl}/workflows/wf-1/toggle`, {
    method: 'PATCH',
    headers: { 'x-test-user': 'user-1' },
  })
  return res.status
}

async function putWorkflow(body: Record<string, unknown>): Promise<number> {
  const res = await fetch(`${baseUrl}/workflows/wf-1`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-test-user': 'user-1' },
    body: JSON.stringify(body),
  })
  return res.status
}

/** Enable via the real toggle route so `scheduledJobIds` holds the job id. */
async function enableScheduled(): Promise<string> {
  expect(await toggle()).toBe(200)
  expect(cronMocks.schedule).toHaveBeenCalledTimes(1)
  const jobId = await cronMocks.schedule.mock.results[0]!.value
  cronMocks.schedule.mockClear()
  return jobId as string
}

describe('PUT /workflows/:id — schedule re-arming on live edits', () => {
  it('editing cron_expression on an ENABLED scheduled workflow cancels the old job and re-registers with the new expression', async () => {
    const oldJobId = await enableScheduled()

    expect(await putWorkflow({ cron_expression: '*/5 * * * *' })).toBe(200)

    // The ORIGINAL job id (not the name) is cancelled…
    expect(cronMocks.cancel).toHaveBeenCalledTimes(1)
    expect(cronMocks.cancel).toHaveBeenCalledWith(oldJobId)
    // …and a fresh job is registered against the NEW expression.
    expect(cronMocks.schedule).toHaveBeenCalledTimes(1)
    expect(cronMocks.schedule).toHaveBeenCalledWith(
      'workflow-wf-1',
      '*/5 * * * *',
      expect.any(Function),
    )
  })

  it('the re-registered job id replaces the old one in the bookkeeping (disable cancels the NEW id)', async () => {
    await enableScheduled()
    expect(await putWorkflow({ cron_expression: '*/5 * * * *' })).toBe(200)
    const newJobId = await cronMocks.schedule.mock.results[0]!.value
    cronMocks.cancel.mockClear()

    // Disable through the real toggle: it must cancel the REPLACEMENT job.
    expect(await toggle()).toBe(200)
    expect(cronMocks.cancel).toHaveBeenCalledTimes(1)
    expect(cronMocks.cancel).toHaveBeenCalledWith(newJobId)
  })

  it('changing trigger_type away from "schedule" while enabled cancels the job and does NOT re-register', async () => {
    const oldJobId = await enableScheduled()

    expect(await putWorkflow({ trigger_type: 'manual' })).toBe(200)

    expect(cronMocks.cancel).toHaveBeenCalledTimes(1)
    expect(cronMocks.cancel).toHaveBeenCalledWith(oldJobId)
    expect(cronMocks.schedule).not.toHaveBeenCalled()
  })

  it('changing trigger_type TO "schedule" while enabled registers the cron', async () => {
    harness.state.workflow = {
      ...harness.state.workflow!,
      trigger_type: 'manual',
      enabled: true,
    }

    expect(await putWorkflow({ trigger_type: 'schedule', cron_expression: '0 * * * *' })).toBe(200)

    expect(cronMocks.schedule).toHaveBeenCalledTimes(1)
    expect(cronMocks.schedule).toHaveBeenCalledWith(
      'workflow-wf-1',
      '0 * * * *',
      expect.any(Function),
    )
  })

  it('clearing cron_expression (null) while enabled cancels without re-registering', async () => {
    const oldJobId = await enableScheduled()

    expect(await putWorkflow({ cron_expression: null })).toBe(200)

    expect(cronMocks.cancel).toHaveBeenCalledTimes(1)
    expect(cronMocks.cancel).toHaveBeenCalledWith(oldJobId)
    expect(cronMocks.schedule).not.toHaveBeenCalled()
  })

  it('an unrelated edit (name only) on an enabled scheduled workflow touches NO cron state', async () => {
    await enableScheduled()
    cronMocks.cancel.mockClear()

    expect(await putWorkflow({ name: 'renamed digest' })).toBe(200)

    expect(cronMocks.cancel).not.toHaveBeenCalled()
    expect(cronMocks.schedule).not.toHaveBeenCalled()
  })

  it('editing cron_expression on a DISABLED workflow schedules nothing', async () => {
    // enabled stays false (beforeEach default) — nothing is armed.
    expect(await putWorkflow({ cron_expression: '*/5 * * * *' })).toBe(200)

    expect(cronMocks.cancel).not.toHaveBeenCalled()
    expect(cronMocks.schedule).not.toHaveBeenCalled()
  })
})

describe('cron trigger_type is a synonym for schedule (previously inert)', () => {
  it('enabling a trigger_type=cron workflow arms the cron job', async () => {
    harness.state.workflow!.trigger_type = 'cron'
    expect(await toggle()).toBe(200)
    expect(cronMocks.schedule).toHaveBeenCalledTimes(1)
    expect(cronMocks.schedule).toHaveBeenCalledWith(
      expect.stringContaining('workflow-wf-1'),
      '0 3 * * *',
      expect.any(Function),
    )
  })

  it('disabling a trigger_type=cron workflow cancels its job', async () => {
    harness.state.workflow!.trigger_type = 'cron'
    const jobId = await enableScheduled()
    expect(await toggle()).toBe(200) // toggle again → disable
    expect(cronMocks.cancel).toHaveBeenCalledWith(jobId)
  })
})
