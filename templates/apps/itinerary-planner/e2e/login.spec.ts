import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, login, signup } from './_helpers'

test.describe('/login', () => {
  test('renders email and password fields plus submit', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign\s*in/i })).toBeVisible()
  })

  test('valid creds POST /api/users/log-in and navigate off /login', async ({ page, browser }) => {
    const { email, password } = await signup(page)
    const ctx = await browser.newContext()
    const page2 = await ctx.newPage()
    const reqs = await captureNetwork(page2, async () => {
      await login(page2, email, password)
    })
    const sessionCall = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
    expect(sessionCall, 'POST /api/users/log-in must fire').toBeDefined()
    expect(sessionCall!.status).toBeLessThan(400)
    await expect(page2).not.toHaveURL(/\/login/, { timeout: 15_000 })
    await ctx.close()
  })

  test('invalid creds keep us on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('textbox', { name: /email/i }).fill('nobody@example.com')
    await page.getByRole('textbox', { name: /password/i }).fill('WrongPass123!')
    await page.getByRole('button', { name: /sign\s*in/i }).click()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login/)
  })

  test('Forgot password link → /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const a = page.getByRole('link', { name: /forgot/i }).first()
    expect(await a.getAttribute('href')).toBe('/forgot-password')
  })

  test('Create-account / Sign up link → /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const a = page.getByRole('link', { name: /create.*account|sign\s*up/i }).first()
    expect(await a.getAttribute('href')).toBe('/signup')
  })

  test('Waypoint brand link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const a = page.getByRole('link', { name: /Waypoint/i }).first()
    expect(await a.getAttribute('href')).toBe('/')
  })
})
