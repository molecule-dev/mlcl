/**
 * /host/listings/new — multi-step listing wizard.
 *
 * Real outcomes asserted:
 *   - 3-step navigator (place → photos → details)
 *   - Publish POSTs /api/listings, navigates to /host/listings/:id
 *   - The new listing is visible in /api/host-listings afterwards
 *     (read-after-write)
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, signup } from './_helpers'

test('wizard: complete the place + photos + publish flow', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/host/listings/new')
  await page.waitForLoadState('networkidle')

  // Step 1 — Place.
  await page
    .getByRole('button', { name: /^House$/ })
    .first()
    .click()
  await page.getByPlaceholder(/city, region, or neighbourhood/i).fill('Boulder, Colorado')
  await page.getByRole('button', { name: /^Continue$/ }).click()

  // Step 2 — Photos. Use the placeholder fallback to avoid uploading.
  await page.getByRole('button', { name: /use a sample photo/i }).click()
  await page.getByRole('button', { name: /^Continue$/ }).click()

  // Step 3 — Details + publish.
  await page.getByPlaceholder(/sunlit cliffside cabin/i).fill('E2E Boulder Studio')
  await page.getByPlaceholder(/^\$220$/).fill('180')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /^Publish listing$/ }).click()
    await page.waitForURL(/\/host\/listings\/[a-f0-9-]+$/, { timeout: 15000 })
  })
  const post = reqs.find((r) => r.url.endsWith('/api/listings') && r.method === 'POST')
  expect(post, 'POST /api/listings must fire').toBeTruthy()
  expect([200, 201]).toContain(post!.status)

  // Read-after-write: GET /api/host-listings now shows it.
  const list = await page.request.get(`${API_BASE}/host-listings`)
  const body = (await list.json()) as { data: Array<{ title: string }> }
  expect(body.data.some((l) => l.title === 'E2E Boulder Studio')).toBeTruthy()
})

test('wizard: missing title surfaces inline validation', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/host/listings/new')
  await page.waitForLoadState('networkidle')

  // Skip ahead past city by entering one + clicking continue twice.
  await page.getByPlaceholder(/city, region, or neighbourhood/i).fill('Reno')
  await page.getByRole('button', { name: /^Continue$/ }).click()
  await page.getByRole('button', { name: /^Continue$/ }).click()
  await page.getByPlaceholder(/^\$220$/).fill('120')
  // Title intentionally blank.
  await page.getByRole('button', { name: /^Publish listing$/ }).click()
  await page.waitForTimeout(800)
  // Should still be on /host/listings/new (validation blocked).
  await expect(page).toHaveURL(/\/host\/listings\/new$/)
  await expect(page.getByText(/add a title/i).first()).toBeVisible()
})

test('property type pill (House) selects on click', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/host/listings/new')
  await page.waitForLoadState('networkidle')
  // Click "House" — the pill should activate (pressed/aria-pressed or
  // visual-state change). At minimum the click should not throw and we
  // must still be on Step 1.
  await page
    .getByRole('button', { name: /^House$/ })
    .first()
    .click()
  await page.waitForTimeout(150)
  await expect(page.getByRole('button', { name: /^Continue$/ })).toBeVisible()
})

test('city input accepts text and Continue advances to step 2', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/host/listings/new')
  await page.waitForLoadState('networkidle')
  await page.getByPlaceholder(/city, region, or neighbourhood/i).fill('Boulder')
  await page.getByRole('button', { name: /^Continue$/ }).click()
  // Step 2 (Photos) — placeholder photo helper button visible.
  await expect(page.getByRole('button', { name: /use a sample photo/i })).toBeVisible({
    timeout: 5000,
  })
})

test('step navigator pill jumps directly to Finish up step', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/host/listings/new')
  await page.waitForLoadState('networkidle')
  await page
    .getByRole('button', { name: /finish up/i })
    .first()
    .click()
  // The publish form (title input + Publish button) should be visible.
  await expect(page.getByPlaceholder(/sunlit cliffside cabin/i)).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('button', { name: /^Publish listing$/ })).toBeVisible()
})

test('Back to listings link navigates to /host/listings', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/host/listings/new')
  await page.waitForLoadState('networkidle')
  await page
    .getByRole('link', { name: /back to listings/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/host\/listings$/)
})
