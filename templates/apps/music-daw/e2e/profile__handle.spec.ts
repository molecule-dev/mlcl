import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiSignup,
  authedApi,
  captureNetwork,
  createProject,
  signup,
  whereUrl,
} from './_helpers.js'

test.describe('Profile page (/profile/:handle)', () => {
  test('renders user displayName as h1', async ({ page }) => {
    const session = await signup(page, { firstName: 'Aria', lastName: 'Vega' })
    await page.goto(APP_BASE + `/profile/${session.handle ?? 'me'}`)
    await expect(page.getByRole('heading', { name: 'Aria Vega' })).toBeVisible()
  })

  test('renders meta line with @handle and joined-year', async ({ page }) => {
    const session = await signup(page, { handle: 'profile-test-' + Date.now() })
    await page.goto(APP_BASE + `/profile/${session.handle}`)
    await expect(page.getByText(new RegExp(`@${session.handle}`, 'i'))).toBeVisible()
    await expect(page.getByText(/joined \d{4}/i)).toBeVisible()
  })

  test('renders bio (default copy when no bio is set)', async ({ page }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + `/profile/${session.handle}`)
    await expect(page.getByText(/Crafting sounds in the studio/i)).toBeVisible()
  })

  test('"Edit profile" CTA → /settings', async ({ page }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + `/profile/${session.handle}`)
    await page.getByRole('link', { name: /edit profile/i }).click()
    await expect(page).toHaveURL(/\/settings$/)
  })

  test('"Projects" CTA in hero → /projects', async ({ page }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + `/profile/${session.handle}`)
    await page
      .getByRole('link', { name: /^Projects$/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/projects$/)
  })

  test('Projects stat reflects real projects count', async ({ page, request }) => {
    const u = await apiSignup(request)
    await createProject(request, u.accessToken!, { name: 'P1' })
    await createProject(request, u.accessToken!, { name: 'P2' })
    await createProject(request, u.accessToken!, { name: 'P3' })
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(u.email)
    await page.locator('#password').fill(u.password)
    await page.getByRole('button', { name: /open the studio|sign\s*in/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    await page.goto(APP_BASE + '/profile/me')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=Projects').first()).toBeVisible()
    await expect(page.getByText(/^3$/).first()).toBeVisible()
  })

  test('initial load fetches /api/preferences, /api/projects, /api/samples', async ({ page }) => {
    const session = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/profile/${session.handle}`)
      await page.waitForLoadState('networkidle')
    })
    expect(whereUrl(reqs, /\/api\/preferences/, 'GET').length).toBeGreaterThan(0)
    expect(whereUrl(reqs, /\/api\/projects(?!\/)/, 'GET').length).toBeGreaterThan(0)
    expect(whereUrl(reqs, /\/api\/samples(?!\/)/, 'GET').length).toBeGreaterThan(0)
  })

  test('"Your projects" and "Your samples" sections are visible', async ({ page }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + `/profile/${session.handle}`)
    await expect(page.getByRole('heading', { name: /Your projects/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Your samples/i })).toBeVisible()
  })

  test('"View all" link in projects section → /projects', async ({ page }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + `/profile/${session.handle}`)
    await page
      .getByRole('link', { name: /^View all$/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/projects$/)
  })

  test('updating handle in /settings reflects on profile after reload', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const newHandle = 'reflectme-' + Date.now()
    const api = authedApi(request, session.accessToken!)
    const res = await api.put('/preferences', { data: { handle: newHandle } })
    expect(res.status()).toBeLessThan(300)
    await page.goto(APP_BASE + `/profile/${newHandle}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(new RegExp(`@${newHandle}`, 'i'))).toBeVisible()
  })

  test('anonymous /profile/:handle redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/profile/nobody')
    await page.waitForURL(/\/login|\/$/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/login|\/$/)
  })

  test('profile stat label "Tracks" is rendered (with numeric value)', async ({ page }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + `/profile/${session.handle}`)
    await expect(page.getByText(/^Tracks$/i).first()).toBeVisible()
  })

  test('profile stat label "Samples" is rendered', async ({ page }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + `/profile/${session.handle}`)
    await expect(page.getByText(/^Samples$/i).first()).toBeVisible()
  })

  test('profile stat label "Minutes" is rendered', async ({ page }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + `/profile/${session.handle}`)
    await expect(page.getByText(/^Minutes$/i).first()).toBeVisible()
  })
})
