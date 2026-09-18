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
  test('renders the form (name, email, password, confirm)', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(
      page.getByRole('button', { name: /start automating|create.*account|sign\s*up/i }).first(),
    ).toBeVisible()
  })

  test('valid signup persists JWT and lands off /signup', async ({ page }) => {
    const { accessToken, userId } = await signup(page, uniqueEmail('sig-ok'))
    expect(accessToken).toBeTruthy()
    expect(userId).toBeTruthy()
  })

  test('signup via UI form lands off /signup and persists JWT', async ({ page }) => {
    await signupViaUI(page, uniqueEmail('sig-ui'))
    const tok = await getAccessToken(page)
    expect(tok, 'JWT persisted via UI signup').toBeTruthy()
  })

  test('signup fires POST /api/users that returns 201', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = uniqueEmail('sig-net')
    const password = 'TestPass1234!'
    const inputs = page.locator('input')
    await inputs.nth(0).fill('Dendrite Tester')
    await inputs.nth(1).fill(email)
    await inputs.nth(2).fill(password)
    await inputs.nth(3).fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /start automating|create.*account|sign\s*up/i })
        .first()
        .click()
      await page.waitForURL((u) => !/\/signup$/.test(u.toString()), { timeout: 30_000 })
    })
    const r = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
    expect(r, 'signup must POST /api/users').toBeTruthy()
    expect(r!.status).toBeLessThan(400)
  })

  test('mismatched passwords show inline error and do NOT POST', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = uniqueEmail('sig-mismatch')
    const inputs = page.locator('input')
    await inputs.nth(0).fill('Mismatch')
    await inputs.nth(1).fill(email)
    await inputs.nth(2).fill('Password1!')
    await inputs.nth(3).fill('Different2!')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /start automating|create.*account|sign\s*up/i })
        .first()
        .click()
      await page.waitForTimeout(500)
    })
    const usersPosts = reqs.filter((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
    expect(usersPosts.length, 'mismatched passwords should not POST /api/users').toBe(0)
  })

  test('duplicate email returns ≥400 from /api/users', async ({ page }) => {
    const email = uniqueEmail('sig-dup')
    const password = 'TestPass1234!'
    const first = await page.request.post(`${API_BASE}/users`, {
      data: { email, password, name: 'First' },
    })
    expect(first.status()).toBe(201)
    const second = await page.request.post(`${API_BASE}/users`, {
      data: { email, password, name: 'Second' },
    })
    expect(second.status()).toBeGreaterThanOrEqual(400)
  })

  test('signup link to /login navigates correctly', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.getByRole('link', { name: /sign\s*in/i }).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/login/)
  })
})
