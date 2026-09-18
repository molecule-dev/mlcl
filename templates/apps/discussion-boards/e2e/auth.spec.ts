import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, signupViaUI, uniqueEmail } from './_helpers.js'

test.describe('auth', () => {
  test('signup via UI lands the user in the app and the SPA loads categories', async ({ page }) => {
    const { email } = await signupViaUI(page)
    await expect(page).not.toHaveURL(/\/signup/)
    expect(email).toMatch(/@example\.com$/)
    // The first authenticated GET should return the board's categories.
    const res = await page.request.get(API_BASE + '/categories')
    expect(res.status()).toBe(200)
    const body = await res.json()
    const list = Array.isArray(body) ? body : body.data
    expect(list.length).toBeGreaterThan(0)
    // Every room the API returns is routable — the slug is what /c/:slug uses.
    for (const c of list as Array<{ slug: string }>) expect(c.slug).toBeTruthy()
  })

  test('login redirects an already-signed-up user back into the app', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const email = uniqueEmail()
    const password = 'TestPass123!'
    const res = await page.request.post(API_BASE + '/users', {
      data: { email, password, name: 'Returning Stoic' },
    })
    expect(res.status()).toBe(201)
    await ctx.close()

    const ctx2 = await browser.newContext()
    const page2 = await ctx2.newPage()
    await page2.goto(APP_BASE + '/login')
    await page2.getByLabel(/Email/i).fill(email)
    await page2.getByLabel(/Password/i).fill(password)
    await page2.getByRole('button', { name: /Sign in|Log in/i }).click()
    await expect(page2).not.toHaveURL(/\/login/, { timeout: 15000 })
    await ctx2.close()
  })

  test('signup page renders the signup form', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByLabel(/Display name/i)).toBeVisible()
    await expect(page.getByLabel(/Email/i)).toBeVisible()
    await expect(page.getByLabel(/^Password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Create account/i })).toBeVisible()
  })

  test('forgot-password page renders the email field', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByLabel(/Email/i).first()).toBeVisible()
  })

  test('reset-password page is reachable', async ({ page }) => {
    const res = await page.goto(APP_BASE + '/reset-password?token=fake')
    expect(res?.status()).toBeLessThan(500)
  })

  test('landing page is reachable for anonymous visitors', async ({ page }) => {
    const res = await page.goto(APP_BASE + '/')
    expect(res?.status()).toBeLessThan(500)
  })
})
