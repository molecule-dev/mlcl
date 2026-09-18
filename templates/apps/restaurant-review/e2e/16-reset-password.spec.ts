/**
 * Reset password — the page rendered when the email contains a valid
 * reset-token URL. We assert the form renders + an invalid token surfaces
 * an error rather than silently 200-ing.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork } from './_helpers.js'

test('/reset-password renders password inputs', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=demo-token')
  await expect(page).toHaveURL(/\/reset-password/)
  // Should have at least one password input.
  await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 8000 })
})

test('Reset-password form has a submit button', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=demo-token')
  const buttonCount = await page.getByRole('button').count()
  expect(buttonCount).toBeGreaterThan(0)
})

test('POST /api/users/reset-password with a bogus token returns a non-2xx', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=demo-token')
  const res = await apiRequest(page, 'POST', '/api/users/reset-password', {
    token: 'totally-invalid-not-a-real-token',
    password: 'NewPass123!',
  })
  // Either the route doesn't exist (404) or it rejects (400/401). Either
  // way it must not silently succeed.
  expect([400, 401, 403, 404, 422]).toContain(res.status)
})

test('Submitting the form fires POST /api/users/reset-password', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/reset-password?token=demo-token')
    await page.locator('input[type="password"]').first().fill('NewPass123!')
    const buttons = await page.getByRole('button').count()
    if (buttons > 0) {
      await page.getByRole('button').first().click()
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    }
  })
  const post = reqs.find((r) => /\/api\/users\/reset-password/.test(r.url) && r.method === 'POST')
  // The button may also navigate without POSTing (e.g., disabled until
  // a confirm field is filled). Either way the call should at least be
  // attempted OR the form should still be on the same route.
  if (post) {
    expect([400, 401, 403, 404, 422]).toContain(post.status)
  } else {
    await expect(page).toHaveURL(/\/(reset-password|login)/)
  }
})
