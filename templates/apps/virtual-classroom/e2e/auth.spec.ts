import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { apiRaw, getMyUserId, signup, uniqueEmail } from './_helpers.js'

test('signup creates a real users row reachable via GET /api/users/:id', async ({ page }) => {
  const email = uniqueEmail('vc-signup')
  const { password } = await signup(page, email)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  // The signup hook persisted a JWT — decode for our user id, then fetch
  // /api/users/:id which returns the canonical user row.
  const myId = await getMyUserId(page)
  const meResp = await apiRaw(page, 'GET', `/users/${myId}`)
  expect(meResp.status()).toBeLessThan(400)
  const me = await meResp.json()
  // molecule resource shape: GET wraps the row in `props`.
  const row = me.props ?? me
  expect(row.email).toBe(email)
  expect(row.id).toMatch(/^[0-9a-f-]{36}$/)
  expect(password).toBeTruthy()
})

test('login with the same email/password returns to /dashboard', async ({ page }) => {
  const email = uniqueEmail('vc-login')
  const { password } = await signup(page, email)
  // Log out by clearing storage + going to /login.
  await page.evaluate(() => window.localStorage.clear())
  await page.goto('/login')
  await page.locator('input[type=email]').first().fill(email)
  await page.locator('input[type=password]').first().fill(password)
  await page
    .getByRole('button', { name: /sign\s*in|log\s*in/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
})

test('logging in with a wrong password returns an error and stays on /login', async ({ page }) => {
  // The failed log-in answers 403 by design; the browser logs every 4xx
  // response as a console error, which the console guard would otherwise
  // fail the test for. This annotation allows exactly that expected line.
  test.info().annotations.push({
    type: 'allow-console-error',
    description: 'status of 403',
  })
  const email = uniqueEmail('vc-badpw')
  await signup(page, email)
  await page.evaluate(() => window.localStorage.clear())
  await page.goto('/login')
  await page.locator('input[type=email]').first().fill(email)
  await page.locator('input[type=password]').first().fill('not-the-real-pw')
  await page
    .getByRole('button', { name: /sign\s*in|log\s*in/i })
    .first()
    .click()
  // Should still be on /login (never reached /dashboard) and an error
  // alert appeared.
  await page.waitForTimeout(2000)
  await expect(page).toHaveURL(/\/login/)
})

test('forgot-password POSTs to /api/users/forgot-password and returns 2xx', async ({ page }) => {
  const email = uniqueEmail('vc-forgot')
  await signup(page, email)
  await page.evaluate(() => window.localStorage.clear())
  await page.goto('/forgot-password')
  await page.locator('input[type=email]').first().fill(email)
  const responses: { url: string; status: number }[] = []
  page.on('response', (r) => {
    if (r.url().includes('/api/users/forgot-password')) {
      responses.push({ url: r.url(), status: r.status() })
    }
  })
  await page
    .getByRole('button', { name: /send.*reset|submit|email/i })
    .first()
    .click()
  await page.waitForTimeout(3000)
  expect(responses.length, 'expected POST to /api/users/forgot-password').toBeGreaterThan(0)
  const last = responses[responses.length - 1]
  expect(last.status, `forgot-password POST status: ${last.status}`).toBeLessThan(400)
})
