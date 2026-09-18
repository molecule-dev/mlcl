/**
 * /signup — Public signup form. POST /api/users creates the user and the
 * client persists the access token to localStorage; submit redirects to
 * /dashboard.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders heading + form + bottom link', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('form[data-mol-id="signup-form"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /Create account/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Sign in/ })).toBeVisible()
  })

  test('first / last name inputs accept text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#signup-first-name').fill('Mara')
    await page.locator('input#signup-last-name').fill('Vieira')
    await expect(page.locator('input#signup-first-name')).toHaveValue('Mara')
    await expect(page.locator('input#signup-last-name')).toHaveValue('Vieira')
  })

  test('email input accepts a valid email and HTML5-validates required', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.locator('input#signup-email')
    await email.fill('hello@studio.test')
    expect(await email.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(true)
  })

  test('password input enforces minLength 8 (HTML5 validity)', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.locator('input#signup-password')
    await pw.fill('short')
    expect(await pw.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false)
    await pw.fill('properpass1234')
    expect(await pw.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(true)
  })

  test('mismatched confirm password renders the inline error', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#signup-password').fill('properpass1234')
    await page.locator('input#signup-confirm').fill('different')
    await expect(page.locator('text=/Passwords do not match/i')).toBeVisible()
  })

  test('submitting valid form creates user and lands on /dashboard — POST /api/users hit', async ({
    page,
  }) => {
    const email = uniqueEmail('signup')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('input#signup-first-name').fill('Test')
      await page.locator('input#signup-last-name').fill('User')
      await page.locator('input#signup-email').fill(email)
      await page.locator('input#signup-password').fill('TestPass!1234')
      await page.locator('input#signup-confirm').fill('TestPass!1234')
      await page.locator('form[data-mol-id="signup-form"] button[type="submit"]').click()
      await page.waitForURL('**/dashboard', { timeout: 15000 })
    })
    const post = reqs.find(
      (r) => /\/api\/users\b/.test(r.url) && r.method === 'POST' && r.status < 400,
    )
    expect(post, `POST /api/users — ${JSON.stringify(reqs)}`).toBeTruthy()
  })

  test('"Sign in" bottom link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /Sign in/ }).click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('signup persists JWT bearer token to localStorage', async ({ page }) => {
    const { accessToken } = await signup(page)
    expect(accessToken).toBeTruthy()
    expect(accessToken.length).toBeGreaterThan(20)
  })
})
