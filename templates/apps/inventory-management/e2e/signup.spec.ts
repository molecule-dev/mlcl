import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('signup', () => {
  test('signs up a new user and lands on /dashboard with a token', async ({ page }) => {
    const email = uniqueEmail('signup')
    const reqs = await captureNetwork(page, async () => {
      const result = await signup(page, email)
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
      expect(result.accessToken, 'signup must persist a JWT bearer in localStorage').toBeTruthy()
      expect(result.userId, 'signup must persist a user id in localStorage').toBeTruthy()
    })
    const userCreate = reqs.find(
      (r) =>
        /\/users(\?|$)/.test(r.url) &&
        r.method === 'POST' &&
        (r.status === 200 || r.status === 201),
    )
    expect(userCreate, 'POST /users fired during signup').toBeTruthy()
  })

  test('rejects mismatched passwords without contacting the server', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('#fld-first-name').fill('Avery')
    await page.locator('#fld-last-name').fill('Chen')
    await page.locator('#fld-work-email').fill(uniqueEmail('mismatch'))
    await page.locator('#fld-password').fill('TestPass123!')
    await page.locator('#fld-confirm-password').fill('Different123!')
    await page
      .getByRole('button', { name: /create\s*account/i })
      .first()
      .click()
    await expect(page.getByRole('alert')).toContainText(/passwords do not match/i)
    await expect(page).toHaveURL(/\/signup/)
  })

  test('rejects duplicate emails (rerunning signup with same email returns an error)', async ({
    page,
  }) => {
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    const email = uniqueEmail('dup')
    await signup(page, email)
    // Sign out by clearing storage and try to sign up with the same email
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/signup')
    await page.locator('#fld-first-name').fill('Avery')
    await page.locator('#fld-last-name').fill('Chen')
    await page.locator('#fld-work-email').fill(email)
    await page.locator('#fld-password').fill('TestPass123!')
    await page.locator('#fld-confirm-password').fill('TestPass123!')
    await page
      .getByRole('button', { name: /create\s*account/i })
      .first()
      .click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveURL(/\/signup/)
  })
})
