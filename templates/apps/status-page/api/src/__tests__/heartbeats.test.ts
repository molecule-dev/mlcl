import { beforeEach, describe, expect, it, vi } from 'vitest'

// Heartbeat (dead-man's-switch) monitors.
//
// The URL poller answers "is the target down?". These cover the half it cannot:
// "did monitoring itself die?" — where silence is the alarm condition. The cases
// that matter are the ones where a wrong answer is SILENT: a never-beaten
// monitor that reads as healthy, or an overdue one that never alarms, both leave
// a page that is green while nothing is watching.

const COMPONENT_ID = '44444444-4444-4444-4444-444444444444'
const USER_ID = '55555555-5555-5555-5555-555555555555'
const KEY = 'b3f1c0de-0000-4000-8000-000000000001'

const db = vi.hoisted(() => ({
  create: vi.fn(async () => ({ data: null, affected: 1 })),
  findMany: vi.fn(async () => [] as unknown[]),
  updateById: vi.fn(async () => ({ data: null, affected: 1 })),
}))

vi.mock('@molecule/api-database', () => db)
vi.mock('@molecule/api-logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('../handlers/_audit.js', () => ({ writeAuditLog: vi.fn(async () => undefined) }))

const { recordHeartbeat, runHeartbeatChecks } = await import('../lib/heartbeats.js')

/** A heartbeat-configured component, `secondsAgo` since its last beat. */
const component = (overrides: Record<string, unknown> = {}) => ({
  id: COMPONENT_ID,
  user_id: USER_ID,
  name: 'Alertmanager',
  status: 'operational',
  heartbeat_key: KEY,
  heartbeat_interval_seconds: 60,
  last_heartbeat_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

const agoISO = (seconds: number) => new Date(Date.now() - seconds * 1000).toISOString()

beforeEach(() => {
  vi.resetAllMocks()
  db.create.mockResolvedValue({ data: null, affected: 1 })
  db.updateById.mockResolvedValue({ data: null, affected: 1 })
  db.findMany.mockResolvedValue([])
  delete process.env.STATUS_HEARTBEAT_GRACE_MS
})

describe('recordHeartbeat', () => {
  it('stamps the component and reports success', async () => {
    db.findMany.mockResolvedValue([component()])

    await expect(recordHeartbeat(KEY)).resolves.toBe(true)

    expect(db.updateById).toHaveBeenCalledWith(
      'status_components',
      COMPONENT_ID,
      expect.objectContaining({ last_heartbeat_at: expect.any(String) }),
    )
  })

  it('returns false for an unknown key instead of throwing', async () => {
    db.findMany.mockResolvedValue([])

    await expect(recordHeartbeat('not-a-real-key')).resolves.toBe(false)
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('looks the key up as a where-condition, never a bare-key filter', async () => {
    db.findMany.mockResolvedValue([component()])

    await recordHeartbeat(KEY)

    expect(db.findMany).toHaveBeenCalledWith(
      'status_components',
      expect.objectContaining({
        where: [{ field: 'heartbeat_key', operator: '=', value: KEY }],
      }),
    )
  })

  it('brings a downed component back up as soon as a beat arrives', async () => {
    db.findMany.mockResolvedValue([component({ status: 'major_outage' })])

    await recordHeartbeat(KEY)

    expect(db.updateById).toHaveBeenCalledWith('status_components', COMPONENT_ID, {
      status: 'operational',
    })
    expect(db.create).toHaveBeenCalledWith(
      'component_status_history',
      expect.objectContaining({ status: 'operational' }),
    )
  })
})

describe('runHeartbeatChecks', () => {
  it('marks an overdue component as a major outage', async () => {
    db.findMany.mockResolvedValue([component({ last_heartbeat_at: agoISO(600) })])

    await runHeartbeatChecks()

    expect(db.updateById).toHaveBeenCalledWith('status_components', COMPONENT_ID, {
      status: 'major_outage',
    })
  })

  it('leaves a component that beat within its interval alone', async () => {
    db.findMany.mockResolvedValue([component({ last_heartbeat_at: agoISO(5) })])

    await runHeartbeatChecks()

    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('does not alarm inside the grace window', async () => {
    // 70s since the last beat, 60s interval, 30s grace => 70 < 90, still healthy.
    db.findMany.mockResolvedValue([component({ last_heartbeat_at: agoISO(70) })])

    await runHeartbeatChecks()

    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('gives a never-beaten monitor one interval, then alarms', async () => {
    // Freshly configured: no beat yet, but only 10s old — must NOT page.
    db.findMany.mockResolvedValue([component({ last_heartbeat_at: null, updated_at: agoISO(10) })])
    await runHeartbeatChecks()
    expect(db.updateById).not.toHaveBeenCalled()

    // Same monitor, long past its interval and still silent — "it never reported"
    // is a failure, not an exemption.
    vi.resetAllMocks()
    db.create.mockResolvedValue({ data: null, affected: 1 })
    db.updateById.mockResolvedValue({ data: null, affected: 1 })
    db.findMany.mockResolvedValue([component({ last_heartbeat_at: null, updated_at: agoISO(600) })])

    await runHeartbeatChecks()

    expect(db.updateById).toHaveBeenCalledWith('status_components', COMPONENT_ID, {
      status: 'major_outage',
    })
  })

  it('never flips a component out of an operator-declared maintenance window', async () => {
    db.findMany.mockResolvedValue([
      component({ status: 'under_maintenance', last_heartbeat_at: agoISO(9999) }),
    ])

    await runHeartbeatChecks()

    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('ignores components with no heartbeat configured', async () => {
    db.findMany.mockResolvedValue([
      component({ heartbeat_key: null, last_heartbeat_at: agoISO(9999) }),
    ])

    await runHeartbeatChecks()

    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('skips (and does not crash on) a key with an unusable interval', async () => {
    db.findMany.mockResolvedValue([
      component({ heartbeat_interval_seconds: 0, last_heartbeat_at: agoISO(9999) }),
    ])

    await expect(runHeartbeatChecks()).resolves.toBeUndefined()
    expect(db.updateById).not.toHaveBeenCalled()
  })

  it('keeps sweeping after one component fails to write', async () => {
    const OTHER = '66666666-6666-6666-6666-666666666666'
    db.findMany.mockResolvedValue([
      component({ last_heartbeat_at: agoISO(600) }),
      component({ id: OTHER, heartbeat_key: 'other-key', last_heartbeat_at: agoISO(600) }),
    ])
    db.updateById.mockRejectedValueOnce(new Error('transient write failure'))

    await runHeartbeatChecks()

    // The second component still got its transition despite the first throwing.
    expect(db.updateById).toHaveBeenCalledWith('status_components', OTHER, {
      status: 'major_outage',
    })
  })
})
