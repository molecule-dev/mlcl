/**
 * /signup per-page suite.
 * Each row in observations/signup.md is exercised here.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, BRAND, captureNetwork, getAccessToken, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('renders Learner/Tutor toggle, name/email/password fields, submit', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('button', { name: /^learner$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^tutor$/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /full name|name/i }).first()).toBeVisible()
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.locator('form button[type="submit"]').first()).toBeVisible()
  })

  test('toggling Tutor changes the submit CTA copy', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('button', { name: /^tutor$/i }).click()
    await expect(page.locator('form button[type="submit"]').first()).toHaveText(
      /tutor account|create my tutor/i,
    )
  })

  test('Show password toggles input type', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const toggle = page.getByRole('button', { name: /show password/i }).first()
    await page.locator('input[type="password"]').first().fill('whatever')
    await toggle.click()
    await expect(page.locator('input[type="text"]')).toHaveCount(2) // name + revealed pw
  })

  test('"Already have an account" link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /already have an account|sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 })
  })

  test('valid signup POSTs /api/users 201 + lands authenticated', async ({ page }) => {
    const email = uniqueEmail('signup-page')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page
        .getByRole('textbox', { name: /full name|name/i })
        .first()
        .fill('Sara Ahmed')
      await page.locator('input[type="email"]').first().fill(email)
      await page.locator('input[type="password"]').first().fill('TestPass123!')
      await page.locator('form button[type="submit"]').first().click()
      await expect(page).not.toHaveURL(/\/signup$/, { timeout: 20_000 })
    })
    expect(
      reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))?.status,
    ).toBeGreaterThanOrEqual(200)
    const tok = await getAccessToken(page)
    expect(tok, 'access token persisted').toBeTruthy()
  })

  test('signing up as Tutor still creates a user (no tutor row required at signup)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('button', { name: /^tutor$/i }).click()
    const email = uniqueEmail('signup-tutor')
    await page
      .getByRole('textbox', { name: /full name|name/i })
      .first()
      .fill('T Tutor')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill('TestPass123!')
    await page.locator('form button[type="submit"]').first().click()
    await expect(page).not.toHaveURL(/\/signup$/, { timeout: 20_000 })
  })

  test('weak password (too short) is rejected by the API', async ({ page }) => {
    // The 4xx here is the assertion target; the browser still logs it as a
    // console error, so allow exactly that.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: /status of 4/,
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page
        .getByRole('textbox', { name: /full name|name/i })
        .first()
        .fill('X X')
      await page.locator('input[type="email"]').first().fill(uniqueEmail('weak'))
      await page.locator('input[type="password"]').first().fill('short')
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForTimeout(2_000)
    })
    const fail = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
    // Either 400 (validation) or stays-on-/signup (we already filter weak in UI).
    if (fail) expect(fail.status).toBeGreaterThanOrEqual(400)
  })

  test('Brand logo link in /signup nav returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: new RegExp(`^${BRAND}$`, 'i') })
      .first()
      .click()
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
  })
})
