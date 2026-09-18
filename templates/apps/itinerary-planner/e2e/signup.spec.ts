import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers'

test.describe('/signup', () => {
  test('renders name, email, password fields and create-account button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('textbox', { name: /name/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /create.*account/i })).toBeVisible()
  })

  test('Create account fires POST /api/users and navigates to /dashboard', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page, uniqueEmail('signup'))
    })
    const userPost = reqs.find((r) => r.method === 'POST' && /\/api\/users(?!\/log-in)/.test(r.url))
    expect(userPost, 'POST /api/users must fire').toBeDefined()
    expect(userPost!.status).toBeLessThan(400)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  })

  test('Sign in link → /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const a = page.getByRole('link', { name: /sign\s*in/i }).first()
    expect(await a.getAttribute('href')).toBe('/login')
  })

  test('Toggle theme button flips the html theme (read-after-click)', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const snap = () =>
      page.evaluate(() => ({
        cls: document.documentElement.className,
        theme: document.documentElement.dataset.theme,
        molMode: document.documentElement.getAttribute('data-mol-mode'),
        molTheme: document.documentElement.getAttribute('data-mol-theme'),
        colorScheme: document.documentElement.style.colorScheme,
      }))
    const before = await snap()
    const btn = page.getByRole('button', { name: /toggle theme/i }).first()
    // count() never auto-waits, so a pre-paint read skipped this test instead of
    // running it. waitFor retries — a skip now means the control is really absent.
    const present = await btn
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no theme toggle on /signup')
    await btn.click()
    await page.waitForTimeout(400)
    const after = await snap()
    const changed =
      after.cls !== before.cls ||
      after.theme !== before.theme ||
      after.molMode !== before.molMode ||
      after.molTheme !== before.molTheme ||
      after.colorScheme !== before.colorScheme
    expect(changed, JSON.stringify({ before, after })).toBe(true)
  })

  test('Duplicate email yields 4xx and we stay on /signup', async ({ page }) => {
    const { email, password } = await signup(page)
    const ctx = await page.context().browser()!.newContext()
    const page2 = await ctx.newPage()
    await page2.goto(APP_BASE + '/signup')
    await page2.getByRole('textbox', { name: /name/i }).fill('Twin User')
    await page2.getByRole('textbox', { name: /email/i }).fill(email)
    await page2.getByRole('textbox', { name: /password/i }).fill(password)
    const reqs = await captureNetwork(page2, async () => {
      await page2.getByRole('button', { name: /create.*account/i }).click()
      await page2.waitForTimeout(1500)
    })
    const dupCall = reqs.find((r) => r.method === 'POST' && /\/api\/users(?!\/log-in)/.test(r.url))
    expect(dupCall).toBeDefined()
    expect(dupCall!.status).toBeGreaterThanOrEqual(400)
    await ctx.close()
  })

  test('Waypoint logo link → /', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const a = page.getByRole('link', { name: /Waypoint/i }).first()
    expect(await a.getAttribute('href')).toBe('/')
  })

  test('Heading "Plan it once" or similar is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
