/**
 * Regression tests for PASS-6 broken-access-control findings on PHI writes:
 *
 *   P5TPL-1 — consultations.create trusted a client-supplied patient/provider
 *             id, letting any user fabricate a consultation targeting an
 *             arbitrary patient.
 *   P5TPL-2 — prescriptions.create trusted a client-supplied patient_user_id,
 *             letting any user inject prescriptions into an arbitrary patient's
 *             medical record.
 *
 * These assert the handlers now FAIL CLOSED — identity is derived from the
 * session and an existing relationship, never from the request body — while
 * the legitimate flows still succeed.
 */
import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-database', () => ({
  create: vi.fn(async () => ({ data: { id: 'new-row' } })),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(async () => ({ data: {} })),
  count: vi.fn(async () => 0),
  query: vi.fn(async () => ({ rows: [] })),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

import { create, findById, findMany } from '@molecule/api-database'

import consultationsRouter from '../handlers/consultations.js'
import portalRouter from '../handlers/portal.js'
import prescriptionsRouter from '../handlers/prescriptions.js'

type RouteLayer = {
  route?: {
    path: string
    methods: Record<string, boolean>
    stack: { handle: (req: Request, res: Response) => unknown }[]
  }
}

/** Pull the final (real) handler for `method path` out of an Express router. */
function getHandler(
  router: unknown,
  method: string,
  path: string,
): (req: Request, res: Response) => Promise<unknown> {
  const stack = (router as { stack: RouteLayer[] }).stack
  for (const layer of stack) {
    const route = layer.route
    if (route && route.path === path && route.methods[method]) {
      const handle = route.stack[route.stack.length - 1].handle
      return handle as (req: Request, res: Response) => Promise<unknown>
    }
  }
  throw new Error(`handler not found: ${method} ${path}`)
}

interface MockRes {
  locals: { session?: { userId: string } }
  statusCode: number
  body: unknown
  status(code: number): MockRes
  json(payload: unknown): MockRes
}

function mockReqRes(userId: string | null, body: Record<string, unknown>) {
  const req = { body, params: {}, query: {} } as unknown as Request
  const res: MockRes = {
    locals: { session: userId ? { userId } : undefined },
    statusCode: 200,
    body: undefined,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(payload: unknown) {
      res.body = payload
      return res
    },
  }
  return { req, res: res as unknown as Response & MockRes }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(create).mockResolvedValue({ data: { id: 'new-row' } } as never)
})

describe('P5TPL-1 — consultations.create access control', () => {
  const create_ = getHandler(consultationsRouter, 'post', '/')

  it('rejects a patient fabricating a consultation for another patient', async () => {
    // The referenced appointment belongs to `victim` + `doc`; the attacker is
    // not a participant yet supplies the victim as patient_user_id.
    vi.mocked(findById).mockResolvedValue({
      patient_user_id: 'victim',
      provider_user_id: 'doc',
      provider_id: 'prov-1',
    } as never)
    const { req, res } = mockReqRes('attacker', {
      appointment_id: 'appt-1',
      provider_id: 'prov-1',
      patient_user_id: 'victim',
    })

    await create_(req, res)

    expect((res as unknown as { statusCode: number }).statusCode).toBe(403)
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects client-supplied ids that disagree with the appointment', async () => {
    vi.mocked(findById).mockResolvedValue({
      patient_user_id: 'patient-1',
      provider_user_id: 'doc',
      provider_id: 'prov-1',
    } as never)
    // Patient is a participant but tries to forge a different patient id.
    const { req, res } = mockReqRes('patient-1', {
      appointment_id: 'appt-1',
      provider_id: 'prov-1',
      patient_user_id: 'someone-else',
    })

    await create_(req, res)

    expect((res as unknown as { statusCode: number }).statusCode).toBe(403)
    expect(create).not.toHaveBeenCalled()
  })

  it('allows a real participant and derives both parties from the appointment', async () => {
    vi.mocked(findById).mockResolvedValue({
      patient_user_id: 'patient-1',
      provider_user_id: 'doc',
      provider_id: 'prov-1',
    } as never)
    const { req, res } = mockReqRes('patient-1', {
      appointment_id: 'appt-1',
      provider_id: 'prov-1',
    })

    await create_(req, res)

    expect((res as unknown as { statusCode: number }).statusCode).toBe(201)
    expect(create).toHaveBeenCalledTimes(1)
    const [, payload] = vi.mocked(create).mock.calls[0] as [string, Record<string, unknown>]
    expect(payload.patient_user_id).toBe('patient-1')
    expect(payload.provider_user_id).toBe('doc')
  })
})

describe('P5TPL-2 — prescriptions.create access control', () => {
  const create_ = getHandler(prescriptionsRouter, 'post', '/')

  const baseBody = {
    patient_user_id: 'victim',
    provider_id: 'prov-1',
    drug_name: 'lisinopril',
  }

  it('rejects a non-provider creating a prescription (403)', async () => {
    // No provider row for this user.
    vi.mocked(findMany).mockResolvedValue([] as never)
    const { req, res } = mockReqRes('attacker', baseBody)

    await create_(req, res)

    expect((res as unknown as { statusCode: number }).statusCode).toBe(403)
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects a provider with no relationship to the target patient (403)', async () => {
    vi.mocked(findMany).mockImplementation(async (table: string) => {
      if (table === 'providers') return [{ id: 'prov-1', user_id: 'doc' }] as never
      // No appointments or consultations linking doc → victim.
      return [] as never
    })
    const { req, res } = mockReqRes('doc', baseBody)

    await create_(req, res)

    expect((res as unknown as { statusCode: number }).statusCode).toBe(403)
    expect(create).not.toHaveBeenCalled()
  })

  it('allows a provider with an existing relationship and derives identity from the session', async () => {
    vi.mocked(findMany).mockImplementation(async (table: string) => {
      if (table === 'providers') return [{ id: 'prov-1', user_id: 'doc' }] as never
      if (table === 'appointments') return [{ id: 'appt-1' }] as never
      return [] as never
    })
    const { req, res } = mockReqRes('doc', baseBody)

    await create_(req, res)

    expect((res as unknown as { statusCode: number }).statusCode).toBe(201)
    expect(create).toHaveBeenCalledTimes(1)
    const [, payload] = vi.mocked(create).mock.calls[0] as [string, Record<string, unknown>]
    expect(payload.provider_user_id).toBe('doc')
    expect(payload.provider_id).toBe('prov-1')
    expect(payload.patient_user_id).toBe('victim')
  })
})

describe('P5TPL-1 — portal POST /messages thread ownership', () => {
  const send = getHandler(portalRouter, 'post', '/messages')

  it('rejects a client thread_id for a consultation the caller is not party to (404, no insert)', async () => {
    // consultation belongs to other users — attacker is neither patient nor provider.
    vi.mocked(findById).mockResolvedValue({
      id: 'c-victim',
      patient_user_id: 'victim-patient',
      provider_user_id: 'victim-doc',
    } as never)
    const { req, res } = mockReqRes('attacker', {
      body: 'fraudulent advice',
      thread_id: 'c-victim',
    })
    await send(req, res)
    expect(res.statusCode).toBe(404)
    expect(vi.mocked(create)).not.toHaveBeenCalled()
  })

  it('allows the consultation patient to post + stamps sender_role=patient', async () => {
    vi.mocked(findById).mockResolvedValue({
      id: 'c-mine',
      patient_user_id: 'me',
      provider_user_id: 'doc',
    } as never)
    const { req, res } = mockReqRes('me', { body: 'hi doc', thread_id: 'c-mine' })
    await send(req, res)
    expect(res.statusCode).toBe(201)
    const [table, payload] = vi.mocked(create).mock.calls[0] as [string, Record<string, unknown>]
    expect(table).toBe('consultation_messages')
    expect(payload.consultation_id).toBe('c-mine')
    expect(payload.sender_role).toBe('patient')
  })

  it('stamps sender_role=provider when the caller is the consultation provider', async () => {
    vi.mocked(findById).mockResolvedValue({
      id: 'c-mine',
      patient_user_id: 'pat',
      provider_user_id: 'me',
    } as never)
    const { req, res } = mockReqRes('me', { body: 'reply', thread_id: 'c-mine' })
    await send(req, res)
    expect(res.statusCode).toBe(201)
    const [, payload] = vi.mocked(create).mock.calls[0] as [string, Record<string, unknown>]
    expect(payload.sender_role).toBe('provider')
  })
})

describe('consultations read-path SOAP redaction (encounter_signed_at gate)', () => {
  // The module doc promises: a patient may not read the SOAP fields until the
  // encounter is signed — we overlay null when patient && unsigned. Both read
  // paths (GET / and GET /:id) returned the raw row, leaking the provider's
  // unsigned draft diagnosis/assessment/plan to the patient.
  const getOne = getHandler(consultationsRouter, 'get', '/:id')
  const getList = getHandler(consultationsRouter, 'get', '/')

  const soap = {
    notes: 'n',
    diagnosis: 'flu',
    follow_up: 'f',
    chief_complaint: 'cc',
    hpi: 'h',
    ros: 'r',
    exam: 'e',
    assessment: 'a',
    plan: 'p',
  }
  const unsigned = {
    id: 'c1',
    patient_user_id: 'pat',
    provider_user_id: 'doc',
    encounter_signed_at: null,
    ...soap,
  }

  function getReqRes(userId: string, id: string) {
    const req = { body: {}, params: { id }, query: {} } as unknown as Request
    const res: MockRes = {
      locals: { session: { userId } },
      statusCode: 200,
      body: undefined,
      status(code: number) {
        res.statusCode = code
        return res
      },
      json(payload: unknown) {
        res.body = payload
        return res
      },
    }
    return { req, res: res as unknown as Response & MockRes }
  }

  it('nulls every SOAP field when the patient reads an UNSIGNED encounter', async () => {
    vi.mocked(findById).mockResolvedValue({ ...unsigned } as never)
    const { req, res } = getReqRes('pat', 'c1')
    await getOne(req, res)
    const body = res.body as Record<string, unknown>
    for (const f of Object.keys(soap)) expect(body[f]).toBeNull()
  })

  it('returns SOAP fields intact once the encounter is SIGNED', async () => {
    vi.mocked(findById).mockResolvedValue({
      ...unsigned,
      encounter_signed_at: '2026-01-01T00:00:00Z',
    } as never)
    const { req, res } = getReqRes('pat', 'c1')
    await getOne(req, res)
    const body = res.body as Record<string, unknown>
    expect(body.diagnosis).toBe('flu')
    expect(body.plan).toBe('p')
  })

  it('always shows the provider their own unsigned draft', async () => {
    vi.mocked(findById).mockResolvedValue({ ...unsigned } as never)
    const { req, res } = getReqRes('doc', 'c1')
    await getOne(req, res)
    const body = res.body as Record<string, unknown>
    expect(body.diagnosis).toBe('flu')
    expect(body.assessment).toBe('a')
  })

  it('redacts unsigned rows in the patient list view too', async () => {
    vi.mocked(findMany).mockImplementation(async (_table: string, opts: unknown) => {
      const field = (opts as { where: { field: string }[] }).where[0].field
      return (field === 'patient_user_id' ? [{ ...unsigned }] : []) as never
    })
    const { req, res } = getReqRes('pat', 'c1')
    await getList(req, res)
    const body = res.body as Record<string, unknown>[]
    expect(body).toHaveLength(1)
    expect(body[0].diagnosis).toBeNull()
    expect(body[0].plan).toBeNull()
  })
})
