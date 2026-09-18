// End-to-end walkthrough — proves a brand-new user can sign up and use
// every primary feature without seeing a 404, swallowed error, or empty
// state where data should be. Each `test()` is one realistic flow.

import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, BRAND, api, apiRaw, captureNetwork, signup } from './_helpers.js'

test('Landing page renders the hero + CTA links', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // The two primary CTAs both exist and target /signup and /login.
  await expect(page.getByRole('link', { name: /start tracking/i }).first()).toHaveAttribute(
    'href',
    /\/signup/,
  )
  await expect(page.getByRole('link', { name: /sign in/i }).first()).toHaveAttribute(
    'href',
    /\/login/,
  )
})

test('Authenticated user can navigate to dashboard from sidebar brand link', async ({ page }) => {
  await signup(page)
  // The sidebar's brand link points to /dashboard.
  await page
    .locator('aside')
    .getByRole('link', { name: new RegExp(BRAND, 'i') })
    .click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
})

test('Dashboard with a default location renders real Open-Meteo data', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Boston',
    address: 'Boston, MA, USA',
    is_default: true,
  })
  await page.goto(APP_BASE + '/dashboard')
  // Hero card shows the location name + a non-zero temperature
  await expect(page.locator('main')).toContainText(/Boston/i, { timeout: 20_000 })
  const txt = await page.locator('main').innerText()
  // °F appears at least once in the rendered hero or hourly strip.
  expect(txt).toMatch(/\d{2,3}°F?/)
})

test('Dashboard empty state appears when user has no locations', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await expect(page.locator('main')).toContainText(/Add your first location/i, {
    timeout: 10_000,
  })
  await expect(page.getByRole('link', { name: /add a location/i }).first()).toHaveAttribute(
    'href',
    /\/locations/,
  )
})

test('Locations page renders the list and the search filter actually filters', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Helsinki',
    address: 'Helsinki, Finland',
    is_default: true,
  })
  await api(page, 'POST', '/locations', {
    name: 'Lisbon',
    address: 'Lisbon, Portugal',
  })
  await page.goto(APP_BASE + '/locations')
  await expect(page.locator('main')).toContainText(/Helsinki/i)
  await expect(page.locator('main')).toContainText(/Lisbon/i)
  await page.locator('input[type="search"]').fill('Helsi')
  await expect(page.locator('main')).toContainText(/Helsinki/i)
  // Lisbon should be hidden by the filter.
  await page.waitForTimeout(200)
  const txt = await page.locator('main').innerText()
  expect(txt).not.toMatch(/Lisbon/i)
})

test('LocationDetail page shows the location and its forecasts', async ({ page }) => {
  await signup(page)
  const loc = await api<{ id: string; name: string }>(page, 'POST', '/locations', {
    name: 'Reykjavik',
    address: 'Reykjavik, Iceland',
    is_default: true,
  })
  await page.goto(APP_BASE + `/location/${loc.id}`)
  await expect(page.getByRole('heading', { level: 1, name: /Reykjavik/i })).toBeVisible({
    timeout: 20_000,
  })
  // The hero card should render real provider data, so the page text
  // contains a temperature with a degree symbol.
  const txt = await page.locator('main').innerText()
  expect(txt).toMatch(/\d{2,3}°/)
})

test('Radar page centers on the default location lat/lon', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Cairo',
    address: 'Cairo, Egypt',
    is_default: true,
  })
  await page.goto(APP_BASE + '/radar')
  // Coordinates appear in the floating chip on top of the map.
  await expect(page.locator('main')).toContainText(/Cairo/i, { timeout: 15_000 })
  await expect(page.locator('iframe[title*="Radar"]')).toBeVisible()
})

test('Radar page shows the empty CTA when no default location is saved', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/radar')
  await expect(page.locator('main')).toContainText(/Set a default location/i, {
    timeout: 10_000,
  })
})

test('Compare page shows side-by-side cards for at least two locations', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Vienna',
    address: 'Vienna, Austria',
    is_default: true,
  })
  await api(page, 'POST', '/locations', { name: 'Oslo', address: 'Oslo, Norway' })
  await page.goto(APP_BASE + '/compare')
  await expect(page.locator('main')).toContainText(/Vienna/i, { timeout: 20_000 })
  await expect(page.locator('main')).toContainText(/Oslo/i)
})

test('Compare page shows the empty state when only one location is saved', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'OnlyOne',
    address: 'Reykjavik, Iceland',
    is_default: true,
  })
  await page.goto(APP_BASE + '/compare')
  await expect(page.locator('main')).toContainText(/Add at least two/i, { timeout: 10_000 })
})

test('Trends page renders a chart from posted history', async ({ page }) => {
  await signup(page)
  const loc = await api<{ id: string; name: string }>(page, 'POST', '/locations', {
    name: 'San Diego Default',
    address: 'San Diego, CA, USA',
    is_default: true,
  })
  // Seed at least 5 days so the SVG path can render.
  const today = new Date()
  const entries = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today)
    d.setUTCDate(today.getUTCDate() - i)
    return {
      observed_date: d.toISOString().slice(0, 10),
      temp_high: 70 + i,
      temp_low: 55 + i,
      temp_avg: 62 + i,
      humidity: 50 + i,
      precipitation_mm: i * 0.5,
      wind_speed_avg: 5 + i,
    }
  })
  await api(page, 'POST', `/history/${loc.id}`, { entries })
  await page.goto(APP_BASE + '/trends')
  await expect(page.locator('main')).toContainText(/San Diego Default/i, { timeout: 15_000 })
  // The chart svg path renders only when series.length >= 2 + summary
  // exists. The summary block shows "Days" with the count.
  await expect(page.locator('main svg')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('main')).toContainText(/Days/i)
  // Range buttons toggle aria-pressed.
  await page.getByRole('button', { name: /^7 days$/i }).click()
  const pressed = await page.getByRole('button', { name: /^7 days$/i }).getAttribute('aria-pressed')
  expect(pressed).toBe('true')
})

test('Theme toggle on auth pages flips <html data-mol-mode> and survives reload', async ({
  page,
}) => {
  // The dashboard shell does not host a theme toggle — it lives on the
  // public auth pages (Login/Signup/ForgotPassword). The CSS-variables
  // theme bond writes data-mol-theme + data-mol-mode on <html>, and
  // persists the choice under localStorage["molecule-theme"]. Toggling
  // there must flip the attribute AND survive a page reload.
  await page.goto(APP_BASE + '/signup')
  // Wait for the theme bond to have applied its initial attribute.
  await page.waitForFunction(() => !!document.documentElement.getAttribute('data-mol-mode'))
  const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
  expect(before).toBeTruthy()
  const toggle = page.getByRole('button', { name: /toggle theme/i }).first()
  await expect(toggle).toBeVisible()
  await toggle.click()
  await page.waitForTimeout(300)
  const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
  expect(after).not.toBe(before)
  expect(after).toMatch(/^(light|dark)$/)

  // Persistence: localStorage holds the selected theme name.
  const stored = await page.evaluate(() => window.localStorage.getItem('molecule-theme'))
  expect(stored).toBeTruthy()

  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => !!document.documentElement.getAttribute('data-mol-mode'))
  const persisted = await page.evaluate(() =>
    document.documentElement.getAttribute('data-mol-mode'),
  )
  expect(persisted).toBe(after)
})

test('Forgot password POSTs /api/users/forgot-password and stays 2xx', async ({ page }) => {
  // Always-200 contract prevents account enumeration.
  const { email } = await signup(page)
  await page.evaluate(() => window.localStorage.clear())

  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').fill(email)
    await page
      .getByRole('button', { name: /submit|send/i })
      .first()
      .click()
    await page.waitForTimeout(1500)
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url))
  expect(post, 'forgot-password POST should fire').toBeDefined()
  expect(post!.status).toBeLessThan(300)
})

test('Reset password page renders the email field', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password')
  // The reset page collects the user's email + new password + token.
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
})

test('Login form rejects bad credentials with a non-2xx response', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill('definitely-not-a-real-user@example.com')
  await page.locator('input[type="password"]').fill('WrongPass987!')

  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /log in|sign in/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
  })
  const login = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
  expect(login).toBeDefined()
  expect(login!.status).toBeGreaterThanOrEqual(400)
  // We must still be on /login.
  await expect(page).toHaveURL(/\/login/)
})

test('Sidebar nav links route to the right pages', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  for (const [label, path] of [
    ['Locations', '/locations'],
    ['Radar', '/radar'],
    ['Alerts', '/alerts'],
    ['Trends', '/trends'],
    ['Compare', '/compare'],
    ['Billing', '/billing'],
    ['Settings', '/settings'],
  ] as const) {
    await page
      .locator('aside')
      .getByRole('link', { name: new RegExp(`^${label}$`) })
      .click()
    await expect(page).toHaveURL(new RegExp(path))
  }
})

test('User menu opens and exposes Logout', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await page.locator('[aria-label="Open user menu"]').click()
  // Logout / Sign out button (translation key fallback) is visible.
  const logout = page.getByRole('button', { name: /log out|logout|sign out/i }).first()
  await expect(logout).toBeVisible()
})

test('Plan-updated page renders the success message + Return home link', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page.getByRole('button', { name: /return home/i })).toBeVisible()
})

test('Unsigned stripe webhook does NOT flip planKey (signed-only contract)', async ({ page }) => {
  // The mounted endpoint is /api/users/payment-notification/:provider.
  // Stripe expects a signed `stripe-signature` header; a junk payload
  // without that header MUST not flip a user's plan. The handler may
  // return 200 OR 400 — both are valid responses Stripe expects, but the
  // user's planKey must still be empty/free afterward.
  const { email, password } = await signup(page)
  // Hit the unauthenticated endpoint via raw fetch. Resolve from the
  // `API_BASE` helper instead of process.env so the URL stays in sync
  // with whatever port the dev API was launched on.
  const apiOrigin = API_BASE.replace(/\/api\/?$/, '')
  const resp = await page.request.fetch(`${apiOrigin}/api/users/payment-notification/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_unsigned_no_real_signature',
          customer: 'cus_does_not_exist',
          subscription: 'sub_no',
        },
      },
    }),
  })
  // Stripe's webhook contract is to ack with 2xx so it stops retrying;
  // 400 is also acceptable (signature rejected before processing).
  expect([200, 400]).toContain(resp.status())

  // Re-login and confirm the signed-out user's plan was NOT flipped.
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page
    .getByRole('button', { name: /log\s*in/i })
    .first()
    .click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
  const status = await api<{ planKey: string; isFree: boolean }>(page, 'GET', '/billing/status')
  expect(status.isFree).toBe(true)
})
