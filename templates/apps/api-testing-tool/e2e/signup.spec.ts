import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('full name field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const tb = page.getByLabel(/Full name/i)
    await tb.fill('Test User')
    await expect(tb).toHaveValue('Test User')
  })

  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const tb = page.getByLabel(/Email address/i)
    await tb.fill('hello@example.com')
    await expect(tb).toHaveValue('hello@example.com')
  })

  test('password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const tb = page.getByLabel(/^Password$/i)
    await tb.fill('TestPass123!')
    await expect(tb).toHaveValue('TestPass123!')
  })

  test('confirm password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const tb = page.getByLabel(/Confirm password/i)
    await tb.fill('TestPass123!')
    await expect(tb).toHaveValue('TestPass123!')
  })

  test('"Create account" submits + redirects to /workspace + POST /api/users observed', async ({
    page,
  }) => {
    const email = uniqueEmail('su')
    await page.goto(APP_BASE + '/signup')
    await page.getByLabel(/Full name/i).fill('Test User')
    await page.getByLabel(/Email address/i).fill(email)
    await page.getByLabel(/^Password$/i).fill('TestPass123!')
    await page.getByLabel(/Confirm password/i).fill('TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Create account/i }).click()
      await page.waitForURL(/\/workspace/, { timeout: 15_000 })
    })
    expect(page.url()).toMatch(/\/workspace/)
    expect(
      reqs.some((r) => r.method === 'POST' && /\/api\/users(?:\?|$)/.test(r.url)),
      'POST /api/users must be observed',
    ).toBeTruthy()
  })

  test('"Sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /^Sign in$/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('brand "Pylon" link returns to landing /', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /^Pylon ?\.?$/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(`${APP_BASE.replace(/[/.]/g, '\\$&')}/?$`))
  })

  test('mismatched password + confirmation surfaces an inline error', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByLabel(/Full name/i).fill('Test User')
    await page.getByLabel(/Email address/i).fill(uniqueEmail('mm'))
    await page.getByLabel(/^Password$/i).fill('TestPass123!')
    await page.getByLabel(/Confirm password/i).fill('DIFFERENT')
    await page.getByRole('button', { name: /Create account/i }).click()
    await expect(page.locator('[data-mol-id="signup-error"]')).toBeVisible()
    expect(page.url()).toMatch(/\/signup/)
  })
})
