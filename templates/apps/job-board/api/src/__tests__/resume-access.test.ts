import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { Readable } from 'node:stream'

import express, { type Request } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A stored resume is private: the upload saves a serve URL (never the bucket's raw URL, which
// answers 403), and GET /api/uploads/resume/:id streams it only to the applicant and to the owner
// of a company the application was sent to.

const rows = {
  user_profiles: [] as Array<Record<string, unknown>>,
  applications: [] as Array<Record<string, unknown>>,
  jobs: [] as Array<Record<string, unknown>>,
  companies: [] as Array<Record<string, unknown>>,
  users: [] as Array<Record<string, unknown>>,
}
type Where = Array<
  | { field: string; operator: '='; value: unknown }
  | { field: string; operator: 'in'; value: unknown[] }
>
const matches = (row: Record<string, unknown>, where: Where): boolean =>
  where.every((w) =>
    w.operator === 'in' ? w.value.includes(row[w.field]) : row[w.field] === w.value,
  )
let rejectProfileWrite = false
vi.mock('@molecule/api-database', () => ({
  findOne: async (table: keyof typeof rows, where: Where) =>
    rows[table].find((r) => matches(r, where)) ?? null,
  findMany: async (table: keyof typeof rows, q: { where: Where }) =>
    rows[table].filter((r) => matches(r, q.where)),
  findById: async (table: keyof typeof rows, id: string) =>
    rows[table].find((r) => r.id === id) ?? null,
  create: async (table: keyof typeof rows, row: Record<string, unknown>) => {
    if (table === 'user_profiles' && rejectProfileWrite) throw new Error('database unavailable')
    rows[table].push(row)
    return { data: row, affected: 1 }
  },
  updateById: async (table: keyof typeof rows, id: string, patch: Record<string, unknown>) => {
    const row = rows[table].find((r) => r.id === id)
    return { data: row ? Object.assign(row, patch) : null, affected: row ? 1 : 0 }
  },
  updateMany: async (table: keyof typeof rows, where: Where, patch: Record<string, unknown>) => {
    const matched = rows[table].filter((r) => matches(r, where))
    for (const row of matched) Object.assign(row, patch)
    return { data: null, affected: matched.length }
  },
}))
let currentUser: string | undefined = 'applicant'
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => currentUser,
  getParamId: (req: Request) => req.params.id,
}))
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))

import { setUploadParserFactory } from '@molecule/api-middleware-body-parser'
import { uploadParserFactory } from '@molecule/api-middleware-body-parser-express'
import { setProvider, type UploadedFile } from '@molecule/api-uploads'

import applications from '../handlers/applications.js'
import router, { RESUME_ROUTE, resumeUrlSchema } from '../handlers/uploads.js'
import profiles from '../handlers/user-profiles.js'

const stored = new Map<string, Buffer>()
let keyPrefix = ''
const jobId = '00000000-0000-4000-8000-000000000001'
setUploadParserFactory(uploadParserFactory)
setProvider({
  upload(fieldname, stream, info) {
    const id = `${keyPrefix}file${stored.size + 1}`
    const chunks: Buffer[] = []
    const file: UploadedFile = {
      id,
      fieldname,
      filename: info.filename ?? 'resume',
      encoding: info.encoding,
      mimetype: info.mimeType,
      size: 0,
      uploaded: false,
      // What the S3 bond reports: the bucket's raw (private) URL.
      location: `https://bucket.s3.amazonaws.com/${id}`,
    }
    file.uploadPromise = new Promise<void>((resolve) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => {
        const bytes = Buffer.concat(chunks)
        stored.set(id, bytes)
        file.size = bytes.length
        file.uploaded = true
        resolve()
      })
    })
    return file
  },
  abortUpload: vi.fn(),
  deleteFile: async (id) => {
    stored.delete(id)
  },
  getFile: async (id) => {
    const bytes = stored.get(id)
    return bytes ? Readable.from(bytes) : null
  },
})

async function withServer<T>(run: (base: string) => Promise<T>): Promise<T> {
  const app = express()
  app.use(express.json())
  app.use('/api/uploads', router)
  app.use('/api/applications', applications)
  app.use('/api/user-profiles', profiles)
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    return await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)
  } finally {
    server.close()
  }
}

async function postResume() {
  return withServer(async (base) => {
    const form = new FormData()
    form.append('file', new Blob(['%PDF-1.7 my resume'], { type: 'application/pdf' }), 'cv.pdf')
    const res = await fetch(`${base}/api/uploads/resume`, { method: 'POST', body: form })
    return { status: res.status, body: (await res.json()) as { url: string } }
  })
}

async function uploadResume(): Promise<string> {
  const res = await postResume()
  expect(res.status).toBe(201)
  return res.body.url
}

function write(path: string, body: Record<string, unknown>, method = 'PUT') {
  return withServer((base) =>
    fetch(`${base}${path}`, {
      method,
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
  )
}

const read = (url: string) =>
  withServer(async (base) => {
    const res = await fetch(`${base}${url}`)
    return { status: res.status, body: res.status === 200 ? await res.text() : null, res }
  })

beforeEach(() => {
  for (const table of Object.values(rows)) table.length = 0
  stored.clear()
  currentUser = 'applicant'
  rejectProfileWrite = false
  keyPrefix = ''
})

describe('resume uploads', () => {
  it('saves a serve URL on the profile, not the bucket URL, and the applicant can read it', async () => {
    const url = await uploadResume()
    expect(url).toBe(`${RESUME_ROUTE}file1`)
    expect(rows.user_profiles[0].resume_url).toBe(url)
    const { status, body, res } = await read(url)
    expect(status).toBe(200)
    expect(body).toBe('%PDF-1.7 my resume')
    expect(res.headers.get('content-disposition')).toContain('attachment')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('content-security-policy') ?? '').toContain('sandbox')
  })

  it('lets the owner of the company an application went to read it, and nobody else', async () => {
    const url = await uploadResume()
    rows.companies.push({ id: 'c1', owner_id: 'employer' })
    rows.jobs.push({ id: 'j1', company_id: 'c1' })
    rows.applications.push({ id: 'a1', job_id: 'j1', applicant_id: 'applicant', resume_url: url })

    currentUser = 'employer'
    expect((await read(url)).status).toBe(200)
    currentUser = 'stranger'
    expect((await read(url)).status).toBe(404)
    currentUser = undefined
    expect((await read(url)).status).toBe(401)
  })

  it('rejects an upload whose profile write failed and discards the unreferenced bytes', async () => {
    rejectProfileWrite = true
    expect((await postResume()).status).toBe(500)
    expect(rows.user_profiles).toEqual([])
    expect(stored.size).toBe(0)
  })

  it('round-trips an opaque storage id with a prefix through a single route segment', async () => {
    keyPrefix = 'resumes/'
    const url = await uploadResume()
    expect(url).toBe(`${RESUME_ROUTE}resumes%2Ffile1`)
    expect(resumeUrlSchema.safeParse(url).success).toBe(true)
    expect((await read(url)).body).toBe('%PDF-1.7 my resume')
  })

  it.each([
    ['PUT', '/api/user-profiles/me'],
    ['POST', '/api/applications'],
    ['PUT', '/api/applications/own-application'],
  ])('refuses unowned resume references on %s %s', async (method, path) => {
    const url = await uploadResume()
    currentUser = 'stranger'
    rows.jobs.push({ id: jobId, status: 'published' })
    rows.applications.push({ id: 'own-application', applicant_id: 'stranger', resume_url: null })

    expect((await write(path, { job_id: jobId, resume_url: url }, method)).status).toBe(404)
    expect((await read(url)).status).toBe(404)
    expect(rows.applications).toHaveLength(1)
    expect(rows.applications[0].resume_url).toBeNull()
    expect(rows.user_profiles).toHaveLength(1)
  })

  it('omits unsupported saved resume links from profile and application responses', async () => {
    const oldLink = 'data:text/plain,legacy'
    rows.user_profiles.push({ user_id: 'applicant', resume_url: oldLink })
    rows.applications.push({ id: 'old', applicant_id: 'applicant', resume_url: oldLink })
    await withServer(async (base) => {
      const profile = await fetch(`${base}/api/user-profiles/me`)
      expect(profile.status).toBe(200)
      expect(await profile.json()).toMatchObject({ resume_url: null })
      const application = await fetch(`${base}/api/applications/old`)
      expect(application.status).toBe(200)
      expect(await application.json()).toMatchObject({ resume_url: null })
    })
  })

  it('uses the applicant’s profile resume when a new application omits the link', async () => {
    const url = await uploadResume()
    rows.companies.push({ id: 'c1', owner_id: 'employer' })
    rows.jobs.push({ id: jobId, status: 'published', company_id: 'c1' })
    const response = await write('/api/applications', { job_id: jobId }, 'POST')
    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ resume_url: url })
    currentUser = 'employer'
    expect((await read(url)).body).toBe('%PDF-1.7 my resume')
  })

  it('accepts the serve path and absolute links as a resume_url, and nothing else', () => {
    expect(resumeUrlSchema.safeParse(`${RESUME_ROUTE}file1`).success).toBe(true)
    expect(resumeUrlSchema.safeParse('https://example.com/cv.pdf').success).toBe(true)
    expect(resumeUrlSchema.safeParse('/api/other/file1').success).toBe(false)
    expect(resumeUrlSchema.safeParse('javascript:alert(1)').success).toBe(false)
  })
})
