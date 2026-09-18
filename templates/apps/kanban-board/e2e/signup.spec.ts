import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('full-name field accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const name = page.getByLabel(/Full name/i)
    await name.fill('Robin Vale')
    await expect(name).toHaveValue('Robin Vale')
  })

  test('email field accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.getByLabel(/Work email/i)
    await email.fill('sarah@example.com')
    await expect(email).toHaveValue('sarah@example.com')
  })

  test('password field accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.getByLabel(/Password/i).first()
    await pw.fill('TestPass123!')
    await expect(pw).toHaveValue('TestPass123!')
  })

  test('submit creates the user via POST /api/users and lands on /dashboard', async ({ page }) => {
    const email = uniqueEmail('signup')
    await page.goto(APP_BASE + '/signup')
    await page.getByLabel(/Full name/i).fill('Driftboard Tester')
    await page.getByLabel(/Work email/i).fill(email)
    await page
      .getByLabel(/Password/i)
      .first()
      .fill('TestPass123!')

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Create my workspace/i }).click()
      await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    })

    await expect(page).toHaveURL(/\/dashboard/)
    const create = reqs.find((r) => /\/api\/users\b/.test(r.url) && r.method === 'POST')
    expect(create, 'POST /api/users should fire').toBeTruthy()
    expect(create!.status).toBeLessThan(300)

    // INVARIANT: the user really exists — they can hit a guarded endpoint.
    const me = await page.request.get(`${API_BASE}/boards`)
    expect(me.status()).toBe(200)
  })

  test('Footer Sign-in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /^Sign in$/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
