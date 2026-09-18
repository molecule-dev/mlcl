import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, whereUrl, authedApi } from './_helpers.js'

test.describe('/settings', () => {
  test('renders Settings heading + section nav (Account/Repos/Webhooks/Secrets/Team)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /^Settings$/i, level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Account$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Repositories$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Webhooks$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Secrets$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Team$/i })).toBeVisible()
  })

  test('Account section shows Name + Email + Save changes', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^Account$/i }).click()
    await expect(page.getByLabel(/^Name$/i)).toBeVisible()
    await expect(page.getByLabel(/^Email$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Save changes/i })).toBeVisible()
  })

  test('Save changes persists name (PUT /api/me) — round-trips through reload', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^Account$/i }).click()
    const newName = 'Riley Updated ' + Date.now()
    await page.getByLabel(/^Name$/i).fill(newName)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Save changes/i }).click()
      await page.waitForTimeout(2000)
    })
    const put = whereUrl(reqs, /\/api\/me(?:\?|$)/, 'PUT')
    expect(put.length, 'PUT /api/me fired').toBeGreaterThan(0)
    expect(put[0].status, 'PUT must succeed').toBeLessThan(400)
    // reload — name should still be the new one
    await page.reload()
    await page.getByRole('button', { name: /^Account$/i }).click()
    await expect(page.getByLabel(/^Name$/i)).toHaveValue(newName)
  })

  test('Repositories section lists connected repos', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^Repositories$/i }).click()
    await expect(page.getByRole('heading', { name: /Repository connections/i })).toBeVisible()
    const repoRows = page.locator('main >> main >> li')
    await repoRows.first().waitFor({ timeout: 10000 })
    await expect(repoRows.first()).toBeAttached()
  })

  test('Webhooks section lists existing webhooks + add form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^Webhooks$/i }).click()
    await expect(page.getByRole('heading', { name: /Outgoing webhooks/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Add webhook$/i })).toBeVisible()
  })

  test('Add webhook fires POST /api/webhooks and the new row appears', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^Webhooks$/i }).click()
    const newName = 'Test hook ' + Date.now()
    await page.locator('[data-mol-id="webhook-name"]').fill(newName)
    await page.locator('[data-mol-id="webhook-url"]').fill('https://example.com/hook-' + Date.now())
    await page.locator('[data-mol-id="webhook-events"]').fill('pipeline.failed')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="webhook-submit"]').click()
      await page.waitForTimeout(3000)
    })
    const post = whereUrl(reqs, /\/api\/webhooks(?:\?|$)/, 'POST')
    expect(post.length, 'POST /api/webhooks fired').toBeGreaterThan(0)
    expect(post[0].status, 'webhook create must succeed').toBeLessThan(400)
    await expect(page.getByText(newName).first()).toBeVisible({ timeout: 10000 })
  })

  test('Secrets section lists secrets + add form (with scope select)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^Secrets$/i }).click()
    await expect(page.getByRole('heading', { name: /^Secrets$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Add secret$/i })).toBeVisible()
  })

  test('Add secret fires POST /api/secrets and the row appears with masked value (read-after-write)', async ({
    page,
    request,
  }) => {
    const user = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^Secrets$/i }).click()
    const name = 'TEST_KEY_' + Date.now()
    await page.locator('[data-mol-id="secret-name"]').fill(name)
    await page.locator('[data-mol-id="secret-value"]').fill('s3cr3t-VALUE-12345')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="secret-submit"]').click()
      await page.waitForTimeout(3000)
    })
    const post = whereUrl(reqs, /\/api\/secrets(?:\?|$)/, 'POST')
    expect(post.length, 'POST /api/secrets fired').toBeGreaterThan(0)
    expect(post[0].status, 'secret create must succeed').toBeLessThan(400)
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 })
    // verify backend invariant: GET /api/secrets returns the new secret name,
    // and the value is NOT returned in plaintext
    expect(user.accessToken).toBeTruthy()
    const api = authedApi(request, user.accessToken!)
    const list = await api.get('/secrets')
    const body = await list.json()
    const arr = Array.isArray(body) ? body : (body?.items ?? body?.secrets ?? [])
    const created = arr.find((s: { name: string }) => s.name === name)
    expect(created, 'created secret in list').toBeTruthy()
    const serialised = JSON.stringify(created)
    expect(serialised, 'plaintext secret must NOT round-trip').not.toContain('s3cr3t-VALUE-12345')
  })

  test('Team section shows team members heading + at least the owner', async ({ page }) => {
    const user = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('main button:has-text("Team")').click()
    await expect(page.getByRole('heading', { name: /Team members/i })).toBeVisible()
    // The user email also appears in the global nav (user menu); scope to the team section
    const teamPanel = page.locator('[data-mol-id="settings-team-section"]')
    await expect(teamPanel.getByText(user.email).first()).toBeVisible()
    await expect(teamPanel.getByText(/^owner$/i)).toBeVisible()
  })
})
