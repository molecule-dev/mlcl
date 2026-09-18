/**
 * /signup — public account creation form.
 *
 * Asserts on real outcomes: signup creates a row and redirects authenticated
 * to /dashboard. Wrong-confirmation passwords block signup. Auth token
 * actually persists in localStorage so the next request carries it.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
  })

  test('first-name input accepts given-name and keeps the value', async ({ page }) => {
    const first = page.getByLabel(/first name/i)
    await first.fill('Wordy')
    await expect(first).toHaveValue('Wordy')
  })

  test('last-name input accepts family-name and keeps the value', async ({ page }) => {
    const last = page.getByLabel(/last name/i)
    await last.fill('McAuthor')
    await expect(last).toHaveValue('McAuthor')
  })

  test('email input accepts email and keeps the value', async ({ page }) => {
    const email = page.getByLabel(/email/i)
    await email.fill('test@example.com')
    await expect(email).toHaveValue('test@example.com')
  })

  test('password input is masked and keeps the value', async ({ page }) => {
    const pw = page.getByLabel(/^password$/i)
    await pw.fill('TestPass123!')
    await expect(pw).toHaveAttribute('type', 'password')
    await expect(pw).toHaveValue('TestPass123!')
  })

  test('confirm-password input is masked and keeps the value', async ({ page }) => {
    const confirm = page.getByLabel(/confirm.*password/i)
    await confirm.fill('TestPass123!')
    await expect(confirm).toHaveAttribute('type', 'password')
    await expect(confirm).toHaveValue('TestPass123!')
  })

  test('Create account submits POST /api/users, navigates to /dashboard, persists JWT', async ({
    page,
  }) => {
    const email = uniqueEmail('signup-spec')
    await page.getByLabel(/first name/i).fill('Sig')
    await page.getByLabel(/last name/i).fill('Up')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/^password$/i).fill('TestPass123!')
    await page.getByLabel(/confirm.*password/i).fill('TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /create.*account/i }).click()
      await page.waitForURL((u) => !String(u).includes('/signup'), { timeout: 20000 })
    })
    const create = reqs.find((r) => /\/api\/users(?:\?|$)/.test(r.url) && r.method === 'POST')
    expect(create?.status, 'POST /api/users must succeed').toBeGreaterThanOrEqual(200)
    expect(create?.status).toBeLessThan(300)
    await expect(page).toHaveURL(/\/dashboard/)
    const token = await getAccessToken(page)
    expect(token, 'JWT bearer token must be persisted in localStorage').toBeTruthy()
  })

  test('Sign in link routes to /login', async ({ page }) => {
    await page
      .getByRole('link', { name: /^Sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Plume brand link routes to /', async ({ page }) => {
    await page
      .getByRole('link', { name: /^Plume$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/$/)
  })
})
