import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('display name field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const tb = page.getByLabel(/Display name/i)
    await tb.fill('Bidder Test')
    await expect(tb).toHaveValue('Bidder Test')
  })

  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const tb = page.getByLabel(/email/i).first()
    await tb.fill('new-bidder@example.com')
    await expect(tb).toHaveValue('new-bidder@example.com')
  })

  test('password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const tb = page.getByLabel(/^password$/i).first()
    await tb.fill('TestPass123!')
    await expect(tb).toHaveValue('TestPass123!')
  })

  test('Show password reveals plaintext', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.getByLabel(/^password$/i).first()
    await pw.fill('TestPass123!')
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /Show password/i }).click()
    await expect(pw).toHaveAttribute('type', 'text')
  })

  test('Sign in link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /Sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('Terms link goes to /terms', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /Terms/i }).click()
    await expect(page).toHaveURL(/\/terms/)
  })

  test('Privacy link goes to /privacy', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /Privacy/i }).click()
    await expect(page).toHaveURL(/\/privacy/)
  })

  test('Create account submits POST /api/users and lands signed-in user off /signup', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    const email = uniqueEmail('signup')
    await page.getByLabel(/Display name/i).fill('Signup Test')
    await page.getByLabel(/email/i).first().fill(email)
    await page
      .getByLabel(/^password$/i)
      .first()
      .fill('TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Create account/i }).click()
      await page.waitForURL((u) => !u.pathname.includes('/signup'), { timeout: 15000 })
    })
    expect(page.url()).not.toMatch(/\/signup/)
    expect(
      reqs.some((r) => /\/api\/users(?:\?|$)/.test(r.url) && r.method === 'POST' && r.status < 400),
    ).toBeTruthy()
  })
})
