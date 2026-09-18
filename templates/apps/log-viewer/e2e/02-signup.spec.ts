import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers'

// /signup — POST /api/users → JWT issued → redirect to /dashboard.

test.describe('/signup', () => {
  test('renders fields without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(
      page.getByRole('button', { name: /create.*account|sign.*up|get.*started/i }),
    ).toBeVisible()
  })

  test('submitting fires POST /api/users and lands on /dashboard', async ({ page }) => {
    const email = uniqueEmail()
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('input[type="email"]').fill(email)
      await page.locator('input[type="password"]').first().fill('TestPass1234!')
      const confirms = await page.locator('input[type="password"]').count()
      if (confirms > 1) {
        await page.locator('input[type="password"]').nth(1).fill('TestPass1234!')
      }
      const tc = page.getByRole('checkbox').first()
      if (await tc.count().catch(() => 0)) {
        if (!(await tc.isChecked())) await tc.check()
      }
      await page
        .getByRole('button', { name: /create.*account|sign.*up|get.*started/i })
        .first()
        .click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    })
    const usersPost = reqs.find((r) => r.method === 'POST' && /\/api\/users(\b|\?|$)/.test(r.url))
    expect(usersPost, 'POST /api/users should fire on signup').toBeDefined()
    expect(usersPost!.status, 'signup POST should be 2xx').toBeLessThan(300)
  })

  test('"Sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('email field accepts typed input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.locator('input[type="email"]')
    await email.fill('walker@example.com')
    await expect(email).toHaveValue('walker@example.com')
  })
})
