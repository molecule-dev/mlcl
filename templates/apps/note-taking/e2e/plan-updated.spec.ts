/**
 * /plan-updated page — confirmation page after Stripe redirect. Outcome
 * asserted: page mounts without console errors, the sidebar shell renders,
 * the confirmation copy is shown, and the "Return home" link routes the
 * user back into the app.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test('plan-updated page mounts without console errors', async ({ page }) => {
  await signup(page)
  await expectNoConsoleErrors(page, async () => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
  })
})

test('plan-updated renders a heading', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page.getByRole('heading').first()).toBeVisible()
})

test('plan-updated links back into the app', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  const link = page.getByRole('link').first()
  await expect(link).toBeVisible()
})

test('plan-updated shows the confirmation copy', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page.getByRole('heading', { name: /your plan has been updated/i })).toBeVisible()
})

test('plan-updated "Thank you" heading is visible', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page.getByRole('heading', { name: /thank you/i })).toBeVisible()
})

test('plan-updated "Return home" link routes back to the app', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await page
    .getByRole('link', { name: /return home/i })
    .first()
    .click()
  // Implementation may route to / or /home — both count.
  await expect(page).toHaveURL(/\/$|\/home/)
})

test('plan-updated sidebar nav exposes all 6 primary links', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  for (const name of ['Home', 'Notes', 'Search', 'Graph', 'Tags', 'Settings']) {
    await expect(
      page
        .getByRole('navigation')
        .getByRole('link', { name: new RegExp(`^${name}$`) })
        .first(),
    ).toBeVisible()
  }
})

test('plan-updated user-menu button is reachable', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page.getByRole('button', { name: /open user menu/i }).first()).toBeVisible()
})

test('plan-updated header brand link goes to /home', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await page
    .getByRole('link', { name: /^verso$/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/home/)
})

test('plan-updated does not log any /api/ 5xx errors on mount', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
  })
  const failing = reqs.filter((r) => r.url.includes('/api/') && r.status >= 500)
  expect(failing, 'no 5xx on plan-updated').toEqual([])
})

test('plan-updated /api/profile/me reflects the user (read-after-write friendly)', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  const meRes = await page.request.get('/api/profile/me')
  expect(meRes.status()).toBe(200)
  const body = await meRes.json()
  expect(body?.email).toMatch(/@/)
})
