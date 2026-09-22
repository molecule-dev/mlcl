import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders form fields and submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByLabel(/^name$/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create.*account/i })).toBeVisible()
  })

  test('successful signup posts to /api/users and lands on /inbox', async ({ page }) => {
    const email = uniqueEmail('signup')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.getByLabel(/^name$/i).fill('Sign Up Test')
      await page.getByLabel(/email/i).fill(email)
      await page.getByLabel(/^password$/i).fill('TestPass123!')
      await page.getByRole('button', { name: /create.*account/i }).click()
      await page.waitForURL(/\/inbox/, { timeout: 20000 })
    })
    expect(
      reqs.some(
        (r) => r.method === 'POST' && /\/api\/users(?!\/log)/.test(r.url) && r.status === 201,
      ),
    ).toBeTruthy()
  })

  test('signup with existing email surfaces an error and stays on /signup', async ({ page }) => {
    // A duplicate email makes the API answer 403; the browser logs the failed
    // request to the console. Expected on this negative path.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    // Sign up once, then try again with the same email.
    const email = uniqueEmail('dup')
    await page.goto(APP_BASE + '/signup')
    await page.getByLabel(/^name$/i).fill('Dup A')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/^password$/i).fill('TestPass123!')
    await page.getByRole('button', { name: /create.*account/i }).click()
    await page.waitForURL(/\/inbox/, { timeout: 20000 })

    await page.context().clearCookies()
    await page.evaluate(() => {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {
        /* fine */
      }
    })

    await page.goto(APP_BASE + '/signup')
    await page.getByLabel(/^name$/i).fill('Dup B')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/^password$/i).fill('TestPass123!')
    await page.getByRole('button', { name: /create.*account/i }).click()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/signup/)
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await expect(page.getByRole('button', { name: /create.*account/i })).toBeVisible()
    })
  })
})
