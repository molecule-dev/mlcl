import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, completeOnboarding, signup } from './_helpers.js'

test.describe('/settings (Settings)', () => {
  test('"Recipe box" account link navigates to /recipes', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('link', { name: /recipe box/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/recipes/)
  })

  test('"Sign out" clears the session and /plan redirects to /login', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /sign out/i })
      .first()
      .click()
    await page.waitForURL(/\/login/, { timeout: 8_000 })
    await page.goto(APP_BASE + '/plan')
    await page.waitForTimeout(800)
    expect(page.url()).toMatch(/\/(login|signup|$)/)
  })

  test('"Delete account" reveals the password confirm form', async ({ page }) => {
    await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /delete account/i })
      .first()
      .click()
    await expect(page.locator('input[type=password]').first()).toBeVisible()
  })

  test('Confirm delete with password permanently deletes the account (DELETE /users/:id) and signs out', async ({
    page,
  }) => {
    // Deleting the account destroys the server session, so the follow-up
    // logout legitimately 401s and the browser logs the failed fetch — allow
    // that console error before the request fires. Match on the status (the
    // URL lives in msg.location(), which the annotation regex never sees).
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 401',
    })
    const { password } = await signup(page)
    await completeOnboarding(page)
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /delete account/i })
      .first()
      .click()
    await page.locator('input[type=password]').first().fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /permanently delete/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    // captureNetwork records expose `url`/`method`/`status` as properties.
    const del = reqs.find((r) => /\/api\/users\/[^/]+/.test(r.url) && r.method === 'DELETE')
    expect(del, 'DELETE /api/users/:id fired').toBeTruthy()
    // The allowed 401 above is only the post-delete logout — the DELETE
    // itself must have succeeded.
    expect(del!.status, 'DELETE /api/users/:id status').toBeLessThan(400)
    await page.waitForURL(/\/login/, { timeout: 10_000 })
  })
})
