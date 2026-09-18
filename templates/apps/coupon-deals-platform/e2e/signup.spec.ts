import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('Signup page (/signup)', () => {
  test('Snagr brand link navigates back to /', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: 'Snagr' }).click()
    await expect(page).toHaveURL(/^http:\/\/[^/]+\/?$/)
  })

  test('First name input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByLabel('First name').fill('Sam')
    await expect(page.getByLabel('First name')).toHaveValue('Sam')
  })

  test('Last name input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByLabel('Last name').fill('Snagger')
    await expect(page.getByLabel('Last name')).toHaveValue('Snagger')
  })

  test('Email input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByLabel('Email address').fill('sam@example.com')
    await expect(page.getByLabel('Email address')).toHaveValue('sam@example.com')
  })

  test('Password input accepts text and is masked', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.getByLabel('Password', { exact: true }).first()
    await pw.fill('Secret123!')
    await expect(pw).toHaveValue('Secret123!')
    await expect(pw).toHaveAttribute('type', 'password')
  })

  test('Confirm password input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByLabel('Confirm password', { exact: true }).fill('Secret123!')
    await expect(page.getByLabel('Confirm password', { exact: true })).toHaveValue('Secret123!')
  })

  test('"Show password" toggle flips password input type', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.getByLabel('Password', { exact: true }).first()
    await pw.fill('Secret123!')
    await page.getByRole('button', { name: 'Show password' }).first().click()
    await expect(pw).toHaveAttribute('type', 'text')
  })

  test('Submit posts /api/users and redirects to /dashboard', async ({ page }) => {
    const email = uniqueEmail('signup-spec')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.getByLabel('First name').fill('Sam')
      await page.getByLabel('Last name').fill('Snagger')
      await page.getByLabel('Email address').fill(email)
      await page.getByLabel('Password', { exact: true }).first().fill('TestPass!1234')
      await page.getByLabel('Confirm password', { exact: true }).fill('TestPass!1234')
      await page.getByRole('button', { name: /create account and start saving/i }).click()
      await page.waitForURL('**/dashboard', { timeout: 20_000 })
    })
    const creates = reqs.filter((r) => /\/api\/users(\?|$)/.test(r.url) && r.method === 'POST')
    expect(creates.length, 'POST /api/users fired').toBeGreaterThan(0)
    expect(
      creates.some((r) => r.status === 201),
      'one POST /api/users returned 201',
    ).toBe(true)
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('"Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
