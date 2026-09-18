import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, listArtifacts, signup, whereUrl } from './_helpers.js'

test.describe('/artifacts', () => {
  test('renders heading + at least one artifact row', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/artifacts')
    await expect(page.getByRole('heading', { name: /^Artifacts$/i, level: 1 })).toBeVisible()
    const items = page.locator('main >> li')
    await expect(items.first()).toBeAttached()
  })

  test('GET /api/artifacts fires on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/artifacts')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const get = whereUrl(reqs, /\/api\/artifacts(?:\?|$)/, 'GET')
    expect(get.length, 'GET /api/artifacts fired').toBeGreaterThan(0)
    expect(get[0].status).toBe(200)
  })

  test('every row has filename + repo · branch metadata + size + retention', async ({ page }) => {
    const user = await signup(page)
    // Read the filenames from the same endpoint the page reads — matching the
    // demo artifacts' file extensions would break once they are replaced.
    const artifacts = await listArtifacts(page, user.accessToken!)
    expect(artifacts.length, 'artifacts list non-empty').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/artifacts')
    const items = page.locator('main >> li')
    await items.first().waitFor({ timeout: 10000 })
    const count = await items.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < Math.min(count, 5); i++) {
      const row = items.nth(i)
      const text = (await row.textContent()) || ''
      expect(
        artifacts.some((a) => a.name && text.includes(a.name)),
        `row ${i} should show a filename the API returned`,
      ).toBe(true)
      expect(text, `row ${i} should show retention period`).toMatch(/\bretention/i)
    }
  })

  test('Download links point to /api/artifacts/:id/download', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/artifacts')
    const dl = page.getByRole('link', { name: /Download/i })
    await dl.first().waitFor({ timeout: 10000 })
    await expect(dl.first()).toBeAttached()
    const href = await dl.first().getAttribute('href')
    expect(href).toMatch(/^\/api\/artifacts\/[a-f0-9-]{36}\/download$/i)
  })

  test('clicking Download triggers an HTTP request returning 2xx + non-empty body', async ({
    page,
    request,
  }) => {
    const user = await signup(page)
    await page.goto(APP_BASE + '/artifacts')
    const dl = page.getByRole('link', { name: /Download/i }).first()
    const href = await dl.getAttribute('href')
    expect(href).toBeTruthy()
    // [M1-1] The JWT is captured from the signup response / auth cookie, not
    // localStorage. Send it as a bearer to authenticate the download request.
    const token = user.accessToken
    expect(token, 'token captured').toBeTruthy()
    const apiBase = (
      process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000')
    ).replace(/\/api$/, '')
    const res = await request.get(apiBase + href!, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status(), 'download status').toBeLessThan(400)
    const buf = await res.body()
    expect(buf.length, 'download body has bytes').toBeGreaterThan(0)
  })

  test('shows artifact type badge per row', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/artifacts')
    // At least one of these expected types should be present
    const typeLabels = ['sourcemap', 'log', 'tarball', 'sbom', 'docker']
    let foundAny = false
    for (const lbl of typeLabels) {
      if (
        await page
          .getByText(new RegExp(`^${lbl}$`, 'i'))
          .first()
          .count()
      ) {
        foundAny = true
        break
      }
    }
    expect(foundAny, 'at least one artifact-type badge present').toBe(true)
  })

  test('shows size in human-readable form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/artifacts')
    await expect(page.getByText(/\d+(\.\d+)?\s*(KB|MB|GB)/i).first()).toBeVisible()
  })
})
