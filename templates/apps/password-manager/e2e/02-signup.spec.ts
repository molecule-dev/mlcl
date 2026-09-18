import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, uniqueEmail, STRONG_PASSWORD } from './_helpers'

test.describe('/signup', () => {
  test('renders all required fields and the seal-vault button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByPlaceholder(/first name/i)).toBeVisible()
    await expect(page.getByPlaceholder(/last name/i)).toBeVisible()
    await expect(page.getByPlaceholder(/^email$/i)).toBeVisible()
    await expect(page.getByPlaceholder(/^master password$/i)).toBeVisible()
    await expect(page.getByPlaceholder(/confirm master password/i)).toBeVisible()
    await expect(
      page.getByRole('button', { name: /seal my vault|create.*vault|sign up/i }),
    ).toBeVisible()
  })

  test('signup creates a user (POST /api/users 2xx) and lands inside auth zone', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
    })
    const post = reqs.find(
      (r) =>
        r.method === 'POST' &&
        /\/api\/users(\b|\/|\?|$)/.test(r.url) &&
        !/log-in|forgot|reset/.test(r.url),
    )
    expect(post, 'POST /api/users should fire on signup').toBeDefined()
    expect(post!.status).toBeGreaterThanOrEqual(200)
    expect(post!.status).toBeLessThan(300)
    await expect(page).toHaveURL(/\/(vault|generator|shared|security|settings|profile)/, {
      timeout: 15_000,
    })
  })

  test('"Sign In" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('signup persists session — reloading /vault keeps user authed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vault')
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    await page.reload()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('confirm-password mismatch does not submit', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByPlaceholder(/first name/i).fill('Mis')
    await page.getByPlaceholder(/last name/i).fill('Match')
    await page.getByPlaceholder(/^email$/i).fill(uniqueEmail('mismatch'))
    await page.getByPlaceholder(/^master password$/i).fill(STRONG_PASSWORD)
    await page.getByPlaceholder(/confirm master password/i).fill('different-password!')
    await page.getByRole('button', { name: /seal my vault|create.*vault|sign up/i }).click()
    await page.waitForTimeout(500)
    await expect(page).toHaveURL(/\/signup/)
  })
})
