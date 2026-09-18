import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, uniqueEmail, captureNetwork } from './_helpers.js'

test.describe('login', () => {
  test('valid credentials redirect off /login', async ({ page }) => {
    const email = uniqueEmail('login')
    const created = await page.request.post(`${API_BASE}/users`, {
      data: { email, password: 'TestPass123!', name: 'Login Tester' },
    })
    expect(created.status()).toBe(201)
    await page.goto(APP_BASE + '/login')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="email"]').fill(email)
      await page.locator('input[autocomplete="current-password"]').fill('TestPass123!')
      await page
        .getByRole('button', { name: /sign\s*in|log\s*in/i })
        .first()
        .click()
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
    })
    expect(
      reqs.some(
        (r) => r.method === 'POST' && r.url.includes('/api/users/log-in') && r.status === 200,
      ),
      'expected POST /api/users/log-in to be exercised',
    ).toBe(true)
  })

  test('wrong password keeps user on /login and surfaces an error', async ({ page }) => {
    const email = uniqueEmail('wrong')
    const created = await page.request.post(`${API_BASE}/users`, {
      data: { email, password: 'TestPass123!', name: 'Wrong Tester' },
    })
    expect(created.status()).toBe(201)
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[autocomplete="current-password"]').fill('NotTheRightPassword')
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
    await expect(
      page.getByText(/invalid|incorrect|wrong|could not|error|unauthor|fail/i).first(),
    ).toBeVisible({ timeout: 5000 })
  })

  test('Show password toggle flips password field type', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pwd = page.locator('input[autocomplete="current-password"]')
    await expect(pwd).toHaveAttribute('type', 'password')
    await page
      .getByRole('button', { name: /show password/i })
      .first()
      .click()
    await expect(pwd).toHaveAttribute('type', 'text')
  })

  test('Forgot password? link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /forgot password/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('Start a free trial link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /start.*trial|sign\s*up/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('Gauge logo on login navigates to landing /', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /gauge/i }).first().click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('email and password fields are present and editable', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const email = page.locator('input[type="email"]')
    const pwd = page.locator('input[autocomplete="current-password"]')
    await email.fill('typed@example.com')
    await pwd.fill('typedpassword')
    await expect(email).toHaveValue('typed@example.com')
    await expect(pwd).toHaveValue('typedpassword')
  })
})
