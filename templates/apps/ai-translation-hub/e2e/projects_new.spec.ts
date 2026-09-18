import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

/**
 * Verify the New Project upload flow actually moves bytes through the
 * system instead of being a placeholder UI: dropping a file into the
 * dropzone parses segments client-side, the user proceeds through the
 * wizard, and on Create the project + every parsed segment land in the
 * backend (read-after-write).
 */
test.describe('new project: upload + create persists segments', () => {
  test('uploading a JSON file seeds the project with segments', async ({ page }) => {
    const { accessToken } = await signup(page)

    await page.goto(`${APP_BASE}/projects/new`)

    const sourceStrings = ['Welcome to the dashboard.', 'Save changes', 'Cancel']
    const fileInput = page.locator('input[data-mol-id="np-upload-input"]')
    await fileInput.setInputFiles({
      name: 'strings.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(sourceStrings), 'utf8'),
    })

    const status = page.locator('[data-mol-id="np-upload-status"]')
    await expect(status).toBeVisible({ timeout: 5_000 })
    await expect(status).toContainText('3')

    // Step 1 → 2 → 3
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /continue/i }).click()

    // Project name should be auto-filled from the file stem
    await expect(page.locator('input[data-mol-id="np-name"]')).toHaveValue('strings')

    // Capture the wizard's POST /api/projects + POST /api/segments fan-out
    // so the observed network contract is enforced by the test.
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /create project/i }).click()
      // The page navigates to /projects/<uuid> only after the project +
      // every segment have been POSTed; waiting on the UUID-shaped URL
      // (rather than just /projects/) is what makes this test a true
      // read-after-write check.
      await page.waitForURL(/\/projects\/[0-9a-f-]{36}\b/, { timeout: 30_000 })
    })
    expect(
      reqs.find((r) => r.method === 'POST' && /\/api\/projects(?:\?|$)/.test(r.url)),
    ).toBeDefined()
    expect(
      reqs.find((r) => r.method === 'POST' && /\/api\/segments(?:\?|$)/.test(r.url)),
    ).toBeDefined()

    const list = await page.request.get(`${API_BASE}/projects`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: true,
    })
    const projects = (await list.json()) as Array<{ id: string; name: string }>
    const created = projects.find((p) => p.name === 'strings')
    expect(created, 'created project not found in backend list').toBeTruthy()

    const segs = await page.request.get(
      `${API_BASE}/segments?project_id=${encodeURIComponent(created!.id)}`,
      { headers: apiHeaders(accessToken), failOnStatusCode: true },
    )
    const segments = (await segs.json()) as Array<{ source_text: string }>
    expect(segments.map((s) => s.source_text).sort()).toEqual(sourceStrings.slice().sort())
  })

  test('uploading a plain text file splits lines into segments', async ({ page }) => {
    const { accessToken } = await signup(page)

    await page.goto(`${APP_BASE}/projects/new`)

    const fileInput = page.locator('input[data-mol-id="np-upload-input"]')
    await fileInput.setInputFiles({
      name: 'sources.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Line one\nLine two\n\nLine three\n', 'utf8'),
    })

    const status = page.locator('[data-mol-id="np-upload-status"]')
    await expect(status).toContainText('3', { timeout: 5_000 })

    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /create project/i }).click()
    await page.waitForURL(/\/projects\/[0-9a-f-]{36}\b/, { timeout: 30_000 })

    const list = await page.request.get(`${API_BASE}/projects`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: true,
    })
    const projects = (await list.json()) as Array<{ id: string; name: string }>
    const created = projects.find((p) => p.name === 'sources')
    expect(created).toBeTruthy()

    const segs = await page.request.get(
      `${API_BASE}/segments?project_id=${encodeURIComponent(created!.id)}`,
      { headers: apiHeaders(accessToken), failOnStatusCode: true },
    )
    const segments = (await segs.json()) as Array<{ source_text: string }>
    expect(segments.map((s) => s.source_text).sort()).toEqual([
      'Line one',
      'Line three',
      'Line two',
    ])
  })

  test('skipping upload still creates an empty project', async ({ page }) => {
    const { accessToken } = await signup(page)

    await page.goto(`${APP_BASE}/projects/new`)
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByRole('button', { name: /continue/i }).click()
    await page.locator('input[data-mol-id="np-name"]').fill('Empty Project From E2E')
    await page.getByRole('button', { name: /create project/i }).click()
    await page.waitForURL(/\/projects\/[0-9a-f-]{36}\b/, { timeout: 15_000 })

    const list = await page.request.get(`${API_BASE}/projects`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: true,
    })
    const projects = (await list.json()) as Array<{ id: string; name: string }>
    expect(projects.find((p) => p.name === 'Empty Project From E2E')).toBeTruthy()
  })
})
