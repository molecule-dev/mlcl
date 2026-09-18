import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// POST /automations/:id/trigger used to write a hardcoded success log and bump
// execution_count without ever running the automation's stored `actions` — so
// "Test now" (and any real trigger) changed nothing on the devices. The trigger
// must execute each action: device.on / device.off / device.update (merging
// `properties`) and scene.activate (running the scene's device states).

const db = {
  findById: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
  findMany: vi.fn((..._a: unknown[]) => [] as unknown[]),
  deleteById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  create: (...a: unknown[]) => db.create(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  getParamId: (req: { params?: Record<string, string> }) => req.params?.id ?? '',
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/automations.js'

function triggerHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/trigger' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /:id/trigger not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}

const makeRes = () => ({ json: vi.fn(), status: vi.fn().mockReturnThis() }) as unknown as Response
const run = (id = 'aut-1') => triggerHandler()({ params: { id } } as unknown as Request, makeRes())

const logStatus = () =>
  (db.create.mock.calls.find((c) => c[0] === 'automation_logs')?.[1] as { status?: string })?.status
const deviceEvents = () =>
  db.create.mock.calls
    .filter((c) => c[0] === 'device_events')
    .map((c) => c[1] as Record<string, unknown>)
const deviceUpdate = (id: string) =>
  db.updateById.mock.calls.find((c) => c[0] === 'iot_devices' && c[1] === id)?.[2] as
    Record<string, unknown> | undefined

function seed(opts: {
  automation: Record<string, unknown>
  devices?: Record<string, Record<string, unknown>>
  scenes?: Record<string, Record<string, unknown>>
}) {
  const { automation, devices = {}, scenes = {} } = opts
  db.findById.mockImplementation((table: string, id: string) => {
    if (table === 'automations') return Promise.resolve(automation)
    if (table === 'iot_devices') return Promise.resolve(devices[id] ?? null)
    if (table === 'scenes') return Promise.resolve(scenes[id] ?? null)
    return Promise.resolve(null)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: { id: 'x' } })
  db.updateById.mockResolvedValue({ data: {} })
})

describe('automation trigger executes stored actions', () => {
  it('turns a device on, merges properties, and still bumps execution_count', async () => {
    seed({
      automation: {
        id: 'aut-1',
        user_id: 'u1',
        actions: [{ type: 'device.on', device_id: 'dev-1', properties: { brightness: 70 } }],
        execution_count: 1,
      },
      devices: {
        'dev-1': { id: 'dev-1', user_id: 'u1', is_on: false, properties: { color: 'warm' } },
      },
    })
    await run()
    expect(deviceUpdate('dev-1')).toMatchObject({
      is_on: true,
      properties: JSON.stringify({ color: 'warm', brightness: 70 }),
    })
    expect(deviceEvents()[0]).toMatchObject({
      device_id: 'dev-1',
      triggered_by: 'automation',
      automation_id: 'aut-1',
      event_type: 'turned_on',
    })
    expect(db.updateById.mock.calls.find((c) => c[0] === 'automations')?.[2]).toMatchObject({
      execution_count: 2,
    })
    expect(logStatus()).toBe('success')
  })

  it('turns a device off', async () => {
    seed({
      automation: { id: 'a', user_id: 'u1', actions: [{ type: 'device.off', device_id: 'dev-2' }] },
      devices: { 'dev-2': { id: 'dev-2', user_id: 'u1', is_on: true, properties: {} } },
    })
    await run('a')
    expect(deviceUpdate('dev-2')).toMatchObject({ is_on: false })
    expect(deviceEvents()[0]).toMatchObject({ event_type: 'turned_off' })
    expect(logStatus()).toBe('success')
  })

  it('updates device properties without toggling power', async () => {
    seed({
      automation: {
        id: 'a',
        user_id: 'u1',
        actions: [{ type: 'device.update', device_id: 'dev-t', properties: { target_temp_f: 64 } }],
      },
      devices: {
        'dev-t': { id: 'dev-t', user_id: 'u1', is_on: true, properties: { target_temp_f: 72 } },
      },
    })
    await run('a')
    const upd = deviceUpdate('dev-t')
    expect(upd).not.toHaveProperty('is_on')
    expect(upd).toMatchObject({ properties: JSON.stringify({ target_temp_f: 64 }) })
    expect(deviceEvents()[0]).toMatchObject({ event_type: 'updated' })
  })

  it('activates a scene by running its device states', async () => {
    seed({
      automation: {
        id: 'a',
        user_id: 'u1',
        actions: [{ type: 'scene.activate', scene_id: 'scn-1' }],
      },
      devices: { 'dev-a': { id: 'dev-a', user_id: 'u1', is_on: true, properties: {} } },
      scenes: {
        'scn-1': {
          id: 'scn-1',
          user_id: 'u1',
          device_states: [{ device_id: 'dev-a', is_on: false }],
        },
      },
    })
    await run('a')
    expect(deviceUpdate('dev-a')).toMatchObject({ is_on: false })
    expect(
      deviceEvents().some((e) => e.device_id === 'dev-a' && e.triggered_by === 'automation'),
    ).toBe(true)
    expect(logStatus()).toBe('success')
  })

  it('logs error when an action targets a device the user does not own', async () => {
    seed({
      automation: { id: 'a', user_id: 'u1', actions: [{ type: 'device.off', device_id: 'ghost' }] },
    })
    await run('a')
    expect(logStatus()).toBe('error')
    expect(db.create.mock.calls.find((c) => c[0] === 'automation_logs')?.[1]).toMatchObject({
      error_message: expect.any(String),
    })
  })

  it('treats an unknown action type (notify) as a no-op, not a failure', async () => {
    seed({
      automation: { id: 'a', user_id: 'u1', actions: [{ type: 'notify', target: 'push' }] },
    })
    await run('a')
    expect(db.updateById.mock.calls.some((c) => c[0] === 'iot_devices')).toBe(false)
    expect(logStatus()).toBe('success')
  })

  it('parses actions stored as a JSON string', async () => {
    seed({
      automation: {
        id: 'a',
        user_id: 'u1',
        actions: JSON.stringify([{ type: 'device.on', device_id: 'dev-1' }]),
      },
      devices: { 'dev-1': { id: 'dev-1', user_id: 'u1', is_on: false, properties: {} } },
    })
    await run('a')
    expect(deviceUpdate('dev-1')).toMatchObject({ is_on: true })
  })

  it('resolves device.on via the `target` alias when device_id is absent', async () => {
    seed({
      automation: { id: 'a', user_id: 'u1', actions: [{ type: 'device_on', target: 'dev-1' }] },
      devices: { 'dev-1': { id: 'dev-1', user_id: 'u1', is_on: false, properties: {} } },
    })
    await run('a')
    expect(deviceUpdate('dev-1')).toMatchObject({ is_on: true })
  })
})
