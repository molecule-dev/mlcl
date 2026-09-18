/**
 * Direct API contract tests for /api/errors — the ingestion + retrieval
 * surface that powers IssueDetail event lists. These hit the real
 * handlers in api/src/handlers/errors.ts so we know v1 ingestion (the
 * only public path until DSN-based ingest lands in v2) actually
 * persists rows that show up on the next read.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, authHeaders, listProjects, safeText, signup, uniqueEmail } from './_helpers.js'

test.describe('/api/errors (event ingestion)', () => {
  test('POST /api/errors/ingest creates an issue + event the next GET reflects', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('errors-ingest'))
    const projects = await listProjects(page)
    expect(projects.length, 'seed should provision projects').toBeGreaterThan(0)
    const proj = projects[0]!

    const ingest = await page.request.post(`${API_BASE}/errors/ingest`, {
      headers: authHeaders(page),
      data: {
        project_id: proj.id,
        message: `TestError: walker probe ${Date.now()}`,
        stack_trace: 'at probe (e2e/20-errors-api.spec.ts:1:1)',
        level: 'error',
        environment: 'test',
      },
    })
    expect(ingest.status(), `ingest body: ${await safeText(ingest)}`).toBe(201)
    const created = (await ingest.json()) as { event_id: string; issue_id: string }
    expect(created.event_id, 'event_id returned').toBeTruthy()
    expect(created.issue_id, 'issue_id returned').toBeTruthy()

    const list = await page.request.get(`${API_BASE}/errors?issue_id=${created.issue_id}`, {
      headers: authHeaders(page),
    })
    expect(list.status()).toBe(200)
    const events = (await list.json()) as Array<{ id: string }>
    const events_arr = Array.isArray(events) ? events : []
    expect(events_arr.length, 'GET /api/errors returns the row we just ingested').toBeGreaterThan(0)
    expect(events_arr.some((e) => e.id === created.event_id)).toBe(true)
  })

  test('two ingests of the same fingerprint bump event_count on a single issue', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('errors-fingerprint'))
    const projects = await listProjects(page)
    const proj = projects[0]!
    const message = `BatchedTestError: probe ${Date.now()}`
    const stack_trace = 'at probe (file.ts:42:10)\nat caller (other.ts:11:3)'

    const r1 = await page.request.post(`${API_BASE}/errors/ingest`, {
      headers: authHeaders(page),
      data: { project_id: proj.id, message, stack_trace, level: 'error' },
    })
    expect(r1.status()).toBe(201)
    const b1 = (await r1.json()) as { issue_id: string }

    const r2 = await page.request.post(`${API_BASE}/errors/ingest`, {
      headers: authHeaders(page),
      data: { project_id: proj.id, message, stack_trace, level: 'error' },
    })
    expect(r2.status()).toBe(201)
    const b2 = (await r2.json()) as { issue_id: string }

    expect(b1.issue_id, 'same fingerprint => same issue').toBe(b2.issue_id)

    const issue = await page.request.get(`${API_BASE}/issues/${b1.issue_id}`, {
      headers: authHeaders(page),
    })
    const issueBody = (await issue.json()) as { event_count?: number }
    expect(Number(issueBody.event_count ?? 0)).toBeGreaterThanOrEqual(2)
  })

  test('GET /api/errors filters by environment', async ({ page }) => {
    await signup(page, uniqueEmail('errors-filter'))
    const projects = await listProjects(page)
    const proj = projects[0]!
    const env = `walker-env-${Date.now()}`

    const r = await page.request.post(`${API_BASE}/errors/ingest`, {
      headers: authHeaders(page),
      data: {
        project_id: proj.id,
        message: 'walker filter probe',
        stack_trace: 'at probe',
        level: 'warning',
        environment: env,
      },
    })
    expect(r.status()).toBe(201)

    const filtered = await page.request.get(`${API_BASE}/errors?environment=${env}`, {
      headers: authHeaders(page),
    })
    expect(filtered.status()).toBe(200)
    const events = (await filtered.json()) as Array<{ environment: string }>
    expect(events.length).toBeGreaterThan(0)
    expect(events.every((e) => e.environment === env)).toBe(true)
  })

  test('unauth POST /api/errors/ingest returns 401', async ({ page }) => {
    const r = await page.request.post(`${API_BASE}/errors/ingest`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        project_id: 'no-auth',
        message: 'should not be ingested',
      },
    })
    expect(r.status(), 'unauth ingest must reject').toBe(401)
  })
})
