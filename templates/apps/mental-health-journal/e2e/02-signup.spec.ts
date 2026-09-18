import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, uniqueEmail } from './_helpers'

test.describe('/signup', () => {
  test('renders signup form fields and CTA', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByLabel(/first name/i)).toBeVisible()
    await expect(page.getByLabel(/last name/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByLabel(/confirm password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('first name field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const f = page.getByLabel(/first name/i)
    await f.fill('Walker')
    await expect(f).toHaveValue('Walker')
  })

  test('last name field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const f = page.getByLabel(/last name/i)
    await f.fill('Tester')
    await expect(f).toHaveValue('Tester')
  })

  test('email field accepts email input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const f = page.getByLabel(/email/i)
    await f.fill('foo@example.com')
    await expect(f).toHaveValue('foo@example.com')
  })

  test('password field accepts and masks input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const f = page.getByLabel(/^password$/i)
    await f.fill('TestPass123!')
    await expect(f).toHaveAttribute('type', 'password')
  })

  test('"Sign in" link points to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.getByRole('link', { name: /^Sign in$/i }).first()
    expect(await link.getAttribute('href')).toBe('/login')
  })

  test('successful signup hits POST /api/users and redirects off /signup', async ({ page }) => {
    const email = uniqueEmail('signup')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.getByLabel(/first name/i).fill('Walker')
      await page.getByLabel(/last name/i).fill('Tester')
      await page.getByLabel(/email/i).fill(email)
      await page.getByLabel(/^password$/i).fill('TestPass123!')
      await page.getByLabel(/confirm password/i).fill('TestPass123!')
      await page.getByRole('button', { name: /create account/i }).click()
      await expect(page).not.toHaveURL(/\/signup/, { timeout: 15_000 })
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && r.url.includes('/api/users') && !r.url.includes('log-in'),
    )
    expect(post, 'POST /api/users observed').toBeDefined()
    expect(post!.status, 'signup returned 2xx').toBeLessThan(300)

    // Read-after-write: log-in via API to confirm the user really exists
    const loginRes = await fetch(API_BASE + '/users/log-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'TestPass123!' }),
    })
    expect(loginRes.status, 'created user can log in').toBeLessThan(400)
  })
})
