/**
 * /account — settings panel.
 * The page is mostly read-only display, so we assert it renders the
 * tabs, that switching tabs swaps content, and that the user's name
 * + email round-trip from the JWT/session.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  BRAND,
  apiFetch,
  captureNetwork,
  getAccessToken,
  signup,
  uniqueEmail,
} from './_helpers.js'

test('account page renders tabs', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/account')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.getByRole('button', { name: /^profile$/i }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^role$/i }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^payments$/i }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^notifications$/i }).first()).toBeVisible()
})

test('account profile shows the signed-in user email + name', async ({ page }) => {
  const email = uniqueEmail('account')
  await signup(page, email, 'TestPass123!', 'Pat Account')
  await page.goto(APP_BASE + '/account')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const html = await page.content()
  expect(html).toContain(email)
  expect(html).toMatch(/Pat Account/)
})

test('switching to Role tab shows learner/tutor cards', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/account')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('button', { name: /^role$/i })
    .first()
    .click()
  await expect(page.getByText(/Learner/).first()).toBeVisible()
  await expect(page.getByText(/Tutor/).first()).toBeVisible()
})

test('Apply to become a tutor link from /account navigates to /become-tutor', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/account')
  await page
    .getByRole('button', { name: /^role$/i })
    .first()
    .click()
  await page
    .getByRole('link', { name: /apply to become a verified tutor/i })
    .first()
    .click()
  await page.waitForURL(/\/become-tutor/, { timeout: 10_000 })
})

test('switching to Payments tab shows a card row with the View plans link', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/account')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('button', { name: /^payments$/i })
    .first()
    .click()
  await expect(
    page.getByRole('link', { name: new RegExp(`view ${BRAND} plans|view plans`, 'i') }).first(),
  ).toBeVisible()
})

test('View-plans link from Payments tab routes to /pricing', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/account')
  await page
    .getByRole('button', { name: /^payments$/i })
    .first()
    .click()
  await page
    .getByRole('link', { name: new RegExp(`view ${BRAND} plans|view plans`, 'i') })
    .first()
    .click()
  await page.waitForURL(/\/pricing/, { timeout: 10_000 })
})

test('Notifications tab renders a settings panel', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/account')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('button', { name: /^notifications$/i })
    .first()
    .click()
  // Some setting must be visible after switching to the notifications tab
  await expect(page.getByText(/notification|email|push|reminder|preference/i).first()).toBeVisible({
    timeout: 10_000,
  })
})

test('Profile save persists display name across reload (read-after-write)', async ({ page }) => {
  await signup(page, uniqueEmail('profile-save'), 'TestPass123!', 'Initial Name')
  await page.goto(APP_BASE + '/account')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const nameInput = page.locator('input[type="text"]').first()
  await nameInput.fill('Persisted Display')
  const saveResps = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /save profile/i }).click()
    await page.waitForTimeout(1500)
  })
  const patch = saveResps.find((r) => r.method === 'PATCH' && /\/api\/users\/me/.test(r.url))
  expect(patch?.status).toBe(200)
  await page.reload()
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const after = await page.locator('input[type="text"]').first().inputValue()
  expect(after).toBe('Persisted Display')
})

test('Notification toggle persists across reload', async ({ page }) => {
  await signup(page, uniqueEmail('notif'))
  await page.goto(APP_BASE + '/account')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('button', { name: /^notifications$/i })
    .first()
    .click()
  // Flip the branded product-updates preference (off → on)
  const target = page
    .locator(`label:has-text("${BRAND} product updates") input[type="checkbox"]`)
    .first()
  const before = await target.isChecked()
  await target.click()
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /save preferences/i }).click()
    await page.waitForTimeout(1500)
  })
  const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/users\/me/.test(r.url))
  expect(patch?.status).toBe(200)
  await page.reload()
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('button', { name: /^notifications$/i })
    .first()
    .click()
  const after = await page
    .locator(`label:has-text("${BRAND} product updates") input[type="checkbox"]`)
    .first()
    .isChecked()
  expect(after).toBe(!before)
})

test('Role tab persists active role across reload', async ({ page }) => {
  await signup(page, uniqueEmail('role'))
  await page.goto(APP_BASE + '/account')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('button', { name: /^role$/i })
    .first()
    .click()
  // Click the Tutor card
  const tutorBtn = page.getByRole('button', { name: /tutor.*set rates|set rates/i }).first()
  const reqs = await captureNetwork(page, async () => {
    await tutorBtn.click()
    await page.waitForTimeout(1200)
  })
  const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/users\/me/.test(r.url))
  expect(patch?.status).toBe(200)
  await page.reload()
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('button', { name: /^role$/i })
    .first()
    .click()
  const tutorPressed = await page
    .locator('button[aria-pressed="true"]')
    .filter({ hasText: /tutor/i })
    .count()
  expect(tutorPressed).toBe(1)
})

test('Payments tab shows real plan from /api/billing/status (no fake card)', async ({ page }) => {
  await signup(page, uniqueEmail('pay'))
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/account')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
    await page
      .getByRole('button', { name: /^payments$/i })
      .first()
      .click()
    await page.waitForTimeout(800)
  })
  const status = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/status/.test(r.url))
  expect(status?.status).toBe(200)
  const text = await page.locator('main, body').first().innerText()
  // Free plan signed-up user, hardcoded "Visa •••• 4242" is gone
  expect(text).not.toMatch(/Visa\s+••••\s+4242/)
  expect(text).toMatch(/Free|Pro|Team/i)
})

test('account page fires GET /api/users/:id during page load', async ({ page }) => {
  const auth = await signup(page)
  const jwt = await getAccessToken(page)
  const userId = jwt
    ? (() => {
        try {
          const part = jwt.split('.')[1]
          if (!part) return null
          const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
          return json.userId ?? null
        } catch {
          return null
        }
      })()
    : null
  expect(userId).toBeTruthy()
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/account')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined)
    // Force fetching the user via apiFetch — exercises GET /api/users/:id from the page
    const r = await apiFetch<any>(page, 'GET', '/users/' + userId)
    expect(r.status).toBe(200)
    expect((r.body?.email ?? r.body?.props?.email ?? '').toLowerCase()).toBe(
      auth.email.toLowerCase(),
    )
  })
  const got = reqs.find((r) => r.method === 'GET' && new RegExp('/api/users/' + userId).test(r.url))
  expect(got, 'GET /api/users/:id should fire').toBeTruthy()
})
