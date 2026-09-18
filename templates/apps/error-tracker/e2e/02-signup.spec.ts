import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  getAccessToken,
  signup,
  signupViaUI,
  uniqueEmail,
} from './_helpers.js'

test.describe('/signup', () => {
  test('renders email + password fields and submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(
      page.getByRole('button', { name: /create\s*account|sign\s*up|join|start tracking/i }).first(),
    ).toBeVisible()
  })

  test('valid signup persists JWT + lands off /signup', async ({ page }) => {
    const { accessToken, userId } = await signup(page, uniqueEmail('signup-ok'))
    expect(accessToken, 'JWT bearer in localStorage').toBeTruthy()
    expect(userId, 'user id in localStorage').toBeTruthy()
  })

  test('signup via UI form lands off /signup and persists JWT', async ({ page }) => {
    await signupViaUI(page, uniqueEmail('signup-ui'))
    const tok = await getAccessToken(page)
    expect(tok, 'JWT persisted via UI signup').toBeTruthy()
  })

  test('duplicate email fails', async ({ page }) => {
    const email = uniqueEmail('signup-dup')
    const password = 'TestPass123!'
    const first = await page.request.post(`${API_BASE}/users`, {
      data: { email, password, name: 'First' },
    })
    expect(first.status()).toBe(201)
    const second = await page.request.post(`${API_BASE}/users`, {
      data: { email, password, name: 'Second' },
    })
    expect(second.status(), 'duplicate email must NOT create a second user').toBeGreaterThanOrEqual(
      400,
    )
  })

  test('signup fires POST /api/users and redirects', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    // Wait for the form to mount before counting. count() is a one-shot read
    // with no auto-waiting, so it can run against a still-empty React root,
    // return 0, and silently skip the fill below — the form then will not
    // submit and the failure surfaces as a missing request, not a missing field.
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
    const email = uniqueEmail('signup-net')
    await page.locator('#name').first().fill('Faultline Tester')
    await page.locator('#email').first().fill(email)
    const password = 'TestPass123!'
    await page.locator('#password').first().fill(password)
    const confirm = page.locator('#confirmPassword').first()
    if (await confirm.count()) await confirm.fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /create\s*account|sign\s*up|join|start tracking/i })
        .first()
        .click()
      await page.waitForURL((u) => !/\/signup/.test(u.toString()), { timeout: 30_000 })
    })
    const r = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
    expect(r, 'signup must POST /api/users').toBeTruthy()
    expect(r!.status, 'POST /users should succeed').toBeLessThan(400)
  })
})
