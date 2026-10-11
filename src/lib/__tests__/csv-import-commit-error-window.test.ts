/**
 * `POST /commit` reports a WINDOW of the rejected rows, not one entry per row.
 *
 * The endpoint validates every row of the uploaded file (the body cap is
 * express `raw({ limit: '10mb' })`, i.e. millions of short rows) and used to
 * return `invalid` — a row number plus every validation message — for EACH
 * rejected row. The response therefore grew with the upload: a 10 mb body of
 * malformed rows became hundreds of megabytes of JSON, built in memory in one
 * array and stringified before a byte was written, for a list `ImportPage`
 * never renders (it shows `skipped`, the count). `skipped` must stay the TRUE
 * total while `invalid` is capped to the first page of detail.
 *
 * This drives the REAL router (only the bonds are mocked) so the assertion is
 * about the shipped handler, the same way the sibling
 * csv-import-batched-existence suite does.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const database = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
}))

vi.mock('@molecule/api-database', () => database)
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
    options?.defaultValue ?? _key,
}))

type Handle = (req: unknown, res: unknown, next: () => void) => Promise<void> | void

/** The terminal POST /commit handler and the auth guard, off the real router's stack. */
const { commitHandler, requireAuth, MAX_REPORTED_ERRORS } = await (async () => {
  const mod =
    (await import('../../../templates/.agents/skills/examples/data-display/csv-import/api/handlers/import.js')) as {
      default: { stack: Array<{ route?: { path?: string; stack: Array<{ handle: Handle }> } }> }
      MAX_REPORTED_ERRORS: number
    }
  const layers = mod.default.stack.filter((l) => l.route?.path === '/commit')
  if (layers.length === 0) throw new Error('csv-import router exported no /commit route')
  const chain = layers[0]!.route!.stack.map((l) => l.handle)
  // [requireAuth, express.raw, handler] — express.raw is express's own parser,
  // not the code under test; the handler is driven with a Buffer body directly.
  return {
    requireAuth: chain[0]!,
    commitHandler: chain[chain.length - 1]!,
    MAX_REPORTED_ERRORS: mod.MAX_REPORTED_ERRORS,
  }
})()

/** `count` rows whose `email` fails validation, so every row is rejected. */
const invalidCsv = (count: number): Buffer => {
  const lines = ['email,name,company']
  for (let i = 0; i < count; i++) lines.push(`not-an-email-${i},name ${i},`)
  return Buffer.from(lines.join('\n'))
}

/** `count` valid rows. */
const validCsv = (count: number): Buffer => {
  const lines = ['email,name,company']
  for (let i = 0; i < count; i++) lines.push(`user${i}@example.test,name ${i},Acme`)
  return Buffer.from(lines.join('\n'))
}

const makeRes = (): {
  locals: { session?: { userId: string } }
  statusCode: number
  body: unknown
  status: (code: number) => unknown
  json: (payload: unknown) => unknown
} => {
  const res = {
    locals: {} as { session?: { userId: string } },
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(payload: unknown) {
      res.body = payload
      return res
    },
  }
  return res
}

async function commit(body: Buffer): Promise<ReturnType<typeof makeRes>> {
  const res = makeRes()
  res.locals.session = { userId: 'user-1' }
  const req = { body }
  await requireAuth(req, res, () => void 0)
  await commitHandler(req, res, () => void 0)
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('csv-import POST /commit — the error detail is a bounded window', () => {
  it('caps the reported rows while `skipped` still counts every rejected row', async () => {
    const total = MAX_REPORTED_ERRORS * 40
    const res = await commit(invalidCsv(total))
    const body = res.body as { skipped: number; invalid: Array<{ row: number; errors: string[] }> }

    // The whole file was rejected — and the count says so.
    expect(body.skipped).toBe(total)
    // The detail is capped, so the response cannot grow with the upload.
    expect(body.invalid.length).toBe(MAX_REPORTED_ERRORS)
    // …and the window is the FIRST page, in file order (row 2 = data row 1).
    expect(body.invalid[0]?.row).toBe(2)
    expect(body.invalid[MAX_REPORTED_ERRORS - 1]?.row).toBe(MAX_REPORTED_ERRORS + 1)
    expect(body.invalid[0]?.errors.length).toBeGreaterThan(0)
    // The measured cost: the answer stays small even though the input did not.
    // Against the uncapped list this body is ~40x larger.
    expect(JSON.stringify(body).length).toBeLessThan(10_000)
    // No writes happened for an all-invalid file.
    expect(database.create).not.toHaveBeenCalled()
    expect(database.findMany).not.toHaveBeenCalled()
  })

  it('reports the rows a mid-file failure KEPT, instead of a bare 500', async () => {
    // A write that fails partway down the file leaves the earlier rows stored
    // (the abstract DataStore has no transaction). The error used to escape the
    // handler, so the client got a 500 and read "the import failed" while the
    // data was in the table — the counts below are the only honest answer.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      database.findMany.mockResolvedValue([])
      let writes = 0
      database.create.mockImplementation(async () => {
        writes += 1
        if (writes === 3) throw new Error('connection reset')
        return { data: { id: `id-${writes}` } }
      })

      const res = await commit(validCsv(5))
      const body = res.body as { imported: number; updated: number; error: string }

      expect(res.statusCode).toBe(500)
      // Two rows landed before the failure — and the answer says so.
      expect(body.imported).toBe(2)
      expect(body.updated).toBe(0)
      expect(body.error).toContain('partway')
      // The cause is logged (never silently swallowed) …
      expect(errorSpy).toHaveBeenCalled()
      // …but not handed to the client as the message.
      expect(body.error).not.toContain('connection reset')
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('still reports EVERY error when the file has fewer than the window', async () => {
    const res = await commit(invalidCsv(3))
    const body = res.body as { skipped: number; invalid: Array<{ row: number }> }

    expect(body.skipped).toBe(3)
    expect(body.invalid.map((e) => e.row)).toEqual([2, 3, 4])
  })
})
