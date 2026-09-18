import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('name input accepts an optional value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const name = page.getByLabel(/your name/i).first()
    await name.fill('Test User')
    await expect(name).toHaveValue('Test User')
  })

  test('email input accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.getByLabel(/email/i).first()
    await email.fill('new@example.com')
    await expect(email).toHaveValue('new@example.com')
  })

  test('password input accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.getByLabel(/^password$/i).first()
    await pw.fill('TestPass123!')
    await expect(pw).toHaveValue('TestPass123!')
  })

  test('Create account submits POST /api/users and lands on /dashboard', async ({ page }) => {
    const email = uniqueEmail('signup')
    await page.goto(APP_BASE + '/signup')
    await page.getByLabel(/email/i).first().fill(email)
    await page
      .getByLabel(/^password$/i)
      .first()
      .fill('TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Create account/i }).click()
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    })
    await expect(page).toHaveURL(/\/dashboard/)
    const usersPost = reqs.find((r) => /\/api\/users(?:\?|$)/.test(r.url) && r.method === 'POST')
    expect(usersPost, 'POST /api/users should fire on signup').toBeTruthy()
    expect(usersPost!.status).toBe(201)
  })

  test('Footer Sign in link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /^Sign in$/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
